using { com.bayer.SXTENDER.ExternalDataViews } from '../db/ExternalDataViews';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';
using {com.bayer.SXTENDER.MasterDataLatestValues} from '../db/MasterDataLatestValues';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';

@cds.query.limit: { default: 1000000, max: 1000000 }
service ExternalService @(path: '/') @(requires:['f_tndr_cag_admin','f_tndr_cag_ext_user','f_tndr_cag_technical_user']){
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity Dashboard @readonly as projection on ExternalDataViews.Dashboard;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity TENDER_DATA @readonly as projection on ExternalDataViews.TENDER_DATA;
    entity VW_TENDER_MANAGER_DASHBOARD @readonly as projection on ExternalDataViews.VW_TENDER_MANAGER_DASHBOARD;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity TENDER_PRICING @readonly as projection on ExternalDataViews.TENDER_PRICING;

    //Master Data Views addendum
    entity MasterApproverBrandMap @readonly as projection on ExternalDataViews.MasterApproverBrandMap;
    entity MasterCountries @readonly as projection on ExternalDataViews.MasterCountries;
    entity MasterAuthorizedSignatories @readonly as projection on ExternalDataViews.MasterAuthorizedSignatories;
    entity MasterCountryLegalEntityBrandMap @readonly as projection on ExternalDataViews.MasterCountryLegalEntityBrandMap;
    entity MasterCountryLegalEntityMap @readonly as projection on ExternalDataViews.MasterCountryLegalEntityMap;
    entity MasterDistributorBrandMap @readonly as projection on ExternalDataViews.MasterDistributorBrandMap;
    entity MasterDistributors @readonly as projection on ExternalDataViews.MasterDistributors;
    entity MasterInstituteBrandTerms @readonly as projection on ExternalDataViews.MasterInstituteBrandTerms;
    entity MasterInstituteDistBrandMap @readonly as projection on ExternalDataViews.MasterInstituteDistBrandMap;
    entity MasterInstitutes @readonly as projection on ExternalDataViews.MasterInstitutes;
    entity MasterLegalEntities @readonly as projection on ExternalDataViews.MasterLegalEntities;
    entity MasterProductPacks @readonly as projection on ExternalDataViews.MasterProductPacks;
    entity MasterTABrandMap @readonly as projection on ExternalDataViews.MasterTABrandMap;
    entity MasterBudgetedProfitability @readonly as projection on ExternalDataViews.MasterBudgetedProfitability;
    entity ExchangeRates @readonly as projection on MasterDataLatestValues.ExchangeRates;

    entity OfferInfo @readonly as projection on ExternalDataViews.OfferInfo;
    entity OfferProductInfo @readonly as projection on ExternalDataViews.OfferProductInfo;
    entity ProductInfo @readonly as projection on ExternalDataViews.ProductInfo;
}