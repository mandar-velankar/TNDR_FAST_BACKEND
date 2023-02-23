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
inner join AdminData.PT_TMUSER as user
    on approvals.Submittedby = user.CWID
{
    key approvals.TenderID,
	key approvals.OfferId,
	key approvals.CountryCode,
	 approvals.ApprovalContent,
	 approvals.ApproverTypeSection,
	 approvals.ApprovalStatus,
	 approvals.ApproverName,
	 approvals.ApproverEmailID,
	 approvals.SenderComment,
	 approvals.ApproverComment,
	 approvals.Active,
     approvals.Hierarchy,
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
} where approvals.ApprovalStatus <> 'Cancelled';

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
                //else round(100 * tender.Offer.Product.Price.FOC) || ' ' || tender.Offer.Product.UnitPerPack || ''
                // ETIEF modified the else condition to fix Historic offers FOC display
                else round(tender.Offer.Product.Price.FOC) || ' ' || tender.Offer.Product.UnitPerPack || ''
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
//EHQUT-Restrict the Zero Min Price for sending Notification to Controlling
entity CountryMinPrice as select from TenderResults as results{
    key results.COUNTRY_CODE,
    results.BRAND_ID,
    results.BRAND_NAME,
    key results.PRODUCT_ID,
    results.PRODUCT_NAME,
    key results.CURRENCY,
    min(results.PACK_PRICE) as MIN_PACK_PRICE:Double,
    min(results.UNIT_PRICE) as MIN_UNIT_PRICE:Double
}where UNIT_PRICE>0 and PACK_PRICE>0
group by results.COUNTRY_CODE,
    results.BRAND_ID,
    results.BRAND_NAME,
    results.PRODUCT_ID,
    results.PRODUCT_NAME,
    results.CURRENCY;
//EHQUT-Restrict the Zero Min Price for sending Notification to Controlling
entity AccountMinPrice as select from MasterData.AccountPreApprovedPrices as a full outer join
TenderResults as results on results.COUNTRY_CODE = a.COUNTRY_CODE and results.INSTITUTE_ID = a.INSTITUTE_ID and results.PRODUCT_ID = a.PRODUCT_ID and results.CURRENCY = a.CURRENCY {
    key ifnull(results.COUNTRY_CODE, a.COUNTRY_CODE) as COUNTRY_CODE:String,
    key ifnull(results.INSTITUTE_ID, a.INSTITUTE_ID) as INSTITUTE_ID:String,
    results.BRAND_ID,
    results.BRAND_NAME,
    key ifnull(results.PRODUCT_ID, a.PRODUCT_ID) as PRODUCT_ID:String,
    results.PRODUCT_NAME,
    key ifnull(results.CURRENCY, a.CURRENCY) as CURRENCY:String,
    case
        when min(ifnull(results.PACK_PRICE, 0)) = 0 then min(ifnull(a.MIN_PACK_PRICE, 0))
        when min(ifnull(a.MIN_PACK_PRICE, 0)) = 0 then min(results.PACK_PRICE)
        when min(results.PACK_PRICE) < min(a.MIN_PACK_PRICE) then min(results.PACK_PRICE) else min(a.MIN_PACK_PRICE)
    end as MIN_PACK_PRICE:Double,
    case
        when min(ifnull(results.UNIT_PRICE, 0)) = 0 then min(ifnull(a.MIN_UNIT_PRICE, 0))
        when min(ifnull(a.MIN_UNIT_PRICE, 0)) = 0 then min(results.UNIT_PRICE)
        when min(results.UNIT_PRICE) < min(a.MIN_UNIT_PRICE) then min(results.UNIT_PRICE) else min(a.MIN_UNIT_PRICE)
    end as MIN_UNIT_PRICE:Double,
    case
        when min(ifnull(results.PACK_NET_PRICE, 0)) = 0 then min(ifnull(a.MIN_PACK_NET_PRICE, 0))
        when min(ifnull(a.MIN_PACK_NET_PRICE, 0)) = 0 then min(results.PACK_NET_PRICE)
        when min(results.PACK_NET_PRICE) < min(a.MIN_PACK_NET_PRICE) then min(results.PACK_NET_PRICE) else min(a.MIN_PACK_NET_PRICE)
    end as MIN_PACK_NET_PRICE:Double,
    case
        when min(ifnull(results.UNIT_NET_PRICE, 0)) = 0 then min(ifnull(a.MIN_UNIT_NET_PRICE, 0))
        when min(ifnull(a.MIN_UNIT_NET_PRICE, 0)) = 0 then min(results.UNIT_NET_PRICE)
        when min(results.UNIT_NET_PRICE) < min(a.MIN_UNIT_NET_PRICE) then min(results.UNIT_NET_PRICE) else min(a.MIN_UNIT_NET_PRICE)
    end as MIN_UNIT_NET_PRICE:Double,
}group by results.COUNTRY_CODE,
    a.COUNTRY_CODE,
    results.INSTITUTE_ID,
    a.INSTITUTE_ID,
    results.BRAND_ID,
    results.BRAND_NAME,
    results.PRODUCT_ID,
    a.PRODUCT_ID,
    results.PRODUCT_NAME,
    results.CURRENCY,
    a.CURRENCY;

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
    key max(institute.PARENT_ID) as PARENT_ID:Integer
} group by results.COUNTRY_CODE,
           results.TENDER_ID,
           results.OFFER_ID,
           results.TENDER_NAME,
            results.INSTITUTE_ID,
            results.INSTITUTE_NAME,
            results.OFFER_DATE,
            results.BRAND_ID,
            results.BRAND_NAME,
            results.PRODUCT_ID,
            results.PRODUCT_NAME,
            results.UNIT_PRICE,
            results.PACK_PRICE,
            results.UNIT_NET_PRICE,
            results.PACK_NET_PRICE,
            results.COGS,
            results.BUDGET_RATE,
            results.CURRENCY,
            results.QUANTITY,
            results.FOC_DESCRIPTION,
            results.UOM,
            results.OUTCOME;

