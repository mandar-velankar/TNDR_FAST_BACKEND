namespace com.bayer.SXTENDER.MasterDataViews;

using { User, Country, managed } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.MasterDataLatestValues } from './MasterDataLatestValues';

entity MostRecentSkuCodeForProductPack as select from MasterData.PT_TMSKUPRDPCK as sku {
	sku.ProductPackID,
	sku.CountryCode,
	max(sku.SKUCode) as SKU
}where sku.ActiveRecord='Yes'  group by sku.ProductPackID, sku.CountryCode;

entity CountryBrandProducts as select from MasterData.PT_TMCTPRDPCK as Product left outer join
MostRecentSkuCodeForProductPack sku on Product.PRODUCTPACKID = sku.ProductPackID and Product.COUNTRYCODE = sku.CountryCode {
	key Product.COUNTRYCODE as COUNTRY_CODE,
	Product.ProductPack.Product.HLEVEL1_NAME as DIVISION,
	Product.ProductPack.Product.HLEVEL4_CODE as BRAND_ID,
	Product.ProductPack.Product.HLEVEL4_NAME as BRAND_NAME,
	//Product.ProductPack.Product.HLEVEL6_NAME as PRODUCT_UNIT_NAME, //thailand
	//sku.SKU, //thailand
	key Product.PRODUCTPACKID as PRODUCT_ID,
	Product.ProductPack.PRODUCTPACKNAME as PRODUCT_NAME,
	Product.ProductPack.PACKFACTOR as PACK_SIZE,
	Product.ProductPack.CONCENTRATION as DOSAGE,
	Product.ProductPack.UOM as UOM,
	Product.COUNTRYOFORIGIN as COUNTRY_OF_ORIGIN,
	Product.MANUFACTURER as MANUFACTURER,
	Product.SHELFLIFE as SHELFLIFE,
	Product.ProductPack.PRESENTATION as PRESENTATION,
	Product.VTATax as VAT,
	case when Product.REGISTERED=0 then 0 else 1 end as REGISTERED:Integer,
	Product.COMMENT as COMMENT,
	Product.COGS.COGS
}where Product.ACTIVERECORD = 'Yes'
and Product.ProductPack.ACTIVERECORD = 'Yes'
order by Product.COUNTRYCODE, Product.ProductPack.Product.HLEVEL4_NAME, Product.ProductPack.PRODUCTPACKNAME;

entity CountryBrands as select from CountryBrandProducts as Product{
	key Product.COUNTRY_CODE,
	key Product.BRAND_ID,
	min(Product.BRAND_NAME) as BRAND_NAME:String(500)
}where Product.BRAND_ID is not null
group by Product.COUNTRY_CODE, Product.BRAND_ID;

entity CountryCurrency as select from MasterData.PT_TMCTRY as Country{
	key Country.CountryCode as COUNTRY_CODE,
	key 'USD' as CURRENCY:String(3),
	1 as SORTER:Integer
} where Country.CountryCode <> 'TH'
union
select from MasterData.PT_TMCTRY as Country{
	Country.CountryCode as COUNTRY_CODE,
	'EUR' as CURRENCY:String(3),
	2 as SORTER:Integer
} where Country.CountryCode <> 'TH'
union
select from MasterData.PT_TMCTRY as Country{
	Country.CountryCode as COUNTRY_CODE,
	Country.LocalCurrency as CURRENCY,
	3 as SORTER
}where Country.LocalCurrency<>'EUR'
and Country.LocalCurrency<>'USD';

entity CountryLegalEntity as select from MasterData.PT_TMCTLE as Country{
	key Country.CountryCode,
	key Country.LegalEntity.LegalEntityCode,
	Country.LegalEntity.LegalEntityName
}where Country.LegalEntity.LegalEntityCode is not null;

