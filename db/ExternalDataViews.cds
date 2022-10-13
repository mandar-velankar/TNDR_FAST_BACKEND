namespace com.bayer.SXTENDER.ExternalDataViews;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.TransactionalData } from './TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataViews } from './TransactionalDataViews';
using { com.bayer.SXTENDER.MasterDataLatestValues } from './MasterDataLatestValues';

entity DeliveryForProduct as select from TransactionalData.PT_TMDLVTR as delivery {
    key delivery.OfferID as OFFERID,
    key delivery.ProductCode as PRODUCTID,
    sum(delivery.RequestedQuantity) as RequestedQuantity:Double,
    sum(delivery.ActualDeliveryQuantity) as ActualDeliveredQuantity:Double,
    sum(
        case when delivery.LocalOrDirectDelivery = 'D'
            then delivery.RequestedQuantity
            else 0
        end
    ) as DirectRequestedQuantity:Double,
    sum(
        case when delivery.LocalOrDirectDelivery = 'L'
            then delivery.RequestedQuantity
            else 0
        end
    ) as LocalRequestedQuantity:Double,
    sum(
        case when delivery.LocalOrDirectDelivery = 'D'
            then delivery.ActualDeliveryQuantity
            else 0
        end
    ) as DirectDeliveredQuantity:Double,
    sum(
        case when delivery.LocalOrDirectDelivery = 'L'
            then delivery.ActualDeliveryQuantity
            else 0
        end
    ) as LocalDeliveredQuantity:Double
}where delivery.Active = 1
group by delivery.OfferID, delivery.ProductCode;

//EHQUT-195987-Adding NetOffer Price to MEA Tender data extract.
entity Dashboard as select from TransactionalDataViews.OfferProductPlus as offerProduct
inner join MasterData.PT_TMTABRMP as ta on offerProduct.HLEVEL4_CODE = ta.HLevel4_Code
inner join MasterData.PT_TMRCM as region on offerProduct.CountryCode = region.CountryCode
left outer join DeliveryForProduct as delivery on offerProduct.OfferID = delivery.OFFERID and offerProduct.ProductCode = delivery.PRODUCTID {
    offerProduct.OfferID || '_' || offerProduct.ProductCode as LineID:String,
    ifnull(
        year(
                case when offerProduct.Offer.SubmissionDate = '' or offerProduct.Offer.SubmissionDate is null
                    then
                         case when offerProduct.Offer.Quotation.SubmittedOn = '' or offerProduct.Offer.Quotation.SubmittedOn is null then offerProduct.Offer.Tender.PublicationDate
                         else offerProduct.Offer.Quotation.SubmittedOn
                         end
                else offerProduct.Offer.SubmissionDate
                end
        ),
        0
    ) as Year:Integer,
    ifnull(ta.TA, '') as TA:String,
    ifnull(offerProduct.SKU.Product.HLEVEL4_NAME, '') as Brand:String,
    ifnull(region.SubRegion, '') as Subregion:String,
    ifnull(offerProduct.Offer.Tender.Country.CountryName, '') as CountryName:String,
    ifnull(offerProduct.Offer.Tender.Institute.InstituteName, '') as InstituteName:String,
    ifnull(offerProduct.Offer.Tender.TenderID, '') as TenderID:String,
    ifnull(offerProduct.Offer.Tender.TenderName, '') as TenderName:String,
    ifnull(offerProduct.Offer.Tender.Classification, '') as Classification:String,
    ifnull(offerProduct.Offer.Tender.TenderChannel, '') as TenderChannel:String, 
    key ifnull(offerProduct.Offer.PfiNumber.PFINo, ifnull(offerProduct.Offer.OfferID, '')) as OfferNumber:String,
    ifnull(offerProduct.Offer.Distributor.DistributorName, '') as DistributorName:String,
    key ifnull(offerProduct.SKU.PRODUCTPACKNAME, '') as ProductPackName:String,
    ifnull(offerProduct.Offer.Currency, '') as Currency:String,
    ifnull(offerProduct.Price.OfferPrice, 0) as OfferPrice:Double,
    ifnull(offerProduct.Price.FOC, 0) as FOC:Double,
    ifnull(offerProduct.Price.FOC_ABS_PCT, '') as FOC_ABS_PCT:String,
    ifnull(offerProduct.Price.FOCType, '') as FOCType:String,
    ifnull(offerProduct.UnitPerPack, '') as UoM:String,
    ifnull(offerProduct.RequestedVolume, 0) as RequestedVolume:Integer,
    case when offerProduct.Price.FOCType = 'FOC 1'
        then offerProduct.RequestedVolume - case when offerProduct.Price.FOC_ABS_PCT = 'PCT' then round(offerProduct.Price.FOC * offerProduct.RequestedVolume) else round(offerProduct.Price.FOC) end
        else offerProduct.RequestedVolume
    end
    *
    offerProduct.Price.OfferPrice as TotalValue_LC:Double,
    case when offerProduct.Price.FOCType = 'FOC 1'
        then offerProduct.RequestedVolume - case when offerProduct.Price.FOC_ABS_PCT = 'PCT' then round(offerProduct.Price.FOC * offerProduct.RequestedVolume) else round(offerProduct.Price.FOC) end
        else offerProduct.RequestedVolume
    end
    *
    offerProduct.Price.OfferPrice / (case when ifnull(offerProduct.Price.BudgetRate, 1)<>0 then ifnull(offerProduct.Price.BudgetRate, 1) else 1 end) as TotalValue_EUR:Double,
    case when offerProduct.Offer.Quotation.OfferDate = '' or offerProduct.Offer.Quotation.OfferDate is null then to_date('1970-01-01') else offerProduct.Offer.Quotation.OfferDate end as OfferDate:DateTime,
    case when offerProduct.Offer.Quotation.OfferValidity = '' or offerProduct.Offer.Quotation.OfferValidity is null then to_date('1970-01-01') else offerProduct.Offer.Quotation.OfferValidity end as OfferValidity:DateTime,
    ifnull(offerProduct.Offer.OfferStatus.STATUS, '') as CurrentStatus:String,
    case when offerProduct.Offer.Tender.PublicationDate = '' or offerProduct.Offer.Tender.PublicationDate is null then to_date('1970-01-01') else offerProduct.Offer.Tender.PublicationDate end as PublicationDate:DateTime,
    case when offerProduct.Offer.OfferStatus.STATUS = 'Quotation Submitted' or offerProduct.Offer.OfferStatus.STATUS = 'Results Recorded' or offerProduct.Offer.OfferStatus.STATUS = 'Delivery Ongoing'
        then
            case
                when offerProduct.Offer.SubmissionDate = '' or offerProduct.Offer.SubmissionDate is null then
                    case when offerProduct.Offer.Quotation.SubmittedOn = '' then to_date('1970-01-01') else offerProduct.Offer.Quotation.SubmittedOn end
                else offerProduct.Offer.SubmissionDate
            end
        else to_date('1970-01-01')
    end as SubmissionDate:DateTime,
    case when offerProduct.Offer.Tender.BidDueDate = '' or offerProduct.Offer.Tender.BidDueDate is null then to_date('1970-01-01') else offerProduct.Offer.Tender.BidDueDate end as BidDueDate:DateTime,
    case when offerProduct.Offer.NewOfferDueDate = '' or offerProduct.Offer.NewOfferDueDate is null then to_date('1970-01-01') else offerProduct.Offer.NewOfferDueDate end as NewOfferDueDate:DateTime,
    case when offerProduct.Results.SubmittedOn = '' or offerProduct.Results.SubmittedOn is null then to_date('1970-01-01') else offerProduct.Results.SubmittedOn end as FeedBackDate:DateTime,
    ifnull(offerProduct.Results.Outcome, '') as Outcome:String,
    ifnull(offerProduct.Results.AwardedQty, 0) as AwardedQty:Integer,
    ifnull(offerProduct.Results.Reason, '') as Reason:String,
    ifnull(delivery.LocalRequestedQuantity, 0) as LocalRequestedQuantity:Integer,
    ifnull(delivery.DirectRequestedQuantity, 0) as DirectRequestedQuantity:Integer,
    ifnull(delivery.LocalDeliveredQuantity, 0) as LocalDeliveredQuantity:Integer,
    ifnull(delivery.DirectDeliveredQuantity, 0) as DirectDeliveredQuantity:Integer,
    case when offerProduct.Results.CompetitorResult.AWARDEDCOMPANY is null
        then ''
        else offerProduct.Results.CompetitorResult.AWARDEDCOMPANY || ' - ' || offerProduct.Results.CompetitorResult.AWARDEDPRODUCT
    end as Participant:String,
    ifnull(offerProduct.Results.CompetitorResult.AWARDEDPRICE, 0) as ParticipantPrice:Double,
    ifnull(offerProduct.Results.CompetitorResult.CURRENCY, '') as ParticipantCurrency:String,
    ifnull(offerProduct.Results.CompetitorResult.UOM, '') as ParticipantUoM:String,
    ifnull(offerProduct.Results.CompetitorResult.OUTCOME, '') as PaticipantOutcome:String,
    case 
        when offerProduct.Offer.ActiveOffer is null then 1
        when offerProduct.Offer.ActiveOffer <> 1 then 2
        else offerProduct.Offer.ActiveOffer
    end as ActiveOffer:Integer,
    case
        when offerProduct.ActiveProduct is null then 1
        when offerProduct.ActiveProduct <> 1 then 2
        else offerProduct.ActiveProduct
    end as ActiveProduct:Integer,
    ifnull(offerProduct.AlternateOfferYN, '' ) as AlternateOfferYN:String,
    ifnull(offerProduct.Offer.WholesaleOffer, 'No') as WholeSalePrice:String,
    ifnull(offerProduct.Price.RegPrice, 0) as RegisteredPrice:Double,
    ifnull(offerProduct.Price.Discount, 0) as Discount:Double,
    ifnull(offerProduct.Offer.Currency, '') as RegisteredPriceCurrency:String,
    ifnull(offerProduct.SKU.PACKFACTOR, 0) as Packfactor:Integer,
    ifnull(offerProduct.Price.NetPrice, 0) as NetPrice:Double
}where offerProduct.Offer.Tender.Active = 1
and offerProduct.Offer.Active = 1
and offerProduct.Active = 1;

