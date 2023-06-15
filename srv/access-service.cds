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
    };

    function getAccess() returns Access;
};