entity LegalEntityBrand as select from MasterData.PT_TMCTLEBR as leb
inner join CountryBrands cb on leb.CountryCode = cb.COUNTRY_CODE and leb.HLevel4_Code = cb.BRAND_ID{
	key leb.CountryCode as COUNTRY_CODE,
	key leb.HLevel4_Code as BRAND_ID,
	key leb.Entity.LegalEntityCode as LEGAL_ENTITY_CODE,
	cb.BRAND_NAME as BRAND_NAME
}where leb.Entity.LegalEntityCode is not null
union
select from CountryBrands as cb
inner join MasterData.PT_TMCTLE as cle on cb.COUNTRY_CODE = cle.CountryCode{
	cb.COUNTRY_CODE as COUNTRY_CODE,
	cb.BRAND_ID as BRAND_ID,
	cle.LegalEntity.LegalEntityCode as LEGAL_ENTITY_CODE,
	cb.BRAND_NAME as BRAND_NAME
}where cle.Brand = 'All'
and cle.LegalEntity.LegalEntityCode is not null;

entity DirectBrand as select from MasterData.PT_TMINSBRTR as itr
inner join MasterData.PT_TMINDSBR as idst on itr.InstituteID = idst.InstituteID and itr.HLevel4_Code = idst.HLevel4_Code
inner join CountryBrands as cb on itr.CountryCode = cb.COUNTRY_CODE and itr.HLevel4_Code = cb.BRAND_ID{
	key itr.CountryCode as COUNTRY_CODE,
	key itr.InstituteID as INSTITUTE_ID,
	itr.Institute.InstituteName as INSTITUTE_NAME,
	key idst.DistributorID as DISTRIBUTOR_ID,
	idst.Distributor.DistributorName as DISTRIBUTOR_NAME,
	key cb.BRAND_ID as BRAND_ID,
	cb.BRAND_NAME as BRAND_NAME,
	'Direct' as CHANNEL:String(11),
	itr.INCOTerms as INCO_TERMS,
	itr.PaymentTerms as PAYMENT_TERMS,
	idst.Commissionrate as COMMISSION_RATE
}where itr.ActiveRecord = 'Yes'
and idst.ActiveRecord = 'Yes'
and itr.Institute.ActiveRecord = 'Yes'
and idst.Distributor.ActiveRecord = 'Yes';

entity DistributorBrand as select from MasterData.PT_TMDISBRD as dstbr
inner join CountryBrands cb on dstbr.CountryCode = cb.COUNTRY_CODE and dstbr.HLevel4_Code = cb.BRAND_ID{
	key dstbr.CountryCode as COUNTRY_CODE,
	key dstbr.DistributorID as DISTRIBUTOR_ID,
	dstbr.Distributor.DistributorName as DISTRIBUTOR_NAME,
	key cb.BRAND_ID as BRAND_ID,
	cb.BRAND_NAME as BRAND_NAME,
	'Distributor' as CHANNEL:String(11),
	dstbr.INCOTerms as INCO_TERMS,
	dstbr.PaymentTerms as PAYMENT_TERMS,
	dstbr.CommissionRate as COMMISSION_RATE
};

//Distinct list of divisions
entity Divisions as select from MasterData.PT_TMPRDHIER as ProductHierarchy{
	key ProductHierarchy.HLEVEL1_CODE as DivisionId,
	ProductHierarchy.HLEVEL1_NAME as DivisionName
} group by ProductHierarchy.HLEVEL1_CODE, ProductHierarchy.HLEVEL1_NAME;

entity MasterApproverBrandMap as projection on MasterData.CountryApprovers;
entity ExchangeRates @readonly as projection on MasterDataLatestValues.ExchangeRates;


entity MasterCountries as select from MasterData.PT_TMCTRY as MasterCountries {
	key CountryID,
	MasterCountries.Region,
	key MasterCountries.CountryCode,
	MasterCountries.CountryName,
	MasterCountries.LocalCurrency,
	MasterCountries.COMMENT
};

entity MasterAuthorizedSignatories as select from MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as MasterAuthorizedSignatories {
	key MasterAuthorizedSignatories.LEGAL_ENTITY_CODE,
	key MasterAuthorizedSignatories.AUTHORIZED_SIGNATORY,
	key MasterAuthorizedSignatories.COUNTRY_CODE,
	MasterAuthorizedSignatories.NAME,
	MasterAuthorizedSignatories.TITLE
};

