using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using { com.bayer.SXTENDER.ClaimsData } from '../db/ClaimsData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/MasterDataViews';
using { com.bayer.SXTENDER.ClaimsViews } from '../db/ClaimsViews';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service ClaimsService @(path: 'claims') @(requires:['f_tndr_cag_admin','f_tndr_cag_claims_user','f_tndr_cag_technical_user','authenticated-user']){


    entity PT_TMDIST as projection on MasterData.PT_TMDIST;
    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    entity CountryTenderBrands @readonly as projection on TransactionalDataViews.CountryTenderBrands;

    entity ClaimFiles @(cds.redirection.target:true) as projection on ClaimsData.ClaimFiles;
    entity ClaimData @(cds.redirection.target:true) as projection on ClaimsData.ClaimData;
    entity ClaimFilesView as projection on ClaimsViews.ClaimFilesView;
    entity ClaimDataView as projection on ClaimsViews.ClaimDataView;

    entity ContrastAgentSalesData as projection on ClaimsData.ContrastAgentSalesData;
    entity SalesReportFile as projection on ClaimsData.SalesReportFile;

    entity UserCountries @readonly @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
        Country: redirected to Country,
        User: redirected to Users,
        User.UserName,
        User.UserEmail
    };

    entity ClaimProductBrands as select from TransactionalData.PT_TMTEND as tender{
        tender.CountryCode as COUNTRYCODE,
        key tender.TenderID as TENDERID,
        key tender.Offer.Product.SKU.Product.HLEVEL4_CODE as BRANDID,
        key tender.Offer.OfferID as OFFERID,
        tender.Offer.Product.ProductCode as PRODUCTCODE
    };

    entity ClaimDataBrandsView as select from ClaimData as cd
        inner join ClaimProductBrands as bt
            on bt.COUNTRYCODE = cd.CountryCode
            and bt.OFFERID = cd.OfferID
            and bt.PRODUCTCODE = cd.ProductPackID {
        key bt.BRANDID,
        key bt.OFFERID,
        bt.COUNTRYCODE,
        cd.ID as ClaimData_ID,
        cd.ClaimFiles.ID as ClaimFiles_ID
    };

}
