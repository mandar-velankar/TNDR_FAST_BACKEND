service AccessService @(path: 'access') @(requires:['authenticated-user']){
    
    type Access {
        tender : Boolean;
        ppa:Boolean;
        contract:Boolean;
        epa:Boolean;
        masterdata:Boolean;
        salesopportunity:Boolean;
        createsalesopportunity:Boolean;
        cpi:Boolean;
    };

    function getAccess() returns Access;
};