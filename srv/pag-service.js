const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');
const axios = require('axios');
const qs = require("qs");
const path = require('path');
const Piscina = require('piscina')
//const { findIndex } = require('lodash'); This will cause a deploy issue and is automatically added by auto complete beceause of the use of FindIndex (new javascript not needed with lodash)

module.exports = async (srv) => {

    const db = await cds.connect.to('db'); // connect to database service
    const { SchedulerApiConfig, SchedulerApiConfigUsers, SchedulerApiConfigOAuth } = db.entities("com.bayer.SXTENDER.AdminData");

    // get api config
    const priceAgreementApi = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'PriceAgreement' }));
    const oauthAuth = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, priceAgreementApi.OAuth_ID));

    const {
        CustomerPrices,
        NewMaterialsView,
        NewFOCMaterialsView,
        PriceAgreements,
        CustomerPricesQC,
        PriceAgreement_APPRST //EJUVE-CR3 START
    } = cds.entities("com.bayer.SXTENDER.PriceAgreementData");

    const {
        MostRecentConsumerPricesView, MostRecentMasterPricesView
    } = cds.entities("com.bayer.SXTENDER.MasterDataViews");

    const {
        PT_TMINST, PT_TMPRDPCK, PT_TMSKUPRDPCK
    } = cds.entities("com.bayer.SXTENDER.MasterData");

    const {
        PriceAgreementFOC,
        Deliveries
    } = cds.entities("com.bayer.SXTENDER.PriceAgreementDataViews");

    const {
        PT_TMUSER
     } = cds.entities("com.bayer.SXTENDER.AdminData");

    const {
        PT_TMTEND, PT_TMOFPR, PT_TMOFRS, PriceCondition, FreeGoodsOther, DiscountCondition, SpainRappelData
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");

    const {
        PriceConditionView
    } = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");


    //we needed 2 separate views fr the priceagreements, as we are doing a join to display extra data on the master page.
    //having the new view for the master page, implied that filtering was not executed anymore.
    //Therefore, all filtering logic has been moved to a separate function, and is being called when reading both PriceAgreements entity as PriceAgreementsMasterView view.
    srv.on('READ', 'PriceAgreements', async (req, next) => {
        return await filterPriceAgreements(req, next);
    });
//EJUVE-CR3 START
    srv.on('READ', 'PriceAgreementsMasterView', async (req, next) => {
        return await filterPriceAgreements(req, next);
    });
    srv.on('READ', 'PriceagreementOffers', async (req) => {
        // const tx = cds.transaction(req);
        //console.log("Inside Approval Offers");
        const tx = cds.tx(req);
        let results = await buildWorkflowApprovalOffers(tx);
        console.log(results,"results");
        return results;
    });

    async function getOffersForWorkflow(tx, approvalStatus) {
        let whereStatus = ServiceHelper.buildFullWhere("ApprovalStatus", "=", approvalStatus);

        let workflowApprovals = await tx.run(SELECT.from(PriceAgreement_APPRST).where(whereStatus));
        let workflowOffers = workflowApprovals.map((d) => d.PriceAgreementID);
        return R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), workflowOffers);
    }
    async function buildWorkflowApprovalOffersEntry(tx, Id, approvalStatus) {
        console.log(Id,"ID");
        let whereOffer = ServiceHelper.buildFullWhere("ID", "=", Id);
        let whereAPPRST = ServiceHelper.buildFullWhere("PriceAgreementID", "=", Id);
        let whereStatus = ServiceHelper.buildFullWhere("ApprovalStatus", "=", 'Processing');
        
        let workflowApprovals = await tx.run(SELECT.from(PriceAgreement_APPRST).where(whereAPPRST).where(whereStatus));
        workflowApprovals=workflowApprovals[0];
        
        let CustomerDetails = await tx.run(SELECT .from(CustomerPrices).where(whereAPPRST));
        console.log(CustomerDetails,"Customer Details");
        let createdby =ServiceHelper.buildFullWhere("CWID", "=",workflowApprovals.createdBy);
        // let offerValidation = await buildOfferValidation(tx, whereOffer);
        let offerValidation = await tx.run(SELECT.from(PriceAgreements).where(whereOffer));
        offerValidation=offerValidation[0];

        let UserDetails = await tx.run(SELECT.from(PT_TMUSER).where(createdby));
        console.log(UserDetails,"detail");
                
        let whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", offerValidation.InstituteId);
        
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereInstituteId));
        
        let whereproductId = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", offerValidation.ProductPackId);

        let productDetail = await tx.run(SELECT.one.from(PT_TMPRDPCK).where(whereproductId));
        
        
        return {
            PriceagreementID: offerValidation.ID,
            TenderID: offerValidation.TenderId,
            OfferID: offerValidation.OfferId,
            InstituteID: offerValidation.InstituteId,
            InstituteName: institute.InstituteName,
            CustomerID: institute.CustomerID,
            ProductPackID: offerValidation.ProductPackId,
            ProductPackNAME:productDetail.PRODUCTPACKNAME,
            Status:workflowApprovals.ApprovalStatus,
            ID:workflowApprovals.ID,
            EffectiveDate: workflowApprovals.EffectiveDate.split('T')[0],
            ExpiryDate: workflowApprovals.ExpiryDate.split('T')[0],
            OldExpiryDate: offerValidation.OldExpiryDate.split('T')[0],
            UserEmail:UserDetails[0].UserEmail
        }
    }
    async function buildWorkflowApprovalOffers(tx) {
        let results = [];

        let waitingOffers = await getOffersForWorkflow(tx, "Processing");

        for (let i = 0; i < waitingOffers.length; i++) {
            let newEntry = await buildWorkflowApprovalOffersEntry(tx, waitingOffers[i], "Processing");
            console.log(newEntry,"New Entry");
            if (newEntry.PriceagreementID) results.push(newEntry);
        }

        return results;
    }
    //EJUVE-CR3 END
    async function filterPriceAgreements(req, next) {
         // if (req._.odataReq._url.path.includes('$count') || req.query.SELECT.columns[0].func === 'count') {
        //     return [{ counted: 5555 }]; 
        // } 

        let start;
        let end;
        let totalTime = 0;
        let type = "";
        console.log("Start price agreements");
        if (req?.query?.SELECT?.columns?.length > 0 && req?.query?.SELECT?.columns[0]?.func === "count") {
            console.log("Running price agreements for count");
            type = "COUNT";
        }
        const startTrace = (entity) => {
            start = new Date();
            console.log(`${type}Start fetching all ${entity} at ${start}`);
        };
        const stopTrace = (entity) => {
            if (!start) return; //not started
            end = new Date();
            console.log(`${type}Finished fetching all ${entity} at ${end}`);
            let duration = (end - start) / 1000;
            totalTime += duration;
            console.log(`${type}Fetching ${entity} took: ${duration} seconds`);
        };

        // const tx = cds.transaction(req);
        const tx = cds.tx(req);

        /**
         * As virtual/calculated elements are not persisted on the database, incoming filter requests cannot be delegated to the database to get the requested filter results. 
         * The filter for virtual/calculated elements must be implemented in the NodeJS layer. 
         * For each calculated filter element, we first remove the filter, get the data and filter the results in the Nodejs layer.
         */


        // 1. remove the hasNewMaterials filter from the request if it exists 
        let hasNewMaterialsFilterIndex = null;
        let hasNewMaterialsFilterValues = null;
        let hasNewPriceFilterIndex = null;
        let hasNewPriceFilterValues = null;
        let hasExpiringSoonFilterIndex = null;
        let hasExpiringSoonFilterValues = null;
        let isNewPriceAgreementFilterIndex = null;
        let hasNewYLLPIndex = null;
        let hasNewYLAPIndex = null;
        let isNewPriceAgreementFilterValues = null;
        let hasExpiredFilterIndex = null;
        let hasExpiredFilterValues = null;
        let isCancelledFilterIndex = null;
        let isCancelledFilterValues = null;
        let isSynchronizedFilterIndex = null;
        let isSynchronizedFilterValues = null;
        let appliedCountFilterIndex = null;
        let appliedCountFilterValues = null;
        let hasNewYLLPValues = null;
        let hasNewYLAPValues = null;
        let hasFilter = false;
        let hasProductPackIdIndex = null;
        let hasProductPackIdValues = null;

        if (req.query.SELECT.where) {

            hasNewMaterialsFilterIndex = ServiceHelper.getWhereId(req, 'hasNewMaterials');
            hasNewMaterialsFilterValues = ServiceHelper.getWhereValues(req, 'hasNewMaterials');

            hasNewPriceFilterIndex = ServiceHelper.getWhereId(req, 'hasNewPrice');
            hasNewPriceFilterValues = ServiceHelper.getWhereValues(req, 'hasNewPrice');

            hasExpiringSoonFilterIndex = ServiceHelper.getWhereId(req, 'ExpiringSoon');
            hasExpiringSoonFilterValues = ServiceHelper.getWhereValues(req, 'ExpiringSoon');

            hasExpiredFilterIndex = ServiceHelper.getWhereId(req, 'Expired');
            hasExpiredFilterValues = ServiceHelper.getWhereValues(req, 'Expired');

            isCancelledFilterIndex = ServiceHelper.getWhereId(req, 'isCancelled');
            isCancelledFilterValues = ServiceHelper.getWhereValues(req, 'isCancelled');

            isNewPriceAgreementFilterIndex = ServiceHelper.getWhereId(req, 'isNewPriceAgreement');
            isNewPriceAgreementFilterValues = ServiceHelper.getWhereValues(req, 'isNewPriceAgreement');

            isSynchronizedFilterIndex = ServiceHelper.getWhereId(req, 'Synchronized');
            isSynchronizedFilterValues = ServiceHelper.getWhereValues(req, 'Synchronized');

            appliedCountFilterIndex = ServiceHelper.getWhereId(req, 'AppliedCount');
            appliedCountFilterValues = ServiceHelper.getWhereValues(req, 'AppliedCount');

            hasNewYLLPIndex = ServiceHelper.getWhereId(req, 'hasNewYLLP');
            hasNewYLLPValues = ServiceHelper.getWhereValues(req, 'hasNewYLLP');

            hasNewYLAPIndex = ServiceHelper.getWhereId(req, 'hasNewYLAP');
            hasNewYLAPValues = ServiceHelper.getWhereValues(req, 'hasNewYLAP');

            hasProductPackIdIndex = ServiceHelper.getWhereId(req, 'hasProductPackId');
            hasProductPackIdValues = ServiceHelper.getWhereValues(req, 'hasProductPackId');

            if (hasProductPackIdIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'hasProductPackId');
                hasFilter = true;
            }

            if (hasNewMaterialsFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'hasNewMaterials');
                hasFilter = true;
            }

            if (hasNewPriceFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'hasNewPrice');
                hasFilter = true;
            }

            if (hasExpiringSoonFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'ExpiringSoon');
                hasFilter = true;
            }

            if (hasExpiredFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'Expired');
                hasFilter = true;
            }

            if (isCancelledFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'isCancelled');
                hasFilter = true;
            }

            if (isNewPriceAgreementFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'isNewPriceAgreement');
                hasFilter = true;
            }

            if (isSynchronizedFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'Synchronized');
                hasFilter = true;
            }

            if (appliedCountFilterIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'AppliedCount');
                hasFilter = true;
            }

            if (hasNewYLLPIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'hasNewYLLP');
                hasFilter = true;
            }

            if (hasNewYLAPIndex >= 0) {
                ServiceHelper.deleteFilter(req, 'hasNewYLAP');
                hasFilter = true;
            }
        }
        //delete limit from request to SELECT all data from table
        // delete req.query.SELECT.limit
        //run default query on db
        // const data = await next();// do not use because it does not behaves as expected in case of count
        let data = [];
        let paQuery = SELECT.from(req.query.SELECT.from);
        if (req.query.SELECT.columns?.[0]?.func !== "count") {
            paQuery.columns(req.query.SELECT.columns);
        }
        if (!hasFilter) {
            console.log("Fetch using limit Priceagreements - no filters");
            req.query.SELECT.limit && (paQuery.limit(req.query.SELECT.limit));
            // data = await tx.run(SELECT.from(PriceAgreements).columns(req.query.SELECT.columns).where(req.query.SELECT.where).orderBy(req.query.SELECT.orderBy));
        }
        req.query.SELECT.where && (paQuery.where(req.query.SELECT.where));
        req.query.SELECT.orderBy && (paQuery.orderBy(req.query.SELECT.orderBy));

        startTrace("PriceAgreements");
        data = await tx.run(paQuery);
        // if the query returns only one value, that value is an object and not an array
        // we need to convert it to array because the code below expects an array
        if(!Array.isArray(data)){
            data = [data];
        }
        stopTrace("PriceAgreements");

        //return directly without filters
        if (req.query.SELECT.columns?.[0].func === 'count' && !hasFilter) {
            console.log(`COUNT: Total time trace fetching Price Agreements: ${totalTime}`);
            return [{ counted: data.length }];
        }
        //return directly without filters and not for only one (selection by keys)
        if (!req.query.SELECT.one && !hasFilter) {
            return data;
        }
        // const customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: ids } }));
        // let ids = [];
        // //use only one loop instead of multiple map functionslet ids = [];
        //use only one loop instead of multiple map functions
        startTrace("PrepareKeysForOtherQueries");
        // Divide the data into chunks
        const chunks = splitToChunks(data, 1000);
        // Run operation on the chunks parallely
        let pkWorkerResults = [];
        try{
            // Create a new thread pool
            // resourceLimits.maxOldGenerationSizeMb This is a very important parameter and this defines the max memory used by the worker thread. 
            // By default, it depends on the system how much max memory a worker thread can use but it is always good to set the max limit otherwise 
            // the worker thread will get terminated on reaching the limit
            const pkPool = new Piscina({ 
                filename: path.resolve(__dirname, 'workers/PrepareKeysWorker')
            });
            const pkWorkerPromises = chunks.map(chunk => pkPool.run(chunk));
            pkWorkerResults = await Promise.all(pkWorkerPromises);
            pkPool.destroy();
        }catch(err){
            console.error("PrepareKeysWorker stopped");
            console.error(err);
            throw err;
        }

        let ids = [];
        let offers = [];
        let institutes = [];
        let countrycodes = [];
        let productpacks = [];
        let productpacksstr = [];

        for(const workerResult of pkWorkerResults){
            ids = ids.concat(workerResult.ids);
            offers = offers.concat(workerResult.offers);
            institutes = institutes.concat(workerResult.institutes);
            countrycodes = countrycodes.concat(workerResult.countrycodes);
            productpacks = productpacks.concat(workerResult.productpacks);
            productpacksstr = productpacksstr.concat(workerResult.productpacksstr);
        }
        stopTrace("PrepareKeysForOtherQueries");
        
        let customerPricesAll = [];
        let customerPricesInPA = true;
        let priceConditionsAll = [];
        //let priceConditionsInPa = true;
        let mostRecentMasterPricesAll = [];
        let consumerPricesAll = [];
        let consumerPricesInPA = true;
        let newMaterialsAll = [];
        let newFOCMaterialsAll = [];
        let OfferProductsAll = [];
        let institutesAll = [];

        if (ids && ids.length > 0) {
            startTrace("CustomerPrices");
            if (req.query.SELECT.columns?.[0].func === 'count' || req.query.SELECT.columns.findIndex(col => col?.ref?.length > 0 && col?.ref[0] === 'CustomerPrices') === -1) {
                customerPricesInPA = false;
                customerPricesAll = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: ids } }));
            }
            stopTrace("CustomerPrices");
            if (req.query.SELECT.one || hasNewMaterialsFilterIndex >= 0) {
                startTrace("NewMaterialsView");
                newMaterialsAll = await tx.run(SELECT.from(NewMaterialsView).where({ PriceAgreementId: { in: ids } }));
                stopTrace("NewMaterialsView");

                startTrace("NewFOCMaterialsView");
                newFOCMaterialsAll = await tx.run(SELECT.from(NewFOCMaterialsView).where({ PriceAgreementId: { in: ids } }));
                stopTrace("NewFOCMaterialsView");
            }
        }

        if(institutes && institutes.length > 0) {
            startTrace("Institutes");
            institutesAll = await tx.run(SELECT.from(PT_TMINST).where({ InstituteId: { in: institutes } }));
            stopTrace("Institutes");
        }

        if (countrycodes && countrycodes.length > 0 && productpacks && productpacks.length > 0) {
            if (offers && offers.length > 0) {
                startTrace("OfferProducts");
                OfferProductsAll = await tx.run(SELECT.from(PT_TMOFPR)
                    .where({
                        CountryCode: { in: countrycodes },
                        and: {
                            ProductCode: { in: productpacks }
                        /*  and: {
                                OfferID: { in: offers }
                            }*/
                        }
                    })
                );
                stopTrace("OfferProducts");
            }
            startTrace("MostRecentMasterPricesView");
            mostRecentMasterPricesAll = await tx.run(SELECT.from(MostRecentMasterPricesView)
                .where({
                    CountryCode: { in: countrycodes },
                    and: {
                        ProductPackId: { in: productpacksstr }
                    }
                })
            );
            stopTrace("MostRecentMasterPricesView");

            startTrace("MostRecentConsumerPricesView");
            if (req.query.SELECT.columns?.[0].func === 'count' || req.query.SELECT.columns.findIndex(col => col?.ref?.length > 0 && col?.ref[0] === 'ConsumerPrice') === -1) {
                consumerPricesInPA = false;
                consumerPricesAll = await tx.run(SELECT.from(MostRecentConsumerPricesView)
                    .where({
                        CountryCode: { in: countrycodes },
                        and: {
                            ProductPackId: { in: productpacksstr }
                        }
                    })
                );
            }
            stopTrace("MostRecentConsumerPricesView");
        }


        let mainConditionIDs = [];
        let rappelConditionIDs = [];
        let focConditionIDs = [];
        let priceConditionAll = [];
        let priceConditionRappelAll = [];
        let discountConditionsAll = [];
        let priceConditionFOCAll = [];
        if (countrycodes && countrycodes.length > 0 ){
        if (req.query.SELECT.one || ( countrycodes[0].CountryCode === 'ES' && ( hasNewYLLPValues && hasNewYLLPValues.length > 0 || hasNewYLAPValues && hasNewYLAPValues.length > 0))) {
            for (const condition of priceConditionsAll) {
                if (condition.isMain === true || (condition.PriceConditionClassification && condition.PriceConditionClassification.isMain === true)) {
                    mainConditionIDs.push(condition.ExistingPriceConditionID);
                }
                if (condition.ConditionType === 'Rappel' || (condition.PriceConditionClassification && condition.PriceConditionClassification.ConditionType === 'Rappel')) {
                    rappelConditionIDs.push(condition.ExistingPriceConditionID);
                }
                if (condition.ConditionType === 'FOC' || (condition.PriceConditionClassification && condition.PriceConditionClassification.ConditionType === 'FOC')) {
                    focConditionIDs.push(condition.ExistingPriceConditionID);
                }
            }
            if (mainConditionIDs && mainConditionIDs.length > 0) {
                startTrace("PriceCondition");
                priceConditionAll = await tx.run(SELECT.from(PriceCondition).where({ ID: { in: mainConditionIDs } }));
                stopTrace("PriceCondition");
            }

            if (rappelConditionIDs && rappelConditionIDs.length > 0) {
                startTrace("RappelPriceCondition");
                priceConditionRappelAll = await tx.run(SELECT.from(PriceCondition).where({ ID: { in: rappelConditionIDs } }));
                stopTrace("RappelPriceCondition");
            }

            if (rappelConditionIDs && rappelConditionIDs.length > 0) {
                startTrace("DiscountCondition");
                discountConditionsAll = await tx.run(SELECT.from(DiscountCondition).where({ PriceCondition_ID: { in: rappelConditionIDs } }));
                stopTrace("DiscountCondition");
            }

            if (focConditionIDs && focConditionIDs.length > 0) {
                startTrace("FOCPriceCondition");
                priceConditionFOCAll = await tx.run(SELECT.from(PriceCondition).where({ ID: { in: focConditionIDs } }));
                stopTrace("FOCPriceCondition");
            }
        }
    }
        // use == instead of === in filters and finds because type of productpackid is different between two tables || maybe this is also the case for others
        // 2. calculate the fields
        // Calculation is done by a worker
        startTrace("CalculateFields");

        const requiredParameters = {
            //priceConditionsInPa,
            institutesAll,
            customerPricesInPA,
            customerPricesAll,
            mostRecentMasterPricesAll,
            newMaterialsAll,
            newFOCMaterialsAll,
            consumerPricesInPA,
            consumerPricesAll,
            hasNewMaterialsFilterIndex,
            req_query_SELECT_one: req.query.SELECT.one || false,
            hasNewYLLPValues,
            hasNewYLAPValues,
            priceConditionsAll,
            OfferProductsAll,
            priceConditionRappelAll,
            discountConditionsAll,
            priceConditionFOCAll
        };

        // Create a new thread pool
        const cfPool = new Piscina({ 
            filename: path.resolve(__dirname, 'workers/CalculateFieldsWorker')
        });
        // Run operation on the chunks parallely
        const cfWorkerPromises = chunks.map(chunk => cfPool.run({chunk, requiredParameters}));
        const cfWorkerResults = await Promise.all(cfWorkerPromises);
        cfPool.destroy();

        let result = [];
        for(const workerResult of cfWorkerResults){
            result = result.concat(workerResult);
        }

        stopTrace("CalculateFields");
        // const promises = Array.isArray(data) ? data.map(calculateFields) : [calculateFields(data)];

        // let result = await Promise.all(promises);

        startTrace("apply filters");
        //3. return the filtered results if calculated filter is used
        if (hasNewMaterialsFilterValues && hasNewMaterialsFilterValues.length > 0) {
            // before performance
            // const filteredResult = result.filter(priceAgreement => priceAgreement.hasNewMaterials && priceAgreement.hasNewMaterials === hasNewMaterialsFilterValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.hasNewMaterials && priceAgreement.hasNewMaterials === hasNewMaterialsFilterValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (hasNewPriceFilterValues && hasNewPriceFilterValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.hasNewPrice && priceAgreement.hasNewPrice === hasNewPriceFilterValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.hasNewPrice && priceAgreement.hasNewPrice === hasNewPriceFilterValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (hasExpiringSoonFilterValues && hasExpiringSoonFilterValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.ExpiringSoon);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.ExpiringSoon){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (hasExpiredFilterValues && hasExpiredFilterValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.Expired === hasExpiredFilterValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.Expired === hasExpiredFilterValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (isNewPriceAgreementFilterValues && isNewPriceAgreementFilterValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.isNewPriceAgreement === isNewPriceAgreementFilterValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.isNewPriceAgreement === isNewPriceAgreementFilterValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (isCancelledFilterValues && isCancelledFilterValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.isCancelled === isCancelledFilterValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.isCancelled === isCancelledFilterValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (isSynchronizedFilterValues && isSynchronizedFilterValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.Synchronized === isSynchronizedFilterValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.Synchronized === isSynchronizedFilterValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (appliedCountFilterValues && appliedCountFilterValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.AppliedCount >= appliedCountFilterValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.AppliedCount >= appliedCountFilterValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }

        if (hasNewYLLPValues && hasNewYLLPValues.length > 0 || hasNewYLAPValues && hasNewYLAPValues.length > 0) {
            let filteredResult;
            if (hasNewYLLPValues && hasNewYLLPValues.length > 0 && hasNewYLAPValues && hasNewYLAPValues.length > 0) {
                // filteredResult = result.filter(priceAgreement => priceAgreement.hasNewYLLP === hasNewYLLPValues[0] || priceAgreement.hasNewYLAP === hasNewYLAPValues[0]);
                // after performance
                let filteredResult2 = [];
                for(const priceAgreement of result){
                    if(priceAgreement.hasNewYLLP === hasNewYLLPValues[0] || priceAgreement.hasNewYLAP === hasNewYLAPValues[0]){
                        filteredResult2.push(priceAgreement);
                    }
                }
                filteredResult = filteredResult2;
            } else if (!hasNewYLLPValues || (hasNewYLLPValues && hasNewYLLPValues.length === 0)) {
                // filteredResult = result.filter(priceAgreement => priceAgreement.hasNewYLAP === hasNewYLAPValues[0]);
                // after performance
                let filteredResult2 = [];
                for(const priceAgreement of result){
                    if(priceAgreement.hasNewYLAP === hasNewYLAPValues[0]){
                        filteredResult2.push(priceAgreement);
                    }
                }
                filteredResult = filteredResult2;
            } else if (!hasNewYLAPValues || (hasNewYLAPValues && hasNewYLAPValues.length === 0)) {
                // filteredResult = result.filter(priceAgreement => priceAgreement.hasNewYLLP === hasNewYLLPValues[0]);
                // after performance
                let filteredResult2 = [];
                for(const priceAgreement of result){
                    if(priceAgreement.hasNewYLLP === hasNewYLLPValues[0]){
                        filteredResult2.push(priceAgreement);
                    }
                }
                filteredResult = filteredResult2;
            }
            result = filteredResult;
        }

        if (hasProductPackIdIndex && hasProductPackIdValues.length > 0) {
            // const filteredResult = result.filter(priceAgreement => priceAgreement.ProductPackId === hasProductPackIdValues[0]);
            // after performance
            let filteredResult = [];
            for(const priceAgreement of result){
                if(priceAgreement.ProductPackId === hasProductPackIdValues[0]){
                    filteredResult.push(priceAgreement);
                }
            }
            result = filteredResult;
        }
//EFRCL- 358586- Italy- Price agreements - search function shows limited results
        stopTrace("apply filters");
        //startTrace("Commit");
        //await tx.commit();
        //stopTrace("Commit");
        if (req.query.SELECT.columns?.[0].func === 'count') {
            console.log(`COUNT WITH FILTER: Total time trace fetching Price Agreements: ${totalTime}`);
            return [{ counted: result.length }];
        }
        if (hasFilter) {
            startTrace("SkipTop");
            const limit = req.query.SELECT.limit;
            let startFrom = 0;
            let endAt = 0;
            if (limit?.offset?.val) {
                startFrom = limit?.offset?.val;
            }
            if (limit?.rows?.val) {
                endAt = startFrom + limit.rows.val;
            }
            if (endAt > 0) {
                result = result.slice(startFrom, endAt);
            } else if (startFrom > 0) {
                result = result.slice(startFrom);
            }
            stopTrace("SkipTop");
        }
        console.log(`Total time trace fetching Price Agreements: ${totalTime}`);
        //otherwise keep as is
        req.query.count = true;
        if(req.query.cqn){
            req.query.cqn.count = true;
        }
        // result.$count = result.length;
        return req.reply(result);
    };

