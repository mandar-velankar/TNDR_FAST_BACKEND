namespace com.bayer.SXTENDER.ClaimsViews;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using { com.bayer.SXTENDER.ClaimsData} from '../db/ClaimsData';

entity ClaimFilesView as select from ClaimsData.ClaimFiles as cf
	left join ClaimFilesApprovalsCount as approvalscount
		on approvalscount.ClaimFiles_ID = cf.ID
	left join CountryCurrencyView as ctryCurrency
	    on ctryCurrency.CountryCode = cf.CountryCode {
	key cf.ID,
	key cf.CountryCode,
	cf.createdAt,
	cf.ClaimFileFormat,
    cf.FileName,
    cf.DateFrom,
    cf.DateTo,
    cf.FilePeriod,
    cf.DistributorID,
    cf.DistributorName,
    cf.WholesalerPurchaseAmount,
    cf.NetSales,
    cf.TotalClaimAmount,
    cf.Status,
	ctryCurrency.Currency,
    case
		when approvalscount.TotalApprovalsCount > 0
			then cf.ApprovalsCount || '/' || approvalscount.TotalApprovalsCount
		else '0'
	end as ApprovalsCount : String
};

entity ClaimDataView as select from ClaimsData.ClaimData as cd 
	left join CountryCurrencyView as ctryCurrency
	    on ctryCurrency.CountryCode = cd.CountryCode{
	*,
	key cd.ID,
	cd.CountryCode,
	ctryCurrency.Currency
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
	left join MasterData.CountryCurrency as ctryCurrency
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
	cd.UsedVolume,
	ctryCurrency.CountryCode as CurrencyCountry,
    cd.SKU.PRODUCTPACKNAME,
    cd.SKUCountry.GOV_CODE,
	cd.FASTDistributionAgreementType,
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

entity ExtractCalculatedBrandVolumes as select from ClaimsData.ClaimData as cd
{
	key cd.OfferID,
	key cd.ProductPackID,
	SUM(cd.BrandContractVolume) OVER (PARTITION BY cd.BrandId ORDER BY cd.BrandId) as BrandContractCalculatedVolume : Double,
	SUM(cd.BrandUsedVolume) OVER (PARTITION BY cd.OfferID, cd.BrandId ORDER BY cd.OfferID, cd.BrandId) as BrandUsedCalculatedVolume : Double
	
};
entity PLExtractClaimFilesView as select from ClaimsData.ClaimFiles as clmf
	left join ClaimsData.ClaimData as clmd 		
            on clmd.ClaimFiles.ID = clmf.ID 
	inner join MasterData.PT_TMDIST as distributor
    		on clmf.DistributorID = distributor.DistributorID
	inner join MasterData.PT_TMPRDPCK as productPack
    		on productPack.PRODUCTPACKID = clmd.ProductPackID
    		and productPack.ACTIVERECORD = 'Yes'
	left join CalculatedBrandVolumes as calcbrandvolumes
			on calcbrandvolumes.OfferID = clmd.OfferID
			and calcbrandvolumes.ProductPackID = clmd.ProductPackID
			{
				clmf.ID as ClaimFileID,
				clmd.ID as ClaimDataID,
				clmd.OfferID,
				distributor.DistributorID,
				distributor.DistributorName,
				clmd.MainInstituteName,
				clmd.External_InstituteId,
				clmd.Date,
				clmd.BrandName,
				clmd.PRODUCTPACKNAME,
				clmd.EANNumber,
				clmd.Quantity,
				clmd.Quantity * productPack.CONCENTRATION as QuantityML: Double,
				clmd.WholesalerPurchasePrice,
				clmd.WholesalerContractPrice,
				clmd.Quantity * clmd.WholesalerPurchasePrice as WholesalerPurchasedAmount: Double, 
				clmd.Quantity * clmd.WholesalerContractPrice as NetSales: Double,
				calcbrandvolumes.BrandContractCalculatedVolume,
				calcbrandvolumes.BrandUsedCalculatedVolume,
				CASE 
					WHEN calcbrandvolumes.BrandContractCalculatedVolume != 0 
					THEN calcbrandvolumes.BrandUsedCalculatedVolume 
						/ 
						calcbrandvolumes.BrandContractCalculatedVolume
					ELSE 0 
				END as ContractBrandUsage : Double,
				clmf.DateFrom,
				clmf.DateTo,
				clmf.CountryCode,
				clmf.Status as ClaimFileStatus : String,
				clmd.BrandId
		}where clmf.CountryCode = 'PL';

entity NLExtractClaimFilesView as select from ClaimsData.ClaimFiles as cf
	left join ClaimsData.ClaimData as cd 		
            on cd.ClaimFiles.ID = cf.ID 
	inner join MasterData.PT_TMPRDPCK as productPack
    		on productPack.PRODUCTPACKID = cd.ProductPackID
    		and productPack.ACTIVERECORD = 'Yes'
	inner join MasterData.PT_TMPRDHIER as hier
			on productPack.HLEVEL6_CODE = hier.HLEVEL6_CODE
	inner join MasterData.PT_TMSKUPRDPCK as sku
			on sku.CountryCode = cf.CountryCode
			and sku.ActiveRecord = 'Yes'
			and sku.ProductPackID = cd.ProductPackID{
	cf.ID as ClaimFileID,
	cf.DistributorName,
	cf.DistributorID,
	cf.DateFrom,
	cf.DateTo,
	cf.CountryCode,
	cf.ClaimApprovals.modifiedAt as ClaimApprovalModifiedAt,
	cf.Status as ClaimFileStatus,
	cd.Status as ClaimDataStatus,
	cd.OfferID,
	cd.ID as ClaimDataID,
	cd.MainInstituteName,
	cd.ChildInstituteName,
	cd.Date,
	cd.PRODUCTPACKNAME,
	cd.ProductPackID,
	cd.FASTDistributionArrangement,
	cd.Quantity,
	cd.WholesalerContractPrice,
	cd.FASTContractPrice,
	cd.WholesalerPurchasePrice,
	cd.FASTWholesalerPurchasePrice,
	cd.WholesalerClaim1,
	cd.FASTClaim1,
	cd.WholesalerClaim2,
	cd.FASTClaim2,
	cd.TotalWholesalerClaim,
	cd.TotalFASTClaim,
	cd.Comment,
	cd.BrandId,
	cd.Type,
	cd.FASTDistributionAgreementType,
	cd.WholesalerDistributionArrangement,
	cd.AppliedWholesalerCorrection,
	cd.FASTPendingCorrection,
	cd.BrandContractVolume,
	cd.UsedVolume,
	cd.PercentageUsage,
	cd.QC1Passed,
	cd.QC2Passed,
	cd.Balance,
	cd.FASTWholesalerPurchasePrice * cd.Quantity as WholesalerPurchaseAmount: Double,
	cd.FASTContractPrice * cd.Quantity as NetSales: Double,
	cd.Product.PriceCondition.OfferPrice,
	cd.Product.SKUCountry.GOV_CODE,
	hier.HLEVEL4_NAME,
	sku.SKUCode
} where cf.CountryCode = 'NL'
group by cf.ID,
	cf.DistributorName,
	cf.DistributorID,
	cf.DateFrom,
	cf.DateTo,
	cf.CountryCode,
	cf.ClaimApprovals.modifiedAt,
	cf.Status,
	cd.Status,
	cd.OfferID,
	cd.ID,
	cd.MainInstituteName,
	cd.ChildInstituteName,
	cd.Date,
	cd.PRODUCTPACKNAME,
	cd.ProductPackID,
	cd.FASTDistributionArrangement,
	cd.Quantity,
	cd.WholesalerContractPrice,
	cd.FASTContractPrice,
	cd.WholesalerPurchasePrice,
	cd.FASTWholesalerPurchasePrice,
	cd.WholesalerClaim1,
	cd.FASTClaim1,
	cd.WholesalerClaim2,
	cd.FASTClaim2,
	cd.TotalWholesalerClaim,
	cd.TotalFASTClaim,
	cd.Comment,
	cd.BrandId,
	cd.Type,
	cd.FASTDistributionAgreementType,
	cd.FASTWholesalerPurchasePrice,
	cd.FASTContractPrice,
	cd.Product.PriceCondition.OfferPrice,
	cd.Product.SKUCountry.GOV_CODE,
	cd.WholesalerDistributionArrangement,
	cd.AppliedWholesalerCorrection,
	cd.FASTPendingCorrection,
	cd.BrandContractVolume,
	cd.UsedVolume,
	cd.PercentageUsage,
	cd.QC1Passed,
	cd.QC2Passed,
	cd.Balance,
	hier.HLEVEL4_NAME,
	sku.SKUCode;

entity NLExtractClaimDataView as select from NLExtractClaimFilesView as cd{
	*,
}where cd.ClaimFileStatus = 'Approved (All QC passed)' or cd.ClaimFileStatus = 'Approved (Some QC failed)';
entity ClaimFileStatusView as select from ClaimsData.ClaimFiles {
	key ID as CLAIMFILES_ID,
	case
	    when max(case when ClaimApprovals.Status = 'Rejected' then 1 else 0 end) = 1 then 'Rejected'
	    when 
	    	min(case when ClaimApprovals.Status = 'Approved' then 1 else 0 end) = 1 and min(case when ClaimData.Status = 'Passed' then 1 else 0 end) = 1
	    then 'Approved (All QC Passed)'
	    when 
	    	min(case when ClaimApprovals.Status = 'Approved' then 1 else 0 end) = 1 and max(case when ClaimData.Status != 'Passed' then 1 else 0 end) = 1
	    then 'Approved (Some QC Failed)'
	    else 'Pending'
	end as STATUS: String
}group by ID;

entity ClaimDataBrandsView as select from ClaimsData.ClaimData{
    key BrandId as BRANDID,
    CountryCode as COUNTRYCODE,
    ID as ClaimData_ID,
    ClaimFiles.ID as ClaimFiles_ID
};


entity ExtractClaimDataView  as select from ClaimsData.ClaimFiles as clmf
	left join ClaimsData.ClaimData as clmd 		
            on clmd.ClaimFiles.ID = clmf.ID 
	inner join MasterData.PT_TMPRDPCK as productPack
    		on productPack.PRODUCTPACKID = clmd.ProductPackID
			and productPack.ACTIVERECORD = 'Yes'
	left join MasterData.PT_TMINST as inst 
			on inst.InstituteID = clmd.MainInstituteID 
			and inst.CountryCode = clmd.CountryCode{
			clmf.ID as ClaimFileID,
			clmd.ID as ClaimDataID,
			productPack.PRODUCTPACKNAME,
			clmd.SKUCountry.GOV_CODE,
			clmd.Quantity,
			clmd.WholesalerPurchasePrice,
			clmd.WholesalerContractPrice,
			inst.External_InstituteId,
			clmd.MainInstituteName,
			clmf.ContrastAgentSalesData.NrFaktury,
			clmd.Date,
			clmf.ContrastAgentSalesData.RoznicaCenaZakupuPNM,
			clmf.ContrastAgentSalesData.WartoscPNM,
			clmd.TotalWholesalerClaim,
			clmf.ContrastAgentSalesData.IloscSztukDoWyrownania,
			clmf.ContrastAgentSalesData.NrFakturyZakupu,
			clmd.Product.PriceCondition.Price0,
			clmd.FASTContractPrice,
			clmd.FASTContractClaim,
			clmd.Comment,
			clmd.Status,
			clmd.Type,
			clmd.BrandId,
}where  clmf.Status = 'Approved (All QC passed)' or clmf.Status = 'Approved (Some QC failed)'
	group by clmf.ID,
			clmd.ID,
			productPack.PRODUCTPACKNAME,
			clmd.SKUCountry.GOV_CODE,
			clmd.Quantity,
			clmd.WholesalerPurchasePrice,
			clmd.WholesalerContractPrice,
			inst.External_InstituteId,
			clmd.MainInstituteName,
			clmf.ContrastAgentSalesData.NrFaktury,
			clmd.Date,
			clmf.ContrastAgentSalesData.RoznicaCenaZakupuPNM,
			clmf.ContrastAgentSalesData.WartoscPNM,
			clmd.TotalWholesalerClaim,
			clmf.ContrastAgentSalesData.IloscSztukDoWyrownania,
			clmf.ContrastAgentSalesData.NrFakturyZakupu,
			clmd.Product.PriceCondition.Price0,
			clmd.FASTContractPrice,
			clmd.FASTContractClaim,
			clmd.Comment,
			clmd.Status,
			clmd.Type,
			clmd.BrandId;
entity ClaimFilesApprovalsCount as select from ClaimsData.ClaimApprovals{
	key ClaimFiles.ID as ClaimFiles_ID,
    count(*) as TotalApprovalsCount: Integer
}group by ClaimFiles.ID;

entity CountryCurrencyView as select from MasterData.CountryCurrency {
	key CountryCode,
	Currency
};