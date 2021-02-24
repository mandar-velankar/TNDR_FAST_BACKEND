namespace com.bayer.SXTENDER.TransactionalData;

using {
    User,
    Country,
    cuid,
    managed
} from '@sap/cds/common';
using {com.bayer.SXTENDER.MasterData} from './MasterData';
//using { com.bayer.SXTENDER.MasterDataViews } from './MasterDataViews';
using {com.bayer.SXTENDER.MasterDataLatestValues} from './MasterDataLatestValues';
using {com.bayer.SXTENDER.TransactionalDataViews} from './TransactionalDataViews';

entity PT_TMOFRS { //Offers
        TenderID              : String(50) not null;
    key OfferID               : String(30) not null;
        CountryCode           : String(2) not null;
        TenderOfferNo         : Integer;
        RevisedOfferNo        : Integer;
        ActiveOffer           : Integer;
        CloneOfferID          : String(255);
        CreationDate          : Date;
        SubmissionDate        : Date;
        SubmittedOn           : Date;
        SubmittedBy           : String(255);
        Active                : Integer;
        DistributorID         : Integer;
        InternalBidDueDate    : Date;
        SellingCompany        : String(3);
        ProductCount          : Integer;
        Currency              : String(255);
        ManualSaveStatus      : String(3);
        WholesaleOffer        : String(3);
        Comment               : String(500);
        OfferRevisionSplitNo  : Integer;
        NewOfferDueDate       : Date;
        ContinuationOfferNo   : Integer;
        APPROVALS_SENT        : Integer;
        FOCType               : String(255);
        DEFAULT_FOC_ABS_PCT   : String(4);
        //Associations
        Tender                : Association to PT_TMTEND
                                    on Tender.TenderID = TenderID;
        Distributor           : Association to MasterData.PT_TMDIST
                                    on Distributor.DistributorID = DistributorID;
        Product               : Association to many PT_TMOFPR
                                    on Product.OfferID = OfferID and Product.Active = Active;
        OfferStatusTable      : Association to PT_TMTNOFST
                                    on OfferStatusTable.OfferID = OfferID
                                    and OfferStatusTable.Active = Active;
        OfferStatus:Association to TransactionalDataViews.OfferStatus on OfferStatus.OFFER_ID = OfferID;
        SellingCompanyDetails : Association to MasterData.PT_TMLE
                                    on SellingCompanyDetails.LegalEntityCode = SellingCompany;
        Quotation             : Association to PT_TMQUTO
                                    on Quotation.OfferID = OfferID
                                    and Quotation.Active = Active;
        Revision              : Association to TransactionalDataViews.OfferRevisions
                                    on  Revision.TENDERID       = TenderID
                                    and Revision.TENDEROFFERNO  = TenderOfferNo;
        OfferValue            : Association to TransactionalDataViews.OfferValues
                                    on OfferValue.OFFER_ID = OfferID;
        PfiNumber             : Association to PT_TMPFIOM
                                    on PfiNumber.OfferID = OfferID;
        Signatories           : Association to many MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES
                                    on  Signatories.COUNTRY_CODE     = CountryCode
                                    and Signatories.LEGAL_ENTITY_CODE = SellingCompany;
        Country               : Association to MasterData.PT_TMCTRY
                                    on Country.CountryCode = CountryCode;
}

entity OfferView as
    select from PT_TMOFRS as offer {
        *,
        OfferStatus
    };

entity PT_OFGRPUR {
        TenderID      : String(50);
    key OfferID       : String(30) not null;
        RegionCode    : String(2);
        CountryCode   : String(2);
        SubmittedOn   : Date;
        SubmittedBy   : String(255);
    key Active        : Integer not null;
    key ProductCode   : Integer not null;
    key InstituteID   : Integer not null;
        DistributorID : Integer;
        Requested     : Integer;
        KeyForRestore : String(255);
        //Associations
        Institute     : Association to MasterData.PT_TMINST
                            on Institute.InstituteID = InstituteID;
}

