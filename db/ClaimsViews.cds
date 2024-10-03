namespace com.bayer.SXTENDER.ClaimsViews;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using { com.bayer.SXTENDER.ClaimsData} from '../db/ClaimsData';

entity ClaimFilesView as select from ClaimsData.ClaimFiles;
entity ClaimDataView as select from ClaimsData.ClaimData as cd
{
    *,
    cd.SKU.PRODUCTPACKNAME
};
entity CalculatedBrandVolumes as select from ClaimsData.ClaimData as cd
{
	key cd.OfferID,
	key cd.ProductPackID,
	SUM(cd.BrandContractVolume) OVER (PARTITION BY cd.OfferID, cd.MainInstituteID, cd.BrandId ORDER BY cd.OfferID, cd.MainInstituteID, cd.BrandId) as BrandContractCalculatedVolume : Double,
	SUM(cd.BrandUsedVolume) OVER (PARTITION BY cd.OfferID, cd.MainInstituteID, cd.BrandId ORDER BY cd.OfferID, cd.MainInstituteID, cd.BrandId) as BrandUsedCalculatedVolume : Double
	
};
entity ClaimDataCalculatedView as select from ClaimsData.ClaimData as cd
	inner join ClaimsMaterialNumbers as materialNumbers
		on materialNumbers.ProductPackID = cd.ProductPackID
	left join CalculatedBrandVolumes as calcbrandvolumes
		on calcbrandvolumes.OfferID = cd.OfferID
		and calcbrandvolumes.ProductPackID = cd.ProductPackID
	inner join MasterData.CountryCurrency as ctryCurrency
	    on ctryCurrency.CountryCode = cd.CountryCode{
    *,
	key cd.ID,
	ctryCurrency.Currency,
	cd.createdAt,
    cd.createdBy,
    cd.modifiedAt,
	cd.modifiedBy,
	cd.OfferID,
	cd.ProductPackID,
	cd.CountryCode,
	ctryCurrency.CountryCode as CurrencyCountry,
    cd.SKU.PRODUCTPACKNAME,
    cd.SKUCountry.GOV_CODE,
    materialNumbers.MaterialNumbers,
	calcbrandvolumes.BrandUsedCalculatedVolume,
	calcbrandvolumes.BrandContractCalculatedVolume,
	CASE 
        WHEN calcbrandvolumes.BrandContractCalculatedVolume != 0 
        THEN calcbrandvolumes.BrandUsedCalculatedVolume 
              / 
             calcbrandvolumes.BrandContractCalculatedVolume
        ELSE 0 
    END as CalculatedUsage : Double
};
//To get the list of material numbers for each ProductCode
entity ClaimsMaterialNumbers as select from MasterData.PT_TMSKUPRDPCK {
	CountryCode,
	ProductPackID,
	STRING_AGG(SKUCode, ',') as MaterialNumbers: String
}where (CountryCode = 'NL' or CountryCode = 'PL') and ActiveRecord = 'Yes'
group by 
	CountryCode,
	ProductPackID;

entity ExtractClaimFilesView as select from ClaimsData.ClaimFiles as clmf
	left join ClaimsData.ClaimData as clmd 		
            on clmd.ClaimFiles.ID = clmf.ID 
	left join TransactionalData.PT_TMOFRS as offer 		
            on clmd.OfferID = offer.OfferID 
			and offer.Active = 1
	inner join MasterData.PT_TMINST as inst 
			on inst.InstituteID = clmd.MainInstituteID 
			and inst.CountryCode = clmd.CountryCode
	inner join MasterData.PT_TMDIST as distributor
    		on clmf.DistributorID = distributor.DistributorID
	inner join MasterData.PT_TMPRDPCK as productPack
    		on productPack.PRODUCTPACKID = clmd.ProductPackID
    		and productPack.ACTIVERECORD = 'Yes'
			{
				key clmf.ClaimData.OfferID,
				clmf.ID as ClaimFileID,
				clmf.ClaimData.ID as ClaimDataID,
				distributor.DistributorID,
				distributor.DistributorName,
				inst.InstituteName,
				clmf.ClaimData.Date,
				productPack.PRODUCTPACKNAME,
				clmf.ClaimData.Product.RequestedVolume,
				productPack.Product.HLEVEL4_NAME,
				clmf.ClaimData.Product.PriceCondition.Price0,
				clmf.ClaimData.Product.PriceCondition.OfferPrice,
				clmf.ClaimData.Product.PriceCondition.Price0 * clmf.ClaimData.Product.RequestedVolume as WholesalerPurchasedAmount: Double, 
				clmf.ClaimData.Product.PriceCondition.OfferPrice * clmf.ClaimData.Product.RequestedVolume as NetSales: Double,
				productPack.CONCENTRATION * clmf.ClaimData.Product.RequestedVolume as ContractBrandVolume: Double ,
				clmf.DateFrom,
				clmf.DateTo,
				clmd.CountryCode,
				clmd.Status
		};

entity ClaimFileStatusView as select from ClaimsData.ClaimFiles {
	key ID as CLAIMFILES_ID,
	case
	    when max(case when ClaimApprovals.Status = 'Rejected' then 1 else 0 end) = 1 then 'Rejected'
	    when 
	    	min(case when ClaimApprovals.Status = 'Approved' then 1 else 0 end) = 1 and min(case when ClaimData.Status = 'Passed' then 1 else 0 end) = 1
	    then 'Approved (All QC Passed)'
	    when 
	    	min(case when ClaimApprovals.Status = 'Approved' then 1 else 0 end) = 1 and min(case when ClaimData.Status != 'Passed' then 1 else 0 end) = 0
	    then 'Approved (Some QC Failed)'
	    else 'Pending'
	end as STATUS: String
}group by ID;
