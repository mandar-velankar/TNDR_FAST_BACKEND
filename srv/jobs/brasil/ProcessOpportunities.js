const cds = require('@sap/cds');
const BaseJob = require('../BaseJob');

module.exports = class processOpportunities extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
        this.jobName = jobName.toUpperCase();
    }

 /**
    * Triggered when job has started
    */
    //override
    async onTick() {
        console.log(`JOB (${this.jobName }): Processing Ibiz Opportunities ...`);
        const start = new Date().getTime();
        try {
            this.db = await cds.connect.to('db');
            const tx = this.db.tx();

            // Fetch data
            const opportunities = await this.getOpportunities(tx);
            const opportunitiesItems = await this.getOpportunitiesItems(tx);
            const opportunitiesDocs = await this.getOpportunitiesDocs(tx);
            const directIbizOpportunities = opportunities.filter(direct => direct.NU_DIRETO_INDIRETO === 0);
            const directIbizOpportunityItems = opportunitiesItems.filter(parent => parent.parent_ID === directIbizOpportunities.ID);
            const indirectIbizOpportunities = opportunities.filter(indirect => indirect.NU_DIRETO_INDIRETO === 1);
            const indirectIbizOpportunityItems = opportunitiesItems.filter(parent => parent.parent_ID === indirectIbizOpportunities.ID);

            // Process data
            await this.processDirectIbizOpportunities(directIbizOpportunities,directIbizOpportunityItems,tx);
            await this.processIndirectIbizOpportunities(indirectIbizOpportunities,indirectIbizOpportunityItems,tx);

            // Commit All
            await tx.commit();
            console.log(`JOB (${this.jobName }): Processing Ibiz Opportunities successfully completed.`);
            const end = new Date().getTime();
            const time = end - start;
            console.log(`JOB (${this.jobName }): SUCCESS --> Execution time: ${time} ms`);

        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Processing of Ibiz Opportunities failed.`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }

      /**
     * This method fetches all the Ibiz opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS
     * @returns - A list of direct and indirect Ibiz opportunities
     */
       async getOpportunities(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS ...`);
            const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizQps));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz Opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS failed`);
            console.error(error);
            throw error;
        }
    }

    /**
     * This method fetches all the Ibiz opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS
     * @returns - A list of Ibiz opportunity items
     */
     async getOpportunitiesItems(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS ...`);
            const { IbizCcsQpsItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizCcsQpsItems));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz Opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS failed`);
            console.error(error);
            throw error;
        }
    }

     /**
     * This method fetches all the Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZDOCS
     * @returns - A list of Ibiz Documents
     */
      async getOpportunitiesDocs(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs ...`);
            const { IbizDocs } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizDocs).where({'Qps_ID':{"!=": null}}));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs failed`);
            console.error(error);
            throw error;
        }
    }

/**
     * This method will process a list of Ibiz Opportunities by Creating/Updating the following entities
     *  - PT_TMTEND
     *  - PT_TMOFRS
     *  - PT_TMOFPR
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS records will be deleted.
     * @param {[Object]} opportunities 
     */
 async processDirectIbizOpportunities(directTenderOpportunities, directTenderOpportunityItems, tx) {
    console.log(`JOB (${this.jobName }): Processing Direct Ibiz Opportunities ...`);
    try {

        // Process data to FAST
        

        // 5. Delete all records from IbizQPS after successful processing.
        const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        await tx.run(DELETE.from(IbizQps));

        console.log(`JOB (${this.jobName }): Processing of Direct ibiz opportunities successfully completed.`);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Direct ibiz opportunities failed.`);
        console.error(error);
        throw error;
    }
}

/**
     * This method will process a list of Materials by Creating/Updating the following entities
     *  - PT_TMTEND
     *  - PT_TMOFRS
     *  - PT_TMOFPR
     *  - PT_TMBDPR
     *  - PRICECONDITION
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS records will be deleted.
     * @param {[Object]} opportunities 
     */
 async processIndirectIbizOpportunities(indirectTenderOpportunities,indirectTenderOpportunityItems,tx) {
    console.log(`JOB (${this.jobName }): Processing Indirect ibiz Opportunities ...`);
    try {

        //Process data to FAST


        // 5. Delete all records from BrazilMaterials after successful processing.
        const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        await tx.run(DELETE.from(IbizQps));

        console.log(`JOB (${this.jobName }): Processing of Indirect ibiz opportunities successfully completed.`);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Indirect ibiz opportunities failed.`);
        console.error(error);
        throw error;
    }
}

};