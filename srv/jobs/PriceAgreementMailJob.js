const cds = require('@sap/cds');
const BaseJob = require('./BaseJob');
const Handlebars = require("handlebars");

class PriceAgreementMailJob extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
    }

    /**
     * Triggered when job has started
     */
    //override
    async onTick() {

        console.log('Processing reminder mails for Price Agreements started ...');

        try {
            this.db = await cds.connect.to('db');
            const mailRuns = [{
                expiryDate: this.getExpiringSoonDate(),
                template: 'PriceAgreementExpiredSoonMail'
            }, {
                expiryDate: this.getReminderDate(),
                template: 'PriceAgreementReminderMail'
            }];
            //get all mail templates for price agreements
            const mailTemplates = await this.getMailTemplates(mailRuns.map(mailRun=>mailRun.template));
            //loop over configured mailing runs: first mail expired soon + reminder mail
            for (let mailRun of mailRuns) {
                //get price agreements based on mail reminder date
                let pas = await this.getPriceAgreementsExpiring(mailRun.expiryDate);
                // console.dir(pas,{ depth: null });
                if (pas && pas.length > 0) {
                    let mails = this.mapPriceAgreementsToMails(mailTemplates,mailRun.template)(pas);
                    console.log(mails);
                    if(mails && mails.length > 0){
                        await this.addMailsToOutbox(mails, mailRun.expiryDate);
                    } else{
                        console.log(`No mails to add to outbox for template ${mailRun.template}`);
                    }
                } else {
                    console.log(`No reminder mails to be send for expiry date: ${mailRun.expiryDate}`);
                }
            }
        } catch (error) {
            console.error(error);
        }

        console.log('Processing reminder mails for Price Agreements finished.');
    }
    async getPriceAgreementsExpiring(expiryDate) {
        console.log(`Fetching Price Agreements with expiry date: ${expiryDate}`);
        const { PriceAgreements } = this.db.entities("com.bayer.SXTENDER.PriceAgreementData");
        // const { PT_TMUSER,PT_TMTEND } = this.db.entities("com.bayer.SXTENDER.AdminData");
        const tx = this.db.tx();
        let pas = await tx.run(SELECT.from(PriceAgreements,pa => {
            pa.CountryCode,pa.TenderId, pa.OfferId,pa.ExpiryDate,
            pa.Tender.User.UserName,
            pa.Tender.User.UserEmail,
            pa.Product.ProductPack.PRODUCTPACKNAME,
            pa.Institute.InstituteName,
            pa.PriceConditions`[PriceConditionClassification.isMain='true']`(pc=>{
                pc.PVL
                // ,
                // pc.PriceConditionClassification(pcc=>{
                //     pcc.isMain
                // })
            })
        })
            // .columns('*',
            //     'Tender.User.UserName',
            //     'Tender.User.UserEmail',
            //     'Product.ProductPack.PRODUCTPACKNAME',
            //     'Institute.InstituteName')
            .where({ ExpiryDate: expiryDate, CountryCode: 'ES' }));
        return pas.map(pa => {
            pa.Price = 0;
            if(pa.PriceConditions && pa.PriceConditions.length > 0){
                pa.Price = pa.PriceConditions[0].PVL
            }
            return pa;
        })
    }
    mapPriceAgreementsToMails = (templates,mail) => pas => pas
        .map(pa => ({
            CountryCode: pa.CountryCode,
            TenderID: pa.TenderId,
            OfferID: pa.OfferId,
            Sender: 'FAST-Admin@bayer.com',
            Recipients: pa.UserEmail,
            Subject: this.findTemplate(templates,mail,pa).title,
            MailBody: this.generateMailBody(this.findTemplate(templates,mail,pa), pa),
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
    getMailTemplates(templateIds) {
        console.log('Get mail templates for price agreements');
        console.table(templateIds);
        const tx = cds.tx();
        // const language = "ES";

        const { MailTemplate } = this.db.entities("com.bayer.SXTENDER.AdminData");
        return tx.run(SELECT.from(MailTemplate)
            .columns('*', 'MailTemplateFile.title', 'MailTemplateFile.content')
            .where({ TemplateId: { in: templateIds } }));
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

module.exports = PriceAgreementMailJob;