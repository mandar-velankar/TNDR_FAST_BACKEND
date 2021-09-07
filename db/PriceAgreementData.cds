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
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId;
    Tender: Association to TransactionalData.PT_TMTEND on Tender.TenderID = TenderId;
    Product: Association to MasterData.PT_TMCTPRDPCK on Product.PRODUCTPACKID = ProductPackId
                                                     and Product.COUNTRYCODE = CountryCode
                                                     and Product.ACTIVERECORD = 'Yes';
    Candidates: Association to many Candidates on Candidates.PriceAgreementId = ID;
    CustomerPrices: Association to many CustomerPrices on CustomerPrices.PriceAgreementId = ID;
}

entity CustomerPrices: cuid, managed {
    ValidFrom: DateTime;
    ValidTo: DateTime;
    PriceAgreementId: String;
    PriceAgreement: Association to PriceAgreements;
    InstituteId: Integer;
    Institute: Association to MasterData.PT_TMINST on Institute.InstituteID = InstituteId;
    MaterialId: String;
    Material: Association to Materials on Material.ID = MaterialId;
    Synchronized: Boolean;
    Price: Double;
}

entity Candidates: cuid, managed {
    InstituteId: String;
    PriceAgreementId: String;
    ValidFrom: DateTime;
    ValidTo: DateTime;
}

entity Materials: cuid, managed {
    ProductPackId: String;
    Description: String;
    MaterialNumber: String;
    ValidFrom: DateTime;
    ValidTo: DateTime;
    CountryCode: String;
}