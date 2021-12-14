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
            return req.reject(error.response.status, error.message);
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



    srv.on('processCustomers', async req => {

        try {
            await processCustomers();
        } catch (error) {
            console.log(error);
        }


    });


    async function processCustomers(){
        try {

            // 1. Create new Institute entries for new Customers
            await createInstituteEntries();
            // 2. Update Institute master data for existing Customers
            // await updateInstituteEntries();
            // 3. Delete ItalyCustomers table
            // await clearItalyCustomersTable();

        } catch (error) {
            console.log('Processing of Italy customers has failed.');
            console.log(error);
            return saveError(error);
        }
    };


    /**
     * Create new Institute entries for new Customers
     * @return {Promise} Promise
     */
    async function createInstituteEntries(){

        try {
            const { ItalyCustomers } = db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { CountryProvinces, PT_TMINST } = db.entities("com.bayer.SXTENDER.MasterData");

            let customerNumbers =  await cds.run(cds.parse.cql (`SELECT CustomerID from ${PT_TMINST.name} WHERE CountryCode = 'IT'`));
            customerNumbers = customerNumbers.map(item => addLeadingZeros(item.CustomerID, 10));

            let query = cds.parse.cql (`SELECT * FROM ${ItalyCustomers.name} AS customer 
            inner join ${CountryProvinces.name} AS province ON customer.E1KNA1M_REGIO = province.Name`);

            // 'not in' where expression was not wokring properly
            // because of this we are using this hack
            // TODO: find a better way to handle this
            let {xpr} = cds.parse.expr(`customer.E1KNA1M_KUNNR not in '${customerNumbers}' AND customer.E1KNA1M_LAND1 = 'IT'`);
            xpr[3].val = customerNumbers;
            query.SELECT.where = xpr;

            const customers = await cds.run(query);
            let nextInstituteID = await getLastInstituteID();

            const instituteEntries = customers.map(cust => {
                return {
                    CountryCode: cust.E1KNA1M_LAND1,
                    InstituteID: ++nextInstituteID,
                    CustomerID: cust.E1KNA1M_KUNNR,
                    InstituteName: cust.E1KNA1M_NAME1,
                    InstituteType: getInstituteType(cust.E1KNVVM_KVGR3),
                    Address: `${cust.E1KNA1M_STRAS}, ${cust.E1KNA1M_PSTLZ} ${cust.E1KNA1M_ORT01} \ VAT: ${cust.E1KNA1M_STCEG} \ Fiscal Code: ${cust.E1KNA1M_STCD1}`,
                    ContactNo: cust.E1KNA1M_TELF1,
                    Fax: cust.E1KNA1M_TELFX,
                    ContactPerson: cust.E1KNA1M_STKZN,
                    ActiveRecord: "Yes",
                    Comment: cust.E1KNVVM_KVGR3, // temp to keep track of code
                    City: cust.E1KNA1M_ORT01,
                    INSTITUTE_HIERARCHY_ID: 1,
                    State: "",
                    MercadoPublicoIssuer: "",
                    RegionID: cust.RegionID
                    // --"E1KNVVM_INCO1",--INCO1
                    // --"E1KNVVM_INCO2",--INCO2
                    // --"E1KNVVM_ZTERM",--PaymentTerms
                }
            });

            if(instituteEntries && instituteEntries.length > 0){
                const result = await cds.run(INSERT(instituteEntries).into(PT_TMINST));
                console.log(`${instituteEntries.length} Institutes successfully created in ${PT_TMINST.name}.`);
                return result;
            }

            return;

        } catch (error) {
            console.log('Creating Institutes has failed.');
            console.log(error);
        }   

    };


    /**
     * 
     * @param {String} id Customer group 3
     * @returns {String} InstituteType 
     */
    function getInstituteType(id){
        const KVGR3 = {
            "I61": "PHARMAC.SUPPL. HOSP.",
            "I69": "WHOLE. SUPPL. HOSP.",
            "I64": "RET. SUPPL. HOSP.",
            "I66": "VETERINARY CLINIC",
            "I62": "PRIVATE / COMPANIES",
            "OEM": "OEM",
            "I53": "GLOBAL SERVICE",
            "I43": "BAYER APPOINTED DISTRIBUTOR",
            "I50": "CUST OWN LABEL BAYER SKU",
            "I55": "MASS MKT",
            "I58": "PERIMETER",
            "BVL": "DIRECT PHARMACY",
            "I44": "CHAIN",
            "I54": "INDIRECT PHARMACY",
            "L31": "PARAPHARMACY",
            "I45": "CHAIN PARAF",
            "I67": "WHOLESALER AND COOP",
            "I57": "MUNICIPAL",
            "I49": "VTO",
            "L40": "VETERINARY WHOLESALER",
            "I68": "WHOLESALER AH OTC",
            "I42": "ASL / AO / IRCCS PUBLIC",
            "I63": "REGIONAL COMPANIES",
            "I56": "ARMY/JAIL/MINISTRY",
            "I65": "UNIVERSITY AND CNR",
            "I46": "CLINIC ACCREDITED BY HA",
            "I47": "CLINIC NOT ACCREDITED BY HA",
            "I51": "EYE DOCTOR",
            "BVK": "LABORATORIES AND RADIOLOGIC CENTERS ",
            "I59": "PET SHOP",
            "I40": "AGRARIAN SHOP",
            "I41": "AGRICULTURAL UNION",
            "I52": "GARDEN CENTER",
            "I60": "PET SHOP CHAIN",
            "AUI": "BAYER AFFILIATES",
            "I48": "COMPANY STORE"
        }
        return KVGR3[id];
    };


    /**
     * Clears the ItalyCustomers table
     * @return {Promise} Promise
     */
     async function clearItalyCustomersTable(){
        try {
            const { ItalyCustomers } = db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await cds.run(DELETE.from(ItalyCustomers));
            console.log(`${ItalyCustomers.name} table cleared successfully`);
            return result;
            
        } catch (error) {
            console.log('Clearing the Italy Customers table failed');
            console.log(error);
        }    
    };


    async function getLastInstituteID(){
        try {
            const { PT_TMINST } = db.entities("com.bayer.SXTENDER.MasterData");
            const lastInstituteID = await cds.run(SELECT.one.from(PT_TMINST, ['Max(INSTITUTEID) as max']));
            return lastInstituteID.max;
        } catch (error) {
            console.log(error);
        }
    };


    /**
     * Adds leading zero's to a number
     * @param {Integer} num Number
     * @param {Integer} size Length of the number
     * @returns 
     */
     function addLeadingZeros (num, size) {
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };


    /**
     * Saves the error in the DB.
     * @param {Object} error 
     * @returns {Promise}
     */
     async function saveError(error){

        if(!error) throw new Error(`You must provide a error object`);

        try{
            const errorEntity = {
              JobName: "ItalyJobs",
              JobDescription: "ProcessMaterials",
              ErrorMessage: error.message,
              ResourceURL: "",
              ConsultationDate: new Date().toJSON()
            };

            return await cds.run(INSERT.into('com.bayer.SXTENDER.AdminData.SchedulerErrorLog', errorEntity));

          }catch(err){
            console.log(err);
          }
  
      }

}