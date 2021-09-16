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

entity PriceAgreements: cuid, managed {
    ExpiryDate:  DateTime;
    EffectiveDate: DateTime;
    OriginalEffectiveDate: DateTime;
    ListPrice: Double;
    RetailPrice: Double;
    Price: Double;
    Discount: Double;
    DeliveredVolume: Integer;
    AwardedVolume: Integer;
    CountryCode: String not null;
    InstituteId: Integer not null;
    TenderId: String not null;
    ProductPackId: String not null;
    Synchronized: Boolean;
    virtual hasNewMaterials: Boolean default false; // calculated from NodeJS
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId and Institute.CountryCode = CountryCode;
    Tender: Association to TransactionalData.PT_TMTEND on Tender.TenderID = TenderId;
    Product: Association to MasterData.PT_TMCTPRDPCK on Product.PRODUCTPACKID = ProductPackId
                                                     and Product.COUNTRYCODE = CountryCode
                                                     and Product.ACTIVERECORD = 'Yes';
    Candidates: Association to many Candidates on Candidates.PriceAgreementId = ID;
    Materials: Association to many Materials on Materials.CountryCode = CountryCode
                                    and Materials.ProductPackId = ProductPackId;
    CustomerPrices: Association to many CustomerPrices on CustomerPrices.PriceAgreementId = ID;
}



entity CustomerPrices: cuid, managed {
    ValidFrom: DateTime;
    ValidTo: DateTime;
    PriceAgreementId: String not null;
    PriceAgreement: Association to PriceAgreements;
    InstituteId: Integer;
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId;
    CountryCode: String not null;
    ProductPackId: String not null;
    MaterialNumber: String not null;
    Synchronized: Boolean;
    Price: Double;
    Applied: Boolean;
}


// this query needs to be updated when everything is ready in the Tender app
// list of candidate institutes that can participate in a price agreement but don't have a CustomerPrices set yet
entity Candidates as select from PriceAgreements as pa {
    pa.ID as PriceAgreementId,
    key pa.TenderId,
    key pa.InstituteId
};


/**
 * This view tells us if a new SKU has been added from SAP to the master data automatically through interfacing.
 * Indicated with the "isNew" field
 */
entity Materials as select from MasterData.PT_TMSKUPRDPCK sku
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
left outer join Candidates ca on ca.PriceAgreementId = pa.ID 
left outer join Materials ma on ma.ProductPackId = pa.ProductPackId and pa.CountryCode = ma.CountryCode 
left outer join CustomerPrices cp on pa.ID = cp.PriceAgreementId and cp.MaterialNumber = ma.MaterialNumber and cp.InstituteId = ca.InstituteId {
        key pa.ID as PriceAgreementId,
        key ca.TenderId,
        key ca.InstituteId,
        pa.CountryCode,
        pa.ProductPackId, 
        key ma.MaterialNumber,
        case
            when cp.Price is null then false else true 
        end as Applied:Boolean,
        ifnull(cp.Synchronized, false) as Synchronized:Boolean,
        ifnull(cp.Price, pa.Price) as Price:Double,
        ifnull(cp.ValidFrom, pa.EffectiveDate) as ValidFrom:DateTime,
        ifnull(cp.ValidTo, pa.ExpiryDate) as ValidTo:DateTime
};


//Distinct list of Products
entity PriceAgreementProductNames as select from PriceAgreements {
	key ProductPackId,
    Product.ProductPack.PRODUCTPACKNAME as ProductName
} group by ProductPackId, Product.ProductPack.PRODUCTPACKNAME;