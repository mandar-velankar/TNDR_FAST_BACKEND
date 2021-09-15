using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.PriceAgreementData } from '../db/PriceAgreementData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';

service PriceAgreementService @(path: 'priceagreement') @(requires:['f_tndr_cag_admin','f_tndr_cag_priceagreements_user','f_tndr_cag_technical_user','authenticated-user']){

    entity PriceAgreements as select from PriceAgreementData.PriceAgreements;
    entity Candidates as projection on PriceAgreementData.Candidates;
    entity CandidatePrices as projection on PriceAgreementData.CandidatePrices;
    entity CustomerPrices as select from PriceAgreementData.CustomerPrices;
    entity Materials as select from PriceAgreementData.Materials;
    entity PT_TMINST as projection on MasterData.PT_TMINST;
    entity PT_TMCTPRDPCK as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMTEND as projection on TransactionalData.PT_TMTEND;
    entity PT_TMPRDPCK as projection on MasterData.PT_TMPRDPCK;

  
}