entity PT_SCENARIOPLAN {
        TenderID              : String(50);
    key OfferID               : String(30) not null;
        CountryCode           : String(2);
    key ProductCode           : Integer not null;
        SubmittedOn           : Date;
        SubmitedBy            : String(255);
    key Active                : Integer not null;
    key Scenario              : Integer not null;
        Name                  : String(255);
        Description           : String(255);
        Volume                : Integer;
        OfferPrice            : Double;
        FOC_ABS_PCT           : String(10);
        FOC                   : Double;
        FOCType               : String(10);
        FOC_ABS_PCT_Bundled_1 : String(10);
        FOC_Bundled_1         : Double;
        FOCProduct_Bundled_1  : String(30);
}

entity PT_TENDGRPPUR {
        TenderID      : String(50);
    key OfferID       : String(30);
        CountryCode   : String(2);
    key ProductCode   : Integer;
    key InstituteID   : Integer;
        SubmittedOn   : Date;
        SubmittedBy   : String(255);
    key Active        : Integer;
        AwardedQty    : String(15);
        KeyForRestore : String(255);
}

entity PT_TMAPPRST {
        TenderID            : String(50);
    key OfferId             : String(30) not null;
        CountryCode         : String(2);
    key productcode         : Integer not null;
        ApprovalContent     : String(100);
        ApproverTypeSection : Integer;
        ApprovalStatus      : String(100);
        ApproverName        : String(100);
    key ApproverEmailID     : String(100) not null;
        SenderComment       : String(500);
        ApproverComment     : String(500);
    key Active              : Integer not null;
        Hierarchy           : Integer;
        AP_ID               : String(10);
        RestoreKey          : String(100);
    key Statustime          : DateTime not null;
        Submittedby         : String(100);
        ApproverDate        : Date;
    key ApproverType        : String(30) not null;
        FLOW_ID             : String(255);
        REQUIRED_ACTION     : String(12);
        //Associations
        OfferProduct        : Association to PT_TMOFPR
                                  on  OfferProduct.OfferID     = OfferId
                                  and OfferProduct.ProductCode = productcode
                                  and OfferProduct.Active = Active
}

entity PT_TMAWRDCR {
    key TENDERID      : String(50) not null;
        COUNTRYCODE   : String(2);
        SUBMITTEDON   : Date;
        Submittedby   : String(100);
    key Active        : Integer not null;
    key AwardCriteria : String(100) not null;
        Weight        : Double;
        //Associations
        Tender        : Association to PT_TMTEND
                            on Tender.TenderID = TENDERID;
}

entity Specifications : cuid, managed {
    key TenderID    : String(50) not null;
        CountryCode	: String(2);   
        Name		: String(50);
        Tender      : Association to PT_TMTEND on Tender.TenderID = TenderID;
}

entity PT_TMBDPR {
        TenderID              : String(50) not null;
    key OfferID               : String(30) not null;
        CountryCode           : String(2) not null;
    key ProductCode           : Integer not null;
        SubmittedOn           : Date;
        SubmittedBy           : String(255);
    key Active                : Integer not null;
        Tier                  : Integer;
        VolumeFrom            : Integer;
        VolumeTo              : Integer;
        RegPrice              : Double;
        FOC                   : Double;
        FOCType               : String(255);
        Discount              : Double;
        OfferPrice            : Double;
        Deductions            : Double;
        NetofferPrice         : Double;
        WholesalePrice        : String(50);
        COGS                  : Double;
        SpotRate              : Double;
        BudgetRate            : Double;
        Scenario              : Integer;
        FOC_ABS_PCT           : String(4);
        FOC_Bundled_1         : Double;
        FOC_ABS_PCT_Bundled_1 : String(4);
        FOCProduct_Bundled_1  : Integer;
    key ActiveTier            : Integer not null;
        NetPrice              : Double;
        NetPrice_OfPaid       : Double;
        PRICE_UPDATE          : Integer;
        //Associations
        Product               : Association to PT_TMOFPR
                                    on  Product.OfferID     = OfferID
                                    and Product.ProductCode = ProductCode;
        Bundled_1_Cogs        : Association to MasterDataLatestValues.CountryCogs
                                    on  Bundled_1_Cogs.COUNTRY_CODE = CountryCode
                                    and Bundled_1_Cogs.PRODUCT_ID   = FOCProduct_Bundled_1;
        Bundled_1_SKU         : Association to MasterData.PT_TMPRDPCK
                                    on Bundled_1_SKU.PRODUCTPACKID = FOCProduct_Bundled_1;
}


