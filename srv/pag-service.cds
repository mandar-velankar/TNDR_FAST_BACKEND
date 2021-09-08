using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.PriceAgreementData } from '../db/PriceAgreementData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';

service PriceAgreementService @(path: 'priceagreement') @(requires:['f_tndr_cag_admin','f_tndr_cag_priceagreements_user','f_tndr_cag_technical_user','authenticated-user']){

    entity PriceAgreements as projection on PriceAgreementData.PriceAgreements;
    entity CustomerPrices as projection on PriceAgreementData.CustomerPrices;
    entity Candidates as projection on PriceAgreementData.Candidates;
    entity Materials as select from PriceAgreementData.Materials;
    entity PT_TMINST as projection on MasterData.PT_TMINST;
    entity PT_TMCTPRDPCK as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMTEND as projection on TransactionalData.PT_TMTEND;
    entity PT_TMPRDPCK as projection on MasterData.PT_TMPRDPCK;

    entity DistinctPriceAgreementMaterialNumbers as select from Materials as mat {
        key mat.PriceAgreementId,
        mat.ProductPackId,
        mat.MaterialNumber
    }group by mat.PriceAgreementId, mat.ProductPackId, mat.MaterialNumber;

  
}