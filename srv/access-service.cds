service AccessService @(path: 'access') @(requires:['authenticated-user']){
    
    type Access {
        tender : Boolean;
        tenderAccess:{
            COGS:Boolean;
           
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
    };

    function getAccess() returns Access;
};