entity PT_TMDLVTR {
        TenderID               : String(50);
    key OfferID                : String(30) not null;
        CountryCode            : String(2);
        InstituteID            : Integer;
        SKUCode                : Integer;
        SubmittedOn            : Date;
        SubmittedBy            : String(255);
        Active                 : Integer not null;
        LocalOrDirectDelivery  : String(255);
        PlannedInAPO           : String(255);
        RequestedDeliveryDate  : Date;
        RequestedQuantity      : Double;
        ActualDeliveryDate     : Date;
        ActualDeliveryQuantity : Double;
        Penalty                : String(255);
        PenaltyValue           : Double;
        Currency               : String(4);
        PenaltyReason          : String(255);
        UndertakingLetters     : String(4);
        Compensated            : String(4);
        CompensationComment    : String(255);
    key ProductCode            : Integer not null;
        PaidOrFree             : String(255);
        PO                     : String(255);
        InvoiceNo              : String(255);
    key SNo                    : Integer not null;
}


entity PT_TMOFPR {
        TenderID                 : String(50) not null;
    key OfferID                  : String(30) not null;
        CountryCode              : String(2);
        SubmittedOn              : Date;
        SubmittedBy              : String(255);
    key Active                   : Integer not null;
    key ProductCode              : Integer not null;
        Reference                : String(255);
        AlternateOfferYN         : String(255);
        RequestedVolume          : Integer;
        UnitPerPack              : String(255);
        SampleYN                 : String(255);
        SampleQuantity           : Integer;
        DocumentsRequired        : String(255);
        FirstShipment            : String(255);
        NoofLots                 : Integer;
        IntervalBetweenShipments : Integer;
        NoOfTier                 : Integer;
        DiscOrOffer              : String(255);
        PaymentTerms             : String(255);
        DistributorID            : Integer;
        SNo                      : Integer;
        ActiveProduct            : Integer;
        Comment                  : String(500);
        INCOTerms                : String(500);
        SORTER                   : Integer;
        DEFAULT_COMMISSION_RATE  : Double;
        SUPPLY_UPDATE            : Integer;
        PAYMENT_UPDATE           : Integer;
        Line                     : String;
        //Associations
        Offer                    : Association to PT_TMOFRS
                                       on Offer.OfferID = OfferID;
        SKU                      : Association to MasterData.PT_TMPRDPCK
                                       on SKU.PRODUCTPACKID = ProductCode;
        SKUCountry               : Association to MasterData.PT_TMCTPRDPCK
                                       on  SKUCountry.PRODUCTPACKID = ProductCode
                                       and SKUCountry.COUNTRYCODE   = CountryCode;
        Price                    : Association to PT_TMBDPR
                                       on  Price.ProductCode = ProductCode
                                       and Price.OfferID     = OfferID
                                       and Price.Active = Active;
        RegisteredPrice          : Association to many MasterDataLatestValues.CountryRegisteredPrice
                                       on  RegisteredPrice.COUNTRY_CODE = CountryCode
                                       and RegisteredPrice.PRODUCT_ID   = ProductCode;
        Cogs                     : Association to MasterDataLatestValues.CountryCogs
                                       on  Cogs.COUNTRY_CODE = CountryCode
                                       and Cogs.PRODUCT_ID   = ProductCode;
        Results                  : Association to many PT_TMTRRES
                                       on  Results.OfferID     = OfferID
                                       and Results.ProductCode = ProductCode
                                       and Results.Active = Active;
        ApprovalStatus           : Association to TransactionalDataViews.ApprovalRequests
                                       on ApprovalStatus.OfferId = OfferID;
        PreviousApproval         : Association to TransactionalDataViews.PreviousApproval
                                       on  PreviousApproval.OFFER_ID   = OfferID
                                       and PreviousApproval.PRODUCT_ID = ProductCode;
        Deliveries               : Association to many PT_TMDLVTR
                                       on  Deliveries.OfferID     = OfferID
                                       and Deliveries.ProductCode = ProductCode;
        Letters                  : Association to many PT_TMUDLTRS
                                       on  Letters.OFFERID = OfferID
                                       and Letters.SKUCODE = ProductCode;
        Scenario                 : Association to many PT_SCENARIOPLAN
                                       on  Scenario.OfferID     = OfferID
                                       and Scenario.ProductCode = ProductCode;
        GroupPurchasing          : Association to many PT_OFGRPUR
                                       on  GroupPurchasing.OfferID     = OfferID
                                       and GroupPurchasing.ProductCode = ProductCode
                                       and GroupPurchasing.Active = Active;
}

