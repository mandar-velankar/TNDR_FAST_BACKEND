namespace com.bayer.SXTENDER.BankGuaranteeData;

using {
    User,
    Country,
    managed, 
    cuid
} from '@sap/cds/common';
using {com.bayer.SXTENDER.TransactionalData} from './TransactionalData';
using {com.bayer.SXTENDER.AdminDataViews} from './AdminDataViews';

entity BankGuarantees: cuid, managed {
    TenderID: String;
    CountryCode: String;
    Reference: String;
    IssueDate: DateTime;
    ClosingDate: DateTime;
    Status:  String;
    Type: String;
    GuaranteedAmount: Double;
    Comment: String;
    Tender: association to TransactionalData.PT_TMTEND on Tender.TenderID = TenderID;
}