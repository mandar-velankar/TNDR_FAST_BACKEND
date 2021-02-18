namespace com.bayer.SXTENDER.TransactionalDataViews;

using { User, Country, managed } from '@sap/cds/common';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from './MasterDataViews';
using { com.bayer.SXTENDER.TransactionalData } from './TransactionalData';
using { com.bayer.SXTENDER.MasterDataLatestValues } from './MasterDataLatestValues';
using { com.bayer.SXTENDER.PricingAppData } from './PricingAppData';

entity LatestApprovalRequests as select from TransactionalData.PT_TMAPPRST as approvals{
    key approvals.OfferId,
    key approvals.ApproverEmailID,
    key approvals.ApproverType,
    max(approvals.Statustime) as MaxStatusTime:DateTime
}where approvals.Active = 1
group by approvals.OfferId,
    approvals.ApproverEmailID,
    approvals.ApproverType;

entity ApprovalRequests as select from TransactionalData.PT_TMAPPRST as approvals
inner join LatestApprovalRequests as latestApprovals
    on approvals.OfferId = latestApprovals.OfferId 
    and approvals.Statustime = latestApprovals.MaxStatusTime 
    and approvals.ApproverType = latestApprovals.ApproverType
    and approvals.ApproverEmailID = latestApprovals.ApproverEmailID
    and approvals.Active = 1
inner join MasterData.PT_TMCTRY as country
    on country.CountryCode = approvals.CountryCode
inner join AdminData.PT_TMUSER user
    on approvals.Submittedby = user.CWID
{
     approvals.TenderID,
	 approvals.OfferId,
	 approvals.CountryCode,
	 approvals.ApprovalContent,
	 approvals.ApproverTypeSection,
	 approvals.ApprovalStatus,
	 approvals.ApproverName,
	 approvals.ApproverEmailID,
	 approvals.SenderComment,
	 approvals.ApproverComment,
	 approvals.Active,
	 approvals.AP_ID,
	 approvals.RestoreKey,
	 approvals.Statustime,
	 approvals.Submittedby,
	 approvals.ApproverDate,
	 approvals.ApproverType,
	 approvals.FLOW_ID,
	 approvals.REQUIRED_ACTION,
     country.CountryName,
     user.UserName,
     user.UserEmail
};

/* Nils: can be deleted later on... This is changed beceause when you delete an offer, the newly created offer is getting same nextofferid (only active offers are taken into account)
entity TenderOffers as select from TransactionalData.PT_TMTEND as tender{
    key tender.TenderID as TENDERID,
    max(tender.Offer.TenderOfferNo) + 1 as NEXTOFFERID:Integer
}group by tender.TenderID;
*/

entity TenderOffers as select from TransactionalData.PT_TMTEND as tender 
inner join TransactionalData.PT_TMOFRS as ActiveInactiveOffers
    on ActiveInactiveOffers.TenderID = tender.TenderID {
    key tender.TenderID as TENDERID,
    max(ActiveInactiveOffers.TenderOfferNo) + 1 as NEXTOFFERID:Integer
}group by tender.TenderID;

entity OfferRevisions as select from TransactionalData.PT_TMOFRS as offer{
    key offer.TenderID as TENDERID,
    key offer.TenderOfferNo as TENDEROFFERNO,
    max(offer.RevisedOfferNo) + 1 as NEXTREVISEDOFFERNO:Integer,
    max(offer.ContinuationOfferNo) + 1 as NEXTCONTINUEDOFFERNO:Integer
}group by offer.TenderID, offer.TenderOfferNo;

entity CountryTenderBrands as select from TransactionalData.PT_TMTEND as tender{
    key tender.CountryCode as COUNTRYCODE,
    key tender.Offer.Product.SKU.Product.HLEVEL4_CODE as BRANDID,
    tender.Offer.Product.SKU.Product.HLEVEL4_NAME as BRANDNAME,
    //tender.Offer.Product.SKU.Product.HLEVEL6_NAME as PRODUCT_UNIT_NAME,
}where tender.Active = 1
and tender.Offer.Active = 1
and tender.Offer.Product.Active = 1
and tender.Offer.Product.SKU.ACTIVERECORD = 'Yes'
and tender.Offer.Product.SKU.Product.HLEVEL4_CODE is not null
group by tender.CountryCode, tender.Offer.Product.SKU.Product.HLEVEL4_CODE, tender.Offer.Product.SKU.Product.HLEVEL4_NAME
//tender.Offer.Product.SKU.Product.HLEVEL6_NAME
union
select from MasterData.PT_TMCTRY as country{
    country.CountryCode as COUNTRYCODE,
    'All_Brands' as BRANDID,
    ' All' as BRANDNAME
};

