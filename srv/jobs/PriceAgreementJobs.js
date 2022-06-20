const cds = require('@sap/cds');
// const BaseCron = require('cron-es6');
const BaseJob = require('./BaseJob');
const core = require('@sap-cloud-sdk/core');

module.exports.ExtendPriceAgreements = class ExtendPriceAgreements extends BaseJob {

    constructor(jobName,jobTime) {
        super(jobName,jobTime);
    }

    async updatePriceAgreementExpiration(){
        const tx = cds.tx();
        try {

            const { PriceAgreements } = this.db.entities("com.bayer.SXTENDER.PriceAgreementsData");

            //get all price agreements which have to be extended
            let query = cds.parse.cql (`SELECT * FROM ${PriceAgreements.name} as PriceAgreements where PriceAgreements.ExtendPriceAgreement = 'true'`);

            const priceAgreements = await tx.run(query);
            let aPriceAgreementIds = {};

            const promises = priceAgreements.map(agreement => {
                let newDate = new Date(agreement.ExpiryDate);
                newDate.setMonth(newDate.getMonth()+agreement.ExpiryExtensionPeriod);
                aPriceAgreementIds.push(priceAgreements.ID); //prepare agreements to be synchronised

                const obj = {
                    ExpiryDate: newDate
                }

                //update the actual price agreement withh the new price agreement date
                const result = tx.run(UPDATE(PriceAgreements).with(obj).where({ ID: priceAgreements.ID }));

                return result;
            });

            //execute the promises and log the output
            if(promises && promises.length > 0){
                console.log(`Updating ${PriceAgreements.name} ...`);
                const result = await Promise.all(promises);
                await tx.commit();
                console.log(`${promises.length} Expiry dates successfully updated in ${PriceAgreements.name}.`);
                return result;
            }

            //resync all updated price agreements
            //const resultSync = await paFactory.syncPriceAgreements(tx, req, priceAgreements);
            const sDestinationName = 'API-Fast';

            let response = await core.executeHttpRequest({ destinationName: sDestinationName}, {
                method: 'POST',
                url: "/v2/priceagreement/syncPriceAgreements",
                data: aPriceAgreementIds //gather all priceagreement IDs
            });

            await tx.commit();
            return;

        } catch (error) {
            console.log('Updating expiry dates has failed.');
            console.log(error);
            await tx.rollback(error);
        }   
    };
};