namespace com.bayer.SXTENDER.ContractService;

using { com.bayer.SXTENDER.ContractsAppData } from '../db/ContractsAppData';
using { com.bayer.SXTENDER.MasterData } from '../db/./MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/./MasterDataViews';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service SalesOpportunityService @(path: 'soa') @(requires:['f_tndr_cag_admin','f_tndr_cag_salesopportunity_user','f_tndr_cag_technical_user']){

}