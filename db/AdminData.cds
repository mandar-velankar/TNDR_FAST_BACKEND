namespace com.bayer.SXTENDER.AdminData;

using {
    User,
    Country,
    managed
} from '@sap/cds/common';
using {com.bayer.SXTENDER.MasterData} from './MasterData';
using {com.bayer.SXTENDER.AdminDataViews} from './AdminDataViews';

entity CONDITIONAL_ACCESS {
    key Id               : Integer not null;
        CWIDs_COGS       : String(5000);
        CWIDs_Price      : String(5000);
        CWIDs_Volume     : String(5000);
        CWIDs_Penalty    : String(5000);
        CWIDs_MarketData : String(5000);
}

entity PT_TMUSER {
        ToolIdentity    : String(20);
        ToolID          : Integer;
    key UserID          : String(50);
        UserName        : String(100);
        LoginTime       : String(255);
        CWID            : String(12);
        UserEmail       : String(255);
        //Associations
        Countries       : Association to many PT_TMUSERCTRY
                              on Countries.User = $self;
        toUserCountries : Association to many AdminDataViews.UserCountries
                              on toUserCountries.USER_ID = UserID
}

entity PT_TMUSERCTRY {
    key CWID         : String(5);
    key CountryCode  : String(255);
        ActiveRecord : String(3);
        //Associations
        User         : Association to PT_TMUSER
                           on User.CWID = CWID; //This cannot be found in OData
        Country      : Association to MasterData.PT_TMCTRY
                           on Country.CountryCode = CountryCode; //This can be found in OData
}

entity PT_TMUSERCTRYN {
    key CountryCode : String(2);
        CWIDs       : String(500);
}

entity TemplateCountry {
    key CountryCode    : String(2);
    key Classification : String(50); //Added Classification (db#2)
        TemplateId     : Integer;
}

entity Template {
    key TemplateId     : Integer;
        Template       : LargeString;
        HeaderTemplate : LargeString;
        HeaderHeight   : String;
        FooterTemplate : LargeString;
        FooterHeight   : String;
        Format         : String(2);
        Orientation    : String;
        Border         : String;
}

// entity MandatoryTableFieldsCountry {
//     key CountryCode : String(2);
//     key View        : String(100);
//     key Model       : String(100);
//     key Field       : String(100);
//         Required    : Boolean;
// }

entity CountryTablesCustomization {
    key CountryCode : String(2);
    key TableID     : String(100);
    key Column      : String(100);
        BindingPath : String(255);
        Visible     : Boolean;
        Required    : Boolean;
}

entity CountryTabsCustomization {
    key CountryCode : String(2);
    key TabID       : String(100);
        Visible     : Boolean;
}

entity CountryFragmentsCustomization {
    key CountryCode : String(2);
    key FragmentID  : String(100);
        Visible     : Boolean;
}
