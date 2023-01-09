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

    /**
     * This method fetches all the Ibiz TenderResults from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOS
     * @returns - A list of Ibiz TenderResults
     */
     async getTenderResults(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz empenhos from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOS ...`);
            const { IbizResultados } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizResultados));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz empenhos from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOS failed`);
            console.error(error);
            throw error;
        }
    }

    /**
 * This method fetches all the Ibiz TenderResult items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOSITEMS
 * @returns - A list of Ibiz TenderResult items
 */
 async getTenderResultItems(tx, parentIDs) {
    if(!parentIDs || parentIDs.length <= 0) {
        console.log("No Parent Itmes found");
        return [];
    }
    try {
        console.log(`JOB (${this.jobName }): Fetching Ibiz TenderResult items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOSITEMS ...`);
        const { IbizResultadosItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const result = await tx.run(SELECT.from(IbizResultadosItems).where({'parent_ID': { in: parentIDs }}));
        return result;
    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz TenderResult items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOSITEMS failed`);
        console.error(error);
        throw error;
    }
}

 /**
 * This method fetches all the Ibiz TenderResult Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZDOCS
 * @returns - A list of Ibiz TenderResult Documents
 */
  async getTenderResultDocs(tx, parentIDs) {
    if(!parentIDs || parentIDs.length <= 0) {
        console.log("No Parent Itmes found");
        return [];
    }
    try {
        console.log(`JOB (${this.jobName }): Fetching Ibiz TenderResult Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs ...`);
        const { IbizDocs } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const result = await tx.run(SELECT.from(IbizDocs).where({'Resultados_ID': { in: parentIDs } }));
        return result;
    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz TenderResult Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs failed`);
        console.error(error);
        throw error;
    }
}

/**
     * This method will process a list of Ibiz TenderResult by Creating/Updating the following entities
     *  - PT_TMTRRES
     * After successful processing, the records will be deleted from the following buffer tables
     *  - COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOS
     *  - COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZRESULTADOSITEMS
     *  - COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZDOCS
     * @param {[Object]} tenderResults
     */
 async  processTenderResults(tx, tenderResults, tenderResultItems, tenderResultDocs) {
    console.log(`JOB (${this.jobName }): Processing Ibiz TenderResult ...`);
    try {

        // 0 Mapping
        const mappedTenderResults = this.mapIbizTenderResultstoFASTResults(tenderResults);
        const mappedTenderResultItems = this.mapIbizTenderResultItems(tenderResultItems);
        const mappedDocs = this.mapIbizTenderResultDocstoFASTDocumentsDownload(tenderResultDocs);

         // 1. Create/update entries in PT_TMTEND
         await this.upsertFASTResults(tx, mappedTenderResults, mappedTenderResultItems);

         // 2. Create/update entries in DocumentsDownload
        await this.upsertFASTDocumentsDownload(tx, mappedDocs, mappedTenderResults);
 
         // 3. Delete all records from IbizResultados, IbizResultadosItems and IbizDocs after successful processing.
         const { IbizResultados } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
         await tx.run(DELETE.from(IbizResultados).where({NU_DIRETO_INDIRETO: 1}));
         const { IbizResultadosItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
         const parentIDs = mappedTenderItems.map(pr => pr.parent_ID);
         Array.isArray(parentIDs) && parentIDs.length > 0 && await tx.run(DELETE.from(IbizResultadosItems).where({parent_ID: {in: parentIDs}}));
         const { IbizDocs } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
         const docParentIDs = mappedDocs.map(pr => pr.parent_ID);
         Array.isArray(docParentIDs) && docParentIDs.length > 0 && await tx.run(DELETE.from(IbizDocs).where({Resultados_ID: {in: docParentIDs}}));

        console.log(`JOB (${this.jobName }): Processing of Ibiz TenderResult successfully completed.`);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Ibiz TenderResult failed.`);
        console.error(error);
        throw error;
    }
}

/**
     * Maps Ibiz TenderResults fields from Ibiz TenderResults to FAST PT_TMTRRES
     * @param {[Objects]} tenderResults 
     * @returns {[Objects]} tenderResults
     */
 mapIbizTenderResultstoFASTResults(tenderResults) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ TenderResults to PT_TMTRRES ...`);
    tenderResults = tenderResults.reduce((prev, curr, idx, tenderResults) => {
        const institute = (existingInstitutesInFAST.find(inst => inst.CNPJ === curr.COD_LICITADOR.replace(/\D/g,'')));
        const instituteID = institute && institute.InstituteID || 0;
        const tenderType = (existingTenderTypesFAST.find(tt => tt.NAME === curr.NM_MODALIDADE));
        const tenderTypeID = tenderType && tenderType.ID || null;
        prev.push(
            {
                IBIZ_TECHNICAL_ID : curr.ID,
                TenderID          : "",
                OfferID           : "",
                CountryCode       : "BR",
                InstituteID       : "",
                ProductCode       : "",
                ContractNo        : "",
                SubmittedOn       : new Date().toISOString(),
                SubmittedBy       : "IBIZ",
                Active            : 1,
                ErrorInSubmission : "No",
                Outcome           : "",
                AwardedCompany    : "Bayer",
                AwardedProduct    : "",
                AwardedPrice      : "",
                Currency          : "BRL",
                AwardedQty        : "",
                UoM               : "Unit",
                Reason            : "Not Specified",
                Comment           : curr.NM_DESC_MOTIVO_RESULTADO,
                AwardedTier       : null,
                ExtensionDate     : null,
                ExtensionNotes    : "",
                AwardLetterNo     : "",
                AwardDelibNo      : "",
                DeliveryDate      : null,
                ResultDate        : curr.CREATED_AT,
                AwardDate         : curr.DT_HOMOLOGACAO,
                AwardActing       : null,
                Appeal            : "No",
                InfoNeeded        : "No",
                TotalAwardedValue : "",
                LotID             : "",
                createdBy: "IBIZ",
                modifiedBy: "IBIZ"
            }
        );
        return prev;
    }, []);
    return tenderResults;
}

/**
     * Maps Ibiz TenderResult Items to make relationship with the Tender Result data
     * @param {[Objects]} tenderResultItems 
     * @returns {[Objects]} tenderResultItems
     */
mapIbizTenderResultItems(tenderResultItems) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ TenderResult Items ...`);
    tenderResultItems = tenderResultItems.reduce((prev, curr, idx, tenderResultItems) => {
        prev.push(
            {
                parent_ID             : curr.parent_ID, 
                NU_POSICAO            : curr.NU_POSICAO, 
                NM_PARTICIPANTE       : curr.NU_DIRETO_INDIRETO,
                COD_PARTICIPANTE      : curr.NM_PARTICIPANTE, 
                NM_PRODUTO            : curr.NM_PRODUTO,
                NM_FABRICANTE         : curr.NM_FABRICANTE,
                NU_QTDE               : curr.NU_QTDE,
                VLR_UNITARIO          : curr.VLR_UNITARIO,
                VLR_TOTAL             : curr.VLR_TOTAL
            }
        );
        return prev;
    }, []);
    return tenderResultItems;

}

};