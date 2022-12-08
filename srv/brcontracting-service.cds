using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.BrazilContractingData } from '../db/BrazilContractingData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/MasterDataViews';
using { com.bayer.SXTENDER.BrazilContractingViews } from '../db/BrazilContractingViews';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service BrazilContractingService @(path: 'brazilcontracting') @(requires:['f_tndr_cag_admin','f_tndr_cag_brcontracting_user','f_tndr_cag_technical_user','authenticated-user']){
    entity Contracts as projection on BrazilContractingData.Contracts;
    entity ContractProducts as projection on BrazilContractingData.ContractProducts;
    entity SalesOrders as projection on BrazilContractingData.SalesOrders;
    entity SalesOrderProducts as projection on BrazilContractingData.SalesOrderProducts;
    entity PT_TMINST as projection on MasterData.PT_TMINST;
    entity PT_TMDIST as projection on MasterData.PT_TMDIST;
    entity PT_TMCTPRDPCK as projection on MasterData.PT_TMCTPRDPCK;
    entity PT_TMTEND @(cds.redirection.target:true) as projection on TransactionalData.PT_TMTEND;
    entity PT_TMPRDPCK as projection on MasterData.PT_TMPRDPCK;
    entity ContractsView as projection on BrazilContractingViews.ContractsView;
}