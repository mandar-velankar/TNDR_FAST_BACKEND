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
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity VW_TENDER_MANAGER_DASHBOARD @readonly as projection on ExternalDataViews.VW_TENDER_MANAGER_DASHBOARD;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity TENDER_PRICING @readonly as projection on ExternalDataViews.TENDER_PRICING;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity FastReportingData as projection on ExternalDataViews.FastReportingData;


    //Master Data Views addendum
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterApproverBrandMap @readonly as projection on ExternalDataViews.MasterApproverBrandMap;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterCountries @readonly as projection on ExternalDataViews.MasterCountries;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterAuthorizedSignatories @readonly as projection on ExternalDataViews.MasterAuthorizedSignatories;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterCountryLegalEntityBrandMap @readonly as projection on ExternalDataViews.MasterCountryLegalEntityBrandMap;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterCountryLegalEntityMap @readonly as projection on ExternalDataViews.MasterCountryLegalEntityMap;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterDistributorBrandMap @readonly as projection on ExternalDataViews.MasterDistributorBrandMap;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterDistributors @readonly as projection on ExternalDataViews.MasterDistributors;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterInstituteBrandTerms @readonly as projection on ExternalDataViews.MasterInstituteBrandTerms;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterInstituteDistBrandMap @readonly as projection on ExternalDataViews.MasterInstituteDistBrandMap;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterInstitutes @readonly as projection on ExternalDataViews.MasterInstitutes;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterLegalEntities @readonly as projection on ExternalDataViews.MasterLegalEntities;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterProductPacks @readonly as projection on ExternalDataViews.MasterProductPacks;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterTABrandMap @readonly as projection on ExternalDataViews.MasterTABrandMap;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterBudgetedProfitability @readonly as projection on ExternalDataViews.MasterBudgetedProfitability;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity ExchangeRates @readonly as projection on MasterDataLatestValues.ExchangeRates;

    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity OfferInfo @readonly as projection on ExternalDataViews.OfferInfo;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity OfferProductInfo @readonly as projection on ExternalDataViews.OfferProductInfo;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity ProductInfo @readonly as projection on ExternalDataViews.ProductInfo;

    //Spain Excel views
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity SpainEspartaDoc @readonly as projection on ExternalDataViews.SpainEspartaDoc;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity SpainEspartaLines @readonly as projection on ExternalDataViews.SpainEspartaLines;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity SpainTenderDoc @readonly as projection on ExternalDataViews.SpainTenderDoc;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity SpainTenderLines @readonly as projection on ExternalDataViews.SpainTenderLines;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity SpainRiskAnalysis @readonly as projection on ExternalDataViews.SpainRiskAnalysis;
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MasterNucleusHeads @readonly as projection on ExternalDataViews.MasterNucleusHeads;
    
    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity HEMCountryTenderReport as projection on ExternalDataViews.HEMCountryTenderReportView;

    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity SpainTenderData as projection on ExternalDataViews.SpainTenderData;

    @cov2ap.isoTime:true
    @cov2ap.isoDate:true
    @cov2ap.isoDateTime:true
    @cov2ap.isoTimestamp:true
    @cov2ap.isoDateTimeOffset:true
    entity MEATenderDeliveryData as projection on ExternalDataViews.MEATenderDeliveryData;
}