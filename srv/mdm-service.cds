using {com.bayer.SXTENDER.MasterData} from '../db/MasterData';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';


service MasterDataManagementService @(path : 'mdm') { //} @(requires:['f_tndr_cag_admin']){


    entity PT_TMLE @readonly        as projection on MasterData.PT_TMLE;
    entity PT_TMCTLE @readonly      as projection on MasterData.PT_TMCTLE;
    entity PT_TMCTLEBR @readonly    as projection on MasterData.PT_TMCTLEBR;
    entity PT_TMINST @readonly      as projection on MasterData.PT_TMINST;
    entity PT_TMINSHIER @readonly   as projection on MasterData.PT_TMINSHIER;
    entity PT_TMINSBRTR @readonly   as projection on MasterData.PT_TMINSBRTR;
    entity PT_TMINDSBR @readonly    as projection on MasterData.PT_TMINDSBR;
    entity PT_TMDIST @readonly      as projection on MasterData.PT_TMDIST;
    entity PT_TMDISBRD @readonly    as projection on MasterData.PT_TMDISBRD;
    entity PT_TMPRDPCK @readonly    as projection on MasterData.PT_TMPRDPCK;
    entity PT_TMCTPRDPCK @readonly  as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMSKUPRDPCK @readonly as projection on MasterData.PT_TMSKUPRDPCK;
    entity PT_TMREGPR @readonly     as projection on MasterData.PT_TMREGPR;
    entity PT_TMCOGS @readonly      as projection on MasterData.PT_TMCOGS;
    entity PT_TMPRDHIER @insertonly as projection on MasterData.PT_TMPRDHIER;


}
