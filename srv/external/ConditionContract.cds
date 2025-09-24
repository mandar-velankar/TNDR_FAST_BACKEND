/* checksum : 878e5d8109f009aff9d5a39302f7d971 */
@cds.external : true
function ConditionContract.getBackendData() returns LargeString;

@cds.external : true
action ConditionContract.createCCMContract(
  FastCCMContractId : UUID,
  CCMContractID : UUID,
  ProductCode : LargeString
) returns LargeString;

@cds.external : true
action ConditionContract.createAllCCMContract(
  FastCCMContractId : UUID
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  SAPID : LargeString;
  ExternalID : LargeString;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  ProductCode : LargeString;
  EANUPCCode : LargeString;
  CountryCode : LargeString;
  ProductName : LargeString;
  UoM : LargeString;
  NewMaterialNumber : LargeString;
  BrandID : LargeString;
  BrandName : LargeString;
  OfferPrice : Double;
  hasRappel : LargeString;
  hasFOC : LargeString;
  CCMContractStartDate : Date;
  CCMContractEndDate : Date;
  PreviousContractNumber : LargeString;
  ContractNumber : LargeString;
  ItemGUID : LargeString;
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
  ContractItemGUID : Composition of many ConditionContract.ContractItemGUID;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  InstituteID : LargeString;
  AssortmentReference : LargeString;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  isNewMaterialNumber : Boolean default false;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  MarketIncentiveID : LargeString;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  FOCBonus : LargeString;
  PotentialGeneratedSavings : Decimal;
  RoyalDecree : LargeString;
  ADD_INCLUDE : LargeString;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.SettlementsDate {
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
  modifiedBy : String(255);
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  key FromDate : Date not null;
  ToDate : Date;
  SettlementID : LargeString;
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
entity ConditionContract.ContractItemGUID {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
  modifiedBy : String(255);
  ConditionDocument : LargeString;
  CustomerID : LargeString;
  FieldCombination : LargeString;
  ItemGUID : LargeString;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  SAPID : LargeString;
  ExternalID : LargeString;
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
  hasRappel : LargeString;
  hasFOC : LargeString;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
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
  SAPID : LargeString;
  ExternalID : LargeString;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  ProductCode : LargeString;
  EANUPCCode : LargeString;
  CountryCode : LargeString;
  ProductName : LargeString;
  UoM : LargeString;
  NewMaterialNumber : LargeString;
  BrandID : LargeString;
  BrandName : LargeString;
  OfferPrice : Double;
  hasRappel : LargeString;
  hasFOC : LargeString;
  CCMContractStartDate : Date;
  CCMContractEndDate : Date;
  PreviousContractNumber : LargeString;
  ContractNumber : LargeString;
  ItemGUID : LargeString;
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
  ContractItemGUID : Composition of many ConditionContract.ContractItemGUID;
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
  @Common.Label : 'Created On'
  createdAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Immutable : true
  @Core.Computed : true
  @Common.Label : 'Created By'
  createdBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed On'
  modifiedAt : Timestamp;
  /** User's unique ID */
  @UI.HiddenFilter : true
  @UI.ExcludeFromNavigationContext : true
  @Core.Computed : true
  @Common.Label : 'Changed By'
  modifiedBy : String(255);
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validFrom : Timestamp;
  @odata.Precision : 7
  @odata.Type : 'Edm.DateTimeOffset'
  validTo : Timestamp;
  ProductCode : LargeString;
  EANUPCCode : LargeString;
  CountryCode : LargeString;
  ProductName : LargeString;
  UoM : LargeString;
  NewMaterialNumber : LargeString;
  BrandID : LargeString;
  BrandName : LargeString;
  OfferPrice : Double;
  hasRappel : LargeString;
  hasFOC : LargeString;
  CCMContractStartDate : Date;
  CCMContractEndDate : Date;
  PreviousContractNumber : LargeString;
  ContractNumber : LargeString;
  ItemGUID : LargeString;
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
  ContractItemGUID : Composition of many ConditionContract.ContractItemGUID;
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
  AssortmentReference : LargeString;
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
  SAPID : LargeString;
  ExternalID : LargeString;
  Reference : LargeString;
  TenderID : LargeString;
  ContractType : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.ContractRebatePayloadView {
  @Core.ComputedDefaultValue : true
  key FastConditionContractID : UUID not null;
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  key ProductCode : LargeString not null;
  AssortmentReference : LargeString;
  CndnContrValidFrom : Date;
  CndnContrValidTo : Date;
  Customer : LargeString;
  Division : LargeString;
  Volume : Integer;
  Discount : Double;
  @Core.Computed : true
  MaxDiscount : Double;
  YP00 : Double;
  ConfidentialPrice : Decimal;
  SettlementDescription : LargeString;
  Tax : Double;
  RoyalDecree : LargeString;
  Liquidation : LargeString;
  RefundDate : Date;
  PriceConditionCode : LargeString;
  MarketIncentiveID : LargeString;
  ConditionValidityStartDate : Date;
  ConditionValidityEndDate : Date;
  ConditionRateAmount : Double;
  EANUPCCode : LargeString;
  SAPID : LargeString;
  ExternalID : LargeString;
  Reference : LargeString;
  TenderID : LargeString;
  ContractType : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.MaxDiscountView {
  key ProductCode : Integer not null;
  key OfferID : LargeString not null;
  @Core.Computed : true
  MaxDiscount : Double;
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
  ProductName : LargeString;
  OfferID : LargeString;
  CountryCode : LargeString;
  ProductCode : Integer;
  FreeGoodsOther : Double;
  FreeGoodsOther_Step : Double;
  FreeGoodsOther_ABS_PCT : String(4);
  VAT : Double;
  FOCMinAmount : Integer;
  FOCBonus : LargeString;
  PotentialGeneratedSavings : Decimal;
  RoyalDecree : LargeString;
  ADD_INCLUDE : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractRebateFormView {
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  PriceConditionRebateID : UUID;
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
  MarketIncentiveID : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CCMContractRebateDiscountConditionTableView {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  PriceConditionRebateID : UUID;
  Discount : Double;
  Volume : Integer;
  NetPriceWithoutTax : Decimal;
  NetPriceWithTax : Decimal;
  Tax : Double;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.IdentifyExistingContract {
  FastConditionContractID : UUID;
  CCMContractID : UUID;
  ContractNumber : LargeString;
  PreviousContractNumber : LargeString;
  ItemGUID : LargeString;
  ProductCode : LargeString;
  AssortmentReference : LargeString;
  InstituteID : LargeString;
  CndnContrValidFrom : Date;
  CndnContrValidTo : Date;
  key Customer : LargeString not null;
  Division : LargeString;
  ConditionValidityStartDate : Date;
  ConditionValidityEndDate : Date;
  ConditionRateAmount : Double;
  key Product : LargeString not null;
  SAPID : LargeString;
  ExternalID : LargeString;
  Reference : LargeString;
  TenderID : LargeString;
  OfferID : LargeString;
  ContractType : LargeString;
};

@cds.external : true
service ConditionContract {};