entity CountryTenderNo as select from MasterData.PT_TMCTRY as country
left outer join TransactionalData.PT_TMTEND as tender on country.CountryCode = tender.CountryCode and substr(tender.TenderID, 4, 2) = substr(CURRENT_DATE, 3, 2){
    key country.CountryCode as COUNTRY_CODE,
    ifnull(max(tender.TenderNo), 1000) + 1 as NEXT_TENDER_NO:Integer
}where country.CountryCode is not null
group by country.CountryCode;

entity TenderResults as select from TransactionalData.PT_TMTEND as tender{
    tender.CountryCode as COUNTRY_CODE,
    tender.TenderID as TENDER_ID,
    key tender.Offer.OfferID as OFFER_ID,
    tender.TenderName as TENDER_NAME,
    tender.InstituteID as INSTITUTE_ID,
    tender.Institute.InstituteName as INSTITUTE_NAME,
    tender.Offer.SubmittedOn as OFFER_DATE,
    tender.Offer.Product.SKU.Product.HLEVEL4_CODE as BRAND_ID,
    tender.Offer.Product.SKU.Product.HLEVEL4_NAME as BRAND_NAME,
    key tender.Offer.Product.SKU.PRODUCTPACKID as PRODUCT_ID,
    tender.Offer.Product.SKU.PRODUCTPACKNAME as PRODUCT_NAME,
    tender.Offer.Product.Price.OfferPrice as PRICE,
    tender.Offer.Product.Price.COGS as COGS,
    tender.Offer.Product.Price.BudgetRate as BUDGET_RATE,
    tender.Offer.Currency as CURRENCY,
    tender.Offer.Product.RequestedVolume as QUANTITY,
    case when tender.Offer.Product.Price.FOC_ABS_PCT = 'PCT'
        then tender.Offer.Product.Price.FOC * tender.Offer.Product.RequestedVolume
        else tender.Offer.Product.Price.FOC
    end as FOC:Double,
    tender.Offer.Product.UnitPerPack as UOM,
    ifnull(tender.Offer.Product.Results.Outcome, 'NA') as OUTCOME:String(10),
    tender.Offer.Product.Price.OfferPrice *
    case when tender.Offer.Product.UnitPerPack = 'Unit'
        then tender.Offer.Product.SKU.PACKFACTOR
        else 1
    end as PACK_PRICE:Double,
    tender.Offer.Product.Price.OfferPrice *
    case when tender.Offer.Product.UnitPerPack = 'Unit'
        then 1
        else 1 / tender.Offer.Product.SKU.PACKFACTOR
    end as UNIT_PRICE:Double,
    tender.Offer.Product.Price.NetofferPrice *
    case when tender.Offer.Product.UnitPerPack = 'Unit'
        then tender.Offer.Product.SKU.PACKFACTOR
        else 1
    end as PACK_NET_PRICE:Double,
    tender.Offer.Product.Price.NetofferPrice *
    case when tender.Offer.Product.UnitPerPack = 'Unit'
        then 1
        else 1 / tender.Offer.Product.SKU.PACKFACTOR
    end as UNIT_NET_PRICE:Double,
    case when tender.Offer.Product.Price.FOC = 0
        then ''
        else
            case when tender.Offer.Product.Price.FOC_ABS_PCT = 'PCT'
                then round(100 * tender.Offer.Product.Price.FOC) || '%'
                else round(100 * tender.Offer.Product.Price.FOC) || ' ' || tender.Offer.Product.UnitPerPack || ''
            end
            ||
            case when tender.Offer.Product.Price.FOCType = 'FOC 1'
                then ' included'
                else ' added'
            end
    end 
    as FOC_DESCRIPTION:String(255)
}where tender.Active = 1
and tender.Offer.Active = 1
//and tender.Offer.ActiveOffer = 1
and tender.Offer.Product.Active = 1
and tender.Offer.Product.ActiveProduct = 1
and (tender.Offer.OfferStatusTable.STATUS = 'Quotation Submitted' or tender.Offer.OfferStatusTable.STATUS = 'Results Recorded' or tender.Offer.OfferStatusTable.STATUS = 'Delivery Ongoing');

entity CountryMinPrice as select from TenderResults as results{
    key results.COUNTRY_CODE,
    results.BRAND_ID,
    results.BRAND_NAME,
    key results.PRODUCT_ID,
    results.PRODUCT_NAME,
    key results.CURRENCY,
    min(results.PACK_PRICE) as MIN_PACK_PRICE:Double,
    min(results.UNIT_PRICE) as MIN_UNIT_PRICE:Double
}group by results.COUNTRY_CODE,
    results.BRAND_ID,
    results.BRAND_NAME,
    results.PRODUCT_ID,
    results.PRODUCT_NAME,
    results.CURRENCY;

