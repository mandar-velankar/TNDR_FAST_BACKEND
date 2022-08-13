using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.PriceAgreementData } from '../db/PriceAgreementData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/MasterDataViews';
using { com.bayer.SXTENDER.PriceAgreementDataViews } from '../db/PriceAgreementDataViews';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service PriceAgreementService @(path: 'priceagreement') @(requires:['f_tndr_cag_admin','f_tndr_cag_priceagreements_user','f_tndr_cag_technical_user','authenticated-user']){

    entity PriceAgreements @(cds.redirection.target:true) as projection on PriceAgreementData.PriceAgreements;
    entity Candidates as projection on PriceAgreementData.CandidatesView;
    entity CandidatePrices as projection on PriceAgreementData.CandidatePrices;
    entity CustomerPrices as select from PriceAgreementData.CustomerPrices;
    entity ConsumerPrices as select from MasterDataViews.MostRecentConsumerPricesView;
    entity PriceCondition as projection on TransactionalData.PriceCondition;
    entity PriceConditionClassification as projection on TransactionalData.PriceConditionClassification;
    entity RoyalDecree as projection on MasterData.RoyalDecree;
    //entity Materials as projection on PriceAgreementData.MaterialsView;
    entity NewMaterialsView as projection on PriceAgreementData.NewMaterialsView;
    entity NewFOCMaterialsView as projection on PriceAgreementData.NewFOCMaterialsView;
    entity PT_TMINST as projection on MasterData.PT_TMINST;
    entity PT_TMCTPRDPCK as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMTEND @(cds.redirection.target:true) as projection on TransactionalData.PT_TMTEND;
    entity PT_TMPRDPCK as projection on MasterData.PT_TMPRDPCK;
    entity PriceAgreementProductNames as projection on PriceAgreementData.PriceAgreementProductNames;
    entity PriceAgreementFOC as projection on PriceAgreementDataViews.PriceAgreementFOC;
    entity Deliveries as projection on PriceAgreementDataViews.Deliveries;
    entity MaterialsFOC as projection on TransactionalData.ProductPricing;
    entity PT_TMSKUPRDPCK as projection on MasterData.PT_TMSKUPRDPCK;
    entity FreeGoodsOther as projection on TransactionalData.FreeGoodsOther;
    entity PaMainFOCView as projection on PriceAgreementDataViews.PaMainFOCView;
    entity Settlements as projection on MasterData.Settlements;
    entity SettlementDates as projection on PriceAgreementData.SettlementDates;
    entity MasterPrices as projection on MasterDataViews.MostRecentMasterPricesView;

    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    
    //Countries where user has accesss to
    entity UserCountry @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
        Country: redirected to Country,
        User: redirected to Users,
    };

    action syncPriceAgreements(ids : array of String);
    // action syncFocCustPrices(ids : array of String);
}