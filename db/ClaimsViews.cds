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
    cd.Institute.InstituteName,
    cd.Date,
    cd.SKU.PRODUCTPACKNAME,
    cd.Type,
    cd.Quantity,
    cd.PurchasePrice,
    cd.DistributionArrangement,
    cd.ContractPrice,
    cd.TotalClaim,
    cd.ClaimFiles.ID as ClaimFiles_ID:UUID
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


