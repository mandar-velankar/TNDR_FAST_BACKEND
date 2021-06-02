using { com.bayer.SXTENDER.IntegrationDataConversion } from '../db/IntegrationDataConversion';
using { com.bayer.SXTENDER.IntegrationData } from '../db/IntegrationData';
//using { com.bayer.SXTENDER.MasterData } from '../db/./MasterData';
//using { com.bayer.SXTENDER.MasterDataViews } from '../db/./MasterDataViews';
//using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
//using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';
//using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service SalesOpportunityService @(path: 'salesopportunity') @(requires:['f_tndr_cag_admin','f_tndr_cag_salesopportunity_user','f_tndr_cag_technical_user','authenticated-user']){
    entity Buyers as projection on IntegrationDataConversion.PublicMarketBuyers;
    entity Products as projection on IntegrationDataConversion.PublicMarketProducts;

    entity PublicMarketTenders as projection on IntegrationDataConversion.PublicMarketTenders{
        *,
        Comprador: redirected to Buyers,
        Items: redirected to Products
    };
}