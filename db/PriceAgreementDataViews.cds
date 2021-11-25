namespace com.bayer.SXTENDER.PriceAgreementDataViews;

using {com.bayer.SXTENDER.PriceAgreementData} from './PriceAgreementData';
using {com.bayer.SXTENDER.TransactionalData} from './TransactionalData';
using { com.bayer.SXTENDER.MasterData.SAP } from '../db/SAP';
using {com.bayer.SXTENDER.MasterData} from './MasterData';





entity PriceAgreementExpiryDate as select from PriceAgreementData.PriceAgreements as PriceAgreements {
    key PriceAgreements.TenderId,
    max(PriceAgreements.ExpiryDate) as ExpiryDate:DateTime
}group by PriceAgreements.TenderId, PriceAgreements.ExpiryDate;


entity PriceAgreementFOC as select from TransactionalData.ProductPricing as ProductPricing
left outer join  TransactionalData.PT_TMBDPR as PT_TMBDPR 
    on ProductPricing.CountryCode = PT_TMBDPR.CountryCode
    and ProductPricing.ProductCode = PT_TMBDPR.ProductCode
    and ProductPricing.OfferID = PT_TMBDPR.OfferID 
    {
    key ProductPricing.OfferID,
    key ProductPricing.ProductCode,
    key ProductPricing.CountryCode,
    ProductPricing.ProductCode as ProductPackId:Integer,
    PT_TMBDPR.FOC as FreeGoods:Double,
    PT_TMBDPR.FOC_ABS_PCT as FreeGoods_ABS_PCT:String,
    PT_TMBDPR.FOCStep as FreeGoods_Step:Double,
}
union
select from TransactionalData.ProductPricing
{
    OfferID,
    ProductCode,
    CountryCode,
    FreeGoodsOther.ProductPackId,
    FreeGoodsOther.FreeGoodsOther as FreeGoods:Double,
    FreeGoodsOther.FreeGoodsOther_Step as FreeGoods_Step:Double,
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
    italydeliveries.LFART,
    italydeliveries.CHARG,
    italydeliveries.VGBEL,
    materials.PriceAgreementId,
    materials.Institute.InstituteName
    
} ;
