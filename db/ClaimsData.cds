namespace com.bayer.SXTENDER.ClaimsData;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';



entity ClaimFiles : managed, cuid {
    CountryCode             : String not null;//based on selected country on UI
    ClaimFileFormat         : String not null;//not sure... possibly a conventional number that allows identify file-specific processing
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
    ApprovalsCount          : Integer;
    ClaimData               : Association to many ClaimData on ClaimData.ClaimFiles = $self;
    AllianceHealthcare      : Association to AllianceHealthcareData;
    Ovidius                 : Association to OvidiusData;
    Brocacef                : Association to BrocacefData;
    Pluripharm              : Association to PluripharmData;
    FrescoFarma             : Association to FrescoFarmaData;
    ContrastAgentSalesData  : Association to many ContrastAgentSalesData on ContrastAgentSalesData.ClaimFiles = $self;    
    ClaimApprovals          : Association to many ClaimApprovals on ClaimApprovals.ClaimFiles = $self;    
};

entity ClaimData : managed, cuid {
    CountryCode                             : String;
    OfferID                                 : String;   //link to offer mapped to claim line item
    ProductPackID                           : Integer;  //link to product within offer mapped on claim line item
    MainInstituteID                         : Integer;  //set based on customer mapping on each line of file
    ChildInstituteID                        : Integer;  //set based on customer mapping on each line of file
    MainInstituteName                       : String;
    ChildInstituteName                      : String;
    DistributorID                           : Integer;
    Date                                    : Date; //coming in the extract (date when sales is excuted)
    Type                                    : String;
    Quantity                                : Double; //coming in the extract
    WholesalerPurchasePrice                 : Double; //coming in the extract 
    WholesalerDistributionArrangement       : Double; //coming in the extract (if not calculate)
    AppliedWholesalerCorrection             : Double; //coming in the extract
    WholesalerContractPrice                 : Double; //coming in the extract
    TotalClaim                              : Double; //coming in the extract
    MainCustomerForContract                 : String;
    FASTPendingCorrection                   : Double;
    BrandContractVolume                     : Double;
    PercentageUsage                         : Double;
    BrandId                                 : String;
    BrandName                               : String;
    Balance                                 : Integer;
    BrandUsedVolume                         : Double;
    WholesalerContractPriceClaim            : Double;
    WholesalerDistributionArrangementClaim  : Double; 
    TotalWholesalerClaim                    : Double;
    FASTContractClaim                       : Double; 
    FASTDistributionArrangementClaim        : Double;
    TotalFASTClaim                          : Double;
    PercentageDifference                    : Double;
    Status                                  : String;
    Comment                                 : String;
    FASTWholesalerPurchasePrice             : Double;
    FASTContractPrice                       : Double;
    FASTDistributionArrangement             : Double;
    QC1Passed                               : Boolean;
    QC2Passed                               : Boolean;
    ClaimFiles                              : Association to ClaimFiles;
    Product                                 : Association to TransactionalData.PT_TMOFPR 
                                                on Product.OfferID = OfferID 
                                                and Product.ProductCode = ProductPackID 
                                                and Product.Active = 1;
    SKU                                     : Association to MasterData.PT_TMPRDPCK 
                                                on SKU.PRODUCTPACKID = ProductPackID;
    SKUCountry                              : Association to MasterData.PT_TMCTPRDPCK 
                                                on  SKUCountry.PRODUCTPACKID = ProductPackID 
                                                and SKUCountry.COUNTRYCODE = CountryCode;
};

entity AllianceHealthcareData: cuid, managed {
    ID                    : Integer;
    TypeRecord            : String;
    DateFrom              : Date;
    DateTo                : Date;
    IDFNumber             : String;
    EANCustomerNumber     : String;
    CustomerName          : String;
    EANNoItem             : String;
    ZIndexNumber          : String;
    ItemNoSupplier        : String;
    DiscountPercentage2   : Double;
    PurchasePrice         : Double;
    ClaimPercentage       : Double;
    ClaimAmount           : Double;
    TotalDelivered        : Integer;
    Claim1Amount          : Double;
    Claim2Amount          : Double;
    ClaimTotal            : Double;
    ClaimPeriod           : String;
    ClaimBasis            : String;
    ClaimFiles: Association to ClaimFiles on ClaimFiles.AllianceHealthcare = $self;
};

