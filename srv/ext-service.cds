using { com.bayer.SXTENDER.ExternalDataViews } from '../db/ExternalDataViews';

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
}