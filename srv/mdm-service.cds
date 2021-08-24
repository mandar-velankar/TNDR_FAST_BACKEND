using {com.bayer.SXTENDER.MasterData} from '../db/MasterData';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';
using { com.bayer.SXTENDER.MasterDataLatestValues } from '../db/MasterDataLatestValues';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';


service MasterDataManagementService @(path : 'mdm')@(requires : ['f_tndr_cag_admin','f_tndr_cag_mdm_user','f_tndr_cag_technical_user']) {


    entity PT_TMLE                  as projection on MasterData.PT_TMLE;
    entity PT_TMCTLE                as projection on MasterData.PT_TMCTLE;
    entity PT_TMCTLEBR     as projection on MasterData.PT_TMCTLEBR;
    entity CountryBrands @readonly  as projection on MasterDataViews.CountryBrands;
    entity CountryProductUnits @readonly  as projection on MasterDataViews.CountryProductUnits;
    entity PT_TMINST                as projection on MasterData.PT_TMINST;
    entity PT_TMINSHIER             as projection on MasterData.PT_TMINSHIER;
    entity PT_TMINSBRTR @readonly   as projection on MasterData.PT_TMINSBRTR;
    entity PT_TMDIST                as projection on MasterData.PT_TMDIST;
    entity PT_TMDISBRD              as projection on MasterData.PT_TMDISBRD;
    entity PT_TMPRDPCK @readonly    as projection on MasterData.PT_TMPRDPCK;
    entity PT_TMCTPRDPCK            as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMSKUPRDPCK  as projection on MasterData.PT_TMSKUPRDPCK;

    entity CountryCurrency @readonly as projection on MasterDataViews.CountryCurrency;

    entity ProductPackSKUs as projection on MasterDataViews.ProductPackSKUs;
    entity CountryBrandProducts    as select from MasterDataViews.CountryBrandProducts {
        *,
        ProductPackSKU: redirected to ProductPackSKUs
    };
    entity Divisions @readonly      as projection on MasterDataViews.Divisions;


    entity PT_TMREGPR      as projection on MasterData.PT_TMREGPR;

   

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
        RegisteredPrice.RegisteredPriceID
        
        
        
        ,
        ProductPack.PRODUCTPACKNAME as ProductPackName,
        Cogs.COGS as CogsPrice,
        Cogs.CURRENCY as CogsCurrency,
        Cogs.UOM as CogsUom
    }where RegisteredPrice.ActiveRecord = 'Yes';

   


    entity PT_TMCOGS @readonly      as projection on MasterData.PT_TMCOGS;
    entity PT_TMPRDHIER @readonly as projection on MasterData.PT_TMPRDHIER;
    entity COUNTRY_APPROVERS  as projection on MasterData.CountryApprovers;
    entity APPROVERTYPES  as projection on MasterData.ApproverTypes;
    entity PT_TMCTRY @readonly as projection on MasterData.PT_TMCTRY;
    entity CountryChannels                   as projection on MasterData.MASTER_COUNTRY_CHANNELS;


}
