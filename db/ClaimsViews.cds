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
	inner join ClaimsData.ClaimData as clmd 		
            on clmd.ClaimFiles.ID = clmf.ID 
	inner join TransactionalData.PT_TMOFRS as offer 		
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
