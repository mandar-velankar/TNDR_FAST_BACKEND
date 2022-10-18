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
        console.log('Processing Brazil Customers ...');
        this.db = await cds.connect.to('db');
        try {
            const allSAPCustomers = await this.getSAPCustomers();
            const distrubutors = allSAPCustomers.filter(cust => cust.REPRES === 'X');
            const institutes = allSAPCustomers.filter(cust => cust.REPRES !== 'X');

            await this.mapSAPDistributorsToFAST(distrubutors);
            // this.processInstitutes();
            // const prices = this.mapSAPPricesToFAST((await this.getSAPCustomers()));
            // this.updateFASTPrices(prices);
            debugger;
        } catch (error) {
            console.error(error);
        }
        console.log('Finished processing Brazil Customers ...');
    }


    async getSAPCustomers() {
        const tx = this.db.tx();
        console.log(`Start fetching BrazilCustomers from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS`);
        const { BrazilCustomers } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const result = await tx.run(SELECT.from(BrazilCustomers));
        await tx.commit();
        console.log(`End fetching BrazilCustomers from COM_BAYER_SXTENDER_MASTERDATA_SAP_BRAZILCUSTOMERS`);
        return result;
    }

    mapSAPDistributorsToFAST(distributors) {
        console.log(`Start processing BrazilDistrubutors`);
        distributors = distributors.reduce((prevValue, currentValue, idx, distributors) => {
            // let priceZWP0 = {
            //     CustomerID: parseInt(price.CLIENTE),
            //     ProductID: parseInt(price.CODIGO),
            //     ValidFrom: price.DATA_INI, //Q: Need example on how date looks when coming from SAP - seem format in CDS but will it one to one?
            //     ValidTo: price.DATA_FIM //Q: Need example on how date looks when coming from SAP - seem format in CDS but will it one to one?
            // };
            // let priceZWD4 = { ...priceZWP0 };
            // let priceIBRX = { ...priceZWP0 };
            // if (price.PRC_PADRAO) {
            //     priceZWP0.Type = "ZWP0";
            //     priceZWP0.Value = price.PRC_PADRAO;
            //     prev.push(priceZWP0);f
            // }
            // if (price.DESC_PADRAO) {    //Q: would this be enough to know if we need to create it in our db?
            //     priceZWD4.Type = "ZWD4";
            //     priceZWD4.Value = price.DESC_PADRAO;
            //     prev.push(priceZWD4);
            //     priceIBRX.Type = "IBRX";
            //     priceIBRX.Value = price.DESC_PADRAO;
            //     prev.push(priceIBRX);
            // }
            prevValue.push(currentValue);
            return prevValue;
        }, []);
        console.log(`End processing BrazilDistrubutors`);
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
};