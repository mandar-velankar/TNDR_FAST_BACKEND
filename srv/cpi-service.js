const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {


    // srv.after('READ', 'Contracts', (contracts, req) => {
    //     const tx = cds.transaction(req);
    //     // const queryOptions = req._.odataReq.getQueryOptions();

    //     contracts.map(async contract => {
            
    //         //Calculate offervalue
    //         const products = contract.Products;

    //         const offerValue = products && products.reduce((total, product) => (total + product.NspPerUnit) * product.Quantity, 0);
    //         contract.OfferValue = offerValue;
    //     });
        
    // })



}