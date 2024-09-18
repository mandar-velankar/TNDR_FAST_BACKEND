namespace com.bayer.SXTENDER.ClaimsData;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';



entity ClaimFiles : managed, cuid {
    CountryCode             : String not null;//based on selected country on UI
    ClaimFileFormat         : Integer not null;//not sure... possibly a conventional number that allows identify file-specific processing
    FileName                : String not null;//name of file as loaded
    DateFrom                : Date;
    DateTo                  : Date;
    FilePeriod              : Date;//as per selection by user when loading file
    DistributorID           : Integer;//as per selection by user when loading file
    DistributorName         : String;
    WholesalerPurchaseAmount: Double;
    NetSales                : Double;
    TotalClaimAmount        : Double;
    Status                  : String;//Pending upon upload, then as per status set through approvals on screen
    ClaimData               : Association to many ClaimData on ClaimData.ClaimFiles = $self;
};

entity ClaimData : managed, cuid {
    CountryCode                 : String;
    OfferID                     : String;   //link to offer mapped to claim line item
    ProductPackID               : Integer;  //link to product within offer mapped on claim line item
    MainInstituteID             : Integer;  //set based on customer mapping on each line of file
    ChildInstituteID            : Integer;  //set based on customer mapping on each line of file
    DistributorID               : Integer;
    Date                        : Date;
    Type                        : String;
    Quantity                    : Double;
    PurchasePrice               : Double; //coming in the extract 
    DistributionArrangement     : Double; //coming in the extract (if not calculate)
    WholesalerCorrection        : Double; //coming in the extract
    ContractPrice               : Double; //coming in the extract
    TotalClaim                  : Double; //coming in the extract
    Status                      : String;
    Comment                     : String;
    ClaimFiles                  : Association to ClaimFiles;
    Institute                   : Association to MasterData.PT_TMINST
                                    on Institute.InstituteID = MainInstituteID
                                    and Institute.CountryCode = CountryCode;
    Product                     : Association to TransactionalData.PT_TMOFPR 
                                    on Product.OfferID = OfferID 
                                    and Product.ProductCode = ProductPackID 
                                    and Product.Active = 1;
    SKU                         : Association to MasterData.PT_TMPRDPCK 
                                    on SKU.PRODUCTPACKID = ProductPackID;
    SKUCountry                  : Association to MasterData.PT_TMCTPRDPCK 
                                    on  SKUCountry.PRODUCTPACKID = ProductPackID 
                                    and SKUCountry.COUNTRYCODE = CountryCode;
    WPP                         : Association to MasterData.WholesalePurchasePrice 
                                    on WPP.PRODUCTPACKID = ProductPackID 
                                    and WPP.DistributorID = DistributorID  
                                    and WPP.CountryCode = CountryCode;
    DistributionAgreements      : Association to MasterData.DistributionAgreements 
                                    on DistributionAgreements.PRODUCTPACKID = ProductPackID 
                                    and DistributionAgreements.DistributorID = DistributorID 
                                    and DistributionAgreements.CountryCode = CountryCode;
};

