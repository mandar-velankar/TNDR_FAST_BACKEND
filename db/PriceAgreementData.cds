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
    CountryCode: String;
    InstituteId: Integer;
    TenderId: String;
    ProductPackId: String;
    Synchronized: Boolean;
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId and Institute.CountryCode = CountryCode;
    Tender: Association to TransactionalData.PT_TMTEND on Tender.TenderID = TenderId;
    Product: Association to MasterData.PT_TMCTPRDPCK on Product.PRODUCTPACKID = ProductPackId // TODO: change this to link with PT_TMSKUPRDPCK and rename 'Product' to 'Materials' -> see refinement ticket
                                                     and Product.COUNTRYCODE = CountryCode
                                                     and Product.ACTIVERECORD = 'Yes';
    // Candidates: Association to many Candidates on Candidates.PriceAgreementId = ID;
    Materials: Association to many Materials on Materials.PriceAgreementId = ID; // remove this
    CustomerPrices: Association to many CustomerPrices on CustomerPrices.PriceAgreementId = ID;
}

entity CustomerPrices: cuid, managed {
    ValidFrom: DateTime;
    ValidTo: DateTime;
    PriceAgreementId: String not null;
    PriceAgreement: Association to PriceAgreements;
    InstituteId: Integer;
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId;
    MaterialId: String;
    Material: Association to Materials on Material.ID = MaterialId;
    Synchronized: Boolean;
    Price: Double;
    Applied: Boolean;
}

// entity Candidates: cuid, managed {
//     InstituteId: String;
//     PriceAgreementId: String;
//     CustomerPricesId: String;
//     ValidFrom: DateTime;
//     ValidTo: DateTime;
// }

entity Materials: cuid, managed {
    ProductPackId: String;
    PriceAgreementId: String;
    Description: String;
    MaterialNumber: String;
    ValidFrom: DateTime;
    ValidTo: DateTime;
    CountryCode: String;
}