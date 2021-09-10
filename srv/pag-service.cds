using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.PriceAgreementData } from '../db/PriceAgreementData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';

service PriceAgreementService @(path: 'priceagreement') @(requires:['f_tndr_cag_admin','f_tndr_cag_priceagreements_user','f_tndr_cag_technical_user','authenticated-user']){

    entity PriceAgreements as select from PriceAgreementData.PriceAgreements;
    entity CustomerPrices as select from PriceAgreementData.CustomerPrices;
    // entity Candidates as projection on PriceAgreementData.Candidates;
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



    // this query needs to be updated when everything is ready in the Tender app
    // list of candidate institutes that can participate in a price agreement but don't have a CustomerPrices set yet
    entity Candidates as select from PriceAgreements as pa {
        pa.ID as PriceAgreementId,
        key pa.TenderId,
        key pa.InstituteId
    };

    entity CandidatePrices as select from Candidates c 
    left outer join PriceAgreements pa on c.PriceAgreementId = pa.ID{
        key c.PriceAgreementId,
        key c.TenderId,
        key c.InstituteId,
        // ifnull(pa.CustomerPrices.Applied, false) as Applied:Boolean,
        case
            when pa.CustomerPrices.Price is null then false else true 
        end as Applied:Boolean,
        ifnull(pa.CustomerPrices.Price, pa.Price) as Price:Double,
        ifnull(pa.CustomerPrices.ValidFrom, pa.EffectiveDate) as ValidFrom:DateTime,
        ifnull(pa.CustomerPrices.ValidTo, pa.ExpiryDate) as ValidTo:DateTime
    };

  
}