//EHQUT-305028-Italy-Delivery monitoring never worked
    srv.after('READ', 'PriceAgreements', async (data) => {
        const tx = db.tx();
        // Calculate DeliveredVolume 
        for (let each of data) await calculateDeliveredVolume(each);
        async function calculateDeliveredVolume(pag) {
            let deliveries = pag.Deliveries;
            if (!deliveries) {
                try {
                    deliveries = await tx.run(SELECT.from(Deliveries).where({ PriceAgreementId: pag.ID }));
                    // await tx.commit();
                } catch (e) {
                    // await tx.rollback(e)
                    console.log(e);
                }
            }
            pag.DeliveredVolume = deliveries.reduce((sum, delivery) => sum + delivery.LFIMG, 0);
        }
    });

  //EHQUT-Italy - Synchronize button becomes available again when user changes expiry date
//     srv.after('READ', 'CustomerPrices', async (req) => {
         
//         const tx = cds.tx(req);
//        if(req && req.length > 0){
        
//         let whereCountry =req[0].ID ;
//         if(whereCountry){
//             const customerPrices = await tx.run(UPDATE(CustomerPrices).with({ Synchronized:false }).where({ ID: whereCountry }));
//             await tx.commit();
//             return customerPrices;
//         }else{
//             return "";
//         }
//     }
        
