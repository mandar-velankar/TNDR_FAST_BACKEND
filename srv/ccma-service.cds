using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/MasterDataViews';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service ConditionContractService @(path: 'conditioncontracting') @(requires:['f_tndr_cag_admin','f_tndr_cag_technical_user','authenticated-user']){

}