const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

    srv.on('READ', 'OverallApprovalStatus', (approvals, req) => { debugger;

        const tx = cds.transaction(req);
        // const queryOptions = req._.odataReq.getQueryOptions();

        const distinctApprovals = [];

        approvals.map( approval => { debugger;

            // TODO: when Products is not expanded this code breaks. Eg: ctr/Contracts?$expand=Institute%2CDistributor
            // const whereContract = ServiceHelper.buildFullWhere("Contract_ID", "=", contract.ID);
            // const products = contract.Products || await tx.run(SELECT.from(Products).where(whereContract));

            // const offerValue = products && products.reduce((total, product) => total + product.OfferValue, 0);
            // contract.OfferValue = offerValue;
        });
        
    });

}