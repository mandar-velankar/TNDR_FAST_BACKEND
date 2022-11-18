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
        
        this.db = await cds.connect.to('db');
        const tx = this.db.tx();

        try {
            // Fetch data
            const opportunities = await this.getOpportunities(tx);
            const existingInstitutesInFAST = await this.getInstitutes(tx);
            const existingTenderTypesFAST = await this.getTenderTypes(tx);
            const existingDistributorsFAST = await this.getFASTDistributors(tx);
            const existingSKUFAST = await this.getFASTSKUs(tx);

            const directIbizOpportunities = opportunities.filter(direct => direct.NU_DIRETO_INDIRETO === 0);
            const directIbizOpportunityParentIDs = directIbizOpportunities.map(dop => dop.ID);
            const directIbizOpportunityItems = await this.getOpportunitiesItems(tx, directIbizOpportunityParentIDs);
            const directIbizOpportunityDocs = await this.getOpportunitiesDocs(tx, directIbizOpportunityParentIDs); //to-be implemented later

            const indirectIbizOpportunities = opportunities.filter(indirect => indirect.NU_DIRETO_INDIRETO === 1);
            const indirectIbizOpportunityParentIDs = indirectIbizOpportunities.map(dop => dop.ID);
            const indirectIbizOpportunityItems = await this.getOpportunitiesItems(tx, indirectIbizOpportunityParentIDs);
            const indirectIbizOpportunityDocs = await this.getOpportunitiesDocs(tx, indirectIbizOpportunityParentIDs); //to-be implemented later

            // Process data
            await this.processDirectIbizOpportunities(tx, directIbizOpportunities, directIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST);
            await this.processIndirectIbizOpportunities(tx, indirectIbizOpportunities, indirectIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST);

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
     async getOpportunitiesItems(tx, parentIDs) {
        if(!parentIDs || parentIDs.length <= 0) {
            console.log("No Parent Itmes found");
            return [];
        }
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS ...`);
            const { IbizCcsQpsItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizCcsQpsItems).where({'parent_ID': { in: parentIDs }}));
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
      async getOpportunitiesDocs(tx, parentIDs) {
        if(!parentIDs || parentIDs.length <= 0) {
            console.log("No Parent Itmes found");
            return [];
        }
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs ...`);
            const { IbizDocs } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizDocs).where({'Qps_ID': { in: parentIDs } }));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs failed`);
            console.error(error);
            throw error;
        }
    }

    /**
     * This method fetches all the Institutes from COM_BAYER_SXTENDER_MASTERDATA_PT_TMINST where CNPJ is not null
     * @returns - 
     */
     async getInstitutes(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Institutes from COM_BAYER_SXTENDER_MASTERDATA_PT_TMINST ...`);
            const { PT_TMINST } = this.db.entities("com.bayer.SXTENDER.MasterData");
            const result = await tx.run(SELECT.from(PT_TMINST).where({'CNPJ': {"!=": null}, CountryCode: 'BR' }));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Institutes from COM_BAYER_SXTENDER_MASTERDATA_PT_TMINST failed`);
            console.error(error);
            throw error;
        }
    }

    /**
     * This method fetches all the TenderTypes from COM_BAYER_SXTENDER_MASTERDATA_MASTER_TENDER_TYPE
     * @returns - 
     */
     async getTenderTypes(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching TenderTypes from COM_BAYER_SXTENDER_MASTERDATA_MASTER_TENDER_TYPE ...`);
            const { MASTER_TENDER_TYPE } = this.db.entities("com.bayer.SXTENDER.MasterData");
            const result = await tx.run(SELECT.from(MASTER_TENDER_TYPE));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of TenderTypes from COM_BAYER_SXTENDER_MASTERDATA_MASTER_TENDER_TYPE failed`);
            console.error(error);
            throw error;
        }
    }

     async getNextOfferIDs(tx, tenderIDs) {
        if(!tenderIDs || tenderIDs.length <= 0) {
            return [];
        }
        try {
            console.log(`JOB (${this.jobName }): Fetching NextOfferID from com.bayer.SXTENDER.TransactionalDataViews.TenderOffers ...`);
            const { TenderOffers } = this.db.entities("com.bayer.SXTENDER.TransactionalDataViews");
            const result = await tx.run(SELECT.from(TenderOffers).where({TENDERID: {in: tenderIDs }}));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching NextOfferID from com.bayer.SXTENDER.TransactionalDataViews.TenderOffers failed`);
            console.error(error);
            throw error;
        }
    }

    async getNextTenderID(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching NextTenderID from com.bayer.SXTENDER.TransactionalDataViews.CountryTenderNo ...`);
            const { CountryTenderNo } = this.db.entities("com.bayer.SXTENDER.TransactionalDataViews");
            const result = await tx.run(SELECT.one.from(CountryTenderNo).where({COUNTRY_CODE: 'BR'}));
            return result.NEXT_TENDER_NO;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching NextTenderID from com.bayer.SXTENDER.TransactionalDataViews.CountryTenderNo failed`);
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
 async processDirectIbizOpportunities(tx, directIbizOpportunities, directIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST) {
    console.log(`JOB (${this.jobName }): Processing Direct Ibiz Opportunities ...`);
    try {

        // 0. Mapping - Map IBIZ Opportunities to FAST
        const mappedTenders = this.mapIbizOpportunitiestoFASTTender(directIbizOpportunities, existingInstitutesInFAST, existingTenderTypesFAST);
        const mappedOffers = this.mapIbizOpportunitiestoFASTOffer(directIbizOpportunities, existingDistributorsFAST);
        const mappedProducts = this.mapIbizOpportunitiestoFASTProduct(directIbizOpportunities, directIbizOpportunityItems, existingDistributorsFAST, existingSKUFAST);

        // 1. Create/update entries in PT_TMTEND
        await this.upsertFASTTenders(tx, mappedTenders);

        // 2. Create/update entries in PT_TMOFRS
        await this.upsertFASTOffers(tx, mappedOffers, mappedTenders);

        // 3. Create/update entries in PT_TMOFPR
        await this.upsertFASTOfferProducts(tx, mappedProducts, mappedOffers);

        // 4. Delete all records from IbizQPS and IbizCcsQpsItems after successful processing.
        const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        await tx.run(DELETE.from(IbizQps).where({NU_DIRETO_INDIRETO: 0}));
        const { IbizCcsQpsItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        const parentIDs = mappedProducts.map(pr => pr.parent_ID);
        Array.isArray(parentIDs) && parentIDs.length > 0 && await tx.run(DELETE.from(IbizCcsQpsItems).where({parent_ID: {in: parentIDs}}));

        console.log(`JOB (${this.jobName }): Processing of Direct ibiz opportunities successfully completed.`);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Direct ibiz opportunities failed.`);
        console.error(error);
        throw error;
    }
}

/**
 * Creates or Updates Tenders in FAST
 * @param {Array.Object} Mapped Tenders 
 * @returns 
 */
 async upsertFASTTenders(tx, mappedTenders) {
    const { PT_TMTEND } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    let nextTenderID = await this.getNextTenderID(tx);

    // 1. get a list of existing Tenders with an ExternalID from FAST
    const tendersExistingInFAST = await this.getFASTTenders(tx, mappedTenders);
    // 2. devide mappedTenders into New or Changed tenders
    const FASTNewTenders = [];
    const FASTChangedTenders = [];
    for (const tender of mappedTenders) {
        let FASTTenderIdx = tendersExistingInFAST.findIndex(FASTTender => FASTTender.ExternalID === tender.ExternalID);
        if (FASTTenderIdx > -1) {
            // copy over the TenderID from existing Tender
            tender.TenderID = tendersExistingInFAST[FASTTenderIdx].TenderID;
            FASTChangedTenders.push(tender);
        } else {
            // generate new TenderID
            tender.TenderNo = nextTenderID++;
            const sYear = (new Date().getFullYear()+'').slice(-2);
            let sNewTenderID = "BR-" + sYear + "-" + tender.TenderNo;
            tender.TenderID = sNewTenderID;
            FASTNewTenders.push(tender);
        }
    }
    // 3. Upsert records into PT_TMTEND
    //Update is one by one: https://answers.sap.com/questions/13676137/bulk-update-in-cap-nodejs.html
    console.log(`JOB (${this.jobName }): Upserting IBIZ Tenders into FAST table (PT_TMTEND) ...`);
    try {
        // for (const FASTHierarchy of FASTChangedTenders) {
        //     await tx.run(UPDATE(PT_TMPRDHIER, {HLEVEL6_CODE:FASTHierarchy.HLEVEL6_CODE}).with(FASTHierarchy));
        // }
        FASTNewTenders && FASTNewTenders.length > 0 && await tx.run(INSERT(FASTNewTenders).into(PT_TMTEND));
        console.log(`JOB (${this.jobName }): Upserting of IBIZ Tenders into FAST table (PT_TMTEND) successfully completed.`);
        console.log(`JOB (${this.jobName }): PT_TMTEND -> created: ${FASTNewTenders.length}, updated: ${FASTChangedTenders.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Upserting of IBIZ Tenders into FAST table (PT_TMTEND) failed`);
        console.error(error);
        throw error;
    }
}


/**
 * Creates or Updates Offers in FAST
 * @param {Array.Object} Mapped Offers 
 * @returns 
 */
 async upsertFASTOffers(tx, mappedOffers, mappedTenders) {
    const { PT_TMOFRS, PT_TMTNOFST } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    const tenderIDs = mappedTenders.map(tender => tender.TenderID);
    let nextOfferIDs = await this.getNextOfferIDs(tx, tenderIDs);


    const offerStatusses = [];

    // 1. link existing Tenders with Offers
    for (const [index, offer] of mappedOffers.entries()) {
        offer.TenderID = mappedTenders[index].TenderID;
        let nextOfferNumber = nextOfferIDs.find(id => id.TenderID === offer.TenderID);
        offer.TenderOfferNo =  (nextOfferNumber && nextOfferNumber.NEXTOFFERID++) || 1;
        offer.OfferID = offer.TenderID + '-' + offer.TenderOfferNo;

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

    // delete IBIZ_TECHNICAL_ID before saving to DB
    const offersWithoutID = mappedOffers.map(ofr => { 
        const copy = {...ofr}; 
        delete copy.IBIZ_TECHNICAL_ID; 
        delete copy.NU_DIRETO_INDIRETO;
        return copy;
    });  

    // 3. Upsert records into PT_TMOFRS
    console.log(`JOB (${this.jobName }): Upserting IBIZ Offers into FAST table (PT_TMOFRS) ...`);
    try {
        offersWithoutID && offersWithoutID.length > 0 && await tx.run(INSERT(offersWithoutID).into(PT_TMOFRS));
        offerStatusses && offerStatusses.length > 0 && await tx.run(INSERT(offerStatusses).into(PT_TMTNOFST));
        console.log(`JOB (${this.jobName }): Upserting of IBIZ Offers into FAST table (PT_TMOFRS) successfully completed.`);
        console.log(`JOB (${this.jobName }): PT_TMOFRS -> created: ${offersWithoutID.length}`);
        console.log(`JOB (${this.jobName }): PT_TMTNOFST -> created: ${offerStatusses.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Upserting of IBIZ Offers or OfferStatuses into FAST table (PT_TMOFRS, PT_TMTNOFST) failed`);
        console.error(error);
        throw error;
    }
}


/**
 * Creates Product in FAST
 * @returns 
 */
 async upsertFASTOfferProducts(tx, mappedProducts, mappedOffers) {
    const { PT_TMOFPR, Lots, LotProduct } = this.db.entities("com.bayer.SXTENDER.TransactionalData");

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

         //add status
         lots.push({
            LotID    : product.LotID,
            OfferID  : product.OfferID,
            createdBy: "IBIZ",
            modifiedBy: "IBIZ"
        });

    }

    // delete IBIZ_TECHNICAL_ID before saving to DB
    const productsWithoutID = mappedProducts.map(ofpr => { 
        const copy = {...ofpr}; 
        delete copy.parent_ID; 
        return copy;
    });  

    // 3. Upsert records into PT_TMOFPR
    console.log(`JOB (${this.jobName }): Upserting IBIZ Products into FAST table (PT_TMOFPR) ...`);
    try {
        productsWithoutID && productsWithoutID.length > 0 && await tx.run(INSERT(productsWithoutID).into(PT_TMOFPR));
        lots && lots.length > 0 && await tx.run(INSERT(lots).into(Lots));
        console.log(`JOB (${this.jobName }): Upserting of IBIZ Products into FAST table (PT_TMOFPR) successfully completed.`);
        console.log(`JOB (${this.jobName }): PT_TMOFPR -> created: ${productsWithoutID.length}`);
        console.log(`JOB (${this.jobName }): Lots -> created: ${lots.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Upserting of IBIZ Products into FAST table (PT_TMOFPR) failed`);
        console.error(error);
        throw error;
    }
}


/**
 * Creates Price in FAST
 * PT_TMBDPR
 * @returns 
 */
 async upsertFASTPrice(tx, mappedPrice, mappedOffers) {
    const { PT_TMBDPR } = this.db.entities("com.bayer.SXTENDER.TransactionalData");

    // 1. link existing Tenders and Offer with Products
    for (const price of mappedPrice) {
        let parentOffer = mappedOffers.find(ofr => ofr.IBIZ_TECHNICAL_ID === price.parent_ID);
        price.TenderID = parentOffer.TenderID;
        price.OfferID = parentOffer.OfferID;
    }

    // delete IBIZ_TECHNICAL_ID before saving to DB
    const pricesWithoutID = mappedPrice.map(ofpr => { 
        const copy = {...ofpr}; 
        delete copy.parent_ID; 
        return copy;
    });  

    // 3. Upsert records into PT_TMBDPR
    console.log(`JOB (${this.jobName }): Upserting IBIZ Price into FAST table (PT_TMBDPR) ...`);
    try {
        pricesWithoutID && pricesWithoutID.length > 0 && await tx.run(INSERT(pricesWithoutID).into(PT_TMBDPR));
        console.log(`JOB (${this.jobName }): Upserting of IBIZ Price into FAST table (PT_TMBDPR) successfully completed.`);
        console.log(`JOB (${this.jobName }): PT_TMBDPR -> created: ${pricesWithoutID.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Upserting of IBIZ Price into FAST table (PT_TMBDPR) failed`);
        console.error(error);
        throw error;
    }
}


/**
 * Creates PriceCondition in FAST
 * PRICECONDITION
 * @returns 
 */
 async upsertFASTPriceConditions(tx, mappedPriceCondition, mappedOffers) {
    const { PriceCondition } = this.db.entities("com.bayer.SXTENDER.TransactionalData");

    // 1. link existing Offer with PriceCondition
    for (const pc of mappedPriceCondition) {
        let parentOffer = mappedOffers.find(ofr => ofr.IBIZ_TECHNICAL_ID === pc.parent_ID);
        pc.OfferID = parentOffer.OfferID;
    }

    // delete IBIZ_TECHNICAL_ID before saving to DB
    const priceConditionsWithoutID = mappedPriceCondition.map(ofpr => { 
        const copy = {...ofpr}; 
        delete copy.parent_ID; 
        return copy;
    });  

    // 3. Upsert records into PRICECONDITION
    console.log(`JOB (${this.jobName }): Upserting IBIZ PriceCondition into FAST table (PriceCondition) ...`);
    try {
        priceConditionsWithoutID && priceConditionsWithoutID.length > 0 && await tx.run(INSERT(priceConditionsWithoutID).into(PriceCondition));
        console.log(`JOB (${this.jobName }): Upserting of IBIZ PriceCondition into FAST table (PriceCondition) successfully completed.`);
        console.log(`JOB (${this.jobName }): PriceCondition -> created: ${priceConditionsWithoutID.length}`);
        return true;
    } catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Upserting of IBIZ PriceCondition into FAST table (PriceCondition) failed`);
        console.error(error);
        throw error;
    }
}


/**
 * Gets a list of existing Tenders from FAST with an ExternalID
 * @param {Array} tenders 
 * @returns {Array<PT_TMTEND>} a list of existing tenders
 */
 async getFASTTenders(tx, tenders) {
    if(!tenders || tenders.length === 0){
        console.log(`JOB (${this.jobName }): No Tenders were found in FAST`);
        return [];
    }
    console.log(`JOB (${this.jobName }): Prepare fetching IBIZ Opportunity Tenders from FAST table`);

    // get all the ExternalIDs from tenders
    let externalIDs = [];
    for (const tender of tenders) {
        externalIDs.push(tender.ExternalID);
    }
    console.log(`JOB (${this.jobName }): Start fetching IBIZ Opportunity Tenders from FAST table`);

    // get a list of tenders for given list of ExternalIDs
    const { PT_TMTEND } = this.db.entities("com.bayer.SXTENDER.TransactionalData");
    let result = [];
    Array.isArray(externalIDs) && externalIDs.length > 0 && (result = await tx.run(SELECT.from(PT_TMTEND).where({ ExternalID: { in: externalIDs}, CountryCode: 'BR' } )));
    console.log(`JOB (${this.jobName }): End fetching IBIZ Opportunity Tenders from FAST table`);
    return result;
}

/**
 * Gets a list of existing Distributors from FAST
 * @param {Array} distributors 
 * @returns {Array<PT_TMDIST>} a list of existing distributors
 */
 async getFASTDistributors(tx) {
    console.log(`JOB (${this.jobName }): Start fetching Brazil Distributors from FAST table`);
    // get a list of distributors entities for given list of CustomerIDs
    const { PT_TMDIST } = this.db.entities("com.bayer.SXTENDER.MasterData");
    const result = await tx.run(SELECT.from(PT_TMDIST).where({ CountryCode: 'BR' } ));
    console.log(`JOB (${this.jobName }): End fetching Brazil Distributors from FAST table`);
    return result;
}

/**
 * Gets a list of existing SKUs from FAST
 * @param {Array} SKUs 
 * @returns {Array<PT_TMSKUPRDPCK>} a list of existing SKU
 */
 async getFASTSKUs(tx) {
    console.log(`JOB (${this.jobName }): Start fetching Brazil SKUs from FAST table`);
    // get a list of distributors entities for given list of CustomerIDs
    const { PT_TMSKUPRDPCK } = this.db.entities("com.bayer.SXTENDER.MasterData");
    const result = await tx.run(SELECT.from(PT_TMSKUPRDPCK).where({ CountryCode: 'BR', ActiveRecord: 'Yes' } ));
    console.log(`JOB (${this.jobName }): End fetching Brazil SKUs from FAST table`);
    return result;
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
 async  processIndirectIbizOpportunities(tx, indirectIbizOpportunities, indirectIbizOpportunityItems, existingInstitutesInFAST, existingTenderTypesFAST, existingDistributorsFAST, existingSKUFAST) {
    console.log(`JOB (${this.jobName }): Processing Indirect ibiz Opportunities ...`);
    try {

        // 0 Mapping
        const mappedTenders = this.mapIbizOpportunitiestoFASTTender(indirectIbizOpportunities, existingInstitutesInFAST, existingTenderTypesFAST);
        const mappedOffers = this.mapIbizOpportunitiestoFASTOffer(indirectIbizOpportunities, existingDistributorsFAST);
        const mappedProducts = this.mapIbizOpportunitiestoFASTProduct(indirectIbizOpportunities, indirectIbizOpportunityItems, existingDistributorsFAST, existingSKUFAST);
        const mappedPrice = this.mapIbizOpportunitiestoFASTPrices(indirectIbizOpportunityItems, existingSKUFAST);
        const mappedPriceCondition = this.mapIbizOpportunitiestoFASTPriceCondition(indirectIbizOpportunityItems, existingSKUFAST);

         // 1. Create/update entries in PT_TMTEND
         await this.upsertFASTTenders(tx, mappedTenders);

         // 2. Create/update entries in PT_TMOFRS
         await this.upsertFASTOffers(tx, mappedOffers, mappedTenders);
 
         // 3. Create/update entries in PT_TMOFPR
         await this.upsertFASTOfferProducts(tx, mappedProducts, mappedOffers);

         // 4. Create/update entries in PT_TMBDPR
         await this.upsertFASTPrice(tx, mappedPrice, mappedOffers);

         // 5. Create/update entries in PRICECONDITION
         await this.upsertFASTPriceConditions(tx, mappedPriceCondition, mappedOffers);
 
         // 6. Delete all records from IbizQPS and IbizCcsQpsItems after successful processing.
         const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
         await tx.run(DELETE.from(IbizQps).where({NU_DIRETO_INDIRETO: 1}));
         const { IbizCcsQpsItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
         const parentIDs = mappedProducts.map(pr => pr.parent_ID);
         Array.isArray(parentIDs) && parentIDs.length > 0 && await tx.run(DELETE.from(IbizCcsQpsItems).where({parent_ID: {in: parentIDs}}));

        console.log(`JOB (${this.jobName }): Processing of Indirect ibiz opportunities successfully completed.`);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Indirect ibiz opportunities failed.`);
        console.error(error);
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
        const instituteID = institute && institute.InstituteID || null;
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
                PublicationDate      : curr.DT_ABERTURA,
                BidDueDate           : curr.DT_FIM_ACOLHIMENTO,
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
                AlternativeID        : curr.ID_ALTERNATIVO,
                IbizLicitaID         : curr.ID_LICITACAO_IBIZ_LICITA,
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
mapIbizOpportunitiestoFASTOffer(ibizOpportunities, existingDistributorsFAST) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMOFRS ...`);
    ibizOpportunities = ibizOpportunities.reduce((prev, curr, idx, ibizOpportunities) => {
        const cnpj = curr.COD_DONO_QP && curr.COD_DONO_QP.replace(/\D/g,'');
        const distributor = (curr.NU_DIRETO_INDIRETO === 0) ? existingDistributorsFAST.find(dist => dist.DistributorName === "Bayer Brazil") : existingDistributorsFAST.find(dist => dist.CNPJ === cnpj);
        const distributorID = distributor && distributor.DistributorID || null;
        prev.push(
            {
                IBIZ_TECHNICAL_ID     : curr.ID, // this ID will be used to create relationship with the items and will be deleted afterwards
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
                InternalBidDueDate    : curr.DT_FIM_ACOLHIMENTO,
                SellingCompany        : "BBR",
                ProductCount          : 0,
                Currency              : "BRL",
                ManualSaveStatus      : null,
                WholesaleOffer        : "No",
                Comment               : null,
                OfferRevisionSplitNo  : null,
                NewOfferDueDate       : curr.DT_FIM_ACOLHIMENTO,
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
                PreviousIbizWorkflowID : curr.ID_PRE_QP,
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
mapIbizOpportunitiestoFASTProduct(directIbizOpportunities, directIbizOpportunityItems, existingDistributorsFAST, existingSKUFAST) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMOFPR ...`);
    directIbizOpportunityItems = directIbizOpportunityItems.reduce((prev, curr, idx, directIbizOpportunityItems) => {
        const sku = existingSKUFAST.find(sku => sku.SKUCode == curr.COD_REFERENCIA);
        const productPackID = sku && sku.ProductPackID || null;
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
                SampleQuantity           : null,
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
                SORTER                   : null,
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
    return directIbizOpportunityItems;

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
        const productPackID = sku && sku.ProductPackID || null;
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
 mapIbizOpportunitiestoFASTPriceCondition(indirectIbizOpportunityItems, existingSKUFAST) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PriceCondition ...`);
    indirectIbizOpportunityItems = indirectIbizOpportunityItems.reduce((prev, curr, idx, indirectIbizOpportunityItems) => {
        const sku = existingSKUFAST.find(sku => sku.SKUCode == curr.COD_REFERENCIA);
        const productPackID = sku && sku.ProductPackID || null;
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
                PriceList                           : curr.VLR_BASE_CALCULO_UNITARIO,
                ICMSTax                             : curr.NU_PORCENTAGEM_ICMS,
                TaxExemption                        : (!curr.NU_PORCENTAGEM_ICMS) ? 'No' : 'Yes',
                PriceAfterTaxExemtion               : (!curr.NU_PORCENTAGEM_ICMS) ? null : (curr.VLR_BASE_CALCULO_UNITARIO * (1 - curr.NU_PORCENTAGEM_ICMS)),
                CAP                                 : (curr.NU_CAP === 0) ? 'No' : 'Yes',
                PriceAfterCap                       : (curr.NU_CAP === 1) ? ((1 - curr.NU_PORCENTAGEM_CAP) * (1 - curr.NU_PORCENTAGEM_ICMS) * curr.VLR_BASE_CALCULO_UNITARIO) : (1 * (1 - curr.NU_PORCENTAGEM_ICMS) * curr.VLR_BASE_CALCULO_UNITARIO) ,
                CommercialProposal                  : curr.VLR_UNITARIO,
                TaxEqualization                     : null, 
                Invoive                             : null, 
                ICMS                                : null, 
                NetPrice                            : null 
            }
        );
        return prev;
    }, []);
    return indirectIbizOpportunityItems;

}



/**
 * Gets the next highest value for a given field from table
 * @param {*} table 
 * @param {*} fieldname 
 * @returns - next highest value
 */
 async getNextValue (tx, table, fieldname, countryCode,){
    let nextValue = 1;
    try {
        let results = [];
        if(countryCode){
            results = await tx.run(SELECT.from(table, ['Max(' + fieldname + ') as max']).where({CountryCode: countryCode}));
        }else{
            results = await tx.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
        }
        if (results[0].max) {
            nextValue = results[0].max + 1
        }
        return nextValue;
    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Fetching next highest value for ${fieldname} from ${table.name} failed`);
        console.error(error);
        throw error;
    }
}

};