//     });
//EHQUT-INC20428207-Incorrect resynchornization on Material Change cases
 //EHQUT- Italy - Synchronize button becomes available again when user changes expiry date
    srv.on('syncPriceAgreements', async req => {
        // const tx = cds.transaction(req);
        const tx = cds.tx(req);
        var AllMaterialNumber=[];
        let customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: req.data.ids } }));
        if(customerPrices && customerPrices.length > 0){
            let Countrycode=customerPrices[0].CountryCode;

            if(Countrycode ==='ES'){

                for(var i =0; i<customerPrices.length; i++){
                    AllMaterialNumber.push(customerPrices[i].MaterialNumber);
                }
               
                const ActiveMaterial = await tx.run(SELECT .from(PT_TMSKUPRDPCK).where({ CountryCode: 'ES', ActiveRecord: 'Yes' , SKUCode: {in : AllMaterialNumber}}));

                if(ActiveMaterial.length >0){
                    const materials= ActiveMaterial.map(item =>item.SKUCode);
                         
                    customerPrices =await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: req.data.ids } , MaterialNumber : {in : materials}}));
                }
                     
              
               
            }
            }
        if (customerPrices && customerPrices.length <= 0) {
            return req.reject(404, `No customer prices were found for the following PriceAgreement: ${req.data.ids}`);
        }

        // cds.spawn({},async (tx) => { //TODO: would be better to run via spawn
        syncPriceAgreements(req.data.ids, customerPrices);//run without waiting

       // await syncPriceAgreements(req.data.ids, customerPrices);//run without waiting
        // });
        return req.reply();
    });
    async function syncPriceAgreements(pas, customerPrices) {
        console.log(`Start synchronisation of PriceAgreements`);

        console.log(`Prepare categories of customer prices`);
        const mainPriceConditions = customerPrices.filter(item => item.PriceCondition === "YLTP" || item.PriceCondition === "YLTF" || item.PriceCondition === "YL60" || item.PriceCondition === "YDC0");
        const focPriceConditions = customerPrices.filter(item => item.PriceCondition === "YA03" || item.PriceCondition === "YA01");
        const rappelPriceConditions = customerPrices.filter(item => item.PriceCondition === "YAW1" || item.PriceCondition === "YAW2");
        const allCustomerPrices = mainPriceConditions.concat(focPriceConditions).concat(rappelPriceConditions);

        (!allCustomerPrices || allCustomerPrices.length === 0) && console.log("Nothing to process");
        await setStatusPriceAgreement(allCustomerPrices.map(cp => cp.PriceAgreementId), 'RUNNING');

        console.log(`Prepare requests of customer prices`);
        const updateMainConditionPromises = mainPriceConditions.map(custPrice => updateCustomerPrice(custPrice));
        //EHQUT-386660-Italy-Issue with FoC synchronization

        const updateFOCConditionPromises = focPriceConditions.map((custPrice,index) => updateFOCcustPrices(custPrice,index));
       // const updateFOCConditionPromises = focPriceConditions.map((custPrice) => updateFOCcustPrices(custPrice));

        const updateRappelConditionPromises = rappelPriceConditions.map(custPrice => updateRappelcustPrices(custPrice));

        // Synchronize
        console.log(`Process requests of customer prices`);
        let result = await Promise.all(updateMainConditionPromises.concat(updateFOCConditionPromises).concat(updateRappelConditionPromises));
        result = result.filter(res => res !== undefined);

        console.log(`Process responses of customer prices`);
        const mappedCustomerPrices = result.map((res, idx) => res?.headers?.sapidocdbid ? allCustomerPrices[index] : res);//get customerprice for related response

        const paWithErrorsIds = mappedCustomerPrices.filter(req => !req.status).map(req => req.customerPrice.PriceAgreementId); //in case one of the promises returns false -> it means there was an error
        await setStatusPriceAgreement(paWithErrorsIds, 'ERROR');

        let paWithoutErrorsIds = mappedCustomerPrices.filter(req => req.status); //in case one of the promises returns false -> it means there was an error
        paWithoutErrorsIds = paWithoutErrorsIds.filter(paWE => paWithErrorsIds.findIndex(paE => paE === paWE.customerPrice.PriceAgreementId) === -1);//do not keep the ones that are already in error

        // Set 'Synchronized' to true and add IDOC number from the response
        try {
            console.log(`Process customer prices in DB`);
            if (paWithoutErrorsIds.length > 0) {
                console.log(`Process customer prices count: ${paWithoutErrorsIds.length}`);
                await updateCustomerPrices(paWithoutErrorsIds); // !!the order of PriceCondition arrays is important
                await setStatusPriceAgreement(paWithoutErrorsIds.map(req => req.customerPrice.PriceAgreementId), 'DONE');
            } else {
                console.log(`Nothing to update in DB`);
            }
            console.log(`Finished synchronisation of PriceAgreements`);
        } catch (error) {
            await setStatusPriceAgreement(allCustomerPrices.map(cp => cp.PriceAgreementId), 'ERROR');//error for all
        }
    };
    async function setStatusPriceAgreement(pas, status) {
        if (!pas || pas?.length === 0) {
            return false;
        }
        pas = [...new Set(pas)];
        const tx = cds.tx();
        try {
            console.log(`Update SynchronizationStatus to ${status} for ${pas.join("||")}`)

            await tx.run(UPDATE(PriceAgreements).with({ SynchronizationStatus: status , Synchronized : true}).where({ ID: { in: pas } }));

            await tx.commit();
        } catch (error) {
            await tx.rollback(error);
            console.error(`ERROR when updating PriceAgreement status to ${status} for ${pa}`)
            console.error(error);
            // throw error;
        }
    }
    /**
     * This method sets the CustomerPrices 'Synchronized' to true and stores the API response (SAP backend) IDOC numbers in the corresponding CustomerPrice record.
     * The order and number of records in the {response} and the {priceConditions} arrays are the same (Promise.all returns the same order as the input array)
     * Since there is no correlation ID between the price conditions and the response from the API, we use Promise.all return order as correlation.
     * @param {Array} response 
     * @param {Array} priceConditions 
     */
    async function updateCustomerPrices(responses) {
        const tx = cds.tx();
        // const refIdocIDs = response && response.map(res => res.headers.sapidocdbid) || [];
        // const customerPriceIDs = priceConditions && priceConditions.map(condition => condition.ID) || [];
        // if (refIdocIDs.length === customerPriceIDs.length) {
        try {
            console.log(`Start updating customer prices in HANA DB`)
            const updatePromises = responses.map(response =>
                tx.run(UPDATE(CustomerPrices)
                    .with({ Synchronized: true, RefIdocNumber: response.result.headers.sapidocdbid })
                    .where({ ID: response.customerPrice.ID })));
            await Promise.all(updatePromises);
            await tx.commit();
        } catch (error) {
            await tx.rollback(error);
            console.error(`ERROR when updating customer prices in HANA DB`)
            console.error(error);
            throw error;
        }
        // }
    };

    //EHQUT-219174-Spain issue with the synchronization of price agreements only on regions
    async function updateCustomerPrice(customerPrice)   {
        console.log(`Prepare sending update customer price: ${customerPrice.ID}`);
        const tx = cds.tx();

        let customerPricesQC = [];
        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));
        const body = getPriceAgreementRequestBodyTemplate(institute);
      
        if (!institute) {
            console.error(`Error customer price: ${customerPrice.ID}`);
            console.error(`No institute was found for InstituteID: ${customerPrice.InstituteId}`);
            return { status: false, customerPrice: customerPrice };
            // return req.reject(404, `No institute was found for InstituteID: ${customerPrice.InstituteId}`);
        }

        if (customerPrice.CountryCode === 'ES' && institute.InstituteType === 'Ship-To') return Promise.resolve();

        const wherePriceAgreementId = ServiceHelper.buildFullWhere("Id", "=", customerPrice.PriceAgreementId);
        let priceAgreement = await tx.run(SELECT.one.from(PriceAgreements).where(wherePriceAgreementId));
        if (!priceAgreement) {
            // return req.reject(404, `No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            console.error(`Error customer price: ${customerPrice.ID}`);
            console.error(`No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            return { status: false, customerPrice: customerPrice };
        }
        const whereOfferID = ServiceHelper.buildFullWhere("OfferID", "=", priceAgreement.OfferId);
        const whereProductpackID = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", customerPrice.ProductPackId);
        let offer = await tx.run(SELECT.one.from(PT_TMOFRS).where(whereOfferID));
        if (!offer) {
            // return req.reject(404, `No offer was found for OfferID: ${priceAgreement.OfferId}`);
            console.error(`Error customer price: ${customerPrice.ID}`);
            console.error(`No offer was found for OfferID: ${priceAgreement.OfferId}`);
            return { status: false, customerPrice: customerPrice };
        }

        const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({ TenderID: priceAgreement.TenderId }));

        let packFactor;
        if (customerPrice.ProductPackId) {
            let productPack = await tx.run(SELECT.one.from(PT_TMPRDPCK).where(whereProductpackID));
            packFactor = productPack.PACKFACTOR;
        } else {
            packFactor = 1;
        }

        let kbetr = parseFloat(customerPrice.Price);

        // Spain only
        if (customerPrice.CountryCode === 'ES') {
            const wherePriceAgreement_ID = ServiceHelper.buildFullWhere("PriceAgreement_ID", "=", customerPrice.PriceAgreementId);
            const wherePriceConditionCode = ServiceHelper.buildFullWhere("PriceConditionCode", "=", customerPrice.PriceCondition);
            let priceCondition = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceAgreement_ID).where(wherePriceConditionCode));
            
            if (!priceCondition) {
                // return req.reject(404, `No priceCondition was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            }
            // set KRECH, KBETR and KPEIN (unit for price) for Precio Neto
            if (customerPrice.PriceCondition === "YLTF" || customerPrice.PriceCondition === "YLTP") {
                kbetr = Number(priceCondition.NetPriceWithoutTaxBeforeDeductionRD * 10000).toFixed(2);
                body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KPEIN = 10000;
                body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KRECH = "C";
            } else {
                kbetr = priceCondition.Discount * 100;
            }

            // set KRECH for Descuento Comercial and Descuento Comercial 
            if (customerPrice.PriceCondition === "YL60" || customerPrice.PriceCondition === "YDC0") {
                body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KRECH = "A";
            }

            // set partner and sales organisation
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.VKORG = "QFHC";
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.EDI_DC40.SNDPRN = "FAST_ES";
        }

        // KBETR per Pack or Unit
        //if(customerPrice.CountryCode === 'IT'){
        if ((offer.Division === "Pharma" || offer.Division === "Consumer Health") && priceAgreement.UoM === "Unit") {// convert and send per pack
            kbetr = kbetr * packFactor;
        } else if (offer.Division === "Radiology" && priceAgreement.UoM === "Pack") { // => radiology so per unit
            kbetr = kbetr / packFactor;
        }
        //} 
        //EHQUT-INC17748342-Rates incorrectly synchronized.
        //EHQUT-INC18178128-FAST - Error decimals discounts
        //we should add "-" only in case of Price Condition "YL60" and "YDC0"
        if (customerPrice.PriceCondition === "YL60" || customerPrice.PriceCondition === "YDC0") {
            kbetr = kbetr.toFixed(3) + "-";
        }
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KUNNR = parseInt(institute.CustomerID);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.MATNR = parseInt(customerPrice.MaterialNumber);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth() + 1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth() + 1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KSCHL = customerPrice.PriceCondition;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KBETR = kbetr;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KSCHL = customerPrice.PriceCondition;

        tender && (body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG["_-BAY0_-GZ_SDREFINFO01"].REFVAL = tender.SAPID);

        //Transforming the Date in correct format
        const datab = new Date(customerPrice.EffectiveDate).toISOString().split('T')[0];
        const datbi = new Date(customerPrice.ExpiryDate).toISOString().split('T')[0];

        customerPricesQC.push({CustomerPriceId: customerPrice.PriceAgreementId, CountryCode: customerPrice.CountryCode, KSCHL: customerPrice.PriceCondition, KUNNR: institute.CustomerID, MATNR: customerPrice.MaterialNumber,KBETR: kbetr, REFVAL: tender.SAPID, DATAB: datab, DATBI: datbi});
        const mappedcustomerPricesQC = mappedcustomerPrices(customerPricesQC);

        // 5. Insert PriceCondition QC
        mappedcustomerPricesQC && await tx.run(INSERT(mappedcustomerPricesQC).into(CustomerPricesQC));

        await tx.commit();//to release db connection

        console.log(`Start sending update customer prices for PriceAgreementID: ${customerPrice.PriceAgreementId} & InstituteID: ${customerPrice.InstituteId} & OfferID: ${priceAgreement.OfferId}`);
        try {
            const result = await updatePriceConditions(customerPrice.CountryCode, "PriceCondition", body);
            console.log(`Finished sending update customer prices for PriceAgreementID: ${customerPrice.PriceAgreementId} & InstituteID: ${customerPrice.InstituteId} & OfferID: ${priceAgreement.OfferId}`);
            return { status: true, result: result, customerPrice: customerPrice };
        } catch (error) {
            console.error(`Error customer price: ${customerPrice.ID}`);
            console.error(`ERROR: sending update customer prices for PriceAgreementID: ${customerPrice.PriceAgreementId} & InstituteID: ${customerPrice.InstituteId} & OfferID: ${priceAgreement.OfferId}`);
            logRequestError(error);
            return { status: false, customerPrice: customerPrice };
            // throw error;//do not throw error to continue with other requests
        }
    }

