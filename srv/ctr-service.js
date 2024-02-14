const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {
    // Use reflection to get the csn definition of Books
	const {
		Channels, Contracts, Products, Deliveries, Letters
    } = cds.entities("com.bayer.SXTENDER.ContractsAppData");
    const {
		OfferConsolidation, OfferProductConsolidation
    } = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");
    const {
        PT_TMTRRES, 
        PT_TMUDLTRS, 
        PT_TMDLVTR,
        PT_TMOFPR: TenderProducts
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");
    const {
        PT_TMINST: Institutes, 
        PT_TMDIST: Distributors,
        PT_TMLE: SellingCompany,
        PT_TMPRDPCK: Product
    } = cds.entities("com.bayer.SXTENDER.MasterData");


    /**
     * Don't delete this code. Might be handy in the future
     */
    // srv.on('READ', 'Contracts', async (req) => {
    //     const tx = cds.transaction(req);
    //     let results = [];

    //     // const { $expand: expand } = req._.odataReq.getQueryOptions();

    //     const contracts = req.query.SELECT.where ? await tx.run(SELECT.from(Contracts).where(req.query.SELECT.where)) : await tx.run(SELECT.from(Contracts));

    //     if (contracts){

    //         const contractPromises = contracts.map(async contract =>{

    //             // expand Products, Products/Deliveries and Products/Letters
    //             const whereContract = ServiceHelper.buildFullWhere("Contract_ID", "=", contract.ID);
    //             const products =  await tx.run(SELECT.from(Products).where(whereContract)).then(async products => {

    //                 const productPromises = products.map(async product =>{

    //                     const whereProduct = ServiceHelper.buildFullWhere("Product_ID", "=", product.ID);
    //                     const deliveries = await tx.run(SELECT.from(Deliveries).where(whereContract).where(whereProduct));
    //                     const letters = await tx.run(SELECT.from(Letters).where(whereContract).where(whereProduct));
    //                     const whereProductsProduct = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", product.ProductPackId);
    //                     const productsProduct = await tx.run(SELECT.from(Product).where(whereProductsProduct));

    //                     return {
    //                         ...product,
    //                         Deliveries: deliveries,
    //                         Letters: letters,
    //                         Product: productsProduct[0]
    //                     }

    //                 });

    //                 return await Promise.all(productPromises);

    //             });

    //             // expand Institute
    //             const whereInstitute = ServiceHelper.buildFullWhere("InstituteId", "=", contract.InstituteId);
    //             const [institute] =  await tx.run(SELECT.from(Institutes).where(whereInstitute));

    //             // expand Channel
    //             const whereChannel = ServiceHelper.buildFullWhere("ID", "=", contract.ChannelId);
    //             const [channel] =  await tx.run(SELECT.from(Channels).where(whereChannel));

    //             // expand Distributor
    //             const whereDistributor = ServiceHelper.buildFullWhere("DistributorID", "=", contract.DistributorId);
    //             const [distributor] =  await tx.run(SELECT.from(Distributors).where(whereDistributor));

    //             // expand SellingCompany
    //             const whereSellingCompany = ServiceHelper.buildFullWhere("LegalEntityCode", "=", contract.SellingCompanyCode);
    //             const [sellingCompany] =  await tx.run(SELECT.from(SellingCompany).where(whereSellingCompany));
                

    //             return {
    //                 ...contract,
    //                 Products: products,
    //                 Channel: channel,
    //                 Institute: institute,
    //                 Distributor: distributor,
    //                 SellingCompany: sellingCompany
    //             };

    //         });

    //         results = await Promise.all(contractPromises);

    //     }

	// 	return results;
    // });


    /**
     * Calculate Contract.OfferValue
     * OfferValue = sum of product.NspPerUnit + product.Quantity of each product for the contract
     * OfferValue = sum of Product.OfferValue
     */
    srv.after('READ', 'Contracts', (contracts, req) => {
        // const tx = cds.transaction(req);
		const tx = cds.tx(req);
        // const queryOptions = req._.odataReq.getQueryOptions();

        Array.isArray(contracts) && contracts.map(async contract => {

/*
            // TODO: when Products is not expanded this code breaks. Eg: ctr/Contracts?$expand=Institute%2CDistributor
            const whereContract = ServiceHelper.buildFullWhere("Contract_ID", "=", contract.ID);
            const whereEnabled = ServiceHelper.buildFullWhere("Enabled", "=", true);
            const products = contract.Products || await tx.run(SELECT.from(Products).where(whereContract).where(whereEnabled));
            */
            
            //Calculate offervalue
            const products = contract.Products;

            const offerValue = products && products.reduce((total, product) => (total + product.NspPerUnit) * product.Quantity, 0);
            contract.OfferValue = offerValue;
        });
        
    });
}