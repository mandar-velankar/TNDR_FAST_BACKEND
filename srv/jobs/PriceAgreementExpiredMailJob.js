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
        const appEnv = cfenv.getAppEnv();
        const fastUIAppHost = appEnv.url.replace('fast-srv','fastui-app');
        const tx = this.db.tx();
                return SELECT.from(PriceAgreements, pa => {
                pa.TenderId,
                pa.ID, pa.CountryCode, pa.ExpiryDate, pa.Status,
                pa.TenderId,
                pa.OfferId,
                pa.Materials('*'),
                pa.PriceAgreementID,
                pa.Product.ProductPack.PRODUCTPACKNAME,
                pa.Institute.InstituteName//,  
                pa.FormatedExpiryDate = this.dateToDDMMYYYY(pa.ExpiryDate);
                console.log("FormatedExpiryDate", pa.FormatedExpiryDate);
                console.log("Price Agreement ID", pa.PriceAgreementID);
                pa.URL = `${fastUIAppHost}/app/index.html#/priceagreements&/pa/PriceAgreements/${pa.ID}`
              return pa;
          }) .where({ CountryCode: 'ES', Status: 'Cancelled' });
          }

   /* mapDataToMail = (template,mail,syncDate) => data => {

        //get unique created by users, this can be used to filter pa/cp data per user from the data array
        const uniqueUsers = [...new Set(data.map(item => item.Tender.User.CWID))];

        for (let user of uniqueUsers) {
            let dataFilteredByUser = data.filter(d => d.Tender.User.CWID === user && d.include === true);
            if(dataFilteredByUser && dataFilteredByUser.length > 0){
                outbox.push({
                    CountryCode: dataFilteredByUser[0].CountryCode,
                    TenderID: dataFilteredByUser[0].TenderId,
                    OfferID: dataFilteredByUser[0].OfferId,
                    Sender: 'FAST-Admin@bayer.com',
                    Recipients: dataFilteredByUser[0].Tender.User.UserEmail,
                    Subject: template.title,
                    MailBody: this.generateMailBody(template, {
                        data: { 
                            SyncDate: syncDate.toDateString(), 
                            PriceAgreements: dataFilteredByUser 
                        }
                    }),
                    Sent: false
                });
            }
        }
    
        if(!outbox || (!outbox[0].MailBody || outbox[0].MailBody === 'undefined')) {
            console.log(`No template found for Net Price Above PVL ${outbox[0].TenderID} with countrycode ${outbox[0].CountryCode}`);
            return;
        }
        return outbox;
    }
    */
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
