/* checksum : 40109589e31559a8eac07a6a317f3ff6 */
@cds.external : true
function ConditionContract.getBackendData() returns LargeString;

@cds.external : true
action ConditionContract.createCCMContract(
  FastCCMContractId : UUID,
  CCMContractID : UUID,
  ProductCode : LargeString
) returns LargeString;

@cds.external : true
action ConditionContract.sendFOCToInteractMail(
  FastCCMContractId : UUID,
  CCMContractID : UUID,
  ProductCode : LargeString
) returns LargeString;

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.FastConditionContracts {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  TenderID : LargeString;
  OfferID : LargeString;
  CountryCode : LargeString;
  InstituteID : Integer;
  InstituteName : LargeString;
  DistributorID : Integer;
  ContractStartDate : Date;
  ContractEndDate : Date;
  ContractType : LargeString;
  CustomerID : LargeString;
  Division : LargeString;
  Reference : LargeString;
  Status : LargeString;
  Owner : LargeString;
  BrandFilter : LargeString;
  ProductFilter : LargeString;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  hasNewMaterialNumber : Boolean;
  hasActiveContracts : Boolean;
  hasUpdatedPVL : Boolean;
  hasUpdatedConfidentialPrice : Boolean;
  hasNetPriceAbovePVL : Boolean;
  hasNetPriceBelowFloorPrice : Boolean;
  hasExpiringSoonContracts : Boolean;
  hasExpiredContracts : Boolean;
  hasCancelledContracts : Boolean;
  hasContractsToBeSynchronized : Boolean;
  hasNewContracts : Boolean;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Composition of many ConditionContract.CCMContract;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContract {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  ProductCode : LargeString;
  CountryCode : LargeString;
  ProductName : LargeString;
  UoM : LargeString;
  NewMaterialNumber : LargeString;
  BrandID : LargeString;
  BrandName : LargeString;
  OfferPrice : Double;
  hasRappel : Boolean;
  hasFOC : Boolean;
  CCMContractStartDate : Date;
  CCMContractEndDate : Date;
  PreviousContractNumber : LargeString;
  ContractNumber : LargeString;
  Synchronized : Boolean;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  @cds.ambiguous : 'missing on condition?'
  CCMCustomer : Composition of one ConditionContract.CCMCustomer on CCMCustomer.CCMContract_ID = ID;
  @cds.ambiguous : 'missing on condition?'
  CCMMaterial : Composition of many ConditionContract.CCMMaterial;
  @cds.ambiguous : 'missing on condition?'
  CurrentInvoicePrice : Composition of one ConditionContract.CurrentInvoicePrice on CurrentInvoicePrice.CCMContract_ID = ID;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionInvoice : Composition of one ConditionContract.PriceConditionInvoice;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionRebate : Composition of one ConditionContract.PriceConditionRebate;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionFOC : Composition of many ConditionContract.PriceConditionFOC;
  @cds.ambiguous : 'missing on condition?'
  FastConditionContracts : Association to one ConditionContract.FastConditionContracts on FastConditionContracts.ID = FastConditionContracts_ID;
  FastConditionContracts_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMCustomer {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  InstituteID : LargeString;
  CustomerID : Integer;
  CountryCode : LargeString;
  InstituteType : LargeString;
  InstituteName : LargeString;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMMaterial {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  CountryCode : LargeString;
  ProductCode : LargeString;
  MaterialNumber : LargeString;
  FOCMaterialNumber : LargeString;
  ActiveRecord : Integer;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CurrentInvoicePrice {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  ConditionType : LargeString;
  CountryCode : LargeString;
  SoldToParty : LargeString;
  Material : LargeString;
  YP00 : Double;
  YP04 : Double;
  YP10 : Double;
  YD75 : Double;
  YD30 : Double;
  YD06 : Double;
  YD02 : Double;
  SapTax : Double;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.PriceConditionInvoice {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  OfferID : LargeString;
  ProductCode : Integer;
  ConditionType : LargeString;
  Currency : LargeString;
  Region : LargeString;
  CountryCode : LargeString;
  YP00 : Double;
  YP04 : Double;
  YP10 : Double;
  YD75 : Double;
  YD30 : Double;
  YD06 : Double;
  YD02 : Double;
  Tax : Double;
  ConfidentialPrice : Decimal;
  RoyalDecree : LargeString;
  RoyalDecreeValue : Decimal;
  RoyalDecreeIncl : Boolean default false;
  NetPriceWithoutTaxAfterDeductionRD : Decimal;
  NetPriceWithoutTaxBeforeDeductionRD : Decimal;
  NetPriceWithTaxAfterDeductionRD : Decimal;
  NetPriceWithoutTax : Decimal;
  NetPriceWithTax : Decimal;
  MaximumPrice : Decimal;
  RequestedVolume : Integer;
  RentalPrice : Double;
  MonthlyRentPerUnit : Double;
  AnnualValue : Double;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.PriceConditionRebate {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  OfferID : LargeString;
  ProductCode : Integer;
  CountryCode : LargeString;
  YP00 : Double;
  ConfidentialPrice : Decimal;
  SettlementDescription : LargeString;
  Tax : Double;
  RoyalDecree : LargeString;
  Liquidation : LargeString;
  RefundDate : Date;
  PriceConditionCode : LargeString;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionDiscountCondition : Composition of many ConditionContract.PriceConditionDiscountCondition;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.PriceConditionDiscountCondition {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  Volume : Integer;
  Discount : Double;
  NetPriceWithoutTax : Decimal;
  NetPriceWithTax : Decimal;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionRebate : Association to one ConditionContract.PriceConditionRebate on PriceConditionRebate.ID = PriceConditionRebate_ID;
  PriceConditionRebate_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.PriceConditionFOC {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  OfferID : LargeString;
  CountryCode : LargeString;
  ProductCode : Integer;
  FreeGoodsOther : Double;
  FreeGoodsOther_Step : Double;
  FreeGoodsOther_ABS_PCT : String(4);
  VAT : Double;
  FOCMinAmount : Integer;
  FOCBonus : Decimal;
  PotentialGeneratedSavings : Decimal;
  RoyalDecree : LargeString;
  ADD_INCLUDE : LargeString;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.APIDefinition {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  Provider : LargeString;
  Host : LargeString;
  BasePath : LargeString;
  Resource : LargeString;
  ResourcePath : LargeString;
  RequestDelay : Integer;
  RequestMaxRetry : Integer;
  AuthType : LargeString;
  CountryCode : LargeString;
  Name : LargeString;
  @cds.ambiguous : 'missing on condition?'
  OAuth : Association to one ConditionContract.APIConfigOAuth on OAuth.ID = OAuth_ID;
  OAuth_ID : UUID;
  @cds.ambiguous : 'missing on condition?'
  APIBody : Association to one ConditionContract.APIBody on APIBody.APIDefinition_ID = ID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.APIConfigOAuth {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  OAuthProvider : LargeString;
  GrantType : LargeString;
  ClientID : LargeString;
  ClientSecret : LargeString;
  Scope : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.APIBody {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  Source : LargeString;
  Target : LargeString;
  @cds.ambiguous : 'missing on condition?'
  APIDefinition : Association to one ConditionContract.APIDefinition on APIDefinition.ID = APIDefinition_ID;
  APIDefinition_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.FastConditionContractsView {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  TenderID : LargeString;
  OfferID : LargeString;
  CountryCode : LargeString;
  InstituteID : Integer;
  InstituteName : LargeString;
  DistributorID : Integer;
  ContractStartDate : Date;
  ContractEndDate : Date;
  ContractType : LargeString;
  CustomerID : LargeString;
  Division : LargeString;
  Reference : LargeString;
  Status : LargeString;
  Owner : LargeString;
  BrandFilter : LargeString;
  ProductFilter : LargeString;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  hasNewMaterialNumber : Boolean;
  hasActiveContracts : Boolean;
  hasUpdatedPVL : Boolean;
  hasUpdatedConfidentialPrice : Boolean;
  hasNetPriceAbovePVL : Boolean;
  hasNetPriceBelowFloorPrice : Boolean;
  hasExpiringSoonContracts : Boolean;
  hasExpiredContracts : Boolean;
  hasCancelledContracts : Boolean;
  hasContractsToBeSynchronized : Boolean;
  hasNewContracts : Boolean;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Composition of many ConditionContract.CCMContract;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractView {
  @Core.ComputedDefaultValue : true
  key FastConditionContractsID : UUID not null;
  ProductCode : LargeString;
  CountryCode : LargeString;
  ProductName : LargeString;
  NewMaterialNumber : LargeString;
  BrandID : LargeString;
  BrandName : LargeString;
  OfferPrice : Double;
  hasRappel : Boolean;
  hasFOC : Boolean;
  CCMContractStartDate : Date;
  CCMContractEndDate : Date;
  ContractNumber : LargeString;
  PreviousContractNumber : LargeString;
  Synchronized : Boolean;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  InstituteName : LargeString;
  InstituteType : LargeString;
  InstituteID : LargeString;
  CustomerID : Integer;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractInformationDetailView {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  TenderID : LargeString;
  OfferID : LargeString;
  CountryCode : LargeString;
  InstituteID : Integer;
  InstituteName : LargeString;
  DistributorID : Integer;
  ContractStartDate : Date;
  ContractEndDate : Date;
  ContractType : LargeString;
  CustomerID : LargeString;
  Division : LargeString;
  Reference : LargeString;
  Status : LargeString;
  Owner : LargeString;
  BrandFilter : LargeString;
  ProductFilter : LargeString;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  hasNewMaterialNumber : Boolean;
  hasActiveContracts : Boolean;
  hasUpdatedPVL : Boolean;
  hasUpdatedConfidentialPrice : Boolean;
  hasNetPriceAbovePVL : Boolean;
  hasNetPriceBelowFloorPrice : Boolean;
  hasExpiringSoonContracts : Boolean;
  hasExpiredContracts : Boolean;
  hasCancelledContracts : Boolean;
  hasContractsToBeSynchronized : Boolean;
  hasNewContracts : Boolean;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Composition of many ConditionContract.CCMContract;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractProductsView {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  ProductCode : LargeString;
  CountryCode : LargeString;
  ProductName : LargeString;
  UoM : LargeString;
  NewMaterialNumber : LargeString;
  BrandID : LargeString;
  BrandName : LargeString;
  OfferPrice : Double;
  hasRappel : Boolean;
  hasFOC : Boolean;
  CCMContractStartDate : Date;
  CCMContractEndDate : Date;
  PreviousContractNumber : LargeString;
  ContractNumber : LargeString;
  Synchronized : Boolean;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  @cds.ambiguous : 'missing on condition?'
  CCMCustomer : Composition of one ConditionContract.CCMCustomer;
  @cds.ambiguous : 'missing on condition?'
  CCMMaterial : Composition of many ConditionContract.CCMMaterial;
  @cds.ambiguous : 'missing on condition?'
  CurrentInvoicePrice : Composition of one ConditionContract.CurrentInvoicePrice;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionInvoice : Composition of one ConditionContract.PriceConditionInvoice;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionRebate : Composition of one ConditionContract.PriceConditionRebate;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionFOC : Composition of many ConditionContract.PriceConditionFOC;
  @cds.ambiguous : 'missing on condition?'
  FastConditionContracts : Association to one ConditionContract.FastConditionContracts on FastConditionContracts.ID = FastConditionContracts_ID;
  FastConditionContracts_ID : UUID;
  FastConditionContractsID : UUID;
  InstituteName : LargeString;
  InstituteType : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractInformationDetailDetailView {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedAt}'
  createdAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : '{i18n>CreatedBy}'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedAt}'
  modifiedAt : Timestamp;
  /** {i18n>UserID.Description} */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : '{i18n>ChangedBy}'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  ProductCode : LargeString;
  CountryCode : LargeString;
  ProductName : LargeString;
  UoM : LargeString;
  NewMaterialNumber : LargeString;
  BrandID : LargeString;
  BrandName : LargeString;
  OfferPrice : Double;
  hasRappel : Boolean;
  hasFOC : Boolean;
  CCMContractStartDate : Date;
  CCMContractEndDate : Date;
  PreviousContractNumber : LargeString;
  ContractNumber : LargeString;
  Synchronized : Boolean;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  @cds.ambiguous : 'missing on condition?'
  CCMCustomer : Composition of one ConditionContract.CCMCustomer;
  @cds.ambiguous : 'missing on condition?'
  CCMMaterial : Composition of many ConditionContract.CCMMaterial;
  @cds.ambiguous : 'missing on condition?'
  CurrentInvoicePrice : Composition of one ConditionContract.CurrentInvoicePrice;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionInvoice : Composition of one ConditionContract.PriceConditionInvoice;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionRebate : Composition of one ConditionContract.PriceConditionRebate;
  @cds.ambiguous : 'missing on condition?'
  PriceConditionFOC : Composition of many ConditionContract.PriceConditionFOC;
  @cds.ambiguous : 'missing on condition?'
  FastConditionContracts : Association to one ConditionContract.FastConditionContracts on FastConditionContracts.ID = FastConditionContracts_ID;
  FastConditionContracts_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.ContractPayloadView {
  @Core.ComputedDefaultValue : true
  key FastConditionContractID : UUID not null;
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  key ProductCode : LargeString not null;
  CndnContrValidFrom : Date;
  CndnContrValidTo : Date;
  Customer : LargeString;
  Division : LargeString;
  ConditionType : LargeString;
  YD02 : Double;
  YD06 : Double;
  YP10 : Double;
  RequestedVolume : Integer;
  ConditionValidityStartDate : Date;
  ConditionValidityEndDate : Date;
  ConditionRateAmount : Double;
  Product : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractPricingFormView {
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  ConditionType : LargeString;
  CountryCode : LargeString;
  YP00 : Double;
  YP04 : Double;
  YP10 : Double;
  YD75 : Double;
  YD30 : Double;
  YD06 : Double;
  YD02 : Double;
  Tax : Double;
  ConfidentialPrice : Decimal;
  RoyalDecree : LargeString;
  RoyalDecreeValue : Decimal;
  RoyalDecreeIncl : Boolean default false;
  NetPriceWithoutTaxAfterDeductionRD : Decimal;
  NetPriceWithoutTaxBeforeDeductionRD : Decimal;
  Currency : LargeString;
  Region : LargeString;
  NetPriceWithTaxAfterDeductionRD : Decimal;
  NetPriceWithoutTax : Decimal;
  NetPriceWithTax : Decimal;
  MaximumPrice : Decimal;
  RequestedVolume : Integer;
  RentalPrice : Double;
  MonthlyRentPerUnit : Double;
  AnnualValue : Double;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractFOCTableView {
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  OfferID : LargeString;
  CountryCode : LargeString;
  ProductCode : Integer;
  FreeGoodsOther : Double;
  FreeGoodsOther_Step : Double;
  FreeGoodsOther_ABS_PCT : String(4);
  VAT : Double;
  FOCMinAmount : Integer;
  FOCBonus : Decimal;
  PotentialGeneratedSavings : Decimal;
  RoyalDecree : LargeString;
  ADD_INCLUDE : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractRebateFormView {
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  OfferID : LargeString;
  ProductCode : Integer;
  CountryCode : LargeString;
  YP00 : Double;
  ConfidentialPrice : Decimal;
  SettlementDescription : LargeString;
  Tax : Double;
  RoyalDecree : LargeString;
  Liquidation : LargeString;
  RefundDate : Date;
  PriceConditionCode : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractRebateDiscountConditionTableView {
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  Discount : Double;
  Volume : Integer;
  NetPriceWithoutTax : Decimal;
  NetPriceWithTax : Decimal;
  Tax : Double;
};

@cds.external : true
service ConditionContract {};

