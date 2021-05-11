using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';


service MasterDataManagementService @(path: 'mdm'){//} @(requires:['f_tndr_cag_admin']){
    entity PT_TMLE                           as projection on MasterData.PT_TMLE;
    entity PT_TMCTLE                         as projection on MasterData.PT_TMCTLE;
}