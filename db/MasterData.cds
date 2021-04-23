namespace com.bayer.SXTENDER.MasterData;
using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.TransactionalData } from './TransactionalData';
using { com.bayer.SXTENDER.MasterDataLatestValues } from './MasterDataLatestValues';
using { com.bayer.SXTENDER.AdminData } from './AdminData';

//Country
entity PT_TMCTRY{
	key CountryCode:String(2) not null;
	CountryName:String(50);
	ApprovalType:Integer;
	LocalCurrency:hana.NCHAR(3);//String(3);
	ReportingCurrency:String(3);
	CountryID:Integer;//delete
	Region:String(50);
	COMMENT:String(255);
	//Associations
	LegalEntities:Association to many PT_TMCTLE on LegalEntities.Country = $self;
	EntityBrands:Association to many PT_TMCTLEBR on EntityBrands.Country = $self;
	DistributorBrands:Association to many PT_TMDISBRD on DistributorBrands.Country = $self;
	CountryPacks: Association to many PT_TMCTPRDPCK on CountryPacks.Country = $self;
	InstituteDistributorBrands: Association to many PT_TMINDSBR on InstituteDistributorBrands.Country = $self;
	InstituteBrandTerms:Association to many PT_TMINSBRTR on InstituteBrandTerms.Country = $self;
	Institutes:Association to many PT_TMINST on Institutes.Country = $self;
	RegisteredPrices:Association to many PT_TMREGPR on RegisteredPrices.Country = $self;
	ProductPackSKUs:Association to many PT_TMSKUPRDPCK on ProductPackSKUs.Country = $self;
	LegalEntitySignatories:Association to many COUNTRY_LEGAL_ENTITY_SIGNATORIES on LegalEntitySignatories.Country = $self;
	ApprovedPrices:Association to many MASTER_APPROVED_PRICE on ApprovedPrices.Country = $self;
	CommercialAgreements:Association to many MASTER_COMMERCIAL_AGREEMENT on CommercialAgreements.Country = $self;
	ContractTypes:Association to many MASTER_COUNTRY_CONTRACT_TYPE on ContractTypes.Country = $self;
	SalesType:Association to many MASTER_COUNTRY_SALES_TYPE on SalesType.Country = $self;
	TenderOrigins:Association to many MASTER_COUNTRY_TENDER_ORIGIN on TenderOrigins.Country = $self;
	TenderTypes:Association to many MASTER_COUNTRY_TENDER_TYPE on TenderTypes.Country = $self;
	Approvers:Association to many CountryApprovers on Approvers.Country = $self;
	Cogs:Association to many PT_TMCOGS on Cogs.Country = $self;
	RCM:Association to many PT_TMRCM on RCM.Country = $self;
	RegionStructure:Association to many PT_TMREGIONSTRUC on RegionStructure.CountryLink = $self;
	Distributors:Association to many PT_TMDIST on Distributors.Country = $self;
	User:Association to AdminData.PT_TMUSERCTRY on User.CountryCode = CountryCode and User.ActiveRecord = 'Yes';
}

//Institute
entity PT_TMINST{
	key CountryCode:String(2) not null;//remove from key
	key InstituteID:Integer not null;
	CustomerID:Integer;//delete
	InstituteName:String(500);
	InstituteType:String(50);
	Address:String(500);
	ContactNo:String(50);
	Fax:String(50);
	ContactPerson:String(100);
	ActiveRecord:String(10);
	Comment:String(500);
	City:String(255);
	INSTITUTE_HIERARCHY_ID:Integer;
	//Associations
	InstituteDistributorBrands:Association to many PT_TMINDSBR on InstituteDistributorBrands.Institute = $self;
	InstituteBrandTerms:Association to many PT_TMINSBRTR on InstituteBrandTerms.Institute = $self;
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	Children:Association to many PT_TMINSHIER on Children.Parent = $self;
	Terms:Association to many PT_TMINSBRTR on Terms.Institute = $self;
	Hierarchy:Association to MASTER_INSTITUTE_HIERARCHY on Hierarchy.ID = INSTITUTE_HIERARCHY_ID;
}

