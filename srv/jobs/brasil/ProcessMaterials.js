const cds = require('@sap/cds');
const BaseJob = require('../BaseJob');

module.exports = class ProcessMaterials extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
        this.jobName = jobName.toUpperCase();
    }

    /**
    * Triggered when job has started
    */
    //override
    async onTick() {
        console.log(`JOB (${this.jobName }): Processing Brazil materials ...`);
        const start = new Date().getTime();
        try {
            this.db = await cds.connect.to('db');
            const tx = this.db.tx();

            // Fetch data
            const allSAPMaterials = await this.getSAPMaterials(tx);

            // Process data
            await this.processMaterials(allSAPMaterials, tx);

            // Commit All
            await tx.commit();
            console.log(`JOB (${this.jobName }): Processing of Brazil materials successfully completed.`);
            const end = new Date().getTime();
            const time = end - start;
            console.log(`JOB (${this.jobName }): SUCCESS --> Execution time: ${time}ms`);

        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Processing of Brazil materials failed.`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }


    /**
     * This method fetches all the materials from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILMATERIALS
     * @returns - A list of Materials
     */
    async getSAPMaterials(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Brazil materials from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILMATERIALS ...`);
            const { BrazilMaterials } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(BrazilMaterials));
            console.log(`JOB (${this.jobName }): Fetching of Brazil materials from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILMATERIALS successfully completed`);
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Brazil materials from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILMATERIALS failed`);
            console.error(error);
            throw error;
        }
    }

    /**
     * This method will process a list of Materials by Creating/Updating the following entities
     *  - PT_TMPRDHIER
     *  - PT_TMPRDPCK
     *  - PT_TMCTPRDPCK
     *  - PT_TMSKUPRDPCK
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILMATERIALS records will be deleted.
     * @param {[Object]} materials 
     */
    async processMaterials(materials, tx) {
        console.log(`JOB (${this.jobName }): Processing Brazil materials ...`);
        try {

            // 1. Create/update hierarchy entries in PT_TMPRDHIER
            const mappedHierarchy = this.mapSAPMaterialsToFASTHierarchy(materials);
            await this.upsertFASTHierarchy(mappedHierarchy, tx);

            // 2. Create/update Product entries in PT_TMPRDPCK, PT_TMCTPRDPCK and PT_TMSKUPRDPCK
            const mappedProductPacks = this.mapSAPMaterialsToFASTProductPack(materials);
            const mappedCountryProductPacks = this.mapSAPMaterialsToFASTCountryProductPack(materials);
            const mappedProductPackSKUs = this.mapSAPMaterialsToFASTProductPackSKU(materials);
            await this.upsertFASTProducts(mappedProductPacks, mappedCountryProductPacks, mappedProductPackSKUs, tx);

            console.log(`JOB (${this.jobName }): Processing of Brazil materials successfully completed.`);

        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Processing of Brazil materials failed.`);
            console.error(error);
            throw error;
        }
    }

    /**
     * Maps Material fields from SAP (BRAZILMATERIALS) to FAST Hierarchy (PT_TMPRDHIER)
     * @param {[Objects]} materials 
     * @returns {[Objects]} hierarchy
     */
     mapSAPMaterialsToFASTHierarchy(materials) {
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMPRDHIER ...`);
        materials = materials.reduce((prev, curr, idx, materials) => {
            prev.push(
                {
                    HLEVEL1_NAME: this.getDivisionName(curr.SETOR_ATIV),
                    HLEVEL1_CODE: curr.SETOR_ATIV,
                    HLEVEL2_NAME: null,
                    HLEVEL2_CODE: null,
                    HLEVEL3_NAME: null,
                    HLEVEL3_CODE: null,
                    HLEVEL4_NAME: curr.BRAND, // this.extractBrandNameFrom(curr.NOME),
                    HLEVEL4_CODE: curr.BRAND, // this.extractBrandNameFrom(curr.NOME),
                    HLEVEL5_NAME: null,
                    HLEVEL5_CODE: null,
                    HLEVEL6_NAME: curr.NOME,
                    HLEVEL6_CODE: curr.COD
                }
            );
            return prev;
        }, []);
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMPRDHIER finished.`);
        return materials;
    }

    /**
     * Maps Material fields from SAP (BRAZILMATERIALS) to FAST ProductPack (PT_TMPRDPCK)
     * @param {*} materials 
     * @returns {[Objects]} PT_TMPRDPCK objects
     */
     mapSAPMaterialsToFASTProductPack(materials) {
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMPRDPCK ...`);
        materials = materials.reduce((prev, curr, idx, materials) => {
            prev.push(
                {
                    PRODUCTPACKID: "",
                    PRODUCTPACKNAME: curr.NOME,
                    PRESENTATION: "NA",
                    UOM: "NA",
                    ACTIVERECORD: "Yes",
                    HLEVEL6_CODE: curr.NOME,
                    CONCENTRATION: 1,
                    PACKFACTOR: 1,
                    PCIName: curr.APRES,
                    MoleculeName: "NA",
                    ACTIVE_SUBSTANCE: "NA",
                    ProductType: "NA",
                    ProductClass: "NA",
                    ProductDescription: "NA",
                    ProductFullDescription: "NA",
                    Nucleus: "NA",
                    ProductGenericName: "NA",
                }
            );
            return prev;
        }, []);
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMPRDPCK finished.`);
        return materials;
    }

    /**
     * Maps Material fields from SAP (BRAZILMATERIALS) to FAST CountryProductPack (PT_TMCTPRDPCK)
     * @param {*} materials 
     * @returns {[Objects]} PT_TMCTPRDPCK objects
     */
     mapSAPMaterialsToFASTCountryProductPack(materials) {
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMCTPRDPCK ...`);
        materials = materials.reduce((prev, curr, idx, materials) => {
            prev.push(
                {
                    COUNTRYPRODUCTPACKID: "",
                    COUNTRYCODE: "BR",
                    COUNTRYOFORIGIN: curr.PROCEDENCIA,
                    SHELFLIFE: 1,
                    REGISTERED: 2,
                    ACTIVERECORD: "Yes",
                    PRODUCTPACKID: "", // use ProductPackID from PT_TMPRDPCK for new entries
                    MANUFACTURER: "NA",
                    Presentation_2: "NA",
                    VTATax: 0,
                    COMMENT: "",
                    GOV_CODE: curr.NREG,
                    CODE1: curr.CBAR,
                    CODE2: curr.GRUPO_MAT3,
                    CODE3: "",
                    QTY_THRESHOLD: 0,
                    BU: this.getDivisionName(curr.SETOR_ATIV),
                }
            );
            return prev;
        }, []);
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMCTPRDPCK finished.`);
        return materials;
    }


    /**
     * Maps Material fields from SAP (BRAZILMATERIALS) to FAST ProductPackSKU (PT_TMSKUPRDPCK)
     * @param {*} materials 
     * @returns {[Objects]} PT_TMSKUPRDPCK objects
     */
     mapSAPMaterialsToFASTProductPackSKU(materials) {
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMSKUPRDPCK ...`);
        materials = materials.reduce((prev, curr, idx, materials) => {
            prev.push(
                {
                    CountrySKUID: "",
                    CountryCode: "BR",
                    ActiveRecord: "Yes",
                    ProductPackID: "", // --link from TMPRDPCK,
                    SKUCode: curr.COD,
                }
            );
            return prev;
        }, []);
        console.log(`JOB (${this.jobName }): Mapping BRAZILMATERIALS to PT_TMSKUPRDPCK finished.`);
        return materials;
    }


    /**
     * Creates or Updates Hierarchies in FAST
     * @param {Array.Object} Mapped Hierarchies 
     * @returns 
     */
    async upsertFASTHierarchy(mappedHierarchies, tx) {
        const { PT_TMPRDHIER } = this.db.entities("com.bayer.SXTENDER.MasterData");

        // 1. get a list of existing Hierarchies from FAST
        const hierarchiesExistingInFAST = await this.getFASTHierarchies(mappedHierarchies, tx);
        // 2. devide mappedDistributors into New or Changed distributors
        const FASTNewHierarchies = [];
        const FASTChangedHierarchies = [];
        for (const hierarchy of mappedHierarchies) {
            let FASTHierarchyIdx = hierarchiesExistingInFAST.findIndex(FASTHierarchy => Number(FASTHierarchy.HLEVEL6_CODE) === Number(hierarchy.HLEVEL6_CODE));
            if (FASTHierarchyIdx > -1) {
                FASTChangedHierarchies.push(hierarchy);
            } else {
                FASTNewHierarchies.push(hierarchy);
            }
        }
        // 3. Upsert records into PT_TMDIST
        //Update is one by one: https://answers.sap.com/questions/13676137/bulk-update-in-cap-nodejs.html
        console.log(`JOB (${this.jobName }): Upserting Brazil Hierarchies into FAST table (PT_TMPRDHIER) ...`);
        try {
            for (const FASTHierarchy of FASTChangedHierarchies) {
                await tx.run(UPDATE(PT_TMPRDHIER, {HLEVEL6_CODE:FASTHierarchy.HLEVEL6_CODE}).with(FASTHierarchy));
            }
            FASTNewHierarchies && FASTNewHierarchies.length > 0 && await tx.run(INSERT(FASTNewHierarchies).into(PT_TMPRDHIER));
            console.log(`JOB (${this.jobName }): Upserting of Brazil Hierarchies into FAST table (PT_TMPRDHIER) successfully completed.`);
            console.log(`JOB (${this.jobName }): PT_TMPRDHIER -> created: ${FASTNewHierarchies.length}, updated: ${FASTChangedHierarchies.length}`);
            return true;
        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Upserting of Brazil Hierarchies into FAST table (PT_TMPRDHIER) failed`);
            console.error(error);
            throw error;
        }
    }

    /**
     * Creates or Updates Products in FAST
     * @param {Array<PT_TMPRDPCK>} mappedProductPacks
     * @param {Array<PT_TMCTPRDPCK>} mappedCountryProductPacks
     * @param {Array<PT_TMSKUPRDPCK>} mappedProductPackSKUs
     * @returns 
     */
     async upsertFASTProducts(mappedProductPacks, mappedCountryProductPacks, mappedProductPackSKUs, tx) {
        const { PT_TMPRDPCK, PT_TMCTPRDPCK, PT_TMSKUPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");
        let nextProductPackID = await this.getNextValue(PT_TMPRDPCK, "PRODUCTPACKID", tx);
        let nextCountryProductPackID = await this.getNextValue(PT_TMCTPRDPCK, "COUNTRYPRODUCTPACKID", tx);
        let nextCountrySKUID = await this.getNextValue(PT_TMSKUPRDPCK, "CountrySKUID", tx);
        
        // 1. get a list of existing ProductPacks from FAST
        const productPacksExistingInFAST = await this.getFASTProductPacks(mappedProductPacks, tx);
        // 2. devide mappedDistributors into New or Changed institutes
        const FASTNewInstitutes = [];
        const FASTChangedInstitutes = [];
        for (const institute of institutes) {
            let FASTInstituteIdx = insitutesExistingInFAST.findIndex(FASTInstitute => Number(FASTInstitute.CustomerID) === Number(institute.CustomerID));
            if (FASTInstituteIdx > -1) {
                // copy over the DistributorID from existing distributor
                institute.InstituteID = insitutesExistingInFAST[FASTInstituteIdx].InstituteID;
                FASTChangedInstitutes.push(institute);
            } else {
                // generate new DistributorID
                institute.InstituteID = nextInsituteID++;
                FASTNewInstitutes.push(institute);
            }
        }
        // 3. Upsert records into PT_TMDIST
        console.log(`JOB (${this.jobName }): Upserting Brazil Institutes into FAST table ...`);
        try {
            for (const FASTInstitute of FASTChangedInstitutes) {
                await tx.run(UPDATE(PT_TMINST, {CountryCode:FASTInstitute.CountryCode, InstituteID:FASTInstitute.InstituteID}).with(FASTInstitute));
            }
            FASTNewInstitutes && FASTNewInstitutes.length > 0 && await tx.run(INSERT(FASTNewInstitutes).into(PT_TMINST));
            console.log(`JOB (${this.jobName }): Upserting of Brazil Institutes into FAST table successfully completed.`);
            return true;
        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Upserting of Brazil Institutes into FAST table failed`);
            console.error(error);
            throw error;
        }
    }

    

    /**
     * Gets a list of existing Hierarchies from FAST.
     * @param {Array} Hierarchies 
     * @returns {Array<PT_TMPRDHIER>} a list of existing Hierarchies
     */
    async getFASTHierarchies(mappedHierarchies, tx) {
        if(!mappedHierarchies || mappedHierarchies.length === 0){
            console.log(`JOB (${this.jobName }): No hierarchies were found in FAST (PT_TMPRDHIER)`);
            return [];
        }
        console.log(`JOB (${this.jobName }): Prepare fetching Brazil hierarchies from PT_TMPRDHIER`);

        // get all the HLEVEL6_NAMEs from mappedHierarchies
        let aHLEVEL6_CODEs = [];
        for (const hierarchy of mappedHierarchies) {
            aHLEVEL6_CODEs.push(hierarchy.HLEVEL6_CODE);
        }
        console.log(`JOB (${this.jobName }): Start fetching Brazil hierarchies from PT_TMPRDHIER`);

        // get a list of distributors entities for given list of CustomerIDs
        const { PT_TMPRDHIER } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await tx.run(SELECT.from(PT_TMPRDHIER).where({ HLEVEL6_CODE: { in: aHLEVEL6_CODEs } } ));
        console.log(`JOB (${this.jobName }): End fetching Brazil hierarchies from PT_TMPRDHIER`);
        return result;
    }

    /**
     * Gets a list of existing ProductPacks from FAST.
     * @param {Array<PT_TMPRDPCK>} ProductPacks 
     * @returns {Array<PT_TMPRDPCK>} a list of existing ProductPacks
     */
     async getFASTProductPacks(mappedProductPacks, tx) {
        if(!mappedProductPacks || mappedProductPacks.length === 0){
            console.log(`JOB (${this.jobName }): No ProductPacks were found in FAST (PT_TMPRDPCK)`);
            return [];
        }
        console.log(`JOB (${this.jobName }): Prepare fetching Brazil ProductPacks from PT_TMPRDPCK`);

        // get all the ProductPackNames from mappedProductPacks
        let aProductPackName = [];
        for (const productPack of mappedProductPacks) {
            aProductPackName.push(productPack.PRODUCTPACKNAME);
        }
        console.log(`JOB (${this.jobName }): Start fetching Brazil ProductPacks from PT_TMPRDPCK`);

        // get a list of ProductPack entities for given list of ProductPackNames
        const { PT_TMPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await tx.run(SELECT.from(PT_TMPRDPCK).where({ HLEVEL6_CODE: { in: aHLEVEL6_CODEs } } ));
        console.log(`JOB (${this.jobName }): End fetching Brazil ProductPacks from PT_TMPRDPCK`);
        return result;
    }

    
    /**
     * Gets the next highest value for a given field from table
     * @param {*} table 
     * @param {*} fieldname 
     * @returns - next highest value
     */
    async getNextValue (table, fieldname, tx){
        let nextValue = 1;
        try {
            let results = await tx.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
            if (results[0].max) {
                nextValue = results[0].max + 1
            }
            return nextValue;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching next highest value for ${fieldname} from ${table.name} failed`);
            console.error(error);
            throw error;
        }
	}

    /**
     * Returns the DivisionName for a given DivisionCode
     * @param {String} divisionCode 
     * @returns {String} - DivisionName
     */
    getDivisionName(divisionCode){
        const divisions = {
            '08':'Pharma',
		    '65':'Radiology',
		    '16':'Consumer Health'
        }
        return divisions[divisionCode] || '00';
    }

    /**
     * Extracts text before comma or space (or full if not found)
     * @param {*} nome 
     * @return {String} - Brand name
     */
    extractBrandNameFrom(nome){
        const regx = /^[^\s|,]*/;
        return nome.match(regx)[0];
    }
    
};