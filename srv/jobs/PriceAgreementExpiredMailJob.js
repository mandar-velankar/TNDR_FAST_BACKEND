const cds = require('@sap/cds');
const BaseJob = require('./BaseJob');
const Handlebars = require("handlebars");
const cfenv = require("cfenv");
module.exports = class PriceAgreementExpiredMailJob extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
    }

       async onTick() {
        const syncDate = new Date();
        console.log(`Processing notification mail for Cancelled PriceAgreement  ${syncDate.toDateString()} STARTED ... `);

        try {
            this.db = await cds.connect.to('db');

            // get mail Template
            const templateName = 'PriceAgreementExpiredMail';
            const mailTemplate = await this.getMailTemplate(templateName);

            //get customer prices
            const PriceAgreementService = await cds.connect.to ('PriceAgreementService');
            let getData = await PriceAgreementService.run(this.getPriceAgreementsExpired());

            if (getData && getData.length > 0) {
                let mail = this.mapDataToMail(mailTemplate,templateName, syncDate)(getData);
                if(mail){
                    await this.addMailsToOutbox(mail, syncDate);
                } else{
                    console.log(`No mail to add to outbox for template ${templateName}`);
                }
             } else {
                 console.log(`No notification mail to be send on ${syncDate.toDateString()}`);
             }
        } catch (error) {
            console.error(error);
        }

        console.log(`Processing notification mail for Cancelled Price Agreement ${syncDate.toDateString()} FINISHED`);
    }

    getPriceAgreementsExpired() {
        console.log(`Data for cancelled Price Agreement`);
        const { PriceAgreements } = this.db.entities("com.bayer.SXTENDER.PriceAgreementData");
        const appEnv = cfenv.getAppEnv();
        const fastUIAppHost = appEnv.url.replace('fast-srv','fastui-app');
        const tx = this.db.tx();
        let pas = await tx.run(SELECT.from(PriceAgreements,pa => {
            pa.TenderId,
            pa.ID, pa.CountryCode, pa.ExpiryDate, pa.Status,
            pa.TenderId,
            pa.OfferId,
            pa.Materials,
            pa.PriceAgreementID,
            pa.Product.ProductPack.PRODUCTPACKNAME,
            pa.Institute.InstituteName//,
        })
         .where({CountryCode: 'ES', Status: 'Cancelled'}));
        return pas.map(pa => {
            pa.FormatedExpiryDate = this.dateToDDMMYYYY(pa.ExpiryDate);
            console.log("FormatedExpiryDate", pa.FormatedExpiryDate);
            console.log("Price Agreement ID", pa.PriceAgreementID);
              pa.FormatedExpiryDate = this.dateToDDMMYYYY(pa.ExpiryDate)
              pa.URL = `${fastUIAppHost}/app/index.html#/priceagreements&/pa/PriceAgreements/${pa.ID}'
            return pa;
        })
    }
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

    async addMailsToOutbox(mail, syncDate) {
        console.log(`Adding notification mail for Cancelled Price Agreement: ${syncDate.toDateString()}`);
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
        return Handlebars.compile("" + mail.content)(data);
    }

    async getMailTemplate(templateId) {
        console.log('Get mail templates for Cancelled Price Agreement');
        console.table(templateId);
        const tx = cds.tx();
        const { MailTemplate } = this.db.entities("com.bayer.SXTENDER.AdminData");
        try{
            const result = await tx.run(SELECT.one.from(MailTemplate)
            .columns('*', 'MailTemplateFile.title', 'MailTemplateFile.content')
            .where({ TemplateId: templateId }));
            await tx.commit();
            return result;
        }catch(error){
            console.error("No mail template found");
            await tx.rollback();
            return [];
        }
    }
};
