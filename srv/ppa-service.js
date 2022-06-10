const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

    // Use reflection to get the csn definition of Books
    const {
		OverallApprovalStatus
    } =cds.entities("com.bayer.SXTENDER.PricingPolicyData");

    /**
     * Get overall status for brand, based upon the existing approval statusses of the brand
     * @param {*} statusList (all approval statusses of brand)
     */
    function getOverallApprovalStatus(statusList) {
        
        //get overall status 
        let overallApprovalStatus = '';

        if (statusList && statusList.length > 0 ) {
            
            const priceApproved = statusList.every(status => status == 'Approved');
            const awaitingApproval = statusList.some(status => status == 'Waiting' || status == 'Processing');
            const priceRejected = statusList.some(status => status == 'Rejected');

            if(priceApproved) {
                overallApprovalStatus = 'Price Approved';
            }else if(awaitingApproval) {
                overallApprovalStatus = 'Awaiting Approval';
            }else if(priceRejected) {
                overallApprovalStatus = 'Price Rejected';
            }else{
                overallApprovalStatus = 'Not Approved';
            }
                
        }
		
		return overallApprovalStatus;
    }

    //Overall approval status for brand(s)
    srv.after('READ', 'Brands', async (brands, req) => { 
        
        // const tx = cds.transaction(req);
		const tx = cds.tx(req);
        let approvals = await tx.run(SELECT.from(OverallApprovalStatus));

        //replace status with overall status
        brands.map( brand => {

            //get all approvals for for brand 
            let approvalsOfBrand = approvals.filter(approval => approval.BrandId === brand.BrandId);
            let statusListOfBrand = approvalsOfBrand.map(approvalsOfBrand => approvalsOfBrand.ApprovalStatus);

            //calculate overall status
            overallStatus = getOverallApprovalStatus(statusListOfBrand);

            brand.Status = overallStatus;
            return brand;
        });

        //return brands
        return brands;

    });

    //Overall approval status for brand(s)
    srv.on('READ', 'OverallApprovalStatus', async (req) => { 
        
        // const tx = cds.transaction(req);
		const tx = cds.tx(req);
        let Approvals = await tx.run(req.query);
    
        const distinctApprovals = [];
        let previousApproval = {};
        let overallStatus = '';
        let approvalsCheck = JSON.parse(JSON.stringify(Approvals));

        Approvals.map( approval => {
            
            //logic only for a new BrandID
            if(!previousApproval || (previousApproval.BrandId !== approval.BrandId)){
                
                //get all existing statusses for brandID
                let approvalsOfBrand = approvalsCheck.filter(approvalCheck => approvalCheck.BrandId===approval.BrandId);
                let statusListOfBrand = approvalsOfBrand.map(approvalCheck => approvalCheck.ApprovalStatus);

                //calculate overall status
                overallStatus = getOverallApprovalStatus(statusListOfBrand);
                approval.ApprovalStatus = overallStatus;

                distinctApprovals.push(approval);
            }

            previousApproval = approval;

        });
        

        return distinctApprovals;
       
    });

}