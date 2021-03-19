namespace com.bayer.SXTENDER.ExternalDataViews;

using { User, Country, managed } from '@sap/cds/common';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.TransactionalData } from './TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataViews } from './TransactionalDataViews';
using { com.bayer.SXTENDER.MasterDataLatestValues } from './MasterDataLatestValues';

entity DeliveryForProduct as select from TransactionalData.PT_TMDLVTR delivery {
    key delivery.OfferID as OFFERID,
    key delivery.ProductCode as PRODUCTID,
    sum(delivery.RequestedQuantity) as RequestedQuantity:Double,
    sum(delivery.ActualDeliveryQuantity) as ActualDeliveredQuantity:Double,
}where delivery.Active = 1
group by delivery.OfferID, delivery.ProductCode;

entity Dashboard as select from TransactionalDataViews.OfferProductPlus offerProduct
inner join MasterData.PT_TMTABRMP ta on offerProduct.HLEVEL4_CODE = ta.HLevel4_Code
inner join MasterData.PT_TMRCM region on offerProduct.CountryCode = region.CountryCode
left outer join DeliveryForProduct delivery on offerProduct.OfferID = delivery.OFFERID and offerProduct.ProductCode = delivery.PRODUCTID {
    year(ifnull(offerProduct.Offer.SubmissionDate, offerProduct.Offer.Tender.PublicationDate)) as YEAR:Integer,
    ta.TA as TA,
    offerProduct.SKU.Product.HLEVEL4_NAME as Brand,
    region.SubRegion as Subregion,
    offerProduct.Offer.Tender.Country.CountryName as CountryName,
    offerProduct.Offer.Tender.Institute.InstituteName as InstituteName,
    offerProduct.Offer.Tender.TenderName as TenderName,
    offerProduct.Offer.Tender.Classification as Classification,
    offerProduct.Offer.Tender.TenderID as TenderID,
    offerProduct.Offer.Tender.TenderChannel as TenderChannel, 
    key ifnull(offerProduct.Offer.PfiNumber.PFINo, offerProduct.Offer.OfferID) as OfferNumber:String(500),
    offerProduct.Offer.Distributor.DistributorName as DistributorName,
    key offerProduct.SKU.PRODUCTPACKNAME as ProductPackName,
    offerProduct.Offer.Currency as Currency,
    offerProduct.Price.OfferPrice as OfferPrice,
    offerProduct.Price.FOC as FOC,
    offerProduct.Price.FOC_ABS_PCT as FOC_ABS_PCT,
    offerProduct.Price.FOCType as FOCType,
    offerProduct.RequestedVolume as RequestedVolume,
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
    offerProduct.Price.OfferPrice / offerProduct.Price.BudgetRate as TotalValue_EUR:Double,
    offerProduct.Offer.Quotation.OfferDate as OfferDate,
    offerProduct.Offer.Quotation.OfferValidity as OfferValidity,
    offerProduct.Offer.Tender.PublicationDate as PublicationDate,
    offerProduct.Offer.SubmissionDate as SubmissionDate,
    offerProduct.Offer.Tender.BidDueDate as BidDueDate,
    offerProduct.Offer.NewOfferDueDate as NewOfferDueDate,
    offerProduct.Results.SubmittedOn as FeedBackDate,
    offerProduct.Results.AwardedQty as AwardedQty,
    delivery.RequestedQuantity as RequestedQuantity,
    delivery.ActualDeliveredQuantity as ActualDeliveredQuantity,
    offerProduct.Results.AwardedCompany as Participant,
    offerProduct.Results.AwardedPrice as ParticipantPrice,
    offerProduct.Results.Currency as ParticipantCurrency,
    offerProduct.Results.UoM as ParticipantUoM,
    offerProduct.Results.Outcome as PaticipantOutcome,
    offerProduct.Offer.ActiveOffer as ActiveOffer,
    offerProduct.ActiveProduct as ActiveProduct:Integer,
    offerProduct.AlternateOfferYN as AlternateOfferYN,
    offerProduct.Price.WholesalePrice as WholeSalePrice,
    offerProduct.Price.RegPrice as RegisteredPrice,
    offerProduct.Price.Discount as Discount,
    offerProduct.Offer.Currency as RegisteredPriceCurrency,
    offerProduct.SKU.PACKFACTOR as Packfactor,
    offerProduct.Offer.OfferStatus.STATUS as CurrentStatus
}where offerProduct.Offer.Tender.Active = 1
and offerProduct.Offer.Active = 1
and offerProduct.Active = 1 
and offerProduct.Price.BudgetRate <> 0
and offerProduct.Offer.Tender.Country.Region = 'MEA';

