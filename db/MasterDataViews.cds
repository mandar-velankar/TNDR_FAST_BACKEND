namespace com.bayer.SXTENDER.MasterDataViews;

using { User, Country, managed } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.MasterDataLatestValues } from './MasterDataLatestValues';

entity CountryBrandProducts as select from MasterData.PT_TMCTPRDPCK as Product{
	key Product.COUNTRYCODE as COUNTRY_CODE,
	Product.ProductPack.Product.HLEVEL1_NAME as DIVISION,
	Product.ProductPack.Product.HLEVEL4_CODE as BRAND_ID,
	Product.ProductPack.Product.HLEVEL4_NAME as BRAND_NAME,
	Product.ProductPack.Product.HLEVEL6_NAME as PRODUCT_UNIT_NAME,
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