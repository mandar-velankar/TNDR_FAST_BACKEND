const JobFactory = require('./JobFactory');
const CronJobManager = require('cron-job-manager');
const cds = require('@sap/cds');
const jobScheduler = require("./scheduler");

class JobManager {
    schedulerJobFunctions = ["Tenders","TenderResults","PurchaseOrders"];
    constructor() {
        this.cronManager = new CronJobManager();
    }
    getCronManager() {
        return this.cronManager;
    }
    jobExists(jobConfig){
        return this.cronManager.exists(jobConfig.JobName);
    }
    isJobSupported(jobConfig) {
        try {
            if (jobConfig.JobName.indexOf("MercadoPublco") > -1) {
                const job = jobConfig.JobName.split("-")[1];
                if(this.schedulerJobFunctions.findIndex(jobFunctions => jobFunctions === job)> -1) return true;
                else return false;
            }

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
            if (jobConfig.JobName.indexOf("MercadoPublco") > -1) this.addSchedulerJob(jobConfig);
            else this.addJob(jobConfig);
        }
    }
    addJob(jobConfig) {
        const job = JobFactory.create(jobConfig.JobName, jobConfig.JobTime);
        this.cronManager.add(job.getJobName(), job.getJobTime(), job.onTick.bind(job));
        this.cronManager.start(job.getJobName());
    }
    unregisterJob(jobConfig){
        this.cronManager.exists(jobConfig.JobName) && this.cronManager.deleteJob(jobConfig.JobName);
    }
    async addSchedulerJob(jobConfig) {
        const scheduler = await jobScheduler();
        const job = jobConfig.JobName.split("-")[1];
        if(this.schedulerJobFunctions.findIndex(jobFunctions => jobFunctions === job) > -1){
            this.cronManager.add(jobConfig.JobName, jobConfig.JobTime, scheduler.mercadoPublico[`fetch${job}`].bind(scheduler.mercadoPublico));
        }else{
            throw new Error('Job type in scheduler not supported');
        }
        this.cronManager.start(jobConfig.JobName);
    }
    stopJob(JobName) {
        if(JobName){
            this.cronManager.exists(JobName) && this.cronManager.stop(JobName);
        }else{
            this.cronManager.stopAll();
        }
    }
    startJob(JobName) {
        if(JobName){
            this.cronManager.exists(JobName) && this.cronManager.start(JobName);
        }else{
            this.cronManager.startAll();
        }
    }
    updateJob(jobConfig) {
        if (this.cronManager.exists(jobConfig.JobName)) {
            this.cronManager.update(jobConfig.JobName, jobConfig.JobTime);
        } else {
            this.registerJob(jobConfig);
        }
    }
    async registerJobs() {
        const db = await cds.connect.to('db'); // connect to database service
        const { SchedulerJobConfig } = db.entities("com.bayer.SXTENDER.AdminData");

        const jobsConfig = await cds.run(SELECT.from(SchedulerJobConfig));

        jobsConfig.forEach((jobConfig)=>this.registerJob(jobConfig));
    }
    getJobs() {
        let jobs = [];
        for (let job in this.cronManager.jobs) {
            jobs.push({
                Name: job,
                JobTime: this.cronManager.jobs[job].cronTime.source,
                Status: this.cronManager.jobs[job].running ? 'Running' : 'Not running'
            });
            //console.log(`${job} -  ${cronManager.jobs[job].cronTime.source} - ${(cronManager.jobs[job].running ? 'Running' : 'Not running')}`);
        }
        return jobs;
    }
}
if (!this.jobManager) this.jobManager = new JobManager();

module.exports = this.jobManager;