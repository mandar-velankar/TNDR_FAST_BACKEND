namespace com.bayer.SXTENDER.BrazilContractingViews;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';
using { com.bayer.SXTENDER.BrazilContractingData} from '../db/BrazilContractingData';

entity ContractsView as select from BrazilContractingData.Contracts as Contracts
    inner join AdminData.ContractStatus as ContractStatus 
        on ContractStatus.ID = Contracts.StatusID
    inner join MasterData.PT_TMINST as Institute 
        on Institute.InstituteID = Contracts.InstituteID
    inner join MasterData.PT_TMDIST as Distributor
        on Distributor.DistributorID = Contracts.DistributorID
    inner join TransactionalData.PT_TMTEND as Tender
        on  Tender.TenderID = Contracts.TenderID 
    inner join TransactionalData.PT_TMOFRS as Offer
        on Offer.OfferID = Contracts.OfferID {
        Contracts.TenderID,
        Contracts.OfferID,
        Contracts.InstituteID,
        Contracts.DistributorID,
        Contracts.LicAtriID,
        Contracts.ContractNumber,
        Contracts.ProcessNumber,
        Contracts.ContractType,
        Contracts.OBS,
        Contracts.StartDate,
        Contracts.EndDate,
        ContractStatus.Status as ContractStatus,
        Contracts.ContractProducts
};