namespace com.bayer.SXTENDER.SalesOpportunityData;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';
using { com.bayer.SXTENDER.IntegrationData } from './IntegrationDataConversion';

entity PublicMarketTenders as projection on IntegrationData.PublicMarketTenders;
entity PublicMarketBuyers as projection on IntegrationData.PublicMarketBuyers;
entity PublicMarketProducts as projection on IntegrationData.PublicMarketProducts;