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

        const today = new Date();
        console.log(`Processing email consolidation for all commercial agreements synchronised with SAP on ${today} ... `);

        try {
            this.db = await cds.connect.to('db');

            // get mail Template
            const templateName = 'PriceAgreementPriceConditionNotificationMail';
            const mailTemplate = await this.getMailTemplate(templateName);

            //get customer prices
            const synchronizedAggregatedData = await this.getSynchronizedCustomerPricesAggregatedData(today);

            // console.dir(pas,{ depth: null });
            if (synchronizedAggregatedData && synchronizedAggregatedData.length > 0) {
                let mails = this.mapDataToMails(mailTemplate,templateName)(synchronizedAggregatedData);
                // console.log(mails);
                if(mails && mails.length > 0){
                    await this.addMailsToOutbox(mails, mailRun.expiryDate);
                } else{
                    console.log(`No mails to add to outbox for template ${mailRun.template}`);
                }
             } else {
                 console.log(`No reminder mails to be send for expiry date: ${mailRun.expiryDate}`);
             }
        } catch (error) {
            console.error(error);
        }

        console.log('Processing reminder mails for Price Agreements finished.');
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

    mapDataToMails = (template,mail) => pas => pas
        .map(pa => ({
            CountryCode: pa.CountryCode,
            TenderID: pa.TenderId,
            OfferID: pa.OfferId,
            Sender: 'FAST-Admin@bayer.com',
            Recipients: pa.UserEmail,
            Subject: this.findTemplate(template,mail,pa).title,
            MailBody: this.generateMailBody(this.findTemplate(template,mail,pa), pa),
            Sent: false
        }))
        .filter(pa =>{
            // console.log(pa);
            if(!pa.MailBody || pa.MailBody === 'undefined')console.log(`No template found for Price Agreement of tender ${pa.TenderID} with countrycode ${pa.CountryCode}`)
            return !!pa.MailBody && pa.MailBody !== 'undefined';
        });

    findTemplate = (templates,templateid,pa) => templates.find(template => 
        template.CountryCode === pa.CountryCode && 
        template.Language === pa.CountryCode && 
        template.TemplateId === templateid);

    async addMailsToOutbox(mails, expiryDate) {
        console.log(`Adding reminder mails for Price Agreements to outbox for expiry date: ${expiryDate}`);
        console.table(mails,['CountryCode','TenderID','OfferID','Sender','Recipients','Subject','Sent']);
        const { OutgoingMails } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
        const tx = this.db.tx();
        try {
            const mailsResult = await tx.run(INSERT(mails).into(OutgoingMails));
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
    getReminderDate() {
        let date = new Date();
        date.setDate(date.getDate() + 5);
        return this.formatDate(date);
    }
    getExpiringSoonDate() {
        let date = new Date();
        date.setDate(date.getDate() + 45);//+45
        return this.formatDate(date);
    }
    formatDate(date) {
        let month = '' + (date.getMonth() + 1);
        month = month.length < 2 ? `0${month}` : month;
        return `${date.getFullYear()}-${month}-${date.getDate()} 00:00:00`;
    }

};