entity MasterCountryLegalEntityBrandMap as select from MasterData.PT_TMCTLEBR as MasterCountryLegalEntityBrandMap {
	MasterCountryLegalEntityBrandMap.CountryLegalEntityBrandID,
	key MasterCountryLegalEntityBrandMap.LegalEntityID,
	key MasterCountryLegalEntityBrandMap.HLevel4_Code,
	key MasterCountryLegalEntityBrandMap.CountryCode,
	MasterCountryLegalEntityBrandMap.Entity.LegalEntityName,
	min(MasterCountryLegalEntityBrandMap.Brand.HLEVEL4_NAME) as HLEVEL4_NAME
} group by MasterCountryLegalEntityBrandMap.CountryLegalEntityBrandID,
		   MasterCountryLegalEntityBrandMap.LegalEntityID,
		   MasterCountryLegalEntityBrandMap.HLevel4_Code,
		   MasterCountryLegalEntityBrandMap.CountryCode
  order by MasterCountryLegalEntityBrandMap.CountryCode,
  		   MasterCountryLegalEntityBrandMap.Entity.LegalEntityName,
		   min(MasterCountryLegalEntityBrandMap.Brand.HLEVEL4_NAME);

entity MasterCountryLegalEntityMap as select from MasterData.PT_TMCTLE as MasterCountryLegalEntityMap {
	MasterCountryLegalEntityMap.CountryLegalEntityID,
	key MasterCountryLegalEntityMap.LegalEntityID,
	key MasterCountryLegalEntityMap.CountryCode,
	MasterCountryLegalEntityMap.LegalEntity.LegalEntityName,
	MasterCountryLegalEntityMap.Brand
} order by MasterCountryLegalEntityMap.LegalEntity.Countries.CountryCode,
		   MasterCountryLegalEntityMap.LegalEntity.LegalEntityName;

entity MasterDistributorBrandMap as select from MasterData.PT_TMDISBRD as MasterDistributorBrandMap {
	key MasterDistributorBrandMap.DistributorBrandID,
	MasterDistributorBrandMap.DistributorID,
	MasterDistributorBrandMap.HLevel4_Code,
	MasterDistributorBrandMap.CountryCode,
	MasterDistributorBrandMap.Distributor.DistributorName,
	min(MasterDistributorBrandMap.Product.HLEVEL4_NAME) as HLEVEL4_NAME,
	MasterDistributorBrandMap.CommissionRate,
	MasterDistributorBrandMap.INCOTerms,
	MasterDistributorBrandMap.PaymentTerms
} where MasterDistributorBrandMap.ActiveRecord = 'Yes' and MasterDistributorBrandMap.Distributor.ActiveRecord = 'Yes'
  group by MasterDistributorBrandMap.DistributorBrandID,
           MasterDistributorBrandMap.DistributorID,
		   MasterDistributorBrandMap.HLevel4_Code,
		   MasterDistributorBrandMap.CountryCode,
		   MasterDistributorBrandMap.Distributor.DistributorName,
		   MasterDistributorBrandMap.CommissionRate,
		   MasterDistributorBrandMap.INCOTerms,
		   MasterDistributorBrandMap.PaymentTerms;

entity MasterDistributors as select from MasterData.PT_TMDIST as MasterDistributors {
	key MasterDistributors.DistributorID,
	MasterDistributors.CountryCode,
	MasterDistributors.DistributorName,
	MasterDistributors.Address,
	MasterDistributors.ContactNo,
	MasterDistributors.Fax,
	MasterDistributors.ContactPerson
} where MasterDistributors.ActiveRecord = 'Yes'
order by MasterDistributors.CountryCode, MasterDistributors.DistributorName;

