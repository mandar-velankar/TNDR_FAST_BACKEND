const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {


    const {
		CustomerPrices
    } = cds.entities("com.bayer.SXTENDER.PriceAgreementData");

    
    srv.on('READ', 'PriceAgreements', async (req, next) => {

        const data = await next();

        const calculateSynchronized = async priceAgreement => {

            let customerPrices = priceAgreement.CustomerPrices;

            if(!customerPrices){
                const tx = cds.transaction(req);
                let wherePriceAgreement = ServiceHelper.buildFullWhere("PriceAgreementId", "=", priceAgreement.ID);
                customerPrices = await tx.run(SELECT.from(CustomerPrices).where(wherePriceAgreement));
            }

            priceAgreement.Synchronized = customerPrices.every(price => price.Synchronized);


            return priceAgreement;

        };

        // calculate the 'Synchronized' field based on CustomerPrices 
        const promises = Array.isArray(data) ? data.map(calculateSynchronized) : [calculateSynchronized(data)];

        const result = await Promise.all(promises);

        return req.reply(result);

	});


}