namespace com.bayer.SXTENDER.CpiService;

using { com.bayer.SXTENDER.MasterData.SAP } from '../db/SAP';


service CpiService @(path: 'cpi') @(requires:['f_tndr_cag_admin','f_tndr_cag_cpi_user']){

    entity BrazilMaterials as projection on SAP.BrazilMaterials;
    entity BrazilCustomers as projection on SAP.BrazilCustomers;
    entity BrazilPrices as projection on SAP.BrazilPrices;
    entity BrazilEmpenho as projection on SAP.BrazilEmpenho;
    entity ItalyMaterials as projection on SAP.ItalyMaterials;
    entity ItalyCustomers as projection on SAP.ItalyCustomers;
    entity SpainMaterials as projection on SAP.SpainMaterials;
    entity SpainCustomers as projection on SAP.SpainCustomers;

}