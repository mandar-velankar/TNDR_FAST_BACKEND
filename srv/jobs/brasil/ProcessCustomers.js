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
        console.log('Processing Brazil customers ...');
        try {
            this.db = await cds.connect.to('db');

            // Fetch data
            const allSAPCustomers = await this.getSAPCustomers();
            const distributors = allSAPCustomers.filter(cust => cust.REPRES === 'X');
            const institutes = allSAPCustomers.filter(cust => cust.REPRES !== 'X');

            // Process data
            await this.processDistributors(distributors);

        } catch (error) {
            console.error(`ERROR: Processing of Brazil customers failed`);
            console.error(error);
            throw error;
        }
        console.log('Processing of Brazil customers successfully completed.');
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
        // Map the fields from SAP to FAST
        const mappedDistributors = this.mapSAPDistributorsToFAST(distributors);
        try {
            // 1. PT_TMDIST
            await this.upsertFASTDistributors(mappedDistributors);
            // 2. BrazilDistributorDivision
            // 3. delete records from SAP table
        }catch (error) {
            console.error(`ERROR: Processing of Brazil distrubutors failed.`);
            console.error(error);
            throw error;
        }
        
    
        // 2. BrazilDistributorDivision
        // 1. Identify if Distributor already exists in BrazilDistributorDivision -> Condigo
        // 2a. If yes, update BrazilDistributorDivision record with info from SAP Brazil
        // 2b. If no, create new record in BrazilDistributorDivision with info from SAP Brazil
        // 3. map fields from SAP to FAST


        console.log(`Processing of Brazil distrubutors successfully completed.`);
        return mappedDistributors;
    }

    mapSAPDistributorsToFAST(distributors) {
        console.log(`Mapping of Brazil distributors ...`);
        distributors = distributors.reduce((prev, curr, idx, distributors) => {
            const numberOfDivisions = (distributors.filter(distr => distr.CODIGO ===  curr.CODIGO)).length;

            let fastDistributor = {
                CountryCode: "BR",
                DistributorID: "",
                DistributorName: curr.RAZAO,
                Address: `${curr.ENDERECO} ${curr.BAIRRO} ${curr.CEP} ${curr.CIDADE}`,
                ContactNo: curr.TELEFONE,
                Fax: curr.FAX,
                ContactPerson:"",
                ActiveRecord: (!curr.BLOQ && curr.STATUS === 'A') ? 'Yes' : 'No',
                CONTACT_EMAIL: curr.EMAIL,
                City: curr.CIDADE,
                State: curr.REGIAO,
                TaxCode: curr.IE,
                CNPJ: curr.CNPJ,
                CustomerID: curr.CODIGO,
                Shortname: curr.FANTASIA,
                CommissionRate: 0.0,
                INCOTerms:"",
                PaymentTerms:"",
                ForAllBrands: (numberOfDivisions > 2),
            };

            prev.push(fastDistributor);
            return prev;
        }, []);
        console.log(`Mapping of Brazil distributors finished.`);
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
                await tx.run(UPDATE(PT_TMDIST).with(FASTDistributor));
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