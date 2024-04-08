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
using {UITemplates as UITemplateSrv} from './external/UITemplates';

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
    
    // UITemplate entities
    @readonly
    entity CountryTemplate as projection on UITemplateSrv.CountryTemplate;
    @readonly
    entity Template as projection on UITemplateSrv.Template;
    @readonly
    entity Tab as projection on UITemplateSrv.Tab;
    @readonly
    entity XMLView as projection on UITemplateSrv.XMLView;
    @readonly
    entity Table as projection on UITemplateSrv.Table;
    @readonly
    entity Form as projection on UITemplateSrv.Form;
    @readonly
    entity FormContainer as projection on UITemplateSrv.FormContainer;
    @readonly
    entity FormElement as projection on UITemplateSrv.FormElement;
    @readonly
    entity Column as projection on UITemplateSrv.Column;
    @readonly
    entity Layout as projection on UITemplateSrv.Layout;
    @readonly
    entity Control as projection on UITemplateSrv.Control;
    @readonly
    entity Properties as projection on UITemplateSrv.Properties;
    @readonly
    entity ValueHelp as projection on UITemplateSrv.ValueHelp;
    @readonly
    entity Filter as projection on UITemplateSrv.Filter;
    @readonly
    entity StaticValue as projection on UITemplateSrv.StaticValue;
    @readonly
    entity PropertiesView as projection on UITemplateSrv.PropertiesView;
    @readonly
    entity ProductScopeView as projection on UITemplateSrv.ProductScopeView;
    @readonly
    entity MandatoryFieldsView as projection on UITemplateSrv.MandatoryFieldsView;

    @cds.redirection.target
    entity TenderFormView as projection on TransactionalData.PT_TMTEND {
        *,
        Institute.InstituteType,
        Institute.InstituteName,
        Institute.DirectTender,
        Institute.State,
        Institute.InstituteID as ParentInstituteID,
        Institute.External_InstituteId,
        Institute.Address,
        Country.Region
    }; 

    entity CountryRegionsTableView as projection on MasterData.CountryRegions;

    entity PT_TMAWRDCR as projection on TransactionalData.PT_TMAWRDCR;
    entity AppConfig @readonly as projection on AdminData.AppConfig;
  
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

    entity TenderMasterView as select from TransactionalData.PT_TMTEND as tender
        inner join AdminData.PT_TMUSER as CreatedByUser on CreatedByUser.UserID = tender.createdBy 
        inner join AdminData.PT_TMUSER as ModifyedByUser on ModifyedByUser.UserID = tender.modifiedBy
        left join TransactionalData.PT_TMOFRS as offer on offer.TenderID = tender.TenderID
        left join TransactionalDataViews.BrandsInTender as brands on brands.OFFERID = offer.OfferID {
        tender.CountryCode,
        key tender.TenderID,
        tender.Classification,
        tender.TenderName,
        tender.createdBy,
        tender.Offer.Distributor.DistributorName,
        tender.Institute.InstituteName,
        tender.Institute.InstituteID,
        tender.Institute.InstituteTerritory.Territory,
        tender.Institute.InstituteTerritory.IsKAM,
        key tender.Offer.OfferID,
        tender.Offer.OfferValue.VALUE,
        tender.Offer.OfferStatus.STATUS,         
        tender.PublicationDate,
        tender.Offer.InternalBidDueDate,
        tender.BidDueDate,
        max(brands.BRANDID) as BrandID:String,
        tender.createdAt,
        tender.modifiedBy,
        tender.modifiedAt, 
        CreatedByUser.UserName as createdByName,
        ModifyedByUser.UserName as modifiedByName,
        tender.Country.Region
    }where tender.Active = 1 and ifnull(tender.Offer.Active, 1) = 1
    group By tender.CountryCode,
        tender.TenderID,
        tender.Classification,
        tender.TenderName,
        tender.createdBy,
        tender.Offer.Distributor.DistributorName,
        tender.Institute.InstituteName,
        tender.Institute.InstituteID,
        tender.Institute.InstituteTerritory.Territory,
        tender.Institute.InstituteTerritory.IsKAM,
        tender.Offer.OfferID,
        tender.Offer.OfferValue.VALUE,
        tender.Offer.OfferStatus.STATUS,         
        tender.PublicationDate,
        tender.Offer.InternalBidDueDate,
        tender.BidDueDate,
        tender.createdAt,
        tender.modifiedBy,
        tender.modifiedAt,
        CreatedByUser.UserName,
        ModifyedByUser.UserName,
        tender.Country.Region;

    @cds.redirection.target
    entity InstitutesView as select from MasterData.PT_TMINST as inst
        left join MasterData.PT_TMINSHIER as hier on hier.InstituteID = inst.InstituteID {
        *,
        key inst.CountryCode,
        key inst.InstituteID,
        inst.ActiveRecord,
        hier.ParentInstituteID as HieraryParentInstituteID,
        hier.InstituteID as HierarchyInstituteID,
        case when hier.ParentInstituteID is null
            then null
            else hier.ParentInstituteID
        end as ParentInstituteID: Integer,
        CustomerID as CustomerID: String,
        inst.InstituteTerritory.Territory,
        inst.InstituteTerritory.IsKAM
    }order by CountryCode, InstituteName;
    entity ClassifiactionsView as projection on MasterData.MASTER_COUNTRY_CLASSIFICATION as classification {
        *,
        classification.COUNTRY_CODE as CountryCode: String
    }order by CLASSIFICATION;
    entity CountryInstituteTypeView as projection on MasterData.MASTER_COUNTRY_CHANNELS as instType {
        *,
        instType.ChannelCountry as CountryCode: String
    }order by ChannelName;
    entity CountryTenderNo as projection on TransactionalDataViews.CountryTenderNo;

    entity TenderOffers as projection on TransactionalDataViews.TenderOffers;

    entity PT_TMTNOFST as projection on TransactionalData.PT_TMTNOFST;
    entity PT_TMINST   as projection on MasterData.PT_TMINST;
    entity PT_TMDIST as projection on MasterData.PT_TMDIST;
    entity PT_TMOFPR as projection on TransactionalData.PT_TMOFPR;
    entity PT_TMBDPR as projection on TransactionalData.PT_TMBDPR {
        *,
        Product: redirected to TransactionalData.PT_TMOFPR
    };

    @cds.redirection.target
    entity OfferFormView as select from TransactionalData.PT_TMOFRS{
        *,
        @Core.Computed: false
        ifnull(NewOfferDueDate, Tender.BidDueDate) as OfferDueDate: Date,
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

    entity CountryProductPackView as select from MasterData.PT_TMCTPRDPCK{
        *
    };

    entity DistinctProductScopeView as select from CountryProductPackView {
        COUNTRYCODE as CountryCode,
        key ProductScope
    } group by ProductScope, COUNTRYCODE;

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
        PriceCondition.AnticipatedYearlyVolumeBranch,
        Price.NetPrice *
        case 
        when Price.FOCType = 'FOC 1'
            then RequestedVolume
            else 
                case 
                    when Price.FOC_ABS_PCT = 'PCT'
                        then RequestedVolume + round(RequestedVolume * Price.FOC)
                            when Price.FOC_ABS_PCT = 'STP'
                            then RequestedVolume + floor(RequestedVolume / Price.FOCStep) * Price.FOC
                        else RequestedVolume + Price.FOC
                end
        end as TotalAmount:Double,
        Offer.Currency as Currency,
        Offer.Tender.Country.Region,
        SKUCountry.RegistrationValidUntil
    } order by SORTER asc; // Form used in the Offer tab - offer products

    action copyOffer(offerID:String, type: String, QuotationInstituteID: Integer) returns String;
    action softDeleteOffer(offerID:String) returns String;
    action notificationMail(offerID:String, From: String, To: String, Subject: String, Content: String) returns String;
    function getNotificationMailTemplate(offerID:String, templateId: String, url: String) returns String;

   /* entity OfferProductsDetailView as select from TransactionalData.PT_TMOFPR as pr
        left join MasterData.PT_TMCTPRDPCK as ctprdck on ctprdck.PRODUCTPACKID = pr.ProductCode
                                                       and ctprdck.COUNTRYCODE = pr.CountryCode
        left join ProductBrand as prbrand on prbrand.PRODUCTPACKID = pr.ProductCode
        left join TransactionalData.PT_TMOFRS as offer on offer.OfferID = pr.OfferID
        left join PakistanMasterDistributors as pkdist on pkdist.BU = ctprdck.BU 
                                                       and pkdist.InstituteID = offer.QuotationInstituteID 
        left join MasterData.PT_TMINST as inst on offer.QuotationInstituteID = inst.InstituteID{
            pr.TenderID,
        key pr.OfferID,
            pr.SubmittedOn,
            pr.SubmittedBy,
        key pr.Active,
        key pr.ProductCode,
            pr.Reference,
            pr.AlternateOfferYN,
            pr.RequestedVolume,
            pr.UnitPerPack,
            pr.SampleYN,
            pr.SampleQuantity,
            pr.DocumentsRequired,
            pr.FirstShipment,
            pr.NoofLots,
            pr.IntervalBetweenShipments,
            pr.NoOfTier,
            pr.DiscOrOffer,
            pr.PaymentTerms,
            pr.SNo,
            pr.ActiveProduct,
            pr.Comment,
            pr.INCOTerms,
            pr.SORTER,
            pr.DEFAULT_COMMISSION_RATE,
            pr.SUPPLY_UPDATE,
            pr.PAYMENT_UPDATE,
            pr.Line,
            pr.DeliveryConditions,
            pr.MinInvoiceAmount,
            pr.PricingPolicyCluster,
            pr.OfferType,
            pr.AnticipatedRequestedQuantity,
            pr.MaxPrice,
            pr.Channel,
        key pr.LotID,
            pr.WorkflowProductID,
            pr.IbizWorkflowID,
            pr.CountryCode,
            pr.DistributorID,
            pr.Custom.String_1 as Custom_String_1,
            pr.Custom.Integer_1 as Custom_Integer_1,
            pkdist.DistributorID as PakistanDistributorID,
            pkdist.DistributorName as PakistanDistributorName,
            SKU.MoleculeName as MoleculeName,
            SKUCountry.CODE1 as Code1,
            SKUCountry.CODE2 as Code2,
            SKUCountry.CODE3 as Code3,
            SKU.ProductGenericName as ProductGenericName,
            SKU.PRODUCTPACKNAME,
            SKUCountry.GOV_CODE as Gov_Code,
            ctprdck.BU,
            ctprdck.RegistrationValidUntil,
            prbrand.HLEVEL4_NAME as BrandName,
            inst.INCOTerms as IncoTerm,
            @Core.Computed: false
            ifnull(PricingPolicy.Value, 0) as VwBudgetedProfitability:Double
    };*/

    entity OfferProductsDetailView as select from TransactionalData.PT_TMOFPR{
        *,
        SKU.MoleculeName as MoleculeName,
        SKUCountry.CODE1 as Code1,
        SKUCountry.CODE2 as Code2,
        SKUCountry.CODE3 as Code3,
        SKU.ProductGenericName as ProductGenericName,
        SKUCountry.GOV_CODE as Gov_Code,
        SKU.PRODUCTPACKNAME,
        SKUCountry.BU,
        SKUCountry.RegistrationValidUntil,
        SKU.Product.HLEVEL4_NAME as BrandName,
        SKU.PACKFACTOR,
        Offer.Tender.Institute.INCOTerms,
        @Core.Computed: false
        case when PricingPolicy.Type = 'BudgetedProfitability'
            then PricingPolicy.Value 
            else 0
        end as VwBudgetedProfitability:Double
    };

    entity OfferProductsTotalForOffer as select from TransactionalData.PT_TMOFRS as offer
        inner join OfferProductsTableView as product on product.OfferID = offer.OfferID {
        key offer.OfferID,
        sum(product.TotalAmount) as OfferTotal:Double,
        offer.Currency as Currency:String(3),
        offer.Tender.Country.Region
    } group by offer.OfferID,
               offer.Currency,
               offer.Tender.Country.Region;

    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    entity UserCountries @readonly @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
        Country: redirected to Country,
        User: redirected to Users,
        User.UserName,
        // User.UserEmail
    };

    entity UsersPerCountry @readonly @(cds.redirection.target:false) as projection on AdminData.PT_TMUSERCTRY {
        *,
        User.UserName as UserName,
        Country: redirected to Country,
        User: redirected to Users,
    };
    entity UsersHavingOneCountry @(cds.redirection.target:false) as select from UsersPerCountry {
        key CWID,
        max(CountryCode) as CountryCode: String,
        count(CountryCode) as numberOfCountries: Integer,
        max(UserName) as UserName: String
    }
    group by CWID
    having count(CountryCode) = 1;

    entity CountryTenderBrands @readonly as projection on TransactionalDataViews.CountryTenderBrands;
    entity CountryStatusses @readonly as projection on MasterData.MASTER_COUNTRY_STATUS;
    entity Divisions @readonly @(cds.redirection.target:false)    as projection on MasterDataViews.Divisions;
    entity MasterDistributors @readonly @(cds.redirection.target:false) as projection on ExternalDataViews.MasterDistributors;
    entity MasterInstitutes @readonly @(cds.redirection.target:false) as projection on ExternalDataViews.MasterInstitutes;
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
    entity PriceConditionPriceView as projection on TransactionalDataViews.StandardTenderPriceConditionView {
        CountryCode,
        Region,
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
        NetOfferPrice
    };
    entity PriceConditionDiscountView as projection on TransactionalDataViews.StandardTenderPriceConditionView{
        CountryCode,
        Region,
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
        NetOfferPrice
    };
    entity PriceConditionTaiwanPriceView as projection on TransactionalDataViews.StandardTenderPriceConditionView;
    entity PriceConditionTaiwanDiscountView as projection on TransactionalDataViews.StandardTenderPriceConditionView;
    entity PriceConditionNLPriceView as projection on TransactionalDataViews.StandardTenderPriceConditionView;
    entity PriceConditionNLDiscountView as projection on TransactionalDataViews.StandardTenderPriceConditionView;
    entity PriceConditionPriceWithFOCView as projection on TransactionalDataViews.StandardTenderPriceConditionView {
            CountryCode,
            Region,
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

    entity PriceConditionDiscountWithFOCView as projection on TransactionalDataViews.StandardTenderPriceConditionView {
            CountryCode,
            Region,
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
    };

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

    entity AwardedProducts as select from TransactionalData.PT_TMTRRES as result
        inner join OfferProducts as product on result.OfferID = product.OfferID
                                                          and result.ProductCode = product.ProductCode
                                                          and result.LotID = product.LotID
    {
        *,
        result.TenderID,        
    key result.OfferID,        
        result.CountryCode,       
    key result.ProductCode, 
        result.Active,
        result.LotID,
        product.SORTER
    };

    entity OfferProducts as projection on TransactionalData.PT_TMOFPR {
        TenderID,        
    key OfferID,        
        CountryCode,       
    key ProductCode,
    key LotID,
    key Active,
        SORTER
    };
    entity AwardedProductFormView as select from TransactionalData.PT_TMTRRES as result
        inner join TransactionalData.PT_TMOFPR as product on result.OfferID = product.OfferID
                                                          and result.ProductCode = product.ProductCode
                                                          and result.LotID = product.LotID
        inner join TransactionalData.PriceCondition as priceCondition on result.ProductCode = priceCondition.ProductCode
                                                        and result.OfferID = priceCondition.OfferID
                                                        and result.LotID = priceCondition.LotID 
        left join TransactionalData.FreeGoodsOther as freegoods
                            on freegoods.PriceCondition.ID = priceCondition.ID
                            and freegoods.ProductPackId = priceCondition.ProductCode
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
        freegoods.FreeGoodsOther,
        freegoods.FreeGoodsOther_ABS_PCT,
        freegoods.FreeGoodsOther_Step,
        freegoods.ADD_INCLUDE,
        case 
            when freegoods.FreeGoodsOther is null
                then 'NA'
            when freegoods.FreeGoodsOther_ABS_PCT = 'PCT'
                then round(100 * freegoods.FreeGoodsOther, 2) || '% (' || freegoods.ADD_INCLUDE || ')'
            when freegoods.FreeGoodsOther_ABS_PCT = 'ABS'
                then freegoods.FreeGoodsOther || ' '  || result.UoM || ' (' || freegoods.ADD_INCLUDE || ')'
            when freegoods.FreeGoodsOther_ABS_PCT = 'STP'
                then freegoods.FreeGoodsOther || ' '  || result.UoM || ' for each ' || freegoods.FreeGoodsOther_Step || ' ' || result.UoM || ' purchased (' || freegoods.ADD_INCLUDE || ')'
        end as FOC:String,
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
    
    entity ProductPack as projection on MasterData.PT_TMPRDPCK;

    entity PriceCondition as projection on TransactionalData.PriceCondition;

    entity CountryBrands as select from CountryBrandProducts as Product{
        key Product.COUNTRY_CODE,
        key Product.BRAND_ID,
        min(Product.BRAND_NAME) as BRAND_NAME:String(500),
        min(Product.DIVISION) as DIVISION:String(500),
        Product.BU
    }where Product.BRAND_ID is not null
    group by Product.COUNTRY_CODE, Product.BRAND_ID, Product.BU;

    entity CountryBrandProducts @readonly as projection on MasterDataViews.CountryBrandProducts;

    entity CompetitorResultsTableView as select from TransactionalData.TransCompetitorResult;

    entity MasterCompetitors as select from MasterData.MasterCompetitors;
    entity MasterCompetitorProducts as select from MasterData.MasterCompetitors;

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

    entity DeliveryProductTableView as select from TransactionalData.PT_TMOFPR as product
        inner join TransactionalData.PT_TMTRRES as result 
            on result.OfferID = product.OfferID and result.ProductCode = product.ProductCode
        left join TransactionalData.PT_TMDLVTR as deliveries 
            on deliveries.OfferID = product.OfferID and deliveries.ProductCode = product.ProductCode
    {
        product.TenderID,
        key product.OfferID,
        key product.ProductCode,
        product.CountryCode,
        result.AwardedProduct,
        result.AwardedQty,
        sum(ifnull(deliveries.ActualDeliveryQuantity,0)) as SumOfDeliveredAmount:Double,
        case 
            when result.AwardedQty = 0 OR sum(deliveries.ActualDeliveryQuantity) is NULL then 0
            else sum(deliveries.ActualDeliveryQuantity)/ result.AwardedQty
        end as DeliveredPercentage:Double
    }
    where result.Outcome = 'Won'
    group by product.TenderID, product.OfferID, product.ProductCode, product.CountryCode, result.AwardedProduct, result.AwardedQty;

    // entity DeliveryTrackingDetailView as select from TransactionalData.PT_TMDLVTR
    // {
    //     TenderID,
    // key OfferID,        
    //     CountryCode,
    //     InstituteID,
    //     SKUCode,
    //     SubmittedOn,
    //     SubmittedBy,
    //     Active,
    //     RequestedDeliveryDate,
    //     RequestedQuantity,
    //     ActualDeliveryDate,
    //     ActualDeliveryQuantity,
    // key ProductCode,
    //     PaidOrFree,
    //     PO,
    //     InvoiceNo,
    // key SNo,
    //     LotID,
    //     Institute.InstituteName
    // };

    entity DeliveryTrackingDetailView as projection on TransactionalData.PT_TMDLVTR;

    entity PdfEmail: cuid, managed {
        URL : String;
        TenderID: String(50);
        OfferID: String(30);
        TenderInstitute: String(500);
        OfferInstitute: String(500);
        UserEmail: String(255); 
        UserName: String(100);      
        Sent: Boolean;
    };


    entity ChildInstitutes as select from MasterData.PT_TMINST as inst
        inner join MasterData.PT_TMINSHIER as hier on inst.InstituteID = hier.InstituteID {
        key hier.ParentInstituteID,
        key hier.InstituteID,
        key CountryCode,
            hier.InstituteID as QuotationInstituteID: String,
            inst.InstituteName,
            inst.PaymentTerms
    }
    union select from MasterData.PT_TMINST {
        key InstituteID as ParentInstituteID,
        key InstituteID,
        key CountryCode,
            InstituteID as QuotationInstituteID: String,
            InstituteName,
            PaymentTerms
    };

    entity ChildInstitutesView as select from ChildInstitutes{
        *,
    }order by InstituteName;

    entity PakistanMasterDistributors as select from MasterData.DistributorAssignment as pkdist
        inner join MasterData.PT_TMDIST as dist on dist.DistributorID = pkdist.DistributorID{
            key pkdist.InstituteID,
            key pkdist.BU,
            pkdist.DistributorID,
            dist.DistributorName,
            key dist.CountryCode
    }group by pkdist.InstituteID,pkdist.BU,pkdist.DistributorID,dist.DistributorName,dist.CountryCode;

    entity ProductBrand as select from MasterData.PT_TMPRDHIER as prdhier
        inner join MasterData.PT_TMPRDPCK as prdpck on prdpck.HLEVEL6_CODE = prdhier.HLEVEL6_CODE {
            key prdpck.PRODUCTPACKID,
                prdhier.HLEVEL6_CODE,
                prdhier.HLEVEL4_NAME
    };

    entity InstituteInBranchView as select from MasterData.PT_TMINST as inst
        inner join MasterData.PT_TMINSHIER as hier on inst.InstituteID = hier.InstituteID {
        key hier.ParentInstituteID,
        key hier.InstituteID,
        key CountryCode,
            inst.InstituteName,
            inst.PaymentTerms
    };

    entity StandardTenderHistory as projection on TransactionalDataViews.StandardTenderHistory;

    entity PriceConditionCurrentSectionTaiwanView as projection on TransactionalDataViews.PriceConditionCurrentSectionTaiwanView;
    
    entity CSVAttachment {
        key Zuellig: Boolean default false;
        content    : LargeBinary @Core.MediaType : 'text/csv';
    }

    entity TaiwanFASTData {
       content    : LargeBinary @Core.MediaType : 'application/json';
    };

    entity PT_TMSKUPRDPCK as projection on MasterData.PT_TMSKUPRDPCK;

    entity MailTemplates                                as projection on AdminData.MailTemplate;
    entity MailTemplateFiles                            as projection on AdminData.MailTemplateFile;
    entity Outbox                                       as projection on TransactionalData.OutgoingMails;
    entity StandardTenderFOCInformation                 as projection on TransactionalDataViews.StandardTenderFOCInformation;   
    @cds.redirection.target
    entity NotificationUserList as select from AdminData.PT_TMUSERCTRY{
        *,
        Key CountryCode,
        CWID,
        User: redirected to Users,
        User.Role,
        User.UserName,
        User.UserEmail,
    }where CountryCode = 'NL' and User.Role = 'Hospital Manager';
}