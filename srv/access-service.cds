service AccessService @(path: 'access') @(requires:['authenticated-user']){
    
    //EITOG-217330-Only to view commercial offers, NOT to modify
    type Access {
        tender : Boolean;
        tenderAccess:{
            COGS:Boolean;
            SPAINTENDERVIEW:Boolean;
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