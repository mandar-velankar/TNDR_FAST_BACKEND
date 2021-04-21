using {
    com.bayer.SXTENDER.MasterData,
    sap.common
} from '../db/MasterData';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';
using {com.bayer.SXTENDER.MasterDataLatestValues} from '../db/MasterDataLatestValues';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using {com.bayer.SXTENDER.AdminData} from '../db/AdminData';
using {com.bayer.SXTENDER.AdminDataViews} from '../db/AdminDataViews';
using { User, Country, managed, cuid } from '@sap/cds/common';


service CatalogService @(path : 'tender')
@(requires : [
'authenticated-user',
'f_tndr_cag_admin',
'f_tndr_cag_tnd_user',
'f_tndr_cag_technical_user'
]) 
{
    //Master Data Tables
    entity CountryLegalEntitySignatories     as projection on MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES;
    entity MASTER_APPROVED_PRICE             as projection on MasterData.MASTER_APPROVED_PRICE;
    entity CommercialAgreement               as projection on MasterData.MASTER_COMMERCIAL_AGREEMENT;
    entity ContractType                      as projection on MasterData.MASTER_CONTRACT_TYPE;
    entity CountryContractType               as projection on MasterData.MASTER_COUNTRY_CONTRACT_TYPE;
    entity CountrySalesType                  as projection on MasterData.MASTER_COUNTRY_SALES_TYPE;
    entity CountryTenderOrigin               as projection on MasterData.MASTER_COUNTRY_TENDER_ORIGIN;
    entity CountryTenderType                 as projection on MasterData.MASTER_COUNTRY_TENDER_TYPE;
    entity MASTER_INSTITUTE_HIERARCHY        as projection on MasterData.MASTER_INSTITUTE_HIERARCHY;
    entity SalesType                         as projection on MasterData.MASTER_SALES_TYPE;
    entity TenderOrigin                      as projection on MasterData.MASTER_TENDER_ORIGIN;
    entity TenderType                        as projection on MasterData.MASTER_TENDER_TYPE;
    entity MASTER_COUNTRY_STATUS             as projection on MasterData.MASTER_COUNTRY_STATUS;
    entity CountryApprovers                  as projection on MasterData.CountryApprovers;
    entity ApproverTypes                     as projection on MasterData.ApproverTypes;
    entity PT_TMCOGS                         as projection on MasterData.PT_TMCOGS;
    entity PT_TMCTLE                         as projection on MasterData.PT_TMCTLE;
    entity PT_TMCTLEBR                       as projection on MasterData.PT_TMCTLEBR;
    entity PT_TMCTPRDPCK                     as projection on MasterData.PT_TMCTPRDPCK;
    entity CountryClassifications            as projection on MasterData.MASTER_COUNTRY_CLASSIFICATION;
    entity CountryChannels                   as projection on MasterData.MASTER_COUNTRY_CHANNELS;
    entity CountryProcurementMethod          as projection on MasterData.MASTER_COUNTRY_PROCUREMENT_METHOD;
    entity CountryBindingTypeLevel1          as projection on MasterData.MasterCountryBindingTypeLevel1;
    entity CountryBindingTypeLevel2          as projection on MasterData.MasterCountryBindingTypeLevel2;
    entity CountryBindingTypeLevel3          as projection on MasterData.MasterCountryBindingTypeLevel3;
    entity CountrySpecifications             as projection on MasterData.MasterCountrySpecifications;
    entity MasterCompetitors                 as projection on MasterData.MasterCompetitors;
    entity BrandPolicies                     as projection on MasterData.BrandPolicies;
    entity DistributorBrandPolicies          as projection on MasterData.DistributorBrandPolicies;
    entity PT_TMCTRY @(restrict : [{
        grant : '*',
        to    : 'authenticated-user',
        where : 'User.CWID = $user.id'
    }])                                      as projection on MasterData.PT_TMCTRY {
        * , LegalEntities : redirected to PT_TMCTLE, CountryPacks : redirected to PT_TMCTPRDPCK, User : redirected to PT_TMUSERCTRY
    };

    entity PT_TMDISBRD                       as projection on MasterData.PT_TMDISBRD;
    entity PT_TMDIST                         as projection on MasterData.PT_TMDIST;
    entity PT_TMFXRTS                        as projection on MasterData.PT_TMFXRTS;
    entity PT_TMINDSBR                       as projection on MasterData.PT_TMINDSBR;
    entity PT_TMINSBRTR                      as projection on MasterData.PT_TMINSBRTR;
    entity PT_TMINSHIER                      as projection on MasterData.PT_TMINSHIER;
    entity PT_TMINST                         as projection on MasterData.PT_TMINST;

    entity PT_TMLE                           as projection on MasterData.PT_TMLE {
        * , Countries : redirected to PT_TMCTLE
    };

    entity PT_TMOUTRS                        as projection on MasterData.PT_TMOUTRS;
    entity PT_TMPNLTYRS                      as projection on MasterData.PT_TMPNLTYRS;
    entity PT_TMPRDHIER                      as projection on MasterData.PT_TMPRDHIER;

    entity PT_TMPRDPCK                       as projection on MasterData.PT_TMPRDPCK {
        * , CountryPacks : redirected to PT_TMCTPRDPCK
    };

    entity PT_TMRCM                          as projection on MasterData.PT_TMRCM;
    entity PT_TMREGIONSTRUC                  as projection on MasterData.PT_TMREGIONSTRUC;
    entity PT_TMREGPR                        as projection on MasterData.PT_TMREGPR;
    entity PT_TMSKUPRDPCK                    as projection on MasterData.PT_TMSKUPRDPCK;
    entity PT_TMTABRMP                       as projection on MasterData.PT_TMTABRMP;
    entity BUDGETEDPROFITABILITY             as projection on MasterData.BUDGETEDPROFITABILITY;

    //Master Data Latest Values
    entity CountryRegisteredPrice @readonly  as projection on MasterDataLatestValues.CountryRegisteredPrice;
    entity CountryCogs @readonly             as projection on MasterDataLatestValues.CountryCogs;
    entity ExchangeRates @readonly           as projection on MasterDataLatestValues.ExchangeRates;
    entity VWBUDGETEDPROFITABILITY @readonly as projection on MasterDataLatestValues.VWBUDGETEDPROFITABILITY;
    entity MostRecentBrandPolicies @readonly as projection on MasterDataLatestValues.MostRecentBrandPolicies;
    entity MostRecentDistributorBrandPolicies @readonly as projection on MasterDataLatestValues.MostRecentDistributorBrandPolicies;

    //Master Data Views
    entity CountryBrandProducts @readonly    as projection on MasterDataViews.CountryBrandProducts;
    entity CountryBrands @readonly           as projection on MasterDataViews.CountryBrands;
    entity CountryCurrency @readonly         as projection on MasterDataViews.CountryCurrency;
    entity CountryLegalEntity @readonly      as projection on MasterDataViews.CountryLegalEntity;
    entity AggregatedDistributorBrandPolicies @readonly as projection on MasterDataViews.AggregatedDistributorBrandPolicies;
    
    //Master Data Services
    entity InstituteDistributor {
        key COUNTRY_INSTITUTE_DISTRIBUTOR_ID : String(500);
            COUNTRY_CODE                     : String(2) not null;
            INSTITUTE_ID                     : Integer not null;
            INSTITUTE_NAME                   : String(500);
            DISTRIBUTOR_ID                   : Integer not null;
            DISTRIBUTOR_NAME                 : String(500);
            LEGAL_ENTITY_CODE                : String(3) not null;
            CHANNEL                          : String(11) not null;
    };

    entity InstituteDistributorBrandProduct {
        key COUNTRY_CODE      : String(2) not null;
        key INSTITUTE_ID      : Integer not null;
            INSTITUTE_NAME    : String(500);
        key DISTRIBUTOR_ID    : Integer not null;
            DISTRIBUTOR_NAME  : String(500);
        key BRAND_ID          : String(50) not null;
            BRAND_NAME        : String(100);
        key PRODUCT_ID        : Integer not null;
            PRODUCT_NAME      : String(100);
            INCO_TERMS        : String(500);
            PAYMENT_TERMS     : String(500);
            COMMISSION_RATE   : Double;
        key LEGAL_ENTITY_CODE : String(3) not null;
        key CHANNEL           : String(11) not null;
            COUNTRY_OF_ORIGIN : String(120);
            COGS              : Double;
            PACKFACTOR        : Integer;
    };

    //Transactional Data Tables
    entity PT_OFGRPUR                        as projection on TransactionalData.PT_OFGRPUR;
    entity PT_SCENARIOPLAN                   as projection on TransactionalData.PT_SCENARIOPLAN;
    entity PT_TENDGRPPUR                     as projection on TransactionalData.PT_TENDGRPPUR;

    entity PT_TMAPPRST                       as projection on TransactionalData.PT_TMAPPRST {
        * , OfferProduct : redirected to PT_TMOFPR
    };

    entity PT_TMAWRDCR                       as projection on TransactionalData.PT_TMAWRDCR {
        * , Tender : redirected to PT_TMTEND
    };

    entity Specifications                    as projection on TransactionalData.Specifications {
        * , Tender : redirected to PT_TMTEND
    };


    entity PT_TMBDPR                         as projection on TransactionalData.PT_TMBDPR {
        * , Product : redirected to PT_TMOFPR
    };

    entity PT_TMDLVTR                        as projection on TransactionalData.PT_TMDLVTR;

    entity PT_TMOFPR                         as projection on TransactionalData.PT_TMOFPR {
        * , SKUCountry : redirected to PT_TMCTPRDPCK, Offer : redirected to PT_TMOFRS
    };

    entity PT_TMOFRS                         as projection on TransactionalData.PT_TMOFRS {
        * , Tender : redirected to PT_TMTEND
    };

    entity OfferView                         as projection on TransactionalData.OfferView {
        * , Tender : redirected to PT_TMTEND
    };

    entity CountrySpecificInformation as projection on TransactionalData.CountrySpecificTenderInfo {
        *
    };

    entity OfferStatus                       as projection on TransactionalDataViews.OfferStatus;
    entity PT_TMPFIOM                        as projection on TransactionalData.PT_TMPFIOM;

    entity PT_TMQUTO                         as projection on TransactionalData.PT_TMQUTO {
        * , Offer : redirected to PT_TMOFRS
    };

    entity PT_TMTEND                         as projection on TransactionalData.PT_TMTEND {
        * , 
        Offer : redirected to PT_TMOFRS, 
        OfferView : redirected to OfferView,
        CountrySpecificInformation: redirected to CountrySpecificInformation
    };

    entity PT_TMTNOFST                       as projection on TransactionalData.PT_TMTNOFST;
    entity PT_TMTRRES                        as projection on TransactionalData.PT_TMTRRES;
    entity PT_TMUDLTRS                       as projection on TransactionalData.PT_TMUDLTRS;
    entity TransCompetitorResult             as projection on TransactionalData.TransCompetitorResult;
    //Transactional Data Views
    entity TenderOffers @readonly            as projection on TransactionalDataViews.TenderOffers;
    entity OfferRevisions @readonly          as projection on TransactionalDataViews.OfferRevisions;
    entity CountryTenderBrands @readonly     as projection on TransactionalDataViews.CountryTenderBrands;
    entity CountryTenderNo @readonly         as projection on TransactionalDataViews.CountryTenderNo;
    entity TenderResults @readonly           as projection on TransactionalDataViews.TenderResults;
    entity LatestApprovalRequests @readonly  as projection on TransactionalDataViews.LatestApprovalRequests;
    entity PreviousApproval @readonly        as projection on TransactionalDataViews.PreviousApproval;
    entity TenderHistory @readonly           as projection on TransactionalDataViews.TenderHistory;
    entity OfferValues @readonly             as projection on TransactionalDataViews.OfferValues;
    entity TenderOfferMaster @readonly       as projection on TransactionalDataViews.TenderOfferMaster;
    entity BrandsInTender @readonly          as projection on TransactionalDataViews.BrandsInTender;
    entity CountryMinPrice @readonly         as projection on TransactionalDataViews.CountryMinPrice;
    entity PreApprovedPrices @readonly       as projection on TransactionalDataViews.PreApprovedPrices;

    //Transactional Data Services
    entity OfferProductValidation {
            TENDER_ID                      : String(30);
            COUNTRY_CODE                   : String(2);
        key OFFER_ID                       : String(30) not null;
            DIVISION                       : String(100);
            BRANDID                        : String(50);
            BRANDNAME                      : String(100);
            PRODUCT_UNIT_NAME              : String(100); //thailand
            SKU                            : Integer;
        key PRODUCTID                      : Integer not null;
            CODE                           : String(255);
            PRODUCTNAME                    : String(102);
            PACKSIZE                       : Double not null;
            DOSAGE                         : Double;
            UOM                            : String(10);
            COUNTRYOFORIGIN                : String(120);
            MANUFACTURER                   : String(500);
            SHELFLIFE                      : Integer;
            PRESENTATION                   : String(50);
            VAT                            : Double; //percentage VAT (thailand)
            PRODUCT_COMMENT                : String(784);
            UNIT                           : String(255);
            PAID_VOLUME                    : Double;
            SORTER                         : Integer;
            CURRENCY                       : String(255);
            REQUESTED_QUANTITY             : String(567);
            SHIPMENT_TERMS                 : String(317);
            PAYMENT_TERMS                  : String(255);
            DELIVERY_TERMS                 : String(500);
            SAMPLES                        : Integer;
            SAMPLES_UNIT                   : Integer; //Thailand
            SAMPLES_PACK                   : Integer;
            REGISTERED_PRICE               : Double;
            OFFER_PRICE                    : Double;
            FOC                            : String(25);
            TOTAL_QUANTITY_UNITS           : Double;
            FOC_QUANTITY_UNITS             : Double; // FOC Unit (thailand)
            PAID_QUANTITY_UNITS            : Double;
            REQ_PRICE_UNIT_OFFER_CURRENCY  : Double; //MSP excl VAT (thailand)
            REQ_PRICE_UNIT_OFFER_CURRENCY_VAT : Double; //MSP incl VAT (thailand)
            REQ_PRICE_PACK_OFFER_CURRENCY  : Double;
            REQ_PRICE_UNIT_EUR_BUDGET      : Double;
            REQ_PRICE_UNIT_EUR_SPOT        : Double;
            NET_PRICE_UNIT_OFFER_CURRENCY  : Double; //NSP excl VAT (thailand)
            NET_PRICE_UNIT_OFFER_CURRENCY_VAT : Double; //NSP incl VAT (thailand)
            NET_PRICE_PACK_OFFER_CURRENCY  : Double;
            NET_PRICE_UNIT_EUR_BUDGET      : Double;
            NET_PRICE_UNIT_EUR_SPOT        : Double;
            NET_OFFER_PRICE                : Double;
            NET_PRICE                      : Double;
            COGS                           : Double;
            COGS_EUR_UNIT                  : Double;
            COGS_EUR_PACK                  : Double;
            GROSS_SALES_OFFER_CURRENCY     : Double;
            GROSS_SALES_OFFER_CURRENCY_VAT : Double;
            VAT_TOTAL                      : Double;
            NET_SALES_OFFER_CURRENCY       : Double;
            NET_SALES_EUR_BUDGET           : Double;
            NET_SALES_EUR_SPOT             : Double;
            GROSS_MARGIN_EUR_BUDGET        : Double;
            GROSS_MARGIN_EUR_SPOT          : Double;
            GROSS_PROFIT_EUR_BUDGET        : Double;
            GROSS_PROFIT_EUR_SPOT          : Double;
            REGULATORY                     : Integer not null;//MEA only
            LEGAL                          : Integer not null;//MEA only
            CONTROLLING                    : Integer not null;//MEA only
            COUNTRY_BUSINESS               : Integer not null;//MEA and MX
            REGIONAL_BUSINESS              : Integer not null;//MEA only
            SUPPLY_CHAIN                   : Integer not null;//All countries
            IS_LOWEST                      : Integer not null;
            IS_DEFAULT_TERMS               : Integer not null;
            IS_REGISTERED                  : Integer not null;
            IS_ALTERNATIVE_QUOTED          : Integer not null;
            IS_ALTERNATIVE_REQUESTED       : Integer not null;
            NEW_APPROVAL                   : Integer;
            BUDGETED_PROFITABILITY         : Double;
            NSM_SM_FM                      : Integer not null;//TH only
			HBU                            : Integer not null;//TH only
			CDH                            : Integer not null;//TH and AR
			IN_POLICY                      : Boolean;
            MACS                           : Integer not null;//AR only
            TA                             : Integer not null;//AR only
            FBP                            : Integer not null;//AR only
            LPC                            : Integer not null;//AR only
            COM_PGA                        : Integer not null;//AR only
            International_Trade            : Integer not null;//AR only
            Transfer_Pricing               : Integer not null;//AR only
            SBR                            : Integer not null;//AR only
    };

    entity OfferValidation {
            OFFERSTATUSPATH       : String(124) not null;
            TENDERID              : String(50) not null;
            CLASSIFICATION        : String(50) not null;//Added Classification (db#1)
            TENDER_REFERENCE      : String(753);
        key OFFERID               : String(30) not null;
            INSTITUTENAME         : String(500);
            INSTITUTE_TYPE        : String(50);
            CUSTOMER_CODE         : Integer;
            DIVISION              : String(100);
            OFFERDATE             : Date;
            OFFERVALIDITY         : Date not null;
            COUNTRYCODE           : String(2) not null;
            SELLINGCOMPANY        : String(300);
            SELLINGCOMPANYBANK    : String(5000);
            SELLING_COMPANY_AS1   : String(300);
            SELLING_COMPANY_AS2   : String(300);
            CURRENCY              : String(255);
            AMOUNT_IN_NUMBERS     : Double;
            AMOUNT_IN_WORDS       : String(1024);
            AMOUNT_IN_NUMBERS_VAT : Double;
            AMOUNT_IN_WORDS_VAT   : String(1024);
            VAT_TOTAL             : Double;
            LETTERHEAD            : String(5000);
            REGULATORY            : Integer;//MEA only
            LEGAL                 : Integer not null;//MEA only
            CONTROLLING           : Integer not null;//MEA only
            COUNTRY_BUSINESS      : Integer;//MEA and MX
            REGIONAL_BUSINESS     : Integer not null;//MEA only
            SUPPLY_CHAIN          : Integer not null;//All countries
            DISTRIBUTORNAME       : String(500);
            DISTRIBUTORADDRESS    : String(5000);
            DISTRIBUTORPHONE      : String(500);
            DISTRIBUTORFAX        : String(500);
            DISTRIBUTORCONTACT    : String(500);
            REMARKS               : String(5000);
            CUSTOM_REMARKS        : String(500) not null;
            DELIVERYTERMS         : String(5000);
            PAYMENTTERMS          : String(5000);
            SHIPMENTTERMS         : String(5000);
            IS_LOWEST             : Integer not null;
            IS_DEFAULT_TERMS      : Integer not null;
            NEW_APPROVAL          : Integer;
            NSM_SM_FM             : Integer not null;//TH only
			HBU                   : Integer not null;//TH only
			CDH                   : Integer not null;//TH and AR
			IN_POLICY             : Boolean;
            MACS                           : Integer not null;//AR only
            TA                             : Integer not null;//AR only
            FBP                            : Integer not null;//AR only
            LPC                            : Integer not null;//AR only
            COM_PGA                        : Integer not null;//AR only
            International_Trade            : Integer not null;//AR only
            Transfer_Pricing               : Integer not null;//AR only
            SBR                            : Integer not null;//AR only
    };

    entity OfferProductOfferStatus {
            TenderID            : String(50) not null;
        key OfferId             : String(30) not null;
            CountryCode         : String(2) not null;
            ApprovalContent     : String(13);
            ApproverTypeSection : Integer;
            REQUIRED_ACTION     : String(12);
            ApprovalStatus      : String(100) not null;
            ApproverName        : String(100);
            ApproverEmailID     : String(100);
            SenderComment       : String(500);
            ApproverComment     : String(500);
            Active              : Integer not null;
            //Hierarchy           : Integer;
            AP_ID               : String(10);
            RestoreKey          : String(100);
            Statustime          : DateTime;
            Submittedby         : String(100);
            ApproverDate        : Date;
        key ApproverType        : String(200) not null;
            Division            : String(200) not null;
            FLOW_ID             : String(255);
            CountryName         : String(255);
            UserName            : String(255);
            UserEmail           : String(255);
            //Associations
            ApproverList        : Association to many CountryApprovers
                                      on  ApproverList.CountryCode  = CountryCode
                                      and ApproverList.ApproverType = ApproverType
                                      and ApproverList.Division     = Division;
            ApproverTypes       : Association to many ApproverTypes
                                      on  ApproverTypes.CountryCode  = CountryCode
                                      and ApproverTypes.ApproverType = ApproverType;
    };

    //Admin Data Tables
    entity CONDITIONAL_ACCESS                as projection on AdminData.CONDITIONAL_ACCESS;

    entity PT_TMUSER                         as projection on AdminData.PT_TMUSER {
        * , Countries : redirected to PT_TMUSERCTRY
    };

    entity PT_TMUSERCTRY                     as projection on AdminData.PT_TMUSERCTRY {
        * , User : redirected to PT_TMUSER
    };

    //Admin Data Views
    entity UserCountries @readonly           as projection on AdminDataViews.UserCountries;

    entity Users @readonly                   as projection on AdminDataViews.Users {
        * , toUserCountries : redirected to UserCountries
    };

    type User {
        name : String;
        email: String;
    };

    // entity MandatoryProductFields @readonly  as projection on AdminData.MandatoryTableFieldsCountry; 

    entity CountryTablesCustomization @readonly  as projection on AdminData.CountryTablesCustomization; 
    entity CountryTabsCustomization @readonly as projection on AdminData.CountryTabsCustomization;
    entity CountryFragmentsCustomization @readonly as projection on AdminData.CountryFragmentsCustomization;

    function getCurrentUser() returns User;
    //Office365 PowerAutomate Approval Workflow Views
    entity QuotationUpdates @readonly        as projection on TransactionalDataViews.QuotationUpdates;

    //Office365 PowerAutomate Approval Workflow Service
    entity ApprovalOffers {
            OFFERSTATUSPATH    : String(500);
            COUNTRYCODE        : String(2);
            TENDERID           : String(50);
        key OFFERID            : String(50);
            INSTITUTENAME      : String(500);
            CURRENCY           : String(3);
            AMOUNT_IN_NUMBERS  : String(1000);
            AMOUNT_IN_WORDS    : String(1000);
            DISTRIBUTORNAME    : String(500);
            DISTRIBUTORADDRESS : String(5000);
            DISTRIBUTORPHONE   : String(500);
            DISTRIBUTORFAX     : String(500);
            DISTRIBUTORCONTACT : String(500);
            OFFERDATE          : String(11);
            OFFERVALIDITY      : String(11);
            SELLINGCOMPANY     : String(500);
            SELLINGCOMPANYBANK : String(5000);
            REMARKS            : String(5000);
            APPROVER1          : String(5000);
            APPROVER2          : String(5000);
            SHIPMENTTERMS      : String(5000);
            PAYMENTTERMS       : String(5000);
            DELIVERYTERMS      : String(5000);
            CUSTOM_REMARKS     : String(5000);
            LETTERHEAD         : String(5000);
            CANCELLED          : String(3);
    };

    entity ApprovalProducts {
            TENDERID                      : String(50);
        key OFFERID                       : String(50);
            COUNTRYCODE                   : String(2);
        key PRODUCTCODE                   : String(500);
            PRODUCT_UNIT_NAME             : String(500);
            SORTER                        : Integer;
            BRANDNAME                     : String(500);
            PRODUCTNAME                   : String(500);
            PACKSIZE                      : Double;
            DOSAGE                        : Double;
            UOM                           : String(10);
            COUNTRYOFORIGIN               : String(500);
            MANUFACTURER                  : String(500);
            SHELFLIFE                     : Integer;
            PRESENTATION                  : String(500);
            VAT                           : Double;
            CURRENCY                      : String(3);
            NETOFFERPRICE                 : String(1000);
            REQUESTEDVOLUME               : String(5000);
            PAIDVOLUME                    : Double;
            FOC                           : String(500);
            UNIT                          : String(500);
            TOTAL_QUANTITY_UNITS          : String(1000);
            FOC_QUANTITY_UNITS            : String(1000);
            PAID_QUANTITY_UNITS           : String(1000);
            REQ_PRICE_UNIT_OFFER_CURRENCY : String(1000);
            REQ_PRICE_PACK_OFFER_CURRENCY : String(1000);
            REQ_PRICE_UNIT_EUR_BUDGET     : String(1000);
            REQ_PRICE_UNIT_EUR_SPOT       : String(1000);
            NET_PRICE_UNIT_OFFER_CURRENCY : String(1000);
            NET_PRICE_PACK_OFFER_CURRENCY : String(1000);
            NET_PRICE_UNIT_EUR_BUDGET     : String(1000);
            NET_PRICE_UNIT_EUR_SPOT       : String(1000);
            COGS_EUR_UNIT                 : String(1000);
            GROSS_MARGIN_EUR_BUDGET       : String(1000);
            GROSS_MARGIN_EUR_SPOT         : String(1000);
            GROSS_SALES_OFFER_CURRENCY    : String(1000);
            NET_SALES_OFFER_CURRENCY      : String(1000);
            NET_SALES_EUR_BUDGET          : String(1000);
            NET_SALES_EUR_SPOT            : String(1000);
            GROSS_PROFIT_EUR_BUDGET       : String(1000);
            GROSS_PROFIT_EUR_SPOT         : String(1000);
            DIVISION                      : String(100);
            BUDGETEDPROFITABILITY         : String(1000);
            PROFITABILITYBUDGET           : String(1000);
            PROFITABILITYSPOT             : String(1000);
    };

    entity ApprovalApprovers {
            STATUSPATH         : String(5000);
            TENDERID           : String(50);
        key OFFERID            : String(50);
            COUNTRYCODE        : String(2);
            SUBMITTED_BY       : String(500);
            SUBMITTED_BY_NAME  : String(500);
            SUBMITTED_BY_EMAIL : String(500);
            APPROVAL_TYPE      : String(500);
            ApprovalContent    : String(500);
            ApproverName       : String(500);
        key ApproverEmailID    : String(500);
            SenderComment      : String(500);
        key ApproverType       : String(500);
            REQUIRED_ACTION    : String(12);
            APPROVAL_STATUS    : String(100);
            FLOW_ID            : String(500);
            DIVISION           : String(500);
            COUNTRYNAME        : String(50);
            HIERARCHY          : Integer;           
    };

    entity Templates        as projection on AdminData.Template;
    entity MailTemplates    as projection on AdminData.MailTemplate;
    entity Outbox           as projection on TransactionalData.OutgoingMails;
    entity Attachment {
        key OfferId : String(50);
        content   : LargeBinary @Core.MediaType : 'application/pdf';
    }


    //action sendMail (sRecipient:String, sBody:String) returns Boolean;
    action sendMail (sRecipient:String, sSubject:String, sTemplate:String) returns Boolean;
    function getMailTemplate (countryCode:String, language:String, offerId:String) returns LargeString;
}
