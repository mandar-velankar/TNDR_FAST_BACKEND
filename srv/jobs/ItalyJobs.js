const cds = require('@sap/cds');
// const BaseCron = require('cron-es6');
const BaseJob = require('./BaseJob');

module.exports.ProcessMaterials = class ProcessMaterials extends BaseJob {

    constructor(jobName,jobTime) {
        super(jobName,jobTime);
    }

    /**
     * Triggered when job has started
     */
    //override
    async onTick() {

        console.log('Processing Italy materials started ...');

        try {
            this.db = await cds.connect.to('db'); 
            await this.processNewMaterials();
            // await updateExistingMaterials(); // TODO: not implemented
        } catch (error) {
            console.log(error);
        }

        // when the job has finished, call the stop()
        // this will trigger onComplete method
        // this.stop();
        console.log('Processing Italy materials finished.');
    }

    /**
     * Triggered when the job has finished.
     * You have to call the job.stop() method when the job is done.
     */
    // //override
    // async onComplete() {
    //     console.log('Processing Italy materials finished.');
    // }


    async processNewMaterials(){
        try {
            // 1. Create Hierarchy entries for new products
            await this.createHierarchyEntries();
            // 2. Create new products master data
            await this.createProductsMasterData();
            // 3. Delete ItalyMaterials table
            await this.clearItalyMaterialsTable();
        } catch (error) {
            console.log('Processing of new materials has failed.');
            console.log(error);
            return this.saveError(error);
        }
    };

    /**
     * Create Hierarchy entries for new products
     * @return {Promise} Promise
     */
    async createHierarchyEntries(){

        try {

            const { ItalyMaterials } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { PT_TMPRDHIER } = this.db.entities("com.bayer.SXTENDER.MasterData");

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
                    HLEVEL2_NAME: "",
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

            if(hierarchyEntries && hierarchyEntries.length > 0){
                const result = await cds.run(INSERT(hierarchyEntries).into(PT_TMPRDHIER));
                console.log(`${hierarchyEntries.length} hierarchy entries successfully created in ${PT_TMPRDHIER.name}.`);
                return result;
            }

            return;

        }catch (error) {
            console.log('Creating hierarchy entries has failed.');
            console.log(error);
        }

    };

    /**
     * Create new products master data
     * @param {Object} material Material 
     * @return {Promise} Promise
     */
    async createProductsMasterData(){
        try {
            const lastProductPackID = await this.getLastProductPackID();
            // 2.a Create new product packs
            await this.createProductPacks(lastProductPackID);
            // 2.b Create new Country Product Packs
            await this.createCountryProductPacks(lastProductPackID);
            // 2.c Create new SKUs
            await this.createSKUs();
            // 2.d Create new COGS
            await this.createCOGS();
        } catch (error) {
            console.log('Creating products master data has failed.');
            console.log(error);
        }
    };

     /**
     * Create new product packs
     * @return {Promise} Promise
     */
      async createProductPacks(lastProductPackID){

        try {
            const { ItalyMaterials } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { PT_TMPRDPCK, PT_TMCTPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");

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

            const productPackEntries = materials.map(mat => {
                return {
                    PRODUCTPACKID: ++lastProductPackID,
                    PRODUCTPACKNAME: mat.MAKTX,
                    PRESENTATION: "",
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

            if(productPackEntries && productPackEntries.length > 0){
                const result = await cds.run(INSERT(productPackEntries).into(PT_TMPRDPCK));
                console.log(`${productPackEntries.length} product packs successfully created in ${PT_TMPRDPCK.name}.`);
                return result;
            }

            return;
            
        } catch (error) {
            console.log('Creating product packs has failed.');
            console.log(error);
        }
    };

    /**
     * Create new country product packs
     * @return {Promise} Promise
     */
     async createCountryProductPacks(lastProductPackID){

        try {
            const { ItalyMaterials } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { PT_TMCTPRDPCK, PT_TMPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");

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
            let nextCountryProductPackID = await this.getLastCountryProductPackID();

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

            if(countryProductPackEntries && countryProductPackEntries.length > 0){
                const result = await cds.run(INSERT(countryProductPackEntries).into(PT_TMCTPRDPCK));
                console.log(`${countryProductPackEntries.length} country product packs successfully created in ${PT_TMCTPRDPCK.name}.`);
                return result;
            }

            return;

        } catch (error) {
            console.log('Creating country product packs has failed.');
            console.log(error);
        }  
    };

    /**
     * Create new SKUs
     * @return {Promise} Promise
     */
    async createSKUs(){

        try {
            const { ItalyMaterials } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { PT_TMSKUPRDPCK, PT_TMPRDPCK, PT_TMCTPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");

            let skuCodes =  await cds.run(cds.parse.cql (`SELECT DISTINCT SKUCode from ${PT_TMSKUPRDPCK.name}`));
            skuCodes = skuCodes.map(item => this.addLeadingZeros(item.SKUCode, 18));

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
            let nextSkuProductPackID = await this.getLastSkuProductPackID();

            const skuProductPackEntries = materials.map(mat => {
                return {
                    CountrySKUID: ++nextSkuProductPackID,
                    CountryCode: "IT",
                    ActiveRecord: "Yes",
                    ProductPackID: mat.ProductPackID,
                    SKUCode: Number(mat.MATNR),
                }
            });

            if(skuProductPackEntries && skuProductPackEntries.length > 0){
                const result = await cds.run(INSERT(skuProductPackEntries).into(PT_TMSKUPRDPCK));
                console.log(`${skuProductPackEntries.length} SKUs successfully created in ${PT_TMSKUPRDPCK.name}.`);
                return result;
            }

            return;

        } catch (error) {
            console.log('Creating SKUs has failed.');
            console.log(error);
        }   
    };

    /**
     * Create new COGS
     * @return {Promise} Promise
     */
     async createCOGS(){

        try {
            const { ItalyMaterials } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { PT_TMPRDPCK, PT_TMCTPRDPCK, PT_TMCOGS } = this.db.entities("com.bayer.SXTENDER.MasterData");

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
            let nextCogsID = await this.getLastCogsID();

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

            if(cogsEntries && cogsEntries.length > 0){
                const result = await cds.run(INSERT(cogsEntries).into(PT_TMCOGS));
                console.log(`${cogsEntries.length} COGS successfully created in ${PT_TMCOGS.name}.`);
                return result;
            }

            return;
            
        } catch (error) {
            console.log('Creating COGS has failed.');
            console.log(error);
        }    
    };

    /**
     * Clears the ItalyMaterials table
     * @return {Promise} Promise
     */
     async clearItalyMaterialsTable(){
        try {
            const { ItalyMaterials } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await cds.run(DELETE.from(ItalyMaterials));
            console.log(`${ItalyMaterials.name} table cleared successfully`);
            return result;
            
        } catch (error) {
            console.log('Clearing the Italy Materials table failed');
            console.log(error);
        }    
    };

    /**
     * Get the last product pack id from PT_TMPRDPCK entity
     * @returns {Promise} lastProductPackID 
     */
    async getLastProductPackID(){
        try {
            const { PT_TMPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");
            const lastProductPackID = await cds.run(SELECT.one.from(PT_TMPRDPCK, ['Max(PRODUCTPACKID) as max']));
            return lastProductPackID.max;
        } catch (error) {
            console.log(error);
        }
    };

    async getLastCountryProductPackID(){
        try {
            const { PT_TMCTPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");
            const lastCountryProductPackID = await cds.run(SELECT.one.from(PT_TMCTPRDPCK, ['Max(PRODUCTPACKID) as max']));
            return lastCountryProductPackID.max;
        } catch (error) {
            console.log(error);
        }
    };

    async getLastSkuProductPackID(){
        try {
            const { PT_TMSKUPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");
            const lastSkuProductPackID = await cds.run(SELECT.one.from(PT_TMSKUPRDPCK, ['Max(COUNTRYSKUID) as max']));
            return lastSkuProductPackID.max;
        } catch (error) {
            console.log(error);
        }
    };

    async getLastCogsID(){
        try {
            const { PT_TMCOGS } = this.db.entities("com.bayer.SXTENDER.MasterData");
            const lastCogsID = await cds.run(SELECT.one.from(PT_TMCOGS, ['Max(COGSID) as max']));
            return lastCogsID.max;
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
    addLeadingZeros (num, size) {
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };

    async updateExistingMaterials(materials){
        // TODO: not implemented
    };

    /**
     * Saves the error in the DB.
     * @param {Object} error 
     * @returns {Promise}
     */
     async saveError(error){

        if(!error && !jobDescription) throw new Error(`You must provide a job description and an error object`);

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

};


module.exports.ProcessCustomers = class ProcessCustomers extends BaseJob {

    constructor(jobName,jobTime) {
        super(jobName,jobTime);
    }

    /**
     * Triggered when job has started
     */
    //override
    async onTick() {

        console.log('Processing Italy customers started ...');

        try {
            this.db = await cds.connect.to('db'); 
            await this.processCustomers();
        } catch (error) {
            console.log(error);
        }

        // when the job has finished, call the stop()
        // this will trigger onComplete method
        // this.stop();
        console.log('Processing Italy customers finished.');
    }

    /**
     * Triggered when the job has finished.
     * You have to call the job.stop() method when the job is done.
     */
    //override
    // async onComplete() {
    //     console.log('Processing Italy customers finished.');
    // }


    async processCustomers(){
        try {

            // 1. Create new Institute entries for new Customers
            await this.createInstituteEntries();
            // 2. Update Institute master data for existing Customers
            await this.updateInstituteEntries();

            // TODO: remove this code after the merge of Mater Data app
            // Until we have merged Master Data App branch
            // we must further ensure that master data constraints are 
            // correctly set so as to show all brands for each new institute.
            await this.createInstituteBrands();

            // 3. Delete ItalyCustomers table
            await this.clearItalyCustomersTable();

        } catch (error) {
            console.log('Processing of Italy customers has failed.');
            console.log(error);
            return this.saveError(error);
        }
    };

    /**
     * Create new Institute entries for new Customers
     * @return {Promise} Promise
     */
     async  createInstituteEntries(){

        try {
            const { ItalyCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { CountryProvinces, PT_TMINST } = this.db.entities("com.bayer.SXTENDER.MasterData");

            let customerNumbers =  await cds.run(cds.parse.cql (`SELECT CustomerID from ${PT_TMINST.name} WHERE CountryCode = 'IT'`));
            customerNumbers = customerNumbers.map(item => this.addLeadingZeros(item.CustomerID, 10));

            let query = cds.parse.cql (`SELECT * FROM ${ItalyCustomers.name} AS customer 
            inner join ${CountryProvinces.name} AS province ON customer.E1KNA1M_REGIO = province.Name`);

            // 'not in' where expression was not wokring properly
            // because of this we are using this hack
            // TODO: find a better way to handle this
            let {xpr} = cds.parse.expr(`customer.E1KNA1M_KUNNR not in '${customerNumbers}' AND customer.E1KNA1M_LAND1 = 'IT'`);
            xpr[3].val = customerNumbers;
            query.SELECT.where = xpr;

            const customers = await cds.run(query);
            let nextInstituteID = await this.getLastInstituteID();

            const instituteEntries = customers.map(cust => {
                return {
                    CountryCode: cust.E1KNA1M_LAND1,
                    InstituteID: ++nextInstituteID,
                    CustomerID: cust.E1KNA1M_KUNNR,
                    InstituteName: cust.E1KNA1M_NAME1,
                    InstituteType: this.getInstituteType(cust.E1KNVVM_KVGR3),
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
     * Update Institute entries for existing Customers
     * @return {Promise} Promise
     */
     async  updateInstituteEntries(){

        try {
            const { ItalyCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const { CountryProvinces, PT_TMINST } = this.db.entities("com.bayer.SXTENDER.MasterData");

            let query = cds.parse.cql (`SELECT * FROM ${ItalyCustomers.name} AS customer 
            inner join ${CountryProvinces.name} AS province ON customer.E1KNA1M_REGIO = province.Name
            inner join ${PT_TMINST.name} institute on customer.E1KNA1M_KUNNR = institute.CustomerID
            where customer.E1KNA1M_LAND1 = 'IT'`);

            const customers = await cds.run(query);

            const promises = customers.map(cust => {
                const obj = {
                    CountryCode: cust.E1KNA1M_LAND1,
                    CustomerID: cust.E1KNA1M_KUNNR,
                    InstituteName: cust.E1KNA1M_NAME1,
                    InstituteType: this.getInstituteType(cust.E1KNVVM_KVGR3) || "",
                    Address: `${cust.E1KNA1M_STRAS}, ${cust.E1KNA1M_PSTLZ} ${cust.E1KNA1M_ORT01} \ VAT: ${cust.E1KNA1M_STCEG} \ Fiscal Code: ${cust.E1KNA1M_STCD1}`,
                    ContactNo: cust.E1KNA1M_TELF1,
                    Fax: cust.E1KNA1M_TELFX,
                    ContactPerson: cust.E1KNA1M_STKZN,
                    ActiveRecord: "Yes",
                    Comment: cust.E1KNVVM_KVGR3, // temp to keep track of code
                    City: cust.E1KNA1M_ORT01,
                    INSTITUTE_HIERARCHY_ID: 1,
                    // State: "",
                    // MercadoPublicoIssuer: "",
                    RegionID: cust.RegionID
                    // --"E1KNVVM_INCO1",--INCO1
                    // --"E1KNVVM_INCO2",--INCO2
                    // --"E1KNVVM_ZTERM",--PaymentTerms
                }

                return cds.run(UPDATE(PT_TMINST).with(obj).where({ InstituteID: cust.InstituteID, CountryCode: cust.CountryCode }));
            });

            if(promises && promises.length > 0){
                console.log(`Updating ${PT_TMINST.name} ...`);
                const result = await Promise.all(promises);
                console.log(`${promises.length} Institutes successfully updated in ${PT_TMINST.name}.`);
                return result;
            }

            return;

        } catch (error) {
            console.log('Updating Institutes has failed.');
            console.log(error);
        }   

    };


    /**
     * 
     * @param {String} id Customer group 3
     * @returns {String} InstituteType 
     */
    getInstituteType(id){
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
     * Until we have merged Master Data App branch (that handles the "Few/All" for direct brands), we must 
     * further ensure that master data constraints are correctly set so as to show all brands for each new institute.
     * @returns {Promise}  
     */
    async createInstituteBrands(){
        try {
            await this.createInstituteBrandTerms();
            await this.createInstituteDistributorBrands();

        } catch (error) {
            console.log(error);
        }
    };


    /**
     * Create Institute Brand Terms
     * @return {Promise} Promise
     */
     async createInstituteBrandTerms(){

        try {
            const { PT_TMINST, PT_TMINSBRTR, PT_TMCTPRDPCK, PT_TMPRDPCK, PT_TMPRDHIER } = this.db.entities("com.bayer.SXTENDER.MasterData");

            let instituteBrandTermsCompoundKeys =  await cds.run(cds.parse.cql (`SELECT CountryCode || InstituteID || HLEVEL4_CODE || ActiveRecord AS CompoundKey FROM ${PT_TMINSBRTR.name} WHERE CountryCode = 'IT'`));
            instituteBrandTermsCompoundKeys = instituteBrandTermsCompoundKeys.map(item => item.CompoundKey);

            let query = cds.parse.cql (`SELECT i.CountryCode, i.InstituteId, h.HLevel4_Code FROM ${PT_TMINST.name} AS i 
            INNER JOIN ${PT_TMCTPRDPCK.name} AS cp ON i.CountryCode = cp.CountryCode
            INNER JOIN ${PT_TMPRDPCK.name} AS p ON cp.ProductPackId = p.ProductPackId
            INNER JOIN ${PT_TMPRDHIER.name} AS h ON p.HLevel6_Code = h.HLevel6_Code
            GROUP BY i.CountryCode,i.InstituteId,h.HLevel4_Code
            ORDER BY i.InstituteId,h.HLevel4_Code`);

             // 'not in' where expression was not wokring properly
            // because of this we are using this hack
            // TODO: find a better way to handle this
            let {xpr} = cds.parse.expr(`i.CountryCode = 'IT' and (i.CountryCode || i.InstituteID || h.HLEVEL4_CODE || 'Yes') not in '${instituteBrandTermsCompoundKeys}'`);
            xpr[15].val = instituteBrandTermsCompoundKeys;
            query.SELECT.where = xpr;

            const brandTerms = await cds.run(query);

            if(brandTerms.length <= 0) return;

            let lastInstituteBrandTermsID = await cds.run(SELECT.one.from(PT_TMINSBRTR, ['Max(INSTITUTEBRANDTERMSID) as max']));
            lastInstituteBrandTermsID = lastInstituteBrandTermsID.max;

            const instituteBrandEntries = brandTerms.map(brandTerm => {
                return {
                    InstituteBrandTermsID: ++lastInstituteBrandTermsID,
                    CountryCode: brandTerm.CountryCode,
                    INCOTerms: "",
                    PaymentTerms: "",
                    ActiveRecord: "Yes",
                    InstituteID: brandTerm.InstituteId,
                    HLevel4_Code: brandTerm.HLevel4_Code
                }
            });

            const result = await cds.run(INSERT(instituteBrandEntries).into(PT_TMINSBRTR));
            console.log(`${instituteBrandEntries.length} Institute Brand Terms successfully created in ${PT_TMINSBRTR.name}.`);
            return result;

        } catch (error) {
            console.log('Creating Institute Brand Terms has failed.');
            console.log(error);
        }   

    };

    /**
     * Create Institute Distributor Brands
     * @return {Promise} Promise
     */
     async createInstituteDistributorBrands(){

        try {
            const { PT_TMINST, PT_TMDIST, PT_TMCTPRDPCK, PT_TMPRDPCK, PT_TMPRDHIER, PT_TMINDSBR } = this.db.entities("com.bayer.SXTENDER.MasterData");

            let instituteDistributorBrandCompoundKeys =  await cds.run(cds.parse.cql (`SELECT CountryCode || InstituteID || DistributorId || HLEVEL4_CODE || ActiveRecord AS CompoundKey FROM ${PT_TMINDSBR.name} WHERE CountryCode = 'IT'`));
            instituteDistributorBrandCompoundKeys = instituteDistributorBrandCompoundKeys.map(item => item.CompoundKey);

            let query = cds.parse.cql (`SELECT i.CountryCode, i.InstituteId, d.DistributorId, h.HLevel4_Code FROM ${PT_TMINST.name} AS i 
            INNER JOIN ${PT_TMDIST.name} AS d ON i.CountryCode = d.CountryCode
            INNER JOIN ${PT_TMCTPRDPCK.name} AS cp ON i.CountryCode = cp.CountryCode
            INNER JOIN ${PT_TMPRDPCK.name} AS p ON cp.ProductPackId = p.ProductPackId
            INNER JOIN ${PT_TMPRDHIER.name} AS h ON p.HLevel6_Code = h.HLevel6_Code
            WHERE i.CountryCode = 'IT'
            GROUP BY i.CountryCode,i.InstituteId,h.HLevel4_Code,d.DistributorId
            ORDER BY i.InstituteId,d.DistributorId,h.HLevel4_Code`);

             // 'not in' where expression was not wokring properly
            // because of this we are using this hack
            // TODO: find a better way to handle this
            let {xpr} = cds.parse.expr(`i.CountryCode = 'IT' and (i.CountryCode || i.InstituteID || d.DistributorId || h.HLEVEL4_CODE || 'Yes') not in '${instituteDistributorBrandCompoundKeys}'`);
            xpr[17].val = instituteDistributorBrandCompoundKeys;
            query.SELECT.where = xpr;

            const brands = await cds.run(query);

            if(brands.length <= 0) return;

            let lastInstituteDistBrandRelationID = await cds.run(SELECT.one.from(PT_TMINDSBR, ['Max(INSTITUTEDISTBRANDRELATIONID) as max']));
            lastInstituteDistBrandRelationID = lastInstituteDistBrandRelationID.max;

            const instituteDistributorBrandEntries = brands.map(brand => {
                return {
                    InstituteDistBrandRelationID: ++lastInstituteDistBrandRelationID,
                    CountryCode: brand.CountryCode,
                    Commissionrate: 0,
                    ActiveRecord: "Yes",
                    InstituteID: brand.InstituteId,
                    DistributorID: brand.DistributorId,
                    HLevel4_Code: brand.HLevel4_Code
                }
            });

            const result = await cds.run(INSERT(instituteDistributorBrandEntries).into(PT_TMINDSBR));
            console.log(`${instituteDistributorBrandEntries.length} Institute Distributor Brands successfully created in ${PT_TMINDSBR.name}.`);
            return result;

        } catch (error) {
            console.log('Creating Institute Distributor Brands has failed.');
            console.log(error);
        }     

    };

    /**
     * Clears the ItalyCustomers table
     * @return {Promise} Promise
     */
     async clearItalyCustomersTable(){
        try {
            const { ItalyCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await cds.run(DELETE.from(ItalyCustomers));
            console.log(`${ItalyCustomers.name} table cleared successfully`);
            return result;
            
        } catch (error) {
            console.log('Clearing the Italy Customers table failed');
            console.log(error);
        }    
    };


    async getLastInstituteID(){
        try {
            const { PT_TMINST } = this.db.entities("com.bayer.SXTENDER.MasterData");
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
     addLeadingZeros (num, size) {
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };


    /**
     * Saves the error in the DB.
     * @param {Object} error 
     * @returns {Promise}
     */
     async saveError(error){

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

};
