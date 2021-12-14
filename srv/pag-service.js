const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');
const axios = require('axios');
const qs = require("qs");

module.exports = async (srv) => {

    const db = await cds.connect.to('db'); // connect to database service
    const { SchedulerApiConfig, SchedulerApiConfigUsers, SchedulerApiConfigOAuth } = db.entities("com.bayer.SXTENDER.AdminData");

    // get api config
    const priceAgreementApi = await cds.run(SELECT.one.from(SchedulerApiConfig).where({Provider:'PriceAgreement'}));
    const oauthAuth  = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, priceAgreementApi.OAuth_ID));

    const {
		CustomerPrices,
        MaterialsView,
        PriceAgreements
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
            if(!customerPrices || customerPrices.length === 0){
                priceAgreement.hasNewMaterials = false;
            }else {
                priceAgreement.hasNewMaterials = materials.some(price => price.isNew);
                
            }

            if(priceAgreement.CountryCode === 'IT'){
                // include FOC products in filter logic
                if( priceAgreement.FOC && priceAgreement.FOC.length > 0){
                    let productArray = [];
                    priceAgreement.FOC.forEach(FOC => {
                        productArray.push(FOC.ProductPackId)
    
                    });
                    let whereFocProduct = ServiceHelper.buildWhereExpression("ProductPackId", "or", productArray);
                    let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                    materials = await tx.run(SELECT.from(MaterialsView).where(whereCountryCode).where(whereFocProduct));
                    priceAgreement.hasNewMaterials = materials.some(price => price.isNew);
                }
            }

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

    srv.on('syncPriceAgreements', async req => {

        const tx = cds.transaction(req);
    
        try {
            const customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: req.data.ids } }));
            const updatePromises = customerPrices.map(custPrice => updateCustomerPrice(custPrice));
            const result = await Promise.all(updatePromises);

            // set customerPrices 'Synchronized' to true
            await tx.run(UPDATE(CustomerPrices).with({Synchronized: true}).where({ PriceAgreementId: { in: req.data.ids } }));

            return req.reply(result);

        } catch (error) {
            console.log(`Synchronization of PricingAgreements failed\n`);
            console.log(error);
            if(error && error.response && error.response.status){
                return req.reject(error.response.status, error.message);
            } else {
                return req.reject(error.message);
            }
        }

    });


    async function updateCustomerPrice(customerPrice){

        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);

        const body = getPriceAgreementRequestBodyTemplate();
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KUNNR = parseInt(customerPrice.InstituteId);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.MATNR = parseInt(customerPrice.MaterialNumber);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth()+1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth()+1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KBETR = parseInt(customerPrice.Price);

        return await updatePriceConditions(body);

    }


    function getPriceAgreementRequestBodyTemplate(){
        return {
            "_-BAY0_-GZ_SDCOND_A04": {
              "IDOC": {
                "BEGIN": 1,
                "EDI_DC40": {
                  "SEGMENT": 1,
                  "TABNAM": "EDI_DC40",
                  "MANDT": 508,
                  "DOCNUM": 34952510,
                  "DOCREL": 740,
                  "STATUS": 53,
                  "DIRECT": 2,
                  "OUTMOD": "",
                  "IDOCTYP": "COND_A04",
                  "CIMTYP": "/BAY0/GZ_SDCOND_A04",
                  "MESTYP": "COND_A",
                  "MESCOD": "EXT",
                  "MESFCT": "ES",
                  "SNDPOR": "D2RM508",
                  "SNDPRT": "LS",
                  "SNDPRN": "FAST_IT",
                  "RCVPOR": "SAPD2R",
                  "RCVPRT": "LS",
                  "RCVPRN": "D2RM508",
                  "CREDAT": 20210916,
                  "CRETIM": 144213,
                  "SERIAL": 20210810101046
                },
                "E1KOMG": {
                  "SEGMENT": 1,
                  "KVEWE": "A",
                  "KOTABNR": 878,
                  "KAPPL": "V",
                  "KSCHL": "YLTP",
                  "VKORG": "ITHC",
                  "VTWEG": 0,
                  "SPART": 0,
                  "KUNNR": 0,
                  "MATNR": 0,
                  "_BAY0-GZ_SDREFINFO01": {
                    "SEGMENT": 1,
                    "EDIQUAL": "CIG",
                    "REFVAL": "Z18178A124"
                  },
                  "E1KONH": {
                    "SEGMENT": 1,
                    "DATAB": 99991231,
                    "DATBI": 99991231,
                    "E1KONP": {
                      "SEGMENT": 1,
                      "KSCHL": "YLTP",
                      "KBETR": 0
                    }
                  }
                }
              }
            }
          };
    };


    async function updatePriceConditions(body){

        if (body) {

            const url = `${priceAgreementApi.Host}${priceAgreementApi.BasePath}${priceAgreementApi.ResourcePath}`;
            const oauthCredentials = await getBearerToken();

            console.log("Update Price Conditions oauthCredetials:", oauthCredentials);
            console.log("Update Price Conditions proxyHost:", priceAgreementApi.ProxyHost);
            console.log("Update Price Conditions proxyPort:", priceAgreementApi.ProxyPort);

            return axios({
                method: 'post',
                url: url,
                headers: {
                    'Authorization': `Bearer ${oauthCredentials.data.access_token}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(body),
                proxy: {
                    host: priceAgreementApi.ProxyHost,
                    port: priceAgreementApi.ProxyPort
                }
            });
        }

        throw Error("The body of the request is missing.");

    };

    async function getBearerToken() {

        if (oauthAuth.OAuthProvider && oauthAuth.ClientID && oauthAuth.ClientSecret) {
            console.log("Bearer Token oauthCredetials:", oauthAuth);
            console.log("Bearer Token proxyHost:", priceAgreementApi.ProxyHost);
            console.log("Bearer Token proxyPort:", priceAgreementApi.ProxyPort);
            return axios({
                method: 'post',
                url: oauthAuth.OAuthProvider,
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${oauthAuth.ClientID}:${oauthAuth.ClientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify({
                    'grant_type': oauthAuth.GrantType
                }),// when testing locally, comment out the proxy
                proxy: {
                    host: priceAgreementApi.ProxyHost,
                    port: priceAgreementApi.ProxyPort
                }
            });
        }

        throw Error("Missing OAUTH config parameters");
    };
}