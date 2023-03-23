const cds = require('@sap/cds');
const BaseJob = require('./BaseJob');
const core = require('@sap-cloud-sdk/core');
const ServiceHelper = require('../utils/ServiceHelper');
const Handlebars = require("handlebars");
const cfenv = require("cfenv");

module.exports = class PriceConditionsQualityControlNotificationMail extends BaseJob {

    constructor(jobName,jobTime) {
        super(jobName,jobTime);
        this.jobName = jobName.toUpperCase();
        this.startTime = 0;
        this.numberOfRecords = 0;
    }

     /**
     * Triggered when job has started
     */
    //override
    async onTick() {

        console.log(`JOB (${this.jobName }): Processing started ...`);
        this.startTime = new Date().getTime();
        this.db = await cds.connect.to('db');

        try {

            // Fetch data
            const failedCustomerPricesQC = await this.getCustomerPricesQC();
            this.numberOfRecords = failedCustomerPricesQC.length;

            // split data
            const customerPricesQC_ES = failedCustomerPricesQC.filter(c => c.CountryCode === "ES");
            const customerPricesQC_IT = failedCustomerPricesQC.filter(c => c.CountryCode === "IT");

            // Process data
            // await this.processCustomerPricesQC(customerPricesQC_ES, "ES");
            // await this.processCustomerPricesQC(customerPricesQC_IT, "IT");

            // log finish
            this._finishMessage(this.numberOfRecords);

        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Processing failed. \n\nCause: ${error}`);
            throw error;
        }
    }

    _finishMessage(processed){
        const end = new Date().getTime();
        const time = end - this.startTime;
        console.log(`JOB (${this.jobName }): Processing completed. - Processed: ${processed} - Execution time: ${time} ms`);
    }

    /**
     * Gets CustomerPricesQC records with status 'Failed' and notification e-mail not yet sent
     * @returns {Promise}
     */
    getCustomerPricesQC() {
        const { CustomerPricesQC } = this.db.entities("com.bayer.SXTENDER.PriceAgreementData");
        return SELECT.from(CustomerPricesQC)
                .columns(
                    'CountryCode',
                    `LTRIM(KUNNR, '0') as InstituteID`, 
                    'Institute.InstituteName', 
                    `LTRIM(MATNR, '0') as MaterialNumber`,
                    'CustomerPrice.ProductPack.PRODUCTPACKNAME as ProductPackName', 
                    'CustomerPrice.PriceAgreement.OfferId',
                    'KSCHL as PriceCondition',
                    'DATAB as EffectiveDate',
                    'DATBI as ExpiryDate',
                    'KBETR as PriceInFAST',
                    'SAP_KBETR as PriceInSAP',
                    'CustomerPrice.PriceAgreement.ID as Link',
                    'CustomerPrice.PriceAgreement.User.UserName as PriceAgreementOwner'
                )
                .where({Status: 'Failed', emailNotificationSent: false});
    }


    /**
     * Updates CustomerPricesQC
     * @param {*} customerPriceQC 
     * @returns {Promise}
     */
    updateCustomerPriceQC(tx, customerPriceQC){
        if(!customerPriceQC) return false;
        const { CustomerPricesQC } = this.db.entities("com.bayer.SXTENDER.PriceAgreementData");
        return tx.run(UPDATE(CustomerPricesQC).with(customerPriceQC).where({ ID: customerPriceQC.ID }));
    };


    
    async processCustomerPricesQC(customerPricesQC, countryCode){

        if(!customerPricesQC || customerPricesQC.length <= 0) return;

        // get mail Template
        const templateId = `PriceConditionsQualityControlNotificationMail_${countryCode}`;
        const mailTemplate = await this.getMailTemplate(templateId);

        let mail = this.mapDataToMail(mailTemplate,templateId)(customerPricesQC);
        // console.log(mails);
        if(mail){
            await this.addMailsToOutbox(mail);
        } else{
            console.log(`No mail to add to outbox for template ${templateId}`);
        }

    }

    async getMailTemplate(templateId) {
        console.log('Fetching mail template ...');
        console.table(templateId);
        const { MailTemplate } = this.db.entities("com.bayer.SXTENDER.AdminData");
        try{
            const result = await SELECT.one.from(MailTemplate)
            .columns('*', 'MailTemplateFile.title', 'MailTemplateFile.content')
            .where({ TemplateId: templateId });
            return result;
        }catch(error){
            console.error(`No mail template found for ${templateId} `, `Cause: ${error}`);
        }
    }


    mapDataToMail = (template,templateId) => data => {
        const appEnv = cfenv.getAppEnv();
        const fastUIAppHost = appEnv.url.replace('fast-srv','fastui-app');
        let outbox = [];

        // add/change some fields in the data array
        data.forEach(d => {
            d.EffectiveDate = new Date(d.EffectiveDate).toJSON().substring(0,10),
            d.ExpiryDate = new Date(d.ExpiryDate).toJSON().substring(0,10),
            d.URL = `${fastUIAppHost}/app/index.html#/priceagreements&/pa/PriceAgreements/${d.PriceAgreementId}`
        })

        outbox.push({
            CountryCode: data[0].CountryCode,
            TenderID: data[0].TenderId,
            OfferID: data[0].OfferId,
            Sender: 'FAST-Admin@bayer.com',
            Recipients: undefined,
            Subject: template.title,
            MailBody: this.generateMailBody(template, { 
                data: { 
                    CustomerPrices: data 
                }
            }),
            Sent: false
        });
        
        if(!outbox || (!outbox[0].MailBody || outbox[0].MailBody === 'undefined')) {
            console.log(`No template found for Customer Price of tender ${outbox[0].TenderID} with countrycode ${outbox[0].CountryCode}`);
            return;
        }
        return outbox;
    }

    async addMailsToOutbox(mail, syncDate) {
        console.log(`Adding notification mail for Price Conditions synchronised with SAP on: ${syncDate.toDateString()}`);
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

    



};