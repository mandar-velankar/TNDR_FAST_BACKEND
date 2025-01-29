namespace com.bayer.SXTENDER.AdminDataViews;

using { User, Country, managed } from '@sap/cds/common';
using { com.bayer.SXTENDER.AdminData } from './AdminData';

entity Users as select from AdminData.PT_TMUSER as User{
    User.UserName as USER_NAME,
    key User.UserID as USER_ID,
    User.CWID as CWID,
    0 as NEXT_TENDER_NO:Integer,
    User.toUserCountries,
    User.UserEmail as UserEmail,
    User.Role as ROLE
};

entity UserCountries as select from AdminData.PT_TMUSERCTRY as UserCountries{
	key UserCountries.User.UserID as USER_ID,
    key UserCountries.CountryCode as COUNTRY_CODE,
    key UserCountries.Application,
    UserCountries.Country.CountryName as COUNTRY_NAME,
}where UserCountries.ActiveRecord = 'Yes';
