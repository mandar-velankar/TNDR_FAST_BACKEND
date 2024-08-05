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

   

    entity CountryRegisteredPrice as SELECT from MasterData.PT_TMPRDPCK as ProductPack
    inner join MasterData.PT_TMCTPRDPCK AS CountryProductPack
    ON CountryProductPack.PRODUCTPACKID = ProductPack.PRODUCTPACKID and ProductPack.ACTIVERECORD = 'Yes'
    left join MasterDataLatestValues.CountryRegisteredPrice as l
    on CountryProductPack.COUNTRYCODE=l.COUNTRY_CODE and ProductPack.PRODUCTPACKID =l.PRODUCT_ID
    left join MasterDataLatestValues.CountryCogs as Cogs
    on  CountryProductPack.COUNTRYCODE = Cogs.COUNTRY_CODE
    and ProductPack.PRODUCTPACKID =Cogs.PRODUCT_ID
    {
        key CountryProductPack.COUNTRYCODE as CountryCode,
        key ProductPack.PRODUCTPACKID as ProductPackID,
        ifnull(l.UOM, '') as UOM: String,
        ifnull(l.CURRENCY,'')  as PriceCurrency: String(3),
        ifnull(l.REGISTERED_PRICE,0) as RegisteredPrice: Double,
        l.EffDate as PriceEffDate,
        l.EndDate as PriceEndDate,
        l.RegisteredPriceSource,
        l.RegisteredPriceID,
        l.ActiveRecord as PriceActiveRecord, 
		Cogs.COGSID,
        ifnull(Cogs.COGS, 0) as CogsPrice: Double,
        ifnull(Cogs.CURRENCY, l.CURRENCY)  as CogsCurrency: String(3),
        //Cogs.UOM as CogsUom,
        Cogs.EffectiveDate as CogsEffDate,
        Cogs.EndDate as CogsEndDate,
        Cogs.COGSType,
        Cogs.ActiveRecord as CogsActiveRecord,
        ProductPack.PRODUCTPACKNAME as ProductPackName
    }where ProductPack.ACTIVERECORD = 'Yes';

   


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
        classification.COUNTRY_CODE as CountryCode: String
    };
    entity CountryInstituteTypeView as projection on MasterData.MASTER_COUNTRY_CHANNELS as instType {
        *,
        instType.ChannelCountry as CountryCode: String
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

    entity ExcelUploadView as projection on TransactionalData.ExcelUpload;
    entity SalesDataUpload as projection on TransactionalData.ExcelUpload;

    entity DistributorAssignment as projection on MasterData.DistributorAssignment;
    entity DistinctProductBUs as select from PT_TMCTPRDPCK {
        COUNTRYCODE,
        key BU
    }where COUNTRYCODE = 'PK'
    group by COUNTRYCODE, BU;

    entity DistributionAgreementsView as projection on MasterDataViews.DistributionAgreementsView;
    entity DistributionAgreements as projection on MasterData.DistributionAgreements;
    entity DistributionAgreement as projection on MasterDataViews.DistributionAgreementsView;
    entity CurrentDistributionAgreementView as projection on MasterDataViews.CurrentDistributionAgreementView;
    entity WholesalePurchasePriceView as projection on MasterDataViews.WholesalePurchasePriceView;
    entity WholesalePurchasePrice as projection on MasterDataViews.WholesalePurchasePriceView;
}
