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
    entity GTIN as projection on SAP.GTIN;
    entity QtyCharacteristic as projection on SAP.QtyCharacteristic;
    entity MatlClassification as projection on SAP.MatlClassification;
    entity IntlTrade as projection on SAP.IntlTrade;
    entity VariantConfig as projection on SAP.VariantConfig;
    entity TxtColl as projection on SAP.TxtColl;
    entity SalesSpec as projection on SAP.SalesSpec;
    entity ValuatnArea as projection on SAP.ValuatnArea;
    entity WHS as projection on SAP.WHS;
    entity PrdBOM as projection on SAP.PrdBOM;
    entity EWMWHS as projection on SAP.EWMWHS;
    entity SalesSpecTxt as projection on SAP.SalesSpecTxt;
    entity PrdPlant as projection on SAP.PrdPlant;
    entity PrdPlntTxt as projection on SAP.PrdPlntTxt;

    function createBrazilContract() returns LargeString;

}