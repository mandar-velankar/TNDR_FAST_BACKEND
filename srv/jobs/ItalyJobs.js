const cds = require('@sap/cds');
const BaseCron = require('cron-es6');

module.exports.ProcessMaterials = class ProcessMaterials extends BaseCron {

    constructor(cronTime) {
        super('ProcessMaterials', cronTime);
    }

    /**
     * Triggered when job has started
     */
    //override
    async onTick() {

        console.log('Processing Italy materials ...');

        this.db = await cds.connect.to('db'); 

        const { 
            ItalyMaterials 
        } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");

        const materials = await cds.run(SELECT.from(ItalyMaterials));
        
        const result = await Promise.all(materials.map(mat => this.processMaterial(mat)));

        // when the job has finished, call the stop()
        this.stop();
    }

    async processMaterial(material){

        const { 
            PT_TMPRDHIER, 
            PT_TMPRDPCK, 
            PT_TMCTPRDPCK,
            PT_TMSKUPRDPCK, 
            PT_TMCOGS 
        } = this.db.entities("com.bayer.SXTENDER.MasterData");

        const nextProductPackID = await cds.run(SELECT.from(PT_TMPRDPCK, ['Max(PRODUCTPACKID) as max']));

        console.log(nextProductPackID);

    }

    /**
     * Triggered when the job has finished.
     * You have to call the job.stop() method when the job is done.
     */
    //override
    async onComplete() {
        console.log('Processing Italy materials Finished.');
    }

};