//Institute Hierarchy Level
entity MASTER_INSTITUTE_HIERARCHY {
	key ID:Integer not null;
	NAME:String(50);
	//Associations
	Institute:Association to PT_TMINST on Institute.INSTITUTE_HIERARCHY_ID = ID;
}

//Distributor
entity PT_TMDIST{
	key CountryCode:String(2) not null;//remove from key
	key DistributorID:Integer not null;
	DistributorName:String(500);
	Address:String(500);
	ContactNo:String(500);
	Fax:String(500);
	ContactPerson:String(500);
	ActiveRecord:String(10);
	CONTACT_EMAIL:String(100);
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	DistributorBrands:Association to many PT_TMDISBRD on DistributorBrands.Distributor = $self;
	InstituteDistributorBrands:Association to many PT_TMINDSBR on InstituteDistributorBrands.Distributor = $self;
}

//Product Pack
entity PT_TMPRDPCK{
	key PRODUCTPACKID:Integer not null;
	PRODUCTPACKNAME:String(100);
	PRESENTATION:String(50);
	UOM:String(10);
	key ACTIVERECORD:String(10);
	HLEVEL6_CODE:String(50);
	CONCENTRATION:hana.REAL;
	PACKFACTOR:hana.REAL;
	PCIName:String(255);
	MoleculeName:String(255);
	//Associations
	COGS:Association to many PT_TMCOGS on COGS.ProductPack = $self;
	CountryPacks:Association to many PT_TMCTPRDPCK on CountryPacks.ProductPack = $self;
	Product: Association to PT_TMPRDHIER on Product.HLEVEL6_CODE = HLEVEL6_CODE;
	RegisteredPrices:Association to many PT_TMREGPR on RegisteredPrices.ProductPack = $self;
	ProductPackSKUs:Association to many PT_TMSKUPRDPCK on ProductPackSKUs.ProductPack = $self;
}

//Legal Entities (Selling Company)
entity PT_TMLE{
	LegalEntityID:Integer; //TODO: to be discussed if still needed -> still used for association
	key LegalEntityCode:String(3) not null;
	LegalEntityName:String(300);
	BankDetails:String(300);
	Letterhead:String(500);
	Remarks:String(300);
	AuthorizedSignatory1:String(300);//delete
	AuthorizedSignatory2:String(300);//delete
	AuthorizedSignatory3:String(300);//delete
	AuthorizedSignatory4:String(300);//delete
	AuthorizedSignatory5:String(300);//delete
	FooterComment:String(300);
	//Associations
	EntityBrands:Association to many PT_TMCTLEBR on EntityBrands.Entity = $self;
	Signatories:Association to many COUNTRY_LEGAL_ENTITY_SIGNATORIES on Signatories.LEGAL_ENTITY_CODE = LegalEntityCode;
	Countries:Association to many PT_TMCTLE on Countries.LegalEntity = $self;
}

//Legal Entity Signatories
entity COUNTRY_LEGAL_ENTITY_SIGNATORIES {
	key LEGAL_ENTITY_CODE:String(3) not null;
	key COUNTRY_CODE:String(2) not null;
	key AUTHORIZED_SIGNATORY:String(5000) not null;
	NAME:String(5000);
	TITLE:String(5000);
	SORTER:Integer;
	//Associations
	LegalEntity:Association to PT_TMLE on LegalEntity.LegalEntityCode = LEGAL_ENTITY_CODE;
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
}

//Registered Prices
entity PT_TMREGPR{
	RegisteredPriceID:Integer;//TODO: check if needed?
	key CountryCode:String(2) not null;
	key ProductPackID:Integer not null;
	key EffDate:Date not null;
	EndDate:Date;
	UOM:String(50);
	Currency:String(3);
	RegisteredPrice:Double;
	RegisteredPriceSource:String(50);
	ActiveRecord:String(10);
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	ProductPack:Association to PT_TMPRDPCK on ProductPack.PRODUCTPACKID = ProductPackID;
	CurrencyRate:Association to many PT_TMFXRTS on CurrencyRate.CurrencyFrom = Currency;
}

