using { com.bayer.SXTENDER.BankGuaranteeData } from '../db/BankGuaranteeData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';

service BankGuaranteeService @(path: 'bankguarantee') @(requires:['f_tndr_cag_admin','f_tndr_cag_bankguarantee_user','f_tndr_cag_technical_user','authenticated-user']){
    entity BankGuarantees as projection on BankGuaranteeData.BankGuarantees;
    entity PT_TMTEND as projection on TransactionalData.PT_TMTEND {
        * ,
    };
}