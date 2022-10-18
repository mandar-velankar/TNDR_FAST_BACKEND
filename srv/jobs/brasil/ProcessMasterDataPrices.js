const cds = require('@sap/cds');
const BaseJob = require('../BaseJob');

module.exports = class ProcessMasterDataPrices extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
    }
    /**
    * Triggered when job has started
    */
    //override
    async onTick() {
        console.log('Processing Brazil MasterData prices ...');
        this.db = await cds.connect.to('db');
        try {
            const prices = this.mapSAPPricesToFAST([(await this.getSAPPrices())[0]]);//todo:only keep prices, just for testing iwth one
            await this.updateFASTPrices(prices);
        } catch (error) {
            console.error(`ERROR: Error when processing BrazilPrices, more info on the next lines`);
            console.error(error);
        }
        console.log('Finished processing Brazil MasterData prices ...');
    }
    async getSAPPrices() {
        const tx = this.db.tx();
        console.log(`Start fetching BrazilPrices from SAP table`);
        const { BrazilPrices } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const result = await tx.run(SELECT.from(BrazilPrices)); //Q: Select everything or specific product? Delete when processing sucessful?
        await tx.commit();
        console.log(`End fetching BrazilPrices from SAP table`);
        return result;
    }
    mapSAPPricesToFAST(prices) {
        console.log(`Start processing BrazilPrices`);
        prices = prices.reduce((prev, price, idx, prices) => {
            let priceZWP0 = {
                CustomerID: price.CLIENTE !== null ? parseInt(price.CLIENTE):null,
                ProductID: price.CODIGO !== null ? parseInt(price.CODIGO):null,
                ValidFrom: price.DATA_INI, 
                ValidTo: price.DATA_FIM
            };
            let priceZWD4 = { ...priceZWP0 };
            let priceIBRX = { ...priceZWP0 };
            if (price.PRC_PADRAO !== null) {
                priceZWP0.Type = "ZWP0";
                priceZWP0.Value = price.PRC_PADRAO;
                prev.push(priceZWP0);
            }
            if (price.DESC_PADRAO !== null) {    //Q: would this be enough to know if we need to create it in our db?
                priceZWD4.Type = "ZWD4";
                priceZWD4.Value = price.DESC_PADRAO;
                prev.push(priceZWD4);
                priceIBRX.Type = "IBRX";
                priceIBRX.Value = price.DESC_PADRAO;
                prev.push(priceIBRX);
            }
            return prev;
        }, []);
        console.log(`End processing BrazilPrices`);
        return prices;
    }
    async updateFASTPrices(prices) {
        const FASTPrices = await this.getFASTPrices(prices);
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
            price.CustomerID!==null && custIDs.push(price.CustomerID);
            price.ProductID!==null && productIDs.push(price.ProductID);
        }
        let where = {};
        if(custIDs && custIDs.length > 0){
            where.CustomerID = {in: custIDs};
        }
        if(productIDs && productIDs.length > 0){
            where.ProductID = {in: productIDs};
        }
        console.log(`Start fetching BrazilPrices from FAST table`);
        const { BrazilMasterPrices } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await tx.run(SELECT.from(BrazilMasterPrices).where(where));
        await tx.commit();
        console.log(`End fetching BrazilPrices from FAST table`);
        return result;
    }
};