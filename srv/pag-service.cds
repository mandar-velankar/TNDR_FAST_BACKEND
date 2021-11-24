using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.PriceAgreementData } from '../db/PriceAgreementData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/MasterDataViews';
using { com.bayer.SXTENDER.PriceAgreementDataViews } from '../db/PriceAgreementDataViews';

service PriceAgreementService @(path: 'priceagreement') @(requires:['f_tndr_cag_admin','f_tndr_cag_priceagreements_user','f_tndr_cag_technical_user','authenticated-user']){

    entity PriceAgreements @(cds.redirection.target:true) as projection on PriceAgreementData.PriceAgreements;
    entity Candidates as projection on PriceAgreementData.CandidatesView;
    entity CandidatePrices as projection on PriceAgreementData.CandidatePrices;
    entity CustomerPrices as select from PriceAgreementData.CustomerPrices;
    entity ConsumerPrices as select from MasterDataViews.MostRecentConsumerPricesView;
    entity Materials as projection on PriceAgreementData.MaterialsView;
    entity PT_TMINST as projection on MasterData.PT_TMINST;
    entity PT_TMCTPRDPCK as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMTEND @(cds.redirection.target:true) as projection on TransactionalData.PT_TMTEND;
    entity PT_TMPRDPCK as projection on MasterData.PT_TMPRDPCK;
    entity PriceAgreementProductNames as projection on PriceAgreementData.PriceAgreementProductNames;
    entity PriceAgreementFOC as projection on PriceAgreementDataViews.PriceAgreementFOC;
    entity Deliveries as projection on PriceAgreementDataViews.Deliveries;

    action syncPriceAgreements(ids : array of String);
}