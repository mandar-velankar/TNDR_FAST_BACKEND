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
        tender.Brands.BRANDID as BrandID,
        tender.createdAt,
        tender.modifiedBy,
        tender.modifiedAt, 
    }where tender.Active = 1
    and ifnull(tender.Offer.Active, 1) = 1;

    @cds.redirection.target
    entity OfferFormView as select from TransactionalData.PT_TMOFRS as offer
    inner join TransactionalData.PT_TMTEND as tender on tender.TenderID = offer.TenderID {
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
    }; // Form used in the Offer tab

    entity OfferProductsTableView as select from TransactionalData.PT_TMOFPR as product
        inner join TransactionalData.PT_TMBDPR as price on price.ProductCode = product.ProductCode 
                                                        and price.OfferID = product.OfferID 
                                                        and price.Active = product.Active
        inner join MasterData.PT_TMPRDPCK as productpack on productpack.PRODUCTPACKID = product.ProductCode {
            product.ProductCode,
            key product.OfferID,
            key product.TenderID,
            product.Active,
            productpack.PRODUCTPACKNAME as ProductPackName,
            product.UnitPerPack as UoM,
            price.NetPrice as NetPrice,
            product.RequestedVolume,
            (product.RequestedVolume * price.NetPrice) as TotalAmount:Double
    }; // Form used in the Offer tab - offer products

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
}