const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {


    const {
		CustomerPrices,
        MaterialsView
    } = cds.entities("com.bayer.SXTENDER.PriceAgreementData");

    const {
		MostRecentConsumerPricesView
    } = cds.entities("com.bayer.SXTENDER.MasterDataViews");

    
    srv.on('READ', 'PriceAgreements', async (req, next) => {

        
        const tx = cds.transaction(req);

        /**
         * As virtual/calculated elements are not persisted on the database, incoming filter requests cannot be delegated to the database to get the requested filter results. 
         * The filter for virtual/calculated elements must be implemented in the NodeJS layer. 
         * For each calculated filter element, we first remove the filter, get the data and filter the results in the Nodejs layer.
         */


        // 1. remove the hasNewMaterials filter from the request if it exists 
        let hasNewMaterialsFilterIndex = null; 
        let hasNewMaterialsFilterValues = null;
        let hasNewPriceFilterIndex = null; 
        let hasNewPriceFilterValues = null;
        let hasExpiringSoonFilterIndex = null;
        let hasExpiringSoonFilterValues = null;

        if(req.query.SELECT.where){

            hasNewMaterialsFilterIndex = ServiceHelper.getWhereId(req, 'hasNewMaterials');
            hasNewMaterialsFilterValues = ServiceHelper.getWhereValues(req, 'hasNewMaterials');

            hasNewPriceFilterIndex = ServiceHelper.getWhereId(req, 'hasNewPrice');
            hasNewPriceFilterValues = ServiceHelper.getWhereValues(req, 'hasNewPrice');

            hasExpiringSoonFilterIndex = ServiceHelper.getWhereId(req, 'ExpiringSoon');
            hasExpiringSoonFilterValues =  ServiceHelper.getWhereValues(req, 'ExpiringSoon');

            if(hasNewMaterialsFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'hasNewMaterials');
            }

            if(hasNewPriceFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'hasNewPrice');
            }

            if(hasExpiringSoonFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'ExpiringSoon');
            }
        }


        const data = await next();


        // 2. calculate the fields
        const calculateFields = async priceAgreement => {

            let customerPrices = priceAgreement.CustomerPrices;
            let materials = priceAgreement.Materials;
            let consumerPrice = priceAgreement.ConsumerPrice;
            const todaysDate = new Date();

            let calculatedFutureDate = new Date();
            calculatedFutureDate.setMonth(calculatedFutureDate.getMonth() + 3);

            // Get CustomerPrices if needed
            if(!customerPrices){
                let wherePriceAgreement = ServiceHelper.buildFullWhere("PriceAgreementId", "=", priceAgreement.ID);
                customerPrices = await tx.run(SELECT.from(CustomerPrices).where(wherePriceAgreement));
            }

            // Get Materials if needed
            if(!materials){
                let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                materials = await tx.run(SELECT.from(MaterialsView).where(whereCountryCode).where(whereProductPackId));
            }

            // Get ConsumerPrices if needed
            if(!consumerPrice){
                let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                consumerPrice = await tx.run(SELECT.one.from(MostRecentConsumerPricesView).where(whereCountryCode).where(whereProductPackId));
            }

            // calculate Synchronized
            priceAgreement.Synchronized = customerPrices.every(price => price.Synchronized);
            // calculate hasNewMaterials
            priceAgreement.hasNewMaterials = materials.some(price => price.isNew);

            // calculate hasNewPrice
            if(consumerPrice){

                let consumerListPrice = "";
                let consumerRetailPrice = "";

                if(priceAgreement.UoM === "Pack"){
                    consumerListPrice = consumerPrice.ConsumerPriceExclPP;
                    consumerRetailPrice = consumerPrice.MaxPriceNhsPP;
                }else{
                    consumerListPrice = consumerPrice.ConsumerPriceExclPU;
                    consumerRetailPrice = consumerPrice.MaxPriceNhsPU;
                }

                 
                if(Number(priceAgreement.ListPrice) !== Number(consumerListPrice) || 
                    Number(priceAgreement.RetailPrice) !== Number(consumerRetailPrice) ){
                        priceAgreement.hasNewPrice = true;
                }

            }

            if(priceAgreement.ExpiryDate){
                let dExpiryDate = new Date(priceAgreement.ExpiryDate);
                priceAgreement.ExpiringSoon = calculatedFutureDate >= dExpiryDate && dExpiryDate >= todaysDate ? true : false;
            }

            return priceAgreement;

        };

        // calculate the 'Synchronized' field based on CustomerPrices 
        const promises = Array.isArray(data) ? data.map(calculateFields) : [calculateFields(data)];

        let result = await Promise.all(promises);

        //3. return the filtered results if calculated filter is used
        if(hasNewMaterialsFilterValues && hasNewMaterialsFilterValues.length > 0){
            const filteredResult = result.filter(priceAgreement => priceAgreement.hasNewMaterials && priceAgreement.hasNewMaterials === hasNewMaterialsFilterValues[0]);
            result = filteredResult;
        }

        if(hasNewPriceFilterValues && hasNewPriceFilterValues.length > 0){
            const filteredResult = result.filter(priceAgreement => priceAgreement.hasNewPrice && priceAgreement.hasNewPrice === hasNewPriceFilterValues[0]);
            result = filteredResult;
        }

        if(hasExpiringSoonFilterValues && hasExpiringSoonFilterValues.length > 0){
            const filteredResult = result.filter(priceAgreement => priceAgreement.ExpiringSoon);
            result = filteredResult;
        }

        return req.reply(result);

	});

}