namespace com.bayer.SXTENDER.CpiService;

using { com.bayer.SXTENDER.MasterData.SAP } from '../db/SAP';


service CpiService @(path: 'cpi') @(requires:['f_tndr_cag_admin','f_tndr_cag_cpi_user']){

    entity BrazilMaterials as projection on SAP.BrazilMaterials;
    entity BrazilCustomers as projection on SAP.BrazilCustomers;
    entity BrazilPrices as projection on SAP.BrazilPrices;
    entity BrazilEmpenho as projection on SAP.BrazilEmpenho;
    entity BrazilTaxes as projection on SAP.BrazilTaxes;
    entity BrazilDeliveriesHeader as projection on SAP.BrazilDeliveriesHeader;
    entity BrazilDeliveriesItems as projection on SAP.BrazilDeliveriesItems;
    entity BrazilExemptions as projection on SAP.BrazilExemptions;
    entity IbizQps as projection on SAP.IbizQps;
    entity IbizEmpenhos as projection on SAP.IbizEmpenhos;
    entity IbizResultados as projection on SAP.IbizResultados;
    entity IbizContratos as projection on SAP.IbizContratos;
    entity ItalyMaterials as projection on SAP.ItalyMaterials;
    entity ItalyCustomers as projection on SAP.ItalyCustomers;
    entity ItalyDeliveries as projection on SAP.ItalyDeliveries;
    entity SpainMaterials as projection on SAP.SpainMaterials;
    entity SpainCustomers as projection on SAP.SpainCustomers;
    entity SpainDeliveries as projection on SAP.SpainDeliveries;
    entity SpainRappel as projection on SAP.SpainRappel;
    entity FASTCoreProduct as projection on SAP.FASTCoreProduct;
    entity SalesSpecification as projection on SAP.SalesSpecification;
    entity SubscriptionProductSalesData as projection on SAP.SubscriptionProductSalesData;
    entity ValuationArea as projection on SAP.ValuationArea;
    entity ValuationAccount as projection on SAP.ValuationAccount;
    entity LedgerAccount as projection on SAP.LedgerAccount;
    entity FuturePrice as projection on SAP.FuturePrice;
    entity ValuationCosting as projection on SAP.ValuationCosting;
    entity Plant as projection on SAP.Plant;
    entity Costing as projection on SAP.Costing;
    entity SupplyPlanning as projection on SAP.SupplyPlanning;
    entity Sales as projection on SAP.Sales;
    entity QualityManagement as projection on SAP.QualityManagement;
    entity Forecasting as projection on SAP.Forecasting;
    entity InternationalTrade as projection on SAP.InternationalTrade;
    entity Storage as projection on SAP.Storage;
    entity StorageLocation as projection on SAP.StorageLocation;
    entity Purchasing as projection on SAP.Purchasing;
    entity WorkScheduling as projection on SAP.WorkScheduling;
    entity PlantSCMAdvancedPlanning as projection on SAP.PlantSCMAdvancedPlanning;
    entity Planning as projection on SAP.Planning;
    entity ForecastParameters as projection on SAP.ForecastParameters;
    entity ProductionResourceTool as projection on SAP.ProductionResourceTool;
    entity PlantSCMDemandPenalty as projection on SAP.PlantSCMDemandPenalty;
    entity PlanteSPPProduct as projection on SAP.PlanteSPPProduct;
    entity eSPPLocProd as projection on SAP.eSPPLocProd;
    entity FASTCoreBusinessPartner as projection on SAP.FASTCoreBusinessPartner{
        *,
        Customer,
        Customer.SaleSalesAndDistributionBlocks.ID,
        Customer.SaleSalesAndDistributionBlocks.OrderBlockingReasonCode,
        Customer.SaleSalesAndDistributionBlocks.BillingBlockingReasonCode,
        Customer.SaleSalesAndDistributionBlocks.DeliveryBlockingReasonCode,
        Customer.SaleSalesAndDistributionBlocks.SalesSupportBlockedIndicator
    };
    entity SaleSalesAndDistributionBlocks as projection on SAP.SaleSalesAndDistributionBlocks;

    function createBrazilContract() returns LargeString;

}