entity TENDER_DATA as select from TransactionalDataViews.OfferProductPlus as offerProduct
inner join AdminData.PT_TMUSERCTRYN as ctryCWID on offerProduct.CountryCode = ctryCWID.CountryCode
inner join AdminData.CONDITIONAL_ACCESS as access on access.Id = access.Id
inner join MasterData.PT_TMTABRMP as ta on offerProduct.HLEVEL4_CODE = ta.HLevel4_Code
inner join MasterData.PT_TMRCM as region on offerProduct.CountryCode = region.CountryCode
inner join MasterDataLatestValues.ExchangeRates as rates on rates.CURRENCY_FROM = 'USD' and rates.CURRENCY_TO = 'EUR' and rates.X_TYPE = 'Budget'{
    ifnull(offerProduct.Offer.CountryCode, '') as CountryCode:String,
    ifnull(offerProduct.Offer.Tender.Country.CountryName, '') as CountryName:String,
    ifnull(offerProduct.Offer.Tender.Country.CountryName, '') as Country:String,
    ifnull(offerProduct.Offer.Tender.Country.CountryID, 0) as CountryID:Integer,
    ifnull(offerProduct.Offer.Tender.TenderID, '') as TenderID:String,
    ifnull(ta.TA, '') as TA:String,
    ifnull(offerProduct.Offer.Tender.TenderName, '') as TenderName:String,
    ifnull(offerProduct.Offer.Tender.TenderName, '') as Tender:String,
    ifnull(offerProduct.Offer.Tender.TenderChannel, '') as TenderChannel:String,
    ifnull(offerProduct.Offer.Tender.InstituteID, 0) as InstituteID:Integer,
    ifnull(offerProduct.Offer.Tender.Institute.InstituteName, '') as InstituteName:String,
    ifnull(
        year(
                case when offerProduct.Offer.SubmissionDate = '' or offerProduct.Offer.SubmissionDate is null
                    then
                         case when offerProduct.Offer.Quotation.SubmittedOn = '' or offerProduct.Offer.Quotation.SubmittedOn is null then offerProduct.Offer.Tender.PublicationDate
                         else offerProduct.Offer.Quotation.SubmittedOn
                         end
                else offerProduct.Offer.SubmissionDate
                end
        ),
        0
    ) as Year:Integer,
    case when offerProduct.Offer.Tender.PublicationDate = '' then null else offerProduct.Offer.Tender.PublicationDate end as PublicationDate:DateTime,
    case when offerProduct.Offer.Tender.BidDueDate = '' then null else offerProduct.Offer.Tender.BidDueDate end as BidDueDate:DateTime,
    key ifnull(offerProduct.Offer.OfferID, '') as OfferID:String,
    ifnull(offerProduct.Offer.PfiNumber.PFINo, ifnull(offerProduct.Offer.OfferID, '')) as OfferNumber:String(500),
    ifnull(offerProduct.Offer.OfferID, '') as Offer:String,
    ifnull(offerProduct.Offer.DistributorID, 0) as DistributorID:Integer,
    ifnull(offerProduct.Offer.Currency, '') as Currency:String,
    ifnull(offerProduct.Offer.Tender.Classification, '') as Classification:String,
    case when offerProduct.Offer.OfferStatus.STATUS = 'Quotation Submitted' or offerProduct.Offer.OfferStatus.STATUS = 'Results Recorded' or offerProduct.Offer.OfferStatus.STATUS = 'Delivery Ongoing'
        then
            case
                when offerProduct.Offer.SubmissionDate = '' or offerProduct.Offer.SubmissionDate is null then
                    case when offerProduct.Offer.Quotation.SubmittedOn = '' then null else offerProduct.Offer.Quotation.SubmittedOn end
                else offerProduct.Offer.SubmissionDate
            end
        else null
    end as SubmissionDate:DateTime,
    case when offerProduct.Offer.InternalBidDueDate = '' then null else offerProduct.Offer.InternalBidDueDate end as InternalBidDueDate:DateTime,
    case 
        when offerProduct.Offer.ActiveOffer is null then 1
        when offerProduct.Offer.ActiveOffer <> 1 then 2
        else offerProduct.Offer.ActiveOffer
    end as ActiveOffer:Integer,
    ifnull(offerProduct.Offer.RevisedOfferNo, 0) as RevisedOfferNo:Integer,
    ifnull(offerProduct.Offer.ContinuationOfferNo, 0) as ContinuationOfferNo:Integer,
    case when offerProduct.Offer.NewOfferDueDate = '' then null else offerProduct.Offer.NewOfferDueDate end as NewOfferDueDate:DateTime,
    ifnull(offerProduct.SORTER, 1) as SNo:Integer,
    ifnull(offerProduct.SKU.Product.HLEVEL4_NAME, '') as Brand:String,
    key ifnull(offerProduct.ProductCode, 0) as ProductCode:Integer,
    ifnull(offerProduct.ProductCode, 0) as ProductPackID:Integer,
    ifnull(offerProduct.SKU.PRODUCTPACKNAME, '') as ProductPackName:String,
    ifnull(offerProduct.SKU.PRODUCTPACKNAME, '') as Product:String,
    ifnull(offerProduct.SKU.PACKFACTOR, 0) as Packfactor:Integer,
    ifnull(offerProduct.SKU.UOM, '') as UoM:String,
    ifnull(offerProduct.RequestedVolume, 0) as RequestedVolume:Integer,
    ifnull(offerProduct.AlternateOfferYN, '') as AlternateOfferYN:String,
    case
        when offerProduct.ActiveProduct is null then 1
        when offerProduct.ActiveProduct <> 1 then 2
        else offerProduct.ActiveProduct
    end as ActiveProduct:Integer,
    ifnull(offerProduct.Price.OfferPrice, 0) as OfferPrice:Double,
    ifnull(offerProduct.Price.FOC, 0) as FOC:Double,
    ifnull(offerProduct.Price.FOCType, '') as FOCType:String,
    ifnull(offerProduct.Price.FOC_ABS_PCT, '') as FOC_ABS_PCT:String,
    ifnull(offerProduct.Offer.WholesaleOffer, 'No') as WholesalePrice:String,
    case when offerProduct.Offer.Quotation.OfferDate = '' then null else offerProduct.Offer.Quotation.OfferDate end as OfferDate:DateTime,
    case when offerProduct.Offer.Quotation.OfferValidity = '' then null else offerProduct.Offer.Quotation.OfferValidity end as OfferValidity:DateTime,
    ifnull(offerProduct.Offer.Quotation.DelayInSubmission, '') as DelayInSubmission:String,
    ifnull(offerProduct.Results.Outcome, '') as Outcome:String,
    ifnull(offerProduct.Results.AwardedQty, 0) as AwardedQty:Integer,
    ifnull(offerProduct.Results.ErrorInSubmission, '') as ErrorInSubmission:String,
    ifnull(offerProduct.Results.Reason, '') as Reason:String,
    ifnull(offerProduct.Results.Outcome, '') as C_Outcome:String,
    ifnull(offerProduct.Results.AwardedCompany, '') as C_Company:String,
    ifnull(offerProduct.Results.AwardedPrice, 0) as C_Price:Double,
    ifnull(offerProduct.Results.AwardedQty, 0) as C_AwardedQty:Integer,
    ifnull(offerProduct.Results.Currency, '') as C_Currency:String,
    ifnull(offerProduct.Results.UoM, '') as C_UoM:String,
    ifnull(offerProduct.Offer.OfferStatus.STATUS, '') as CurrentStatus:String,
    ifnull(offerProduct.Price.BudgetRate, 0) as FxRate_LC_EUR_Budget:Double,
    ifnull(rates.X_RATE, 0) as FxRate_USD_EUR_Budget:Double,
    ifnull(offerProduct.Price.COGS, 0) as COGS:Double,
    ifnull(offerProduct.Price.RegPrice, 0) as RegisteredPrice:Double,
    ifnull(offerProduct.Deliveries.SKUCode, 0) as SKUCode:Integer,
    ifnull(offerProduct.Deliveries.LocalOrDirectDelivery, '') as LocalorDirectDelivery:String,
    ifnull(offerProduct.Deliveries.PlannedInAPO, '') as PlannedinAPO:String,
    case when offerProduct.Deliveries.RequestedDeliveryDate = '' then null else offerProduct.Deliveries.RequestedDeliveryDate end as RequestedDeliveryDate:DateTime,
    ifnull(offerProduct.Deliveries.RequestedQuantity, 0) as RequestedQuantity:Integer,
    case when offerProduct.Deliveries.ActualDeliveryDate = '' then null else offerProduct.Deliveries.ActualDeliveryDate end as ActualDeliveryDate:DateTime,
    ifnull(offerProduct.Deliveries.ActualDeliveryQuantity, 0) as ActualDeliveredQuantity:Integer,
    ifnull(offerProduct.Deliveries.Penalty, '') as Penalty:String,
    ifnull(offerProduct.Deliveries.PenaltyValue, 0) as PenaltyValue:Double,
    ifnull(offerProduct.Deliveries.Currency, '') as DeliveryCurrency:String,
    ifnull(offerProduct.Deliveries.Institute.InstituteName, '') as ShipToInstituteName:String,
    ifnull(offerProduct.Deliveries.ActualDeliveryQuantity, 0) as ShipToQty:Integer,
    1 as MergeKey:Double,
    ifnull(access.CWIDs_COGS, '') as CWIDs_COGS:String,
    ifnull(access.CWIDs_Price, '') as CWIDs_Price:String,
    ifnull(access.CWIDs_Volume, '') as CWIDs_Volume:String,
    ifnull(access.CWIDs_Penalty, '') as CWIDs_Penalty:String,
    ifnull(access.CWIDs_MarketData, '') as CWIDs_MarketData:String,
    ifnull(ctryCWID.CWIDs, '') as CWIDs_Country:String
}where offerProduct.Offer.Tender.Active = 1
and offerProduct.Offer.Active = 1
and offerProduct.Active =1
union
select from MASSNET_TENDER_DATA as massnet {
    massnet.CountryCode,
    massnet.CountryName,
    massnet.Country,
    massnet.CountryID,
    massnet.TenderID,
    massnet.TA,
    massnet.TenderName,
    massnet.Tender,
    massnet.TenderChannel,
    massnet.InstituteID,
    massnet.InstituteName,
    massnet.Year,
    massnet.PublicationDate,
    massnet.BidDueDate,
    key massnet.OfferID,
    massnet.OfferNumber,
    massnet.Offer,
    massnet.DistributorID,
    massnet.Currency,
    massnet.Classification,
    massnet.SubmissionDate,
    massnet.InternalBidDueDate,
    massnet.ActiveOffer,
    massnet.RevisedOfferNo,
    massnet.ContinuationOfferNo,
    massnet.NewOfferDueDate,
    massnet.SNo,
    massnet.Brand,
    key massnet.ProductCode,
    massnet.ProductPackID,
    massnet.ProductPackName,
    massnet.Product,
    massnet.Packfactor,
    massnet.UoM,
    massnet.RequestedVolume,
    massnet.AlternateOfferYN,
    massnet.ActiveProduct,
    massnet.OfferPrice,
    massnet.FOC,
    massnet.FOCType,
    massnet.FOC_ABS_PCT,
    massnet.WholesalePrice,
    massnet.OfferDate,
    massnet.OfferValidity,
    massnet.DelayInSubmission,
    massnet.Outcome,
    massnet.AwardedQty,
    massnet.ErrorInSubmission,
    massnet.Reason,
    massnet.C_Outcome,
    massnet.C_Company,
    massnet.C_Price,
    massnet.C_AwardedQty,
    massnet.C_Currency,
    massnet.C_UoM,
    massnet.CurrentStatus,
    massnet.FxRate_LC_EUR_Budget,
    massnet.FxRate_USD_EUR_Budget,
    massnet.COGS,
    massnet.RegisteredPrice,
    massnet.SKUCode,
    massnet.LocalorDirectDelivery,
    massnet.PlannedinAPO,
    massnet.RequestedDeliveryDate,
    massnet.RequestedQuantity,
    massnet.ActualDeliveryDate,
    massnet.ActualDeliveredQuantity,
    massnet.Penalty,
    massnet.PenaltyValue,
    massnet.DeliveryCurrency,
    massnet.ShipToInstituteName,
    massnet.ShipToQty,
    massnet.MergeKey,
    massnet.CWIDs_COGS,
    massnet.CWIDs_Price,
    massnet.CWIDs_Volume,
    massnet.CWIDs_Penalty,
    massnet.CWIDs_MarketData,
    massnet.CWIDs_Country    
};