entity AccountMinPrice as select from TenderResults as results{
    key results.COUNTRY_CODE,
    key results.INSTITUTE_ID,
    results.BRAND_ID,
    results.BRAND_NAME,
    key results.PRODUCT_ID,
    results.PRODUCT_NAME,
    key results.CURRENCY,
    min(results.PACK_PRICE) as MIN_PACK_PRICE:Double,
    min(results.UNIT_PRICE) as MIN_UNIT_PRICE:Double,
    min(results.PACK_NET_PRICE) as MIN_PACK_NET_PRICE:Double,
    min(results.UNIT_NET_PRICE) as MIN_UNIT_NET_PRICE:Double,
}group by results.COUNTRY_CODE,
    results.INSTITUTE_ID,
    results.BRAND_ID,
    results.BRAND_NAME,
    results.PRODUCT_ID,
    results.PRODUCT_NAME,
    results.CURRENCY;

entity PreviousApprovalTemp as select from TransactionalData.PT_TMAPPRST as approvals
inner join LatestApprovalRequests as latestApprovals
    on approvals.OfferId = latestApprovals.OfferId 
    and approvals.Statustime = latestApprovals.MaxStatusTime 
    and approvals.ApproverType = latestApprovals.ApproverType
    and approvals.ApproverEmailID = latestApprovals.ApproverEmailID
    and approvals.Active = 1
{
   approvals.OfferId as OFFER_ID,
   approvals.productcode as PRODUCT_ID,
   case when
    max(ifnull(approvals.OfferProduct.SUPPLY_UPDATE, 0)) < max(approvals.OfferProduct.Offer.APPROVALS_SENT) and
    max(ifnull(approvals.OfferProduct.PAYMENT_UPDATE, 0)) < max(approvals.OfferProduct.Offer.APPROVALS_SENT) and
    max(ifnull(approvals.OfferProduct.Price.PRICE_UPDATE, 0)) < max(approvals.OfferProduct.Offer.APPROVALS_SENT)
    then 0 else 1 end
   as NEW_APPROVAL:Integer,
   max(
       case when
        approvals.ApproverType = 'Supply Chain' and
        approvals.ApprovalStatus = 'Approved' and
        approvals.OfferProduct.SUPPLY_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT
        then 1 else 0 end
   ) 
   as SUPPLY_APPROVED:Integer,
   max(
       case when
        (approvals.ApproverType = 'Country Business' or approvals.ApproverType = 'Regional Business') and
        (approvals.ApprovalStatus = 'Waiting' or approvals.ApprovalStatus = 'Processing')
        then 1 else 0 end
   ) 
   as PENDING_BUSINESS:Integer,
   max(
       case when
        (approvals.ApproverType = 'Country Business' or approvals.ApproverType = 'Regional Business') and
        approvals.ApprovalStatus = 'Approved' and
        approvals.OfferProduct.PAYMENT_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT and
        approvals.OfferProduct.Price.PRICE_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT
        then 1 else 0 end
   )
   as BUSINESS_APPROVED:Integer,
   max(
       case when
        approvals.ApproverType = 'Country Business' and
        approvals.ApprovalStatus = 'Approved' and
        approvals.OfferProduct.PAYMENT_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT and
        approvals.OfferProduct.Price.PRICE_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT
        then 1 else 0 end
   ) 
   as COUNTRY_BUSINESS_APPROVED:Integer,
   max(
       case when
        approvals.ApproverType = 'Regional Business' and
        approvals.ApprovalStatus = 'Approved' and
        approvals.OfferProduct.PAYMENT_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT and
        approvals.OfferProduct.Price.PRICE_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT
        then 1 else 0 end
   ) 
   as REGIONAL_BUSINESS_APPROVED:Integer,
   max(
       case when
        approvals.ApproverType = 'Legal' and
        approvals.ApprovalStatus = 'Approved' and
        approvals.OfferProduct.Price.PRICE_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT
        then 1 else 0 end
   ) 
   as LEGAL_APPROVED:Integer,
   max(
       case when
        approvals.ApproverType = 'Regulatory' and
        approvals.ApprovalStatus = 'Approved' and
        approvals.OfferProduct.Price.PRICE_UPDATE < approvals.OfferProduct.Offer.APPROVALS_SENT
        then 1 else 0 end
   ) 
   as REGULATORY_APPROVED:Integer
}group by approvals.OfferId, approvals.productcode;

