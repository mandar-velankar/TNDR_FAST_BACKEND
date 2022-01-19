using {com.bayer.SXTENDER.AdminData} from '../db/AdminData';
using {
    User,
    Country,
    managed,
    cuid
} from '@sap/cds/common';

service SchedulerService @(path : 'scheduler')@(requires : ['authenticated-user']) {
    type Job {
        Name  : String;
        JobTime: String;
        Status: String;
    };
    //SchedulerJobConfig
    entity SchedulerJobConfig as projection on AdminData.SchedulerJobConfig;
    function SystemJobs() returns array of Job;
    //voorzie start en stop van all jobs
    //voorzie start en stop per job
}