entity ResultsWithNegotiation as select OfferID, ProductCode from TransactionalData.PT_TMTRRES where Active = 1 and Outcome = 'FOC negotiation';
entity ResultsWithAppealInProgress as select TenderID, OfferID, ProductCode from TransactionalData.PT_TMTRRES where Active = 1 and Outcome = 'Appeal in Progress';

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
                    when exists (select * from ResultsWithNegotiation where OfferID = offer.OfferID) then 'In FOC Negotiation'
                    when exists (select * from ResultsWithAppealInProgress where OfferID = offer.OfferID) then 'Appeal in Progress'
                    else offer.OfferStatusTable.STATUS 
            end
        else offer.OfferStatusTable.STATUS 
    end as STATUS:String(255)
}where offer.OfferStatusTable.Active = 1
group by offer.OfferID, offer.WholesaleOffer, offer.OfferStatusTable.STATUS; //group by missing?

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
and (offer.Product.ActiveProduct = 1)
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
    key tender.Offer.Product.SKU.Product.HLEVEL4_CODE as BRANDID,
    key tender.Offer.OfferID as OFFERID
}
where tender.Active = 1
and tender.Offer.Active = 1
and tender.Offer.Product.Active = 1;

//EHQUT-189207-Creation Date instead of BidDueDate on main page
//EHQUT-197392-MEA - additional edit access to Tender Results and Delivery Tracking tabs
//EFRCL-283873- Italy replace Publication date with Termination date
entity TenderOfferMaster as select from TransactionalData.PT_TMTEND as tender{
    tender.CountryCode as COUNTRY,
    key tender.TenderID as TENDER_ID,
    tender.Classification as CLASSIFICATION,
    tender.TenderName as TENDER_NAME,
    tender.Institute.InstituteName as INSTITUTE,
    tender.Brands as BRAND,
    tender.Offer.Product.SKU.Product.HLEVEL4_CODE as BRANDID,
    tender.Offer.Division as DIVISION,
    key ifnull(tender.Offer.OfferID, '') as OFFER_ID:String(30),
    tender.Offer.OfferValue.VALUE as VALUE:Double,
    tender.Offer.Currency as CURRENCY,
    ifnull(tender.Offer.OfferStatus.STATUS, 'Offer Created') as STATUS:String(255),
    tender.PublicationDate as PUBLICATION_DATE,
    tender.TerminationDate as TERMINATION_DATE,
    tender.SubmittedOn as CREATION_DATE, 
    tender.Offer.InternalBidDueDate as INTERNAL_BID_DUE_DATE,
    case when tender.Offer.RevisedOfferNo = 0 and tender.Offer.ContinuationOfferNo = 0 then tender.BidDueDate else tender.Offer.NewOfferDueDate end as CLOSING_DATE:Date,
    ifnull(tender.Offer.ActiveOffer, 1) as ACTIVE_OFFER:Integer,
    ifnull(tender.Offer.PfiNumber.PFINo, '') as PFI_NO:String(255),
    ifnull(tender.Origin.CODE, 'NA') as ORIGIN_CODE:String(10),
    tender.Offer.InternalBidDueDate as OFFER_DATE,
    tender.Offer.Distributor.DistributorName as DISTRIBUTOR,
    tender.Offer.OfferValue.SUBMISSION_DATE as SUBMISSION_DATE,
    tender.CountrySpecificInformation.TenderReference as TENDER_REFERENCE,
    tender.ExternalID as EXTERNAL_ID,
    tender.SAPID as SAP_ID,
    tender.User.UserName
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
//EITOG-215125-MEA - budgeted profitability for 2023 to be maintained at the product pack level
entity OfferProductConsolidation as select from OfferProductPlus as offerProduct
left outer join MasterDataViews.DirectBrand as directBrand
    on offerProduct.INSTITUTE_ID = directBrand.INSTITUTE_ID
    and offerProduct.HLEVEL4_CODE = directBrand.BRAND_ID
    and offerProduct.DISTRIBUTOR_ID = directBrand.DISTRIBUTOR_ID
    and offerProduct.CountryCode = directBrand.COUNTRY_CODE     
left outer join MasterDataViews.DistributorBrand as distributorBrand
    on offerProduct.HLEVEL4_CODE = distributorBrand.BRAND_ID
    and offerProduct.DISTRIBUTOR_ID = distributorBrand.DISTRIBUTOR_ID
left outer join MasterDataLatestValues.VWBUDGETEDPROFITABILITY as profitability
    on offerProduct.HLEVEL4_CODE = profitability.HLEVEL4_CODE 
    and offerProduct.CountryCode = profitability.COUNTRYCODE
    and offerProduct.ProductCode =profitability.PRODUCTPACKID
left outer join MasterDataLatestValues.VW_MASTER_APPROVED_PRICE as approved 
    on offerProduct.ProductCode = approved.PRODUCT_ID
    and offerProduct.CountryCode = approved.COUNTRY_CODE
    and offerProduct.CURRENCY = approved.CURRENCY
left outer join CountryMinPrice as minPrice
    on offerProduct.ProductCode = minPrice.PRODUCT_ID
    and offerProduct.CountryCode = minPrice.COUNTRY_CODE
    and offerProduct.CURRENCY = minPrice.CURRENCY
left outer join AccountMinPrice as accountPrice
    on offerProduct.ProductCode = accountPrice.PRODUCT_ID
    and offerProduct.CountryCode = accountPrice.COUNTRY_CODE
    and offerProduct.INSTITUTE_ID = accountPrice.INSTITUTE_ID
    and offerProduct.CURRENCY = accountPrice.CURRENCY
left outer join MasterDataViews.MostRecentSkuCodeForProductPack as sku 
    on offerProduct.ProductCode = sku.ProductPackID 
    and offerProduct.CountryCode = sku.CountryCode
left outer join TransactionalData.ProductPricing as productPricing
    on offerProduct.OfferID = productPricing.OfferID
    and offerProduct.ProductCode = productPricing.ProductCode
    and offerProduct.CountryCode = productPricing.CountryCode
{
    offerProduct.TenderID as TENDERID,
    offerProduct.ProductCode,
    key offerProduct.OfferID as OFFERID,
    key offerProduct.SKU.PRODUCTPACKID as PRODUCTID,
    offerProduct.OfferType as OfferType,
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
    offerProduct.SKU.MoleculeName as MOLECULE_NAME,
    offerProduct.SKU.ProductFullDescription as PRODUCT_FULL_DESCRIPTION,
	offerProduct.SKUCountry.VTATax as VAT,
    ifnull(offerProduct.SKUCountry.COMMENT, '') as PRODUCT_COMMENT:String(500),

    /* Start of missing SKU & SKUCountry fields*/
    offerProduct.SKU.ACTIVERECORD as ACTIVERECORD,
    offerProduct.SKU.HLEVEL6_CODE as HLEVEL6_CODE,
    offerProduct.SKU.PCIName as PCI_NAME,
    offerProduct.SKU.ACTIVE_SUBSTANCE as ACTIVE_SUBSTANCE,
    offerProduct.SKU.ProductType as PRODUCT_TYPE,

    offerProduct.SKUCountry.COUNTRYPRODUCTPACKID as COUNTRYPRODUCTPACKID,
    offerProduct.SKUCountry.ACTIVERECORD as SKUCOUNTRY_ACTIVERECORD,
    offerProduct.SKUCountry.Presentation_2 as PRESENTATION_2,
    offerProduct.SKUCountry.GOV_CODE as GOV_CODE,
    offerProduct.SKUCountry.CODE1 as CODE1,
    offerProduct.SKUCountry.CODE2 as CODE2,
    offerProduct.SKUCountry.CODE3 as CODE3,
    /* End of missing SKU & SKUCountry fields*/

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
    offerProduct.Price.BusinessCasePrice as BUSINESS_CASE_PRICE,
    offerProduct.Price.Discount as DISCOUNT,
    offerProduct.Price.AdditionalDiscount as ADDITIONAL_DISCOUNT,
    offerProduct.Price.StandardDiscount as STANDARD_DISCOUNT,
    offerProduct.Price.FOCStep  as FOC_STEP,
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
    offerProduct.SKUCountry.QTY_THRESHOLD * (case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end) as QTY_THRESHOLD:Double,
    productPricing.Warranty as Warranty,
    productPricing.AgreementDuration as AgreementDuration,
    productPricing.MonthlyRent as MonthlyRent,
    productPricing.MonthsPerInvoice as MonthsPerInvoice,
    productPricing.ContractStartDate as ContractStartDate, 
    productPricing.ValueOfDevices as ValueOfDevices,
    productPricing.StatusOfDevice as StatusOfDevice,
    productPricing.MinContractual as MinContractual,
    productPricing.MinAnnPurch as MinAnnPurch,
    offerProduct.SKU.ProductClass as ProductClass,
    offerProduct.SKU.ProductDescription as ProductDescription,
}where offerProduct.Active = 1 and offerProduct.Offer.Active = 1 and offerProduct.Offer.Tender.Active = 1 and offerProduct.ActiveProduct = 1;

entity OfferSignatory1 as select from TransactionalData.PT_TMOFRS as offer
inner join ApprovalRequests as approvalRequest
    on  approvalRequest.TenderID = offer.TenderID
	and approvalRequest.OfferId = offer.OfferID
	and approvalRequest.CountryCode = offer.CountryCode
    and approvalRequest.ApprovalStatus <> 'Cancelling'
    and approvalRequest.ApprovalStatus <> 'Rejected'
inner join MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory
    on offer.SellingCompany = signatory.LEGAL_ENTITY_CODE
    and offer.CountryCode = signatory.COUNTRY_CODE
    and signatory.SIGNATORY = 1
    and (signatory.DIVISION = offer.Division or signatory.DIVISION = 'Both')
    and approvalRequest.ApproverName = signatory.NAME
left outer join TransactionalData.PT_TMQUTO as quotation
    on offer.OfferID = quotation.OfferID
    and quotation.AS1 = signatory.AUTHORIZED_SIGNATORY
{
    offer.OfferID,
    ifnull(quotation.AS1, signatory.AUTHORIZED_SIGNATORY) as AUTHORIZED_SIGNATORY:String,
    ifnull(quotation.Signatory1.NAME, signatory.NAME) as NAME:String,
    ifnull(quotation.Signatory1.TITLE, signatory.TITLE) as TITLE:String
};

entity OfferSignatory2 as select from TransactionalData.PT_TMOFRS as offer
inner join ApprovalRequests as approvalRequest
    on  approvalRequest.TenderID = offer.TenderID
	and approvalRequest.OfferId = offer.OfferID
	and approvalRequest.CountryCode = offer.CountryCode
    and approvalRequest.ApprovalStatus <> 'Cancelling'
    and approvalRequest.ApprovalStatus <> 'Rejected'
inner join MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory
    on offer.SellingCompany = signatory.LEGAL_ENTITY_CODE
    and offer.CountryCode = signatory.COUNTRY_CODE
    and signatory.SIGNATORY = 2
    and (signatory.DIVISION = offer.Division or signatory.DIVISION = 'Both')
    and approvalRequest.ApproverName = signatory.NAME
left outer join TransactionalData.PT_TMQUTO as quotation
    on offer.OfferID = quotation.OfferID
    and quotation.AS2 = signatory.AUTHORIZED_SIGNATORY
{
    offer.OfferID,
    ifnull(quotation.AS2, signatory.AUTHORIZED_SIGNATORY) as AUTHORIZED_SIGNATORY:String,
    ifnull(quotation.Signatory2.NAME, signatory.NAME) as NAME:String,
    ifnull(quotation.Signatory2.TITLE, signatory.TITLE) as TITLE:String
};

//EHQUT-RITM12706398-OfferValidity for SEWA
entity OfferConsolidation as select from TransactionalData.PT_TMOFRS as offer
left outer join MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory1Default
    on offer.SellingCompany = signatory1Default.LEGAL_ENTITY_CODE
    and offer.CountryCode = signatory1Default.COUNTRY_CODE
    and signatory1Default.SORTER = 1
left outer join MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory2Default
    on offer.SellingCompany = signatory2Default.LEGAL_ENTITY_CODE
    and offer.CountryCode = signatory2Default.COUNTRY_CODE
    and signatory2Default.SORTER = 2
left outer join OfferSignatory1 as signatory1
    on offer.OfferID = signatory1.OfferID
left outer join OfferSignatory2 as signatory2
    on offer.OfferID = signatory2.OfferID
left outer join AdminData.NextDateSettings as date_settings
    on MONTH(CURRENT_DATE) = date_settings.CurrentMonth
left outer join TransactionalDataViews.ApprovalRequests as approvalRequests
    on offer.OfferID = approvalRequests.OfferId
{	
	'PT_TMTNOFST(TENDERID=''' || offer.TenderID || ''',OFFERID=''' || offer.OfferID || ''',Active=1)' as OFFERSTATUSPATH:String(500),
	offer.TenderID as TENDERID,
    offer.Tender.InstituteID as INSTITUTE_ID,
    offer.Tender.Institute.InstituteType as INSTITUTE_TYPE,
    offer.Tender.Institute.State as INSTITUTE_STATE,
    offer.Tender.Classification as CLASSIFICATION,//Added Classification (db#1)
    offer.Tender.Institute.CustomerID as CUSTOMER_CODE,
    case when offer.Tender.TenderChannel<>'Direct' then 'Distributor' else 'Direct' end as TENDER_CHANNEL:String(500),
	offer.Tender.TenderName as TENDER_REFERENCE:String(500),
	key offer.OfferID as OFFERID,
    offer.Tender.Institute.InstituteName as INSTITUTENAME,
    offer.Tender.Institute.VatCode as VATCODE,
    offer.Tender.Institute.TaxCode as TAXCODE,
    offer.Tender.Institute.Region.Name as REGION_NAME,
    offer.Tender.Institute.Province.Name as PROVINCE_NAME,
    offer.Tender.Institute.CifCode as CIF_CODE,
    offer.Tender.Institute.RegionalHealthSystem as REGIONAL_HEALTH_SYSTEM,
    offer.Tender.Institute.CustomerGroup as CUSTOMER_GROUP,
    offer.OfferStatus.STATUS as STATUS,
    offer.Tender.Country.ApprovalType as APPROVAL_TYPE,
	ifnull(offer.Quotation.OfferDate, CURRENT_DATE) as OFFERDATE,
	 case offer.Tender.Institute.Region.Name
        when 'SEWA' then ADD_DAYS(CURRENT_DATE, 60)
        else ifnull(offer.Quotation.OfferValidity, TO_DATE(TO_NVARCHAR(YEAR(ADD_YEARS(CURRENT_DATE, date_settings.NextYearDelta))) || '-' || TO_NVARCHAR(date_settings.NextMonth) || '-' ||TO_NVARCHAR(date_settings.NextDay)))
    end as OFFERVALIDITY,
	ifnull(offer.Quotation.EffectiveDate, ADD_DAYS(CURRENT_DATE,1)) as EffectiveDate,
	ifnull(offer.Quotation.ExpiryDate, ADD_DAYS(ADD_YEARS(CURRENT_DATE, 1), 1)) as ExpiryDate,
	offer.CountryCode as COUNTRYCODE,
	offer.SellingCompanyDetails.LegalEntityName as SELLINGCOMPANY,
    offer.SellingCompanyDetails.BankDetails as SELLINGCOMPANYBANK,
    ifnull(ifnull(offer.Quotation.AS1, signatory1.AUTHORIZED_SIGNATORY), signatory1Default.AUTHORIZED_SIGNATORY) as SELLING_COMPANY_AS1:String(500),
	ifnull(ifnull(offer.Quotation.AS2, signatory2.AUTHORIZED_SIGNATORY), signatory2Default.AUTHORIZED_SIGNATORY) as SELLING_COMPANY_AS2:String(500),

    ifnull(ifnull(offer.Quotation.Signatory1.NAME, signatory1.NAME), signatory1Default.NAME) as SELLING_COMPANY_AS1_NAMEI:String(500),
	ifnull(ifnull(offer.Quotation.Signatory2.NAME, signatory2.NAME), signatory2Default.NAME) as SELLING_COMPANY_AS2_NAMEI:String(500),

    ifnull(ifnull(offer.Quotation.Signatory1.TITLE, signatory1.TITLE), signatory1Default.TITLE) as SELLING_COMPANY_AS1_TITLEI:String(500),
	ifnull(ifnull(offer.Quotation.Signatory2.TITLE, signatory2.TITLE), signatory2Default.TITLE) as SELLING_COMPANY_AS2_TITLEI:String(500),



    //ifnull(signatory1.NAME, signatory1Default.NAME) as SELLING_COMPANY_AS1_NAMEI:String(500),
    //ifnull(signatory1.TITLE, signatory1Default.TITLE) as SELLING_COMPANY_AS1_TITLEI:String(500),
    //ifnull(signatory2.NAME, signatory2Default.NAME) as SELLING_COMPANY_AS2_NAMEI:String(500),
    //ifnull(signatory2.TITLE, signatory2Default.TITLE) as SELLING_COMPANY_AS2_TITLEI:String(500),
    case 
        when signatory1.AUTHORIZED_SIGNATORY is null then false
        when signatory1.AUTHORIZED_SIGNATORY = ifnull(ifnull(offer.Quotation.AS1, signatory1.AUTHORIZED_SIGNATORY), signatory1Default.AUTHORIZED_SIGNATORY) then true
        else false
    end as E_SIGNATURE1:Boolean,
    case 
        when signatory2.AUTHORIZED_SIGNATORY is null then false 
        when signatory2.AUTHORIZED_SIGNATORY = ifnull(ifnull(offer.Quotation.AS2, signatory2.AUTHORIZED_SIGNATORY), signatory2Default.AUTHORIZED_SIGNATORY) then true
        else false
    end as E_SIGNATURE2:Boolean,
	offer.Currency as CURRENCY,
    min(offer.Product.Price.BudgetRate) as BUDGET_RATE,
    min(offer.Product.Price.SpotRate) as SPOT_RATE,
    //EITOG-SCTASK0100482/REQ11565210-Increase the size of Letterhead
    ifnull(offer.SellingCompanyDetails.Letterhead, '') as LETTERHEAD:String(700),
     //EITOG-SCTASK0100482/REQ11565210-Increase the size of Letterhead
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
    case offer.Tender.TenderChannel
        when 'Direct' then '' // TODO: check this with Jonathan -> what field to use in case of Direct tender
        else offer.Distributor.CONTACT_EMAIL
    end as DISTRIBUTOREMAIL:String(500),
	ifnull(offer.Quotation.Comment, '') as CUSTOM_REMARKS:String(500),
    offer.FOCType as FOC_TYPE,
    ifnull(offer.Country.COMMENT, '') as COUNTRY_COMMENT,
    offer.Tender.PublicationDate as PUBLICATION_DATE,
    offer.Tender.BidDueDate as BID_DUE_DATE,
    offer.Quotation.SubmittedBy as TENDER_SUBMITTED_BY
}where offer.Active = 1 and offer.Tender.Active = 1
 group by offer.TenderID,
          offer.OfferID,
          offer.Tender.TenderChannel,
          offer.Tender.InstituteID,
          offer.Tender.Institute.InstituteType,
          offer.Tender.Institute.State,
          offer.Tender.Classification,
          offer.Tender.TenderChannel,
          offer.Tender.Institute.InstituteName,
          offer.Tender.Institute.VatCode,
          offer.Tender.Institute.TaxCode,
          offer.Tender.Institute.Region.Name,
          offer.Tender.Institute.Province.Name,
          offer.Tender.Institute.CifCode,
          offer.Tender.Institute.RegionalHealthSystem,
          offer.Tender.Institute.CustomerGroup,
          offer.Tender.Institute.CustomerID,
          offer.Tender.TenderName,
          offer.OfferStatus.STATUS,
          offer.Tender.Country.ApprovalType,
          offer.Quotation.OfferDate,
          offer.Quotation.OfferValidity,
          offer.Quotation.EffectiveDate,
          offer.Quotation.ExpiryDate,
          offer.Quotation.Signatory1.NAME,
          offer.Quotation.Signatory2.NAME,
          offer.Quotation.Signatory1.TITLE,
          offer.Quotation.Signatory2.TITLE,
          offer.CountryCode,
          offer.SellingCompanyDetails.LegalEntityName,
          offer.SellingCompanyDetails.BankDetails,
          offer.Quotation.AS1,
          signatory1.AUTHORIZED_SIGNATORY,
          signatory1.NAME,
          signatory1.TITLE,
          signatory1Default.AUTHORIZED_SIGNATORY,
          signatory1Default.NAME,
          signatory1Default.TITLE,
          offer.Quotation.AS2,
          signatory2.AUTHORIZED_SIGNATORY,
          signatory2.NAME,
          signatory2.TITLE,
          signatory2Default.AUTHORIZED_SIGNATORY,
          signatory2Default.NAME,
          signatory2Default.TITLE,
          offer.Currency,
          offer.SellingCompanyDetails.Letterhead,
          offer.SellingCompanyDetails.Remarks,
          offer.SellingCompanyDetails.FooterComment,
          offer.Distributor.DistributorName,
          offer.Tender.Institute.Address,
          offer.Distributor.Address,
          offer.Tender.Institute.ContactNo,
          offer.Distributor.ContactNo,
          offer.Tender.Institute.Fax,
          offer.Distributor.Fax,
          offer.Tender.Institute.ContactPerson,
          offer.Distributor.ContactPerson,
          offer.Distributor.CONTACT_EMAIL,
          offer.Quotation.Comment,
          offer.FOCType,
          offer.Country.COMMENT,
          offer.Tender.PublicationDate,
          offer.Tender.BidDueDate,
          offer.Quotation.SubmittedBy,
          date_settings.NextYearDelta,
          date_settings.NextDay,
          date_settings.NextMonth;

entity QuotationUpdates as select from TransactionalData.PT_TMQUTO as quotation
inner join TransactionalDataViews.OfferStatus as status on quotation.OfferID = status.OFFER_ID{
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

entity ProductPricingView as select from TransactionalData.PT_TMOFRS as offer 
inner join TransactionalData.PT_TMOFPR as product on product.OfferID = offer.OfferID
left outer join TransactionalData.ProductPricing as productPricing 
    on product.CountryCode = productPricing.CountryCode
    and product.ProductCode = productPricing.ProductCode
    and product.OfferID = productPricing.OfferID
    and product.Active = 1
left outer join MasterDataViews.MostRecentConsumerPricesView as consumerPrices 
    on product.ProductCode = consumerPrices.ProductPackId
    and product.CountryCode = consumerPrices.CountryCode
left outer join  TransactionalData.PT_TMBDPR as PT_TMBDPR 
    on product.CountryCode = PT_TMBDPR.CountryCode
    and product.ProductCode = PT_TMBDPR.ProductCode
    and product.OfferID = PT_TMBDPR.OfferID {
    key offer.OfferID,
    key product.ProductCode,
    key product.CountryCode,
    product.SKU.PRODUCTPACKNAME as ProductPackName,
    product.SKU.PACKFACTOR,
    product.RequestedVolume,
    product.UnitPerPack as UOM,
    product.SORTER,
    product.Cogs.COGS,
    productPricing.ID,
    productPricing.Warranty,
    productPricing.AgreementDuration,
    productPricing.MonthlyRent,
    productPricing.MonthsPerInvoice,
    productPricing.ContractStartDate,
    productPricing.ValueOfDevices,
    productPricing.StatusOfDevice,
    ifnull(PT_TMBDPR.FOC, 0) as FOC:Double,
    productPricing.FreeGoodsOther,
    productPricing.MinContractual,
    productPricing.MinAnnPurch,
    PT_TMBDPR.AdditionalDiscount,
    PT_TMBDPR.NetofferPrice,
    ifnull(PT_TMBDPR.FOC_ABS_PCT, 'ABS') as FOC_ABS_PCT:String(4),
    PT_TMBDPR.FOCStep,
    offer.FOCType,
    offer.Currency,
    product.OfferType,
    consumerPrices.ProductPackId,
    consumerPrices.ValidFrom,
	consumerPrices.ValidTo,
	consumerPrices.ConsumerPriceExclPP,
	consumerPrices.ConsumerPriceInclPP,
	consumerPrices.ConsumerPriceExclPU,
	consumerPrices.ConsumerPriceInclPU,
	consumerPrices.VatPerPack,
	consumerPrices.MandatoryDiscount,
    consumerPrices.ExfPriceExclPP,
	consumerPrices.ConfidentialDiscount1,
	consumerPrices.ConfidentialDiscount2,
	consumerPrices.TotalDiscount,
	consumerPrices.MaxPriceNhsPP,
	consumerPrices.MaxPriceNhsPU,
    case 
        when consumerPrices.ConsumerPriceExclPP is not null
            then
                (consumerPrices.ConsumerPriceExclPP - consumerPrices.MaxPriceNhsPP * (1 - (PT_TMBDPR.AdditionalDiscount/100))) / consumerPrices.ConsumerPriceExclPP
        else null
    end as FinalDiscount: Double,
    case
        when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
            then PT_TMBDPR.FOC
        else PT_TMBDPR.FOC * product.RequestedVolume
    end as focAbsolute:Double,
    case 
        when offer.FOCType = 'FOC 1'
            then product.RequestedVolume - (
                case
                    when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                        then PT_TMBDPR.FOC
                    else PT_TMBDPR.FOC * product.RequestedVolume
                end
            ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
        else product.RequestedVolume 
    end as paidVolume:Double,
    case 
        when offer.FOCType = 'FOC 2'
            then product.RequestedVolume + (
                case
                    when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                        then PT_TMBDPR.FOC
                    else PT_TMBDPR.FOC * product.RequestedVolume
                end
            ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
        else product.RequestedVolume 
    end as totalVolume:Double,
    case   
        when PT_TMBDPR.NetofferPrice is not null
            then 
                round(PT_TMBDPR.NetofferPrice * ( 
                    (
                        case 
                            when offer.FOCType = 'FOC 1'
                                then product.RequestedVolume - (
                                    case
                                        when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                                            then PT_TMBDPR.FOC
                                        else PT_TMBDPR.FOC * product.RequestedVolume
                                    end
                                ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                            else product.RequestedVolume 
                        end
                    ) //=$self.paidVolume but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                    
                / 
                
                (
                    case 
                        when offer.FOCType = 'FOC 2'
                            then product.RequestedVolume + (
                                case
                                    when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                                        then PT_TMBDPR.FOC
                                    else PT_TMBDPR.FOC * product.RequestedVolume
                                end
                            ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                        else product.RequestedVolume 
                    end
                ) //=$self.totalVolume but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                
                ),2)
        else null
    end as NetPriceFOC:Double,

    case   
        when PT_TMBDPR.NetofferPrice is not null
            then 
                PT_TMBDPR.NetofferPrice * (
                    case 
                        when offer.FOCType = 'FOC 1'
                            then product.RequestedVolume - (
                                case
                                    when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                                        then PT_TMBDPR.FOC
                                    else PT_TMBDPR.FOC * product.RequestedVolume
                                end
                            ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                        else product.RequestedVolume 
                    end
                ) //=$self.paidVolume but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
        else null
    end as GrossSales:Double,
    case   
        when product.UnitPerPack = 'Pack'
            then product.Cogs.COGS
        else round(product.Cogs.COGS / product.SKU.PACKFACTOR,2)
    end as cogsUoM :Double,
    case   
        when PT_TMBDPR.NetofferPrice is not null
            then 
                (PT_TMBDPR.NetofferPrice * 
                    (
                        case 
                            when offer.FOCType = 'FOC 1'
                                then product.RequestedVolume - (
                                    case
                                        when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                                            then PT_TMBDPR.FOC
                                        else PT_TMBDPR.FOC * product.RequestedVolume
                                    end
                                ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                            else product.RequestedVolume 
                        end
                    ) //=$self.paidVolume but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                ) - (
                    (
                        case   
                            when product.UnitPerPack = 'Pack'
                                then product.Cogs.COGS
                            else round(product.Cogs.COGS / product.SKU.PACKFACTOR,2)
                        end
                    ) //=$self.cogsUoM but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future) 
                * 
                    (
                        case 
                            when offer.FOCType = 'FOC 2'
                                then product.RequestedVolume + (
                                    case
                                        when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                                            then PT_TMBDPR.FOC
                                        else PT_TMBDPR.FOC * product.RequestedVolume
                                    end
                                ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                            else product.RequestedVolume 
                        end
                    ) //=$self.totalVolume but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                )
        else null
    end as GrossProfit:Double,
    case   
        when PT_TMBDPR.NetofferPrice is not null
            then 
                round(1 - ((
                    (
                        case   
                            when product.UnitPerPack = 'Pack'
                                then product.Cogs.COGS
                            else round(product.Cogs.COGS / product.SKU.PACKFACTOR,2)
                        end
                    ) //=$self.cogsUoM but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                * 
                    (
                        case 
                            when offer.FOCType = 'FOC 2'
                                then product.RequestedVolume + (
                                    case
                                        when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                                            then PT_TMBDPR.FOC
                                        else PT_TMBDPR.FOC * product.RequestedVolume
                                    end
                                ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                            else product.RequestedVolume 
                        end
                    ) //=$self.totalVolume but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                ) / (PT_TMBDPR.NetofferPrice * 
                    (
                        case 
                            when offer.FOCType = 'FOC 1'
                                then product.RequestedVolume - (
                                    case
                                        when PT_TMBDPR.FOC_ABS_PCT = 'ABS'
                                            then PT_TMBDPR.FOC
                                        else PT_TMBDPR.FOC * product.RequestedVolume
                                    end
                                ) //=$self.focAbsolute but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                            else product.RequestedVolume 
                        end
                    ) //=$self.paidVolume but this syntax gave problems during deploy thats why we copy it (maybe solve it in node.js in future)
                ) ),2) 
        else null
    end as GrossMargin:Double,
    product.ActiveProduct
    

        


}where offer.Active = 1;

/**
 * This view contains calculated fields used on the Spain financial offers page
 */
entity PriceConditionView as select from TransactionalData.PT_TMTEND as tender 
inner join TransactionalData.PT_TMOFRS as offer 
    on offer.TenderID = tender.TenderID
    and offer.Active = 1
inner join TransactionalData.PT_TMOFPR as product 
    on product.OfferID = offer.OfferID
    and product.Active = 1 
inner join MasterData.PT_TMPRDPCK as productPacks
    on productPacks.PRODUCTPACKID = product.ProductCode
    and productPacks.ACTIVERECORD = 'Yes' 
inner join TransactionalData.PriceConditionClassification as priceConditionClassification  
    on priceConditionClassification.CountryCode = product.CountryCode
    and priceConditionClassification.Classification = tender.Classification
    and priceConditionClassification.Division = offer.Division 
    and (priceConditionClassification.ProductType = 'All' or priceConditionClassification.ProductType = productPacks.ProductType)
inner join MasterData.PT_TMINST as institute 
    on tender.InstituteID = institute.InstituteID 
left outer join TransactionalData.PriceCondition as priceCondition 
    on priceConditionClassification.ID = priceCondition.PriceConditionClassification.ID
    and product.OfferID = priceCondition.OfferID
    and product.ProductCode = priceCondition.ProductCode
left outer join MasterData.RoyalDecree as royalDecree
    on product.ProductCode = royalDecree.ProductPackID 
    and royalDecree.ValidTo > CURRENT_DATE 
left outer join MasterDataViews.MostRecentMasterPricesView as masterPrices 
    on product.ProductCode = masterPrices.ProductPackId
    and product.CountryCode = masterPrices.CountryCode
left outer join MasterDataLatestValues.ActiveChannelProductPolicies as channelproductpolicies 
    on product.ProductCode = channelproductpolicies.ProductPackID
    and product.CountryCode = channelproductpolicies.CountryCode
    and institute.InstituteType = channelproductpolicies.ChannelName
    {
    key product.TenderID,
    key offer.OfferID,
    key product.ProductCode,
    priceCondition.ID as ExistingPriceConditionID: UUID,
    priceCondition.PriceConditionClassification.ID as PriceConditionClassificationID:UUID,
    tender.CountryCode,
    key priceConditionClassification.ConditionType,
    priceConditionClassification.Classification,
    priceConditionClassification.Division,
    priceConditionClassification.isMain,
    //product.RegisteredPrice.REGISTERED_PRICE as PVL,
    product.RegisteredPrice.CURRENCY as Currency,
    priceCondition.Discount,
    priceCondition.RoyalDecree,
    royalDecree.Percentage as RoyalDecreePercentage,
    ifnull(channelproductpolicies.StandardDiscount,0) as StandardDiscount:Double ,
    case   
        when product.RegisteredPrice.REGISTERED_PRICE is not null
            then  
                product.RegisteredPrice.REGISTERED_PRICE * (1 - channelproductpolicies.StandardDiscount)
        else null
    end as StandardPrice:Double,
    priceCondition.AdditionalDiscount, // calculated in the UI based on User Input
    priceCondition.NetPriceWithoutTaxBeforeDeductionRD,
    priceCondition.NetPriceWithoutTaxAfterDeductionRD, // calculated in the UI based on User Input
    priceCondition.NetPriceWithTaxAfterDeductionRD, // calculated in the UI based on User Input
    priceCondition.NetPriceWithoutTax,
    priceCondition.NetPriceWithTax,
    priceCondition.MaximumPrice,
    case
        when priceCondition.ConfidentialPrice is null
            then masterPrices.YLAP
        else priceCondition.ConfidentialPrice
    end as ConfidentialPrice:Decimal,
    priceCondition.Liquidation,
    priceCondition.RefundDate,
    priceCondition.RoyalDecreeValue, //calculated in UI based on User Input
    priceCondition.RoyalDecreeIncl,
    case 
        when priceCondition.PVL is null
            then masterPrices.YLLP
        else 
            priceCondition.PVL        
    end as PriceConditionPVL:Decimal,
    masterPrices.YLLP as PVL,
    masterPrices.YLAP,
    masterPrices.PRAF_Private,
    masterPrices.PRAF_Public,
    masterPrices.RentalPrice,
    masterPrices.UoM,
    masterPrices.Currency as masterPriceCurrency,
    case
        when tender.CountryCode = 'ES'
            then
                case
                    when institute.ApplicableTaxRate = 'E1'
                        then masterPrices.TaxE1
                    else 
                        masterPrices.TaxES
                end
        else
            product.SKUCountry.VTATax
    end as Tax:hana.REAL,
    priceCondition.MonthlyRentPerUnit,
    priceCondition.AnnualValue,
    priceCondition.ReferencePriceAgreement,
    priceCondition.Settlement.ID as Settlement_ID,
    priceCondition.IsPricingUnlocked
}where tender.Active = 1;

entity TenderRappelView as select from TransactionalData.PT_TMTEND as tender 
inner join TransactionalData.PT_TMOFRS as offer 
    on offer.TenderID = tender.TenderID
    and offer.Active = 1
inner join TransactionalData.PT_TMOFPR as product 
    on product.OfferID = offer.OfferID
    and product.Active = 1
    and product.ActiveProduct = 1 
inner join MasterData.PT_TMPRDPCK as productPacks
    on productPacks.PRODUCTPACKID = product.ProductCode
    and productPacks.ACTIVERECORD = 'Yes' 
left outer join TransactionalData.PriceConditionClassification as priceConditionClassification  
    on priceConditionClassification.CountryCode = product.CountryCode
    and priceConditionClassification.Classification = tender.Classification
    and priceConditionClassification.Division = offer.Division 
    and (priceConditionClassification.ProductType = 'All' or priceConditionClassification.ProductType = productPacks.ProductType)    
inner join MasterData.PT_TMINST as institute 
    on tender.InstituteID = institute.InstituteID 
left outer join TransactionalData.PriceCondition as priceCondition 
    on priceConditionClassification.ID = priceCondition.PriceConditionClassification.ID
    and product.OfferID = priceCondition.OfferID
    and product.ProductCode = priceCondition.ProductCode
{
key tender.TenderID,
key offer.OfferID,
key product.ProductCode,
key institute.InstituteID as INSTITUTE_ID,
case 
    when priceCondition.PriceConditionCode = 'YAW1'
        then 'Yes'
        else 'No'        
end as RAPPEL:String(10)
} where priceConditionClassification.ConditionType = 'Rappel' and (offer.OfferStatusTable.STATUS = 'Quotation Submitted' or offer.OfferStatusTable.STATUS = 'Results Recorded' or offer.OfferStatusTable.STATUS = 'Delivery Ongoing')
group by tender.TenderID, 
        offer.OfferID, 
        product.ProductCode, 
        institute.InstituteID, 
        priceCondition.PriceConditionCode; 

entity TenderFOCView as select from TransactionalData.PT_TMTEND as tender 
inner join TransactionalData.PT_TMOFRS as offer 
    on offer.TenderID = tender.TenderID
    and offer.Active = 1
inner join TransactionalData.PT_TMOFPR as product 
    on product.OfferID = offer.OfferID
    and product.Active = 1
    and product.ActiveProduct = 1 
inner join MasterData.PT_TMPRDPCK as productPacks
    on productPacks.PRODUCTPACKID = product.ProductCode
    and productPacks.ACTIVERECORD = 'Yes' 
left outer join TransactionalData.PriceConditionClassification as priceConditionClassification  
    on priceConditionClassification.CountryCode = product.CountryCode
    and priceConditionClassification.Classification = tender.Classification
    and priceConditionClassification.Division = offer.Division 
    and (priceConditionClassification.ProductType = 'All' or priceConditionClassification.ProductType = productPacks.ProductType)
inner join MasterData.PT_TMINST as institute 
    on tender.InstituteID = institute.InstituteID 
left outer join TransactionalData.PriceCondition as priceCondition 
    on priceConditionClassification.ID = priceCondition.PriceConditionClassification.ID
    and product.OfferID = priceCondition.OfferID
    and product.ProductCode = priceCondition.ProductCode
{
key tender.TenderID,
key offer.OfferID,
key product.ProductCode,
key institute.InstituteID as INSTITUTE_ID,
case  
    when priceCondition.PriceConditionCode = 'YA01'
            then 'Yes'
            else 'No'
end as FOC:String(10)
} where priceConditionClassification.ConditionType = 'FOC' and (offer.OfferStatusTable.STATUS = 'Quotation Submitted' or offer.OfferStatusTable.STATUS = 'Results Recorded' or offer.OfferStatusTable.STATUS = 'Delivery Ongoing')
group by tender.TenderID, offer.OfferID, product.ProductCode,institute.InstituteID, priceCondition.PriceConditionCode; 

/**
 * This view contains Tender History fields used on the Spain financial offers page
 */
entity TenderHistorySpain as select from TransactionalData.PT_TMTEND as tender
inner join TransactionalData.PT_TMOFRS as offer 
    on offer.TenderID = tender.TenderID
    and offer.Active = 1
inner join TransactionalData.PT_TMOFPR as product 
    on product.OfferID = offer.OfferID
    and product.Active = 1
    and product.ActiveProduct = 1 
inner join MasterData.PT_TMPRDPCK as productPacks
    on productPacks.PRODUCTPACKID = product.ProductCode
    and productPacks.ACTIVERECORD = 'Yes' 
inner join TransactionalData.PriceConditionClassification as priceConditionClassification  
    on priceConditionClassification.CountryCode = product.CountryCode
    and priceConditionClassification.Classification = tender.Classification
    and priceConditionClassification.Division = offer.Division
    and priceConditionClassification.isMain = 'true' 
    and (priceConditionClassification.ProductType = 'All' or priceConditionClassification.ProductType = productPacks.ProductType)
inner join MasterData.PT_TMINST as institute 
    on tender.InstituteID = institute.InstituteID 
inner join MasterDataViews.MostRecentMasterPricesView as masterPrices 
    on product.ProductCode = masterPrices.ProductPackId
    and product.CountryCode = masterPrices.CountryCode    
inner join TransactionalData.PriceCondition as priceCondition 
    on priceConditionClassification.ID = priceCondition.PriceConditionClassification.ID
    and product.OfferID = priceCondition.OfferID
    and product.ProductCode = priceCondition.ProductCode
left outer join TransactionalDataViews.TenderFOCView as tenderFOC
    on tender.TenderID = tenderFOC.TenderID
    and offer.OfferID = tenderFOC.OfferID
    and product.ProductCode = tenderFOC.ProductCode
    and institute.InstituteID = tenderFOC.INSTITUTE_ID
left outer join TransactionalDataViews.TenderRappelView as tenderRappel
    on tender.TenderID = tenderRappel.TenderID
    and offer.OfferID = tenderRappel.OfferID
    and product.ProductCode = tenderRappel.ProductCode
    and institute.InstituteID = tenderRappel.INSTITUTE_ID
{
key tender.TenderID,
key offer.OfferID,
key product.ProductCode,
tender.TenderName as TENDER_NAME,
offer.SubmittedOn as OFFER_DATE,
key institute.InstituteID as INSTITUTE_ID,
institute.InstituteName as INSTITUTE_NAME,
product.SKU.PRODUCTPACKNAME as PRODUCT_NAME,
product.Price.OfferPrice *
    case when product.UnitPerPack = 'Unit'
        then product.SKU.PACKFACTOR
        else 1
    end as PACK_PRICE:Double,
product.Price.OfferPrice *
    case when product.UnitPerPack = 'Unit'
        then 1
        else 1 / product.SKU.PACKFACTOR
    end as UNIT_PRICE:Double,
masterPrices.YLLP as PVL,
ifnull(tenderFOC.FOC, 'No') as FOC:String(10),
ifnull(tenderRappel.RAPPEL, 'No') as RAPPEL:String(10),
masterPrices.YLAP as CONFIDENTIAL_PRICE,
priceCondition.PriceConditionCode as PriceConditionCode,
priceConditionClassification.ConditionType as PRICE_CONDITION,
priceCondition.RoyalDecree as ROYALDECREE,
priceCondition.Discount as DISCOUNT,
ifnull(product.Results.Outcome, 'NA') as OUTCOME:String(10)
}
where (offer.OfferStatusTable.STATUS = 'Quotation Submitted' or offer.OfferStatusTable.STATUS = 'Results Recorded' or offer.OfferStatusTable.STATUS = 'Delivery Ongoing')
group by tender.TenderID,
    offer.OfferID,
    product.ProductCode,
    tender.TenderName,
    offer.SubmittedOn,
    institute.InstituteID,
    institute.InstituteName,
    product.SKU.PRODUCTPACKNAME,
    product.Price.OfferPrice,
    product.SKU.PACKFACTOR,
    product.UnitPerPack,
    masterPrices.YLLP,
    tenderFOC.FOC,
    tenderRappel.RAPPEL,
    masterPrices.YLAP,
    priceConditionClassification.ConditionType,
    priceCondition.RoyalDecree,
    priceCondition.PriceConditionCode,
    priceCondition.Discount,    
    product.Results.Outcome;