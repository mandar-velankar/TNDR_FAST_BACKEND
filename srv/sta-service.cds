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
        (RequestedVolume * Price.NetPrice) as TotalAmount:Double
    }; // Form used in the Offer tab - offer products

    entity OfferProductsDetailView as select from TransactionalData.PT_TMOFPR{
        *,
        SKU.MoleculeName as MoleculeName,
        SKUCountry.CODE1 as Code1,
        SKUCountry.CODE2 as Code2,
        SKUCountry.CODE3 as Code3,
        SKU.ProductGenericName as ProductGenericName,
        SKUCountry.GOV_CODE as Gov_Code
    };

    entity OfferProductsTotalForOffer as select from TransactionalData.PT_TMOFRS as offer
        inner join OfferProductsTableView as product on product.OfferID = offer.OfferID {
        key offer.OfferID,
        sum(product.TotalAmount) as OfferTotal:Double
    } group by offer.OfferID,
               product.TotalAmount;

    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    entity UserCountries @readonly @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
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

    entity AwardedProducts as select from TransactionalData.PT_TMTRRES;
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
        product.RequestedVolume as RequestedVolume: Integer
    };
    entity MasterCountryOutComes as select from MasterData.MASTER_COUNTRY_OUTCOMES;
    entity MasterOutComeReasons as select from MasterData.PT_TMOUTRS;
    entity MasterCountryCurrencies as select from MasterData.CountryCurrency;
    entity StandardDivisions as projection on MasterData.StandardDivisions;
    
    entity OfferStatus as projection on TransactionalDataViews.OfferStatus;
    

    entity CountryBrands @readonly as projection on MasterDataViews.CountryBrands;
    entity CountryBrandProducts @readonly as projection on MasterDataViews.CountryBrandProducts;

    entity CompetitorResultsTableView as select from TransactionalData.TransCompetitorResult as competitor {
        *,
        key competitor.OFFERID,
        key competitor.PRODUCTCODE,
        key competitor.LOTID
    };

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
}