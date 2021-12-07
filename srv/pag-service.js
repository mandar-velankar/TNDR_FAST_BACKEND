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

            return axios({
                method: 'post',
                url: url,
                headers: {
                    'Authorization': `Bearer ${oauthCredentials.data.access_token}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(body)
            });
        }

        throw Error("The body of the request is missing.");

    };

    async function getBearerToken() {

        if (oauthAuth.OAuthProvider && oauthAuth.ClientID && oauthAuth.ClientSecret) {
            return axios({
                method: 'post',
                url: oauthAuth.OAuthProvider,
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${oauthAuth.ClientID}:${oauthAuth.ClientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify({
                    'grant_type': oauthAuth.GrantType
                })
            });
        }

        throw Error("Missing OAUTH config parameters");
    };



    srv.on('processMaterials', async req => {

        const tx = cds.transaction(req);
    
        try {
            await processNewMaterials();
            // await updateExistingMaterials(); // TODO: not implemented
        } catch (error) {
            console.log(error);
        }

    });



    async function processNewMaterials(){

        // 1. Create Hierarchy entries for new products
        const hierarchyEntries = await createHierarchyEntries();
        if(hierarchyEntries && hierarchyEntries.message) console.log(hierarchyEntries.message);

        // 2. Create new products master data
        await createProductsMasterData();
        console.log('Products master data successfully created');

    };

    /**
     * Create Hierarchy entries for new products
     * @return {Promise} Promise
     */
    async function createHierarchyEntries(){

        const { ItalyMaterials } = db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const { PT_TMPRDHIER } = db.entities("com.bayer.SXTENDER.MasterData");

        let existingHlevel6Code = await cds.run(SELECT.from(PT_TMPRDHIER, ['HLEVEL6_CODE']));
        existingHlevel6Code = existingHlevel6Code.map(item => item.HLEVEL6_CODE.toString());

        const whereExpr = `MAKTX <> 'Customer Service Holding Material' and
        HLEVEL6_NAME not like 'zz%' and
        HLEVEL1_NAME <> 'Animal Health' and
        HLEVEL1_NAME <> 'Consumer Health'`;

        // 'not in' where expression was not wokring properly
        // because of this we are using this hack
        // TODO: find a better way to handle this
        let {xpr} = cds.parse.expr(`HLEVEL6_CODE not in '${existingHlevel6Code}'`);
        xpr[3].val = existingHlevel6Code;
        
        const newMaterials = await cds.run(SELECT.distinct.from(ItalyMaterials, ["HLEVEL1_NAME","HLEVEL4_NAME","HLEVEL4_CODE","HLEVEL6_NAME","HLEVEL6_CODE"]).where(whereExpr).where(xpr));
        
        if( newMaterials.length <= 0 ) return {message: `No hierarchy entries were created. No new materials were found in ${ItalyMaterials.name}`};

        const hierarchyEntries = newMaterials.map(mat => {

            let hlevel1_code = mat.HLEVEL1_NAME && mat.HLEVEL1_NAME.toLowerCase() === "Pharma".toLowerCase() ? 8 : mat.HLEVEL1_NAME.toLowerCase() === "Radiology".toLowerCase() ? 65 : 0; 

            return {
                HLEVEL1_NAME: mat.HLEVEL1_NAME,
                HLEVEL1_CODE: hlevel1_code, 
                HLEVEL2_NAME: "NEW", // TODO: this is for testing, remove in prod
                HLEVEL2_CODE: "",
                HLEVEL3_NAME: "",
                HLEVEL3_CODE: "",
                HLEVEL4_NAME: mat.HLEVEL4_NAME,
                HLEVEL4_CODE: mat.HLEVEL4_CODE,
                HLEVEL5_NAME: "",
                HLEVEL5_CODE: "",
                HLEVEL6_NAME: mat.HLEVEL6_NAME,
                HLEVEL6_CODE: mat.HLEVEL6_CODE,
            }
        });

        return cds.run(INSERT(hierarchyEntries).into(PT_TMPRDHIER));

    };

    /**
     * Create new products master data
     * @param {Object} material Material 
     * @return {Promise} Promise
     */
    async function createProductsMasterData(){

        let lastProductPackID = await getLastProductPackID();

        // 2.a Create new product packs
        const productPacks = await createProductPacks(lastProductPackID);
        if(productPacks && productPacks.message) console.log(productPacks.message);

        // 2.b Create new Country Product Packs
        const countryProductPacks = await createCountryProductPacks(lastProductPackID);
        // 2.c Create new SKUs
        const skys = await createSKUs();
        // 2.d Create new COGS
        const cogs = await createCOGS();
    };

     /**
     * Create new product packs
     * @return {Promise} Promise
     */
      async function createProductPacks(lastProductPackID){

        const { ItalyMaterials } = db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const { PT_TMPRDPCK, PT_TMCTPRDPCK } = db.entities("com.bayer.SXTENDER.MasterData");

        let query = cds.parse.cql (`SELECT p.ProductPackName from ${PT_TMPRDPCK.name} AS p 
        inner join ${PT_TMCTPRDPCK.name} AS cp on p.PRODUCTPACKID = cp.PRODUCTPACKID WHERE cp.CountryCode='IT'`);
        let ProductPackNames =  await cds.run(query);
        ProductPackNames = ProductPackNames.map(item => item.ProductPackName);

        const whereExpr = `MAKTX <> 'Customer Service Holding Material' and
        HLEVEL6_NAME not like 'zz%' and
        HLEVEL1_NAME <> 'Animal Health' and
        HLEVEL1_NAME <> 'Consumer Health'`;

        // 'not in' where expression was not wokring properly
        // because of this we are using this hack
        // TODO: find a better way to handle this
        let {xpr} = cds.parse.expr(`MAKTX not in '${ProductPackNames}'`);
        xpr[3].val = ProductPackNames;
        
        const materials = await cds.run(SELECT.from(ItalyMaterials, ['MAKTX','HLEVEL6_CODE']).where(whereExpr).where(xpr).groupBy(`MAKTX, HLEVEL6_CODE`));
        
        if( materials.length <= 0 ) return {message: `Could not create product pack. /nNo new materials were found in ${ItalyMaterials.name}.`};

        const productPackEntries = materials.map(mat => {

            return {
                PRODUCTPACKID: ++lastProductPackID,
                PRODUCTPACKNAME: mat.MAKTX,
                PRESENTATION: "NEW", // TODO: remove this in production
                UOM: "",
                ACTIVERECORD: "Yes",
                HLEVEL6_CODE: mat.HLEVEL6_CODE,
                CONCENTRATION: 1,
                PACKFACTOR: 1,
                PCINAME: "",
                MOLECULENAME: "",
                ACTIVE_SUBSTANCE: "",
                PRODUCTTYPE: "Drug"
            }
        });

        return cds.run(INSERT(productPackEntries).into(PT_TMPRDPCK));
            
    };

    /**
     * Create new country product packs
     * @return {Promise} Promise
     */
     async function createCountryProductPacks(lastProductPackID){

        const { ItalyMaterials } = db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const { PT_TMCTPRDPCK, PT_TMPRDPCK } = db.entities("com.bayer.SXTENDER.MasterData");

        let ProductPackIDs =  await cds.run(cds.parse.cql (`SELECT ProductPackID from ${PT_TMCTPRDPCK.name} WHERE CountryCode='IT'`));
        ProductPackIDs = ProductPackIDs.map(item => item.ProductPackID.toString());


        let query = cds.parse.cql (`SELECT max(material.COUNTRYOFORIG), product.ProductPackID FROM ${ItalyMaterials.name} AS material 
        inner join ${PT_TMPRDPCK.name} AS product ON material.MAKTX = product.ProductPackName`);

        // 'not in' where expression was not wokring properly
        // because of this we are using this hack
        // TODO: find a better way to handle this
        let {xpr} = cds.parse.expr(`product.ProductPackID not in '${ProductPackIDs}' AND product.ProductPackID > ${lastProductPackID}`);
        xpr[3].val = ProductPackIDs;
        query.SELECT.where = xpr;
        query.SELECT.groupBy = [
            {
                "ref": ['product','ProductPackID']
            }
        ];

        const materials = await cds.run(query);
        
        if( materials.length <= 0 ) return {message: `Could not create country product pack. /nNo new materials were found in ${ItalyMaterials.name}.`};

        let nextCountryProductPackID = await getLastCountryProductPackID();

        const countryProductPackEntries = materials.map(mat => {

            return {
                COUNTRYPRODUCTPACKID: ++nextCountryProductPackID,
                COUNTRYCODE: "IT",
                COUNTRYOFORIGIN: mat.COUNTRYOFORIGIN,
                SHELFLIFE: 1,
                REGISTERED: 2,
                ACTIVERECORD: "Yes",
                PRODUCTPACKID: mat.ProductPackID,
                MANUFACTURER:"NEW",
                Presentation_2: "",
                VTATax: 10,
                COMMENT: "",
                GOV_CODE: "",
                CODE1: "",
                CODE2: "",
                QTY_THRESHOLD: 0,
            }
        });

        return cds.run(INSERT(countryProductPackEntries).into(PT_TMCTPRDPCK));
            
    };

    /**
     * Create new SKUs
     * @return {Promise} Promise
     */
    async function createSKUs(){

        const { ItalyMaterials } = db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const { PT_TMSKUPRDPCK, PT_TMPRDPCK, PT_TMCTPRDPCK } = db.entities("com.bayer.SXTENDER.MasterData");

        let skuCodes =  await cds.run(cds.parse.cql (`SELECT DISTINCT SKUCode from ${PT_TMSKUPRDPCK.name}`));
        skuCodes = skuCodes.map(item => addLeadingZeros(item.SKUCode, 18));


        let query = cds.parse.cql (`SELECT product.ProductPackID, MATNR FROM ${ItalyMaterials.name} AS material 
        inner join ${PT_TMPRDPCK.name} AS product ON material.MAKTX = product.ProductPackName
        inner join ${PT_TMCTPRDPCK.name} AS countryProduct ON product.ProductPackID = countryProduct.ProductPackID`);

        // 'not in' where expression was not wokring properly
        // because of this we are using this hack
        // TODO: find a better way to handle this
        let {xpr} = cds.parse.expr(`material.MATNR not in '${skuCodes}' AND countryProduct.CountryCode = 'IT'`);
        xpr[3].val = skuCodes;
        query.SELECT.where = xpr;
        query.SELECT.groupBy = [
            {
                "ref": ['product','ProductPackID']
            },
            {
                "ref": ['material','MATNR']
            }
        ];

        const materials = await cds.run(query);
        
        if( materials.length <= 0 ) return {message: `Could not create SKUs`};

        let nextSkuProductPackID = await getLastSkuProductPackID();

        const skuProductPackEntries = materials.map(mat => {

            return {
                CountrySKUID: ++nextSkuProductPackID,
                CountryCode: "IT",
                ActiveRecord: "Yes",
                ProductPackID: mat.ProductPackID,
                SKUCode: Number(mat.MATNR),
            }
        });

        return cds.run(INSERT(skuProductPackEntries).into(PT_TMSKUPRDPCK));
            
    };

    /**
     * Create new COGS
     * @return {Promise} Promise
     */
     async function createCOGS(){

        const { ItalyMaterials } = db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const { PT_TMPRDPCK, PT_TMCTPRDPCK, PT_TMCOGS } = db.entities("com.bayer.SXTENDER.MasterData");

        let query = cds.parse.cql (`SELECT product.ProductPackID, MAX(COGS) FROM ${ItalyMaterials.name} AS material 
        inner join ${PT_TMPRDPCK.name} AS product ON material.MAKTX = product.ProductPackName
        inner join ${PT_TMCTPRDPCK.name} AS countryProduct ON product.ProductPackID = countryProduct.ProductPackID
        where countryProduct.CountryCode='IT'`);

        // TODO: find a better way to handle this
        query.SELECT.groupBy = [
            {
                "ref": ['product','ProductPackID']
            }
        ];

        const materials = await cds.run(query);
        
        if( materials.length <= 0 ) return {message: `Could not create COGS`};

        let nextCogsID = await getLastCogsID();

        const cogsEntries = materials.map(mat => {

            return {
                COGSID: ++nextCogsID,
                CountryCode: "IT",
                ProductPackID: mat.ProductPackID,
                EffectiveDate: new Date().toISOString().slice(0, 10),
                EndDate: "9999-12-31",
                Currency: "EUR",
                COGSType: "Budget",
                COGS: mat.COGS,
                ActiveRecord: "Yes",
            }
        });

        return cds.run(INSERT(cogsEntries).into(PT_TMCOGS));
            
    };

    /**
     * Get the last product pack id from PT_TMPRDPCK entity
     * @returns {Promise} lastProductPackID 
     */
    async function getLastProductPackID(){
        const { PT_TMPRDPCK } = db.entities("com.bayer.SXTENDER.MasterData");
        const lastProductPackID = await cds.run(SELECT.one.from(PT_TMPRDPCK, ['Max(PRODUCTPACKID) as max']));
        return lastProductPackID.max;
    };

    async function getLastCountryProductPackID(){
        const { PT_TMCTPRDPCK } = db.entities("com.bayer.SXTENDER.MasterData");
        const lastCountryProductPackID = await cds.run(SELECT.one.from(PT_TMCTPRDPCK, ['Max(PRODUCTPACKID) as max']));
        return lastCountryProductPackID.max;
    };

    async function getLastSkuProductPackID(){
        const { PT_TMSKUPRDPCK } = db.entities("com.bayer.SXTENDER.MasterData");
        const lastSkuProductPackID = await cds.run(SELECT.one.from(PT_TMSKUPRDPCK, ['Max(COUNTRYSKUID) as max']));
        return lastSkuProductPackID.max;
    };

    async function getLastCogsID(){
        const { PT_TMCOGS } = db.entities("com.bayer.SXTENDER.MasterData");
        const lastCogsID = await cds.run(SELECT.one.from(PT_TMCOGS, ['Max(COGSID) as max']));
        return lastCogsID.max;
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

    async function updateExistingMaterials(materials){
        // TODO: not implemented
    };
}