entity PreviousApproval as select from PreviousApprovalTemp as temp{
    key temp.OFFER_ID,
    key temp.PRODUCT_ID,
    temp.NEW_APPROVAL,
    temp.SUPPLY_APPROVED,
    temp.REGIONAL_BUSINESS_APPROVED,
    temp.COUNTRY_BUSINESS_APPROVED,
    case when temp.PENDING_BUSINESS = 1 then 0 else temp.BUSINESS_APPROVED end as BUSINESS_APPROVED:Integer,
    temp.LEGAL_APPROVED,
    case when temp.BUSINESS_APPROVED = 1 then 1 else temp.REGULATORY_APPROVED end as REGULATORY_APPROVED:Integer
};

entity InstituteMap as select from MasterData.PT_TMINST as institute{
    institute.InstituteID as PARENT_ID,
    institute.InstituteID as CHILD_ID
}where institute.ActiveRecord = 'Yes'
union
select from MasterData.PT_TMINSHIER as hierarchy{
    hierarchy.ParentInstituteID as PARENT_ID,
    hierarchy.InstituteID as CHILD_ID
}where hierarchy.ActiveRecord = 'Yes';

entity TenderHistory as select from TenderResults as results
inner join InstituteMap as institute on results.INSTITUTE_ID = institute.CHILD_ID{
    results.COUNTRY_CODE,
    results.TENDER_ID,
    key results.OFFER_ID,
    results.TENDER_NAME,
    key results.INSTITUTE_ID,
    results.INSTITUTE_NAME,
    results.OFFER_DATE,
    results.BRAND_ID,
    results.BRAND_NAME,
    key results.PRODUCT_ID,
    results.PRODUCT_NAME,
    results.UNIT_PRICE,
    results.PACK_PRICE,
    results.UNIT_NET_PRICE,
    results.PACK_NET_PRICE,
    results.COGS,
    results.BUDGET_RATE,
    results.CURRENCY,
    results.QUANTITY,
    results.FOC_DESCRIPTION as FOC:String(255),
    results.UOM,
    results.OUTCOME,
    key institute.PARENT_ID
};

entity OfferStatus as select from TransactionalData.PT_TMOFRS as offer{
    key offer.OfferID as OFFER_ID,
    case
        when offer.WholesaleOffer = 'Yes'
            then 'Wholesale Offer'
        when count(offer.Product.ActiveProduct)<>0 and sum(case when offer.Product.ActiveProduct <> 1 then 1 else 0 end) = count(offer.Product.ActiveProduct)
            then 'Offer Declined'
        when offer.OfferStatusTable.STATUS = 'Offer Created'
        or offer.OfferStatusTable.STATUS = 'Awaiting Approval'
        or offer.OfferStatusTable.STATUS = 'Offer Approved'
        or offer.OfferStatusTable.STATUS = 'Offer Declined'
        or offer.OfferStatusTable.STATUS = 'Quotation Created'
            then
                case
                    when max(offer.Product.PreviousApproval.NEW_APPROVAL) <> 0 then 'Offer Created'
                    when sum(case when offer.Product.ApprovalStatus.ApprovalStatus = 'Waiting' or offer.Product.ApprovalStatus.ApprovalStatus = 'Processing' then 1 else 0 end) <> 0 then 'Awaiting Approval'
                    when sum(case when offer.Product.ApprovalStatus.ApprovalStatus = 'Rejected' then 1 else 0 end) <> 0 then 'Offer Rejected'
                    when sum(case when
                                (offer.Product.ApprovalStatus.ApprovalStatus = 'Cancelled' or offer.Product.ApprovalStatus.ApprovalStatus = 'Cancelling' or offer.Product.ApprovalStatus.ApprovalStatus = 'Not Sent')
                                and offer.Product.ApprovalStatus.ApproverTypeSection = 1
                            then 1 else 0 end) <> 0 then 'Offer Created'
                    when count(offer.Product.ApprovalStatus.ApprovalStatus) = 0 then 'Offer Created'
                    else 'Offer Approved'
                end
        when offer.OfferStatusTable.STATUS = 'Results Recorded'
            then
                case 
                    when sum(case when offer.Product.Results.Outcome = 'FOC Negotiation' 
                                then 1 else 0 end) <> 0 then 'Awaiting FOC Negotiation' 
                    else offer.OfferStatusTable.STATUS 
                end
        else offer.OfferStatusTable.STATUS
    end as STATUS:String(255)
}where offer.OfferStatusTable.Active = 1
group by offer.OfferID, offer.WholesaleOffer, offer.OfferStatusTable.STATUS;

