const cds = require('@sap/cds');
const BaseJob = require('../BaseJob');

module.exports = class ProcessCustomers extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
    }
    /**
    * Triggered when job has started
    */
    //override
    async onTick() {
        console.log('JOB: Processing Brazil customers ...');
        try {
            this.db = await cds.connect.to('db');

            // Fetch data
            const allSAPCustomers = await this.getSAPCustomers();
            const distributors = allSAPCustomers.filter(cust => cust.REPRES === 'X');
            const institutes = allSAPCustomers.filter(cust => cust.REPRES !== 'X');

            // Process data
            // await this.processDistributors(distributors);
            await this.processInstitutes(institutes);

            console.log('JOB: Processing of Brazil customers successfully completed.');

        } catch (error) {
            console.error(`JOB ERROR: Processing of Brazil customers failed`);
            console.error(error);
            throw error;
        }
    }


    /**
     * This method fetches all the customers from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS
     * @returns - A list of Customers
     */
    async getSAPCustomers() {
        const tx = this.db.tx();
        try {
            console.log(`Fetching Brazil customers from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS ...`);
            const { BrazilCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(BrazilCustomers));
            await tx.commit();
            console.log(`Fetching of Brazil customers from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS successfully completed`);
            return result;
        }catch (error) {
            console.error(`ERROR: Fetching of Brazil customers from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS failed`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }

    /**
     * This method will process a list of Distributors by Creating/Updating PT_TMDIST and BrazilDistributorDivision entities
     * from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS. 
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS records will be deleted.
     * @param {*} distributors 
     * @returns 
     */
    async processDistributors(distributors) {
        console.log(`Processing Brazil distrubutors ...`);
        try {
            // 1. Distributors - PT_TMDIST
            // distributors list now contains the same distributor per division, we must not process the same distributor more than ones
            const uniqueDistributors = Array.from(new Set(distributors.map(d => d.CODIGO)))
                                    .map(codigo => {
                                        return distributors.find(d => d.CODIGO === codigo)
                                    });
            const mappedDistributors = this.mapSAPDistributorsToFAST(uniqueDistributors);
            await this.upsertFASTDistributors(mappedDistributors);

            // 2. Divisions - BrazilDistributorDivision
            const mappedDivisions = this.mapSAPDivisionsToFAST(distributors);
            await this.upsertFASTDistributorDivision(mappedDivisions);

            console.log(`Processing of Brazil distrubutors successfully completed.`);

        }catch (error) {
            console.error(`ERROR: Processing of Brazil distrubutors failed.`);
            console.error(error);
            throw error;
        }
    }

     /**
     * This method will process a list of Institutes by Creating/Updating PT_TMINST and BrazilInstituteDivision entities
     * from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS. 
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS records will be deleted.
     * @param {*} institutes 
     * @returns 
     */
      async processInstitutes(institutes) {
        console.log(`Processing Brazil institutes ...`);
        try {
            // 1. Institutes - PT_TMINST
            // Institutes list now contains the same institute per division, we must not process the same institute more than ones
            const uniqueInstitutes = Array.from(new Set(institutes.map(d => d.CODIGO)))
                                    .map(codigo => {
                                        return institutes.find(d => d.CODIGO === codigo)
                                    });
            const mappedInstitutes = this.mapSAPInstitutesToFAST(uniqueInstitutes);
            // await this.upsertFASTInstitutes(mappedInstitutes);

            // 2. Divisions - BrazilInstituteDivision
            // const mappedDivisions = this.mapSAPDivisionsToFAST(institutes);
            // await this.upsertFASTDistributorDivision(mappedDivisions);

            console.log(`Processing of Brazil institutes successfully completed.`);

        }catch (error) {
            console.error(`ERROR: Processing of Brazil institutes failed.`);
            console.error(error);
            throw error;
        }
    }

    /**
     * Maps Customer fields from SAP to FAST Distributors
     * @param {*} distributors 
     * @returns 
     */
    mapSAPDistributorsToFAST(distributors) {
        console.log(`Mapping of Brazil distributors ...`);
        distributors = distributors.reduce((prev, curr, idx, distributors) => {
            const numberOfDivisions = (distributors.filter(distr => distr.CODIGO ===  curr.CODIGO)).length;

            let fastDistributor = {
                CountryCode: "BR",
                DistributorID: null,
                DistributorName: curr.RAZAO,
                Address: `${curr.ENDERECO} ${curr.BAIRRO} ${curr.CEP} ${curr.CIDADE}`,
                ContactNo: curr.TELEFONE,
                Fax: curr.FAX,
                ContactPerson: null,
                ActiveRecord: (!curr.BLOQ && curr.STATUS === 'A') ? 'Yes' : 'No',
                CONTACT_EMAIL: curr.EMAIL,
                City: curr.CIDADE,
                State: curr.REGIAO,
                TaxCode: curr.IE,
                CNPJ: curr.CNPJ,
                CustomerID: curr.CODIGO,
                Shortname: curr.FANTASIA,
                CommissionRate: 0.0,
                INCOTerms: null,
                PaymentTerms: null,
                ForAllBrands: (numberOfDivisions > 2),
            };

            prev.push(fastDistributor);
            return prev;
        }, []);
        console.log(`Mapping of Brazil distributors finished.`);
        return distributors;
    }

    /**
     * Maps Customer fields from SAP to FAST Institutes
     * @param {*} institutes 
     * @returns 
     */
     mapSAPInstitutesToFAST(institutes) {
        console.log(`Mapping of Brazil institutes ...`);
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
        console.log(`Mapping of Brazil institutes finished.`);
        return institutes;
    }

    /**
     * Maps Customer fields from SAP to FAST BrazilDistributorDivision
     * @param {*} distributors 
     * @returns 
     */
     mapSAPDivisionsToFAST(distributors) {
        console.log(`Mapping of Brazil divisions ...`);
        distributors = distributors.reduce((prev, curr, idx, distributors) => {
            let fastDivision = {
                DistributorID: "",
                DivisionCode: curr.SETOR_ATIV,
                CustomerID: curr.CODIGO,
                DivisionName: this.getDivisionName(curr.SETOR_ATIV),
                CustomerGroup: curr.GRP_CLIENTE,
                PriceList: curr.LISTA_PRC,
                DistributorType: "Distributor",
            };
            prev.push(fastDivision);
            return prev;
        }, []);
        console.log(`Mapping of Brazil divisions finished.`);
        return distributors;
    }


    /**
     * Creates or Updates distributors in FAST
     * @param {*} distributors 
     * @returns 
     */
    async upsertFASTDistributors(distributors) {
        const { PT_TMDIST } = this.db.entities("com.bayer.SXTENDER.MasterData");
        let nextDistributorID = await this.getNextValue(PT_TMDIST, "DistributorID");

        // 1. get a list of existing Distributors from FAST
        const distributorsExistingInFAST = await this.getFASTDistributors(distributors);
        // 2. devide mappedDistributors into New or Changed distributors
        const FASTNewDistributors = [];
        const FASTChangedDistributors = [];
        for (const distributor of distributors) {
            let FASTDistributorIdx = distributorsExistingInFAST.findIndex(FASTDistributor => Number(FASTDistributor.CustomerID) === Number(distributor.CustomerID));
            if (FASTDistributorIdx > -1) {
                // copy over the DistributorID from existing distributor
                distributor.DistributorID = distributorsExistingInFAST[FASTDistributorIdx].DistributorID;
                FASTChangedDistributors.push(distributor);
            } else {
                // generate new DistributorID
                distributor.DistributorID = nextDistributorID++;
                FASTNewDistributors.push(distributor);
            }
        }
        // 3. Upsert records into PT_TMDIST
        //Update is one by one: https://answers.sap.com/questions/13676137/bulk-update-in-cap-nodejs.html
        console.log(`Upserting Brazil customers into FAST table ...`);
        const tx = this.db.tx();
        try {
            for (const FASTDistributor of FASTChangedDistributors) {
                await tx.run(UPDATE(PT_TMDIST, {CountryCode:FASTDistributor.CountryCode, DistributorID:FASTDistributor.DistributorID}).with(FASTDistributor));
            }
            FASTNewDistributors && FASTNewDistributors.length > 0 && await tx.run(INSERT(FASTNewDistributors).into(PT_TMDIST));
            await tx.commit();
            console.log(`Upserting of Brazil customers into FAST table successfully completed.`);
            return true;
        } catch (error) {
            console.error(`ERROR: Upserting of Brazil customers into FAST table failed`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }

    
    /**
     * Creates or Updates divisions in FAST
     * After successful processing, the processed customers will be removed from BrazilCustomers
     * @param {*} divisions 
     * @returns 
     */
     async upsertFASTDistributorDivision(divisions) {
        const { BrazilDistributorDivision } = this.db.entities("com.bayer.SXTENDER.MasterData");

        // 1. get a list of existing Distributors from FAST
        const distributorsExistingInFAST = await this.getFASTDistributors(divisions);
        const divisionsExistingInFAST = await this.getFASTDivisions(divisions);

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
        console.log(`Upserting Brazil divisions into FAST table ...`);
        const tx = this.db.tx();
        try {
            for (const FASTDivision of FASTChangedDivisions) {
                await tx.run(UPDATE(BrazilDistributorDivision, {DistributorID:FASTDivision.DistributorID, DivisionCode:FASTDivision.DivisionCode}).with(FASTDivision));
            }
            FASTNewDivisions && FASTNewDivisions.length > 0 && await tx.run(INSERT(FASTNewDivisions).into(BrazilDistributorDivision));
            console.log(`Upserting of Brazil divisions into FAST table successfully completed.`);
            console.log(`Deleting processed Customers from BrazilCustomers table`);
            const { BrazilCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            await tx.run(DELETE.from(BrazilCustomers).where ({REPRES: 'X'}));
            await tx.commit();
            return true;
        } catch (error) {
            console.error(`ERROR: Upserting of Brazil division into FAST table failed`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }

    /**
     * Gets a list of existing Distributors from FAST where CustomerIDs (CODIGO) are equal.
     * @param {Array} distributors 
     * @returns {Array<PT_TMDIST>} a list of existing distributors
     */
    async getFASTDistributors(distributors) {
        if(!distributors || distributors.length === 0){
            console.log(`No Distributors were found in FAST`);
            return [];
        }
        const tx = this.db.tx();
        console.log(`Prepare fetching Brazil customers from FAST table`);

        // get all the CustomerIDs from distributors
        let customerIDs = [];
        for (const distributor of distributors) {
            customerIDs.push(distributor.CustomerID);
        }
        console.log(`Start fetching Brazil customers from FAST table`);

        // get a list of distributors entities for given list of CustomerIDs
        const { PT_TMDIST } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await tx.run(SELECT.from(PT_TMDIST).where({ CustomerID: { in: customerIDs}, CountryCode: 'BR' } ));
        await tx.commit();
        console.log(`End fetching Brazil customers from FAST table`);
        return result;
    }

    /**
     * Gets a list of existing Divisions from FAST where CustomerIDs (CODIGO) are equal.
     * @param {Array} divisions 
     * @returns {Array<BrazilDistributorDivision>} a list of existing divisions
     */
     async getFASTDivisions(divisions) {
        if(!divisions || divisions.length === 0){
            console.log(`No Divisions were found in FAST`);
            return [];
        }
        const tx = this.db.tx();
        console.log(`Prepare fetching Brazil divisions from FAST table`);

        // get all the CustomerIDs from divisions
        let customerIDs = [];
        let divisionCodes = [];
        for (const division of divisions) {
            customerIDs.push(division.CustomerID);
            divisionCodes.push(division.DivisionCode);
        }
        console.log(`Start fetching Brazil divisions from FAST table`);

        // get a list of divisions entities for given list of CustomerIDs
        const { BrazilDistributorDivision } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await tx.run(SELECT.from(BrazilDistributorDivision).where({ CustomerID: { in: customerIDs}, DivisionCode: { in: divisionCodes} } ));
        await tx.commit();
        console.log(`End fetching Brazil divisions from FAST table`);
        return result;
    }
    
    /**
     * Gets the next highest value for a given field from table
     * @param {*} table 
     * @param {*} fieldname 
     * @returns - next highest value
     */
    async getNextValue (table, fieldname){
        const tx = this.db.tx();
        let nextValue = 1;
        try {
            let results = await tx.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
            if (results[0].max) {
                nextValue = results[0].max + 1
            }
            await tx.commit();
            return nextValue;
        }catch (error) {
            console.error(`ERROR: Fetching next highest value for ${fieldname} from ${table.name} failed`);
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
    
};