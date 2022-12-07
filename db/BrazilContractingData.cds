namespace com.bayer.SXTENDER.BrazilContractingData;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';

entity Contracts : managed, cuid {
        TenderID                : String(50);
        OfferID                 : String(50);
        BidID                   : String(20);
        InstituteID             : String(20);
        DistributorID           : String(20);
        LIC_ATRI_ID             : String(100);
        ContractNumber          : String(20);
        ProcessNumber           : String(20);
        Type                    : String(20);
        OBS                     : String(20);
        DistCNPJ                : String(20);
        CNPJ                    : String(20);
        StartDate               : DateTime;
        EndDate                 : DateTime;
        StatusID                : String(20);
        //Associations
        Offer                   : Association to TransactionalData.PT_TMOFRS
                                    on Offer.OfferID = OfferID;
        OfferProducts           : Association to many TransactionalData.PT_TMOFPR
                                    on OfferProducts.OfferID = OfferID;
        Tender                  : Association to TransactionalData.PT_TMTEND
                                    on Tender.TenderID = TenderID 
                                    and Tender.IbizID  = BidID;
        Institute               : Association to MasterData.PT_TMINST
                                    on Institute.InstituteID = InstituteID
                                    and Institute.CNPJ = CNPJ;
        Distributor             : Association to MasterData.PT_TMDIST
                                    on Distributor.DistributorID = DistributorID
                                    and Distributor.CNPJ = DistCNPJ;
        Status                  : Association to AdminData.ContractStatus
                                    on Status.ID = StatusID;
        ContractProducts        : Association to many ContractProducts;
        SalesOrders             : Association to many SalesOrders;
}

entity ContractProducts: managed, cuid {
    ProductPackID               : String(100);
    OfferID                     : String(50);
    WorkflowProductID           : String(50);
    ContractVolume              : Double;
    //Associations
    Product                     : Association to TransactionalData.PT_TMOFPR
                                    on Product.ProductCode = ProductPackID
                                    and Product.OfferID = OfferID
                                    and Product.WorkflowProductID = WorkflowProductID;
    Contract                    : Association to Contracts
                                    on Contract.ContractProducts = $self;
}

entity SalesOrders: managed, cuid {
    TenderID                : String(50);
    BidID                   : String(20);
    InstituteID             : String(20);
    DistributorID           : String(20);
    LIC_ATRI_ID             : String(100);
    SalesOrderNumber        : String(20);
    ProcessNumber           : String(20);
    DistCNPJ                : String(20);
    CNPJ                    : String(20);
    CommitmentDate          : DateTime;
    CommitmentDeliveryDate  : DateTime;
    CommitmentCreationDate  : DateTime;
    StatusID                : UUID;
    //Associations
    Contract                : Association to Contracts 
                                on Contract.SalesOrders = $self;
    Institute               : Association to MasterData.PT_TMINST
                                on Institute.InstituteID = InstituteID
                                and Institute.CNPJ = CNPJ;
    Distributor             : Association to MasterData.PT_TMDIST
                                on Distributor.DistributorID = DistributorID
                                and Distributor.CNPJ = DistCNPJ;
    Status                  : Association to AdminData.SalesOrderStatus
                                on Status.ID = StatusID;
    SalesOrderProducts      : Association to many SalesOrderProducts;
}

entity SalesOrderProducts: managed, cuid {
    ProductPackID           : String(100);
    Quantity                : Double;
    Price                   : Double;
    //Associations
    SalesOrder              : Association to SalesOrders
                                on SalesOrder.SalesOrderProducts = $self;
}