entity TENDER_DATA as select from TransactionalDataViews.OfferProductPlus offerProduct
inner join AdminData.PT_TMUSERCTRYN ctryCWID on offerProduct.CountryCode = ctryCWID.CountryCode
inner join AdminData.CONDITIONAL_ACCESS access on access.Id = access.Id
inner join MasterData.PT_TMTABRMP ta on offerProduct.HLEVEL4_CODE = ta.HLevel4_Code
inner join MasterData.PT_TMRCM region on offerProduct.CountryCode = region.CountryCode
inner join MasterDataLatestValues.ExchangeRates rates on rates.CURRENCY_FROM = 'USD' and rates.CURRENCY_TO = 'EUR' and rates.X_TYPE = 'Budget'{
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
                case when offerProduct.Offer.Tender.Offer.SubmissionDate = '' or offerProduct.Offer.Tender.Offer.SubmissionDate is null
                    then
                         case when offerProduct.Offer.Quotation.SubmittedOn = '' or offerProduct.Offer.Quotation.SubmittedOn is null then offerProduct.Offer.Tender.PublicationDate
                         else offerProduct.Offer.Quotation.SubmittedOn
                         end
                else offerProduct.Offer.Tender.Offer.SubmissionDate
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
    case
        when offerProduct.Offer.SubmissionDate = '' or offerProduct.Offer.SubmissionDate is null then
            case when offerProduct.Offer.Quotation.SubmittedOn = '' then null else offerProduct.Offer.Quotation.SubmittedOn end
        else offerProduct.Offer.SubmissionDate
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
    ifnull(offerProduct.GroupPurchasing.Institute.InstituteName, '') as ShipToInstituteName:String,
    ifnull(offerProduct.GroupPurchasing.Requested, 0) as ShipToQty:Integer,
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
and offerProduct.Offer.Tender.Country.Region = 'MEA';

entity VW_TENDER_MANAGER_DASHBOARD as select from TransactionalData.PT_TMOFPR offerProduct{
    offerProduct.Offer.Tender.CountryCode as CountryCode_Tenders,
    offerProduct.Offer.Tender.TenderID as TenderID,
    offerProduct.Offer.Tender.TenderName as TenderName,
    offerProduct.Offer.Tender.InstituteID as InstituteID,
    offerProduct.Offer.Tender.PublicationDate as PublicationDate,
    offerProduct.Offer.Tender.BidDueDate as BidDueDate,
    offerProduct.Offer.Tender.SubmittedOn as SubmittedOn,
    case when offerProduct.Offer.OfferStatus.STATUS = 'Quotation Submitted' or offerProduct.Offer.OfferStatus.STATUS = 'Results Recorded' or offerProduct.Offer.OfferStatus.STATUS = 'Delivery Ongoing'
        then ifnull(offerProduct.Offer.Quotation.SubmittedBy, '')
        else ''
    end as SubmittedBy:String(500),
    offerProduct.Offer.Tender.TenderID as TenderID_Custom_SQL_Query,
    key offerProduct.Offer.OfferID as OfferID,
    offerProduct.Offer.WholesaleOffer as WholesaleOfferYN,
    offerProduct.Offer.RevisedOfferNo as RevisedOfferNo,
    offerProduct.Offer.ContinuationOfferNo as ContinuationOfferNo,
    case when offerProduct.Offer.OfferStatus.STATUS = 'Quotation Submitted' or offerProduct.Offer.OfferStatus.STATUS = 'Results Recorded' or offerProduct.Offer.OfferStatus.STATUS = 'Delivery Ongoing'
        then ifnull(offerProduct.Offer.SubmissionDate, '')
        else ''
    end as SubmissionDate:Date,
    offerProduct.Offer.NewOfferDueDate as NewOfferDueDate,
    offerProduct.Offer.ActiveOffer as ActiveOffer,
    offerProduct.Offer.Tender.CountryCode as CountryCode,
    offerProduct.Offer.Tender.Country.CountryName as CountryName,
    offerProduct.Offer.Tender.Country.ApprovalType as ApprovalType,
    offerProduct.Offer.Tender.Country.LocalCurrency as LocalCurrency,
    offerProduct.Offer.Tender.Country.CountryID as CountryID,
    offerProduct.Offer.Tender.Country.Region as Region,
    offerProduct.Offer.Tender.Institute.CountryCode as CountryCode_Institutes,
    offerProduct.Offer.Tender.InstituteID as InstituteID_Institutes,
    offerProduct.Offer.Tender.Institute.CustomerID as CustomerID,
    offerProduct.Offer.Tender.Institute.InstituteName as InstituteName,
    offerProduct.Offer.Tender.Institute.InstituteType as InstituteType,
    offerProduct.Offer.Tender.Institute.Address as Address,
    offerProduct.Offer.Tender.Institute.ContactNo as ContactNo,
    offerProduct.Offer.Tender.Institute.Fax as Fax,
    offerProduct.Offer.Tender.Institute.ContactPerson as ContactPerson,
    offerProduct.Offer.Tender.Institute.ActiveRecord as ActiveRecord,
    offerProduct.Offer.Tender.Institute.Comment as Comment,
    offerProduct.Offer.Tender.Institute.City as City,
    offerProduct.Offer.OfferID as OfferID_Custom_SQL_Query,
    key offerProduct.ProductCode as ProductCode,
    offerProduct.ActiveProduct as ActiveProduct:Double,
    offerProduct.AlternateOfferYN as AlternateOfferYN,
    offerProduct.ProductCode as ProductPackID,
    offerProduct.SKU.PRODUCTPACKNAME as ProductPackName,
    offerProduct.SKU.PRESENTATION as Presentation,
    offerProduct.SKU.CONCENTRATION as Concentration:String(500),
    offerProduct.SKU.UOM as UoM,
    offerProduct.SKU.PACKFACTOR as Packfactor,
    offerProduct.SKU.PCIName as PCIName:String(500),
    offerProduct.SKUCountry.ACTIVERECORD as ActiveRecord_ProductPacks,
    offerProduct.SKU.HLEVEL6_CODE as HLevel6_Code,
    offerProduct.Offer.PfiNumber.OfferID as OfferID_PFIOfferMap,
    offerProduct.Offer.PfiNumber.PFINo as PFINo,
    offerProduct.Offer.Quotation.OfferID as OfferID_Custom_SQL_Query_1,
    offerProduct.Offer.Quotation.DelayInSubmission as DelayInSubmission,
    offerProduct.Results.OfferID as OfferID_Custom_SQL_Query_2,
    offerProduct.Results.ProductCode as ProductCode_Custom_SQL_Query,
    offerProduct.Results.ErrorInSubmission as ErrorInSubmission,
    offerProduct.Results.Outcome as Outcome,
    offerProduct.Price.OfferID as OfferID_Custom_SQL_Query_3,
    offerProduct.Price.ProductCode as ProductCode_Custom_SQL_Query_1,
    offerProduct.Price.WholesalePrice as WholeSalePrice,
    offerProduct.Offer.Tender.Classification as Classification
}where offerProduct.Offer.Tender.Active = 1
and offerProduct.Offer.Active = 1
and offerProduct.Active = 1
and offerProduct.Offer.Tender.Country.Region = 'MEA';

entity TENDER_PRICING as select from TransactionalDataViews.OfferProductPlus offerProduct{
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