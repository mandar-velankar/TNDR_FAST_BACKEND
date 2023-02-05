namespace com.bayer.SXTENDER.BrazilContractingViews;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';
using { com.bayer.SXTENDER.BrazilContractingData} from '../db/BrazilContractingData';

entity ContractsView as select from BrazilContractingData.Contracts as Contracts{
    key Contracts.ID,
        Contracts.TenderID,
        Contracts.OfferID,
        Contracts.InstituteID,
        Contracts.Institute.InstituteName,
        Contracts.DistributorID,
        Contracts.Distributor.DistributorName,
        Contracts.ContractNumber,
        Contracts.IbizProcessNumber,
        Contracts.ContractType,
        Contracts.OBS,
        Contracts.IbizContractID,
        Contracts.IbizContractNumber,
        Contracts.IbizContractSignDate,
        Contracts.StartDate,
        Contracts.EndDate,
        Contracts.Status.Status,
        sum(Contracts.ContractProducts.OfferProduct.PriceCondition.CommercialProposal * Contracts.ContractProducts.OfferProduct.RequestedVolume) as TotalValue:Decimal,
        Contracts.modifiedBy,
        Contracts.modifiedAt,
        Contracts.createdBy
}group by Contracts.ID,
        Contracts.TenderID,
        Contracts.OfferID,
        Contracts.InstituteID,
        Contracts.Institute.InstituteName,
        Contracts.DistributorID,
        Contracts.Distributor.DistributorName,
        Contracts.ContractNumber,
        Contracts.IbizProcessNumber,
        Contracts.ContractType,
        Contracts.OBS,
        Contracts.IbizContractID,
        Contracts.IbizContractNumber,
        Contracts.IbizContractSignDate,
        Contracts.StartDate,
        Contracts.EndDate,
        Contracts.Status.Status,
        Contracts.modifiedBy,
        Contracts.modifiedAt,
        Contracts.createdBy;

entity ContractProductsView as select from BrazilContractingData.ContractProducts as ContractProducts
left outer join BrazilContractingViews.AdhesionContractCompositionView as AdhesionContract 
    on ContractProducts.OfferID = AdhesionContract.OfferID
    and ContractProducts.ProductPackID = AdhesionContract.ProductPackID
    {
    key ContractProducts.ID,
        ContractProducts.Contract.ID as Contract_ID,
        ContractProducts.ProductPackID,                                          
        ContractProducts.OfferID,                                      
        ContractProducts.RequestedVolume,   
        ContractProducts.IbizItemType,
        ContractProducts.LotID,
        ContractProducts.ContractPrice,        
        ContractProducts.OfferProduct.RequestedVolume as OfferProductVolume,                                       
        ContractProducts.OfferProduct.UnitPerPack as UoM,
        ContractProducts.OfferProduct.SKU.PRODUCTPACKNAME as ProductPackName,
        ContractProducts.OfferProduct.PriceCondition.CommercialProposal as CommercialPrice,
        AdhesionContract.ExistingAdhesionContractsVolume,
        AdhesionContract.RemainingAdhesionContractsVolume,
};

entity AdhesionContractCompositionView as select from BrazilContractingData.ContractProducts as ContractProducts
{
    ContractProducts.ProductPackID,
    ContractProducts.OfferID,
    sum(ContractProducts.RequestedVolume) as ExistingAdhesionContractsVolume:Integer,
    (2 * ContractProducts.OfferProduct.RequestedVolume - sum(ContractProducts.RequestedVolume)) as RemainingAdhesionContractsVolume:Integer,
}where ContractProducts.Contract.ContractType = 'Adhesion Contract'
group by ContractProducts.ProductPackID,
    ContractProducts.OfferID,
    ContractProducts.OfferProduct.RequestedVolume;

entity SalesOrdersView as select from BrazilContractingData.SalesOrders as SalesOrders {
    key SalesOrders.ID,
        SalesOrders.Contract.ID as Contract_ID,
        SalesOrders.EmpenhoNumber,      
        SalesOrders.InstituteID,
        SalesOrders.Contract.Institute.InstituteName,                                      
        SalesOrders.DistributorID,
        SalesOrders.Contract.Distributor.DistributorName,                                      
        SalesOrders.EmpenhoID,             
        SalesOrders.SalesOrderNumber,       
        SalesOrders.IbizProcessNumber,          
        SalesOrders.CommitmentDate,         
        SalesOrders.CommitmentDeliveryDate, 
        SalesOrders.CommitmentCreationDate,
        SalesOrders.Status.Status,
        SalesOrders.createdAt
};

entity SalesOrderProductsView as select from BrazilContractingData.SalesOrderProducts as SalesOrderProducts {
    key SalesOrderProducts.ID,
        SalesOrderProducts.SalesOrder.ID as SalesOrder_ID,
        SalesOrderProducts.ProductPackID,           
        SalesOrderProducts.OfferID,                
        SalesOrderProducts.RequestedQty,           
        SalesOrderProducts.RequestedDeliveryDate,
        SalesOrderProducts.IbizEmpenhoProductID,
        SalesOrderProducts.IbizContractProductID,
        SalesOrderProducts.SalesOrderPrice,
        SalesOrderProducts.OfferProduct.SKU.PRODUCTPACKNAME as ProductPackName,
        SalesOrderProducts.OfferProduct.Deliveries.ActualDeliveredProductQty as ActualDeliveredProductQty,  
        SalesOrderProducts.OfferProduct.Deliveries.ActualDeliveryDate as ActualDeliveryDate,  
        SalesOrderProducts.OfferProduct.UnitPerPack as UoM,
        SalesOrderProducts.OfferProduct.PriceCondition.CommercialProposal as Price
};