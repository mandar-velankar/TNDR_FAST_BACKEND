const cds = require('@sap/cds');
const BaseJob = require('./BaseJob');
const Handlebars = require("handlebars");

module.exports = class PriceAgreementPriceConditionNotificationMailJob extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
    }

    /**
     * Triggered when job has started
     */
    //override
    async onTick() {

        const syncDate = new Date();
        console.log(`Processing notification mail for Price Conditions synchronised with SAP on ${syncDate.toDateString()} ... `);

        try {
            this.db = await cds.connect.to('db');

            // get mail Template
            const templateName = 'PriceAgreementPriceConditionNotificationMail';
            const mailTemplate = await this.getMailTemplate(templateName);

            //get customer prices
            const synchronizedAggregatedData = await this.getSynchronizedCustomerPricesAggregatedData(syncDate);

            // console.dir(pas,{ depth: null });
            if (synchronizedAggregatedData && synchronizedAggregatedData.length > 0) {
                let mail = this.mapDataToMail(mailTemplate,templateName, syncDate)(synchronizedAggregatedData);
                // console.log(mails);
                if(mail){
                    await this.addMailsToOutbox(mail, syncDate);
                } else{
                    console.log(`No mail to add to outbox for template ${templateName}`);
                }
             } else {
                 console.log(`No notification mail to be send on ${syncDate}`);
             }
        } catch (error) {
            console.error(error);
        }

        console.log(`Processing notification mail for Price Conditions synchronised with SAP on ${syncDate.toDateString()} finished`);
    }

    /**
     * Fetch Customer Prices which are synchronized but not yet notified.
     * Price Agreement and Tender data is aggregated.
     * @param {Date} date 
     * @returns {Array<Objects>}  A list of aggregated data
     */
    async getSynchronizedCustomerPricesAggregatedData(date) {
        console.log(`Fetching Customer Prices synchronized on: ${date}`);
        const { CustomerPrices, PriceAgreements } = this.db.entities("com.bayer.SXTENDER.PriceAgreementData");
        const { PT_TMTEND } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
        const tx = this.db.tx();
        return await tx.run(
            SELECT.from(`${CustomerPrices.name} as CP`)
            .join(`${PriceAgreements.name} as PA`)
            .on({ 
                'CP.PriceAgreementId': { '=': 'PA.ID' } 
            })
            .join(`${PT_TMTEND.name} as TND`)
            .on({ 
                'PA.TenderId': { '=': 'TND.TenderID' } 
            })
            .where({ 
                    'CP.CountryCode': 'ES', 
                    'CP.Synchronized': true, 
                    'CP.Notified': false,
                    'CP.modifiedAt': { '>=': `${date.toJSON().substr(0,10)} 00:00:00.000000000` }, // only records synced on the specified date (= when this jobs runs)
                    'TND.Classification': 'Commercial Agreement'
            })
        ); 
    }

    mapDataToMail = (template,mail,syncDate) => data => {

        const outbox = {
            CountryCode: data[0].CountryCode,
            TenderID: data[0].TenderId,
            OfferID: data[0].OfferId,
            Sender: 'FAST-Admin@bayer.com',
            Recipients: undefined,
            Subject: template.title,
            MailBody: this.generateMailBody(template, { 
                data: { 
                    SyncDate: syncDate.toDateString(), 
                    CustomerPrices: data 
                }
            }),
            Sent: false
        }

        if(!outbox.MailBody || outbox.MailBody === 'undefined') {
            console.log(`No template found for Customer Price of tender ${outbox.TenderID} with countrycode ${outbox.CountryCode}`);
            return;
        }

        return outbox;

    };


    async addMailsToOutbox(mail, syncDate) {
        console.log(`Adding notification mail for Price Conditions synchronised with SAP on: ${syncDate.toDateString()}`);
        console.table(mail,['CountryCode','TenderID','OfferID','Sender','Recipients','Subject','Sent']);
        const { OutgoingMails } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
        const tx = this.db.tx();
        try {
            const mailsResult = await tx.run(INSERT(mail).into(OutgoingMails));
            await tx.commit();
            return mailsResult;
        } catch (error) {
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }
    generateMailBody(mail, data) {
        //CountryCode: language, Language: language, 
        return Handlebars.compile("" + mail.content)(data);
    }
    getMailTemplate(templateId) {
        console.log('Get mail templates for price agreements');
        console.table(templateId);
        const tx = cds.tx();
        const { MailTemplate } = this.db.entities("com.bayer.SXTENDER.AdminData");
        return tx.run(SELECT.one.from(MailTemplate)
            .columns('*', 'MailTemplateFile.title', 'MailTemplateFile.content')
            .where({ TemplateId: templateId }));
    }
    // getReminderDate() {
    //     let date = new Date();
    //     date.setDate(date.getDate() + 5);
    //     return this.formatDate(date);
    // }
    // getExpiringSoonDate() {
    //     let date = new Date();
    //     date.setDate(date.getDate() + 45);//+45
    //     return this.formatDate(date);
    // }
    // formatDate(date) {
    //     let month = '' + (date.getMonth() + 1);
    //     month = month.length < 2 ? `0${month}` : month;
    //     return `${date.getFullYear()}-${month}-${date.getDate()} 00:00:00`;
    // }

};