entity VW_TENDER_MANAGER_DASHBOARD as select from TransactionalData.PT_TMOFPR as offerProduct
left outer join TransactionalData.PT_TMQUTO as quotation on offerProduct.OfferID = quotation.OfferID
left outer join AdminData.PT_TMUSER as user on quotation.SubmittedBy = user.CWID{
    ifnull(offerProduct.Offer.Tender.CountryCode, '') as CountryCode_Tenders:String,
    ifnull(offerProduct.Offer.Tender.TenderID, '') as TenderID:String,
    ifnull(offerProduct.Offer.Tender.TenderName, '') as TenderName:String,
    ifnull(offerProduct.Offer.Tender.InstituteID, 0) as InstituteID:Integer,
    case when offerProduct.Offer.Tender.PublicationDate = '' then null else offerProduct.Offer.Tender.PublicationDate end as PublicationDate:DateTime,
    case when offerProduct.Offer.Tender.BidDueDate = '' then null else offerProduct.Offer.Tender.BidDueDate end as BidDueDate:DateTime,
    
    case when offerProduct.Offer.OfferStatus.STATUS = 'Quotation Submitted' or offerProduct.Offer.OfferStatus.STATUS = 'Results Recorded' or offerProduct.Offer.OfferStatus.STATUS = 'Delivery Ongoing'
        then
            case
                when offerProduct.Offer.SubmissionDate = '' or offerProduct.Offer.SubmissionDate is null then
                    case when offerProduct.Offer.Quotation.SubmittedOn = '' then null else offerProduct.Offer.Quotation.SubmittedOn end
                else offerProduct.Offer.SubmissionDate
            end
        else null
    end as SubmittedOn:DateTime,
    
    
    case when offerProduct.Offer.OfferStatus.STATUS = 'Quotation Submitted' or offerProduct.Offer.OfferStatus.STATUS = 'Results Recorded' or offerProduct.Offer.OfferStatus.STATUS = 'Delivery Ongoing'
        then ifnull(user.UserName, ifnull(offerProduct.Offer.Quotation.SubmittedBy, ''))
        else ''
    end as SubmittedBy:String,
    ifnull(offerProduct.Offer.Tender.TenderID, '') as TenderID_Custom_SQL_Query:String,
    key ifnull(offerProduct.Offer.OfferID, '') as OfferID:String,
    ifnull(offerProduct.Offer.WholesaleOffer, 'No') as WholesaleOfferYN:String,
    ifnull(offerProduct.Offer.RevisedOfferNo, 0) as RevisedOfferNo:Integer,
    ifnull(offerProduct.Offer.ContinuationOfferNo, 0) as ContinuationOfferNo:Integer,
    case when offerProduct.Offer.OfferStatus.STATUS = 'Quotation Submitted' or offerProduct.Offer.OfferStatus.STATUS = 'Results Recorded' or offerProduct.Offer.OfferStatus.STATUS = 'Delivery Ongoing'
        then
            case
                when offerProduct.Offer.SubmissionDate = '' or offerProduct.Offer.SubmissionDate is null then
                    case when offerProduct.Offer.Quotation.SubmittedOn = '' then null else offerProduct.Offer.Quotation.SubmittedOn end
                else offerProduct.Offer.SubmissionDate
            end
        else null
    end as SubmissionDate:DateTime,
    case when offerProduct.Offer.NewOfferDueDate = '' then null else offerProduct.Offer.NewOfferDueDate end as NewOfferDueDate:DateTime,
    case 
        when offerProduct.Offer.ActiveOffer is null then 1
        when offerProduct.Offer.ActiveOffer <> 1 then 2
        else offerProduct.Offer.ActiveOffer
    end as ActiveOffer:Integer,
    ifnull(offerProduct.Offer.Tender.CountryCode, '') as CountryCode:String,
    ifnull(offerProduct.Offer.Tender.Country.CountryName, '') as CountryName:String,
    ifnull(offerProduct.Offer.Tender.Country.ApprovalType, 0) as ApprovalType:Integer,
    ifnull(offerProduct.Offer.Tender.Country.LocalCurrency, '') as LocalCurrency:String,
    ifnull(offerProduct.Offer.Tender.Country.CountryID, 0) as CountryID:Integer,
    ifnull(offerProduct.Offer.Tender.Country.Region, '') as Region:String,
    ifnull(offerProduct.Offer.Tender.Institute.CountryCode, '') as CountryCode_Institutes:String,
    ifnull(offerProduct.Offer.Tender.InstituteID, 0) as InstituteID_Institutes:Integer,
    ifnull(offerProduct.Offer.Tender.Institute.CustomerID, 0) as CustomerID:Integer,
    ifnull(offerProduct.Offer.Tender.Institute.InstituteName, '') as InstituteName:String,
    ifnull(offerProduct.Offer.Tender.Institute.InstituteType, '') as InstituteType:String,
    ifnull(offerProduct.Offer.Tender.Institute.Address, '') as Address:String,
    ifnull(offerProduct.Offer.Tender.Institute.ContactNo, '') as ContactNo:String,
    ifnull(offerProduct.Offer.Tender.Institute.Fax, '') as Fax:String,
    ifnull(offerProduct.Offer.Tender.Institute.ContactPerson, '') as ContactPerson:String,
    ifnull(offerProduct.Offer.Tender.Institute.ActiveRecord, '') as ActiveRecord:String,
    ifnull(offerProduct.Offer.Tender.Institute.Comment, '') as Comment:String,
    ifnull(offerProduct.Offer.Tender.Institute.City, '') as City:String,
    ifnull(offerProduct.Offer.OfferID, '') as OfferID_Custom_SQL_Query:String,
    key ifnull(offerProduct.ProductCode, 0) as ProductCode:Integer,
    case
        when offerProduct.ActiveProduct is null then 1
        when offerProduct.ActiveProduct <> 1 then 2
        else offerProduct.ActiveProduct
    end as ActiveProduct:Integer,
    ifnull(offerProduct.AlternateOfferYN, '') as AlternateOfferYN:String,
    ifnull(offerProduct.ProductCode, 0) as ProductPackID:Integer,
    ifnull(offerProduct.SKU.PRODUCTPACKNAME, '') as ProductPackName:String,
    ifnull(offerProduct.SKU.PRESENTATION, '') as Presentation:String,
    ifnull(offerProduct.SKU.CONCENTRATION, 0) as Concentration:Integer,
    ifnull(offerProduct.SKU.UOM, '') as UoM:String,
    ifnull(offerProduct.SKU.PACKFACTOR, 0) as Packfactor:Integer,
    ifnull(offerProduct.SKU.PCIName, '') as PCIName:String,
    ifnull(offerProduct.SKUCountry.ACTIVERECORD, '') as ActiveRecord_ProductPacks:String,
    ifnull(offerProduct.SKU.HLEVEL6_CODE, '') as HLevel6_Code:String,
    ifnull(offerProduct.Offer.PfiNumber.OfferID, '') as OfferID_PFIOfferMap:String,
    ifnull(offerProduct.Offer.PfiNumber.PFINo, '') as PFINo:String,
    ifnull(offerProduct.Offer.Quotation.OfferID, '') as OfferID_Custom_SQL_Query_1:String,
    ifnull(offerProduct.Offer.Quotation.DelayInSubmission, '') as DelayInSubmission:String,
    ifnull(offerProduct.Results.OfferID, '') as OfferID_Custom_SQL_Query_2:String,
    ifnull(offerProduct.Results.ProductCode, 0) as ProductCode_Custom_SQL_Query:Integer,
    case when offerProduct.Results.ErrorInSubmission is null or offerProduct.Results.ErrorInSubmission = 'NULL' then 'No' else offerProduct.Results.ErrorInSubmission end as ErrorInSubmission:String,
    ifnull(offerProduct.Results.Outcome, '') as Outcome:String,
    ifnull(offerProduct.Price.OfferID, '') as OfferID_Custom_SQL_Query_3:String,
    ifnull(offerProduct.Price.ProductCode, 0) as ProductCode_Custom_SQL_Query_1:Integer,
    ifnull(offerProduct.Offer.WholesaleOffer, 'No') as WholeSalePrice:String,
    ifnull(offerProduct.Offer.Tender.Classification, '') as Classification:String
}where offerProduct.Offer.Tender.Active = 1
and offerProduct.Offer.Active = 1
and offerProduct.Active = 1
and offerProduct.Offer.Tender.Country.Region = 'MEA';

