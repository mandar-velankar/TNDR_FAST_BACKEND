const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');
const axios = require('axios');
const qs = require("qs");
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
        PriceAgreements
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
        PT_TMTEND, PT_TMOFPR, PT_TMOFRS, PriceCondition, FreeGoodsOther, DiscountCondition
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");

    const {
        PriceConditionView
    } = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");




    srv.on('READ', 'PriceAgreements', async (req, next) => {

        let start;
        let end;
        let totalTime = 0;
        let type = "";
        if (req.query.SELECT.columns[0]?.func === "count") {
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
        if (req.query.SELECT.columns[0]?.func !== "count") {
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
        stopTrace("PriceAgreements");

        //return directly without filters
        if (req.query.SELECT.columns[0].func === 'count' && !hasFilter) {
            console.log(`COUNT: Total time trace fetching Price Agreements: ${totalTime}`);
            return [{ counted: data.length }];
        }
        //return directly without filters and not for only one (selection by keys)
        if (!req.query.SELECT.one && !hasFilter) {
            return data;
        }
        // const customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: ids } }));
        let ids = [];
        //use only one loop instead of multiple map functionslet ids = [];
        let offers = [];
        let countrycodes = [];
        let productpacks = [];
        // let existingPriceConditionIDs = [];
        //use only one loop instead of multiple map functions
        startTrace("PrepareKeysForOtherQueries");
        for (const pa of data) {
            if (ids.findIndex(id => id === pa.ID) === -1) ids.push(pa.ID);
            if (offers.findIndex(off => off === pa.OfferId) === -1) offers.push(pa.OfferId);
            if (countrycodes.findIndex(cc => cc === pa.CountryCode) === -1) countrycodes.push(pa.CountryCode);
            if (productpacks.findIndex(ppid => ppid === pa.ProductPackId) === -1) productpacks.push(pa.ProductPackId);
            // existingPriceConditionIDs.push(pa.ExistingPriceConditionID);
        }
        stopTrace("PrepareKeysForOtherQueries");
        let customerPricesAll = [];
        let customerPricesInPA = true;
        let priceConditionsAll = [];
        let priceConditionsInPa = true;
        let mostRecentMasterPricesAll = [];
        let consumerPricesAll = [];
        let consumerPricesInPA = true;
        let newMaterialsAll = [];
        let newFOCMaterialsAll = [];
        let OfferProductsAll = [];

        if (ids && ids.length > 0) {
            startTrace("CustomerPrices");
            if (req.query.SELECT.columns.find(col => col?.ref?.length > 0 && col?.ref[0] === 'CustomerPrices') === -1) {
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

        if (countrycodes && countrycodes.length > 0 && productpacks && productpacks.length > 0) {
            if (offers && offers.length > 0) {
                startTrace("PriceConditionView");
                if (req.query.SELECT.columns.find(col => col?.ref?.length > 0 && col?.ref[0] === 'priceConditions') === -1) {
                    priceConditionsInPa = false;
                    priceConditionsAll = await tx.run(SELECT.from(PriceConditionView)
                        .where({
                            CountryCode: { in: countrycodes },
                            and: {
                                ProductCode: { in: productpacks },
                                and: {
                                    OfferID: { in: offers },
                                    and: {
                                        ExistingPriceConditionID: { '!=': null }
                                    }
                                }
                            }
                        })
                    );
                }
                stopTrace("PriceConditionView");

                startTrace("OfferProducts");
                OfferProductsAll = await tx.run(SELECT.from(PT_TMOFPR)
                    .where({
                        CountryCode: { in: countrycodes },
                        and: {
                            ProductCode: { in: productpacks },
                            and: {
                                OfferID: { in: offers }
                            }
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
                        ProductPackId: { in: productpacks }
                    }
                })
            );
            stopTrace("MostRecentMasterPricesView");

            startTrace("MostRecentConsumerPricesView");
            if (req.query.SELECT.columns.find(col => col?.ref?.length > 0 && col?.ref[0] === 'ConsumerPrice') === -1) {
                consumerPricesInPA = false;
                consumerPricesAll = await tx.run(SELECT.from(MostRecentConsumerPricesView)
                    .where({
                        CountryCode: { in: countrycodes },
                        and: {
                            ProductPackId: { in: productpacks }
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
        // use == instead of === in filters and finds because type of productpackid is different between two tables || maybe this is also the case for others
        // 2. calculate the fields
        const todaysDate = new Date();

        let calculatedFutureDate = new Date();
        calculatedFutureDate.setMonth(calculatedFutureDate.getMonth() + 3);

        const calculateFields = priceAgreement => {

            let customerPrices = priceAgreement.CustomerPrices || [];
            let mostRecentMasterPrice;
            //let newMaterials = priceAgreement.Materials;

            let consumerPrice = priceAgreement.ConsumerPrice;


            let priceConditions = priceAgreement.PriceConditions || [];
            let institute = priceAgreement.Institute;

            // Get CustomerPrices if needed
            // if (!customerPrices) {
            // let wherePriceAgreement = ServiceHelper.buildFullWhere("PriceAgreementId", "=", priceAgreement.ID);
            // customerPrices = await tx.run(SELECT.from(CustomerPrices).where(wherePriceAgreement));
            if (!customerPricesInPA) {
                customerPrices = customerPricesAll.filter(cp => cp.PriceAgreementId == priceAgreement.ID);
            }
            // }

            if (!priceConditionsInPa) {
                // let wherePriceAgreement = ServiceHelper.buildFullWhere("OfferID", "=", priceAgreement.OfferId);
                // let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                // let whereProductPackId = ServiceHelper.buildFullWhere("ProductCode", "=", priceAgreement.ProductPackId);
                // let whereExistingPriceCondition = ServiceHelper.buildFullWhere("ExistingPriceConditionID", "!=", null);
                // priceConditions = await tx.run(SELECT.from(PriceConditionView).where(whereCountryCode).where(whereProductPackId).where(wherePriceAgreement).where(whereExistingPriceCondition));
                priceConditions = priceConditionsAll.filter(pc => pc.OfferID == priceAgreement.OfferId && pc.CountryCode == priceAgreement.CountryCode && pc.ProductCode == priceAgreement.ProductPackId && pc.ExistingPriceConditionID !== null);
            }

            if (!mostRecentMasterPrice) {
                // let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                // let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                // mostRecentMasterPrice = await tx.run(SELECT.one.from(MostRecentMasterPricesView).where(whereCountryCode).where(whereProductPackId));
                // before performance
                // mostRecentMasterPrice = mostRecentMasterPricesAll.find(mp => mp.CountryCode == priceAgreement.CountryCode && mp.ProductPackId == priceAgreement.ProductPackId); // use == instead of === because type of productpackid is different between two tables
                // after performance
                for(const mp of mostRecentMasterPricesAll){
                    if(mp.CountryCode == priceAgreement.CountryCode && mp.ProductPackId == priceAgreement.ProductPackId){
                        mostRecentMasterPrice = mp;
                    }
                }
            }

            // Get NewMaterials if needed
            //if(!newMaterials){
            //let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
            //let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
            // let wherePriceAgreement = ServiceHelper.buildFullWhere("PriceAgreementId", "=", priceAgreement.ID);
            // let newMaterials = await tx.run(SELECT.from(NewMaterialsView).where(wherePriceAgreement));
            let newMaterials = newMaterialsAll.filter(material => material.PriceAgreementId == priceAgreement.ID);
            //}

            // Get NewFOCMaterials if needed
            //if(!newMaterials){
            //let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
            //let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
            // let newFOCMaterials = await tx.run(SELECT.from(NewFOCMaterialsView).where(wherePriceAgreement));
            let newFOCMaterials = newFOCMaterialsAll.filter(FOCmaterial => FOCmaterial.PriceAgreementId == priceAgreement.ID);
            //}

            // Get ConsumerPrices if needed
            // if (!consumerPrice) {
            if (!consumerPricesInPA) {
                // let whereCountryCode = ServiceHelper.buildFullWhere("CountryCode", "=", priceAgreement.CountryCode);
                // let whereProductPackId = ServiceHelper.buildFullWhere("ProductPackId", "=", priceAgreement.ProductPackId);
                // consumerPrice = await tx.run(SELECT.one.from(MostRecentConsumerPricesView).where(whereCountryCode).where(whereProductPackId));
                // before performance
                // consumerPrice = consumerPricesAll.find(cp => cp.CountryCode == priceAgreement.CountryCode && cp.ProductPackId == priceAgreement.ProductPackId);
                // after performance
                for(const cp of consumerPricesAll){
                    if(cp.CountryCode == priceAgreement.CountryCode && cp.ProductPackId == priceAgreement.ProductPackId){
                        consumerPrice = cp;
                    }
                }
            }

            // calculate Synchronized
            priceAgreement.Synchronized = false;
            // check needed - empty array will return true in case of every
            // if (customerPrices && customerPrices.length > 0) {
            // we are filtering out the PVL conditions first as we don't sync PVL with SAP
            // priceAgreement.Synchronized = customerPrices.filter(price => price.PriceCondition).every(price => price.Synchronized);
            //only one loop instead of two (filter + every)
            priceAgreement.Synchronized = true;
            priceAgreement.isNewPriceAgreement = true;
            priceAgreement.AppliedCount = 0;
            for (let price of customerPrices) {
                if (price.PriceCondition && !price.Synchronized) {
                    priceAgreement.Synchronized = false;
                }
                if (price.Applied || price.Applied === null) {
                    priceAgreement.isNewPriceAgreement = false;
                    priceAgreement.AppliedCount++;
                }
            }
            // }
            //added to the for above
            // priceAgreement.AppliedCount = customerPrices.reduce((acc, cp) => (cp.Applied && ++acc) || acc, 0) || 0;
            // calculate isNewPriceAgreement
            //added to the for above
            // priceAgreement.isNewPriceAgreement = !customerPrices.some(price => price.Applied || price.Applied === null);

            // calculate hasNewMaterials
            if (req.query.SELECT.one || hasNewMaterialsFilterIndex >= 0) {
                // If we don't have applied prices then hasnewmaterials is always FALSE. (so EVEN if we have new materials added)
                if (!customerPrices || customerPrices.length === 0) {
                    priceAgreement.hasNewMaterials = false;
                } else {
                    let hasNewMaterials = newMaterials.some(price => price.isNew);
                    let hasNewFOCMaterials = newFOCMaterials.some(price => price.isNew);

                    if (hasNewMaterials || hasNewFOCMaterials) {
                        priceAgreement.hasNewMaterials = true;
                    }
                }
            }

            // calculate hasNewPrice
            if (consumerPrice) {

                let consumerListPrice = "";
                let consumerRetailPrice = "";

                if (priceAgreement.UoM === "Pack") {
                    consumerListPrice = consumerPrice.ConsumerPriceExclPP;
                    consumerRetailPrice = consumerPrice.MaxPriceNhsPP;
                } else {
                    consumerListPrice = consumerPrice.ConsumerPriceExclPU;
                    consumerRetailPrice = consumerPrice.MaxPriceNhsPU;
                }


                if (Number(priceAgreement.ListPrice) !== Number(consumerListPrice) ||
                    Number(priceAgreement.RetailPrice) !== Number(consumerRetailPrice)) {
                    priceAgreement.hasNewPrice = true;
                }

            }


            if (priceAgreement.ExpiryDate) {
                let dExpiryDate = new Date(priceAgreement.ExpiryDate);
                priceAgreement.ExpiringSoon = calculatedFutureDate >= dExpiryDate && dExpiryDate >= todaysDate ? true : false;
                priceAgreement.Expired = dExpiryDate < todaysDate && priceAgreement.Status !== 'Cancelled' ? true : false;
            }

            priceAgreement.isCancelled = priceAgreement.Status && priceAgreement.Status === 'Cancelled' ? true : false;

            if (req.query.SELECT.one || (priceAgreement.CountryCode === 'ES' && ( hasNewYLLPValues && hasNewYLLPValues.length > 0 || hasNewYLAPValues && hasNewYLAPValues.length > 0 ))) {
                if (priceConditions && institute && !priceAgreement.IgnoreConfPriceChange && !priceAgreement.IgnorePVLPriceChange) {
                    // let mainCondition = priceConditions.find(condition => condition.isMain === true || (condition.PriceConditionClassification && condition.PriceConditionClassification.isMain === true));
                    // let rappelCondition = priceConditions.find(condition => condition.ConditionType === 'Rappel' || (condition.PriceConditionClassification && condition.PriceConditionClassification.ConditionType === 'Rappel'));
                    // let focCondition = priceConditions.find(condition => (condition.ConditionType === 'FOC' || (condition.PriceConditionClassification && condition.PriceConditionClassification.ConditionType === 'FOC')) && condition.ProductCode === mainCondition.ProductCode);

                    let mainCondition = undefined;
                    let rappelCondition = undefined;
                    let focCondition = undefined;
                    for (let condition of priceConditions) {
                        if (condition.isMain === true || (condition.PriceConditionClassification && condition.PriceConditionClassification.isMain === true)) {
                            mainCondition = condition;
                        }
                        if (condition.ConditionType === 'Rappel' || (condition.PriceConditionClassification && condition.PriceConditionClassification.ConditionType === 'Rappel')) {
                            rappelCondition = condition;
                        }
                        if ((condition.ConditionType === 'FOC' || (condition.PriceConditionClassification && condition.PriceConditionClassification.ConditionType === 'FOC')) && (mainCondition && condition.ProductCode === mainCondition.ProductCode)) {
                            focCondition = condition;
                        }
                        if (mainCondition && rappelCondition && focCondition) {
                            break;
                        }
                    }
                    // If no mainCondition was found, we don't evaluate further
                    if (!mainCondition) {
                        return priceAgreement;
                    }
                    // before performance
                    // let offerProduct = OfferProductsAll.find(product => product.OfferID === mainCondition.OfferID && product.ProductCode === mainCondition.ProductCode);
                    // after performance
                    let offerProduct;
                    for(const product of OfferProductsAll){
                        if(product.OfferID === mainCondition.OfferID && product.ProductCode === mainCondition.ProductCode){
                            offerProduct = product;
                        }
                    }
                    let mostRecentYLLP = offerProduct.UnitPerPack === 'Pack' ? mostRecentMasterPrice.YLLP : (mostRecentMasterPrice.YLLP / priceAgreement.Product.ProductPack.PACKFACTOR);
                    let mostRecentYLAP = offerProduct.UnitPerPack === 'Pack' ? mostRecentMasterPrice.YLAP : (mostRecentMasterPrice.YLAP / priceAgreement.Product.ProductPack.PACKFACTOR);
                    let mostRecentPRAF = offerProduct.UnitPerPack === 'Pack' ? mostRecentMasterPrice.PRAF : (mostRecentMasterPrice.PRAF / priceAgreement.Product.ProductPack.PACKFACTOR);

                    if (mainCondition) {
                        /* we are using the maincondition which is coming from the PriceConditionView
                        however, the PVL value in this view, is a reference to the masterprices table, and NOT to the pricecondition table
                        therefore, we're retrieving the condition again from the pricecondition table, based on the existingpriceconditionID */
                        let priceCondition = null;
                        if (priceAgreement.PriceConditions && priceAgreement.PriceConditions.length > 0) {
                            priceCondition = mainCondition;
                        } else {
                            // let wherePriceCondition = ServiceHelper.buildFullWhere("ID", "=", mainCondition.ExistingPriceConditionID);
                            // priceCondition = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceCondition));
                            // before performance
                            // priceCondition = priceConditionAll.find(pc => pc.ID == mainCondition.ExistingPriceConditionID);
                            // after performance
                            for(const pc of priceConditionAll){
                                if(pc.ID == mainCondition.ExistingPriceConditionID){
                                    priceCondition = pc;
                                }
                            }
                        }

                        if (priceCondition) {
                            if (mainCondition.ConditionType === 'Precio Neto' || (mainCondition.PriceConditionClassification && mainCondition.PriceConditionClassification.ConditionType === 'Precio Neto')) {
                                if (institute.InstituteType === 'Private Account' || institute.InstituteType === 'Cluster') {
                                    if (!ServiceHelper.isDoubleEqual(mostRecentYLLP, priceCondition.PVL)) {
                                        if (ServiceHelper.isDoubleXBelowY(mostRecentYLLP, mainCondition.NetPriceWithoutTaxAfterDeductionRD)) {
                                            priceAgreement.hasNewYLLP = 3;
                                        } else {
                                            priceAgreement.hasNewYLLP = 2;
                                        }
                                    } else priceAgreement.hasNewYLLP = 0;
                                }

                                if (institute.InstituteType === 'Public Account' || institute.InstituteType === 'Government Account' || institute.InstituteType === 'National' || institute.InstituteType === 'Region(s)') {
                                    if (!ServiceHelper.isDoubleEqual(mostRecentYLAP, priceCondition.ConfidentialPrice)) {
                                        if (ServiceHelper.isDoubleXBelowY(mostRecentYLAP, mainCondition.NetPriceWithoutTaxAfterDeductionRD)) {
                                            priceAgreement.hasNewYLAP = 3;
                                        } else {
                                            priceAgreement.hasNewYLAP = 2;
                                        }
                                    } else priceAgreement.hasNewYLAP = 0;
                                }
                            } else if (mainCondition.ConditionType === 'Descuento Comercial' || (mainCondition.PriceConditionClassification && mainCondition.PriceConditionClassification.ConditionType === 'Descuento Comercial')) {
                                if (institute.InstituteType === 'Private Account' || institute.InstituteType === 'Cluster') {
                                    if (!ServiceHelper.isDoubleEqual(mostRecentYLLP, priceCondition.PVL)) {
                                        if (mostRecentYLLP * (1 - mainCondition.Discount) < mostRecentPRAF) {
                                            priceAgreement.hasNewYLLP = 4;
                                        } else {
                                            priceAgreement.hasNewYLLP = 1;
                                        }
                                    } else priceAgreement.hasNewYLLP = 0;
                                }

                                if (institute.InstituteType === 'Public Account' || institute.InstituteType === 'Government Account' || institute.InstituteType === 'National' || institute.InstituteType === 'Region(s)') {
                                    if (!ServiceHelper.isDoubleEqual(mostRecentYLAP, priceCondition.ConfidentialPrice)) {
                                        if (mostRecentYLAP * (1 - mainCondition.Discount) < mostRecentPRAF) { //add royal decree to this calculation (new card)
                                            priceAgreement.hasNewYLAP = 4;
                                        } else {
                                            priceAgreement.hasNewYLAP = 1;
                                        }
                                    } else priceAgreement.hasNewYLAP = 0;
                                }
                            }
                        }
                    }

                    if (rappelCondition) {
                        /* we are using the rappelcondition which is coming from the PriceConditionView
                        however, the PVL value in this view, is a reference to the masterprices table, and NOT to the pricecondition table
                        therefore, we're retrieving the condition again from the pricecondition table, based on the existingpriceconditionID */
                        let priceConditionRappel = null;
                        if (priceAgreement.PriceConditions && priceAgreement.PriceConditions.length > 0) {
                            priceConditionRappel = rappelCondition;
                        } else {
                            // let wherePriceCondition = ServiceHelper.buildFullWhere("ID", "=", rappelCondition.ExistingPriceConditionID);
                            // priceConditionRappel = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceCondition));
                            // before perfomance
                            // priceConditionRappel = priceConditionRappelAll.find(pcr => pcr.ID == rappelCondition.ExistingPriceConditionID);
                            // after performance
                            for(const pcr of priceConditionRappelAll){
                                if(pcr.ID == rappelCondition.ExistingPriceConditionID){
                                    priceConditionRappel = pcr;
                                }
                            }

                            //we'll need the discount conditions also, as these will not be filled based on this select
                            // let whereDiscountConditionRef = ServiceHelper.buildFullWhere("PriceCondition_ID", "=", rappelCondition.ExistingPriceConditionID);
                            // let discountConditions = await tx.run(SELECT.from(DiscountCondition).where(whereDiscountConditionRef));
                            // before performance
                            // let discountConditions = discountConditionsAll.find(dc => dc.PriceCondition_ID == rappelCondition.ExistingPriceConditionID);
                            // after performance
                            let discountConditions;
                            for(const dc of discountConditionsAll){
                                if(dc.PriceCondition_ID == rappelCondition.ExistingPriceConditionID){
                                    discountConditions = dc;
                                }
                            }
                            if (discountConditions) {
                                priceConditionRappel.DiscountCondition = discountConditions;
                            }
                        }

                        if (priceConditionRappel) {
                            if (institute.InstituteType === 'Private Account' || institute.InstituteType === 'Cluster') {
                                if (!ServiceHelper.isDoubleEqual(mostRecentYLLP, priceConditionRappel.PVL)) {
                                    if (priceConditionRappel.DiscountCondition && priceConditionRappel.DiscountCondition.length > 0 && (mostRecentYLLP * (1 - Math.max.apply(Math, priceConditionRappel.DiscountCondition.map(discountCondition => (discountCondition.Discount / 100)))) < mostRecentPRAF)) { //Discount is a separate entity and should thus be handled as taking the max(DiscountCondition) value as a discount
                                        priceAgreement.hasNewYLLP = priceAgreement.hasNewYLLP === 3 ? priceAgreement.hasNewYLLP : 4;
                                    } else {
                                        priceAgreement.hasNewYLLP = priceAgreement.hasNewYLLP >= 3 ? priceAgreement.hasNewYLLP : 1;
                                    }
                                }
                            }

                            if (institute.InstituteType === 'Public Account' || institute.InstituteType === 'Government Account' || institute.InstituteType === 'National' || institute.InstituteType === 'Region(s)') {
                                if (!ServiceHelper.isDoubleEqual(mostRecentYLAP, priceConditionRappel.ConfidentialPrice)) {
                                    if (priceConditionRappel.DiscountCondition && priceConditionRappel.DiscountCondition.length > 0 && (mostRecentYLAP * (1 - Math.max.apply(Math, priceConditionRappel.DiscountCondition.map(discountCondition => (discountCondition.Discount / 100)))) < mostRecentPRAF)) { //add royal decree to this calculation (new card)
                                        priceAgreement.hasNewYLAP = priceAgreement.hasNewYLAP === 3 ? priceAgreement.hasNewYLAP : 4;
                                    } else {
                                        priceAgreement.hasNewYLAP = priceAgreement.hasNewYLAP >= 3 ? priceAgreement.hasNewYLAP : 1;
                                    }
                                }
                            }
                        }
                    }

                    if (focCondition) {
                        let priceConditionFOC = null;
                        if (priceAgreement.PriceConditions && priceAgreement.PriceConditions.length > 0) {
                            priceConditionFOC = focCondition;
                        } else {
                            // let wherePriceCondition = ServiceHelper.buildFullWhere("ID", "=", focCondition.ExistingPriceConditionID);
                            // priceConditionFOC = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceCondition));
                            // before performance
                            // priceConditionFOC = priceConditionFOCAll.find(pcf => pcf.ID == focCondition.ExistingPriceConditionID);
                            // after performance
                            for(const pcf of priceConditionFOCAll){
                                if(pcf.ID == focCondition.ExistingPriceConditionID){
                                    priceConditionFOC = pcf;
                                }
                            }
                        }

                        if (priceConditionFOC) {
                            if (institute.InstituteType === 'Private Account' || institute.InstituteType === 'Cluster') {
                                if (!ServiceHelper.isDoubleEqual(mostRecentYLLP, priceConditionFOC.PVL)) {
                                    priceAgreement.hasNewYLLP = priceAgreement.hasNewYLLP >= 3 ? priceAgreement.hasNewYLLP : 1;
                                } else {
                                    priceAgreement.hasNewYLLP = priceAgreement.hasNewYLAP !== 0 && priceAgreement.hasNewYLAP !== 2 ? priceAgreement.hasNewYLAP : 0;
                                }
                            }

                            if (institute.InstituteType === 'Public Account' || institute.InstituteType === 'Government Account' || institute.InstituteType === 'National' || institute.InstituteType === 'Region(s)') {
                                if (!ServiceHelper.isDoubleEqual(mostRecentYLAP, priceConditionFOC.ConfidentialPrice)) {
                                    priceAgreement.hasNewYLAP = priceAgreement.hasNewYLAP >= 3 ? priceAgreement.hasNewYLAP : 1;
                                } else {
                                    priceAgreement.hasNewYLAP = priceAgreement.hasNewYLAP !== 0 && priceAgreement.hasNewYLAP !== 2 ? priceAgreement.hasNewYLAP : 0;
                                }
                            }
                        }
                    }
                } else if (priceAgreement.IgnorePVLPriceChange) {
                    priceAgreement.hasNewYLLP = 2;
                } else if (priceAgreement.IgnoreConfPriceChange) {
                    priceAgreement.hasNewYLAP = 2;
                }
            }
            return priceAgreement;

        };

        // calculate the 'Synchronized' field based on CustomerPrices 
        startTrace("CalculateFields");
        let result = Array.isArray(data) ? data.map(calculateFields) : [calculateFields(data)];
        stopTrace("CalculateFields");
        // const promises = Array.isArray(data) ? data.map(calculateFields) : [calculateFields(data)];

        // let result = await Promise.all(promises);

        startTrace("apply filters");
        //3. return the filtered results if calculated filter is used
        if (hasNewMaterialsFilterValues && hasNewMaterialsFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.hasNewMaterials && priceAgreement.hasNewMaterials === hasNewMaterialsFilterValues[0]);
            result = filteredResult;
        }

        if (hasNewPriceFilterValues && hasNewPriceFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.hasNewPrice && priceAgreement.hasNewPrice === hasNewPriceFilterValues[0]);
            result = filteredResult;
        }

        if (hasExpiringSoonFilterValues && hasExpiringSoonFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.ExpiringSoon);
            result = filteredResult;
        }

        if (hasExpiredFilterValues && hasExpiredFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.Expired === hasExpiredFilterValues[0]);
            result = filteredResult;
        }

        if (isNewPriceAgreementFilterValues && isNewPriceAgreementFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.isNewPriceAgreement === isNewPriceAgreementFilterValues[0]);
            result = filteredResult;
        }

        if (isCancelledFilterValues && isCancelledFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.isCancelled === isCancelledFilterValues[0]);
            result = filteredResult;
        }

        if (isSynchronizedFilterValues && isSynchronizedFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.Synchronized === isSynchronizedFilterValues[0]);
            result = filteredResult;
        }

        if (appliedCountFilterValues && appliedCountFilterValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.AppliedCount >= appliedCountFilterValues[0]);
            result = filteredResult;
        }

        if (hasNewYLLPValues && hasNewYLLPValues.length > 0 || hasNewYLAPValues && hasNewYLAPValues.length > 0) {
            let filteredResult;
            if (hasNewYLLPValues && hasNewYLLPValues.length > 0 && hasNewYLAPValues && hasNewYLAPValues.length > 0) {
                filteredResult = result.filter(priceAgreement => priceAgreement.hasNewYLLP === hasNewYLLPValues[0] || priceAgreement.hasNewYLAP === hasNewYLAPValues[0]);
            } else if (!hasNewYLLPValues || (hasNewYLLPValues && hasNewYLLPValues.length === 0)) {
                filteredResult = result.filter(priceAgreement => priceAgreement.hasNewYLAP === hasNewYLAPValues[0]);
            } else if (!hasNewYLAPValues || (hasNewYLAPValues && hasNewYLAPValues.length === 0)) {
                filteredResult = result.filter(priceAgreement => priceAgreement.hasNewYLLP === hasNewYLLPValues[0]);
            }
            result = filteredResult;
        }

        if (hasProductPackIdIndex && hasProductPackIdValues.length > 0) {
            const filteredResult = result.filter(priceAgreement => priceAgreement.ProductPackId === hasProductPackIdValues[0]);
            result = filteredResult;
        }

        stopTrace("apply filters");
        startTrace("Commit");
        await tx.commit();
        stopTrace("Commit");
        if (req.query.SELECT.columns[0].func === 'count') {
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
        return req.reply(result);

    });

    srv.after('READ', 'PriceAgreements', async (data) => {
        const tx = db.tx();
        // Calculate DeliveredVolume 
        for (let each of data) await calculateDeliveredVolume(each);
        async function calculateDeliveredVolume(pag) {
            let deliveries = pag.Deliveries;
            if (!deliveries) {
                try {
                    deliveries = await tx.run(SELECT.from(Deliveries).where({ PriceAgreementId: pag.ID }));
                    await tx.commit();
                } catch (e) {
                    await tx.rollback(e)
                }
            }
            pag.DeliveredVolume = deliveries.reduce((sum, delivery) => sum + delivery.ANZPK, 0);
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
 //EHQUT- Italy - Synchronize button becomes available again when user changes expiry date
    srv.on('syncPriceAgreements', async req => {
        // const tx = cds.transaction(req);
        const tx = cds.tx(req);
        const customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: req.data.ids } }));
        if (customerPrices && customerPrices.length <= 0) {
            return req.reject(404, `No customer prices were found for the following PriceAgreement: ${req.data.ids}`);
        }

        // cds.spawn({},async (tx) => { //TODO: would be better to run via spawn
        // await this.syncPriceAgreements(customerPrices);
        syncPriceAgreements(req.data.ids, customerPrices);//run without waiting
        // });
        return req.reply();
    });
    async function syncPriceAgreements(pas, customerPrices) {
        console.log(`Start synchronisation of PriceAgreements`);

        console.log(`Prepare categories of customer prices`);
        const mainPriceConditions = customerPrices.filter(item => item.PriceCondition === "YLTP" || item.PriceCondition === "YLTF" || item.PriceCondition === "YL60" || item.PriceCondition === "YDC0");
        const focPriceConditions = customerPrices.filter(item => item.PriceCondition === "YA03" || item.PriceCondition === "YA01");
        const rappelPriceConditions = customerPrices.filter(item => item.PriceCondition === "YAW1");
        const allCustomerPrices = mainPriceConditions.concat(focPriceConditions).concat(rappelPriceConditions);

        (!allCustomerPrices || allCustomerPrices.length === 0) && console.log("Nothing to process");
        await setStatusPriceAgreement(allCustomerPrices.map(cp => cp.PriceAgreementId), 'RUNNING');

        console.log(`Prepare requests of customer prices`);
        const updateMainConditionPromises = mainPriceConditions.map(custPrice => updateCustomerPrice(custPrice));
        const updateFOCConditionPromises = focPriceConditions.map(custPrice => updateFOCcustPrices(custPrice));
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
            await tx.run(UPDATE(PriceAgreements).with({ SynchronizationStatus: status }).where({ ID: { in: pas } }));
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


    async function updateCustomerPrice(customerPrice) {
        console.log(`Prepare sending update customer price: ${customerPrice.ID}`);
        const tx = cds.tx();
        const body = getPriceAgreementRequestBodyTemplate();
        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));
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

        //we should add "-" only in case of Price Condition "YL60" and "YDC0"
        if (customerPrice.PriceCondition === "YL60" || customerPrice.PriceCondition === "YDC0") {
            kbetr = kbetr + "-";
        }

        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KUNNR = parseInt(institute.CustomerID);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.MATNR = parseInt(customerPrice.MaterialNumber);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth() + 1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth() + 1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KSCHL = customerPrice.PriceCondition;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KBETR = kbetr;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KSCHL = customerPrice.PriceCondition;

        tender && (body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG["_-BAY0_-GZ_SDREFINFO01"].REFVAL = tender.SAPID);

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


    function getPriceAgreementRequestBodyTemplate() {
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
                        "KOTABNR": 878,
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

    async function updateFOCcustPrices(customerPrice) {
        console.log(`Prepare sending update FOC customer price: ${customerPrice.ID}`);
        const tx = cds.tx();
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

        const body = getPriceAgreementRequestBodyTemplate();
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
        if (customerPrice.CountryCode === 'IT') {
            let priceAgreementFOC = await tx.run(SELECT.one.from(PriceAgreementFOC).where(whereCountry).where(whereProductCode).where(whereOfferId).where(whereFOCproductpackID));
            kstbm = priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' ? priceAgreementFOC.FreeGoods * offerProduct.RequestedVolume : (customerPrice.FOCproductPackID && (priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS' || priceAgreementFOC.FreeGoods_ABS_PCT === 'STP')) ? priceAgreementFOC.FreeGoods : 0;
            mikbas = priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' || priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS' ? 1 : (customerPrice.FOCproductPackID && priceAgreementFOC.FreeGoods_ABS_PCT === 'STP') ? priceAgreementFOC.FreeGoods_Step : 0;
            mxkbas = priceAgreementFOC.FreeGoods_ABS_PCT === 'PCT' || priceAgreementFOC.FreeGoods_ABS_PCT === 'ABS' ? offerProduct.RequestedVolume : (customerPrice.FOCproductPackID && priceAgreementFOC.FreeGoods_ABS_PCT === 'STP') ? priceAgreementFOC.FreeGoods_Step : 0;
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.BOMAT = parseInt(customerPrice.FOCmaterialNumber);
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KOTABNR = 921;
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.PSTYP = 1;
            delete body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG["_-BAY0_-GZ_SDREFINFO01"];
        }
        // Spain only
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

            const focMaterial = await tx.run(SELECT.one.from(PT_TMSKUPRDPCK).where(whereFOCproductpackID).where({ CountryCode: priceAgreement.CountryCode, ActiveRecord: 'Yes' }));
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

        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);

        const body = getES01RequestBodyTemplate();
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].BONEM = parseInt(institute.CustomerID);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].BOTEX = tender.SAPID;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth() + 1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth() + 1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].DATAB_GR = body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATAB;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].DATBI_GR = body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"].DATBI;
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KUNNR = parseInt(institute.CustomerID);
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].MATNR = parseInt(customerPrice.MaterialNumber);


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
                    "KBETR": dc.Discount.toFixed(2) + "-"
                });
            });
        }

        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KBETR = lowestDiscountCondition && lowestDiscountCondition.Discount && lowestDiscountCondition.Discount.toFixed(2).concat("-") || ""; // KBETR from the minimum(KSTBW)
        body["_BAY0-GZ_SALESAGR_ES01"].IDOC["_BAY0-GZ_SALESAGRHEAD"]["_BAY0-GZ_SALESAGRITEM"][0].KBRUE = highestDiscountCondition && highestDiscountCondition.Discount && highestDiscountCondition.Discount.toFixed(2).concat("-") || ""; // minimum(KSTBW) value from the DiscountConditions array

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
    function getES01RequestBodyTemplate() {
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
                        "KOTABNR": 750,
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
                                "KSCHL": "YAW1",
                                "E1KONW": []
                            }
                        ]
                    }
                }
            }
        }
    };

}