entity OfferValues as select from TransactionalData.PT_TMOFRS as offer{
    offer.TenderID as TENDER_ID,
    key offer.OfferID as OFFER_ID,
    offer.InternalBidDueDate as INTERNAL_BID_DUE_DATE,
    offer.OfferStatusTable.STATUS,

    sum(
        offer.Product.Price.OfferPrice *
        case when offer.Product.Price.FOCType = 'FOC 1'
            then
                case when offer.Product.Price.FOC_ABS_PCT = 'PCT'
                    then offer.Product.RequestedVolume * (1 - offer.Product.Price.FOC)
                    else offer.Product.RequestedVolume - offer.Product.Price.FOC
                end
            else offer.Product.RequestedVolume
        end
    ) as VALUE:Double,
    offer.Currency as CURRENCY,
    offer.ActiveOffer as ACTIVE_OFFER,
    offer.NewOfferDueDate as NEW_OFFER_DUE_DATE,
    case when offer.RevisedOfferNo <> 0 then 1 else 0 end as IS_REVISION:Integer,
    case when offer.OfferStatusTable.STATUS = 'Quotation Submitted' or offer.OfferStatusTable.STATUS = 'Results Recorded' or offer.OfferStatusTable.STATUS = 'Delivery Ongoing'
        then
            case when offer.SubmissionDate is null or offer.SubmissionDate = ''
                then case when offer.Quotation.SubmittedOn is null or offer.Quotation.SubmittedOn = '' then '' else offer.Quotation.SubmittedOn end
                else offer.SubmissionDate
            end
        else ''
    end as SUBMISSION_DATE:Date,
    ifnull(offer.Distributor.DistributorName, 'Not Specified') as DISTRIBUTOR:String(255)
}where offer.Active = 1
and (offer.Product.Active = 1 or offer.Product.Active is null)
and (offer.Product.Price.Active = 1 or offer.Product.Price.Active is null)
group by
    offer.TenderID, 
    offer.OfferID, 
    offer.InternalBidDueDate, 
    offer.Currency, 
    offer.WholesaleOffer,
    offer.ActiveOffer,
    offer.NewOfferDueDate,
    offer.RevisedOfferNo,
    offer.SubmissionDate,
    offer.OfferStatusTable.STATUS,
    offer.Quotation.SubmittedOn,
    offer.Distributor.DistributorName;

entity BrandsInTender as select from TransactionalData.PT_TMTEND as tender{
    tender.CountryCode as COUNTRYCODE,
    key tender.TenderID as TENDERID,
    key tender.Offer.Product.SKU.Product.HLEVEL4_CODE as BRANDID
}
where tender.Active = 1
and tender.Offer.Active = 1
and tender.Offer.Product.Active = 1;

entity TenderOfferMaster as select from TransactionalData.PT_TMTEND as tender{
    tender.CountryCode as COUNTRY,
    key tender.TenderID as TENDER_ID,
    tender.TenderName as TENDER_NAME,
    tender.Institute.InstituteName as INSTITUTE,
    tender.Brands as BRAND,
    key ifnull(tender.Offer.OfferID, '') as OFFER_ID:String(30),
    tender.Offer.OfferValue.VALUE as VALUE:Double,
    tender.Offer.Currency as CURRENCY,
    ifnull(tender.Offer.OfferStatus.STATUS, 'Offer Created') as STATUS:String(255),
    tender.PublicationDate as PUBLICATION_DATE,
    tender.Offer.InternalBidDueDate as INTERNAL_BID_DUE_DATE,
    case when tender.Offer.RevisedOfferNo = 0 and tender.Offer.ContinuationOfferNo = 0 then tender.BidDueDate else tender.Offer.NewOfferDueDate end as CLOSING_DATE:Date,
    ifnull(tender.Offer.ActiveOffer, 1) as ACTIVE_OFFER:Integer,
    ifnull(tender.Offer.PfiNumber.PFINo, '') as PFI_NO:String(255),
    ifnull(tender.Origin.CODE, 'NA') as ORIGIN_CODE:String(10),
    tender.Offer.InternalBidDueDate as OFFER_DATE,
    tender.Offer.Distributor.DistributorName as DISTRIBUTOR,
    tender.Offer.OfferValue.SUBMISSION_DATE as SUBMISSION_DATE
}where tender.Active = 1
and ifnull(Offer.Active, 1) = 1;

entity OfferProductPlus as select from TransactionalData.PT_TMOFPR as offerProduct{
    *,
    offerProduct.SKU.Product.HLEVEL4_CODE as HLEVEL4_CODE,
    offerProduct.Offer.Currency as CURRENCY,
    offerProduct.Offer.Tender.TenderChannel as TENDER_CHANNEL,
    offerProduct.Offer.DistributorID as DISTRIBUTOR_ID,
    offerProduct.Offer.Tender.InstituteID as INSTITUTE_ID
};

entity OfferProductConsolidation as select from OfferProductPlus as offerProduct
left outer join MasterDataViews.DirectBrand directBrand
    on offerProduct.INSTITUTE_ID = directBrand.INSTITUTE_ID
    and offerProduct.HLEVEL4_CODE = directBrand.BRAND_ID
    and offerProduct.DISTRIBUTOR_ID = directBrand.DISTRIBUTOR_ID
