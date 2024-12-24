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
    entity FASTCoreMaterial as projection on SAP.FASTCoreMaterial;

    function createBrazilContract() returns LargeString;

}