const cds = require('@sap/cds');
const jobScheduler = require("./jobs/scheduler");

module.exports = (srv) => {

    const {
        AdminData
    } = cds.entities("com.bayer.SXTENDER.AdminData");

    srv.after('UPDATE', 'SchedulerJobConfig', async (SchedulerJobConfig, req) => {
        const scheduler = await jobScheduler();
        const cronManager = scheduler.mercadoPublico.getCronManager();
        //update job
    });

    srv.on('SystemJobs', async (req) => {
        const scheduler = await jobScheduler();
        const cronManager = scheduler.mercadoPublico.getCronManager();
        console.log(cronManager.listCrons())
        let jobs = [];
        for (let job in cronManager.jobs){
            jobs.push({
                Name:job,
                JobTime:cronManager.jobs[job].cronTime.source,
                Status:cronManager.jobs[job].running ? 'Running' : 'Not running'
            });
            console.log(`${job} -  ${cronManager.jobs[job].cronTime.source} - ${(cronManager.jobs[job].running ? 'Running' : 'Not running')}`);
        } 
        return jobs;
    })
};