entity TENDER_PRICING as select from TransactionalDataViews.OfferProductPlus as offerProduct{
    offerProduct.CountryCode as COUNTRY_CODE,
    offerProduct.Offer.Tender.Country.CountryName as COUNTRY_NAME,
    offerProduct.TenderID as TENDER_ID,
    key offerProduct.OfferID as OFFER_ID,
    offerProduct.Offer.Tender.TenderName as TENDER_NAME,
    offerProduct.Offer.Tender.InstituteID as INSTITUTE_ID,
    offerProduct.Offer.Tender.Institute.InstituteName as INSTITUTE_NAME,
    ifnull(offerProduct.Offer.SubmissionDate, offerProduct.Offer.Tender.PublicationDate) as TENDER_DATE:Date,
    offerProduct.SKU.Product.HLEVEL4_CODE as BRAND_ID,
    offerProduct.SKU.Product.HLEVEL4_NAME as BRAND_NAME,
    key offerProduct.ProductCode as PRODUCT_ID,
    offerProduct.SKU.PRODUCTPACKNAME as PRODUCT_NAME,
    offerProduct.Price.RegPrice as PACK_REGISTERED_PRICE,
    offerProduct.Price.OfferPrice as OFFER_PRICE,
    offerProduct.Price.NetofferPrice as NET_OFFER_PRICE,
    offerProduct.Price.NetPrice as NET_PRICE,
    offerProduct.Price.COGS as COGS,
    offerProduct.Price.BudgetRate as BUDGET_RATE,
    offerProduct.Offer.Currency as CURRENCY,
    offerProduct.RequestedVolume as QUANTITY,
    case when offerProduct.Price.FOCType = 'FOC 1'
        then offerProduct.RequestedVolume - case when offerProduct.Price.FOC_ABS_PCT = 'PCT' then round(offerProduct.Price.FOC * offerProduct.RequestedVolume) else round(offerProduct.Price.FOC) end
        else offerProduct.RequestedVolume
    end as PAID_QUANTITY:Double,
    case when offerProduct.Price.FOC_ABS_PCT = 'PCT' then round(offerProduct.Price.FOC * offerProduct.RequestedVolume) else round(offerProduct.Price.FOC) end as FOC:Double,
    offerProduct.RequestedVolume * case when offerProduct.UnitPerPack = 'Unit' then 1 / offerProduct.SKU.PACKFACTOR else 1 end as PACK_QUANTITY:Double,
    case when offerProduct.Price.FOCType = 'FOC 1'
        then offerProduct.RequestedVolume - case when offerProduct.Price.FOC_ABS_PCT = 'PCT' then round(offerProduct.Price.FOC * offerProduct.RequestedVolume) else round(offerProduct.Price.FOC) end
        else offerProduct.RequestedVolume
    end
    * case when offerProduct.UnitPerPack = 'Unit' then 1 / offerProduct.SKU.PACKFACTOR else 1 end as PACK_PAID_QUANTITY:Double,
    case when offerProduct.Price.FOC_ABS_PCT = 'PCT' then round(offerProduct.Price.FOC * offerProduct.RequestedVolume) else round(offerProduct.Price.FOC) end
    * case when offerProduct.UnitPerPack = 'Unit' then 1 / offerProduct.SKU.PACKFACTOR else 1 end as PACK_FOC:Double,
    offerProduct.UnitPerPack as UOM,
    offerProduct.Results.Outcome as OUTCOME,
    offerProduct.Price.OfferPrice
    * case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end as PACK_OFFER_PRICE:Double,
    offerProduct.Price.OfferPrice
    * case when offerProduct.UnitPerPack = 'Unit' then 1 else 1 / offerProduct.SKU.PACKFACTOR end as UNIT_OFFER_PRICE:Double,
    offerProduct.Price.NetofferPrice
    * case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end as PACK_NET_OFFER_PRICE:Double,
    offerProduct.Price.NetofferPrice
    * case when offerProduct.UnitPerPack = 'Unit' then 1 else 1 / offerProduct.SKU.PACKFACTOR end as UNIT_NET_OFFER_PRICE:Double,
    offerProduct.Price.NetPrice
    * case when offerProduct.UnitPerPack = 'Unit' then offerProduct.SKU.PACKFACTOR else 1 end as PACK_NET_PRICE:Double,
    offerProduct.Price.NetPrice
    * case when offerProduct.UnitPerPack = 'Unit' then 1 else 1 / offerProduct.SKU.PACKFACTOR end as UNIT_NET_PRICE:Double
}where offerProduct.Offer.Tender.Active = 1
and offerProduct.Offer.Active = 1
and offerProduct.Offer.ActiveOffer = 1
and offerProduct.Active = 1
and offerProduct.ActiveProduct = 1
and (offerProduct.Results.Outcome = 'Won' or offerProduct.Results.Outcome = 'Lost')
and year(ifnull(offerProduct.Offer.SubmissionDate, offerProduct.Offer.Tender.PublicationDate)) >= 2017
and offerProduct.Offer.Tender.Country.Region = 'MEA';


