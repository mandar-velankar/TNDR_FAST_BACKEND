using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using {com.bayer.SXTENDER.MasterData} from '../db/MasterData';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';
using {com.bayer.SXTENDER.AdminData} from '../db/AdminData';
using {StandardAppService} from './sta-service';

@protocol: 'rest'
service ConditionContractService @(path: 'conditioncontracting')@(requires: [
    'f_tndr_cag_admin',
    'f_tndr_cag_technical_user',
    'authenticated-user',
    'f_tndr_cag_ccma_user'
]) {

    entity PriceCondition               as projection on TransactionalData.PriceCondition;
    entity PriceConditionClassification as select from TransactionalData.PriceConditionClassification;
    entity PT_TMTEND                    as projection on TransactionalData.PT_TMTEND;
    entity PT_TMOFRS                    as projection on TransactionalData.PT_TMOFRS;
    entity PT_TMOFPR                    as projection on TransactionalData.PT_TMOFPR;
    entity PT_TMINST                    as projection on MasterData.PT_TMINST;
    entity PT_TMDIST                    as projection on MasterData.PT_TMDIST;
    entity PT_TMBDPR                    as projection on TransactionalData.PT_TMBDPR;
    entity Country                      as projection on MasterData.PT_TMCTRY;
    entity Users                        as projection on AdminData.PT_TMUSER;
    entity OutgoingMails                as projection on TransactionalData.OutgoingMails;
    entity MailTemplate                 as projection on AdminData.MailTemplate;
    entity MailTemplateFile             as projection on AdminData.MailTemplateFile;
    entity CandidateInstitutes          as projection on StandardAppService.CandidateInstitutes;

    @open
    type object {};

    function getUserCountries() returns object;
    function getInstituteData() returns object;

}