left outer join MasterDataViews.DistributorBrand distributorBrand
    on offerProduct.HLEVEL4_CODE = distributorBrand.BRAND_ID
    and offerProduct.DISTRIBUTOR_ID = distributorBrand.DISTRIBUTOR_ID
left outer join MasterDataLatestValues.VWBUDGETEDPROFITABILITY profitability
    on offerProduct.HLEVEL4_CODE = profitability.HLEVEL4_CODE 
    and offerProduct.CountryCode = profitability.COUNTRYCODE
left outer join MasterDataLatestValues.VW_MASTER_APPROVED_PRICE approved 
    on offerProduct.ProductCode = approved.PRODUCT_ID
    and offerProduct.CountryCode = approved.COUNTRY_CODE
    and offerProduct.CURRENCY = approved.CURRENCY
left outer join CountryMinPrice minPrice
    on offerProduct.ProductCode = minPrice.PRODUCT_ID
    and offerProduct.CountryCode = minPrice.COUNTRY_CODE
    and offerProduct.CURRENCY = minPrice.CURRENCY
left outer join AccountMinPrice accountPrice
    on offerProduct.ProductCode = accountPrice.PRODUCT_ID
    and offerProduct.CountryCode = accountPrice.COUNTRY_CODE
    and offerProduct.INSTITUTE_ID = accountPrice.INSTITUTE_ID
    and offerProduct.CURRENCY = accountPrice.CURRENCY
