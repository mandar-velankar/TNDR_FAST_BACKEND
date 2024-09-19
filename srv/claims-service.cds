using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using { com.bayer.SXTENDER.ClaimsData } from '../db/ClaimsData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/MasterDataViews';
using { com.bayer.SXTENDER.ClaimsViews } from '../db/ClaimsViews';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service ClaimsService @(path: 'claims') @(requires:['f_tndr_cag_admin','f_tndr_cag_claims_user','f_tndr_cag_technical_user','authenticated-user']){


    entity PT_TMDIST as projection on MasterData.PT_TMDIST;
    entity CountryTenderBrands @readonly as projection on TransactionalDataViews.CountryTenderBrands;

    entity ClaimFiles @(cds.redirection.target:true) as projection on ClaimsData.ClaimFiles;
    entity ClaimData @(cds.redirection.target:true) as projection on ClaimsData.ClaimData;
    entity ClaimFilesView as projection on ClaimsViews.ClaimFilesView;
    entity ClaimDataView as projection on ClaimsViews.ClaimDataView;



}
