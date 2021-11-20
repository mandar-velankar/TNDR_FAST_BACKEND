namespace com.bayer.SXTENDER.PriceAgreementData;

using {
    User,
    Country,
    managed, 
    cuid
} from '@sap/cds/common';
using {com.bayer.SXTENDER.TransactionalData} from './TransactionalData';
using {com.bayer.SXTENDER.AdminDataViews} from './AdminDataViews';
using {com.bayer.SXTENDER.MasterData} from './MasterData';
using {com.bayer.SXTENDER.MasterDataViews} from './MasterDataViews';
using {com.bayer.SXTENDER.PriceAgreementDataViews} from './PriceAgreementDataViews';



entity PriceAgreements: cuid, managed {
    ExpiryDate:  DateTime;
    EffectiveDate: DateTime;
    OriginalEffectiveDate: DateTime;
    ListPrice: Double;
    RetailPrice: Double;
    Price: Double;
    Currency: String;
    UoM: String;
    Discount: Double;
    DeliveredVolume: Integer;
    AwardedVolume: Integer;
    CountryCode: String not null;
    InstituteId: Integer not null;
    TenderId: String not null;
    ProductPackId: Integer not null;
    Synchronized: Boolean;
    hasNewMaterials: Boolean default false; // calculated from NodeJS
    hasNewPrice: Boolean default false; // calculated from NodeJS
    ExpiringSoon: Boolean default false; // calculated from NodeJS
    OfferId: String;
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId and Institute.CountryCode = CountryCode;
    Tender: Association to TransactionalData.PT_TMTEND on Tender.TenderID = TenderId;
    Product: Association to MasterData.PT_TMCTPRDPCK on Product.PRODUCTPACKID = ProductPackId
                                                     and Product.COUNTRYCODE = CountryCode
                                                     and Product.ACTIVERECORD = 'Yes';
    Candidates: Association to many CandidatesView on Candidates.PriceAgreementId = ID;
    Materials: Association to many MaterialsView on Materials.CountryCode = CountryCode
                                    and Materials.ProductPackId = ProductPackId;
    CustomerPrices: Association to many CustomerPrices on CustomerPrices.PriceAgreementId = ID;
    ConsumerPrice: Association to MasterDataViews.MostRecentConsumerPricesView on ConsumerPrice.CountryCode = CountryCode 
                                                                                     and ConsumerPrice.ProductPackId = ProductPackId;
    OfferProduct: Association to TransactionalData.PT_TMOFPR on OfferProduct.OfferID = OfferId
                                                             and OfferProduct.ProductCode = ProductPackId;
    Deliveries: Association to many PriceAgreementDataViews.Deliveries on Deliveries.PriceAgreementId = ID;
    
}
entity CustomerPrices: cuid, managed {
    // @cds.api.ignore
    @assert.notNull: false
    ValidFrom: Timestamp not null;
    // @cds.api.ignore
    @assert.notNull: false
    ValidTo: Timestamp not null;
    EffectiveDate: DateTime;
    ExpiryDate: DateTime;
    PriceAgreementId: String not null;
    PriceAgreement: Association to PriceAgreements;
    InstituteId: Integer;
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId;
    CountryCode: String not null;
    ProductPackId: Integer not null;
    MaterialNumber: String not null;
    Synchronized: Boolean;
    Price: Double;
    Applied: Boolean; // not needed? 
}

entity CustomerPrices_History: managed {
    ID: UUID;
    ValidFrom: Timestamp;
    ValidTo: Timestamp;
    EffectiveDate: DateTime;
    ExpiryDate: DateTime;
    PriceAgreementId: String not null;
    PriceAgreement: Association to PriceAgreements;
    InstituteId: Integer;
    CountryCode: String not null;
    ProductPackId: Integer not null;
    MaterialNumber: String not null;
    Synchronized: Boolean;
    Price: Double;
    Applied: Boolean; 
}

/**
 * This view lists candidate institutes that can participate in a price agreement 
 * but don't have a CustomerPrices set yet
 */
entity CandidatesView as select from PriceAgreements as pa 
left outer join MasterData.Tenders_in_Regions tr on pa.TenderId = tr.TenderID
inner join MasterData.PT_TMINST inst on pa.CountryCode = inst.CountryCode
       and tr.RegionID = inst.RegionID
       and inst.InstituteType = 'Public Account'
{
    pa.ID as PriceAgreementId,
    key pa.TenderId,
    key inst.InstituteID as CandidateID,
    tr.Region.ID as RegionId
}
union
select from PriceAgreements as pa
inner join MasterData.PT_TMINST inst on pa.CountryCode = inst.CountryCode and pa.InstituteId = inst.InstituteID
{
    pa.ID as PriceAgreementId,
    pa.TenderId,
    inst.InstituteID as CandidateID,
    inst.Region.ID as RegionId
}where inst.InstituteType <> 'Region(s)';


/**
 * This view tells us if a new SKU has been added from SAP to the master data automatically through interfacing.
 * Indicated with the "isNew" field
 */
entity MaterialsView as select from MasterData.PT_TMSKUPRDPCK sku
left outer join CustomerPrices cp 
  on cp.MaterialNumber = sku.SKUCode 
  and cp.CountryCode = sku.CountryCode 
  and cp.ProductPackId = sku.ProductPackID {
        key sku.CountryCode,
        key sku.ProductPackID as ProductPackId:String,
        key sku.SKUCode as MaterialNumber:Integer,
        case
            when min(cp.Price) is null then true else false 
        end as isNew: Boolean
} group by sku.CountryCode, sku.ProductPackID, sku.SKUCode;


entity CandidatePrices as select from PriceAgreements pa
inner join CandidatesView ca on ca.PriceAgreementId = pa.ID 
inner join MaterialsView ma on ma.ProductPackId = pa.ProductPackId and pa.CountryCode = ma.CountryCode 
left outer join CustomerPrices cp on pa.ID = cp.PriceAgreementId and cp.MaterialNumber = ma.MaterialNumber and cp.InstituteId = ca.CandidateID {
        key pa.ID as PriceAgreementId,
        key ca.TenderId,
        key ca.CandidateID as InstituteId,
        pa.CountryCode,
        pa.ProductPackId, 
        key ma.MaterialNumber,
        cp.ID as CustomerPriceId,
        case
            when cp.Price is null then false else true 
        end as Applied:Boolean,
        ifnull(cp.Synchronized, false) as Synchronized:Boolean,
        ifnull(cp.Price, pa.Price) as Price:Double,
        ifnull(cp.EffectiveDate, pa.EffectiveDate) as EffectiveDate:DateTime,
        ifnull(cp.ExpiryDate, pa.ExpiryDate) as ExpiryDate:DateTime
};


//Distinct list of Products
entity PriceAgreementProductNames as select from PriceAgreements {
	key ProductPackId,
    Product.ProductPack.PRODUCTPACKNAME as ProductName
} group by ProductPackId, Product.ProductPack.PRODUCTPACKNAME;