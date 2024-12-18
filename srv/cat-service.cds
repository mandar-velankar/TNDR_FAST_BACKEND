using {
    com.bayer.SXTENDER.MasterData,
    sap.common
} from '../db/MasterData';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';
using {com.bayer.SXTENDER.MasterDataLatestValues} from '../db/MasterDataLatestValues';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using {com.bayer.SXTENDER.IntegrationDataConversion} from '../db/IntegrationDataConversion';
using {com.bayer.SXTENDER.AdminData} from '../db/AdminData';
using {com.bayer.SXTENDER.AdminDataViews} from '../db/AdminDataViews';
using {com.bayer.SXTENDER.BankGuaranteeData} from '../db/BankGuaranteeData';
using {com.bayer.SXTENDER.PriceAgreementData} from '../db/PriceAgreementData';
using {com.bayer.SXTENDER.BrazilContractingData} from '../db/BrazilContractingData';
using {
    User,
    Country,
    managed,
    cuid
} from '@sap/cds/common';


service CatalogService @(path : 'tender')@(requires : [
    'authenticated-user',
    'f_tndr_cag_admin',
    'f_tndr_cag_tnd_user',
    'f_tndr_cag_technical_user'
]) {
    //Master Data Tables
    entity CountryLegalEntitySignatories                as projection on MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES;
    entity MASTER_APPROVED_PRICE                        as projection on MasterData.MASTER_APPROVED_PRICE;
    entity CommercialAgreement                          as projection on MasterData.MASTER_COMMERCIAL_AGREEMENT;
    entity ContractType                                 as projection on MasterData.MASTER_CONTRACT_TYPE;
    entity CountryContractType                          as projection on MasterData.MASTER_COUNTRY_CONTRACT_TYPE;
    entity CountrySalesType                             as projection on MasterData.MASTER_COUNTRY_SALES_TYPE;
    entity CountryTenderOrigin                          as projection on MasterData.MASTER_COUNTRY_TENDER_ORIGIN;
    entity CountryTenderType                            as projection on MasterData.MASTER_COUNTRY_TENDER_TYPE;
    entity CountryTenderType2                           as projection on MasterData.MASTER_COUNTRY_TENDER_TYPE2;
    entity MASTER_INSTITUTE_HIERARCHY                   as projection on MasterData.MASTER_INSTITUTE_HIERARCHY;
    entity SalesType                                    as projection on MasterData.MASTER_SALES_TYPE;
    entity TenderOrigin                                 as projection on MasterData.MASTER_TENDER_ORIGIN;
    entity TenderType                                   as projection on MasterData.MASTER_TENDER_TYPE;
    entity MASTER_COUNTRY_STATUS                        as projection on MasterData.MASTER_COUNTRY_STATUS;
    entity MASTER_COUNTRY_OUTCOMES                      as projection on MasterData.MASTER_COUNTRY_OUTCOMES;
    entity CountryApprovers                             as projection on MasterData.CountryApprovers;
    entity AccountPreApprovedPrices                     as projection on MasterData.AccountPreApprovedPrices;
    entity ApproverTypes                                as projection on MasterData.ApproverTypes;
    entity PT_TMCOGS                                    as projection on MasterData.PT_TMCOGS;
    entity PT_TMCTLE                                    as projection on MasterData.PT_TMCTLE;
    entity PT_TMCTLEBR                                  as projection on MasterData.PT_TMCTLEBR;
    entity PT_TMCTPRDPCK                                as projection on MasterData.PT_TMCTPRDPCK;
    entity CountryClassifications                       as projection on MasterData.MASTER_COUNTRY_CLASSIFICATION;
    entity CountryChannels                              as projection on MasterData.MASTER_COUNTRY_CHANNELS;
    entity CountryProcurementMethod                     as projection on MasterData.MASTER_COUNTRY_PROCUREMENT_METHOD;
    entity CountryBiddingTypeLevel1                     as projection on MasterData.MasterCountryBiddingTypeLevel1;
    entity CountryBiddingTypeLevel2                     as projection on MasterData.MasterCountryBiddingTypeLevel2;
    entity CountryBiddingTypeLevel3                     as projection on MasterData.MasterCountryBiddingTypeLevel3;
    entity CountrySpecifications                        as projection on MasterData.MasterCountrySpecifications;
    entity MasterCompetitors                            as projection on MasterData.MasterCompetitors;
    entity BrandPolicies                                as projection on MasterData.BrandPolicies;
    entity DistributorBrandPolicies                     as projection on MasterData.DistributorBrandPolicies;
    entity CountryRegions                               as projection on MasterData.CountryRegions;
    entity TenderRegions                                as projection on MasterData.TenderRegions;
    //italy
    entity ConsumerPrices                               as projection on MasterData.ConsumerPrices;
    entity MostRecentConsumerPricesView                 as projection on MasterDataViews.MostRecentConsumerPricesView;
    entity ProductPricing                               as projection on TransactionalData.ProductPricing;
    entity PriceCondition                               as projection on TransactionalData.PriceCondition;
    entity PriceConditionClassification                 as projection on TransactionalData.PriceConditionClassification;
    entity DiscountCondition                            as projection on TransactionalData.DiscountCondition;
    entity FreeGoodsOther                               as projection on TransactionalData.FreeGoodsOther;
    entity ProductTypeProfitability                     as projection on TransactionalData.ProductTypeProfitability;
    entity ProductPricingView                           as projection on TransactionalDataViews.ProductPricingView;
    entity PriceConditionView                           as projection on TransactionalDataViews.PriceConditionView;
    //spain
    entity MasterPrices                                 as projection on MasterData.MasterPrices;
    entity MostRecentMasterPricesView                   as projection on MasterDataViews.MostRecentMasterPricesView;
    entity Settlements                                  as projection on MasterData.Settlements;
    entity RoyalDecreePercentage                        as projection on MasterData.RoyalDecree;
    //Brazil
    entity Lots                                         as projection on TransactionalData.Lots;
    entity LotProducts                                  as projection on TransactionalData.LotProduct;
    entity BrazilCap                                    as projection on MasterData.BrazilCap;
    entity BrazilMasterPrices                           as projection on MasterData.BrazilMasterPrices;
    entity DistributorDivision                          as projection on MasterData.DistributorDivision;
    entity InstituteDivision                            as projection on MasterData.InstituteDivision;
    entity PriceConditionBrazilView                     as projection on TransactionalDataViews.PriceConditionBrazilView;
    entity DocumentsDownload                            as projection on TransactionalData.DocumentsDownload;
    entity ContractStatuses                             as projection on AdminData.ContractStatus;
    entity Contracts                                    as projection on BrazilContractingData.Contracts;
    entity ContractProducts                             as projection on BrazilContractingData.ContractProducts;
    entity OfferValidation                              as projection on TransactionalDataViews.OfferValidation;
    entity OfferProductValidation                       as projection on TransactionalDataViews.OfferProductValidation;

    //general transactionalData
    entity OfferProductOfferStatus                      as projection on TransactionalData.OfferProductOfferStatus;


    entity PT_TMCTRY @(restrict : [{
        grant : '*',
        to    : 'authenticated-user',
        where : 'User.CWID = $user.id'
    }])                                                 as projection on MasterData.PT_TMCTRY {
        * , LegalEntities : redirected to PT_TMCTLE, CountryPacks : redirected to PT_TMCTPRDPCK, User : redirected to PT_TMUSERCTRY
    };

    entity PT_TMDISBRD                                  as projection on MasterData.PT_TMDISBRD;
    entity PT_TMDIST                                    as projection on MasterData.PT_TMDIST;
    entity PT_TMFXRTS                                   as projection on MasterData.PT_TMFXRTS;
    entity PT_TMINDSBR                                  as projection on MasterData.PT_TMINDSBR;
    entity PT_TMINSBRTR                                 as projection on MasterData.PT_TMINSBRTR;
    entity PT_TMINSHIER                                 as projection on MasterData.PT_TMINSHIER;
    entity PT_TMINST                                    as projection on MasterData.PT_TMINST;
    entity Province                                     as projection on MasterData.CountryProvinces;

    entity PT_TMLE                                      as projection on MasterData.PT_TMLE {
        * , Countries : redirected to PT_TMCTLE
    };

    entity PT_TMOUTRS                                   as projection on MasterData.PT_TMOUTRS;
    entity PT_TMPNLTYRS                                 as projection on MasterData.PT_TMPNLTYRS;
    entity PT_TMPRDHIER                                 as projection on MasterData.PT_TMPRDHIER;

    entity PT_TMPRDPCK                                  as projection on MasterData.PT_TMPRDPCK {
        * , CountryPacks : redirected to PT_TMCTPRDPCK
    };

    entity PT_TMRCM                                     as projection on MasterData.PT_TMRCM;
    entity PT_TMREGIONSTRUC                             as projection on MasterData.PT_TMREGIONSTRUC;
    entity PT_TMREGPR                                   as projection on MasterData.PT_TMREGPR;
    entity PT_TMSKUPRDPCK                               as projection on MasterData.PT_TMSKUPRDPCK;
    entity PT_TMTABRMP                                  as projection on MasterData.PT_TMTABRMP;
    entity BUDGETEDPROFITABILITY                        as projection on MasterData.BUDGETEDPROFITABILITY;
    //Master Data Latest Values
    entity CountryRegisteredPrice @readonly             as projection on MasterDataLatestValues.CountryRegisteredPrice;
    entity CountryCogs @readonly                        as projection on MasterDataLatestValues.CountryCogs;
    entity ExchangeRates @readonly                      as projection on MasterDataLatestValues.ExchangeRates;
    entity VWBUDGETEDPROFITABILITY @readonly            as projection on MasterDataLatestValues.VWBUDGETEDPROFITABILITY;
    entity MostRecentBrandPolicies @readonly            as projection on MasterDataLatestValues.MostRecentBrandPolicies;
    entity MostRecentDistributorBrandPolicies @readonly as projection on MasterDataLatestValues.MostRecentDistributorBrandPolicies;
    //Master Data Views
    entity CountryBrandProducts @readonly               as projection on MasterDataViews.CountryBrandProducts;
    entity CountryBrands @readonly                      as projection on MasterDataViews.CountryBrands;
    entity CountryCurrency @readonly                    as projection on MasterDataViews.CountryCurrency;
    entity CountryLegalEntity @readonly                 as projection on MasterDataViews.CountryLegalEntity;
    entity AggregatedDistributorBrandPolicies @readonly as projection on MasterDataViews.AggregatedDistributorBrandPolicies;
    entity ChannelProductPolicies @readonly             as projection on MasterDataLatestValues.ActiveChannelProductPolicies;

    //Master Data Services
    entity InstituteDistributor {
        key COUNTRY_INSTITUTE_DISTRIBUTOR_ID : String(500);
            COUNTRY_CODE                     : String not null;
            INSTITUTE_ID                     : Integer not null;
            INSTITUTE_NAME                   : String(500);
            DISTRIBUTOR_ID                   : Integer not null;
            DISTRIBUTOR_NAME                 : String(500);
            LEGAL_ENTITY_CODE                : String(3) not null;
            CHANNEL                          : String(11) not null;
    };

    entity InstituteDistributorBrandProduct as projection on MasterDataViews.InstituteDistributorBrandProduct;

    //Transactional Data Tables
    entity PT_OFGRPUR                                   as projection on TransactionalData.PT_OFGRPUR;
    entity PT_SCENARIOPLAN                              as projection on TransactionalData.PT_SCENARIOPLAN;
    entity PT_TENDGRPPUR                                as projection on TransactionalData.PT_TENDGRPPUR;

    entity PT_TMAPPRST                                  as projection on TransactionalData.PT_TMAPPRST {
        * , OfferProduct : redirected to PT_TMOFPR
    };

    entity PT_TMAWRDCR                                  as projection on TransactionalData.PT_TMAWRDCR {
        * , Tender : redirected to PT_TMTEND
    };

    entity Specifications                               as projection on TransactionalData.Specifications {
        * , Tender : redirected to PT_TMTEND
    };


    entity PT_TMBDPR                                    as projection on TransactionalData.PT_TMBDPR {
        * , Product : redirected to PT_TMOFPR
    };

    entity PT_TMDLVTR                                   as projection on TransactionalData.PT_TMDLVTR;

    entity PT_TMOFPR                                    as projection on TransactionalData.PT_TMOFPR {
        * , SKUCountry : redirected to PT_TMCTPRDPCK, Offer : redirected to PT_TMOFRS
    };

    entity PT_TMOFRS  @(cds.redirection.target:true)    as projection on TransactionalData.PT_TMOFRS {
        * , Product : redirected to PT_TMOFPR, Tender : redirected to PT_TMTEND
    };

    entity OfferView                                    as projection on TransactionalData.OfferView {
        * , Product : redirected to PT_TMOFPR, Tender : redirected to PT_TMTEND
    };

    entity CountrySpecificInformation                   as projection on TransactionalData.CountrySpecificTenderInfo {
        *
    };

    entity OfferStatus                                  as projection on TransactionalDataViews.OfferStatus;
    entity PT_TMPFIOM                                   as projection on TransactionalData.PT_TMPFIOM;

    entity PT_TMQUTO                                    as projection on TransactionalData.PT_TMQUTO {
        * , Offer : redirected to PT_TMOFRS
    };

    entity PT_TMTEND  @(cds.redirection.target:true)    as projection on TransactionalData.PT_TMTEND {
        * , Offer : redirected to PT_TMOFRS, OfferView : redirected to OfferView, CountrySpecificInformation : redirected to CountrySpecificInformation, User : redirected to PT_TMUSER,
    };

    entity PT_TMTNOFST                                  as projection on TransactionalData.PT_TMTNOFST;
    entity PT_TMTRRES                                   as projection on TransactionalData.PT_TMTRRES;
    entity PT_TMUDLTRS                                  as projection on TransactionalData.PT_TMUDLTRS;
    entity TransCompetitorResult                        as projection on TransactionalData.TransCompetitorResult;
    entity SpainRappelData                              as projection on TransactionalData.SpainRappelData;
    //Transactional Data Views
    entity TenderOffers @readonly                       as projection on TransactionalDataViews.TenderOffers;
    entity OfferRevisions @readonly                     as projection on TransactionalDataViews.OfferRevisions;
    entity CountryTenderBrands @readonly                as projection on TransactionalDataViews.CountryTenderBrands;
    entity CountryTenderNo @readonly                    as projection on TransactionalDataViews.CountryTenderNo;
    entity TenderResults @readonly                      as projection on TransactionalDataViews.TenderResults;
    entity LatestApprovalRequests @readonly             as projection on TransactionalDataViews.LatestApprovalRequests;
    entity PreviousApproval @readonly                   as projection on TransactionalDataViews.PreviousApproval;
    entity TenderHistory @readonly                      as projection on TransactionalDataViews.TenderHistory;
    entity OfferValues @readonly                        as projection on TransactionalDataViews.OfferValues;
    entity TenderOfferMaster @readonly                  as projection on TransactionalDataViews.TenderOfferMaster;
    entity BrandsInTender @readonly                     as projection on TransactionalDataViews.BrandsInTender;
    entity CountryMinPrice @readonly                    as projection on TransactionalDataViews.CountryMinPrice;
    entity PreApprovedPrices @readonly                  as projection on TransactionalDataViews.PreApprovedPrices;
    entity TenderHistorySpain @readonly                 as projection on TransactionalDataViews.TenderHistorySpain;
    entity TenderHistoryBrazil @readonly                as projection on TransactionalDataViews.TenderHistoryBrazil;

    //Admin Data Tables
    entity CONDITIONAL_ACCESS                           as projection on AdminData.CONDITIONAL_ACCESS;

    entity PT_TMUSER @(cds.redirection.target:true)     as projection on AdminData.PT_TMUSER {
        * , Countries : redirected to PT_TMUSERCTRY
    };

    entity PT_TMUSERCTRY                                as projection on AdminData.PT_TMUSERCTRY {
        * , User : redirected to PT_TMUSER
    };

    //Admin Data Views
    entity UserCountries @readonly                      as projection on AdminDataViews.UserCountries;

    entity Users @readonly                              as projection on AdminDataViews.Users {
        * , toUserCountries : redirected to UserCountries
    };

    type User {
        name  : String;
        email : String;
    };

    // entity MandatoryProductFields @readonly  as projection on AdminData.MandatoryTableFieldsCountry;

    entity CountryTablesCustomization @readonly         as projection on AdminData.CountryTablesCustomization;
    entity CountryTabsCustomization @readonly           as projection on AdminData.CountryTabsCustomization;
    entity CountryFragmentsCustomization @readonly      as projection on AdminData.CountryFragmentsCustomization;
    entity AppConfig @readonly                          as projection on AdminData.AppConfig;
    function getCurrentUser() returns User;
    //Office365 PowerAutomate Approval Workflow Views
    entity QuotationUpdates @readonly                   as projection on TransactionalDataViews.QuotationUpdates;

    //Office365 PowerAutomate Approval Workflow Service
    entity ApprovalOffers {
            OFFERSTATUSPATH       : String(500);
            COUNTRYCODE           : String;
            TENDERID              : String(50);
        key OFFERID               : String(50);
            INSTITUTENAME         : String(500);
            TAXCODE               : String(50);
            VATCODE               : String(50);
            CURRENCY              : String(3);
            AMOUNT_IN_NUMBERS     : String(1000);
            AMOUNT_IN_WORDS       : String(1000);
            AMOUNT_IN_NUMBERS_VAT : Double;
            AMOUNT_IN_WORDS_VAT   : String(1024);
            DISTRIBUTORNAME       : String(500);
            DISTRIBUTORADDRESS    : String(5000);
            DISTRIBUTORPHONE      : String(500);
            DISTRIBUTORFAX        : String(500);
            DISTRIBUTORCONTACT    : String(500);
            OFFERDATE             : String(11);
            OFFERVALIDITY         : String(11);
            SELLINGCOMPANY        : String(500);
            SELLINGCOMPANYBANK    : String(5000);
            REMARKS               : String(5000);
            APPROVER1             : String(5000);
            APPROVER2             : String(5000);
            E_SIGNATURE1          : Boolean;
            E_SIGNATURE2          : Boolean;
            SHIPMENTTERMS         : String(5000);
            PAYMENTTERMS          : String(5000);
            DELIVERYTERMS         : String(5000);
            CUSTOM_REMARKS        : String(5000);
            LETTERHEAD            : String(5000);
            CANCELLED             : String(3);
            BUDGET_RATE           : Double;
            SPOT_RATE             : Double;
            EFFECTIVEDATE         : Date;
            EXPIRYDATE            : Date;
                };

    entity ApprovalProducts {
            TENDERID                      : String(50);
        key OFFERID                       : String(50);
            COUNTRYCODE                   : String;
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
            BUDGET_RATE                   : Double;
            SPOT_RATE                     : Double;
            BUSINESS_CASE_PRICE           : String(1000);
            IS_LOWEST                     : Integer;
            REQ_PRICE_UNIT_OFFER_CURRENCY_VAT : Double; 
            NET_PRICE_UNIT_OFFER_CURRENCY_VAT : Double; 
            GROSS_SALES_OFFER_CURRENCY_VAT    : Double;

            WARRANTY                          : Double;
            AGREEMENTDURATION                 : Integer;
            MONTHLYRENT                       : Double;
            MONTHSPERINVOICE                  : Integer;  
            CONTRACTSTARTDATE                 : Timestamp;
            VALUEOFDEVICES                    : Double;
            STATUSOFDEVICE                    : String;
            MINCONTRACTUAL                    : Double;
            MINANNPURCH                       : Double;
            FOC_STEP                          : Double;
            MOLECULE_NAME                     : String(255);
            //missing SKU & SKUCountry fields
            ACTIVERECORD                      : String(10);
            HLEVEL6_CODE                      : String(50);
            PCI_NAME                          : String(255);
            ACTIVE_SUBSTANCE                  : String(50);
            PRODUCT_TYPE                      : String(50);
            SKUCOUNTRY_ACTIVERECORD           : String(10);
            PRESENTATION_2                    : String(1000);
            GOV_CODE                          : String(255);
            CODE1                             : String(255);
            CODE2                             : String(255);
            CODE3                             : String(255);
            QTY_THRESHOLD                     : Integer;
            //end of missing SKU & SKUCountry fields  
            FreeGoodsOther                    : Association to many FreeGoodsOther
                                                   on FreeGoodsOther.ProductPackId = $self.PRODUCTCODE;
    };

    entity ApprovalApprovers {
            STATUSPATH         : String(5000);
            TENDERID           : String(50);
        key OFFERID            : String(50);
            COUNTRYCODE        : String;
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

    //SALES OPPORTUNINTY
    entity Buyers                                       as projection on IntegrationDataConversion.PublicMarketBuyers;
    entity Products                                     as projection on IntegrationDataConversion.PublicMarketProducts;

    entity PublicMarketTenders                          as projection on IntegrationDataConversion.PublicMarketTenders {
        * , Comprador : redirected to Buyers, Items : redirected to Products
    };

    //BANK GUARANTEE
    entity BankGuarantees                               as projection on BankGuaranteeData.BankGuarantees {
        * , Tender : redirected to PT_TMTEND
    };

    //PRICE AGREEMENT
    entity PriceAgreements                              as projection on PriceAgreementData.PriceAgreements {
        * , 
        Tender : redirected to PT_TMTEND,
        OfferProduct : redirected to PT_TMOFPR
    };

    entity Candidates                                   as projection on PriceAgreementData.CandidatesView;

    //OTHER
    entity Templates                                    as projection on AdminData.Template;
    entity MailTemplates                                as projection on AdminData.MailTemplate;
    entity MailTemplateFiles                            as projection on AdminData.MailTemplateFile;
    entity Outbox                                       as projection on TransactionalData.OutgoingMails;

    entity Attachment {
        key OfferId : String(50);
            content : LargeBinary @Core.MediaType : 'application/pdf';
    }
    entity ExcelAttachment// as projection on AdminData.ExcelAttachment;
    {
        key OfferId : String(50);
        content   : LargeBinary @Core.MediaType: mediaType;//'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        mediaType:String @Core.IsMediaType;
    }

    //entity ExcelAttachmentView                          as projection on AdminData.ExcelAttachment;
    // {
    //     key OfferId : String(50);
    //     content   : LargeBinary @Core.MediaType: mediaType;//'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    //     mediaType:String @Core.IsMediaType;
    // }


    entity WordTemplateCountry                          as projection on AdminData.WordTemplateCountry;
    entity WordTemplate                                 as projection on AdminData.WordTemplate;

    entity WordAttachments {
        key offerId    : String(50);
        key templateId : Integer;
            content    : LargeBinary @Core.MediaType : mediaType; //'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            mediaType  : String      @Core.IsMediaType;
    }

    entity DeliveryExcel {
        key OfferId   : String(50);
            content   : LargeBinary @Core.MediaType : mediaType; //'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            mediaType : String      @Core.IsMediaType;
    }

    //action sendMail (sRecipient:String, sBody:String) returns Boolean;
    action sendMail(sRecipient : String, sSubject : String, sTemplate : String) returns Boolean;
    function getMailTemplate(countryCode : String, language : String, offerId : String) returns LargeString;

    action notifyIbiz(ibizWorkflowID: Integer, directIndirect: Integer, lineNumbers: array of Integer) returns String; //  (0 = direct; 1 = indirect)
    action sendApprovalToIbiz(ibizWorkflowID: Integer, offerStatus: Integer, comment: String) returns String;
    action simulateTaxes(offerID: String, productCode: Integer, lotID: Integer, conditionType: String, commercialProposal: String) returns String;
    function getTHNotificationMailTemplate(offerID:String,tenderId: String, CountryCode: String, templateId:String) returns String;

    entity THQuotationDelevery  as projection on TransactionalData.THQuotationDelevery
}