entity MasterInstituteBrandTerms as select from MasterData.PT_TMINSBRTR as MasterInstituteBrandTerms {
	key MasterInstituteBrandTerms.InstituteBrandTermsID,
	MasterInstituteBrandTerms.InstituteID,
	MasterInstituteBrandTerms.HLevel4_Code,
	MasterInstituteBrandTerms.CountryCode,
	MasterInstituteBrandTerms.Institute.InstituteName,
	MasterInstituteBrandTerms.Product.HLEVEL4_NAME,
	MasterInstituteBrandTerms.INCOTerms,
	MasterInstituteBrandTerms.PaymentTerms
} where MasterInstituteBrandTerms.ActiveRecord = 'Yes'
	and MasterInstituteBrandTerms.Institute.ActiveRecord = 'Yes'
  group by MasterInstituteBrandTerms.InstituteBrandTermsID,
  		   MasterInstituteBrandTerms.InstituteID,
		   MasterInstituteBrandTerms.HLevel4_Code,
		   MasterInstituteBrandTerms.CountryCode,
		   MasterInstituteBrandTerms.Institute.InstituteName,
		   MasterInstituteBrandTerms.INCOTerms,
		   MasterInstituteBrandTerms.PaymentTerms
  order by MasterInstituteBrandTerms.CountryCode,
  		   min(MasterInstituteBrandTerms.Product.HLEVEL4_NAME);

entity MasterInstituteDistBrandMap as select from MasterData.PT_TMINDSBR as MasterInstituteDistBrandMap {
	key MasterInstituteDistBrandMap.InstituteDistBrandRelationID,
	MasterInstituteDistBrandMap.InstituteID,
	MasterInstituteDistBrandMap.DistributorID,
	MasterInstituteDistBrandMap.HLevel4_Code,
	MasterInstituteDistBrandMap.CountryCode,
	MasterInstituteDistBrandMap.Institute.InstituteName,
	MasterInstituteDistBrandMap.Distributor.DistributorName,
	MasterInstituteDistBrandMap.Product.HLEVEL4_NAME,
	MasterInstituteDistBrandMap.Commissionrate
} where MasterInstituteDistBrandMap.ActiveRecord = 'Yes'
	and MasterInstituteDistBrandMap.Institute.ActiveRecord = 'Yes'
	and MasterInstituteDistBrandMap.Distributor.ActiveRecord = 'Yes'
  group by MasterInstituteDistBrandMap.InstituteDistBrandRelationID,
  		   MasterInstituteDistBrandMap.InstituteID,
		   MasterInstituteDistBrandMap.DistributorID,
		   MasterInstituteDistBrandMap.HLevel4_Code,
		   MasterInstituteDistBrandMap.CountryCode,
		   MasterInstituteDistBrandMap.Institute.InstituteName,
		   MasterInstituteDistBrandMap.Distributor.DistributorName;

//TODO
entity MasterInstitutes as select from MasterData.PT_TMINST as MasterInstitutes {
	MasterInstitutes.InstituteID,
	MasterInstitutes.CountryCode,
	MasterInstitutes.InstituteName as GroupName, //TODO : check w/ jonathan
	MasterInstitutes.CustomerID,
	MasterInstitutes.InstituteName,
	MasterInstitutes.InstituteType
	//MasterInstitutes.
};

entity MasterLegalEntities as select from MasterData.PT_TMLE as MasterLegalEntities {
	key MasterLegalEntities.LegalEntityID,
	MasterLegalEntities.LegalEntityCode,
	MasterLegalEntities.LegalEntityName,
	MasterLegalEntities.BankDetails,
	MasterLegalEntities.Letterhead,
	MasterLegalEntities.Remarks,
	MasterLegalEntities.FooterComment,
	MasterLegalEntities.Countries.CountryCode
} order by MasterLegalEntities.LegalEntityName;