//COGS
entity PT_TMCOGS{
	key COGSID:Integer not null;//delete and change key
	CountryCode:String(2) not null;
	ProductPackID:Integer not null;
	EffectiveDate:Date not null;
	EndDate:Date;
	Currency:String(3);
	COGSType:String(50);
	COGS:Double;
	key ActiveRecord:String(10);
	//UOM:String(50);//new
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	ProductPack: Association to PT_TMPRDPCK on ProductPack.PRODUCTPACKID = ProductPackID;
}

//FX Rates
entity PT_TMFXRTS{
	FxID:Integer;
	key CurrencyFrom:String(3);
    key CurrencyTo:String(3);
    key ExchangeType:String(50);
    key EffDate:Date;
    key EndDate:Date;
    ExchangeRate:Double;
	key ActiveRecord:String(10);
	FXKey:String(6);//delete
    CountryCode:String(2);
	//Associations
	RegisteredPrices:Association to many PT_TMREGPR on RegisteredPrices.CurrencyRate = $self;
}

//@cds.autoexpose
//Country Approvers
entity CountryApprovers{
	key CountryCode:String(2) not null;
	key ApproverType:String(200) not null;
	key Division:String(200) not null;
	ApproverID:String(100);//remove
	ApproverName:String(200);
	key ApproverEmailID:String(200);
	//Hierarchy:Integer not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
}

//ApproverTypes (type of approvers & there corresponding values)
entity ApproverTypes {
    key ApproverType            : String(200);
    key CountryCode             : String(2);
    Hierarchy				: Integer;
    CountryApprovers        : Association to many CountryApprovers on CountryApprovers.ApproverType = ApproverType;
}


//Country legal entity
entity PT_TMCTLE{
	CountryLegalEntityID:Integer;//TODO: discuss with Jonathan
	key CountryCode:String(2)  not null;
	Brand:String(50);
	key LegalEntityID:Integer not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	LegalEntity: Association to PT_TMLE on LegalEntity.LegalEntityID = LegalEntityID;
}
//Country Legal Entity Brand
entity PT_TMCTLEBR{
	CountryLegalEntityBrandID:Integer; //TODO: discuss with Jonathan
	key CountryCode:String(2) not null;
	key LegalEntityID:Integer not null;
	key HLevel4_Code:String(50) not null;
	//Associations
	Country: Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	Entity: Association to PT_TMLE on Entity.LegalEntityID = LegalEntityID;
	Brand:Association to PT_TMPRDHIER on Brand.HLEVEL4_CODE = HLevel4_Code;
}

//Country Product Pack
entity PT_TMCTPRDPCK{
	COUNTRYPRODUCTPACKID:Integer;//TODO: discuss with Jonathan
	key COUNTRYCODE:String(2) not null;
	COUNTRYOFORIGIN:String(120);
	SHELFLIFE:Integer;
	REGISTERED:Integer;//rename
	key ACTIVERECORD:String(10);
	key PRODUCTPACKID:Integer;
	MANUFACTURER:String(500);
	Presentation_2:String(1000);
	VTATax:hana.REAL;
	COMMENT:String(255);
	GOV_CODE:String(255);
	QTY_THRESHOLD:Integer;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRYCODE;
	Origin:Association to PT_TMCTRY on Origin.CountryCode = COUNTRYOFORIGIN;
	ProductPack:Association to PT_TMPRDPCK on ProductPack.PRODUCTPACKID = PRODUCTPACKID;
	COGS:Association to MasterDataLatestValues.CountryCogs on COGS.PRODUCT_ID = PRODUCTPACKID and COGS.COUNTRY_CODE = COUNTRYCODE;
}
//Brand
entity PT_TMPRDHIER{
	HLEVEL1_NAME:String(100);
	HLEVEL1_CODE:String(50);
	HLEVEL2_NAME:String(100);
	HLEVEL2_CODE:String(50);
	HLEVEL3_NAME:String(100);
	HLEVEL3_CODE:String(50);
	HLEVEL4_NAME:String(100);
	HLEVEL4_CODE:String(50);
	HLEVEL5_NAME:String(100);
	HLEVEL5_CODE:String(50);
	HLEVEL6_NAME:String(100);
	key HLEVEL6_CODE:String(50);
	//Associations
	EntityBrands:Association to many PT_TMCTLEBR on EntityBrands.Brand = $self;
	DistributorBrands:Association to many PT_TMDISBRD on DistributorBrands.Product = $self;
	InstituteDistributorBrands:Association to many PT_TMINDSBR on InstituteDistributorBrands.Product = $self;
	InstituteBrandTerms:Association to many PT_TMINSBRTR on InstituteBrandTerms.Product = $self;
	ProductPacks:Association to many PT_TMPRDPCK on ProductPacks.Product = $self;
	TA:Association to many PT_TMTABRMP on TA.Product = $self;
}

