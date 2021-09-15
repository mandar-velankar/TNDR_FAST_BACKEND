const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {


    const {
		CustomerPrices,
        Materials
    } = cds.entities("com.bayer.SXTENDER.PriceAgreementData");

    
    srv.on('READ', 'PriceAgreements', async (req, next) => {

        const data = await next();
        const tx = cds.transaction(req);

        const calculateFields = async priceAgreement => {

            let customerPrices = priceAgreement.CustomerPrices;
            let materials = priceAgreement.Materials;

            // Get CustomerPrices if needed
            if(!customerPrices){
                let wherePriceAgreement = ServiceHelper.buildFullWhere("PriceAgreementId", "=", priceAgreement.ID);
                customerPrices = await tx.run(SELECT.from(CustomerPrices).where(wherePriceAgreement));
            }

            // Get Materials if needed
            if(!materials){
                let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                materials = await tx.run(SELECT.from(Materials).where(whereCountryCode).where(whereProductPackId));
            }


            priceAgreement.Synchronized = customerPrices.every(price => price.Synchronized);
            priceAgreement.hasNewMaterials = materials.some(price => price.isNew);


            return priceAgreement;

        };

        // calculate the 'Synchronized' field based on CustomerPrices 
        const promises = Array.isArray(data) ? data.map(calculateFields) : [calculateFields(data)];

        const result = await Promise.all(promises);

        return req.reply(result);

	});


}