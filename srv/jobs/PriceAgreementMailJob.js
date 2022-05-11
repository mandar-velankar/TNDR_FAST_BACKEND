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
                template: await this.getMailTemplate('PriceAgreementExpiredSoonMail')
            }, {
                expiryDate: this.getReminderDate(),
                template: await this.getMailTemplate('PriceAgreementReminderMail')
            }];
            for (let mailRun of mailRuns) {
                const pas = await this.getPriceAgreementsExpiring(mailRun.expiryDate);
                if(pas && pas.length > 0){
                    const mails = this.mapPriceAgreementsToMails(mailRun.template)(pas);
                    mails && mails.length > 0 && await this.addMailsToOutbox(mails,mailRun.expiryDate);
                }else{
                    console.log(`No reminder mails to send for expiry date: ${mailRun.expiryDate}`);
                }
            }
        } catch (error) {
            console.error(error);
        }

        console.log('Processing reminder mails for Price Agreements finished.');
    }
    getPriceAgreementsExpiring(expiryDate) {
        console.log(`Fetching Price Agreements with expiry date: ${expiryDate}`);
        const { PriceAgreements } = this.db.entities("com.bayer.SXTENDER.PriceAgreementData");
        // const { PT_TMUSER,PT_TMTEND } = this.db.entities("com.bayer.SXTENDER.AdminData");
        const tx = this.db.tx();
        return tx.run(SELECT.from(PriceAgreements).columns('*', 'Tender.User.UserName', 'Tender.User.UserEmail', 'Product.ProductPack.PRODUCTPACKNAME', 'Institute.InstituteName').where({ ExpiryDate: expiryDate }));
    }
    mapPriceAgreementsToMails = mail => pas => pas.map(pa => ({
        CountryCode: pa.CountryCode,
        TenderID: pa.TenderId,
        OfferID: pa.OfferId,
        Sender: 'FAST-Admin@bayer.com',
        Recipients: pa.UserEmail,
        Subject: mail.title,
        MailBody: this.generateMailBody(mail, pa),
        Sent: false
    }));
    async addMailsToOutbox(mails,expiryDate) {
        console.log(`Adding reminder mails for Price Agreements to outbox for expiry date: ${expiryDate}`);
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
        return Handlebars.compile("" + mail.content)(data);
    }
    getMailTemplate(templateId) {
        const tx = cds.tx();
        const language = "ES";

        const { MailTemplate } = this.db.entities("com.bayer.SXTENDER.AdminData");
        const template = tx.run(SELECT.one.from(MailTemplate).columns('*', 'MailTemplateFile.title', 'MailTemplateFile.content').where({ CountryCode: language, Language: language, TemplateId: templateId }));
        if (!template) {
            throw `No mail template configured for Pricing Agreement Expiry with id: ${templateId}`;
        }
        return template;
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