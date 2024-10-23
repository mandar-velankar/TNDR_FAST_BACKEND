using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using {com.bayer.SXTENDER.TransactionalDataViews} from '../db/TransactionalDataViews';
using { com.bayer.SXTENDER.ClaimsData } from '../db/ClaimsData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/MasterDataViews';
using { com.bayer.SXTENDER.ClaimsViews } from '../db/ClaimsViews';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service ClaimsService @(path: 'claims') @(requires:['f_tndr_cag_admin','f_tndr_cag_claims_user','f_tndr_cag_technical_user','authenticated-user']){

    entity PT_TMOFRS as projection on TransactionalData.PT_TMOFRS;
    entity PT_TMDIST as projection on MasterData.PT_TMDIST;
    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    entity CountryTenderBrands @readonly as projection on TransactionalDataViews.CountryTenderBrands;

    entity ClaimFiles @(cds.redirection.target:true) as projection on ClaimsData.ClaimFiles;
    entity ClaimData @(cds.redirection.target:true) as projection on ClaimsData.ClaimData;
    entity ClaimFilesView as projection on ClaimsViews.ClaimFilesView;
    entity ClaimDataView as projection on ClaimsViews.ClaimDataView;
    entity ClaimDataCalculatedView as projection on ClaimsViews.ClaimDataCalculatedView;
    entity ExcelTemplate as projection on AdminData.ExcelTemplate;

    entity ContrastAgentSalesData as projection on ClaimsData.ContrastAgentSalesData;
    entity ContrastAgentSalesDataNL as projection on ClaimsData.ContrastAgentSalesDataNL;
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

    entity ClaimDataBrandsView as projection on ClaimsViews.ClaimDataBrandsView;

    entity ExtractApprovedClaim{
        key templateId    : String;
        key CountryCode   : String;
        key ClaimFileID   : String;
        key Brand         : String;
        key Status        : String;
        key Type          : String;
            content       : LargeBinary @Core.MediaType : mediaType; //'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            mediaType     : String      @Core.IsMediaType;
    }
     entity ExtractClaimsSales {
        key templateId    : String;
        key CountryCode   : String;
        key DistributorID : String;
        key BrandId       : String;
        key Status        : String;
        key DateFrom      : String;
        key DateTo        : String;
            content       : LargeBinary @Core.MediaType : mediaType; //'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            mediaType     : String      @Core.IsMediaType;
    }
    
    entity PLExtractClaimFilesView as projection on ClaimsViews.PLExtractClaimFilesView;
    entity NLExtractClaimFilesView as projection on ClaimsViews.NLExtractClaimFilesView;
    entity ExtractClaimDataView as projection on ClaimsViews.ExtractClaimDataView;

    entity ExtractFASTOffer as select from TransactionalData.PT_TMTEND as tender 
        inner join TransactionalData.PT_TMOFRS as offer 
            on offer.TenderID = tender.TenderID
            and offer.Active = 1
        inner join TransactionalData.PT_TMOFPR as product 
            on product.OfferID = offer.OfferID
            and product.Active = 1 
        inner join MasterData.PT_TMINST as institute 
            on tender.InstituteID = institute.InstituteID{
    	tender.TenderID,
        institute.InstituteID,
        offer.OfferID,
        product.ProductCode,
        tender.CountryCode,
        product.RequestedVolume,
        product.Results.Outcome,
        offer.Quotation.EffectiveDate,
        offer.Quotation.ExpiryDate,
        product.Price.OfferPrice,
        product.Price.RegPrice,
        product.SKU.CONCENTRATION,
        product.SKU.Product.HLEVEL4_CODE as BrandId:String,
        product.SKU.Product.HLEVEL4_NAME as BrandName:String
    }
    where product.Results.Outcome = 'Won' and tender.Active = 1 and offer.Active = 1
    group by 
        tender.TenderID,
        institute.InstituteID,
        offer.OfferID,
        product.ProductCode,
        product.RequestedVolume,
        tender.CountryCode,
        product.Results.Outcome,
        offer.Quotation.EffectiveDate,
        offer.Quotation.ExpiryDate,
        product.Price.OfferPrice,
        product.Price.RegPrice,
        product.SKU.Product.HLEVEL4_NAME,
        product.SKU.Product.HLEVEL4_CODE,
        product.SKU.CONCENTRATION;

    entity ClaimApproverTypes as projection on ClaimsData.ClaimApproverTypes;
    entity ClaimApprovals @(cds.redirection.target:true) as projection on ClaimsData.ClaimApprovals;
    entity UserClaimApprovals @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'ApproverCWID = $user.id'}
	])as projection on ClaimsData.ClaimApprovals;
    entity ClaimFileStatusView as projection on ClaimsViews.ClaimFileStatusView;

    entity ExtractFASTOfferNL as select from TransactionalData.PT_TMTEND as tender 
        inner join TransactionalData.PT_TMOFRS as offer 
            on offer.TenderID = tender.TenderID
            and offer.Active = 1
        inner join TransactionalData.PT_TMOFPR as product 
            on product.OfferID = offer.OfferID
            and product.Active = 1
        inner join TransactionalData.ContractInfomation as contract
            on contract.ProductCode = product.ProductCode
            and contract.Active = true{
    	tender.TenderID,
        contract.InstituteID,
        contract.ContractStartDate,
        contract.ContractEndDate,
        contract.ContractDuration,
        offer.DistributorID,
        offer.OfferID,
        product.ProductCode,
        tender.CountryCode,
        product.RequestedVolume,
        product.Results.Outcome,
        offer.Quotation.EffectiveDate,
        offer.Quotation.ExpiryDate,
        product.Price.OfferPrice,
        product.Price.RegPrice,
        product.SKU.CONCENTRATION,
        product.SKU.Product.HLEVEL4_CODE as BrandId:String,
        product.SKU.Product.HLEVEL4_NAME as BrandName:String
    }
    where product.Results.Outcome = 'Won' and tender.Active = 1 and offer.Active = 1
    group by 
        tender.TenderID,
        contract.InstituteID,
        contract.ContractStartDate,
        contract.ContractEndDate,
        contract.ContractDuration,
        offer.DistributorID,
        offer.OfferID,
        product.ProductCode,
        product.RequestedVolume,
        tender.CountryCode,
        product.Results.Outcome,
        offer.Quotation.EffectiveDate,
        offer.Quotation.ExpiryDate,
        product.Price.OfferPrice,
        product.Price.RegPrice,
        product.SKU.Product.HLEVEL4_NAME,
        product.SKU.Product.HLEVEL4_CODE,
        product.SKU.CONCENTRATION;

    entity ExcelClaimFileSalesReportTemplate as projection on ClaimsData.ExcelClaimFileSalesReportTemplate;
    entity NLExtractClaimDataView as projection on ClaimsViews.NLExtractClaimDataView;

    action approveRejectClaimFiles(claimFile_ID: String, countryCode: String, status: String, claimFileDetailPageURL: String) returns String;
}
