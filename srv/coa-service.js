const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

    
    srv.after('READ', 'PublicSalesOpportunities', async (data, req) => {

        //  Calculates the 'OpportunityValue' for each opportunity
        data.forEach(opp => {
            opp.OpportunityValue = opp.Products && opp.Products.reduce((sum, prd) => sum + (prd.RecommendedPrice * prd.RequestedQuantity), 0);
        });


        return data;

	});

}