entity PT_TMPFIOM {
    key OfferID : String(255) not null;
        PFINo   : String(255);
}

entity PT_TMQUTO {
        TenderID          : String(50);
    key OfferID           : String(30) not null;
        CountryCode       : String(2);
        DistributorID     : Integer;
        SubmittedOn       : Date;
        SubmittedBy       : String(255);
    key Active            : Integer not null;
        OfferValidity     : Date;
        DelayInSubmission : String(50);
        AS1               : String(255);
        AS2               : String(255);
    key OfferDate         : Date not null; //removed key
        DeliveryTerms     : String(5000);
        I_Q_1             : String(255);
        I_Q_2             : String(255);
        I_Q_3             : String(255);
        Comment           : String(500);
        UPDATED           : Integer;
        //Associations
        Offer             : Association to PT_TMOFRS
                                on Offer.OfferID = OfferID;
}


entity PT_TMTEND {
    key TenderID             : String(50) not null;
        CountryCode          : String(2) not null;
        ToolID               : Integer;
        TenderNo             : Integer;
        CloneTenderID        : String(50);
        SubmittedOn          : Date;
        SubmittedBy          : String(50);
        Active               : Integer;
        Classification       : String(50);
        BindingTypeLevel1    : String(50);
        BindingTypeLevel2    : String(50);
        BindingTypeLevel3    : String(50);
        HighValue            : Boolean;
        OfferStartDate       : Date;
        IbizID               : String(50);
        PublicNotice         : String;
        TenderName           : String(250);
        InstituteID          : Integer not null;
        TenderChannel        : String(255);
        GroupPurchasing      : Integer;
        PublicationDate      : Date;
        BidDueDate           : Date;
        AwardDate            : Date;
        NextPublicationDye   : Date;
        ContractLength       : Integer;
        ContractExtenseion   : Integer;
        TenderStatus         : String(255);
        ManualSaveStatus     : String(50);
        FoldersCreated       : Integer;
        TENDER_TYPE_ID       : Integer;
        CONTRACT_TYPE_ID     : Integer;
        SALES_TYPE_ID        : Integer;
        TENDER_ORIGIN_ID     : Integer;
        PROCUREMENT_METHOD_ID: String;
        PROCUREMENT_REASON   : String;
        //Associations
        Institute           : Association to MasterData.PT_TMINST
                                  on Institute.InstituteID = InstituteID; //OK
        Offer               : Association to many PT_TMOFRS
                                  on Offer.TenderID = TenderID
                                  and Offer.Active = Active;
        OfferView               : Association to many OfferView
                                  on OfferView.TenderID = TenderID;
        // OfferStatus               : Association to many TransactionalDataViews.OfferStatus
        //                           on OfferStatus.TENDER_ID = TenderID;
        Criteria            : Association to many PT_TMAWRDCR
                                  on Criteria.TENDERID = TenderID;
        Specifications      : Association to many Specifications on Specifications.TenderID = TenderID;
        Brands              : Association to many TransactionalDataViews.BrandsInTender
                                  on Brands.TENDERID = TenderID;
        NextOfferId         : Association to TransactionalDataViews.TenderOffers
                                  on NextOfferId.TENDERID = TenderID; //OK
        TenderValue         : Association to TransactionalDataViews.TenderOffers
                                  on TenderValue.TENDERID = TenderID; //Fake - we don't use this any more - remove from expand in UI5 to remove
        Origin              : Association to MasterData.MASTER_TENDER_ORIGIN
                                  on Origin.ID = TENDER_ORIGIN_ID; //OK
        CommercialAgreement : Association to many MasterData.MASTER_COMMERCIAL_AGREEMENT
                                  on  CommercialAgreement.COUNTRY_CODE   = CountryCode
                                  and CommercialAgreement.TENDER_TYPE_ID = TENDER_TYPE_ID; //OK
        Country               : Association to MasterData.PT_TMCTRY
                                    on Country.CountryCode = CountryCode;
}

