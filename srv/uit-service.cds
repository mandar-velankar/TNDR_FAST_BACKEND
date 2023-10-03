using {
    com.bayer.SXTENDER.MasterData,
    sap.common
} from '../db/MasterData';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';

service UITemplateService @(path : 'uit')@(requires : [
    'authenticated-user',
    'f_tndr_cag_admin',
    'f_tndr_cag_technical_user'
]) {
    
    entity DistinctProductScopeView as select from MasterData.PT_TMCTPRDPCK {
        COUNTRYCODE as CountryCode,
        key ProductScope
    } group by ProductScope, COUNTRYCODE;
}