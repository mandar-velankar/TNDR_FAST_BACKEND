const cds = require('@sap/cds');
const BaseJob = require('../BaseJob');

module.exports = class processTenderResults extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
        this.jobName = jobName.toUpperCase();
    }


    /**
    * Triggered when job has started
    */
    //override
    async onTick() {
        console.log(`JOB (${this.jobName }): Processing Ibiz TenderResults ...`);
        const start = new Date().getTime();
        
        this.db = await cds.connect.to('db');
        const tx = this.db.tx();

        try {
            // Fetch data
            const tenderResults = await this.getTenderResults(tx);

            const tenderResultParentIDs = tenderResults.map(trs => trs.ID);
            const tenderResultItems = await this.getTenderResultItems(tx, tenderResultParentIDs);
            const tenderResultDocs = await this.getTenderResultDocs(tx, tenderResultParentIDs); 

            // Process data
            await this.processTenderResults(tx, tenderResults, tenderResultItems, tenderResultDocs);

            // Commit All
            await tx.commit();
            console.log(`JOB (${this.jobName }): Processing Ibiz TenderResults successfully completed.`);
            const end = new Date().getTime();
            const time = end - start;
            console.log(`JOB (${this.jobName }): SUCCESS --> Execution time: ${time} ms`);

        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Processing of Ibiz TenderResults failed.`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }

};