//EHQUT-219174-Spain issue with the synchronization of price agreements only on regions
    function getPriceAgreementRequestBodyTemplate(institute) {
        return {
            "_-BAY0_-GZ_SDCOND_A04": {
                "IDOC": {
                    "BEGIN": 1,
                    "EDI_DC40": {
                        "SEGMENT": 1,
                        "TABNAM": "EDI_DC40",
                        "MANDT": 508,
                        "DOCNUM": 34952510,
                        "DOCREL": 740,
                        "STATUS": 53,
                        "DIRECT": 2,
                        "OUTMOD": "",
                        "IDOCTYP": "COND_A04",
                        "CIMTYP": "/BAY0/GZ_SDCOND_A04",
                        "MESTYP": "COND_A",
                        "MESCOD": "EXT",
                        "MESFCT": "ES",
                        "SNDPOR": "",  //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | the value is added per environment in the CPI configuration
                        "SNDPRT": "LS",
                        "SNDPRN": "FAST_IT",
                        "RCVPOR": "",  //this is different for DEV (SAPD2R) /QA (SAPQ2R)/PROD (SAPP2R) | the value is added per environment in the CPI configuration
                        "RCVPRT": "LS",
                        "RCVPRN": "",  //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | | the value is added per environment in the CPI configuration
                        "CREDAT": 20210916,
                        "CRETIM": 144213,
                        "SERIAL": 20210810101046
                    },
                    "E1KOMG": {
                        "SEGMENT": 1,
                        "KVEWE": "A",
                        "KOTABNR":institute.InstituteType === 'Region(s)' ? 879 : 878,
                        "KAPPL": "V",
                        "KSCHL": "YLTP",
                        "VKORG": "ITHC",
                        "VTWEG": "00",
                        "SPART": "00",
                        "KUNNR": 0,
                        "MATNR": 0,
                        "_-BAY0_-GZ_SDREFINFO01": {
                            "SEGMENT": 1,
                            "EDIQUAL": "CIG",
                            "REFVAL": "Z18178A124"
                        },
                        "E1KONH": {
                            "SEGMENT": 1,
                            "DATAB": 99991231,
                            "DATBI": 99991231,
                            "E1KONP": {
                                "SEGMENT": 1,
                                "KSCHL": "YLTP",
                                "KBETR": 0
                            }
                        }
                    }
                }
            }
        };
    };


    function mappedcustomerPrices(customerPrices) {

        console.log(`Mapping customerPrices to customerPricesQC ...`);
        customerPrices = customerPrices.reduce((prev, curr, idx, customerPrices) => {
            prev.push(
                {
                    CustomerPriceId             : curr.CustomerPriceId || null,
                    CountryCode                 : curr.CountryCode || null,
                    VKORG                       : curr.CountryCode == 'ES' ? "QFHC" : "ITHC" || null,   // Sales Organisation
                    KSCHL                       : curr.KSCHL || null,   // Condition Type
                    KUNNR                       : curr.KUNNR && addLeadingZeros(curr.KUNNR, 10) || null,   // Customer Number
                    MATNR                       : curr.MATNR && addLeadingZeros(curr.MATNR, 18) || null,   // Material Number
                    YCIG                        : curr.REFVAL || null,   // Contract Reference
                    KBETR                       : curr.KBETR || null,   // Condition Value
                    KPEIN                       : curr.CountryCode == 'IT' ? 1 : (curr.KSCHL == 'YLTF' || curr.KSCHL == 'YLTP') ? 10000 : null || null,   // Unit for price
                    DATAB                       : curr.DATAB || null,   // Effective Date
                    DATBI                       : curr.DATBI || null,   // Expiry Date
                    KRECH                       : (curr.KSCHL == 'YL60' || curr.KSCHL == 'YDC0') ? "A" : (curr.KSCHL == 'YLTF' || curr.KSCHL == 'YLTP') ? "C" : null || null,   // 
                    KONMS                       : curr.KONMS || null,   // 
                    MEINS                       : curr.MEINS || null,   // 
                    BOMAT                       : curr.BOMAT && addLeadingZeros(curr.BOMAT, 18) || null,   // 
                    KSTBM                       : curr.KSTBM || null,   // 
                    MIKBAS                      : curr.MIKBAS || null,   // 
                    MXBAS                       : curr.MXBAS || null   //
                }
            );
            return prev;
        }, []);
        return customerPrices;

    };


    async function updatePriceConditions(countryCode, resource, body) {

        if (!body) {
            console.error("The body of the request is missing.");
            return false;
        }

        console.log(`Get api config ...`);
        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'PriceAgreement', CountryCode: countryCode, Resource: resource }));
        console.log(`API config:`);
        console.log(apiConfig);
        const url = `${apiConfig.Host}${apiConfig.BasePath}${apiConfig.ResourcePath}`;
        console.log(`Get bearer token ...`);
        const oauthCredentials = await getBearerToken();

        console.log(`Synchronizing Price Conditions ...`);
        console.log(`Calling endpoint ${url}`);


        return axios({
            method: 'post',
            url: url,
            headers: {
                'Authorization': `Bearer ${oauthCredentials.data.access_token}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(body)
            
        });

    };


    async function getBearerToken() {

        if (oauthAuth.OAuthProvider && oauthAuth.ClientID && oauthAuth.ClientSecret) {
            console.log(`Calling ${oauthAuth.OAuthProvider}`);
            return axios({
                method: 'post',
                url: oauthAuth.OAuthProvider,
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${oauthAuth.ClientID}:${oauthAuth.ClientSecret}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: qs.stringify({
                    'grant_type': oauthAuth.GrantType
                })/*, when testing locally, comment out the proxy
                proxy: {
                    host: priceAgreementApi.ProxyHost,
                    port: priceAgreementApi.ProxyPort
                }*/
            });
        }

        throw Error("Missing OAUTH config parameters");
    };

    // srv.on('syncFocCustPrices', async req => {

    //     const tx = cds.transaction(req);

    //     const customerPriceData = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: req.data.ids }, PriceCondition: 'YA03' }));

    //     if (customerPriceData && customerPriceData.length <= 0) {
    //         return req.reject(404, `No customer prices were found for the following PriceAgreement: ${req.data.ids}`);
    //     }

    //     console.log("Updating Price Conditions ...");
    //     const updatePromises = customerPriceData.map(customerPrice => updateFOCcustPrices(customerPrice, tx));
    //     const result = await Promise.all(updatePromises);

    //     return req.reply(result);

    // });
 //EHQUT-386660-Italy-Issue with FoC synchronization

    async function updateFOCcustPrices(customerPrice,index) {

        console.log(`Prepare sending update FOC customer price: ${customerPrice.ID}`);
        const tx = cds.tx();

        let focCustomerPricesQC = [];
        const wherePriceAgreementId = ServiceHelper.buildFullWhere("Id", "=", customerPrice.PriceAgreementId);
        let priceAgreement = await tx.run(SELECT.one.from(PriceAgreements).where(wherePriceAgreementId));
        if (!priceAgreement) {
            console.error(`Error FOC customer price: ${customerPrice.ID}`);
            console.error(`No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            return { status: false, customerPrice: customerPrice };
            // return req.reject(404, `No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
        }

        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        const whereProductCode = ServiceHelper.buildFullWhere("ProductCode", "=", customerPrice.ProductPackId);
        const whereOfferId = ServiceHelper.buildFullWhere("OfferId", "=", priceAgreement.OfferId);
        const whereOfferID = ServiceHelper.buildFullWhere("OfferID", "=", priceAgreement.OfferId);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        const whereFOCproductpackID = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", customerPrice.FOCproductPackID);

        // let priceAgreementFOC = await tx.run(SELECT.one.from(PriceAgreementFOC).where(whereCountry).where(whereProductCode).where(whereOfferId).where(whereFOCproductpackID)); // todo: check if this is needed
        let offerProduct = await tx.run(SELECT.one.from(PT_TMOFPR).where(whereCountry).where(whereProductCode).where(whereOfferID));
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));
        let offer = await tx.run(SELECT.one.from(PT_TMOFRS).where(whereOfferID));
        if (!offer) {
            // return req.reject(404, `No offer was found for OfferID: ${priceAgreement.OfferId}`);{
            console.error(`Error FOC customer price: ${customerPrice.ID}`);
            console.error(`No offer was found for OfferID: ${priceAgreement.OfferId}`);
            return { status: false, customerPrice: customerPrice };
        }

        if (customerPrice.CountryCode === 'ES' && institute.InstituteType === 'Ship-To') return Promise.resolve();

        const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({ TenderID: priceAgreement.TenderId }));

        // TODO: Isma will check with Jonathan if this is correct
        let packFactor = 1;
        if (customerPrice.FOCproductPackID) {
            let productPack = await tx.run(SELECT.one.from(PT_TMPRDPCK).where(whereFOCproductpackID));
            if (productPack) packFactor = productPack.PACKFACTOR;
        }

        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);
        //EHQUT-219174-Spain issue with the synchronization of price agreements only on regions
        const body = getPriceAgreementRequestBodyTemplate(institute);
        
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KUNNR = parseInt(institute.CustomerID);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.MATNR = parseInt(customerPrice.MaterialNumber);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth() + 1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth() + 1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KSCHL = customerPrice.PriceCondition;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KSCHL = customerPrice.PriceCondition;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KVEWE = 'N';
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KONMS = "PCE";
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.MEINS = "PCE";
    

        tender && (body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG["_-BAY0_-GZ_SDREFINFO01"].REFVAL = tender.SAPID);

        let kstbm = "";
        let mikbas = "";
        let mxkbas = "";
        // Italy only
        //EHQUT-386660-Italy-Issue with FoC synchronization
        if (customerPrice.CountryCode === 'IT') {
            let priceAgreementFOC = await tx.run(SELECT.one.from(PriceAgreementFOC).where(whereCountry).where(whereProductCode).where(whereOfferId).where(whereFOCproductpackID));
            kstbm = priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' ? priceAgreementFOC.FreeGoods * offerProduct.RequestedVolume : (customerPrice.FOCproductPackID && (priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS' || priceAgreementFOC.FreeGoods_ABS_PCT === 'STP')) ? priceAgreementFOC.FreeGoods : 0;
            mikbas = priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' || priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS' ? 1 : (customerPrice.FOCproductPackID && priceAgreementFOC.FreeGoods_ABS_PCT === 'STP') ? priceAgreementFOC.FreeGoods_Step : 0;
            mxkbas = priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' || priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS' ? offerProduct.RequestedVolume : (customerPrice.FOCproductPackID && priceAgreementFOC.FreeGoods_ABS_PCT === 'STP') ? priceAgreementFOC.FreeGoods_Step : 0;
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.BOMAT = parseInt(customerPrice.FOCmaterialNumber);
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KOTABNR = 921;
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.PSTYP = 1+ index;
            delete body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG["_-BAY0_-GZ_SDREFINFO01"];
        }
        // Spain only
        const focMaterial = await tx.run(SELECT.one.from(PT_TMSKUPRDPCK).where(whereFOCproductpackID).where({ CountryCode: priceAgreement.CountryCode, ActiveRecord: 'Yes' }));
        if (customerPrice.CountryCode === 'ES') {
            const wherePriceAgreement_ID = ServiceHelper.buildFullWhere("PriceAgreement_ID", "=", customerPrice.PriceAgreementId);
            const wherePriceConditionCode = ServiceHelper.buildFullWhere("PriceConditionCode", "=", customerPrice.PriceCondition);
            let priceCondition = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceAgreement_ID).where(wherePriceConditionCode));
            if (!priceCondition) {
                // return req.reject(404, `No priceCondition was found for "${customerPrice.PriceCondition}" with PriceAgreementID "${customerPrice.PriceAgreementId}"`);
                console.error(`Error FOC customer price: ${customerPrice.ID}`);
                console.error(`No priceCondition was found for "${customerPrice.PriceCondition}" with PriceAgreementID "${customerPrice.PriceAgreementId}"`);
                return { status: false, customerPrice: customerPrice };
            }
            let priceAgreementFOC = await tx.run(SELECT.one.from(FreeGoodsOther).where({ PriceCondition_ID: priceCondition.ID }).where(whereFOCproductpackID));
            if (!priceAgreementFOC) {
                // return req.reject(404, `No FreeGoodsOther was found for PriceConditionID: ${priceCondition.ID}`);
                console.error(`Error FOC customer price: ${customerPrice.ID}`);
                console.error(`No FreeGoodsOther was found for PriceConditionID: ${priceCondition.ID}`);
                return { status: false, customerPrice: customerPrice };
            }

            kstbm = parseInt(priceAgreementFOC.FOCBonus);
            mikbas = priceAgreementFOC.FOCMinAmount;
            mxkbas = priceAgreementFOC.FOCMinAmount;

            // set partner and sales organisation
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.VKORG = "QFHC";
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.EDI_DC40.SNDPRN = "FAST_ES";

            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KOTABNR = 902;

            
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.BOMAT = parseInt(focMaterial.SKUCode);
        }
        //EHQUT-OTT-138426-Italy - different offer values on SAP

        // if ((offer.Division === "Pharma" || offer.Division === "Consumer Health") && priceAgreement.UoM === "Unit" ){// convert and send per pack
        //     kstbm  = kstbm / packFactor;
        //    mikbas = mikbas / packFactor;
        //     mxkbas = mxkbas / packFactor;
        // }else if (offer.Division === "Radiology" && priceAgreement.UoM === "Pack" ) { // => radiology so per unit
        //     kstbm  = kstbm * packFactor;
        //    mikbas = mikbas * packFactor;
        //    mxkbas = mxkbas * packFactor;
        // }
        //EHQUT-OTT-138426-Italy - different offer values on SAP
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KSTBM = kstbm;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.MIKBAS = mikbas;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.MXKBAS = mxkbas;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KUNNR = parseInt(institute.CustomerID);
        if(customerPrice.PriceCondition == 'YA01'){
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.PRSCH = 2;
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KZNEP = "E"; 
            }
        //Transforming the Date in correct format
        const datab = new Date(customerPrice.EffectiveDate).toISOString().split('T')[0];
        const datbi = new Date(customerPrice.ExpiryDate).toISOString().split('T')[0];
        const bomaT = (customerPrice.PriceCondition == 'YA03' || customerPrice.PriceCondition == 'YA01') ? (customerPrice.CountryCode == 'ES' ? focMaterial.SKUCode : customerPrice.FOCmaterialNumber) : null;
        focCustomerPricesQC.push({CustomerPriceId: customerPrice.PriceAgreementId, CountryCode: customerPrice.CountryCode, KSCHL: customerPrice.PriceCondition, KUNNR: institute.CustomerID, MATNR: customerPrice.MaterialNumber, KONMS: "PCE", MEINS: "PCE", DATAB: datab, DATBI: datbi, BOMAT: bomaT, KSTBM: kstbm, MIKBAS: mikbas, MXBAS: mxkbas});
        const mappedfocCustomerPricesQC = mappedcustomerPrices(focCustomerPricesQC);

        // 5. Insert PriceCondition QC
        mappedfocCustomerPricesQC && await tx.run(INSERT(mappedfocCustomerPricesQC).into(CustomerPricesQC));
        
        console.log(body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP,"IDOC");
        await tx.commit();//to release db connection
        console.log(`Start sending update FOC customer price: ${customerPrice.ID}`);
        try {
            const result = await updatePriceConditions(customerPrice.CountryCode, "PriceCondition", body);
            console.log(`Finished sending update FOC customer price: ${customerPrice.ID}`);
            return { status: true, result: result, customerPrice: customerPrice };
        } catch (error) {
            console.error(`ERROR: sending update FOC customer price: price: ${customerPrice.ID}`);
            logRequestError(error);
            // throw error;//do not throw error to continue with other requests
            return { status: false, customerPrice: customerPrice };
        }
    };


    async function updateRappelcustPrices(customerPrice) {
        console.log(`Prepare sending update Rappel customer price: ${customerPrice.ID} for PriceAgreementID: ${customerPrice.PriceAgreementId} & InstituteID: ${customerPrice.InstituteId}`);
        const tx = cds.tx();
        let priceAgreement = await tx.run(SELECT.one.from(PriceAgreements).where({ ID: customerPrice.PriceAgreementId }));
        if (!priceAgreement) {
            // return req.reject(404, `No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            console.error(`Error Rappel customer price: ${customerPrice.ID}`);
            console.error(`No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            return { status: false, customerPrice: customerPrice };
        }
        let priceCondition = await tx.run(SELECT.one.from(PriceCondition).where({ PriceAgreement_ID: customerPrice.PriceAgreementId }).where({ PriceConditionCode: customerPrice.PriceCondition }));
        if (!priceCondition) {
            // return req.reject(404, `No priceCondition was found for "${customerPrice.PriceCondition}" with PriceAgreementID "${customerPrice.PriceAgreementId}"`);
            console.error(`Error Rappel customer price: ${customerPrice.ID}`);
            console.error(`No priceCondition was found for "${customerPrice.PriceCondition}" with PriceAgreementID "${customerPrice.PriceAgreementId}"`);
            return { status: false, customerPrice: customerPrice };
        }

        const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({ TenderID: priceAgreement.TenderId }));

        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));

        let priceAgreementInstitute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where({InstituteID: priceAgreement.InstituteId}));

        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);

        const bonem = parseInt(priceAgreementInstitute.CustomerID);
        const kunnr = parseInt(institute.CustomerID);
        const matnr = parseInt(customerPrice.MaterialNumber);
        const datab = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth() + 1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        const datbi = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth() + 1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
//CR2
        const body = getES01RequestBodyTemplate(institute,priceCondition.PriceConditionCode);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].BONEM = bonem;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].BOTEX = tender.SAPID;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATAB = datab;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATBI = datbi;
       // body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].BOSTA = "B";
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].DATAB_GR = datab;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].DATBI_GR = datbi;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KUNNR = kunnr;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].MATNR = matnr;
       

        //Transforming the Date in correct format
        const dataB = new Date(customerPrice.EffectiveDate).toISOString().split('T')[0];
        const datbI = new Date(customerPrice.ExpiryDate).toISOString().split('T')[0];
        
        // Specify existing SAP rappel reference when exists for customer/material
        // when KNUMA_BO is specified then it is an update in the SAP backend else, it is a create
        const spainRappelData = await tx.run(SELECT.one.from(SpainRappelData).where({ BONEM: bonem, KUNNR: kunnr, MATNR: matnr, DATAB: dataB, DATBI: datbI}));
        if(spainRappelData){
            body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].KNUMA_BO = spainRappelData.KNUMA;
        }


        // DiscountConditions
        let highestDiscountCondition = null;
        let lowestDiscountCondition = null;
        const discountConditions = await tx.run(SELECT.from(DiscountCondition).where({ PriceCondition_ID: priceCondition.ID }));
        if (discountConditions?.length > 0) {
            highestDiscountCondition = discountConditions.reduce((prev, current) => (prev.Discount > current.Discount) ? prev : current);
            lowestDiscountCondition = discountConditions.reduce((prev, current) => (prev.Discount < current.Discount) ? prev : current);
            discountConditions.forEach(dc => {
                body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].E1KONW.push({
                    "KSTBW": dc.Volume,
                    "KBETR": dc.Discount.toFixed(3) + "-"
                });
            });
        }

        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KBETR = lowestDiscountCondition && lowestDiscountCondition.Discount && lowestDiscountCondition.Discount.toFixed(3).concat("-") || ""; // KBETR from the minimum(KSTBW)
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KBRUE = highestDiscountCondition && highestDiscountCondition.Discount && highestDiscountCondition.Discount.toFixed(3).concat("-") || ""; // minimum(KSTBW) value from the DiscountConditions array

        await tx.commit();//to release db connection

        console.log(`Start sending update Rappel customer price: ${customerPrice.ID}  for PriceAgreementID: ${customerPrice.PriceAgreementId} & InstituteID: ${customerPrice.InstituteId} & OfferID: ${priceAgreement.OfferId}`);
        try {
            const result = await updatePriceConditions(customerPrice.CountryCode, "PriceConditionRappel", body);
            console.log(`Finished sending update Rappel customer price: ${customerPrice.ID} for PriceAgreementID: ${customerPrice.PriceAgreementId} & InstituteID: ${customerPrice.InstituteId} & OfferID: ${priceAgreement.OfferId}`);
            return { status: true, result: result, customerPrice: customerPrice };
        } catch (error) {
            console.error(`ERROR: sending update Rappel customer price: ${customerPrice.ID} for PriceAgreementID: ${customerPrice.PriceAgreementId} & InstituteID: ${customerPrice.InstituteId} & OfferID: ${priceAgreement.OfferId}`);
            logRequestError(error);
            return { status: false, customerPrice: customerPrice };
            // throw error;//do not throw error to continue with other requests
        }
    };

    function logRequestError(error) {
        if (error.response) {
            // Request made and server responded
            console.log(`Response data: ${error.response.data}`);
            console.log(`Response status: ${error.response.status}`);
            console.log(`Response headers: ${error.response.headers}`);
        } else if (error.request) {
            // The request was made but no response was received
            console.log(`Request: ${error.request}`);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
        }
    }
    //CR2
    function getES01RequestBodyTemplate(institute,priceconditionrappelcode) {
        return {
            "_BAY0-GZ_SALESAGR_ES01": {
                "IDOC": {
                    "EDI_DC40": {
                        "TABNAM": "EDI_DC40",
                        "MANDT": 508,
                        "DOCNUM": 36256484,
                        "DOCREL": 740,
                        "STATUS": 53,
                        "DIRECT": 2,
                        "OUTMOD": "",
                        "IDOCTYP": "/BAY0/GZ_SALESAGR_ES01",
                        "MESTYP": "/BAY0/GZ_SALESAGR_ES",
                        "SNDPOR": "", //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | the value is added per environment in the CPI configuration
                        "SNDPRT": "LS",
                        "SNDPRN": "FAST_ES",
                        "RCVPOR": "", //this is different for DEV (SAPD2R) /QA (SAPQ2R)/PROD (SAPP2R) | the value is added per environment in the CPI configuration
                        "RCVPRT": "LS",
                        "RCVPRN": "", //this is different for DEV (D2RM508) /QA (Q2RM508)/PROD (P2RM508) | | the value is added per environment in the CPI configuration
                        "CREDAT": 20220404,
                        "CRETIM": 145201
                    },
                    "_BAY0-GZ_SALESAGRHEAD": {
                        "BOART": "YAW1",
                        "VKORG": "QFHC",
                        "VTWEG": "00",
                        "SPART": "00",
                        "BONEM": 0,
                        "BOTEX": "RCT COM. W. ACCRUALS",
                        "DATAB": 0,
                        "DATBI": 0,
                        "CURCY": "EUR",
                        "ZTERM": "D496",
                        "ZLSCH": "M",
                        "ABREX": "TEST AGMNT",
                        "KOTABNR": institute.InstituteType === 'Ship-To' ? 582 : 750,
                        "KVEWE": "A",
                        "KAPPL": "V",
                        
                        "_BAY0-GZ_SALESAGRITEM": [
                            {
                                "KUNNR": 0,
                                "DATAB_GR": 0,
                                "DATBI_GR": 0,
                                "MATNR": 0,
                                "KBETR": "0-",
                                "KONWA": "%",
                                "KPEIN": 1,
                                "KBRUE": 0,
                                "KSCHL": priceconditionrappelcode,
                                "E1KONW": []
                            }
                        ]
                    }
                }
            }
        }
    };


    /**
     * Splits a given array into chunks
     * @param {Array} array 
     * @param {Array} chunkSize 
     * @returns 
     */
    function splitToChunks(array, chunkSize){
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    };

    function addLeadingZeros (num, size) {
        if (num === null) {
            throw new Error(`${num} doesn't exist`);
        }
        
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };

}