//Distributor Brand
entity PT_TMDISBRD{
	DistributorBrandID:Integer;//TODO: to be discussed if still needed
	key CountryCode:String(2) not null;
	CommissionRate:Double;
	INCOTerms:String(500);
	PaymentTerms:String(500);
	key ActiveRecord:String(10);
	key DistributorID:Integer not null;
	key HLevel4_Code:String(50) not null;
	//Associations
	Country: Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	Distributor:Association to PT_TMDIST on Distributor.DistributorID = DistributorID;
	Product:Association to many PT_TMPRDHIER on Product.HLEVEL4_CODE = HLevel4_Code;
}

//InstituteDistributorBrand
entity PT_TMINDSBR{
	InstituteDistBrandRelationID:Integer;//TODO: discuss if still needed
    key CountryCode:String(2) not null;
    Commissionrate:Double;
	key ActiveRecord:String(10) not null;
    key InstituteID:Integer not null;
    key DistributorID:Integer not null;
    key HLevel4_Code:String(50) not null;
    //Associations
    Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
    Institute:Association to PT_TMINST on Institute.InstituteID = InstituteID;
    Distributor:Association to PT_TMDIST on Distributor.DistributorID = DistributorID;
    Product:Association to many PT_TMPRDHIER on Product.HLEVEL4_CODE = HLevel4_Code;
}

//Institute Brand Terms
entity PT_TMINSBRTR{
	InstituteBrandTermsID:Integer;//TODO: discuss if needed
    key CountryCode:String(2) not null;
    INCOTerms:String(500);
	PaymentTerms:String(500);
	key ActiveRecord:String(10) not null;
    key InstituteID:Integer not null;
    key HLevel4_Code:String(50) not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	Institute:Association to PT_TMINST on Institute.InstituteID = InstituteID;
	Product:Association to many PT_TMPRDHIER on Product.HLEVEL4_CODE = HLevel4_Code;
}

//Institute Hierarchy
entity PT_TMINSHIER{
	InstituteRelationID:Integer;//TODO: Check if needed?
	key ActiveRecord:String(10) not null;
    key ParentInstituteID:Integer not null;
    key InstituteID:Integer not null;
	//Associations
    Parent:Association to PT_TMINST on Parent.InstituteID = ParentInstituteID;
    Institute: Association to PT_TMINST on Institute.InstituteID = InstituteID;
}

//Product Pack SKU
entity PT_TMSKUPRDPCK{
    CountrySKUID:Integer;//TODO: check if needed?
    key CountryCode:String(2) not null;
    key ActiveRecord:String(10) not null;
    key ProductPackID:Integer not null;
    key SKUCode:Integer not null;
	//Associations
    Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	ProductPack:Association to PT_TMPRDPCK on ProductPack.PRODUCTPACKID = ProductPackID;
}

//Approved prices
entity MASTER_APPROVED_PRICE{
	key COUNTRY_CODE:String(2) not null;
	key PRODUCT_ID:Integer not null;
	key EFFECTIVE_DATE:Date not null;
	key CURRENCY:String(3) not null;
	UOM:String(50);
	APPROVED_PRICE:Double;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
	ProductPack:Association to PT_TMPRDPCK on ProductPack.PRODUCTPACKID = PRODUCT_ID;
}

