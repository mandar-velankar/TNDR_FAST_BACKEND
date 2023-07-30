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
using {com.bayer.SXTENDER.ExternalDataViews} from '../db/ExternalDataViews';
using {
    User,
    Country,
    managed,
    cuid
} from '@sap/cds/common';


service StandardAppService @(path : 'sta_tender')@(requires : [
    'authenticated-user',
    'f_tndr_cag_admin',
    'f_tndr_cag_technical_user',
    'f_tndr_cag_standardtender_user'
]) {
    

    @cds.redirection.target
    entity TenderFormView as projection on TransactionalData.PT_TMTEND {
        *,
        Institute.InstituteType,
        Institute.InstituteName,
        Institute.DirectTender,
    }; 

    entity PT_TMAWRDCR as projection on TransactionalData.PT_TMAWRDCR
  
    entity AwardCriteriaTableView as select from TransactionalData.PT_TMTEND as tend
    left outer join TransactionalData.PT_TMAWRDCR as cr on tend.TenderID = cr.TENDERID
    left outer join MasterData.AwardCriteriaValueHelp as ac ON cr.AwardCriteria is null and ac.Criteria is not null and ac.CountryCode = tend.CountryCode
    {
        key tend.CountryCode,
        key tend.TenderID,
	    // COALESCE( cr.AwardCriteria, ac.Criteria ) AS Criteria:String,
        key case when cr.AwardCriteria is not null
            then cr.AwardCriteria
            else ifnull(ac.Criteria, 'NotDefined')
        end as Criteria:String,
        case when cr.Weight is not null
            then cr.Weight
            else 0
        end as Weight:Double
    };

    entity TenderMasterView as select from TransactionalData.PT_TMTEND as tender{
        tender.CountryCode,
        key tender.TenderID,
        tender.Classification,
        tender.TenderName,
        tender.createdBy,
        tender.Offer.Distributor.DistributorName,
        tender.Institute.InstituteName,
        key tender.Offer.OfferID,
        tender.Offer.OfferValue.VALUE,
        tender.Offer.OfferStatus.STATUS,         
        tender.PublicationDate,
        tender.Offer.InternalBidDueDate,
        tender.BidDueDate,
        max(tender.Brands.BRANDID) as BrandID:String,
        tender.createdAt,
        tender.modifiedBy,
        tender.modifiedAt, 
    }where tender.Active = 1 and ifnull(tender.Offer.Active, 1) = 1
    group By tender.CountryCode,
        tender.TenderID,
        tender.Classification,
        tender.TenderName,
        tender.createdBy,
        tender.Offer.Distributor.DistributorName,
        tender.Institute.InstituteName,
        tender.Offer.OfferID,
        tender.Offer.OfferValue.VALUE,
        tender.Offer.OfferStatus.STATUS,         
        tender.PublicationDate,
        tender.Offer.InternalBidDueDate,
        tender.BidDueDate,
        tender.createdAt,
        tender.modifiedBy,
        tender.modifiedAt;

    @cds.redirection.target
    entity InstitutesView as projection on MasterData.PT_TMINST;
    entity ClassifiactionsView as projection on MasterData.MASTER_COUNTRY_CLASSIFICATION as classification {
        *,
        classification.COUNTRY_CODE as CountryCode: String(2)
    };
    entity CountryInstituteTypeView as projection on MasterData.MASTER_COUNTRY_CHANNELS as instType {
        *,
        instType.ChannelCountry as CountryCode: String(2)
    };
    entity CountryTenderNo as projection on TransactionalDataViews.CountryTenderNo;

    entity TenderOffers as projection on TransactionalDataViews.TenderOffers;

    entity PT_TMTNOFST as projection on TransactionalData.PT_TMTNOFST;

    @cds.redirection.target
    entity OfferFormView as select from TransactionalData.PT_TMOFRS{
        *,
        Tender.BidDueDate as OfferDueDate,
        Tender.InstituteID as InstituteID,
        Tender.TenderChannel as Channel,
        OfferStatus.STATUS as OfferStatus
    };
    //inner join TransactionalData.PT_TMTEND as tender on tender.TenderID = offer.TenderID ;
    /*{
        key offer.OfferID,
        key offer.TenderID,
        offer.InternalBidDueDate,
        offer.WholesaleOffer,
        offer.Division,
        tender.BidDueDate,
        offer.Distributor.DistributorName,
        offer.Distributor.DistributorID,
        offer.SellingCompanyDetails.LegalEntityName,
        offer.SellingCompanyDetails.LegalEntityID
    };*/ // Form used in the Offer tab

    entity OfferProductsTableView as select from TransactionalData.PT_TMOFPR{
        *,
        key ProductCode,
        key OfferID,
        key TenderID,
        Active,
        SKU.PRODUCTPACKNAME as ProductPackName,
        UnitPerPack as UoM,
        Price.NetPrice as NetPrice,
        RequestedVolume,
        (RequestedVolume * Price.NetPrice) as TotalAmount:Double,
        Offer.Currency as Currency
    }; // Form used in the Offer tab - offer products

    entity OfferProductsDetailView as select from TransactionalData.PT_TMOFPR{
        *,
        SKU.MoleculeName as MoleculeName,
        SKUCountry.CODE1 as Code1,
        SKUCountry.CODE2 as Code2,
        SKUCountry.CODE3 as Code3,
        SKU.ProductGenericName as ProductGenericName,
        SKUCountry.GOV_CODE as Gov_Code,
        BudgetedProfitability.PROFITABILITY as VwBudgetedProfitability
    };

    entity OfferProductsTotalForOffer as select from TransactionalData.PT_TMOFRS as offer
        inner join OfferProductsTableView as product on product.OfferID = offer.OfferID {
        key offer.OfferID,
        sum(product.TotalAmount) as OfferTotal:Double,
        offer.Currency as Currency:String(3)
    } group by offer.OfferID,
               offer.Currency;

    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    entity UserCountries @readonly @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
        Country: redirected to Country,
        User: redirected to Users,
    };

    entity UsersPerCountry @readonly @(cds.redirection.target:false) as projection on AdminData.PT_TMUSERCTRY {
        *,
        User.UserName as UserName,
        Country: redirected to Country,
        User: redirected to Users,
    };
    entity CountryTenderBrands @readonly as projection on TransactionalDataViews.CountryTenderBrands;
    entity CountryStatusses @readonly as projection on MasterData.MASTER_COUNTRY_STATUS;
    entity Divisions @readonly @(cds.redirection.target:false)    as projection on MasterDataViews.Divisions;
    entity MasterDistributors @readonly @(cds.redirection.target:false) as projection on ExternalDataViews.MasterDistributors;
    entity CountryLegalEntity @readonly @(cds.redirection.target:false) as projection on MasterDataViews.CountryLegalEntity;
    @cds.redirection.target
    entity PT_TMAPPRST as projection on TransactionalData.PT_TMAPPRST{
        *,
        OfferProduct: redirected to TransactionalData.PT_TMOFPR on OfferProduct.OfferID     = OfferId
                                  and OfferProduct.ProductCode = productcode
                                  and OfferProduct.Active = Active
                                  and OfferProduct.LotID = LotID
    };

    entity StandardTenderPriceConditionView as select from TransactionalDataViews.StandardTenderPriceConditionView;
    entity PriceConditionPriceView as projection on TransactionalDataViews.StandardTenderPriceConditionView;
    entity PriceConditionDiscountView as projection on TransactionalDataViews.StandardTenderPriceConditionView;
    entity PriceConditionPriceWithFOCView as projection on TransactionalDataViews.StandardTenderPriceConditionView {
            CountryCode,
            TenderID,
            OfferID,
            ProductCode,
            RequestedVolume,
            hasPriceCondition,
            PriceConditionID,
            ClassificationID,
            Classification,
            ConditionType,
            Division,
            isMain,
            CurrentBasePrice,
            BasePrice,
            OfferPrice,
            Discount,
            Tax,
            Currency,
            Price3 as NetPrice,
            Level3Discount1 as Deductions,
            NetPrice as NetOfferPrice
    }where ConditionType = 'PriceWithFOC';
    entity PriceConditionClassification as select from TransactionalData.PriceConditionClassification;
    entity FreeGoodsOther as select from TransactionalData.FreeGoodsOther {
        *,
       ProductPack.PRODUCTPACKNAME as ProductPackName: String
    };

    entity InstituteDistributorBrandProduct as projection on MasterDataViews.InstituteDistributorBrandProduct;

    entity TenderChannel as projection on MasterData.TenderChannel;

    entity OfferValidation as projection on TransactionalDataViews.OfferValidation;
    entity OfferProductValidation as projection on TransactionalDataViews.OfferProductValidation;
    entity CountryLegalEntitySignatories as projection on MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory {
        *,
        signatory.COUNTRY_CODE as CountryCode
    };

    entity ApproverList as projection on MasterData.CountryApprovers;
    entity ApproverTypes as projection on MasterData.ApproverTypes;

    entity OfferProductOfferStatus as projection on TransactionalData.OfferProductOfferStatus{
        *,
        ApproverList: redirected to ApproverList,
        ApproverTypes: redirected to ApproverTypes
    };

    @cds.redirection.target
    entity ProductPricesCheckView as select from TransactionalData.PT_TMOFPR as product{
        key product.OfferID,
        product.Active,
        case 
                    when count(product.PriceCondition.ProductCode) = count(product.ProductCode)
                        theN true
            			else false 
        end as allProductPricesSet:Boolean
    }where product.Offer.OfferStatus.STATUS = 'Offer Created' and product.ActiveProduct = 1
    group by product.OfferID, product.Active, product.Offer.OfferStatus.STATUS, product.ActiveProduct;

    entity AwardedProducts as projection on TransactionalData.PT_TMTRRES;
    entity AwardedProductFormView as select from TransactionalData.PT_TMTRRES as result
        inner join TransactionalData.PT_TMOFPR as product on result.OfferID = product.OfferID
                                                          and result.ProductCode = product.ProductCode
                                                          and result.LotID = product.LotID
    {
        result.TenderID,
        key result.OfferID,
        key result.ProductCode,
        result.CountryCode,
        result.InstituteID,
        result.ContractNo,
        result.Outcome,
        result.ErrorInSubmission,
        result.AwardedCompany,
        result.AwardedProduct,
        result.AwardedPrice,
        result.Currency,
        result.AwardedQty,
        result.UoM,
        result.Reason,
        result.Comment,
        product.Active,
        key result.LotID,
        product.RequestedVolume as RequestedVolume: Integer,
        result.Custom.String_1 as Custom_String_1,
        result.Custom.String_2 as Custom_String_2,
        result.Custom.String_3 as Custom_String_3,
        result.Custom.String_4 as Custom_String_4,
        result.Custom.String_5 as Custom_String_5,
        result.Custom.String_6 as Custom_String_6,
        result.Custom.String_7 as Custom_String_7,
        result.Custom.String_8 as Custom_String_8,
        result.Custom.String_9 as Custom_String_9,
        result.Custom.String_10 as Custom_String_10,
        result.Custom.Integer_1 as Custom_Integer_1,
        result.Custom.Integer_2 as Custom_Integer_2,
        result.Custom.Integer_3 as Custom_Integer_3,
        result.Custom.Integer_4 as Custom_Integer_4,
        result.Custom.Integer_5 as Custom_Integer_5,
        result.Custom.Integer_6 as Custom_Integer_6,
        result.Custom.Integer_7 as Custom_Integer_7,
        result.Custom.Integer_8 as Custom_Integer_8,
        result.Custom.Integer_9 as Custom_Integer_9,
        result.Custom.Integer_10 as Custom_Integer_10,
        result.Custom.Double_1 as Custom_Double_1,
        result.Custom.Double_2 as Custom_Double_2,
        result.Custom.Double_3 as Custom_Double_3,
        result.Custom.Double_4 as Custom_Double_4,
        result.Custom.Double_5 as Custom_Double_5,
        result.Custom.Double_6 as Custom_Double_6,
        result.Custom.Double_7 as Custom_Double_7,
        result.Custom.Double_8 as Custom_Double_8,
        result.Custom.Double_9 as Custom_Double_9,
        result.Custom.Double_10 as Custom_Double_10,
        result.Custom.Date_1 as Custom_Date_1,
        result.Custom.Date_2 as Custom_Date_2,
        result.Custom.Date_3 as Custom_Date_3,
        result.Custom.Date_4 as Custom_Date_4,
        result.Custom.Date_5 as Custom_Date_5,
        result.Custom.Date_6 as Custom_Date_6,
        result.Custom.Date_7 as Custom_Date_7,
        result.Custom.Date_8 as Custom_Date_8,
        result.Custom.Date_9 as Custom_Date_9,
        result.Custom.Date_10 as Custom_Date_10,

    };
    entity MasterCountryOutComes as select from MasterData.MASTER_COUNTRY_OUTCOMES;
    entity MasterOutComeReasons as select from MasterData.PT_TMOUTRS;
    entity MasterCountryCurrencies as select from MasterData.CountryCurrency;
    entity StandardDivisions as projection on MasterData.StandardDivisions;
    
    entity OfferStatus as projection on TransactionalDataViews.OfferStatus;
    

    entity CountryBrands @readonly as projection on MasterDataViews.CountryBrands;
    entity CountryBrandProducts @readonly as projection on MasterDataViews.CountryBrandProducts;

    entity CompetitorResultsTableView as select from TransactionalData.TransCompetitorResult;

    entity MasterCompetitors as select from MasterData.MasterCompetitors;

    entity WordTemplate as projection on AdminData.WordTemplate;
    entity WordTemplateCountry as projection on AdminData.WordTemplateCountry{
        *,
        WordTemplates.name,
        WordTemplates.filename,
        WordTemplates: Redirected to WordTemplate on WordTemplates.templateId = templateId
    };

    entity WordAttachments {
        key offerId    : String(50);
        key templateId : Integer;
            content    : LargeBinary @Core.MediaType : mediaType; //'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            mediaType  : String      @Core.IsMediaType;
    }

    entity ExcelTemplate as projection on AdminData.ExcelTemplate;
    entity ExcelTemplateCountry as projection on AdminData.ExcelTemplateCountry{
        *,
        ExcelTemplates.name,
        ExcelTemplates.filename,
        ExcelTemplates: Redirected to ExcelTemplate on ExcelTemplates.templateId = templateId
    };

    entity ExcelAttachments {
        key offerId    : String(50);
        key templateId : Integer;
            content    : LargeBinary @Core.MediaType : mediaType; //'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            mediaType  : String      @Core.IsMediaType;
    }

    entity DeliveryProductTableView as select from TransactionalData.PT_TMTRRES as result
        inner join TransactionalData.PT_TMOFPR as product 
            on result.OfferID = product.OfferID and result.ProductCode = product.ProductCode
        inner join TransactionalData.PT_TMDLVTR as deliveries 
            on deliveries.OfferID = result.OfferID and deliveries.ProductCode = result.ProductCode
    {
        result.TenderID,
        key result.OfferID,
        key result.ProductCode,
        result.CountryCode,
        result.AwardedProduct,
        result.AwardedQty,
        sum(deliveries.ActualDeliveryQuantity) as SumOfDeliveredAmount:Double,
        case 
            when result.AwardedQty = 0 then NULL
            else sum(deliveries.ActualDeliveryQuantity)/ result.AwardedQty
        end as DeliveredPercentage:Double
    }
    where result.Outcome = 'Won'
    group by result.TenderID, result.OfferID, result.ProductCode, result.CountryCode, result.AwardedProduct, result.AwardedQty;

    
}