entity PT_TMTNOFST {
    key TenderID    : String(50) not null;
    key OfferID     : String(30) not null;
        CountryCode : String(2);
    key Active      : Integer not null;
        STATUS      : String(255);
        Date        : Date;
}

entity PT_TMTRRES {
        TenderID          : String(50);
    key OfferID           : String(30) not null;
        CountryCode       : String(2);
        InstituteID       : Integer;
    key ProductCode       : Integer not null;
        ContractNo        : String(50);
        SubmittedOn       : Date;
        SubmittedBy       : String(255);
        Active            : Integer;
        ErrorInSubmission : String(255);
        Outcome           : String(255);
        AwardedCompany    : String(255);
        AwardedProduct    : String(255);
        AwardedPrice      : Double;
        Currency          : String(255);
        AwardedQty        : Integer;
        UoM               : String(255);
        Reason            : String(255);
        Comment           : String(255);
        AwardedTier       : Integer;
        //Associations
        CompetitorResult  : Association to many TransCompetitorResult
                                on  CompetitorResult.OFFERID     = OfferID
                                and CompetitorResult.PRODUCTCODE = ProductCode;
}

entity PT_TMUDLTRS {
        TENDERID          : String(50);
    key OFFERID           : String(30) not null;
        COUNTRYCODE       : String(2);
        INSTITUTEID       : Integer;
    key SKUCODE           : Integer not null;
        SUBMITTEDON       : Date;
        SUBMITTEDBY       : String(100);
        ACTIVE            : Integer not null;
        REASONFORLETTER   : String(500);
        QUANTITY          : Integer;
        BATCH             : String(100);
        MANUFACTURINGDATE : Date;
        EXPIRYDATE        : Date;
        RETURNDATE        : Date;
        RETURNEDQTY       : Integer;
        UOM               : String(40);
    key SNO               : Integer not null;
}

entity TransCompetitorResult {
    key OFFERID        : String(30) not null;
    key PRODUCTCODE    : Integer not null;
        OUTCOME        : String(255);
    key AWARDEDCOMPANY : String(255) not null;
        AWARDEDPRODUCT : String(255);
        AWARDEDPRICE   : Double;
        CURRENCY       : String(3);
        AWARDEDQTY     : Integer;
        UOM            : String(255);
        REASON         : String(255);
        COMMENT        : String(255);
        LASTUPDATE     : Date;
        UPDATEDBY      : String(255);
        DELETED        : Integer;
}