//TODO
entity MasterProductPacks as select from MasterData.PT_TMCTRY as MasterProductPacks
inner join MasterData.PT_TMPRDPCK as P on MasterProductPacks.CountryPacks.PRODUCTPACKID = P.PRODUCTPACKID 
inner join MasterData.PT_TMPRDHIER as H on P.HLEVEL6_CODE = H.HLEVEL6_CODE {
	key P.PRODUCTPACKID,
	key MasterProductPacks.CountryCode,
	min(H.HLEVEL1_NAME) as HLEVEL1_NAME,
	min(H.HLEVEL4_CODE) as HLEVEL4_CODE,
	min(H.HLEVEL4_NAME) as HLEVEL4_NAME,
	P.HLEVEL6_CODE,
	min(H.HLEVEL6_NAME) as HLEVEL6_NAME,
	P.PRODUCTPACKNAME,
	P.PRESENTATION,
	P.UOM,
	P.CONCENTRATION,
	P.PACKFACTOR,
	P.PCIName,
	MasterProductPacks.CountryPacks.COUNTRYOFORIGIN,
	MasterProductPacks.CountryPacks.SHELFLIFE,
	case MasterProductPacks.CountryPacks.REGISTERED 
		when 0 then 'No'
		when 1 then 'Without Price'
		when 2 then 'With Price'
	end as REGISTERED,
	MasterProductPacks.CountryPacks.MANUFACTURER,
	MasterProductPacks.CountryPacks.COMMENT,
	MasterProductPacks.RegisteredPrices.Currency as REGISTERED_PRICE_CURRENCY,
	MasterProductPacks.RegisteredPrices.UOM as REGISTERED_PRICE_UOM,
	MasterProductPacks.RegisteredPrices.RegisteredPrice,
	'' as NEW_REGISTERED,
	MasterProductPacks.Cogs.Currency,
	'Pack' as COGS_UOM,
	MasterProductPacks.Cogs.COGS,
	'' as NEW_COGS,
	//TODO: string_agg
	P.ACTIVERECORD as ACTIVE_PRODUCT,
	MasterProductPacks.CountryPacks.ACTIVERECORD as ACTIVE_COUNTRY_PRODUCT
} group by P.PRODUCTPACKID,
	MasterProductPacks.CountryCode,
	P.HLEVEL6_CODE,
	P.PRODUCTPACKNAME,
	P.PRESENTATION,
	P.UOM,
	P.CONCENTRATION,
	P.PACKFACTOR,
	MasterProductPacks.CountryPacks.COUNTRYOFORIGIN,
	MasterProductPacks.CountryPacks.SHELFLIFE,
	MasterProductPacks.CountryPacks.MANUFACTURER,
	MasterProductPacks.RegisteredPrices.Currency,
	MasterProductPacks.RegisteredPrices.RegisteredPrice,
	P.ACTIVERECORD,
	MasterProductPacks.CountryPacks.ACTIVERECORD,
	P.PCIName,
	MasterProductPacks.CountryPacks.REGISTERED,
	MasterProductPacks.CountryPacks.COMMENT,
	MasterProductPacks.RegisteredPrices.UOM,
	MasterProductPacks.Cogs.Currency,
	MasterProductPacks.Cogs.COGS
  order by MasterProductPacks.CountryPacks.COUNTRYCODE,
  		   P.PRODUCTPACKNAME;

entity MasterTABrandMap as select from MasterData.PT_TMTABRMP as MasterTABrandMap {
	key MasterTABrandMap.TABrandID,
	MasterTABrandMap.TA,
	MasterTABrandMap.TAShort,
	MasterTABrandMap.Product.HLEVEL4_NAME
} group by  MasterTABrandMap.TABrandID,
			MasterTABrandMap.HLevel4_Code,
			MasterTABrandMap.TA,
			MasterTABrandMap.TAShort
order by MasterTABrandMap.TA,
		 min(MasterTABrandMap.Product.HLEVEL4_NAME);

entity MasterBudgetedProfitability as select from MasterDataLatestValues.VWBUDGETEDPROFITABILITY as MasterBudgetedProfitability
inner join MasterData.PT_TMPRDHIER as h on MasterBudgetedProfitability.HLEVEL4_CODE = h.HLEVEL4_CODE {
	key MasterBudgetedProfitability.HLEVEL4_CODE,
	key MasterBudgetedProfitability.COUNTRYCODE,
	min(h.HLEVEL4_NAME) as BRAND,
	MasterBudgetedProfitability.PROFITABILITY
} group by MasterBudgetedProfitability.HLEVEL4_CODE,
		   MasterBudgetedProfitability.COUNTRYCODE,
		   MasterBudgetedProfitability.PROFITABILITY
  order by MasterBudgetedProfitability.COUNTRYCODE,
		   min(h.HLEVEL4_NAME);