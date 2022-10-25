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

            // 2. Divisions - BrazilDistributorDivision
            // const mappedDivisions = this.mapSAPDivisionsToFAST(materials, "material");
            // await this.upsertFASTDistributorDivision(mappedDivisions, tx);

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
                    HLEVEL4_NAME: this.extractBrandNameFrom(curr.NOME),
                    HLEVEL4_CODE: this.extractBrandNameFrom(curr.NOME),
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
     * Maps Customer fields from SAP to FAST Institutes
     * @param {*} institutes 
     * @returns 
     */
     mapSAPInstitutesToFAST(institutes) {
        console.log(`JOB (${this.jobName }): Mapping of Brazil institutes ...`);
        institutes = institutes.reduce((prev, curr, idx, institutes) => {
            const numberOfDivisions = (institutes.filter(distr => distr.CODIGO ===  curr.CODIGO)).length;

            let fastInstitute = {
                CountryCode: "BR",
                InstituteID: "",
                CustomerID: curr.CODIGO,
                InstituteName: curr.RAZAO,
                InstituteType: "Public Institute",
                Address: `${curr.ENDERECO} ${curr.BAIRRO} ${curr.CEP} ${curr.CIDADE}`,
                ContactNo: curr.TELEFONE,
                Fax: curr.FAX,
                ContactPerson: null,
                ActiveRecord: (!curr.BLOQ && curr.STATUS === 'A') ? 'Yes' : 'No',
                Comment: null,
                City: curr.CIDADE,
                INSTITUTE_HIERARCHY_ID: 1,
                State: curr.REGIAO,
                MercadoPublicoIssuer: null,
                RegionID: null,
                ProvinceID: null,
                CifCode: null,
                RegionalHealthSystem: null,
                VatCode: null,
                TaxCode: "IE",
                CustomerGroup: null,
                ApplicableTaxRate: null,
                INCOTerms: null,
                PaymentTerms: null,
                ForAllBrands: (numberOfDivisions > 2),
                DirectTender: "",
                ContactEmail: curr.EMAIL,
                CNPJ: curr.CNPJ,
                Shortname: curr.FANTASIA,
            };

            prev.push(fastInstitute);
            return prev;
        }, []);
        console.log(`JOB (${this.jobName }): Mapping of Brazil institutes finished.`);
        return institutes;
    }

    /**
     * Maps Customer fields from SAP to FAST BrazilDistributorDivision or BrazilInstituteDivision 
     * based on type.
     * @param {array} divisions
     * @param {string} type - 'distributor' or 'institue'
     * @returns {array}
     */
     mapSAPDivisionsToFAST(divisions, type) {
        console.log(`JOB (${this.jobName }): Mapping of Brazil divisions ...`);
        divisions = divisions.reduce((prev, curr, idx, divisions) => {
            let fastDivision = {
                DivisionCode: curr.SETOR_ATIV,
                CustomerID: curr.CODIGO,
                DivisionName: this.getDivisionName(curr.SETOR_ATIV),
                CustomerGroup: curr.GRP_CLIENTE,
                PriceList: curr.LISTA_PRC,
            };
            if(type === "distributor"){
                fastDivision.DistributorID = "";
                fastDivision.DistributorType = "Distributor";
            }else if(type === "institute"){
                fastDivision.InstituteID = "";
                fastDivision.InstituteType = "Public Institute";
            }
            prev.push(fastDivision);
            return prev;
        }, []);
        console.log(`JOB (${this.jobName }): Mapping of Brazil divisions finished.`);
        return divisions;
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
     * Creates or Updates Institutes in FAST
     * @param {*} institutes 
     * @returns 
     */
     async upsertFASTInstitutes(institutes, tx) {
        const { PT_TMINST } = this.db.entities("com.bayer.SXTENDER.MasterData");
        let nextInsituteID = await this.getNextValue(PT_TMINST, "InstituteID", tx);

        // 1. get a list of existing Institutes from FAST
        const insitutesExistingInFAST = await this.getFASTInstitutes(institutes, tx);
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
     * Creates or Updates divisions in FAST
     * After successful processing, the processed customers will be removed from BrazilCustomers
     * @param {*} divisions 
     * @returns 
     */
     async upsertFASTDistributorDivision(divisions, tx) {
        const { BrazilDistributorDivision } = this.db.entities("com.bayer.SXTENDER.MasterData");

        // 1. get a list of existing Distributors from FAST
        const distributorsExistingInFAST = await this.getFASTDistributors(divisions, tx);
        const divisionsExistingInFAST = await this.getFASTDivisions(divisions, "distributor", tx);

        // 2. devide mapped Divisions into New or Changed divisions
        const FASTNewDivisions = [];
        const FASTChangedDivisions = [];
        for (const division of divisions) {
            let FASTDistributor = distributorsExistingInFAST.find(FASTDistributor => Number(FASTDistributor.CustomerID) === Number(division.CustomerID));
            // copy over the DistributorID from existing distributor
            division.DistributorID = FASTDistributor.DistributorID;
            let FASTDivisionIdx = divisionsExistingInFAST.findIndex(FASTDivision => Number(FASTDivision.CustomerID) === Number(division.CustomerID));
            if (FASTDivisionIdx > -1) {
                FASTChangedDivisions.push(division);
            } else {
                FASTNewDivisions.push(division);
            }
        }

        // 3. Upsert records into BrazilDistributorDivision
        console.log(`JOB (${this.jobName }): Upserting BrazilDistributorDivisions into FAST table ...`);
        try {
            for (const FASTDivision of FASTChangedDivisions) {
                await tx.run(UPDATE(BrazilDistributorDivision, {DistributorID:FASTDivision.DistributorID, DivisionCode:FASTDivision.DivisionCode}).with(FASTDivision));
            }
            FASTNewDivisions && FASTNewDivisions.length > 0 && await tx.run(INSERT(FASTNewDivisions).into(BrazilDistributorDivision));
            console.log(`JOB (${this.jobName }): Upserting of BrazilDistributorDivisions into FAST table successfully completed.`);
            console.log(`JOB (${this.jobName }): Deleting processed Customers from BrazilCustomers table`);
            const { BrazilCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            await tx.run(DELETE.from(BrazilCustomers).where ({REPRES: 'X'}));
            return true;
        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Upserting of BrazilDistributorDivisions into FAST table failed`);
            console.error(error);
            throw error;
        }
    }

    
    /**
     * Creates or Updates divisions in FAST
     * After successful processing, the processed customers will be removed from BrazilCustomers
     * @param {*} divisions 
     * @returns 
     */
     async upsertFASTInstituteDivision(divisions, tx) {
        const { BrazilInstituteDivision } = this.db.entities("com.bayer.SXTENDER.MasterData");

        // 1. get a list of existing Institutes from FAST
        const institutesExistingInFAST = await this.getFASTInstitutes(divisions, tx);
        const divisionsExistingInFAST = await this.getFASTDivisions(divisions, "insitute", tx);

        // 2. devide mapped Divisions into New or Changed divisions
        const FASTNewDivisions = [];
        const FASTChangedDivisions = [];
        for (const division of divisions) {
            let FASTInstitute = institutesExistingInFAST.find(FASTInstitute => Number(FASTInstitute.CustomerID) === Number(division.CustomerID));
            // copy over the InstituteID from existing distributor
            division.InstituteID = FASTInstitute.InstituteID;
            let FASTDivisionIdx = divisionsExistingInFAST.findIndex(FASTDivision => Number(FASTDivision.CustomerID) === Number(division.CustomerID));
            if (FASTDivisionIdx > -1) {
                FASTChangedDivisions.push(division);
            } else {
                FASTNewDivisions.push(division);
            }
        }

        // 3. Upsert records into BrazilInstituteDivision
        console.log(`JOB (${this.jobName }): Upserting BrazilInstituteDivisions into FAST table ...`);
        try {
            for (const FASTDivision of FASTChangedDivisions) {
                await tx.run(UPDATE(BrazilInstituteDivision, {InstituteID:FASTDivision.InstituteID, DivisionCode:FASTDivision.DivisionCode}).with(FASTDivision));
            }
            FASTNewDivisions && FASTNewDivisions.length > 0 && await tx.run(INSERT(FASTNewDivisions).into(BrazilInstituteDivision));
            console.log(`JOB (${this.jobName }): Upserting of BrazilInstituteDivisions into FAST table successfully completed.`);
            console.log(`JOB (${this.jobName }): Deleting processed Customers from BrazilCustomers table`);
            const { BrazilCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            await tx.run(DELETE.from(BrazilCustomers).where ({REPRES: null}));
            return true;
        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Upserting of BrazilInstituteDivisions into FAST table failed`);
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
     * Gets a list of existing Institutes from FAST where CustomerIDs (CODIGO) are equal.
     * @param {Array} institutes 
     * @returns {Array<PT_TMINST>} a list of existing institutes
     */
     async getFASTInstitutes(institutes, tx) {
        if(!institutes || institutes.length === 0){
            console.log(`JOB (${this.jobName }): No Institutes were found in FAST`);
            return [];
        }
        console.log(`JOB (${this.jobName }): Prepare fetching Brazil institutes from FAST table`);

        // get all the CustomerIDs from distributors
        let customerIDs = [];
        for (const institute of institutes) {
            customerIDs.push(institute.CustomerID);
        }
        console.log(`JOB (${this.jobName }): Start fetching Brazil institutes from FAST table`);

        // get a list of distributors entities for given list of CustomerIDs
        const { PT_TMINST } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await tx.run(SELECT.from(PT_TMINST).where({ CustomerID: { in: customerIDs}, CountryCode: 'BR' } ));
        console.log(`JOB (${this.jobName }): End fetching Brazil institutes from FAST table`);
        return result;
    }

    /**
     * Gets a list of existing Divisions from FAST where CustomerIDs (CODIGO) are equal.
     * @param {array} divisions 
     * @returns {array} a list of existing divisions
     */
     async getFASTDivisions(divisions, type, tx) {
        if(!divisions || divisions.length === 0){
            console.log(`JOB (${this.jobName }): No Divisions were found in FAST`);
            return [];
        }

        console.log(`JOB (${this.jobName }): Prepare fetching Brazil divisions from FAST table`);

        // get all the CustomerIDs from divisions
        let customerIDs = [];
        let divisionCodes = [];
        for (const division of divisions) {
            customerIDs.push(division.CustomerID);
            divisionCodes.push(division.DivisionCode);
        }
        console.log(`JOB (${this.jobName }): Start fetching Brazil divisions from FAST table`);

        // get a list of divisions entities for given list of CustomerIDs
        let result = "";
        if(type === 'distributor'){
            result = await this.getFASTDistributorDivisions(customerIDs, divisionCodes, tx);
        }else if(type === 'insitute'){
            result = await this.getFASTInsituteDivisions(customerIDs, divisionCodes, tx);
        }

        console.log(`JOB (${this.jobName }): End fetching Brazil divisions from FAST table`);
        return result;
    }

    async getFASTDistributorDivisions(customerIDs, divisionCodes, tx){
        const { BrazilDistributorDivision } = this.db.entities("com.bayer.SXTENDER.MasterData");
        return tx.run(SELECT.from(BrazilDistributorDivision).where({ CustomerID: { in: customerIDs}, DivisionCode: { in: divisionCodes} } ));
    }

    async getFASTInsituteDivisions(customerIDs, divisionCodes, tx){
        const { BrazilInstituteDivision } = this.db.entities("com.bayer.SXTENDER.MasterData");
        return tx.run(SELECT.from(BrazilInstituteDivision).where({ CustomerID: { in: customerIDs}, DivisionCode: { in: divisionCodes} } ));
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