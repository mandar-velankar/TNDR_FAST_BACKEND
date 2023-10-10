using {
    com.bayer.SXTENDER.MasterData,
    sap.common
} from '../db/MasterData';
using {com.bayer.SXTENDER.TransactionalData} from '../db/TransactionalData';
using {com.bayer.SXTENDER.MasterDataViews} from '../db/MasterDataViews';
using {com.bayer.SXTENDER.ExternalDataViews} from '../db/ExternalDataViews';
using {com.bayer.SXTENDER.AdminData} from '../db/AdminData';
using {
    User,
    Country,
    managed,
    cuid
} from '@sap/cds/common';

service UITemplateService @(path : 'uit')@(requires : [
    'authenticated-user',
    'f_tndr_cag_admin',
    'f_tndr_cag_technical_user'
]) {

    entity InstitutesView as projection on MasterData.PT_TMINST {
        *,
        CustomerID as CustomerID: String
    };
    entity ClassifiactionsView as projection on MasterData.MASTER_COUNTRY_CLASSIFICATION as classification {
        *,
        classification.COUNTRY_CODE as CountryCode: String(2)
    };
    entity CountryInstituteTypeView as projection on MasterData.MASTER_COUNTRY_CHANNELS as instType {
        *,
        instType.ChannelCountry as CountryCode: String(2)
    };
    entity TenderChannel as projection on MasterData.TenderChannel;
    entity StandardDivisions as projection on MasterData.StandardDivisions {
        *,
        DivisionName as Division
    };
    entity MasterDistributors @readonly @(cds.redirection.target:false) as projection on ExternalDataViews.MasterDistributors;
    entity MasterCountryCurrencies as select from MasterData.CountryCurrency;
    
    entity DistinctProductScopeView as select from MasterData.PT_TMCTPRDPCK {
        COUNTRYCODE as CountryCode,
        key ProductScope
    } group by ProductScope, COUNTRYCODE;

    entity MasterCountryOutComes as select from MasterData.MASTER_COUNTRY_OUTCOMES;
    entity MasterOutComeReasons as select from MasterData.PT_TMOUTRS;
    entity CountryPacks as projection on MasterData.PT_TMCTPRDPCK;
    entity Country as projection on MasterData.PT_TMCTRY {
        *,
        CountryPacks: redirected to CountryPacks
    };
    entity Users as projection on AdminData.PT_TMUSER;

    entity UsersPerCountry @readonly @(cds.redirection.target:false) as projection on AdminData.PT_TMUSERCTRY {
        *,
        User.UserName as UserName,
        Country: redirected to Country,
        User: redirected to Users
    };
    entity UsersHavingOneCountry @(cds.redirection.target:false) as select from UsersPerCountry {
        key CWID,
        max(CountryCode) as CountryCode: String,
        count(CountryCode) as numberOfCountries: Integer,
        max(UserName) as UserName: String
    }
    group by CWID
    having count(CountryCode) = 1;

    entity CountryRegionsTableView as projection on MasterData.CountryRegions;
    entity CountryLegalEntitySignatories as projection on MasterData.COUNTRY_LEGAL_ENTITY_SIGNATORIES as signatory {
        *,
        signatory.COUNTRY_CODE as CountryCode
    };
}