entity MASTER_COMMERCIAL_AGREEMENT{
	key COUNTRY_CODE:String(2) not null;
	key TENDER_TYPE_ID:Integer not null;
	key COUNTRY_OF_ORIGIN:String(50) not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
	TenderType:Association to MASTER_TENDER_TYPE on TenderType.ID = TENDER_TYPE_ID;
}

entity MASTER_CONTRACT_TYPE{
	key ID:Integer not null;
	NAME:String(50);
	//Associations
	CountryCountractType: Association to many MASTER_COUNTRY_CONTRACT_TYPE on CountryCountractType.ContractType = $self;
}

entity MASTER_COUNTRY_CONTRACT_TYPE{
	key COUNTRY_CODE:String(2) not null;
	key CONTRACT_TYPE_ID:Integer not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
	ContractType:Association to MASTER_CONTRACT_TYPE on ContractType.ID = CONTRACT_TYPE_ID;
}

entity MASTER_COUNTRY_PROCUREMENT_METHOD{
	key COUNTRY_CODE:String(2) not null;
	key PROCUREMENT_METHOD_ID:String not null;
	SORTER:Integer;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
}

entity MASTER_COUNTRY_SALES_TYPE{
	key COUNTRY_CODE:String(2) not null;
	key SALES_TYPE_ID:Integer not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
	SalesType:Association to MASTER_SALES_TYPE on SalesType.ID = SALES_TYPE_ID;
}

entity MASTER_COUNTRY_TENDER_ORIGIN{
	key COUNTRY_CODE:String(2) not null;
	key TENDER_ORIGIN_ID:Integer not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
	TenderOrigin:Association to MASTER_TENDER_ORIGIN on TenderOrigin.ID = TENDER_ORIGIN_ID;
}

entity MASTER_COUNTRY_TENDER_TYPE{
	key COUNTRY_CODE:String(2) not null;
	key TENDER_TYPE_ID:Integer not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
	TenderType:Association to MASTER_TENDER_TYPE on TenderType.ID = TENDER_TYPE_ID;
}

entity MASTER_SALES_TYPE{
	key ID:Integer not null;
	NAME:String(50);
	//Associations
	CountrySalesType:Association to many MASTER_COUNTRY_SALES_TYPE on CountrySalesType.SalesType = $self;
}

entity MASTER_TENDER_ORIGIN{
	key ID:Integer not null;
	NAME:String(50);
	CODE:String(2);
	//Associations
	CountryTenderOrigin:Association to many MASTER_COUNTRY_TENDER_ORIGIN on CountryTenderOrigin.TenderOrigin = $self;
}


entity MASTER_TENDER_TYPE{
	key ID:Integer not null;
	NAME:String(50);
	//Associations
	CountryTenderType:Association to many MASTER_COUNTRY_TENDER_TYPE on CountryTenderType.TenderType = $self;
	CommercialAgreement:Association to many MASTER_COMMERCIAL_AGREEMENT on CommercialAgreement.TenderType = $self;
}

entity MASTER_COUNTRY_STATUS{
	key CountryCode:String(2);
	key Status:String(60);
	Sorter:Integer;
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
}

entity PT_TMOUTRS{
	key TenderOutcomeReasons:String(255) not null;
	key Outcome:String(4) not null;
}

entity PT_TMPNLTYRS{
	key PenaltyReasons:String(255) not null;
}

entity PT_TMRCM{
	key CountryCode:String(2) not null;
	SubRegion:String(50) not null;
	//Associations
	Country:Association to PT_TMCTRY on Country.CountryCode = CountryCode;
}

entity PT_TMREGIONSTRUC{
	Region:String(50);
	key RegionCode:String(2);
	Country:String(100);
	key CountryCode:String(2);
	//Associations
	CountryLink:Association to PT_TMCTRY on CountryLink.CountryCode = CountryCode;
}

