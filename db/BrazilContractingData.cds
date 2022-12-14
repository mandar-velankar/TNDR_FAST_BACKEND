namespace com.bayer.SXTENDER.BrazilContractingData;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { com.bayer.SXTENDER.MasterData } from './MasterData';
using { com.bayer.SXTENDER.AdminData } from './AdminData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';

entity Contracts : managed, cuid {
        TenderID                : String(50) not null;     
        OfferID                 : String(30) not null;     
        InstituteID             : Integer not null;         
        DistributorID           : Integer not null;         
        LicAtriID               : Integer;
        ContractNumber          : String(5000);
        ProcessNumber           : String(5000);
        ContractType            : String(5000);
        OBS                     : String(5000);
        StartDate               : Date;
        EndDate                 : Date;
        StatusID                : UUID;                                       
        //Associations
        Offer                   : Association to TransactionalData.PT_TMOFRS
                                    on Offer.OfferID = OfferID;
        OfferProducts           : Association to many TransactionalData.PT_TMOFPR
                                    on OfferProducts.OfferID = OfferID;
        Tender                  : Association to TransactionalData.PT_TMTEND
                                    on Tender.TenderID = TenderID;
        Institute               : Association to MasterData.PT_TMINST
                                    on Institute.InstituteID = InstituteID;
        Distributor             : Association to MasterData.PT_TMDIST
                                    on Distributor.DistributorID = DistributorID;
        Status                  : Association to AdminData.ContractStatus            
                                    on Status.ID = StatusID;
        ContractProducts        : Association to many ContractProducts on ContractProducts.Contract = $self;
        SalesOrders             : Association to many SalesOrders on SalesOrders.Contract = $self;
}

entity ContractProducts: managed, cuid {
        ProductPackID               : Integer not null;                             
        OfferID                     : String(30) not null;                          
        RequestedVolume             : Integer;
        //Associations
        OfferProduct                : Association to TransactionalData.PT_TMOFPR
                                        on OfferProduct.ProductCode = ProductPackID
                                        and OfferProduct.OfferID = OfferID;
        Contract                    : Association to Contracts;                        
}

entity SalesOrders: managed, cuid {
        TenderID                : String(50) not null;
        InstituteID             : Integer not null;                                 
        DistributorID           : Integer not null;                                 
        LicAtriID               : Integer;
        SalesOrderNumber        : String(20);
        ProcessNumber           : String(5000);
        CommitmentDate          : Date;
        CommitmentDeliveryDate  : Date;
        CommitmentCreationDate  : Date;
        StatusID                : UUID;                                             
        //Associations
        Contract                : Association to Contracts;
        Institute               : Association to MasterData.PT_TMINST
                                    on Institute.InstituteID = InstituteID;
        Distributor             : Association to MasterData.PT_TMDIST
                                    on Distributor.DistributorID = DistributorID;
        Status                  : Association to AdminData.SalesOrderStatus         
                                    on Status.ID = StatusID;
        Tender                  : Association to TransactionalData.PT_TMTEND
                                    on Tender.TenderID = TenderID;
        SalesOrderProducts      : Association to many SalesOrderProducts;
}

entity SalesOrderProducts: managed, cuid {
        ProductPackID           : Integer not null;
        OfferID                 : String(30) not null; 
        RequestedQty            : Double;
        //DeliveredQty            : Double;
        //Price                   : Double;
        RequestedDeliveryDate   : Date;
        //ActualDeliveryDate      : Date;
        //UoM                     : String(10);   
        //Associations
        SalesOrder              : Association to SalesOrders
                                     on SalesOrder.SalesOrderProducts = $self;
        OfferProduct            : Association to TransactionalData.PT_TMOFPR
                                     on OfferProduct.ProductCode = ProductPackID
                                     and OfferProduct.OfferID = OfferID;
}