entity OvidiusData: cuid, managed{
    Klantnummer                     : Integer;
    Klantnaam                       : String;
    KlantenOvidiusPharmaceutische   : String;
    IDFNummer                       : String;
    KlantenLairesseZiekenhuis       : String;
    Periode                         : String;
    ZIndexNummer                    : String;
    ArtikelNummerLeverancier        : String;
    ArtikelNaam                     : String;
    EenheidStuks                    : Integer;
    VastePrijs                      : Double;
    Inkoopprijs                     : Double;
    Claim1PerEenheid                : Double;
    AantalGeleverd                  : Integer;
    TotaalClaim1                    : Double;
    Claim2PerEenheid                : Double;
    TotaalClaim2                    : Double;
    ClaimbedragTotaal               : Double;
    ClaimFiles: Association to ClaimFiles on ClaimFiles.Ovidius = $self;
};

entity BrocacefData: cuid, managed {
    ID                        : Integer;
    TypeRecord                : String;
    DatumVan                  : Date;
    DatumTm                   : Date;
    IDFNummerKlant            : String;
    EANNrKlant                : String;
    Klantnaam                 : String;
    EANNrArtikel              : String;
    ZINrArtikel               : String;
    ArtnrLeverancier          : String;
    NaamArtikel               : String;
    Eenheid1                  : String;
    Eenheid2                  : String;
    VastePrijs                : Double;
    Kortingsperc1             : Double;
    Kortingsperc2             : Double;
    Inkoopprijs               : Double;
    Claimpercentage           : Double;
    Claimbedrag               : Double;
    AantalGeleverd            : Integer;
    Claim1Bedrag              : Double;
    Claim2Bedrag              : Double;
    ClaimTotaal               : Double;
    ClaimPeriode              : String;
    ClaimGrondslag            : String;
    ClaimFiles: Association to ClaimFiles on ClaimFiles.Brocacef = $self;
};

entity PluripharmData: cuid, managed {
    Leverancier                        : String;
    AccountcombinatieNaam              : String;
    Klantnaam                          : String;
    Woonplaats                         : String;
    IDFCode                            : String;
    Uitleverdatum                      : Date;
    OrderNummer                        : String;
    RegelNr                            : Integer;
    Jaarweek                           : Integer;
    Jaar                               : Integer;
    KalenderMaand                      : Integer;
    ZINummer                           : String;
    ArtikelnrLeverancier               : String;
    ArtikelOmschrijving                : String;
    VerpakkingAantal                   : Integer;
    VerpakkingsEenheid                 : String;
    AIP                                : Double;
    AantalGeleverd                     : Integer;
    DAPrijs                            : Double;
    LeveranciersbijdragePercentage     : Double;
    Grondslag                          : String;
    LeveranciersbijdrageBedrag         : Double;
    TotaalLeveranciersbijdrage         : Double;
    Ultimo                             : Double;
    Betaald                            : Double;
    DAClaimPerArtikel                  : Double;
    TotaleClaimPerArtikel              : Double;
    TotaleClaimPerRegel                : Double;
    ClaimFiles: Association to ClaimFiles on ClaimFiles.Pluripharm = $self;
};

entity FrescoFarmaData: cuid, managed{
    ContractPrice       : Double;
    WPP                 : Double;
    Claim1              : Double;
    Claim2              : Double;
    Quantity            : Double;
    TotalClaim          : Double;
    Date                : Date;
    ClaimFiles: Association to ClaimFiles on ClaimFiles.FrescoFarma = $self;
};

entity ContrastAgentSalesData: cuid, managed {
    NazwaArtykulu                    : String;
    KODEANArtykulu                   : String;
    IloscSztukSprzedanychKlientowi   : Integer;
    CenaZakupuNetto                  : Double;
    PodstawaNaliczeniaMarzyNettoPNM  : Double;
    KodKlientaBayer                  : String;
    KlientNazwa                      : String;
    NrFaktury                        : String;
    DataSprzedazy                    : Date;
    RoznicaCenaZakupuPNM             : Double;
    WartoscPNM                       : Double;
    WartoscDoWyrownania              : Double;
    IloscSztukDoWyrownania           : Double;
    NrFakturyZakupu                  : String;
    ClaimFiles: Association to ClaimFiles;
};

entity SalesReportFile {
    key DistributorID   : String;
    key CountryCode     : String;
    key FileName        : String;
    key FileType        : String;
    key FilePeriod      : String;
    @Core.MediaType     : 'application/octet-stream'
    content    : LargeBinary;
};

entity ClaimApproverTypes: cuid, managed {
    CountryCode: String;
    ApproverType: String;
    ApproverCWID: String;
    ApproverName: String;
    ApproverEmail: String;
    Hierarchy: Integer;
};

entity ClaimApprovals: cuid, managed {
    ApproverName: String;
    ApproverEmail: String;
    Hierarchy: Integer;
    Status: String;
    ClaimFiles: Association to ClaimFiles;
};


