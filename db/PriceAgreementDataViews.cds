namespace com.bayer.SXTENDER.PriceAgreementDataViews;

using {com.bayer.SXTENDER.PriceAgreementData} from './PriceAgreementData';
using {com.bayer.SXTENDER.TransactionalData} from './TransactionalData';
using { com.bayer.SXTENDER.MasterData.SAP } from '../db/SAP';
using {com.bayer.SXTENDER.MasterData} from './MasterData';





entity PriceAgreementExpiryDate as select from PriceAgreementData.PriceAgreements as PriceAgreements {
    key PriceAgreements.TenderId,
    max(PriceAgreements.ExpiryDate) as ExpiryDate:DateTime
}group by PriceAgreements.TenderId, PriceAgreements.ExpiryDate;


entity PriceAgreementFOC as select from TransactionalData.ProductPricing{
    key OfferID,
    key ProductCode,
    key CountryCode,
    ProductCode as ProductPackId:Integer,
    FreeGoodsSame as FreeGoods:Double,
    FOC_ABS_PCT as FreeGoods_ABS_PCT:String
}
union
select from TransactionalData.ProductPricing
{
    OfferID,
    ProductCode,
    CountryCode,
    FreeGoodsOther.ProductPackId,
    FreeGoodsOther.FreeGoodsOther as FreeGoods:Double,
    FreeGoodsOther.FreeGoodsOther_ABS_PCT as FreeGoods_ABS_PCT:String
};



entity Deliveries as select from PriceAgreementData.CustomerPrices as materials 
inner join SAP.ItalyDeliveries as italydeliveries on materials.MaterialNumber = italydeliveries.MATNR
    //and materials.InstituteId = italydeliveries.KUNNR 
{
    key italydeliveries.ID,
    italydeliveries.WADAT_IST,
    italydeliveries.ANZPK,
    italydeliveries.VRKME,
    materials.PriceAgreementId,
    materials.Institute.InstituteName
    
} ;
