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
        console.log(`Start processing BrazilDistrubutors`);
        const { PT_TMDIST } = this.db.entities("com.bayer.SXTENDER.MasterData");

        const nextDistributorID = await this.getNextValue(PT_TMDIST, "DistributorID");
        // Distributor - PT_TMDIST
        // 1. map fields from SAP to FAST
        const mappedDistributors = this.mapSAPDistributorsToFAST(distributors);
        // 2. Identify if Distributor already exists in PT_TMDIST -> Condigo
        // 3a. If yes, update PT_TMDIST record with info from SAP Brazil
        // 3b. If no, create new record in PT_TMDIST with info from SAP Brazil -> generate new DistributorID
        

        // DistributorDivision - BrazilDistributorDivision
        // 1. Identify if Distributor already exists in BrazilDistributorDivision -> Condigo
        // 2a. If yes, update BrazilDistributorDivision record with info from SAP Brazil
        // 2b. If no, create new record in BrazilDistributorDivision with info from SAP Brazil
        // 3. map fields from SAP to FAST


        console.log(`End processing BrazilDistrubutors`);
        return distributors;
    }

    mapSAPDistributorsToFAST(distributors) {
        console.log(`Start mapping of Brazil distributors`);
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
                CommissionRate:"",
                INCOTerms:"",
                PaymentTerms:"",
                ForAllBrands: (numberOfDivisions > 2),
            };

            prev.push(fastDistributor);
            return prev;
        }, []);
        console.log(`End mapping of Brazil distributors`);
        return distributors;
    }


    async updateFASTPrices(prices) {
        const FASTPrices = await this.getFASTPrices(prices);
        //Q: keys of BrazilMasterPrices? 
        const FASTNewPrices = [];
        const FASTChangedPrices = [];
        console.log(`Prepare update BrazilPrices in FAST table`);
        for (const price of prices) {
            let FASTPriceIdx = FASTPrices.findIndex(FASTPrice =>
                FASTPrice.CustomerID === price.CustomerID &&
                FASTPrice.ProductID === price.ProductID &&
                FASTPrice.ValidFrom === price.ValidFrom &&
                FASTPrice.ValidTo === price.ValidTo &&
                FASTPrice.Type === price.Type);
            if (FASTPriceIdx > -1) {
                FASTChangedPrices.push(price);
            } else {
                FASTNewPrices.push(price);
            }
        }
        //Update is one by one: https://answers.sap.com/questions/13676137/bulk-update-in-cap-nodejs.html

        console.log(`Start update BrazilPrices in FAST table`);
        const { BrazilMasterPrices } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const tx = this.db.tx();
        try {
            for (const FASTPrice of FASTChangedPrices) {
                await tx.run(UPDATE(BrazilMasterPrices).with(FASTPrice));
            }
            FASTNewPrices && FASTNewPrices.length > 0 && await tx.run(INSERT(FASTNewPrices).into(BrazilMasterPrices));
            await tx.commit();
            console.log(`End update BrazilPrices in FAST table`);
            return true;
        } catch (error) {
            console.error(`ERROR: during update BrazilPrices in FAST table`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }

    async getFASTPrices(prices) {
        if(!prices || prices.length === 0){
            console.log(`No SAP Prices to be updated -> No FAST Prices to be fetched`);
            return [];
        }
        const tx = this.db.tx();
        console.log(`Prepare fetching BrazilPrices from FAST table`);
        let custIDs = [];
        let productIDs = [];
        for (const price of prices) {
            custIDs.push(price.CustomerID);
            productIDs.push(price.ProductID);
        }
        console.log(`Start fetching BrazilPrices from FAST table`);
        const { BrazilMasterPrices } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await tx.run(SELECT.from(BrazilMasterPrices).where({ CustomerID: { in: custIDs}, ProductID: { in: productIDs } } )); //Q: Select everything or specific product? Delete when processing sucessful?
        await tx.commit();
        console.log(`End fetching BrazilPrices from FAST table`);
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
        console.log(`Start fetching next value of ${fieldname} from FAST ${table.name}`);
		let results = await tx.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
		let nextValue = 1;
		if (results[0].max) {
			nextValue = results[0].max + 1
		}
        await tx.commit();
        console.log(`End fetching next value of ${fieldname}  from FAST ${table}`);
		return nextValue;
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