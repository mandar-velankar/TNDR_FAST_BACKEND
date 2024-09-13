service AccessService @(path: 'access') @(requires:['authenticated-user']){
    
    type Access {
        tender : Boolean;
        tenderAccess:{
            COGS:Boolean;
            SPAINTENDERVIEW:Boolean;
            PHARMATENDERVIEW:Boolean;
            RADIOLOGYTENDERVIEW:Boolean;
            MEATENDERVIEW:Boolean;
           
        };
        adminAccess:{
            ConsumerPrices:Boolean;
            DistributorManagememt:Boolean;
            DistributorManagementExclusiveAccess:Boolean;
            COGSManagementView:Boolean;
            WPPManagementPowerApproverAccess: Boolean;
            PPPManagementPowerApproverAccess: Boolean;
        };
        standardtenderAccess: {
			OverviewDownload: Boolean;
            ZuelligExtract: Boolean;
            LimitedPricingTabAccess: Boolean;
		};
        ppa:Boolean;
        contract:Boolean;
        epa:Boolean;
        masterdata:Boolean;
        bankguarantees:Boolean;
        priceagreements:Boolean;
        salesopportunity:Boolean;
        createopportunity:Boolean;
        cpi:Boolean;
        brazilcontracting:Boolean;
        standardtender:Boolean;
        whc:Boolean
    };

    function getAccess() returns Access;
};