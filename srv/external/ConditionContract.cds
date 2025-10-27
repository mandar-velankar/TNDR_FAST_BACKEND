/* checksum : 2d74f2f64d707d758d364a8cf85ae577 */
@cds.external : true
function ConditionContract.getInstituteData() returns LargeString;

@cds.external : true
function ConditionContract.getESUsers() returns LargeString;

@cds.external : true
function ConditionContract.getUserCountries() returns LargeString;

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
action ConditionContract.terminateCCMContract(
  FastCCMContractId : UUID,
  CCMContractID : UUID,
  ProductCode : LargeString,
  TerminationDate : Date,
  CancellationNote : LargeString
) returns LargeString;

@cds.external : true
action ConditionContract.getSAPSalesOrderSimulation(
  CCMContractID : UUID
) returns LargeString;

@cds.external : true
action ConditionContract.ignoreCurrentCCMPrice(
  CCMContractID : UUID
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
  PackFactor : Double;
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
  Expired : Boolean;
  ItemGUID : LargeString;
  Synchronized : Boolean default false;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  Cancelled : Boolean default false;
  CancellationComment : LargeString;
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
  CustomerID : LargeString;
  CountryCode : LargeString;
  InstituteType : LargeString;
  InstituteName : LargeString;
  @cds.ambiguous : 'missing on condition?'
  CustomerHierarchy : Composition of many ConditionContract.CustomerHierarchy;
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
  Currency : LargeString;
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
  MarketIncentiveDescription : LargeString;
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
  RebateContractNumber : LargeString;
  Synchronized : Boolean default false;
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
entity ConditionContract.ConditionContractsLog {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  ContractNumber : LargeString;
  ContractType : LargeString;
  ContractReference : LargeString;
  PayloadType : LargeString;
  PayloadToSAP : LargeString;
  Synchronized : Boolean default false;
  createdAt : Date;
  createdBy : LargeString;
  @cds.ambiguous : 'missing on condition?'
  CCMContract : Association to one ConditionContract.CCMContract on CCMContract.ID = CCMContract_ID;
  CCMContract_ID : UUID;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CustomerHierarchy {
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
  InstituteID : LargeString;
  ParentInstituteID : LargeString;
  CustomerID : LargeString;
  ParentCustomerID : LargeString;
  InstituteName : LargeString;
  ParentInstituteName : LargeString;
  AssortmentReference : LargeString;
  Excluded : Boolean default false;
  CCMContractID : UUID;
  @cds.ambiguous : 'missing on condition?'
  CCMCustomer : Association to one ConditionContract.CCMCustomer on CCMCustomer.ID = CCMCustomer_ID;
  CCMCustomer_ID : UUID;
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
  Synchronized : Boolean default false;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  InstituteName : LargeString;
  InstituteType : LargeString;
  InstituteID : LargeString;
  CustomerID : LargeString;
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
  PackFactor : Double;
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
  Expired : Boolean;
  ItemGUID : LargeString;
  Synchronized : Boolean default false;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  Cancelled : Boolean default false;
  CancellationComment : LargeString;
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
  PackFactor : Double;
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
  Expired : Boolean;
  ItemGUID : LargeString;
  Synchronized : Boolean default false;
  Notified : Boolean;
  Extension : Boolean;
  ExtensionPeriod : LargeString;
  CreationDate : Date;
  Cancelled : Boolean default false;
  CancellationComment : LargeString;
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
  InstituteID : Integer;
  Division : LargeString;
  ConditionType : LargeString;
  YD02 : Double;
  YD06 : Double;
  YP10 : Double;
  UoM : LargeString;
  PackFactor : Double;
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
  MarketIncentiveDescription : LargeString;
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
  Expired : Boolean;
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
@cds.persistence.skip : true
entity ConditionContract.ExistingContractInfo {
  @Core.ComputedDefaultValue : true
  key FastConditionContractID : UUID not null;
  @Core.ComputedDefaultValue : true
  key CCMContractID : UUID not null;
  ContractNumber : LargeString;
  CndnContrValidFrom : Date;
  CndnContrValidTo : Date;
  ConditionValidityStartDate : Date;
  ConditionValidityEndDate : Date;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.BrandsView {
  key BrandID : LargeString not null;
  BrandName : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.BrandProductsView {
  key BrandID : LargeString not null;
  key ProductCode : LargeString not null;
  ProductName : LargeString;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.ExistingContractInvoicePrices {
  FastConditionContractID : UUID;
  CCMContractID : UUID;
  ContractNumber : LargeString;
  Expired : Boolean;
  ProductCode : LargeString;
  InstituteID : LargeString;
  CndnContrValidFrom : Date;
  CndnContrValidTo : Date;
  key Customer : LargeString not null;
  ConditionValidityStartDate : Date;
  ConditionValidityEndDate : Date;
  key Product : LargeString not null;
  TenderID : LargeString;
  OfferID : LargeString;
  ContractType : LargeString;
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
  RentalPrice : Double;
  AnnualValue : Double;
};

@cds.external : true
@cds.persistence.skip : true
entity ConditionContract.CurrentCCMPricingView {
  @Core.ComputedDefaultValue : true
  key ID : UUID not null;
  CountryCode : LargeString;
  @Core.Computed : true
  ConditionType : LargeString;
  @Core.Computed : true
  Currency : LargeString;
  @Core.Computed : true
  YP00 : Double;
  @Core.Computed : true
  YP04 : Double;
  @Core.Computed : true
  YP10 : Double;
  @Core.Computed : true
  YD75 : Double;
  @Core.Computed : true
  YD30 : Double;
  @Core.Computed : true
  YD06 : Double;
  @Core.Computed : true
  YD02 : Double;
  @Core.Computed : true
  Tax : Double;
  @Core.Computed : true
  ConfidentialPrice : Double;
  @Core.Computed : true
  RoyalDecree : LargeString;
  @Core.Computed : true
  RoyalDecreeValue : Decimal;
  @Core.Computed : true
  RoyalDecreeIncl : Boolean;
  @Core.Computed : true
  NetPriceWithoutTaxAfterDeductionRD : Decimal;
  @Core.Computed : true
  NetPriceWithTaxAfterDeductionRD : Decimal;
  @Core.Computed : true
  NetPriceWithoutTax : Decimal;
  @Core.Computed : true
  NetPriceWithTax : Decimal;
  @Core.Computed : true
  MaximumPrice : Decimal;
  @Core.Computed : true
  RequestedVolume : Integer;
  @Core.Computed : true
  RentalPrice : Double;
  @Core.Computed : true
  MonthlyRentPerUnit : Double;
  @Core.Computed : true
  AnnualValue : Double;
};

@cds.external : true
service ConditionContract {};

