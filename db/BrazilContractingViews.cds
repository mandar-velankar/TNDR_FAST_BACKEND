namespace com.bayer.SXTENDER.BrazilContractingViews;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';
using { com.bayer.SXTENDER.BrazilContractingData} from '../db/BrazilContractingData';

entity ContractsView as select from BrazilContractingData.Contracts as Contracts{
        Contracts.TenderID,
        Contracts.OfferID,
        Contracts.InstituteID,
        Contracts.Institute.InstituteName,
        Contracts.DistributorID,
        Contracts.Distributor.DistributorName,
        Contracts.LicAtriID,
        Contracts.ContractNumber,
        Contracts.ProcessNumber,
        Contracts.ContractType,
        Contracts.OBS,
        Contracts.StartDate,
        Contracts.EndDate,
        Contracts.Status.Status,
        sum(Contracts.ContractProducts.OfferProduct.PriceCondition.CommercialProposal) as TotalValue:Double,
        Contracts.modifiedBy,
        Contracts.modifiedAt
}group by Contracts.TenderID,
        Contracts.OfferID,
        Contracts.InstituteID,
        Contracts.Institute.InstituteName,
        Contracts.DistributorID,
        Contracts.Distributor.DistributorName,
        Contracts.LicAtriID,
        Contracts.ContractNumber,
        Contracts.ProcessNumber,
        Contracts.ContractType,
        Contracts.OBS,
        Contracts.StartDate,
        Contracts.EndDate,
        Contracts.Status.Status,
        Contracts.modifiedBy,
        Contracts.modifiedAt;

entity ContractProductsView as select from BrazilContractingData.ContractProducts as ContractProducts {
        ContractProducts.ProductPackID,                                          
        ContractProducts.OfferID,                                      
        ContractProducts.RequestedVolume,             
        ContractProducts.OfferProduct.RequestedVolume as OfferProductVolume,                                       
        ContractProducts.OfferProduct.UnitPerPack as UoM,
        ContractProducts.OfferProduct.SKU.PRODUCTPACKNAME as ProductPackName,
        ContractProducts.OfferProduct.PriceCondition.CommercialProposal as CommercialPrice
};    
entity SalesOrderView as select from BrazilContractingData.SalesOrders as SalesOrders {
        SalesOrders.TenderID,      
        SalesOrders.InstituteID,                                       
        SalesOrders.DistributorID,                                        
        SalesOrders.LicAtriID,             
        SalesOrders.SalesOrderNumber,       
        SalesOrders.ProcessNumber,          
        SalesOrders.CommitmentDate,         
        SalesOrders.CommitmentDeliveryDate, 
        SalesOrders.CommitmentCreationDate,
        SalesOrders.Status.Status 
};

entity SalesOrderProductsView as select from BrazilContractingData.SalesOrderProducts as SalesOrderProducts {
        SalesOrderProducts.ProductPackID,           
        SalesOrderProducts.OfferID,                
        SalesOrderProducts.RequestedQty,           
        SalesOrderProducts.RequestedDeliveryDate,
        SalesOrderProducts.OfferProduct.SKU.PRODUCTPACKNAME as ProductPackName,
        SalesOrderProducts.OfferProduct.Deliveries.ActualDeliveredProductQty as ActualDeliveredProductQty,  
        SalesOrderProducts.OfferProduct.Deliveries.ActualDeliveryDate as ActualDeliveryDate,  
        SalesOrderProducts.OfferProduct.UnitPerPack as UoM,
        SalesOrderProducts.OfferProduct.PriceCondition.CommercialProposal as Price
};