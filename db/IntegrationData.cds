namespace com.bayer.SXTENDER.IntegrationData;

using { User, Country, cuid, managed } from '@sap/cds/common';


entity Person: cuid, managed {
    UserName:String(50);
	FirstName:String(50);
    LastName:String(50);
    Gender: String(60);
};