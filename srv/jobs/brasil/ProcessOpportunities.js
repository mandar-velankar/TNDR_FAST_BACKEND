const cds = require('@sap/cds');
const BaseJob = require('../BaseJob');

module.exports = class processOpportunities extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
        this.jobName = jobName.toUpperCase();
        this.startTime = 0;
        this.failed = 0;
        this.success = 0;
        this.opportunityCount = 0;
    }

 /**
    * Triggered when job has started
    */
    //override
    async onTick() {
        console.log(`JOB (${this.jobName }): Processing Ibiz Opportunities ...`);
        this.startTime = new Date().getTime();
        this.db = await cds.connect.to('db');

        try {
            // Fetch opportunities
            const opportunities = await this.getOpportunities();
            this.opportunityCount = opportunities.length;

            // nothing to process
            if(this.opportunityCount == 0){
                return this._finishMessage(this.opportunityCount);
            }

            // Fetch additional data needed for mapping/aggregation
            const existingInstitutesInFAST = await this.getInstitutes();
            const existingTenderTypesFAST = await this.getTenderTypes();
            const existingDistributorsFAST = await this.getFASTDistributors();
            const existingSKUFAST = await this.getFASTSKUs();
            const priceConditionClassificationFAST = await this.getPriceConditionClassification();

            // Filter/split opportunities (direct/indirect)
            const directIbizOpportunities = opportunities.filter(direct => direct.NU_DIRETO_INDIRETO === 0);
            const directIbizOpportunityParentIDs = directIbizOpportunities.map(dop => dop.ID);
            const directIbizOpportunityItems = await this.getOpportunitiesItems(directIbizOpportunityParentIDs);
            const directIbizOpportunityDocs = await this.getOpportunitiesDocs(directIbizOpportunityParentIDs); 
            const indirectIbizOpportunities = opportunities.filter(indirect => indirect.NU_DIRETO_INDIRETO === 1);
            const indirectIbizOpportunityParentIDs = indirectIbizOpportunities.map(dop => dop.ID);
            const indirectIbizOpportunityCNPJs = indirectIbizOpportunities.map(el => el.COD_DONO_QP && el.COD_DONO_QP.replace(/\D/g,''));
            const indirectIbizOpportunityItems = await this.getOpportunitiesItems(indirectIbizOpportunityParentIDs);
            const indirectIbizOpportunityDocs = await this.getOpportunitiesDocs(indirectIbizOpportunityParentIDs); 

            //find the DistributorIDs based on the cnpj from indirectIbizOpportunities
            const indirectIbizOpportunityDistributorIDs = existingDistributorsFAST.reduce((prev, curr) => {
                if(indirectIbizOpportunityCNPJs.find(cnpj => cnpj === curr.CNPJ)){
                    prev.push(curr.DistributorID);
                }
                return prev;
            }, []);
            const brazilMasterPrices = await this.getBrazilMasterPrices(indirectIbizOpportunityDistributorIDs);

            // Process data
            if(directIbizOpportunities.length > 0){
                await this.processDirectIbizOpportunities(directIbizOpportunities, directIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST, directIbizOpportunityDocs, priceConditionClassificationFAST);
            }

            if(indirectIbizOpportunities.length > 0){
                await this.processIndirectIbizOpportunities(indirectIbizOpportunities, indirectIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST, indirectIbizOpportunityDocs, priceConditionClassificationFAST, brazilMasterPrices);
            }

            // log finish
            this._finishMessage(this.opportunityCount);

        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Processing of Ibiz Opportunities failed. \n\nCause: ${error}`);
            throw error;
        }
    }

    /**
     * Delete record from IbizQPS, IbizCcsQpsItems and IbizDocs after successful processing.
     */
    async _onProcessingSuccess ({ opportunity, opportunityItems, opportunityDocs }){
        this.success++;
        // const { opportunity, opportunityItems, opportunityDocs, jobName } = cds.context.data;
        const { IbizQps, IbizCcsQpsItems, IbizDocs } = cds.entities("com.bayer.SXTENDER.MasterData.SAP");
        try {
            await DELETE.from(IbizQps).where({ID: opportunity.ID});
            const parentIDs = opportunityItems.map(i => i.parent_ID);
            Array.isArray(parentIDs) && parentIDs.length > 0 && await DELETE.from(IbizCcsQpsItems).where({parent_ID: {in: parentIDs}});
            const docParentIDs = opportunityDocs.map(d => d.parent_ID);
            Array.isArray(docParentIDs) && docParentIDs.length > 0 && await DELETE.from(IbizDocs).where({Qps_ID: {in: docParentIDs}});
            console.log(`JOB (${this.jobName}) - Opportunity: ${opportunity.ID } from ${IbizQps.name} processed successfully. `);
        }catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Logs and updates the status of the processed record in case of an error
     * @param {*} error 
     */
    async _onProcessingFail ({ opportunity, opportunityItems, opportunityDocs }, error){
        this.failed++;
        // const { opportunity, opportunityItems, opportunityDocs, jobName } = cds.context.data;
        const { IbizQps, IbizCcsQpsItems, IbizDocs } = cds.entities("com.bayer.SXTENDER.MasterData.SAP");
        try {
            const status = 'Failed';
            const errMsg = `Message: ${error.originalMessage} \n\nQuery : ${error.query} \n\nValues: ${JSON.stringify(error.values)}`;
            // QPS
            opportunity.STATUS = status;
            opportunity.ERROR_MESSAGE = errMsg
            await UPDATE(IbizQps, {ID: opportunity.ID}).with(opportunity);
            // QPS_ITEMS
            for (let item of opportunityItems) {
                item.STATUS = status;
                item.ERROR_MESSAGE = errMsg
                await UPDATE(IbizCcsQpsItems, {ID: item.ID}).with(item);
            }
            // QPS_DOCS
            for (let doc of opportunityDocs) {
                doc.STATUS = status;
                doc.ERROR_MESSAGE = errMsg
                await UPDATE(IbizDocs, {ID: doc.ID}).with(doc);
            }
            console.log(`JOB (${this.jobName}) - Opportunity: ${opportunity.ID } from ${IbizQps.name} processing failed. Error message logged.`);
        }catch (error) {
            console.error(error);
            throw error;
        }
    }

    _finishMessage(processed){
        const end = new Date().getTime();
        const time = end - this.startTime;
        console.log(`JOB (${this.jobName }): Processing of Ibiz Opportunities completed. - Processed: ${processed} Success: ${this.success} Failed: ${this.failed} - Execution time: ${time} ms`);
    }

      /**
     * This method fetches all the Ibiz opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS
     * @returns - A list of direct and indirect Ibiz opportunities
     */
       async getOpportunities() {
        try {
            // console.log(`JOB (${this.jobName }): Fetching Ibiz Opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS ...`);
            const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await SELECT.from(IbizQps);
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching data from ${IbizQps.name} failed. Cause: ${error}`);
            throw error;
        }
    }

    /**
     * This method fetches all the Ibiz opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS
     * @returns - A list of Ibiz opportunity items
     */
     async getOpportunitiesItems(parentIDs) {
        if(!parentIDs || parentIDs.length <= 0) {
            // console.log("No Parent Itmes found");
            return [];
        }
        try {
            // console.log(`JOB (${this.jobName }): Fetching Ibiz Opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS ...`);
            const { IbizCcsQpsItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            return await SELECT.from(IbizCcsQpsItems).where({'parent_ID': { in: parentIDs }});
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching data from ${IbizCcsQpsItems.name} failed. Cause: ${error}`);
            throw error;
        }
    }

    /**
     * This method fetches BrazilMasterPrices of type 'ZWP0' from COM_BAYER_SXTENDER_MASTERDATA_BRAZILMASTERPRICES
     * @param {customerIDs} - A list of customer IDs
     * @returns - A list of Ibiz master prices
     */
    async getBrazilMasterPrices(customerIDs) {
        if(!customerIDs || customerIDs.length <= 0) {
            // console.log("No CustomerIDs provided");
            return [];
        }
        // console.log(`JOB (${this.jobName }): Fetching data from COM_BAYER_SXTENDER_MASTERDATA_BRAZILMASTERPRICES ...`);
        const { BrazilMasterPrices } = this.db.entities("com.bayer.SXTENDER.MasterData");
        try {
            return await SELECT.from(BrazilMasterPrices).where({'CustomerID': { in: customerIDs }, Type: 'ZWP0'});
        }catch (error) {
            throw new Error(`JOB (${this.jobName }): Fetching data from ${BrazilMasterPrices.name} failed`, { cause: error });
        }
    }

     /**
     * This method fetches all the Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZDOCS
     * @returns - A list of Ibiz Documents
     */
      async getOpportunitiesDocs(parentIDs) {
        if(!parentIDs || parentIDs.length <= 0) {
            // console.log("No Parent Itmes found");
            return [];
        }
        try {
            // console.log(`JOB (${this.jobName }): Fetching Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs ...`);
            const { IbizDocs } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            return await SELECT.from(IbizDocs).where({'Qps_ID': { in: parentIDs } });
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching data from ${IbizDocs.name} failed. Cause: ${error}`);
            throw error;
        }
    }

    /**
     * This method fetches all the Institutes from COM_BAYER_SXTENDER_MASTERDATA_PT_TMINST where CNPJ is not null
     * @returns - 
     */
     async getInstitutes() {
        try {
            // console.log(`JOB (${this.jobName }): Fetching Institutes from COM_BAYER_SXTENDER_MASTERDATA_PT_TMINST ...`);
            const { PT_TMINST } = this.db.entities("com.bayer.SXTENDER.MasterData");
            return await SELECT.from(PT_TMINST).where({'CNPJ': {"!=": null}, CountryCode: 'BR' });
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching data from ${PT_TMINST.name} failed. Cause: ${error}`);
            throw error;
        }
    }

    /**
     * This method fetches all the TenderTypes from COM_BAYER_SXTENDER_MASTERDATA_MASTER_TENDER_TYPE
     * @returns - 
     */
     async getTenderTypes() {
        try {
            // console.log(`JOB (${this.jobName }): Fetching TenderTypes from COM_BAYER_SXTENDER_MASTERDATA_MASTER_TENDER_TYPE ...`);
            const { MASTER_TENDER_TYPE } = this.db.entities("com.bayer.SXTENDER.MasterData");
            return await SELECT.from(MASTER_TENDER_TYPE);
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching data from ${MASTER_TENDER_TYPE.name} failed. Cause: ${error}`);
            throw error;
        }
    }

     async getNextOfferIDs(tenderIDs) {
        if(!tenderIDs || tenderIDs.length <= 0) {
            return [];
        }
        try {
            // console.log(`JOB (${this.jobName }): Fetching NextOfferID from com.bayer.SXTENDER.TransactionalDataViews.TenderOffers ...`);
            const { TenderOffers } = this.db.entities("com.bayer.SXTENDER.TransactionalDataViews");
            return await SELECT.from(TenderOffers).where({TENDERID: {in: tenderIDs }});
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching data from ${TenderOffers.name} failed. Cause: ${error}`);
            throw error;
        }
    }

    async getNextTenderID() {
        try {
            // console.log(`JOB (${this.jobName }): Fetching NextTenderID from com.bayer.SXTENDER.TransactionalDataViews.CountryTenderNo ...`);
            const { CountryTenderNo } = this.db.entities("com.bayer.SXTENDER.TransactionalDataViews");
            const result = await SELECT.one.from(CountryTenderNo).where({COUNTRY_CODE: 'BR'});
            return result.NEXT_TENDER_NO;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching data from ${CountryTenderNo.name} failed. Cause: ${error}`);
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
 async processDirectIbizOpportunities(directIbizOpportunities, directIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST, directIbizOpportunityDocs, priceConditionClassificationFAST) {
    console.log(`JOB (${this.jobName }): Processing Direct Ibiz Opportunities ...`);
    try {

        // 0. Mapping - Map IBIZ Opportunities to FAST
        const mappedTenders = this.mapIbizOpportunitiestoFASTTender(directIbizOpportunities, existingInstitutesInFAST, existingTenderTypesFAST);
        const mappedOffers = this.mapIbizOpportunitiestoFASTOffer(directIbizOpportunities, existingDistributorsFAST, priceConditionClassificationFAST);
        const mappedProducts = this.mapIbizOpportunitiestoFASTProduct(directIbizOpportunities, directIbizOpportunityItems, existingDistributorsFAST, existingSKUFAST);
        const mappedDocs = this.mapIbizOpportunitiesDocstoFASTDocumentsDownload(directIbizOpportunityDocs);

        // 0.1 Aggregate Data - DO NOT CHANGE THE ORDER OF AGGREGATION METHODS - mapped records beging updated in each step of aggregation
        const newTenders = await this.aggregateTenders(mappedTenders); 
        const {
            newOffers,
            existingOffers,
            newOfferStatusses
        } = await this.aggregateOffers(mappedOffers, mappedTenders);
        const { newProducts, newLots } = this.aggregateOfferProducts(mappedProducts, mappedOffers);
        const newDocuments = this.aggregateDocuments(mappedDocs, mappedOffers);

        const spawnPromises = [];
        // Upsert aggregated data
        for(const [index, offer] of newOffers.entries()){
            const tender = newTenders.filter(t => t.TenderID === offer.TenderID);
            const existingOffer = existingOffers.filter(eo => eo.OfferID.includes(offer.OfferID.slice(0,12)));
            const offerStatusses = newOfferStatusses.filter(st => st.TenderID === offer.TenderID);
            const products = newProducts.filter(prd => prd.TenderID === offer.TenderID);
            const lots = newLots.filter(lot => lot.OfferID.includes(offer.TenderID));
            const documents = newDocuments.filter(d => d.TenderID === offer.TenderID);

            const opportunity = directIbizOpportunities[index]; // we know that the order of directIbizOpportunities and newTenders are correct. Index points to the same opportunity
            const opportunityItems = directIbizOpportunityItems.filter(i => i.parent_ID === opportunity.ID);
            const opportunityDocs = directIbizOpportunityDocs.filter(d => d.Qps_ID === opportunity.ID);

            spawnPromises.push(
                this._runDetached(async (tx) => {

                    // set transaction context
                    tx.context.data = { opportunity, opportunityItems, opportunityDocs, jobName:this.jobName }

                    // 1. Create/update entries in PT_TMTEND
                    await this.upsertFASTTenders(tx, tender);

                    // 2. Create/update entries in PT_TMOFRS
                    await this.upsertFASTOffers(tx, [offer], existingOffer);

                    // 3. Create entries in PT_TMTNOFST
                    await this.insertFASTOfferStatusses(tx, offerStatusses);

                    // 4. Create entries in PT_TMOFPR
                    await this.insertOfferProducts(tx, products );

                    // 5. Create entries in Lots
                    await this.insertOfferProductLots(tx, lots);

                    // 6. Create entries in DocumentsDownload
                    await this.insertDocumentsDownload(tx, documents);
                    
                })
                .then(this._onProcessingSuccess.bind(this, { opportunity, opportunityItems, opportunityDocs} ))
                .catch(this._onProcessingFail.bind(this, { opportunity, opportunityItems, opportunityDocs }))
            );
            
        };

        return Promise.all(spawnPromises);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Direct ibiz opportunities failed. \n\nCause: ${error}`);
        throw error;
    }
}

/**
 * Runs the given function as detached continuation in a specified event context.
 * @see https://cap.cloud.sap/docs/node.js/cds-context-tx#cds-spawn
 * @async
 * @callback Even though the callback function is executed as a background job, all asynchronous operations inside the callback function must be awaited. Otherwise, transaction handling does not work properly.
 * @param {*} fn 
 * @returns {Promise}
 */
_runDetached(fn){
    return new Promise((resolve, reject) => {
        cds.spawn (fn)
        .on('succeeded', resolve)
        .on('failed', reject)
    })
}

/**
 * Aggregate tender data
 * @param {Array.Object} Mapped Tenders 
 * @returns 
 */
 async aggregateTenders(mappedTenders) {
    
    let nextTenderID = await this.getNextTenderID();

    // 1. get a list of existing Tenders with an ExternalID from FAST
    const tendersExistingInFAST = await this.getFASTTenders(mappedTenders);

    // 1.1 SAP material may contain the same ProductPack per SKU, we must not process the same ProductPack more than ones
    const uniqueMappedTenders = Array.from(new Set(mappedTenders.map(t => t.IbizID)))
            .map(id => {
                return mappedTenders.find(d => d.IbizID === id)
            });

    // 2. devide mappedTenders into New or Changed tenders
    const FASTNewTenders = [];
    for (const tender of uniqueMappedTenders) {
        let FASTTenderIdx = tendersExistingInFAST.findIndex(FASTTender => FASTTender.ExternalID == tender.ExternalID);
        if (FASTTenderIdx > -1) {
            // copy over the TenderID from existing Tender
            tender.TenderID = tendersExistingInFAST[FASTTenderIdx].TenderID;
        } else {
            // generate new TenderID
            tender.TenderNo = nextTenderID++;
            const sYear = (new Date().getFullYear()+'').slice(-2);
            let sNewTenderID = "BR-" + sYear + "-" + tender.TenderNo;
            tender.TenderID = sNewTenderID;
            FASTNewTenders.push(tender);
        }
    }

    return FASTNewTenders;
}

/**
 * Insert records into PT_TMTEND
 * FYI: Update is one by one: https://answers.sap.com/questions/13676137/bulk-update-in-cap-nodejs.html
 * @param {*} tx 
 * @param {*} tenders 
 */
async upsertFASTTenders(tx, tenders){
    const { PT_TMTEND } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    // console.log(`JOB (${this.jobName }): Inserting IBIZ Tenders into FAST table (PT_TMTEND) ...`);
    try {
        tenders && tenders.length > 0 && await tx.run(INSERT(tenders).into(PT_TMTEND));
        console.log(`JOB (${this.jobName }): Inserting data into (${PT_TMTEND.name}) completed. -> created: ${tenders.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Inserting data into (${PT_TMTEND.name}) failed. Cause: ${error}`);
        throw error;
    }
}


/**
 * Aggregate offer data
 * @param {Array.Object} Mapped Offers 
 * @returns 
 */
 async aggregateOffers(mappedOffers, mappedTenders) {
    
    const uniqueMappedTenders = mappedTenders.filter(t => t.TenderID);
    const tenderIDs = uniqueMappedTenders.map(tender => tender.TenderID);
    let nextOfferIDs = await this.getNextOfferIDs(tenderIDs);
    const offerStatusses = [];

    // 1. get a list of existing Offers with an IBIZWORKFLOWID from FAST
    const parentOffersExistingInFAST = await this.getFASTOffersWithIbizWorkflowID();
    
    // 2. link existing Tenders with Offers
    // IMPORTANT: the indexes of mappedOffers and mappedTenders are pointing to the same IBIZ object
    // The index is used to map parent tenders to offers. Do
    for (const [index, offer] of mappedOffers.entries()) {

        // link parent TenderID
        const ibizID = mappedTenders[index].IbizID;
        const parentTender = uniqueMappedTenders.find(ut => ut.IbizID == ibizID);
        offer.TenderID = parentTender && parentTender.TenderID;

        let parentFASTOffer = parentOffersExistingInFAST.find(FASTOffer => FASTOffer.IbizWorkflowID == offer.IbizWorkflowID && FASTOffer.ActiveOffer == 1);
        // if we can't find an existing parent offer in FAST, a.k.a cannot map to any qp_id, we consider it as a new offer.
        if(parentFASTOffer){ // revised offer
            parentFASTOffer.ActiveOffer = 0;
            offer.RevisedOfferNo = parentFASTOffer.RevisedOfferNo + 1;
            offer.TenderID = parentFASTOffer.TenderID;
            offer.OfferID = parentFASTOffer.TenderID + '-' + parentFASTOffer.TenderOfferNo + '-R' + offer.RevisedOfferNo;
            offer.TenderOfferNo = parentFASTOffer.TenderOfferNo;
        }else{ // new offer
            let nextOfferID = 1;
            let nextOfferNumber = nextOfferIDs.find(id => id.TENDERID === offer.TenderID);
            if(nextOfferNumber && nextOfferNumber.NEXTOFFERID) {
                nextOfferNumber.NEXTOFFERID++;
                offer.TenderOfferNo = nextOfferNumber.NEXTOFFERID;
            }else{
                offer.TenderOfferNo = nextOfferID++;
                nextOfferIDs.push({
                    TENDERID: offer.TenderID,
                    NEXTOFFERID: offer.TenderOfferNo
                }); 
            }
            offer.OfferID = offer.TenderID + '-' + offer.TenderOfferNo;
        }
        
        //add status
        offerStatusses.push({
            TenderID    : offer.TenderID,
            OfferID     : offer.OfferID,
            CountryCode : "BR",
            Active      : 1,
            STATUS      : "Offer Created",
            Date        : new Date().toISOString().slice(0,10)
        });
    }

    // delete technical ids which are not needed in offers before saving to DB
    const offersWithoutID = mappedOffers.map(ofr => { 
        const copy = {...ofr}; 
        delete copy.IBIZ_TECHNICAL_ID; 
        delete copy.NU_DIRETO_INDIRETO;
        delete copy.PriceConditionClassificationID;
        return copy;
    }); 

    return {
        newOffers: offersWithoutID,
        existingOffers: parentOffersExistingInFAST,
        newOfferStatusses: offerStatusses
    }
}

/**
 * Creates or Updates Offers in FAST
 * @param {*} tx 
 * @param {*} newOffers 
 * @param {*} existingOffers (parentOffersExistingInFAST)
 * @returns 
 */
async upsertFASTOffers(tx, newOffers, existingOffers){
    const { PT_TMOFRS } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    // console.log(`JOB (${this.jobName }): Upserting data into (${PT_TMOFRS.name}) ...`);
    try {
        newOffers && newOffers.length > 0 && await tx.run(INSERT(newOffers).into(PT_TMOFRS));
        //Update is one by one: https://answers.sap.com/questions/13676137/bulk-update-in-cap-nodejs.html
        for (const parrentOffer of existingOffers) {
            await tx.run(UPDATE(PT_TMOFRS, {OfferID:parrentOffer.OfferID}).with(parrentOffer));
        }
        console.log(`JOB (${this.jobName }): Upserting data into (${PT_TMOFRS.name}) completed. -> created: ${newOffers.length} updated: ${existingOffers.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Upserting data into (${PT_TMOFRS.name}) failed. Cause: ${error}`);
        throw error;
    }
}

/**
 * Insert offer statusses PT_TMTNOFST
 * @param {*} tx 
 * @param {*} statusses 
 * @returns 
 */
async insertFASTOfferStatusses(tx, statusses){
    const { PT_TMTNOFST } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    // console.log(`JOB (${this.jobName }): Inserting data into (${PT_TMTNOFST.name}) ...`);
    try {
        statusses && statusses.length > 0 && await tx.run(INSERT(statusses).into(PT_TMTNOFST));
        console.log(`JOB (${this.jobName }): Inserting data into ${PT_TMTNOFST.name}. -> created: ${statusses.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Inserting data into (${PT_TMTNOFST.name}) failed. Cause: ${error}`);
        throw error;
    }
}

aggregateOfferProducts(mappedProducts, mappedOffers) {
    const lots = [];

    // 1. link existing Tenders and Offer with Products
    for (const product of mappedProducts) {
        let parentOffer = mappedOffers.find(ofr => ofr.IBIZ_TECHNICAL_ID === product.parent_ID);
        product.TenderID = parentOffer.TenderID;
        product.OfferID = parentOffer.OfferID;
        // add distributor id
        product.DistributorID = parentOffer.DistributorID;
        // add channel
        product.Channel = (parentOffer.NU_DIRETO_INDIRETO === 0) ? 'Bayer' : 'Distributor';

         //add lots
         const hasLot = lots.find(l => l.LotID === product.LotID && l.OfferID === product.OfferID);
         if(!hasLot){
            lots.push({
                LotID    : product.LotID,
                OfferID  : product.OfferID,
                createdBy: "IBIZ",
                modifiedBy: "IBIZ"
            });
         }

    }

    // 2. delete parent id before saving to DB
    const productsWithoutID = mappedProducts.map(prd => { 
        const copy = {...prd}; 
        delete copy.parent_ID; 
        return copy;
    });  

    return {
        newProducts: productsWithoutID,
        newLots: lots
    }
}

/**
 * Creates Product in FAST PT_TMOFPR
 * @returns 
 */
 async insertOfferProducts(tx, products) {
    const { PT_TMOFPR } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    // console.log(`JOB (${this.jobName }): Inserting records into (${PT_TMOFPR.name}) ...`);
    try {
        products && products.length > 0 && await tx.run(INSERT(products).into(PT_TMOFPR));
        console.log(`JOB (${this.jobName }): Inserting records into (${PT_TMOFPR.name}) completed. -> created: ${products.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Inserting records into (${PT_TMOFPR.name}) failed`, `Cause: ${error}`);
        throw error;
    }
}

/**
 * Creates Lots in DB
 * @param {*} tx 
 * @param {*} lots 
 * @returns 
 */
async insertOfferProductLots(tx, lots) {
    const { Lots } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    console.log(`JOB (${this.jobName }): Inserting records into (${Lots.name}) ...`);
    try {
        lots && lots.length > 0 && await tx.run(INSERT(lots).into(Lots));
        console.log(`JOB (${this.jobName }): Inserting records into (${Lots.name}) successfully completed.`);
        console.log(`JOB (${this.jobName }): Lots -> created: ${lots.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Inserting records into (${Lots.name}) failed`,`Cause: ${error}`);
        throw error;
    }
}


aggregatePrices(mappedPrice, mappedProducts){
    // 1. link existing Tenders and Offer with Products
    for (const [idx, price] of mappedPrice.entries()) {
        const product = mappedProducts[idx];
        price.TenderID = product.TenderID;
        price.OfferID = product.OfferID;
        price.ProductCode = product.ProductCode;
    }

    // 2. delete parent_ID before saving to DB
    const pricesWithoutID = mappedPrice.map(prc => { 
        const copy = {...prc}; 
        delete copy.parent_ID; 
        return copy;
    });  

    return pricesWithoutID;
}


/**
 * Creates Price in FAST
 * PT_TMBDPR
 * @returns 
 */
 async insertFASTPrice(tx, prices) {
    const { PT_TMBDPR } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    // console.log(`JOB (${this.jobName }): Inserting records into (${PT_TMBDPR.name}) ...`);
    try {
        prices && prices.length > 0 && await tx.run(INSERT(prices).into(PT_TMBDPR));
        console.log(`JOB (${this.jobName }): Inserting records into (${PT_TMBDPR.name}) successfully completed. -> created: ${prices.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Inserting records into (${PT_TMBDPR.name}) failed`, `Cause: ${error}`);
        throw error;
    }
}


aggregatePriceConditions(mappedPriceCondition, mappedOffers){
    // 1. link existing Offer with PriceCondition
    for (const pc of mappedPriceCondition) {
        let parentOffer = mappedOffers.find(ofr => ofr.IBIZ_TECHNICAL_ID === pc.parent_ID);
        pc.OfferID = parentOffer.OfferID;
        pc.PriceConditionClassification_ID = parentOffer.PriceConditionClassificationID;
    }

    // delete parent_ID before saving to DB
    const priceConditionsWithoutID = mappedPriceCondition.map(prccnd => { 
        const copy = {...prccnd}; 
        delete copy.parent_ID; 
        return copy;
    });  

    return priceConditionsWithoutID;
}


/**
 * Creates PriceCondition in FAST
 * PRICECONDITION
 * @returns 
 */
 async insertFASTPriceConditions(tx, priceConditions) {
     // console.log(`JOB (${this.jobName }): Inserting records into (${PriceCondition.name}) ...`);
     try {
        const { PriceCondition } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
        priceConditions && priceConditions.length > 0 && await tx.run(INSERT(priceConditions).into(PriceCondition));
        console.log(`JOB (${this.jobName }): Inserting records into ${PriceCondition.name} completed. -> created: ${priceConditions.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Inserting records into (${PriceCondition.name}) failed`,`Cause: ${error}`);
        throw error;
    }
}

aggregateDocuments(mappedDocs, mappedOffers){
    // 1. link existing Tenders and Offer with Documents
    for (const docs of mappedDocs) {
        let parentOffer = mappedOffers.find(ofr => ofr.IBIZ_TECHNICAL_ID === docs.parent_ID);
        docs.TenderID = parentOffer.TenderID;
        docs.OfferID = parentOffer.OfferID;
    }

    // 2. delete QPS ParentId before saving to DB
    const docsWithoutID = mappedDocs.map(doc => { 
        const copy = {...doc}; 
        delete copy.parent_ID; 
        return copy;
    });  

    return docsWithoutID;
}

/**
 * Creates Opportunity Documents in FAST
 * DocumentsDownload
 * @returns 
 */
 async insertDocumentsDownload(tx, documents) {
    const { DocumentsDownload } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    // console.log(`JOB (${this.jobName }): Inserting records into (${DocumentsDownload.name})  ...`);
    try {
        documents && documents.length > 0 && await tx.run(INSERT(documents).into(DocumentsDownload));
        console.log(`JOB (${this.jobName }): Inserting records into (${DocumentsDownload.name}) successfully completed. -> created: ${documents.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Inserting records into (${DocumentsDownload.name}) failed`, `Cause: ${error}`);
        throw error;
    }
}

/**
 * Gets a list of existing Tenders from FAST with an ExternalID
 * @param {Array} tenders 
 * @returns {Array<PT_TMTEND>} a list of existing tenders
 */
 async getFASTTenders(tenders) {
    if(!tenders || tenders.length === 0){
        console.log(`JOB (${this.jobName }): No Tenders were found in FAST`);
        return [];
    }
    // console.log(`JOB (${this.jobName }): Prepare fetching IBIZ Opportunity Tenders from FAST table`);

    // get all the ExternalIDs from tenders
    let externalIDs = [];
    for (const tender of tenders) {
        externalIDs.push(tender.ExternalID);
    }
    // console.log(`JOB (${this.jobName }): Start fetching IBIZ Opportunity Tenders from FAST table`);

    // get a list of tenders for given list of ExternalIDs
    try {
        const { PT_TMTEND } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
        let result = [];
        Array.isArray(externalIDs) && externalIDs.length > 0 && (result = await SELECT.from(PT_TMTEND).where({ ExternalID: { in: externalIDs}, CountryCode: 'BR' } ));
        return result;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching data form ${PT_TMTEND.name} failed`, `Cause: ${error}`);
        throw error;
    }
}

/**
 * Gets a list of existing Offers from FAST with an IbizWorkflowID set
 * @returns {Array<PT_TMOFRS>} a list of existing offers
 */
 async getFASTOffersWithIbizWorkflowID() {
    try {
        // console.log(`JOB (${this.jobName }): Start fetching Offers with IbizWorkflowID from FAST table`);
        const { PT_TMOFRS } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
        let result = await SELECT.from(PT_TMOFRS).where(
            { 
                    IbizWorkflowID: {'!=': null}, 
                    CountryCode: 'BR' 
            } 
        );
        // console.log(`JOB (${this.jobName }): End fetching Offers with IbizWorkflowID from FAST table`);
        return result;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching data form ${PT_TMOFRS.name} failed`, `Cause: ${error}`);
        throw(error);
    }
}

/**
 * Gets a list of existing Distributors from FAST
 * @param {Array} distributors 
 * @returns {Array<PT_TMDIST>} a list of existing distributors
 */
 async getFASTDistributors() { 
    try {
        // console.log(`JOB (${this.jobName }): Start fetching Brazil Distributors from FAST table`);
        // get a list of distributors entities for given list of CustomerIDs
        const { PT_TMDIST } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await SELECT.from(PT_TMDIST).where({ CountryCode: 'BR' } );
        // console.log(`JOB (${this.jobName }): End fetching Brazil Distributors from FAST table`);
        return result;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching data form ${PT_TMDIST.name} failed`, `Cause: ${error}`);
        throw error;
    }
}

/**
 * Gets a list of existing SKUs from FAST
 * @param {Array} SKUs 
 * @returns {Array<PT_TMSKUPRDPCK>} a list of existing SKU
 */
 async getFASTSKUs() {
    try {
        // console.log(`JOB (${this.jobName }): Start fetching Brazil SKUs from FAST table`);
        // get a list of distributors entities for given list of CustomerIDs
        const { PT_TMSKUPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");
        const result = await SELECT.from(PT_TMSKUPRDPCK).where({ CountryCode: 'BR', ActiveRecord: 'Yes' } );
        // console.log(`JOB (${this.jobName }): End fetching Brazil SKUs from FAST table`);
        return result;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching data form ${PT_TMSKUPRDPCK.name} failed`, `Cause: ${error}`);
        throw error;
    }
}

/**
 * Gets a list of PriceConditionClassification from FAST
 * @param {Array} priceConditionClassifications 
 * @returns {Array<PriceConditionClassification>} a list of existing SKU
 */
 async getPriceConditionClassification() {
    try {
        // console.log(`JOB (${this.jobName }): Start fetching Brazil PriceConditionClassification from FAST table`);
        // get a list of PriceConditionClassifications
        const { PriceConditionClassification } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
        const result = await SELECT.from(PriceConditionClassification).where({ CountryCode: 'BR', Classification: 'Tender', ProductType: 'All', ConditionType: 'Discount' } );
        // console.log(`JOB (${this.jobName }): End fetching Brazil PriceConditionClassification from FAST table`);
        return result;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching data form ${PriceConditionClassification.name} failed`, `Cause: ${error}`);
        throw error;
    }
}

/**
     * This method will process a list of Ibiz Opportunities by Creating/Updating the following entities
     *  - PT_TMTEND
     *  - PT_TMOFRS
     *  - PT_TMOFPR
     *  - PT_TMBDPR
     *  - PRICECONDITION
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS records will be deleted.
     * @param {[Object]} opportunities 
     */
 async  processIndirectIbizOpportunities(indirectIbizOpportunities, indirectIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST, indirectIbizOpportunityDocs, priceConditionClassificationFAST, brazilMasterPrices) {
    console.log(`JOB (${this.jobName }): Processing Indirect ibiz Opportunities ...`);
    try {

        // 0 Mapping
        const mappedTenders = this.mapIbizOpportunitiestoFASTTender(indirectIbizOpportunities, existingInstitutesInFAST, existingTenderTypesFAST);
        const mappedOffers = this.mapIbizOpportunitiestoFASTOffer(indirectIbizOpportunities, existingDistributorsFAST, priceConditionClassificationFAST);
        const mappedProducts = this.mapIbizOpportunitiestoFASTProduct(indirectIbizOpportunities, indirectIbizOpportunityItems, existingDistributorsFAST, existingSKUFAST);
        const mappedPrice = this.mapIbizOpportunitiestoFASTPrices(indirectIbizOpportunityItems, existingSKUFAST);
        const mappedPriceCondition = this.mapIbizOpportunitiestoFASTPriceCondition(indirectIbizOpportunityItems, existingSKUFAST, brazilMasterPrices);
        const mappedDocs = this.mapIbizOpportunitiesDocstoFASTDocumentsDownload(indirectIbizOpportunityDocs);

        // 0.1 Aggregate data
        // 0.1 Aggregate Data - DO NOT CHANGE THE ORDER OF AGGREGATION METHODS - mapped records beging updated in each step of aggregation
        const newTenders = await this.aggregateTenders(mappedTenders); 
        const {
            newOffers,
            existingOffers,
            newOfferStatusses
        } = await this.aggregateOffers(mappedOffers, mappedTenders);
        const { newProducts, newLots } = this.aggregateOfferProducts(mappedProducts, mappedOffers);
        const newDocuments = this.aggregateDocuments(mappedDocs, mappedOffers);
        const newPrices = this.aggregatePrices(mappedPrice, mappedProducts);
        const newPriceConditions = this.aggregatePriceConditions(mappedPriceCondition, mappedOffers);

        const spawnPromises = [];
        // Upsert aggregated data
        for(const [index, offer] of newOffers.entries()){
            const tender = newTenders.filter(t => t.TenderID === offer.TenderID);
            const existingOffer = existingOffers.filter(eo => eo.OfferID.includes(offer.OfferID.slice(0,12)));
            // const offerStatusses = newOfferStatusses.filter(st => st.TenderID === tender.TenderID);
            const products = newProducts.filter(prd => prd.TenderID === offer.TenderID);
            // const lots = newLots.filter(lot => lot.OfferID.includes(tender.TenderID));
            const documents = newDocuments.filter(d => d.TenderID === offer.TenderID);
            const prices = newPrices.filter(p => p.TenderID === offer.TenderID);
            const priceConditions = newPriceConditions.filter(pc => pc.OfferID.includes(offer.TenderID));

            const opportunity = indirectIbizOpportunities[index]; // we know that the order of directIbizOpportunities and newTenders are correct. Index points to the same opportunity
            const opportunityItems = indirectIbizOpportunityItems.filter(i => i.parent_ID === opportunity.ID);
            const opportunityDocs = indirectIbizOpportunityDocs.filter(d => d.Qps_ID === opportunity.ID);

            spawnPromises.push(
                this._runDetached(async (tx) => {

                    // 1. Create/update entries in PT_TMTEND
                    await this.upsertFASTTenders(tx, tender);

                    // 2. Create/update entries in PT_TMOFRS
                    await this.upsertFASTOffers(tx, [offer], existingOffer);

                    // 3. Create entries in PT_TMOFPR
                    await this.insertOfferProducts(tx, products);

                    // 4. Create entries in PT_TMBDPR
                    await this.insertFASTPrice(tx, prices);

                    // 5. Create entries in PRICECONDITION
                    await this.insertFASTPriceConditions(tx, priceConditions);

                    // 6. Create entries in DocumentsDownload
                    await this.insertDocumentsDownload(tx, documents);
                    
                })
                .then(this._onProcessingSuccess.bind(this, { opportunity, opportunityItems, opportunityDocs} ))
                .catch(this._onProcessingFail.bind(this, { opportunity, opportunityItems, opportunityDocs }))
            );
        };

        return Promise.all(spawnPromises);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Indirect ibiz opportunities failed. Cause: ${error}`);
        throw error;
    }
}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMTEND
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} tenders
     */
mapIbizOpportunitiestoFASTTender(ibizOpportunities,existingInstitutesInFAST, existingTenderTypesFAST) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMTEND ...`);
    ibizOpportunities = ibizOpportunities.reduce((prev, curr, idx, ibizOpportunities) => {
        const institute = (existingInstitutesInFAST.find(inst => inst.CNPJ === curr.COD_LICITADOR.replace(/\D/g,'')));
        const instituteID = institute && institute.InstituteID || 0;
        const tenderType = (existingTenderTypesFAST.find(tt => tt.NAME === curr.NM_MODALIDADE));
        const tenderTypeID = tenderType && tenderType.ID || null;
        prev.push(
            {
                TenderID             : "",
                CountryCode          : "BR",
                ToolID               : null,
                TenderNo             : null,
                CloneTenderID        : null,
                SubmittedOn          : new Date().toISOString(), 
                SubmittedBy          : "IBIZ",
                Active               : 1,
                Classification       : "Tender",
                BiddingTypeLevel1    : null,
                BiddingTypeLevel2    : null,
                BiddingTypeLevel3    : null,
                HighValue            : "FALSE",
                OfferStartDate       : null,
                IbizID               : curr.ID_LIC,
                PublicNotice         : null,
                TenderName           : curr.NU_LICITACAO_EDITAL,
                InstituteID          : instituteID,
                TenderChannel        : "Distributor",
                GroupPurchasing      : null,
                PublicationDate      : curr.DT_PUBLICACAO,
                BidDueDate           : curr.DT_ABERTURA,
                AwardDate            : null,
                NextPublicationDye   : null,
                ContractLength       : null,
                ContractExtenseion   : null,
                TenderStatus         : "Open",
                ManualSaveStatus     : null,
                FoldersCreated       : 0,
                TENDER_TYPE_ID       : tenderTypeID,
                CONTRACT_TYPE_ID     : 1,
                SALES_TYPE_ID        : 1,
                TENDER_ORIGIN_ID     : 1,
                PROCUREMENT_METHOD_ID: "Not Specified",
                PROCUREMENT_REASON   : null,
                CONTENT              : null,
                PORTAL               : null,
                TENDER_TYPE_2_ID     : null,
                SAPID                : null,
                ExternalID           : curr.ID_LIC,
                AlternativeID        : curr.ID_ALTERNATIVO || 0,
                IbizLicitaID         : curr.ID_LICITACAO_IBIZ_LICITA || 0,
                Liciedital           : curr.NU_LICITACAO_EDITAL,
                Purpose              : curr.NM_FINALIDADE_LIC,
                ParticiationType     : curr.NM_LIC_TIPO_PARTICIPACAO,
                ParticipationIntention : curr.NM_CARD_ATUAL,
                createdBy: "IBIZ",
                modifiedBy: "IBIZ"
            }
        );
        return prev;
    }, []);
    return ibizOpportunities;
}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMOFRS
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} offers
     */
mapIbizOpportunitiestoFASTOffer(ibizOpportunities, existingDistributorsFAST, priceConditionClassificationFAST) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMOFRS ...`);
    ibizOpportunities = ibizOpportunities.reduce((prev, curr, idx, ibizOpportunities) => {
        const cnpj = curr.COD_DONO_QP && curr.COD_DONO_QP.replace(/\D/g,'');
        const distributor = (curr.NU_DIRETO_INDIRETO === 0) ? existingDistributorsFAST.find(dist => dist.DistributorName === "Bayer Brazil") : existingDistributorsFAST.find(dist => dist.CNPJ === cnpj);
        const distributorID = distributor && distributor.DistributorID || null;
        const priceConditionClassification = priceConditionClassificationFAST.find(p => p.Division === curr.NM_BU_ABREV);
        const priceConditionClassificationId = priceConditionClassification && priceConditionClassification.ID || null;
        prev.push(
            {
                IBIZ_TECHNICAL_ID     : curr.ID, // this ID will be used to create relationship with the items and will be deleted afterwards
                PriceConditionClassificationID : priceConditionClassificationId, //this ID will be used to create relationship with the PriceCondition items and will be deleted afterwards
                NU_DIRETO_INDIRETO    : curr.NU_DIRETO_INDIRETO,
                TenderID              : "", 
                OfferID               : "", 
                CountryCode           : "BR",
                TenderOfferNo         : null,
                RevisedOfferNo        : 0,
                ActiveOffer           : 1, 
                CloneOfferID          : null,
                CreationDate          : new Date().toISOString(),
                SubmissionDate        : new Date().toISOString(),
                SubmittedOn           : new Date().toISOString(),
                SubmittedBy           : "anonymous",
                Active                : 1,
                DistributorID         : distributorID,
                InternalBidDueDate    : curr.DT_ABERTURA,
                SellingCompany        : "BBR",
                ProductCount          : 0,
                Currency              : "BRL",
                ManualSaveStatus      : null,
                WholesaleOffer        : "No",
                Comment               : null,
                OfferRevisionSplitNo  : null,
                NewOfferDueDate       : curr.DT_FIM_ACOLHIMENTO,
                Comment               : curr.NM_ALTERA_COTACAO,
                ContinuationOfferNo   : 0,
                APPROVALS_SENT        : 0,
                FOCType               : null,
                DEFAULT_FOC_ABS_PCT   : null,
                Division              : curr.NM_BU_ABREV,
                ProfitabilityStartMnth: null,
                ProfitabilityAgrDur   : null,
                ProfitabilityYrlyMntCost: null,
                ProfitabilityDiscRate : null,
                ProfitabilityGrowthRate: null,
                IbizWorkflowID         : curr.ID_QP,
                isDirectIbizOpportunity: curr.NU_DIRETO_INDIRETO == 0 ? true : false,
                PreviousIbizWorkflowID : null,
                TenderDistributorID    : curr.ID_LIC_ATRIBUIDA,
                BusinessUnit           : curr.NM_BU_ABREV,
                Responded              : curr.NU_2D_NOTIF_APPLIED_NO_DN_RESPONDED,
                DistributorDeadline    : curr.DT_FINALIZADO,
                DistributorComments    : curr.NM_MOTIVO_FINALIZADO
            }
        );
        return prev;
    }, []);
    return ibizOpportunities;

}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMOFPR
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} products
     */
mapIbizOpportunitiestoFASTProduct(directIbizOpportunities, ibizOpportunityItems, existingDistributorsFAST, existingSKUFAST) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMOFPR ...`);
    ibizOpportunityItems = ibizOpportunityItems.reduce((prev, curr, idx, ibizOpportunityItems) => {
        const sku = existingSKUFAST.find(sku => sku.SKUCode == curr.COD_REFERENCIA);
        const productPackID = sku && sku.ProductPackID || idx; // productCode must be unique
        prev.push(
            {
                parent_ID                : curr.parent_ID,
                TenderID                 : "",
                OfferID                  : "",
                CountryCode              : "BR",
                SubmittedOn              : new Date().toISOString(),
                SubmittedBy              : "anonymous",
                Active                   : 1,
                ProductCode              : productPackID,
                Reference                : null,
                AlternateOfferYN         : null,
                RequestedVolume          : curr.NU_QTDE_UNITARIA,
                UnitPerPack              : "Unit",
                SampleYN                 : null,
                SampleQuantity           : 0,
                DocumentsRequired        : null,
                FirstShipment            : null,
                NoofLots                 : 0,
                IntervalBetweenShipments : 0,
                NoOfTier                 : 0,
                DiscOrOffer              : null,
                PaymentTerms             : null,
                DistributorID            : null,
                SNo                      : null,
                ActiveProduct            : 1,
                Comment                  : null,
                INCOTerms                : null,
                SORTER                   : idx,
                DEFAULT_COMMISSION_RATE  : 0,
                SUPPLY_UPDATE            : null,
                PAYMENT_UPDATE           : null,
                Line                     : curr.NU_ITEM,
                DeliveryConditions       : null,
                MinInvoiceAmount         : 0,
                PricingPolicyCluster     : null,
                OfferType                : "Selling",
                AnticipatedRequestedQuantity: null,
                MaxPrice                 : null,
                Channel                  : null,
                LotID                    : curr.NU_LOTE,
                WorkflowProductID        : curr.ID_CC_QP,
                IbizWorkflowID           : curr.ID_QP
            }
        );
        return prev;
    }, []);
    return ibizOpportunityItems;

}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMBDPR
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} prices
     */
 mapIbizOpportunitiestoFASTPrices(indirectIbizOpportunityItems, existingSKUFAST) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMBDPR ...`);
    indirectIbizOpportunityItems = indirectIbizOpportunityItems.reduce((prev, curr, idx, indirectIbizOpportunityItems) => {
        const sku = existingSKUFAST.find(sku => sku.SKUCode == curr.COD_REFERENCIA);
        const productPackID = sku && sku.ProductPackID || 0;
        prev.push(
            {
                parent_ID             : curr.parent_ID,
                TenderID              : "",
                OfferID               : "",
                CountryCode           : "BR",
                ProductCode           : productPackID,
                SubmittedOn           : new Date().toISOString(),
                SubmittedBy           : "anonymous",
                Active                : 1,
                Tier                  : 1,
                VolumeFrom            : 0,
                VolumeTo              : 0,
                RegPrice              : curr.VLR_BASE_CALCULO_UNITARIO,
                FOC                   : null,
                FOCStep               : null, 
                FOCType               : null,
                Discount              : curr.NU_PORCENTAGEM_DESCONTO,
                OfferPrice            : curr.VLR_UNITARIO,
                Deductions            : 0,
                StandardDiscount      : curr.NU_PORCENTAGEM_DESCONTO_INICIAL,
                AdditionalDiscount    : curr.NU_PORCENTAGEM_DESCONTO_ADD,
                NetofferPrice         : null,
                BusinessCasePrice     : null,
                WholesalePrice        : null,
                COGS                  : null,
                SpotRate              : 1,
                BudgetRate            : 1,
                Scenario              : 0,
                FOC_ABS_PCT           : null,
                FOC_Bundled_1         : null,
                FOC_ABS_PCT_Bundled_1 : null,
                FOCProduct_Bundled_1  : null,
                ActiveTier            : 0,
                NetPrice              : null,
                NetPrice_OfPaid       : 0,
                PRICE_UPDATE          : null,
                LotID                 : curr.NU_LOTE
            }
        );
        return prev;
    }, []);
    return indirectIbizOpportunityItems;

}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PriceCondition
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} priceCondition
     */
 mapIbizOpportunitiestoFASTPriceCondition(indirectIbizOpportunityItems, existingSKUFAST, brazilMasterPrices) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PriceCondition ...`);
    indirectIbizOpportunityItems = indirectIbizOpportunityItems.reduce((prev, curr, idx, indirectIbizOpportunityItems) => {
        const sku = existingSKUFAST.find(sku => sku.SKUCode == curr.COD_REFERENCIA);
        const productPackID = sku && sku.ProductPackID || null;
        const masterPrice = brazilMasterPrices.find(p => p.ProductID === productPackID);
        prev.push(
            {
                parent_ID                           : curr.parent_ID,
                CountryCode                         : "BR",
                OfferID                             : "",
                ProductCode                         : productPackID,
                PVL                                 : null,
                ConfidentialPrice                   : null,
                Discount                            : curr.NU_PORCENTAGEM_DESCONTO,
                RoyalDecree                         : null,
                RoyalDecreeValue                    : null,
                RoyalDecreeIncl                     : null,
                StandardDiscount                    : curr.NU_PORCENTAGEM_DESCONTO_INICIAL,
                AdditionalDiscount                  : curr.NU_PORCENTAGEM_DESCONTO_ADD,
                NetPriceWithoutTaxBeforeDeductionRD : null,
                NetPriceWithoutTaxAfterDeductionRD  : null,
                NetPriceWithTaxAfterDeductionRD     : null,
                NetPriceWithoutTax                  : null,
                NetPriceWithTax                     : null,
                MaximumPrice                        : null,
                Tax                                 : null,
                Liquidation                         : null,
                RefundDate                          : null,
                PriceConditionCode                  : null,
                MonthlyRentPerUnit                  : null,
                AnnualValue                         : null,
                ReferencePriceAgreement             : null, 
                LotID                               : curr.NU_LOTE,
                PriceList                           : masterPrice && masterPrice.Value,
                ICMSTax                             : curr.NU_PORCENTAGEM_ICMS,
                TaxExemption                        : (!curr.NU_PORCENTAGEM_ICMS) ? 'No' : 'Yes',
                PriceAfterTaxExemtion               : (!curr.NU_PORCENTAGEM_ICMS) ? null : (curr.VLR_BASE_CALCULO_UNITARIO * (1 - curr.NU_PORCENTAGEM_ICMS)),
                CAP                                 : (!curr.NU_CAP || curr.NU_CAP === 0) ? 'No' : 'Yes',
                PriceAfterCap                       : (!curr.NU_CAP || curr.NU_CAP === 0) ? (1 * (1 - curr.NU_PORCENTAGEM_ICMS) * curr.VLR_BASE_CALCULO_UNITARIO) : ((1 - curr.NU_PORCENTAGEM_CAP) * (1 - curr.NU_PORCENTAGEM_ICMS) * curr.VLR_BASE_CALCULO_UNITARIO),
                CommercialProposal                  : curr.VLR_UNITARIO,
                TaxEqualization                     : null, 
                Invoive                             : null, 
                ICMS                                : null, 
                NetPrice                            : null,
                PriceConditionClassification_ID     : null
            }
        );
        return prev;
    }, []);
    return indirectIbizOpportunityItems;

}

/**
 * Maps Ibiz Opportunities Documents from Ibiz Opportunities to FAST DocumentsDownload
 * @param {*} directIbizOpportunityDocs 
 * @returns {[Objects]} documentsDownload
 */
mapIbizOpportunitiesDocstoFASTDocumentsDownload(ibizOpportunityDocs){

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities Docs to DocumentsDownload ...`);
    ibizOpportunityDocs = ibizOpportunityDocs.reduce((prev, curr, idx, ibizOpportunityDocs) => {
        prev.push(
            {
                parent_ID             : curr.Qps_ID,
                DocID                 : curr.ID_DOC,
                DocCreatedAt          : curr.CREATED_AT,
                NameTag               : curr.NM_TAG,
                CountryCode           : "BR",
                TenderID              : "",
                OfferID               : "",
                IbizAPIName           : "Tender",
                URL                   : curr.FILE_URL,
                Name                  : curr.NM_DOC,
                Downloaded            : false
            }
        );
        return prev;
    }, []);
    return ibizOpportunityDocs;
}


/**
 * Gets the next highest value for a given field from table
 * @param {*} table 
 * @param {*} fieldname 
 * @returns - next highest value
 */
 async getNextValue (table, fieldname, countryCode,){
    let nextValue = 1;
    try {
        let results = [];
        if(countryCode){
            results = await SELECT.from(table, ['Max(' + fieldname + ') as max']).where({CountryCode: countryCode});
        }else{
            results = await SELECT.from(table, ['Max(' + fieldname + ') as max']);
        }
        if (results[0].max) {
            nextValue = results[0].max + 1
        }
        return nextValue;
    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching next highest value for ${fieldname} from ${table.name} failed. Cause: ${error}`);
        throw error;
    }
}

};