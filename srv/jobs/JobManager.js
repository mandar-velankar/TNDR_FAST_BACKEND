const JobFactory = require('./JobFactory');
const CronJobManager = require('cron-job-manager');
const cds = require('@sap/cds');
const jobScheduler = require("./scheduler");

class JobManager {
    constructor() {
        this.cronManager = new CronJobManager();
    }
    getCronManager() {
        return this.cronManager;
    }
    isJobSupported(jobConfig) {
        try {
            JobFactory.create(jobConfig.JobName, jobConfig.JobTime);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    registerJob(jobConfig) {
        this.cronManager.exists(jobConfig.JobName) && console.log(`${jobConfig.JobName} already exists`);
        !jobConfig.JobTime && console.log(`Job time is empty: ${jobConfig.JobTime}`);

        if (jobConfig.JobTime && !this.cronManager.exists(jobConfig.JobName)) {
            console.log(`Adding Job : ${jobConfig.JobName} to manager`);
            if(jobConfig.JobName.indexOf("MercadoPublco") > -1) this.addSchedulerJob(jobConfig);
            else this.addJob(jobConfig);
        }
    }
    addJob(jobConfig){
        const job = JobFactory.create(jobConfig.JobName, jobConfig.JobTime);
        this.cronManager.add(job.getJobName(), job.getJobTime(), job.onTick.bind(job));
        this.cronManager.start(job.getJobName());
    }
    async addSchedulerJob(jobConfig){
        const scheduler = await jobScheduler();
        const job = jobConfig.split("-")[1];
        switch (job) {
            case "TendersJob":
                this.cronManager.add(jobConfig.JobName, jobConfig.JobTime, scheduler.mercadoPublico.fetchTenders.bind(scheduler.mercadoPublico));
                this.cronManager.start(jobConfig.JobName);
                break;
        
            default:
                break;
        }
    }
    stopJobs() {
        this.cronManager.stopAll();
    }
    startJobs() {
        this.cronManager.startAll();
    }
    updateJob(jobName, jobTime) {
        if (this.cronManager.exists(jobName)) {
            this.cronManager.update(jobName, jobTime);
        } else {
            this.registerJob({ JobName: jobName, JobTime: jobTime });
        }
    }
    async registerJobs() {
        const db = await cds.connect.to('db'); // connect to database service
        const { SchedulerJobConfig } = db.entities("com.bayer.SXTENDER.AdminData");

        const jobsConfig = await cds.run(SELECT.from(SchedulerJobConfig));

        jobsConfig.forEach(this.registerJob);
    }
    getJobs() {
        let jobs = [];
        for (let job in this.cronManager.jobs) {
            jobs.push({
                Name: job,
                JobTime: cronManager.jobs[job].cronTime.source,
                Status: cronManager.jobs[job].running ? 'Running' : 'Not running'
            });
            //console.log(`${job} -  ${cronManager.jobs[job].cronTime.source} - ${(cronManager.jobs[job].running ? 'Running' : 'Not running')}`);
        }
        return jobs;
    }
}
if(!this.jobManager)this.jobManager = new JobManager();

module.exports = this.jobManager;