entity MasterApproverBrandMap as select from MasterData.CountryApprovers as MasterApproverBrandMap {
    key MasterApproverBrandMap.CountryCode,
	key MasterApproverBrandMap.ApproverType,
    key MasterApproverBrandMap.Division,
	MasterApproverBrandMap.ApproverName,
	key MasterApproverBrandMap.ApproverEmailID,
	MasterApproverBrandMap.Enabled
};

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
	MasterAuthorizedSignatories.TITLE,
	case MasterAuthorizedSignatories.SORTER 
		when 2 then 'Company Stamp'
		when 1 then 'Issued By'
		else ''
	end as Default:String
} order by MasterAuthorizedSignatories.LEGAL_ENTITY_CODE,
		   MasterAuthorizedSignatories.COUNTRY_CODE,
		   MasterAuthorizedSignatories.SORTER;

entity MasterCountryLegalEntityBrandMap as select from MasterData.PT_TMCTLEBR as MasterCountryLegalEntityBrandMap {
	MasterCountryLegalEntityBrandMap.CountryLegalEntityBrandID,
	key MasterCountryLegalEntityBrandMap.LegalEntityID,
	key MasterCountryLegalEntityBrandMap.HLevel4_Code,
	key MasterCountryLegalEntityBrandMap.CountryCode,
	MasterCountryLegalEntityBrandMap.Entity.LegalEntityName,
	min(MasterCountryLegalEntityBrandMap.Brand.HLEVEL4_NAME) as HLEVEL4_NAME:String
} group by MasterCountryLegalEntityBrandMap.CountryLegalEntityBrandID,
		   MasterCountryLegalEntityBrandMap.LegalEntityID,
		   MasterCountryLegalEntityBrandMap.HLevel4_Code,
		   MasterCountryLegalEntityBrandMap.CountryCode,
		   MasterCountryLegalEntityBrandMap.Entity.LegalEntityName
  order by MasterCountryLegalEntityBrandMap.CountryCode,
  		   MasterCountryLegalEntityBrandMap.Entity.LegalEntityName,
		   min(MasterCountryLegalEntityBrandMap.Brand.HLEVEL4_NAME);

