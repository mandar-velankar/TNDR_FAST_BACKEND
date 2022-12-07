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
        and Institute.CNPJ = Contracts.CNPJ
    inner join MasterData.PT_TMDIST as Distributor
        on Distributor.DistributorID = Contracts.DistributorID
        and Distributor.CNPJ = Contracts.DistCNPJ {
        Contracts.TenderID,
        Contracts.OfferID,
        Contracts.BidID,
        Contracts.InstituteID,
        Contracts.DistributorID,
        Contracts.LIC_ATRI_ID,
        Contracts.ContractNumber,
        Contracts.ProcessNumber,
        Contracts.ContractType,
        Contracts.OBS,
        Contracts.DistCNPJ,
        Contracts.CNPJ,
        Contracts.StartDate,
        Contracts.EndDate,
        ContractStatus.Status as ContractStatus,
        Contracts.ContractProducts
};