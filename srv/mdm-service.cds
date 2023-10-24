using {
    com.bayer.SXTENDER.MasterData,
    sap.common
} from '../db/MasterData';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';
using { com.bayer.SXTENDER.MasterDataLatestValues } from '../db/MasterDataLatestValues';
using {com.bayer.SXTENDER.ExternalDataViews} from '../db/ExternalDataViews';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';
using {com.bayer.SXTENDER.AdminData} from '../db/AdminData';
using {
    User,
    Country,
    managed,
    cuid
} from '@sap/cds/common';


service MasterDataManagementService @(path : 'mdm')@(requires : ['authenticated-user','f_tndr_cag_admin','f_tndr_cag_mdm_user','f_tndr_cag_technical_user']) {


    entity PT_TMLE                  as projection on MasterData.PT_TMLE;
    entity PT_TMCTLE                as projection on MasterData.PT_TMCTLE;
    entity PT_TMCTLEBR     as projection on MasterData.PT_TMCTLEBR;
    entity CountryBrands @readonly  as projection on MasterDataViews.CountryBrands;
    entity CountryProductUnits @readonly  as projection on MasterDataViews.CountryProductUnits;
    entity PT_TMINSHIER             as projection on MasterData.PT_TMINSHIER;
    entity PT_TMINSBRTR @readonly   as projection on MasterData.PT_TMINSBRTR;
    entity PT_TMDISBRD              as projection on MasterData.PT_TMDISBRD;
    entity PT_TMPRDPCK @(cds.redirection.target:false) as projection on MasterData.PT_TMPRDPCK;
    entity PT_TMCTPRDPCK            as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMSKUPRDPCK @(cds.redirection.target:false) as projection on MasterData.PT_TMSKUPRDPCK;
    entity CountryRegions           as projection on MasterData.CountryRegions;
    entity CountryProvinces         as projection on MasterData.CountryProvinces;
    entity InstituteDivision        as projection on MasterData.InstituteDivision;
    entity DistributorDivision      as projection on MasterData.DistributorDivision;
    
    entity PT_TMINST                as select from MasterData.PT_TMINST{
        *,
        Region: redirected to CountryRegions,
        Province: redirected to CountryProvinces,
        InstituteDivision: redirected to InstituteDivision
    };
    entity PT_TMDIST                as select from MasterData.PT_TMDIST{
        *,
        DistributorDivision: redirected to DistributorDivision
    };

    entity CountryCurrency @readonly as projection on MasterDataViews.CountryCurrency;

    entity ProductPackSKUs as projection on MasterDataViews.ProductPackSKUs;
    entity ProductPack @(cds.redirection.target:false) as projection on MasterDataViews.ProductPack;
    entity CountryBrandProducts    as select from MasterDataViews.CountryBrandProducts {
        *,
        ProductPackSKU: redirected to ProductPackSKUs,
        ProductPack: redirected to ProductPack
    };
    entity Divisions @readonly @(cds.redirection.target:false)    as projection on MasterDataViews.Divisions;


    entity PT_TMREGPR      as projection on MasterData.PT_TMREGPR;
    /*entity ConsumerPricesMasterView as select from MasterData.ConsumerPrices as cs
    inner join CountryBrandProducts as bp on cs.ProductPackId = bp.PRODUCT_ID{
        key cs.ID,
        key cs.CountryCode,
        key cs.ProductPackId,
        cs.Currency,
        cs.ValidFrom,
        cs.ValidTo,
        cs.ConsumerPriceExclPP,
        cs.ConsumerPriceInclPP,
        cs.ConsumerPriceExclPU,
        cs.ConsumerPriceInclPU,
        cs.VatPerPack,
        cs.MandatoryDiscount,
        cs.ExfPriceExclPP,
        cs.ConfidentialDiscount1,
        cs.ConfidentialDiscount2,
        cs.TotalDiscount,
        cs.MaxPriceNhsPP,
        cs.MaxPriceNhsPU,
        bp.BRAND_ID,
        bp.BRAND_NAME,
        bp.PRODUCT_NAME,
        cs.ProductPack: redirected to PT_TMPRDPCK
    };*/

    entity ConsumerPricesMasterView as select from PT_TMCTPRDPCK as bp
    left outer join MasterData.ConsumerPrices as cs on bp.PRODUCTPACKID = cs.ProductPackId {
        cs.ID,
        bp.COUNTRYCODE as CountryCode,
        key bp.PRODUCTPACKID,
        cs.Currency,
        cs.ValidFrom,
        cs.ValidTo,
        cs.ConsumerPriceExclPP,
        cs.ConsumerPriceInclPP,
        cs.ConsumerPriceExclPU,
        cs.ConsumerPriceInclPU,
        cs.VatPerPack,
        cs.MandatoryDiscount,
        cs.ExfPriceExclPP,
        cs.ConfidentialDiscount1,
        cs.ConfidentialDiscount2,
        cs.TotalDiscount,
        cs.MaxPriceNhsPP,
        cs.MaxPriceNhsPU,
        //bp.BRAND_ID,
        //bp.BRAND_NAME,
        //bp.PRODUCT_NAME,
        //cs.ProductPackId,
        bp.ProductPack: redirected to PT_TMPRDPCK
    };

    entity ConsumerPrices as projection on MasterData.ConsumerPrices;

   

    entity CountryRegisteredPrice as SELECT from MasterData.PT_TMREGPR as RegisteredPrice

    INNER JOIN MasterDataLatestValues.MostRecentRegisteredPrice as l 
    on RegisteredPrice.CountryCode=l.CountryCode 
    and RegisteredPrice.ProductPackID=l.ProductPackID 
    and RegisteredPrice.EffDate=l.MaxEffectiveDate

    inner join MasterData.PT_TMPRDPCK as ProductPack 
            on  RegisteredPrice.ProductPackID = ProductPack.PRODUCTPACKID 

    inner join MasterDataLatestValues.CountryCogs as Cogs
    on  RegisteredPrice.CountryCode=Cogs.COUNTRY_CODE
    and RegisteredPrice.ProductPackID=Cogs.PRODUCT_ID



    {

        key RegisteredPrice.CountryCode ,
        key RegisteredPrice.ProductPackID,
        RegisteredPrice.UOM,
        key RegisteredPrice.EffDate as PriceEffDate ,
        key RegisteredPrice.Currency as PriceCurrency ,
        RegisteredPrice.RegisteredPrice,
        RegisteredPrice.ActiveRecord as PriceActiveRecord,
        RegisteredPrice.EndDate as PriceEndDate,
        RegisteredPrice.RegisteredPriceSource,
        RegisteredPrice.RegisteredPriceID,


        Cogs.COGSID,
        Cogs.COGS as CogsPrice,
        Cogs.CURRENCY as CogsCurrency,
        //Cogs.UOM as CogsUom,
        Cogs.EffectiveDate as CogsEffDate,
        Cogs.EndDate as CogsEndDate,
        Cogs.COGSType,
        Cogs.ActiveRecord as CogsActiveRecord,


        
        
        
        
        ProductPack.PRODUCTPACKNAME as ProductPackName,

    }where RegisteredPrice.ActiveRecord = 'Yes';

   


    entity PT_TMCOGS       as projection on MasterData.PT_TMCOGS;
    entity PT_TMPRDHIER @readonly as projection on MasterData.PT_TMPRDHIER;
    entity COUNTRY_APPROVERS  as projection on MasterData.CountryApprovers;
    entity APPROVERTYPES  as projection on MasterData.ApproverTypes;
    entity PT_TMCTRY @readonly @(cds.redirection.target:false) as projection on MasterData.PT_TMCTRY;
    entity CountryChannels                   as projection on MasterData.MASTER_COUNTRY_CHANNELS;

    entity NextValueCountrySKUID @(cds.redirection.target:false) as select from PT_TMSKUPRDPCK {
        max(CountrySKUID) as nextCountrySkuID:Integer
    };

    entity InstitutesView @(cds.redirection.target:false) as projection on MasterData.PT_TMINST {
        *,
        CustomerID as CustomerID: String
    };
    entity ClassifiactionsView as projection on MasterData.MASTER_COUNTRY_CLASSIFICATION as classification {
        *,
        classification.COUNTRY_CODE as CountryCode: String(2)
    };
    entity CountryInstituteTypeView as projection on MasterData.MASTER_COUNTRY_CHANNELS as instType {
        *,
        instType.ChannelCountry as CountryCode: String(2)
    };
    entity TenderChannel as projection on MasterData.TenderChannel;
    entity StandardDivisions as projection on MasterData.StandardDivisions {
        *,
        DivisionName as Division
    };
    entity MasterDistributors @readonly @(cds.redirection.target:false) as projection on ExternalDataViews.MasterDistributors;
    entity MasterCountryCurrencies as select from MasterData.CountryCurrency;
    
    entity DistinctProductScopeView @(cds.redirection.target:false) as select from MasterData.PT_TMCTPRDPCK {
        COUNTRYCODE as CountryCode,
        key ProductScope
    } group by ProductScope, COUNTRYCODE;

    entity MasterCountryOutComes as select from MasterData.MASTER_COUNTRY_OUTCOMES;
    entity MasterOutComeReasons as select from MasterData.PT_TMOUTRS;
    entity CountryPacks @(cds.redirection.target:false) as projection on MasterData.PT_TMCTPRDPCK;
    entity Country as projection on MasterData.PT_TMCTRY {
        *,
        CountryPacks: redirected to CountryPacks
    };
    entity Users as projection on AdminData.PT_TMUSER;

    entity UsersPerCountry @readonly @(cds.redirection.target:false) as projection on AdminData.PT_TMUSERCTRY {
        *,
        User.UserName as UserName,
        Country: redirected to Country,
        User: redirected to Users
    };
    entity UsersHavingOneCountry @(cds.redirection.target:false) as select from UsersPerCountry {
        key CWID,
        max(CountryCode) as CountryCode: String,
        count(CountryCode) as numberOfCountries: Integer,
        max(UserName) as UserName: String
    }
    group by CWID
    having count(CountryCode) = 1;

    entity CountryRegionsTableView @(cds.redirection.target:false) as projection on MasterData.CountryRegions;
    entity CountryLegalEntitySignatories as projection on MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory {
        *,
        signatory.COUNTRY_CODE as CountryCode
    };

}
