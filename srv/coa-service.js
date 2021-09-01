const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

    
    srv.after('READ', 'PublicSalesOpportunities', async (data, req) => {

        /**
         * Calculates the 'OpportunityValue' and sets the 'Division' based on the logic below for each opportunity
         * An opportunity can contain multiple products. Products are in specific division.
         *  If opportunity only contains **Pharma** products, it is a **Pharma** opportunity
         *  If opportunity only contains **Radiology** products, it is a **Radiology** opportunity
         *  If opportunity contains products from both divisions, it is a **Both** (division) opportunity.
         * */ 
        data.forEach(opp => {

            opp.OpportunityValue = opp.Products && opp.Products.reduce((sum, prd) => sum + (prd.RecommendedPrice * prd.RequestedQuantity), 0);

            const hasPharma = opp.Products && opp.Products.filter(prd => prd.Division && prd.Division.toLowerCase() === 'pharma').length > 0;
            const hasRadiology = opp.Products && opp.Products.filter(prd => prd.Division && prd.Division.toLowerCase() === 'radiology').length > 0;

            if(hasPharma && hasRadiology){
                opp.Division = 'Both';
            }else if(hasPharma){
                opp.Division = 'Pharma';
            }else if(hasRadiology){
                opp.Division = 'Radiology';
            }


        });


        return data;

	});

}