using { com.bayer.SXTENDER.BankGuaranteeData } from '../db/BankGuaranteeData';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.PriceAgreementDataViews} from '../db/PriceAgreementDataViews';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';


service BankGuaranteeService @(path: 'bankguarantee') @(requires:['f_tndr_cag_admin','f_tndr_cag_bankguarantees_user','f_tndr_cag_technical_user','authenticated-user']){
    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    entity BankGuarantees as projection on BankGuaranteeData.BankGuarantees;
    entity PT_TMTEND as projection on TransactionalData.PT_TMTEND {
        * ,
    };
    entity PriceAgreement as projection on PriceAgreementDataViews.PriceAgreementExpiryDate{
        * ,
    };
    //Countries where user has accesss to
    entity UserCountry @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
        Country: redirected to Country,
        User: redirected to Users,
    };


    //Countries where user has accesss to
    entity UserCountry @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
        Country: redirected to Country,
        User: redirected to Users,
    };

}