entity MasterCountryLegalEntityMap as select from MasterData.PT_TMCTLE as MasterCountryLegalEntityMap {
	MasterCountryLegalEntityMap.CountryLegalEntityID,
	key MasterCountryLegalEntityMap.LegalEntityID,
	key MasterCountryLegalEntityMap.CountryCode,
	MasterCountryLegalEntityMap.LegalEntity.LegalEntityName,
	MasterCountryLegalEntityMap.Brand
} order by MasterCountryLegalEntityMap.CountryCode,
		   MasterCountryLegalEntityMap.LegalEntity.LegalEntityName;

entity MasterDistributorBrandMap as select from MasterData.PT_TMDISBRD as MasterDistributorBrandMap {
	key MasterDistributorBrandMap.DistributorBrandID,
	MasterDistributorBrandMap.DistributorID,
	MasterDistributorBrandMap.HLevel4_Code,
	MasterDistributorBrandMap.CountryCode,
	MasterDistributorBrandMap.Distributor.DistributorName,
	min(MasterDistributorBrandMap.Product.HLEVEL4_NAME) as HLEVEL4_NAME:String,
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
		   MasterDistributorBrandMap.PaymentTerms
   order by MasterDistributorBrandMap.CountryCode,
   			MasterDistributorBrandMap.Distributor.DistributorName,
			min(MasterDistributorBrandMap.Product.HLEVEL4_NAME);

entity MasterDistributors as select from MasterData.PT_TMDIST as MasterDistributors {
	key MasterDistributors.DistributorID,
	MasterDistributors.CountryCode,
	MasterDistributors.DistributorName,
	MasterDistributors.Address,
	MasterDistributors.ContactNo,
	MasterDistributors.Fax,
	MasterDistributors.CONTACT_EMAIL,
	MasterDistributors.ContactPerson
} where MasterDistributors.ActiveRecord = 'Yes'
order by MasterDistributors.CountryCode, MasterDistributors.DistributorName;

entity MasterInstituteBrandTerms as select from MasterData.PT_TMINSBRTR as MasterInstituteBrandTerms {
	key MasterInstituteBrandTerms.InstituteBrandTermsID,
	MasterInstituteBrandTerms.InstituteID,
	MasterInstituteBrandTerms.HLevel4_Code,
	MasterInstituteBrandTerms.CountryCode,
	MasterInstituteBrandTerms.Institute.InstituteName,
	min(MasterInstituteBrandTerms.Product.HLEVEL4_NAME) as HLEVEL4_NAME:String,
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
		   MasterInstituteBrandTerms.Institute.InstituteName,
  		   min(MasterInstituteBrandTerms.Product.HLEVEL4_NAME);

entity MasterInstituteDistBrandMap as select from MasterData.PT_TMINDSBR as MasterInstituteDistBrandMap {
	key MasterInstituteDistBrandMap.InstituteDistBrandRelationID,
	MasterInstituteDistBrandMap.InstituteID,
	MasterInstituteDistBrandMap.DistributorID,
	MasterInstituteDistBrandMap.HLevel4_Code,
	MasterInstituteDistBrandMap.CountryCode,
	MasterInstituteDistBrandMap.Institute.InstituteName,
	MasterInstituteDistBrandMap.Distributor.DistributorName,
	min(MasterInstituteDistBrandMap.Product.HLEVEL4_NAME) as HLEVEL4_NAME:String,
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
		   MasterInstituteDistBrandMap.Distributor.DistributorName,
		   MasterInstituteDistBrandMap.Commissionrate;

entity MasterInstitutes as select from MasterData.PT_TMINST as i
left outer join MasterData.MASTER_INSTITUTE_HIERARCHY as ih on i.INSTITUTE_HIERARCHY_ID = ih.ID
left outer join MasterData.PT_TMINSHIER as h on (i.InstituteID = h.InstituteID  or i.InstituteID =h.ParentInstituteID) and h.ActiveRecord ='Yes' 
left outer join MasterData.PT_TMINST as i2 on h.ParentInstituteID =i2.InstituteID
left outer join MasterData.PT_TMINDSBR as dsbr on i.InstituteID=dsbr.InstituteID
left outer join MasterData.PT_TMINSBRTR as br on i.InstituteID=br.InstituteID  {
	key i.InstituteID,
	key i.CountryCode,
	case when i2.InstituteName is null 
		then '' 
		else i2.InstituteName 
	end as GroupName:String,
	i.CustomerID,
	i.InstituteName,
	i.InstituteType,
	case when count(dsbr.InstituteID) <> 0 and count(br.InstituteID) <> 0
		then 'Yes'
		else 'No'
	end as AllowsDirect:String,
	i.Address,
	i.ContactNo,
	i.Fax,
	i.ContactPerson, 
	i.Comment,
	i.City,
	case when h.ParentInstituteID is null 
		then '' 
		else h.ParentInstituteID || ''
	end as GroupID:String,
	i.INSTITUTE_HIERARCHY_ID,
	ih.NAME as INSTITUTE_HIERARCHY
} group by i.InstituteID,
		   i.CountryCode,
		   i2.InstituteName,
		   i.CustomerID,
		   i.InstituteName,
		   i.InstituteType,
		   i.Address,
		   i.ContactNo,
		   i.Fax,
		   i.ContactPerson,
		   i.Comment,
		   i.City,
		   h.ParentInstituteID,
		   i.INSTITUTE_HIERARCHY_ID,
		   ih.NAME
  order by i.CountryCode,
           i2.InstituteName;

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

//EHQUT-119446-Adding Nucleus field in Template
//EHQUT-198144-MEA - Master data template file to be updated 
entity MasterProductPacks as select from MasterData.PT_TMCTRY as MasterProductPacks
inner join MasterData.PT_TMCTPRDPCK as CP on MasterProductPacks.CountryCode = CP.COUNTRYCODE
inner join MasterData.PT_TMPRDPCK as P on CP.PRODUCTPACKID = P.PRODUCTPACKID 
inner join MasterData.PT_TMPRDHIER as H on P.HLEVEL6_CODE = H.HLEVEL6_CODE
left outer join MasterData.PT_TMSKUPRDPCK as sku on CP.COUNTRYCODE = sku.CountryCode and CP.PRODUCTPACKID = sku.ProductPackID 
left outer join MasterDataLatestValues.CountryRegisteredPrice as reg on CP.COUNTRYCODE=reg.COUNTRY_CODE and CP.PRODUCTPACKID =reg.PRODUCT_ID
left outer join MasterDataLatestValues.CountryCogs as cogs on CP.COUNTRYCODE=cogs.COUNTRY_CODE and CP.PRODUCTPACKID=cogs.PRODUCT_ID {
	key P.PRODUCTPACKID,
	key CP.COUNTRYCODE,
	min(H.HLEVEL1_NAME) as HLEVEL1_NAME:String,
	min(H.HLEVEL4_CODE) as HLEVEL4_CODE:String,
	min(H.HLEVEL4_NAME) as HLEVEL4_NAME:String,
	P.HLEVEL6_CODE,
	min(H.HLEVEL6_NAME) as HLEVEL6_NAME:String,
	P.PRODUCTPACKNAME,
	P.PRESENTATION,
	P.UOM,
	P.CONCENTRATION,
	P.PACKFACTOR,
	P.PCIName,
    CP.GPP_GOVERNED,
    CP.LAP_CURRENCY,
    CP.LAP,
    CP.LAP_UNIT,
    CP.PRAD_ID,
    CP.PRAF_COMMENTS,
    P.Nucleus,
	CP.COUNTRYOFORIGIN,
	CP.SHELFLIFE,
	case CP.REGISTERED 
		when 0 then 'No'
		when 1 then 'Without Price'
		when 2 then 'With Price'
	end as REGISTERED:String,
	CP.MANUFACTURER,
	CP.COMMENT,
	reg.CURRENCY as REGISTERED_PRICE_CURRENCY,
	reg.UOM as REGISTERED_PRICE_UOM,
	reg.REGISTERED_PRICE,
	'' as NEW_REGISTERED:String,
	cogs.CURRENCY as COGS_CURRENCY,
	'Pack' as COGS_UOM:String,
	cogs.COGS,
	'' as NEW_COGS:String,
	sku.SKUCode as MaterialNumbers:String,
	CP.QTY_THRESHOLD,
	P.ACTIVERECORD as ACTIVE_PRODUCT,
	CP.ACTIVERECORD as ACTIVE_COUNTRY_PRODUCT
} group by P.PRODUCTPACKID,
	CP.COUNTRYCODE,
	P.HLEVEL6_CODE,
	P.PRODUCTPACKNAME,
	P.PRESENTATION,
	P.UOM,
	P.CONCENTRATION,
	P.PACKFACTOR,
   	CP.COUNTRYOFORIGIN,
	CP.SHELFLIFE,
	CP.MANUFACTURER,
	reg.CURRENCY,
	reg.REGISTERED_PRICE,
	P.ACTIVERECORD,
	CP.ACTIVERECORD,
	P.PCIName,
    CP.GPP_GOVERNED,
    CP.LAP_CURRENCY,
    CP.LAP,
    CP.LAP_UNIT,
    CP.PRAD_ID,
    CP.PRAF_COMMENTS,
    P.Nucleus,
	CP.REGISTERED,
	CP.COMMENT,
	reg.UOM,
	reg.CURRENCY,
	cogs.CURRENCY,
	cogs.COGS,
	sku.SKUCode,
	CP.QTY_THRESHOLD,
	P.ACTIVERECORD,
	CP.ACTIVERECORD
  order by CP.COUNTRYCODE,
  		   P.PRODUCTPACKNAME;

entity MasterTABrandMap as select from MasterData.PT_TMTABRMP as MasterTABrandMap {
	key MasterTABrandMap.TABrandID,
	MasterTABrandMap.HLevel4_Code,
	MasterTABrandMap.TA,
	MasterTABrandMap.TAShort,
	min(MasterTABrandMap.Product.HLEVEL4_NAME) as HLEVEL4_NAME:String
} group by  MasterTABrandMap.TABrandID,
			MasterTABrandMap.HLevel4_Code,
			MasterTABrandMap.TA,
			MasterTABrandMap.TAShort
order by MasterTABrandMap.TA,
		 min(MasterTABrandMap.Product.HLEVEL4_NAME);

//DONE
entity MasterBudgetedProfitability as select from MasterDataLatestValues.VWBUDGETEDPROFITABILITY as MasterBudgetedProfitability
inner join MasterData.PT_TMPRDHIER as h on MasterBudgetedProfitability.HLEVEL4_CODE = h.HLEVEL4_CODE {
	key MasterBudgetedProfitability.HLEVEL4_CODE,
	key MasterBudgetedProfitability.COUNTRYCODE,
	min(h.HLEVEL4_NAME) as BRAND:String,
	MasterBudgetedProfitability.PROFITABILITY
} group by MasterBudgetedProfitability.HLEVEL4_CODE,
		   MasterBudgetedProfitability.COUNTRYCODE,
		   MasterBudgetedProfitability.PROFITABILITY
  order by MasterBudgetedProfitability.COUNTRYCODE,
		   min(h.HLEVEL4_NAME);

entity Offers as select from TransactionalData.PT_TMOFRS as offer {
    offer.OfferID,
    case when offer.PfiNumber.PFINo is null 
		then 'NA' 
		else offer.PfiNumber.PFINo 
	end as PFINo:String,
    offer.TenderID,
    offer.CountryCode,
    offer.Tender.InstituteID,
    offer.OfferStatusTable.STATUS,
    offer.ActiveOffer,
    offer.TenderOfferNo,
    offer.RevisedOfferNo,
    offer.ContinuationOfferNo,
    offer.TenderID || '_' || offer.TenderOfferNo as RootId,
    offer.TenderID || '_' || offer.TenderOfferNo || '_Active:' || offer.ActiveOffer as CheckId
};

entity OfferInfo as select from Offers as o1 
left outer join Offers o2 on o1.RootId = o2.RootId and o2.ActiveOffer = 1
{
    key o1.OfferID,
    o1.PFINo,
    o1.TenderID,
    o1.CountryCode,
    o1.InstituteID,
    o1.STATUS,
    o1.ActiveOffer,
    o1.TenderOfferNo,
    o1.RevisedOfferNo,
    o1.ContinuationOfferNo,
    o1.RootId:String,
    o1.CheckId:String,
    case when o2.OfferID is null
        then 'Not Found'
        else o2.OfferID
    end as ActiveForRoot:String
}; // WITH READ ONLY => check this with Jonathan

entity OfferProductInfo as select from TransactionalData.PT_TMOFPR as offerProduct {
    offerProduct.OfferID || '_' || offerProduct.ProductCode as ID:String(50),
    offerProduct.TenderID,
    key offerProduct.OfferID,
    offerProduct.Active,
    key offerProduct.ProductCode,
    offerProduct.AlternateOfferYN,
    offerProduct.RequestedVolume,
    offerProduct.UnitPerPack,
    offerProduct.SKU.PRODUCTPACKNAME as Product,
    offerProduct.OfferID || '_' || upper(left(offerProduct.SKU.PRODUCTPACKNAME,3)) as ID_Prod:String
};


entity ProductInfo as select from MasterData.PT_TMPRDPCK as product {
    key product.PRODUCTPACKID,
    product.PRODUCTPACKNAME,
    product.HLEVEL6_CODE,
    CountryPacks.COUNTRYCODE,
    key case when ProductPackSKUs.SKUCode is null 
        then '-1' 
        else ProductPackSKUs.SKUCode 
    end as SKUCode:String,
    product.PACKFACTOR 
};

//Chile Massnet Tenders Data
entity MassnetTenders: cuid, managed {
	TenderID : String(500);
    Line : Integer;
    ProductCode : Integer;
    OfferPrice : Double;
    Product : String(5000);
    CompetitorPrice : Double;
    MyCompetence : String(5000);
    TotalValue : Double;
    AwardedQuantity : Integer;
    RequestedQuantity : Integer;
    UoM : String(500);
    Status : String(500);
    Company : String(500);
    RequestingInstitute : String(500);
    PurchasingInstitute : String(500);
    ProductDescription : String(5000);
    TenderName : String(5000);
    OfferDescription : String(5000);
    PublicationDate : Date;
    ClosingDate : Date;
    AwardDate : Date;
    Region : String(500);
    Currency : String(500);
    TenderType : String(500);
    OfferType : String(500);
    ContractDuration : String(500);
};

entity MASSNET_TENDER_DATA as select from MassnetTenders as massnet
inner join MasterData.PT_TMCTRY  as country on country.CountryCode='CL'
inner join AdminData.PT_TMUSERCTRYN  as ctryCWID on ctryCWID.CountryCode = 'CL'
inner join AdminData.CONDITIONAL_ACCESS  as access on access.Id = access.Id
inner join MasterDataLatestValues.ExchangeRates  as rates on rates.CURRENCY_FROM = 'USD' and rates.CURRENCY_TO = 'EUR' and rates.X_TYPE = 'Budget'
inner join MasterDataLatestValues.ExchangeRates  as lcRates on lcRates.CURRENCY_FROM = 'CLP' and lcRates.CURRENCY_TO = 'EUR' and lcRates.X_TYPE = 'Budget'
left outer join MasterProductPacks  as product on product.MaterialNumbers = massnet.ProductCode
left outer join MasterDataLatestValues.CountryCogs  as cogs on cogs.COUNTRY_CODE = 'CL' and cogs.PRODUCT_ID = product.PRODUCTPACKID
left outer join MasterDataLatestValues.CountryRegisteredPrice  as registeredPrice on registeredPrice.COUNTRY_CODE = 'CL' and registeredPrice.PRODUCT_ID = product.PRODUCTPACKID
left outer join MasterData.PT_TMTABRMP as ta on product.HLEVEL4_CODE = ta.HLevel4_Code
left outer join MasterData.PT_TMRCM as region on region.CountryCode = 'CL'
{
    country.CountryCode as CountryCode:String,
    country.CountryName as CountryName:String,
    country.CountryName as Country:String,
    country.CountryID as CountryID:Integer,
    massnet.TenderID as TenderID:String,
    ifnull(ta.TA,'NA') as TA:String,
    massnet.TenderName as TenderName:String,
    massnet.TenderName as Tender:String,
    'Direct' as TenderChannel:String,
    1 as InstituteID:Integer,
    massnet.RequestingInstitute as InstituteName:String,
    year(massnet.PublicationDate) as Year:Integer,
    massnet.PublicationDate as PublicationDate:DateTime,
    massnet.ClosingDate as BidDueDate:DateTime,
    key massnet.TenderID || massnet.Line as OfferID:String,
    massnet.TenderID || massnet.Line as OfferNumber:String,
    massnet.TenderID || massnet.Line as Offer:String,
    1 as DistributorID:Integer,
    'CLP' as Currency:String,
    massnet.TenderType as Classification:String,
    massnet.ClosingDate as SubmissionDate:DateTime,
    massnet.ClosingDate as InternalBidDueDate:DateTime,
    1 as ActiveOffer:Integer,
    0 as RevisedOfferNo:Integer,
    0 as ContinuationOfferNo:Integer,
    massnet.ClosingDate as NewOfferDueDate:DateTime,
    massnet.Line as SNo:Integer,
    ifnull(product.HLEVEL4_NAME,'NA') as Brand:String,
    key ifnull(product.PRODUCTPACKID,1) as ProductCode:Integer,
    ifnull(product.PRODUCTPACKID,1) as ProductPackID:Integer,
    ifnull(product.PRODUCTPACKNAME,massnet.Product) as ProductPackName:String,
    ifnull(product.PRODUCTPACKNAME,massnet.Product) as Product:String,
    ifnull(product.PACKFACTOR,1) as Packfactor:Integer,
    case when massnet.UoM = 'CAJA' then 'Pack' else 'Unit' end as UoM:String,
    massnet.RequestedQuantity as RequestedVolume:Integer,
    'No' as AlternateOfferYN:String,
    1 as ActiveProduct:Integer,
    massnet.OfferPrice as OfferPrice:Double,
    0 as FOC:Double,
    'FOC 2' as FOCType:String,
    'ABS' as FOC_ABS_PCT:String,
    'No' as WholesalePrice:String,
    massnet.ClosingDate as OfferDate:DateTime,
    massnet.ClosingDate as OfferValidity:DateTime,
    'No' as DelayInSubmission:String,
    'Won' as Outcome:String,
    massnet.AwardedQuantity as AwardedQty:Integer,
    'No' as ErrorInSubmission:String,
    'NA' as Reason:String,
    'Won' as C_Outcome:String,
    'Bayer' as C_Company:String,
    massnet.OfferPrice as C_Price:Double,
    massnet.AwardedQuantity as C_AwardedQty:Integer,
    'CLP' as C_Currency:String,
    case when massnet.UoM = 'CAJA' then 'Pack' else 'Unit' end as C_UoM:String,
    'Delvery Ongoing' as CurrentStatus:String,
    ifnull(lcRates.X_RATE, 0) as FxRate_LC_EUR_Budget:Double,
    ifnull(rates.X_RATE, 0) as FxRate_USD_EUR_Budget:Double,
    ifnull(cogs.COGS, 0) as COGS:Double,
    ifnull(registeredPrice.REGISTERED_PRICE,0) as RegisteredPrice:Double,
    ProductCode as SKUCode:Integer,
    null as LocalorDirectDelivery:String,
    null as PlannedinAPO:String,
    null as RequestedDeliveryDate:DateTime,
    null as RequestedQuantity:Integer,
    null as ActualDeliveryDate:DateTime,
    null as ActualDeliveredQuantity:Integer,
    null as Penalty:String,
    null as PenaltyValue:Double,
    null as DeliveryCurrency:String,
    null as ShipToInstituteName:String,
    null as ShipToQty:Integer,
    null as MergeKey:Double,
    ifnull(access.CWIDs_COGS, '') as CWIDs_COGS:String,
    ifnull(access.CWIDs_Price, '') as CWIDs_Price:String,
    ifnull(access.CWIDs_Volume, '') as CWIDs_Volume:String,
    ifnull(access.CWIDs_Penalty, '') as CWIDs_Penalty:String,
    ifnull(access.CWIDs_MarketData, '') as CWIDs_MarketData:String,
    ifnull(ctryCWID.CWIDs, '') as CWIDs_Country:String
};