left outer join MasterDataViews.MostRecentSkuCodeForProductPack sku 
    on offerProduct.ProductCode = sku.ProductPackID 
    and offerProduct.CountryCode = sku.CountryCode
{
    offerProduct.TenderID as TENDERID,
    key offerProduct.OfferID as OFFERID,
    key offerProduct.SKU.PRODUCTPACKID as PRODUCTID,
    case offerProduct.AlternateOfferYN
        when 'Alternative to quoted products' then '**'
        when 'Alternative to requested products' then '*'
        else ''
    end || offerProduct.SKU.PRODUCTPACKNAME as PRODUCTNAME:String(500),
    offerProduct.SKU.Product.HLEVEL1_NAME as DIVISION,
	offerProduct.SKU.Product.HLEVEL4_CODE as BRANDID,
	offerProduct.SKU.Product.HLEVEL4_NAME as BRANDNAME,
    offerProduct.SKU.Product.HLEVEL6_NAME as PRODUCT_UNIT_NAME, // (thailand) add to cat-service
    sku.SKU,
    offerProduct.Reference as CODE,
	offerProduct.SKU.PACKFACTOR as PACKSIZE,
	offerProduct.SKU.CONCENTRATION as DOSAGE,
	offerProduct.SKU.UOM as UOM,
	offerProduct.SKUCountry.COUNTRYOFORIGIN as COUNTRYOFORIGIN,
	offerProduct.SKUCountry.MANUFACTURER as MANUFACTURER,
	offerProduct.SKUCountry.SHELFLIFE as SHELFLIFE,
	offerProduct.SKU.PRESENTATION as PRESENTATION,
	offerProduct.SKUCountry.VTATax as VAT,
    ifnull(offerProduct.SKUCountry.COMMENT, '') as PRODUCT_COMMENT:String(500),
	offerProduct.UnitPerPack as UNIT,
    offerProduct.RequestedVolume as REQUESTED_VOLUME,
	offerProduct.SORTER as SORTER,
	offerProduct.Offer.Currency as CURRENCY,
	offerProduct.FirstShipment as FIRST_SHIPMENT,
    offerProduct.NoofLots as NUMBER_LOTS,
    offerProduct.IntervalBetweenShipments as INTERVAL_SHIPMENTS,
	offerProduct.PaymentTerms as PAYMENT_TERMS,
	offerProduct.INCOTerms as INCO_TERMS,
    
    case when offerProduct.TENDER_CHANNEL = 'Distributor'
        then
            case when offerProduct.PaymentTerms <> distributorBrand.PAYMENT_TERMS or offerProduct.INCOTerms <> distributorBrand.INCO_TERMS then 0 else 1 end
        else
            case when offerProduct.PaymentTerms <> directBrand.PAYMENT_TERMS or offerProduct.INCOTerms <> directBrand.INCO_TERMS then 0 else 1 end
    end as IS_DEFAULT_TERMS:Integer,    
    //case when offerProduct.PAYMENT_UPDATE = 0 then 1 else 0 end as IS_DEFAULT_TERMS:Integer,

    offerProduct.SampleQuantity as SAMPLES,
	offerProduct.Price.RegPrice / (case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end) as REGISTERED_PRICE:Double,
	offerProduct.Price.OfferPrice as OFFER_PRICE,
	offerProduct.Price.NetofferPrice as NET_OFFER_PRICE,
	offerProduct.Price.NetPrice as NET_PRICE,
    offerProduct.Price.FOC as FOC,
    offerProduct.Price.FOCType as FOC_TYPE,
	offerProduct.Price.FOC_ABS_PCT as FOC_ABS_PCT,
	offerProduct.Price.COGS * offerProduct.Price.SpotRate / (case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end) as COGS:Double,
	offerProduct.Price.BudgetRate as BUDGET_RATE,
    offerProduct.Price.SpotRate as SPOT_RATE,
    offerProduct.PreviousApproval.BUSINESS_APPROVED as BUSINESS_APPROVED,
    offerProduct.PreviousApproval.COUNTRY_BUSINESS_APPROVED as COUNTRY_BUSINESS_APPROVED,
    offerProduct.PreviousApproval.LEGAL_APPROVED as LEGAL_APPROVED,
    offerProduct.PreviousApproval.REGIONAL_BUSINESS_APPROVED as REGIONAL_BUSINESS_APPROVED,
    offerProduct.PreviousApproval.REGULATORY_APPROVED as REGULATORY_APPROVED,
    offerProduct.PreviousApproval.SUPPLY_APPROVED as SUPPLY_APPROVED,
    ifnull(approved.APPROVED_PRICE
    * case when approved.UOM = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end
    / case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end, 0) as APPROVED_PRICE,
    ifnull(case when offerProduct.UnitPerPack = 'Unit' then minPrice.MIN_UNIT_PRICE else minPrice.MIN_PACK_PRICE end, 0) as MIN_PRICE,
    ifnull(case when offerProduct.UnitPerPack = 'Unit' then accountPrice.MIN_UNIT_PRICE else accountPrice.MIN_PACK_PRICE end, 0) as ACCOUNT_OFFER_PRICE,
    ifnull(case when offerProduct.UnitPerPack = 'Unit' then accountPrice.MIN_UNIT_NET_PRICE else accountPrice.MIN_PACK_NET_PRICE end, 0) as ACCOUNT_NET_OFFER_PRICE,
    0 as FLOOR_PRICE:Double,//Plan for Thailand
    0 as GUIDANCE_PRICE:Double,//Plan for Thailand
    0 as THRESHOLD_VOLUME:Double,//Plan for Mexico
	offerProduct.SKUCountry.REGISTERED as IS_REGISTERED,
	case when offerProduct.AlternateOfferYN = 'Alternative to quoted products' then 1 else 0 end as IS_ALTERNATIVE_QUOTED:Integer,
	case when offerProduct.AlternateOfferYN = 'Alternative to requested products' then 1 else 0 end as IS_ALTERNATIVE_REQUESTED:Integer,
	ifnull(offerProduct.PreviousApproval.NEW_APPROVAL, 1) as NEW_APPROVAL:Integer,
    ifnull(profitability.PROFITABILITY, -1) as BUDGETED_PROFITABILITY:Double,
    offerProduct.Price.FOC_Bundled_1 as FOC_BUNDLED_1,
    offerProduct.Price.FOC_ABS_PCT_Bundled_1 as FOC_BUNDLED_1_ABS_PCT,
    offerProduct.Price.Bundled_1_SKU.PRODUCTPACKNAME as FOC_BUNDLED_1_PRODUCT_NAME,
    offerProduct.Price.Bundled_1_SKU.PACKFACTOR as FOC_BUNDLED_1_PACKSIZE,
    offerProduct.Price.Bundled_1_Cogs.COGS * offerProduct.Price.SpotRate / (case when offerProduct.UnitPerPack = 'Unit' then offerProduct.Price.Bundled_1_SKU.PACKFACTOR else 1 end) as FOC_BUNDLED_1_COGS,
    offerProduct.SKUCountry.QTY_THRESHOLD * (case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end) as QTY_THRESHOLD:Double
}where offerProduct.Active = 1 and offerProduct.Offer.Active = 1 and offerProduct.Offer.Tender.Active = 1 and offerProduct.ActiveProduct = 1;

entity OfferConsolidation as select from TransactionalData.PT_TMOFRS as offer
left outer join MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory1
    on offer.SellingCompany = signatory1.LEGAL_ENTITY_CODE
    and offer.CountryCode = signatory1.COUNTRY_CODE
    and signatory1.SORTER = 1
