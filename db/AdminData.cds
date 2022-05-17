namespace com.bayer.SXTENDER.AdminData;

using {
    User,
    Country,
    managed,
    cuid
} from '@sap/cds/common';
using {com.bayer.SXTENDER.MasterData} from './MasterData';
using {com.bayer.SXTENDER.AdminDataViews} from './AdminDataViews';

//Autorization tables
//-------------------
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

//PDF templates
//-------------
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

//Mail Templates
//---------------
/*entity MailTemplateCountry {
    key CountryCode    : String(2);
    key TemplateId     : Integer;
}*/

entity MailTemplate {
    key CountryCode    : String(2);
    key Language       : String(2);
    key TemplateId     : String(100);
        MailTemplateFile      : Association to MailTemplateFile
                            on MailTemplateFile.templateId = TemplateId; //This can be found in OData
}

entity MailTemplateFile {
    key templateId     : String(100);
    title:String(100);
    filename:String(250);
    content   : LargeBinary @Core.MediaType: mediaType;//'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    mediaType:String @Core.IsMediaType;
}
// entity MandatoryTableFieldsCountry {
//     key CountryCode : String(2);
//     key View        : String(100);
//     key Model       : String(100);
//     key Field       : String(100);
//         Required    : Boolean;
// }

//Customizing tables
//------------------

//Customizing for: tables (sap.m.Table...)
entity CountryTablesCustomization {
    key CountryCode : String(2);
    key TableID     : String(100);
    key Column      : String(100);
        BindingPath : String(255);
        Visible     : Boolean;
        Required    : Boolean;
        Description : String(255);
}

//Customizing for: tabs
entity CountryTabsCustomization {
    key CountryCode : String(2);
    key TabID       : String(100);
        Visible     : Boolean;
}

//Customizing for: fragments
entity CountryFragmentsCustomization {
    key CountryCode   : String(2);
    key FragmentID    : String(100);
    key FragmentName  : String(100);
}


// Scheduler configuration
entity SchedulerApiConfig: cuid {
    Provider            : String; 
    Host                : String;
    BasePath            : String;
    Resource            : String;
    ResourcePath        : String;
    ProxyHost           : String;
    ProxyPort           : Integer;
    RequestDelay        : Integer;
    RequestMaxRetry     : Integer;
    AuthType            : String;
    CountryCode         : String;
    User                : Association to SchedulerApiConfigUsers;
    OAuth               : Association to SchedulerApiConfigOAuth;
}

// Scheduler basic auth configuration
entity SchedulerApiConfigUsers : cuid {
    ApiUser     : String;
    ApiPassword : String;
}

// Scheduler oauth configuration
entity SchedulerApiConfigOAuth : cuid {
    OAuthProvider : String;
    GrantType     : String;
    ClientID      : String;
    ClientSecret  : String;
}

entity SchedulerJobConfig: cuid , managed{
    JobName : String;
    JobTime : String;
}

// entity SchedulerJobs: cuid {
//     JobName          : String;
//     StartedAt        : Timestamp;
//     FinishedAt       : Timestamp;
//     Status           : String;
// }

entity SchedulerErrorLog: cuid {
    JobName          : String;
    JobDescription   : String;
    ErrorMessage     : String;
    ResourceURL      : String;
    ConsultationDate : Timestamp;
}

// Settings for the OfferValidity
entity NextDateSettings {
    CurrentMonth      : Integer;
    NextDay           : Integer;
    NextMonth         : Integer;
    NextYearDelta     : Integer;
}


// entity ExcelAttachment {
//     key template : String(100);
//     key OfferId : String(50);
//     content   : LargeBinary @Core.MediaType: mediaType;//'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
//     mediaType:String @Core.IsMediaType;
// }

// entity WordAttachment {
//     key template : String(100);
//     key OfferId : String(50);
//     key CountryCode    : String(2);
//     content   : LargeBinary @Core.MediaType: mediaType;//'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
//     mediaType:String @Core.IsMediaType;
// }

entity WordTemplateCountry {
    key countryCode    : String(2);
    key templateId     : Integer;
        WordTemplates      : Association to WordTemplate
                            on WordTemplates.templateId = templateId; //This can be found in OData
}

entity WordTemplate {
    key templateId     : Integer;
    name:String(100);
    filename:String(250);
    content   : LargeBinary @Core.MediaType: mediaType;//'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    mediaType:String @Core.IsMediaType;
}