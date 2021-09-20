const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

    const {
		SalesOpportunityProducts
    } = cds.entities("com.bayer.SXTENDER.SalesOpportunityData");

    
    srv.on('READ', 'PublicSalesOpportunities', async (req, next) => {


        // 1. when any filters are provided with the reqest, first remove the filter 'Division' as we want to get all the data regardless of the 'Division'.
        // at this point in time the 'Division' is not yet calculated.
        let divisionFilterIndex = null; 
        let divisionFilterValues = null;
        if(req.query.SELECT.where){

            divisionFilterIndex = ServiceHelper.getWhereId(req, 'Division');
            divisionFilterValues = ServiceHelper.getWhereValues(req, 'Division');

            if(divisionFilterIndex >= 0){
                ServiceHelper.deleteFilter(req, 'Division');
            }
        }
        
        const data = await next();

        // 2. calculate the 'Division' and 'OpportunityValue' fields 
        /**
         * Calculates the 'OpportunityValue' and the 'Division' based on the logic below for each opportunity
         * An opportunity can contain multiple products. Products are in specific division.
         *  If opportunity only contains **Pharma** products, it is a **Pharma** opportunity
         *  If opportunity only contains **Radiology** products, it is a **Radiology** opportunity
         *  If opportunity contains products from both divisions, it is a **Both** (division) opportunity.
         * */ 
        const promises = data.map(async (opp) => {

            let products = opp.Products;

            if(!products){
                const tx = cds.transaction(req);
                let whereOpportunity = ServiceHelper.buildFullWhere("Opportunity_ID", "=", opp.ID);
                products = await tx.run(SELECT.from(SalesOpportunityProducts).where(whereOpportunity));
            }

            opp.OpportunityValue = products.reduce((sum, prd) => sum + (prd.RecommendedPrice * prd.RequestedQuantity), 0);

            const hasPharma = products.filter(prd => prd.Division && prd.Division.toLowerCase() === 'pharma').length > 0;
            const hasRadiology = products.filter(prd => prd.Division && prd.Division.toLowerCase() === 'radiology').length > 0;

            if(hasPharma && hasRadiology){
                opp.Division = 'Both';
            }else if(hasPharma){
                opp.Division = 'Pharma';
            }else if(hasRadiology){
                opp.Division = 'Radiology';
            }

            return opp;

        });


        const result = await Promise.all(promises);

        //3. filter the results to only return records for Divisions from the initial filter
        if(divisionFilterValues && divisionFilterValues.length > 0){
            const filteredResult = result.filter(opportunity => opportunity.Division && opportunity.Division.toLowerCase() === divisionFilterValues[0].toLowerCase());
            return req.reply(filteredResult);
        }

        return req.reply(result);

	});

}