left outer join MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory2
    on offer.SellingCompany = signatory2.LEGAL_ENTITY_CODE
    and offer.CountryCode = signatory2.COUNTRY_CODE
    and signatory2.SORTER = 2
{	
	'PT_TMTNOFST(TENDERID=''' || offer.TenderID || ''',OFFERID=''' || offer.OfferID || ''',Active=1)' as OFFERSTATUSPATH:String(500),
	offer.TenderID as TENDERID,
    offer.Tender.Institute.InstituteType as INSTITUTE_TYPE,
    offer.Tender.Classification as CLASSIFICATION,//Added Classification (db#1)
    //offer.Tender.Institute.CustomerID as CUSTOMERCODE,
    case when offer.Tender.TenderChannel<>'Direct' then 'Distributor' else 'Direct' end as TENDER_CHANNEL:String(500),
	offer.Tender.Institute.InstituteName || ' - ' || offer.Tender.TenderName as TENDER_REFERENCE:String(500),
	key offer.OfferID as OFFERID,
    offer.Tender.Institute.InstituteName as INSTITUTENAME,
    offer.OfferStatus.STATUS as STATUS,
    offer.Tender.Country.ApprovalType as APPROVAL_TYPE,
	ifnull(offer.Quotation.OfferDate, CURRENT_DATE) as OFFERDATE,
	ifnull(offer.Quotation.OfferValidity, to_date('2021-07-31')) as OFFERVALIDITY,
	offer.CountryCode as COUNTRYCODE,
	offer.SellingCompanyDetails.LegalEntityName as SELLINGCOMPANY,
    offer.SellingCompanyDetails.BankDetails as SELLINGCOMPANYBANK,
    ifnull(offer.Quotation.AS1, signatory1.AUTHORIZED_SIGNATORY) as SELLING_COMPANY_AS1:String(500),
	ifnull(offer.Quotation.AS2, signatory2.AUTHORIZED_SIGNATORY) as SELLING_COMPANY_AS2:String(500),
	offer.Currency as CURRENCY,
    ifnull(offer.SellingCompanyDetails.Letterhead, '') as LETTERHEAD:String(500),
    ifnull(offer.SellingCompanyDetails.Remarks, '') as SELLING_COMPANY_REMARKS:String(500),
    ifnull(offer.SellingCompanyDetails.FooterComment, '') as SELLING_COMPANY_FOOTER:String(500),
	case offer.Tender.TenderChannel
        when 'Direct' then offer.Tender.Institute.InstituteName
        else offer.Distributor.DistributorName
    end as DISTRIBUTORNAME,
	case offer.Tender.TenderChannel
        when 'Direct' then offer.Tender.Institute.Address
        else offer.Distributor.Address
    end as DISTRIBUTORADDRESS:String(500),
	case offer.Tender.TenderChannel
        when 'Direct' then offer.Tender.Institute.ContactNo
        else offer.Distributor.ContactNo
    end as DISTRIBUTORPHONE:String(500),
	case offer.Tender.TenderChannel
        when 'Direct' then offer.Tender.Institute.Fax
        else offer.Distributor.Fax
    end as DISTRIBUTORFAX:String(500),
	case offer.Tender.TenderChannel
        when 'Direct' then offer.Tender.Institute.ContactPerson
        else offer.Distributor.ContactPerson
    end as DISTRIBUTORCONTACT:String(500),
	ifnull(offer.Quotation.Comment, '') as CUSTOM_REMARKS:String(500),
    offer.FOCType as FOC_TYPE,
    ifnull(offer.Country.COMMENT, '') as COUNTRY_COMMENT
}where offer.Active = 1 and offer.Tender.Active = 1;

entity QuotationUpdates as select from TransactionalData.PT_TMQUTO as quotation
inner join TransactionalDataViews.OfferStatus status on quotation.OfferID = status.OFFER_ID{
    key 'PT_TMQUTO(OfferID=''' || quotation.OfferID || ''',Active=1,OfferDate=' || quotation.OfferDate || ')' as QUOTATION_PATH:String(500),
    quotation.CountryCode as COUNTRY_CODE,
    quotation.TenderID as TENDER_ID,
    quotation.OfferID as OFFER_ID,
    quotation.OfferDate as OFFER_DATE,
    quotation.OfferValidity as OFFER_VALIDITY,
    quotation.Comment as COMMENT,
    quotation.AS1 as APPROVER1,
    quotation.AS2 as APPROVER2,
}where quotation.UPDATED <> 1
and status.STATUS='Offer Approved'
and quotation.Active = 1;

entity PreApprovedPrices as select from PricingAppData.InstituteGroupPriceLatest as price{
    key price.InstituteGroup.Institutes.InstituteId,
    key price.ProductPackId,
    key price.Currency,
    case when price.UoM = 'Unit' then price.MSP else price.MSP / price.ProductPack.PACKFACTOR end as PriceUnit:Double,
    case when price.UoM = 'Unit' then price.MSP * price.ProductPack.PACKFACTOR else price.MSP end as PricePack:Double
};