entity PT_TMTABRMP{
	TABrandID:Integer;
	TA:String(50);
	key TAShort:String(50) not null;
	key HLevel4_Code:String(50) not null;
	//Associations
	Product:Association to many PT_TMPRDHIER on Product.HLEVEL4_CODE = HLevel4_Code;
}

entity BUDGETEDPROFITABILITY{
	key COUNTRYCODE:String(2);
	key HLEVEL4_CODE:String(255);
	key EFFECTIVEDATE:Date;
	ENDDATE:Date;
	PROFITABILITY:Double;
}

entity MASTER_COUNTRY_CLASSIFICATION : cuid {
	COUNTRY_CODE:String(2) not null;
	CLASSIFICATION:String(50);
	Country:Association to PT_TMCTRY on Country.CountryCode = COUNTRY_CODE;
}

entity MASTER_COUNTRY_CHANNELS: cuid, managed {
    ChannelName : String(30);
    ChannelCountry : String(2);
	Country:Association to PT_TMCTRY on Country.CountryCode = ChannelCountry;
}

entity MasterCountryBindingTypeLevel1: cuid, managed {
	CountryCode			: String(2);
	ClassificationID	: UUID not null;
	Name				: String(50);
	Country				: Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	BindingTypeLevel2	: Association to many MasterCountryBindingTypeLevel2 on BindingTypeLevel2.BindingTypeLevel1 = $self;
}

entity MasterCountryBindingTypeLevel2: cuid, managed {
	CountryCode			: String(2);
	BindingTypeLevel1ID	: UUID not null;
	Name				: String(50);
	Country				: Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	BindingTypeLevel1	: Association to MasterCountryBindingTypeLevel1 on BindingTypeLevel1.ID = BindingTypeLevel1ID;
	BindingTypeLevel3	: Association to many MasterCountryBindingTypeLevel3 on BindingTypeLevel3.BindingTypeLevel2 = $self;
}

entity MasterCountryBindingTypeLevel3: cuid, managed {
	CountryCode			: String(2);
	BindingTypeLevel2ID	: UUID not null;
	Name				: String(50);
	Country				: Association to PT_TMCTRY on Country.CountryCode = CountryCode;
	BindingTypeLevel2	: Association to MasterCountryBindingTypeLevel2 on BindingTypeLevel2.ID = BindingTypeLevel2ID;
}

entity MasterCountrySpecifications: cuid, managed {
	CountryCode			: String(2);
	ClassificationID	: UUID not null;
	Name				: String(50);
	Country				: Association to PT_TMCTRY on Country.CountryCode = CountryCode;
}

entity AccountPreApprovedPrices: cuid, managed {
	COUNTRY_CODE		: String(2);
	INSTITUTE_ID		: Integer;
	PRODUCT_ID			: Integer;
	CURRENCY			: String(3);
	MIN_PACK_PRICE		: Double;
	MIN_UNIT_PRICE		: Double;
	MIN_PACK_NET_PRICE	: Double;
	MIN_UNIT_NET_PRICE	: Double;
}

entity MasterCompetitors: cuid, managed {
	CountryCode			: String(2); //Bayer
	ProductCode			: Integer;  //Bayer
	CompetitorProduct	: String(300); 
	CompetitorCompany	: String(300);
}

//Brand specific Policy settings
entity BrandPolicies: cuid, managed {
    ValidFrom       	: Timestamp; //temphttps://cap.cloud.sap/docs/guides/temporal-data#serving-temporal-data
    ValidTo         	: Timestamp;
    CountryCode     	: String(2);
    BrandId         	: String(50);
	StandardDiscount 	: Double;
}; 

//Distributor specific Policy
entity DistributorBrandPolicies: cuid, managed {
	ValidFrom       	: Timestamp; //temphttps://cap.cloud.sap/docs/guides/temporal-data#serving-temporal-data
    ValidTo         	: Timestamp;
    CountryCode     	: String(2);
    BrandId         	: String(50);
	DistributorId   	: Integer not null;
	StandardDiscount 	: Double;
}; 