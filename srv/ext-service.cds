using { com.bayer.SXTENDER.ExternalDataViews } from '../db/ExternalDataViews';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';

@cds.query.limit: { default: 1000, max: 1000000 }
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
    entity MasterApproverBrandMap @readonly as projection on MasterDataViews.MasterApproverBrandMap;
    entity MasterCountries @readonly as projection on MasterDataViews.MasterCountries;
    entity MasterAuthorizedSignatories @readonly as projection on MasterDataViews.MasterAuthorizedSignatories;
    entity MasterCountryLegalEntityBrandMap @readonly as projection on MasterDataViews.MasterCountryLegalEntityBrandMap;
    entity MasterCountryLegalEntityMap @readonly as projection on MasterDataViews.MasterCountryLegalEntityMap;
    entity MasterDistributorBrandMap @readonly as projection on MasterDataViews.MasterDistributorBrandMap;
    entity MasterDistributors @readonly as projection on MasterDataViews.MasterDistributors;
    entity MasterInstituteBrandTerms @readonly as projection on MasterDataViews.MasterInstituteBrandTerms;
    entity MasterInstituteDistBrandMap @readonly as projection on MasterDataViews.MasterInstituteDistBrandMap;
    entity MasterInstitutes @readonly as projection on MasterDataViews.MasterInstitutes;
    entity MasterLegalEntities @readonly as projection on MasterDataViews.MasterLegalEntities;
    entity MasterProductPacks @readonly as projection on MasterDataViews.MasterProductPacks;
    entity MasterTABrandMap @readonly as projection on MasterDataViews.MasterTABrandMap;
    entity MasterBudgetedProfitability @readonly as projection on MasterDataViews.MasterBudgetedProfitability;
}