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
        NewMaterialsView,
        NewFOCMaterialsView,
        PriceAgreements
    } = cds.entities("com.bayer.SXTENDER.PriceAgreementData");

    const {
		MostRecentConsumerPricesView
    } = cds.entities("com.bayer.SXTENDER.MasterDataViews");

    const {
		PT_TMINST,PT_TMPRDPCK
    } = cds.entities("com.bayer.SXTENDER.MasterData");
    
    const {
		PriceAgreementFOC
    } = cds.entities("com.bayer.SXTENDER.PriceAgreementDataViews");

    const {
		PT_TMOFPR,PT_TMOFRS,PriceCondition,FreeGoodsOther,DiscountCondition
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");



    
    srv.on('READ', 'PriceAgreements', async (req, next) => {

        
        // const tx = cds.transaction(req);
		const tx = cds.tx();

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
        let isNewPriceAgreementFilterIndex = null;
        let isNewPriceAgreementFilterValues = null;
        let hasExpiredFilterValues = null;

        if(req.query.SELECT.where){

            hasNewMaterialsFilterIndex = ServiceHelper.getWhereId(req, 'hasNewMaterials');
            hasNewMaterialsFilterValues = ServiceHelper.getWhereValues(req, 'hasNewMaterials');

            hasNewPriceFilterIndex = ServiceHelper.getWhereId(req, 'hasNewPrice');
            hasNewPriceFilterValues = ServiceHelper.getWhereValues(req, 'hasNewPrice');

            hasExpiringSoonFilterIndex = ServiceHelper.getWhereId(req, 'ExpiringSoon');
            hasExpiringSoonFilterValues =  ServiceHelper.getWhereValues(req, 'ExpiringSoon');

            hasExpiredFilterIndex = ServiceHelper.getWhereId(req, 'Expired');
            hasExpiredFilterValues =  ServiceHelper.getWhereValues(req, 'Expired');

            isNewPriceAgreementFilterIndex = ServiceHelper.getWhereId(req, 'isNewPriceAgreement');
            isNewPriceAgreementFilterValues = ServiceHelper.getWhereValues(req, 'isNewPriceAgreement');

            if(hasNewMaterialsFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'hasNewMaterials');
            }

            if(hasNewPriceFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'hasNewPrice');
            }

            if(hasExpiringSoonFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'ExpiringSoon');
            }

            if(hasExpiredFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'Expired');
            }

            if(isNewPriceAgreementFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'isNewPriceAgreement');
            }
        }


        const data = await next();


        // 2. calculate the fields
        const calculateFields = async priceAgreement => {

            let customerPrices = priceAgreement.CustomerPrices;
            //let newMaterials = priceAgreement.Materials;
            
            let consumerPrice = priceAgreement.ConsumerPrice;
            const todaysDate = new Date();

            let calculatedFutureDate = new Date();
            calculatedFutureDate.setMonth(calculatedFutureDate.getMonth() + 3);

            // Get CustomerPrices if needed
            if(!customerPrices){
                let wherePriceAgreement = ServiceHelper.buildFullWhere("PriceAgreementId", "=", priceAgreement.ID);
                customerPrices = await tx.run(SELECT.from(CustomerPrices).where(wherePriceAgreement));
            }

            // Get NewMaterials if needed
            //if(!newMaterials){
                //let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                //let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                let wherePriceAgreement = ServiceHelper.buildFullWhere("PriceAgreementId", "=", priceAgreement.ID);
                 let newMaterials = await tx.run(SELECT.from(NewMaterialsView).where(wherePriceAgreement));
            //}

            // Get NewFOCMaterials if needed
            //if(!newMaterials){
                //let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                //let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                let newFOCMaterials = await tx.run(SELECT.from(NewFOCMaterialsView).where(wherePriceAgreement));
            //}

            // Get ConsumerPrices if needed
            if(!consumerPrice){
                let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                consumerPrice = await tx.run(SELECT.one.from(MostRecentConsumerPricesView).where(whereCountryCode).where(whereProductPackId));
            }

            // calculate Synchronized
            priceAgreement.Synchronized = false;
            // check needed - empty array will return true in case of every
            if(customerPrices && customerPrices.length > 0){
                priceAgreement.Synchronized = customerPrices.every(price => price.Synchronized);
            }

            // calculate isNewPriceAgreement
            priceAgreement.isNewPriceAgreement = !customerPrices.some(price => price.Applied || price.Applied === null) ;
            
            // calculate hasNewMaterials
            
           // If we don't have applied prices then hasnewmaterials is always FALSE. (so EVEN if we have new materials added)
            if(!customerPrices || customerPrices.length === 0){
                priceAgreement.hasNewMaterials = false;
            }else {
                let hasNewMaterials = newMaterials.some(price => price.isNew);
                let hasNewFOCMaterials = newFOCMaterials.some(price => price.isNew);

                if(hasNewMaterials || hasNewFOCMaterials){
                    priceAgreement.hasNewMaterials = true;
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
                priceAgreement.Expired = dExpiryDate < todaysDate ? true : false;
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

        if(hasExpiredFilterValues && hasExpiredFilterValues.length > 0){
            const filteredResult = result.filter(priceAgreement => priceAgreement.Expired);
            result = filteredResult;
        }

        if(isNewPriceAgreementFilterValues && isNewPriceAgreementFilterValues.length > 0){
            const filteredResult = result.filter(priceAgreement => priceAgreement.isNewPriceAgreement === isNewPriceAgreementFilterValues[0]);
            result = filteredResult;
        }
        await tx.commit();
        return req.reply(result);

	});

    srv.on('syncPriceAgreements', async req => {
        // const tx = cds.transaction(req);
		const tx = cds.tx();
        const customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: req.data.ids } }));
        if (customerPrices && customerPrices.length <= 0) {
            return req.reject(404, `No customer prices were found for the following PriceAgreement: ${req.data.ids}`);
        }
        const mainPriceConditions = customerPrices.filter(item => item.PriceCondition === "YLTP" || item.PriceCondition === "YLTF" || item.PriceCondition === "YL60" || item.PriceCondition === "YDC0");
        const focPriceConditions = customerPrices.filter(item => item.PriceCondition === "YA03" || item.PriceCondition === "YA01");
        const rappelPriceConditions = customerPrices.filter(item => item.PriceCondition === "YAW1");

        const updateMainConditionPromises = mainPriceConditions.map(custPrice => updateCustomerPrice(custPrice, tx, req));
        const updateFOCConditionPromises = focPriceConditions.map(custPrice => updateFOCcustPrices(custPrice, tx, req));
        const updateRappelConditionPromises = rappelPriceConditions.map(custPrice => updateRappelcustPrices(custPrice, tx, req));

        // Synchronize
        const result = await Promise.all(updateMainConditionPromises.concat(updateFOCConditionPromises).concat(updateRappelConditionPromises));
    
        await updateCustomerPrices(result, mainPriceConditions.concat(focPriceConditions).concat(rappelPriceConditions)); // !!the order of PriceCondition arrays is important

        return req.reply(result);
    });

    /**
     * This method sets the CustomerPrices 'Synchronized' to true and stores the API response (SAP backend) IDOC numbers in the corresponding CustomerPrice record.
     * The order and number of records in the {response} and the {priceConditions} arrays are the same (Promise.all returns the same order as the input array)
     * Since there is no correlation ID between the price conditions and the response from the API, we use Promise.all return order as correlation.
     * @param {Array} response 
     * @param {Array} priceConditions 
     */
    async function updateCustomerPrices(response, priceConditions){
        const tx = cds.tx();
        const refIdocIDs = response && response.map(res => res.headers.sapidocdbid) || [];
        const customerPriceIDs = priceConditions && priceConditions.map(condition => condition.ID) || [];
        if(refIdocIDs.length === customerPriceIDs.length){
            try {     
                const updatePromises = refIdocIDs.map((IdocID, index) => {
                    return tx.run(UPDATE(CustomerPrices).with({Synchronized: true, RefIdocNumber: IdocID}).where({ ID: customerPriceIDs[index] }));
                });
                await Promise.all(updatePromises);
                await tx.commit();
            } catch (error) {
                await tx.rollback(error);
            }
        }
    };


    async function updateCustomerPrice(customerPrice, tx, req){
        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));
        if (!institute) {
            return req.reject(404, `No institute was found for InstituteID: ${customerPrice.InstituteId}`);
        }
        const wherePriceAgreementId = ServiceHelper.buildFullWhere("Id", "=", customerPrice.PriceAgreementId);
        let priceAgreement = await tx.run(SELECT.one.from(PriceAgreements).where(wherePriceAgreementId));
        if (!priceAgreement) {
            return req.reject(404, `No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
        }
        const whereOfferID = ServiceHelper.buildFullWhere("OfferID", "=", priceAgreement.OfferId);
        const whereProductpackID = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", customerPrice.ProductPackId);
        let offer = await tx.run(SELECT.one.from(PT_TMOFRS).where(whereOfferID));     
        if (!offer) {
            return req.reject(404, `No offer was found for OfferID: ${priceAgreement.OfferId}`);
        }
        let packFactor;
        if(customerPrice.ProductPackId){
            let productPack = await tx.run(SELECT.one.from(PT_TMPRDPCK).where(whereProductpackID));
            packFactor = productPack.PACKFACTOR;
        } else {
            packFactor = 1;
        }

        let kbetr = parseFloat(customerPrice.Price);
        
        // Spain only
        if(customerPrice.CountryCode === 'ES'){
            const wherePriceAgreement_ID = ServiceHelper.buildFullWhere("PriceAgreement_ID", "=", customerPrice.PriceAgreementId);
            const wherePriceConditionCode = ServiceHelper.buildFullWhere("PriceConditionCode", "=", customerPrice.PriceCondition);
            let priceCondition = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceAgreement_ID).where(wherePriceConditionCode));     
            if (!priceCondition) {
                return req.reject(404, `No priceCondition was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            }
            // set KBETR value
            if(customerPrice.PriceCondition === "YLTF" || customerPrice.PriceCondition === "YLTP") kbetr = priceCondition.NetPriceWithoutTaxAfterDeductionRD;
            else kbetr = priceCondition.Discount;
        }

        // KBETR per Pack or Unit
        if (offer.Division === "Pharma" && priceAgreement.UoM === "Unit" ){// convert and send per pack
            kbetr  = kbetr * packFactor;
        }else if (offer.Division === "Radiology" && priceAgreement.UoM === "Pack" ) { // => radiology so per unit
            kbetr  = kbetr / packFactor;

        }

        const body = getPriceAgreementRequestBodyTemplate(); 
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KUNNR = parseInt(institute.CustomerID);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.MATNR = parseInt(customerPrice.MaterialNumber);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth()+1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth()+1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KBETR = kbetr;

        return await updatePriceConditions(customerPrice.CountryCode, "PriceCondition", body);

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
                  "SNDPOR": "",  //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | the value is added per environment in the CPI configuration
                  "SNDPRT": "LS",
                  "SNDPRN": "FAST_IT",
                  "RCVPOR": "",  //this is different for DEV (SAPD2R) /QA (SAPQ2R)/PROD (SAPP2R) | the value is added per environment in the CPI configuration
                  "RCVPRT": "LS",
                  "RCVPRN": "",  //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | | the value is added per environment in the CPI configuration
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



    async function updatePriceConditions(countryCode, resource, body){

        if (!body) {
            throw Error("The body of the request is missing.");
        }

        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({Provider:'PriceAgreement', CountryCode: countryCode, Resource: resource}));

        const url = `${apiConfig.Host}${apiConfig.BasePath}${apiConfig.ResourcePath}`;
        const oauthCredentials = await getBearerToken();

        console.log(`Synchronizing Price Conditions ...`);
        console.log(`Calling endpoint ${url}`);
        
        // console.log("Update Price Conditions oauthCredetials:", oauthCredentials);
        // console.log("Update Price Conditions proxyHost:", priceAgreementApi.ProxyHost);
        // console.log("Update Price Conditions proxyPort:", priceAgreementApi.ProxyPort);

        return axios({
            method: 'post',
            url: url,
            headers: {
                'Authorization': `Bearer ${oauthCredentials.data.access_token}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(body)/*, when testing locally or on BTP, comment out the proxy
            proxy: {
                host: priceAgreementApi.ProxyHost,
                port: priceAgreementApi.ProxyPort
            }*/
        });
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
                })/*, when testing locally, comment out the proxy
                proxy: {
                    host: priceAgreementApi.ProxyHost,
                    port: priceAgreementApi.ProxyPort
                }*/
            });
        }

        throw Error("Missing OAUTH config parameters");
    };


    async function updateFOCcustPrices(customerPrice, tx, req){
        
        const wherePriceAgreementId = ServiceHelper.buildFullWhere("Id", "=", customerPrice.PriceAgreementId);
        let priceAgreement = await tx.run(SELECT.one.from(PriceAgreements).where(wherePriceAgreementId));
        if (!priceAgreement) {
            return req.reject(404, `No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
        }

        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        const whereProductCode = ServiceHelper.buildFullWhere("ProductCode", "=", customerPrice.ProductPackId);
        const whereOfferId = ServiceHelper.buildFullWhere("OfferId", "=", priceAgreement.OfferId);
        const whereOfferID = ServiceHelper.buildFullWhere("OfferID", "=", priceAgreement.OfferId);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        const whereFOCproductpackID = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", customerPrice.FOCproductPackID);

        let offerProduct = await tx.run(SELECT.one.from(PT_TMOFPR).where(whereCountry).where(whereProductCode).where(whereOfferID));
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));
        let offer = await tx.run(SELECT.one.from(PT_TMOFRS).where(whereOfferID));
        if (!offer) {
            return req.reject(404, `No offer was found for OfferID: ${priceAgreement.OfferId}`);
        }

        // TODO: Isma will check with Jonathan if this is correct
        let packFactor = 1;
        if(customerPrice.FOCproductPackID){
            productPack = await tx.run(SELECT.one.from(PT_TMPRDPCK).where(whereFOCproductpackID));
            if(productPack) packFactor = productPack.PACKFACTOR;
        }

        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);

        const body = getPriceAgreementRequestBodyTemplate();
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KUNNR = parseInt(institute.CustomerID);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.MATNR = parseInt(customerPrice.MaterialNumber);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth()+1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth()+1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KSCHL = customerPrice.PriceCondition;

        let kstbm = "";
        let mikbas = "";
        let mxkbas = "";
        // Italy only
        if(customerPrice.CountryCode === 'IT'){
            let priceAgreementFOC = await tx.run(SELECT.one.from(PriceAgreementFOC).where(whereCountry).where(whereProductCode).where(whereOfferId));
            kstbm =  customerPrice.FOCproductPackID !== null && priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' ? (parseInt(priceAgreementFOC.FreeGoods) * offerProduct.RequestedVolume) : (customerPrice.FOCproductPackID !== null && (priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS' || priceAgreementFOC.FreeGoods_ABS_PCT === 'STP'))  ? parseInt(priceAgreementFOC.FreeGoods) : 0;
            mikbas = customerPrice.FOCproductPackID !== null && (priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' || priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS') ? 1 : (customerPrice.FOCproductPackID !== null && priceAgreementFOC.FreeGoods_ABS_PCT === 'STP') ? parseInt(priceAgreementFOC.FreeGoods_Step) : 0;
            mxkbas = customerPrice.FOCproductPackID !== null && (priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' || priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS') ? offerProduct.RequestedVolume : (customerPrice.FOCproductPackID !== null && priceAgreementFOC.FreeGoods_ABS_PCT === 'STP') ? parseInt(priceAgreementFOC.FreeGoods_Step) : 0;
        }
        // Spain only
        if(customerPrice.CountryCode === 'ES'){
            const wherePriceAgreement_ID = ServiceHelper.buildFullWhere("PriceAgreement_ID", "=", customerPrice.PriceAgreementId);
            const wherePriceConditionCode = ServiceHelper.buildFullWhere("PriceConditionCode", "=", customerPrice.PriceCondition);
            let priceCondition = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceAgreement_ID).where(wherePriceConditionCode));    
            if (!priceCondition) {
                return req.reject(404, `No priceCondition was found for "${customerPrice.PriceCondition}" with PriceAgreementID "${customerPrice.PriceAgreementId}"`);
            }
            let priceAgreementFOC = await tx.run(SELECT.one.from(FreeGoodsOther).where({PriceCondition_ID:priceCondition.ID})); 
            if (!priceAgreementFOC) {
                return req.reject(404, `No FreeGoodsOther was found for PriceConditionID: ${priceCondition.ID}`);
            }

            kstbm = parseInt(priceAgreementFOC.FOCBonus);
            mikbas = priceAgreementFOC.FOCMinAmount;
            mxkbas = priceAgreementFOC.FOCMinAmount;
        }


        if ((offer.Division === "Pharma" || offer.Division === "Consumer Health") && priceAgreement.UoM === "Unit" ){// convert and send per pack
            kstbm  = kstbm * packFactor;
            mikbas = mikbas * packFactor;
            mxkbas = mxkbas * packFactor;
        }else if (offer.Division === "Radiology" && priceAgreement.UoM === "Pack" ) { // => radiology so per unit
            kstbm  = kstbm / packFactor;
            mikbas = mikbas / packFactor;
            mxkbas = mxkbas / packFactor;
        }else if (offer.Division === "Radiology" && priceAgreement.UoM === "Pack" ) { // => radiology so per unit
            kstbm  = kstbm * packFactor;
            mikbas = mikbas * packFactor;
            mxkbas = mxkbas * packFactor;

        }
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KSTBM = kstbm;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.MIKBAS = mikbas;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.MXKBAS = mxkbas;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KUNNR = parseInt(institute.CustomerID);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.BOMAT = parseInt(customerPrice.MaterialNumber);
        
        return await updatePriceConditions(customerPrice.CountryCode, "PriceCondition", body);

    };


    async function updateRappelcustPrices(customerPrice, tx, req){

        let priceAgreement = await tx.run(SELECT.one.from(PriceAgreements).where({ID: customerPrice.PriceAgreementId}));
        if (!priceAgreement) {
            return req.reject(404, `No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
        }
        let priceCondition = await tx.run(SELECT.one.from(PriceCondition).where({PriceAgreement_ID: customerPrice.PriceAgreementId}).where({PriceConditionCode: customerPrice.PriceCondition}));    
        if (!priceCondition) {
            return req.reject(404, `No priceCondition was found for "${customerPrice.PriceCondition}" with PriceAgreementID "${customerPrice.PriceAgreementId}"`);
        }

        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));

        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);

        const body = getES01RequestBodyTemplate();
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].BONEM = priceAgreement.InstituteId;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth()+1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth()+1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].DATAB_GR = body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATAB;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].DATBI_GR = body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATBI;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KUNNR = parseInt(institute.CustomerID);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].MATNR = parseInt(customerPrice.MaterialNumber);


        // DiscountConditions
        let lowestDiscountCondition = null;
        const discountConditions = await tx.run(SELECT.from(DiscountCondition).where({PriceCondition_ID: priceCondition.ID}));
        if(discountConditions){
            lowestDiscountCondition = discountConditions.reduce((prev, current) => (prev.Volume < current.Volume) ? prev : current);
            discountConditions.forEach(dc => {
                body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].E1KONW.push({
                    "KSTBW": dc.Volume,
                    "KBETR": dc.Discount.toFixed(2) + "-"
                });
            });
        }

        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KBETR = lowestDiscountCondition && lowestDiscountCondition.Discount && lowestDiscountCondition.Discount.toFixed(2).concat("-") || ""; // KBETR from the minimum(KSTBW)
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KBRUE = lowestDiscountCondition && lowestDiscountCondition.Volume + "-" || ""; // minimum(KSTBW) value from the DiscountConditions array


        return await updatePriceConditions(customerPrice.CountryCode, "PriceConditionRappel", body);
    };


    function getES01RequestBodyTemplate(){
        return {
            "_BAY0-GZ_SALESAGR_ES01": {
                "IDOC": {
                    "EDI_DC40": {
                        "TABNAM": "EDI_DC40",
                        "MANDT": 508,
                        "DOCNUM": 36256484,
                        "DOCREL": 740,
                        "STATUS": 53,
                        "DIRECT": 2,
                        "OUTMOD": "",
                        "IDOCTYP": "/BAY0/GZ_SALESAGR_ES01",
                        "MESTYP": "/BAY0/GZ_SALESAGR_ES",
                        "SNDPOR": "", //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | the value is added per environment in the CPI configuration
                        "SNDPRT": "LS",
                        "SNDPRN": "FAST_ES",
                        "RCVPOR": "", //this is different for DEV (SAPD2R) /QA (SAPQ2R)/PROD (SAPP2R) | the value is added per environment in the CPI configuration
                        "RCVPRT": "LS",
                        "RCVPRN": "", //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | | the value is added per environment in the CPI configuration
                        "CREDAT": 20220404,
                        "CRETIM": 145201
                    },
                    "_BAY0-GZ_SALESAGRHEAD": {
                        "BOART": "YAW1",
                        "VKORG": "QFHC",
                        "VTWEG": 0,
                        "SPART": 0,
                        "BONEM": 0,
                        "BOTEX": "RCT COM. W. ACCRUALS",
                        "DATAB": 0,
                        "DATBI": 0,
                        "CURCY": "EUR",
                        "ZTERM": "D496",
                        "ZLSCH": "M",
                        "ABREX": "TEST AGMNT",
                        "KOTABNR": 750,
                        "KVEWE": "A",
                        "KAPPL": "V",
                        "_BAY0-GZ_SALESAGRITEM": [
                            {
                                "KUNNR": 0,
                                "DATAB_GR": 0,
                                "DATBI_GR": 0,
                                "MATNR": 0,
                                "KBETR": "0-",
                                "KONWA": "EUR",
                                "KPEIN": 1,
                                "KBRUE": 0,
                                "KSCHL": "YAW1",
                                "E1KONW": []
                            }
                        ]
                    }
                }
            }
        }
    };

}