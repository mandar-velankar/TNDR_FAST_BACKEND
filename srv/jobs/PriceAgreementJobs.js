const cds = require('@sap/cds');
// const BaseCron = require('cron-es6');
const BaseJob = require('./BaseJob');

module.exports.ExtendPriceAgreements = class ExtendPriceAgreements extends BaseJob {

    constructor(jobName,jobTime) {
        super(jobName,jobTime);
    }

    async updatePriceAgreementExpiration(){
        try {

            const tx = cds.tx();
            const { PriceAgreements } = this.db.entities("com.bayer.SXTENDER.PriceAgreementsData");

            let query = cds.parse.cql (`SELECT * FROM ${PriceAgreements.name} as PriceAgreements where PriceAgreements.ExtendPriceAgreement = 'true'`);

            const priceAgreements = await tx.run(query);

            const promises = priceAgreements.map(agreement => {
                let newDate = new Date(agreement.ExpiryDate);
                newDate.setMonth(newDate.getMonth()+agreement.ExpiryExtensionPeriod);

                const obj = {
                    ExpiryDate: newDate
                }

                const result = tx.run(UPDATE(PriceAgreements).with(obj).where({ ID: priceAgreements.ID }));
                tx.commit(result);

                return result;
            });

            if(promises && promises.length > 0){
                console.log(`Updating ${PriceAgreements.name} ...`);
                const result = await Promise.all(promises);
                console.log(`${promises.length} Expiry dates successfully updated in ${PriceAgreements.name}.`);
                return result;
            }

            return;

        } catch (error) {
            console.log('Updating expiry dates has failed.');
            console.log(error);
        }   
    };
};