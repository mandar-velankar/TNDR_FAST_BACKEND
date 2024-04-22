const ServiceHelper = require('../utils/ServiceHelper');

module.exports = async ({ chunk, requiredParameters}) => {
    return chunk.map(priceAgreement => calculateFields(priceAgreement, requiredParameters));
}

function calculateFields(priceAgreement, requiredParameters){

    const {
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
        req_query_SELECT_one,
        hasNewYLLPValues,
        hasNewYLAPValues,
        priceConditionsAll,
        OfferProductsAll,
        priceConditionRappelAll,
        discountConditionsAll,
        priceConditionFOCAll
    } = requiredParameters;

    const todaysDate = new Date();

    let calculatedFutureDate = new Date();
    calculatedFutureDate.setMonth(calculatedFutureDate.getMonth() + 3);

    let customerPrices = priceAgreement.CustomerPrices || [];
    let mostRecentMasterPrice = undefined;
    let consumerPrice = priceAgreement.ConsumerPrice;


    let priceConditions = priceAgreement.PriceConditions || [];
    let institute = priceAgreement.Institute;
    if(!institute){
        for(const inst of institutesAll){
            if(inst.InstituteID === priceAgreement.InstituteId){
                institute = inst;
                break;
            }
        }
    }

    // Get CustomerPrices if needed
    if (!customerPricesInPA) {
            for(const cp of customerPricesAll){
            if(cp.PriceAgreementId == priceAgreement.ID){
                customerPrices.push(cp);
            }
        }
    }
    // }

    /*if (!priceConditionsInPa) {
        for(const pc of priceConditionsAll){
            if(pc.OfferID == priceAgreement.OfferId && pc.CountryCode == priceAgreement.CountryCode && pc.ProductCode == priceAgreement.ProductPackId && pc.ExistingPriceConditionID !== null){
                priceConditions.push(pc);
            }
        }
    }*/

    if (!mostRecentMasterPrice) {
        for(const mp of mostRecentMasterPricesAll){
            if(mp.CountryCode == priceAgreement.CountryCode && mp.ProductPackId == priceAgreement.ProductPackId){
                mostRecentMasterPrice = mp;
                break;
            }
        }
    }

    // Get NewMaterials if needed
    let newMaterials = [];
    for(const material of newMaterialsAll){
        if(material.PriceAgreementId == priceAgreement.ID){
            newMaterials.push(material);
        }
    }

    // Get NewFOCMaterials if needed
    let newFOCMaterials = [];
    for(const FOCmaterial of newFOCMaterialsAll){
        if(FOCmaterial.PriceAgreementId == priceAgreement.ID){
            newFOCMaterials.push(FOCmaterial);
        }
    }

    // Get ConsumerPrices if needed
    if (!consumerPricesInPA) {
        for(const cp of consumerPricesAll){
            if(cp.CountryCode == priceAgreement.CountryCode && cp.ProductPackId == priceAgreement.ProductPackId){
                consumerPrice = cp;
                break;
            }
        }
    }

    // calculate Synchronized
    // we are filtering out the PVL conditions first as we don't sync PVL with SAP
    //only one loop instead of two (filter + every)
   //priceAgreement.Synchronized = true;
    priceAgreement.isNewPriceAgreement = true;
    priceAgreement.AppliedCount = 0;
    for (let price of customerPrices) {
        if (price.PriceCondition && !price.Synchronized) {
            priceAgreement.Synchronized = false;
        }
        if(price.Synchronized){
            priceAgreement.Synchronized = true;
        }
        if (price.Applied || price.Applied === null) {
            priceAgreement.isNewPriceAgreement = false;
            priceAgreement.AppliedCount++;
        }
    }

    // calculate hasNewMaterials
    if (req_query_SELECT_one || hasNewMaterialsFilterIndex >= 0) {
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

        if(!ServiceHelper.isDoubleEqual(priceAgreement.ListPrice, consumerListPrice) || !ServiceHelper.isDoubleEqual(priceAgreement.RetailPrice, consumerRetailPrice)) {
            priceAgreement.hasNewPrice = true;
        }

    }


    if (priceAgreement.ExpiryDate) {
        let dExpiryDate = new Date(priceAgreement.ExpiryDate);
        priceAgreement.ExpiringSoon = calculatedFutureDate >= dExpiryDate && dExpiryDate >= todaysDate ? true : false;
        priceAgreement.Expired = dExpiryDate < todaysDate && priceAgreement.Status !== 'Cancelled' ? true : false;
    }

    priceAgreement.isCancelled = priceAgreement.Status && priceAgreement.Status === 'Cancelled' ? true : false;

    if (req_query_SELECT_one || (priceAgreement.CountryCode === 'ES' && ( hasNewYLLPValues && hasNewYLLPValues.length > 0 || hasNewYLAPValues && hasNewYLAPValues.length > 0 ))) {
        if (priceConditions && institute && !priceAgreement.IgnoreConfPriceChange && !priceAgreement.IgnorePVLPriceChange) {

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
            if (!mainCondition || !mostRecentMasterPrice) {
                return priceAgreement;
            }

            let offerProduct;
            for(const product of OfferProductsAll){
                if(product.OfferID === mainCondition.OfferID && product.ProductCode === mainCondition.ProductCode){
                    offerProduct = product;
                }
            }
            let mostRecentYLLP = offerProduct.UnitPerPack === 'Pack' ? mostRecentMasterPrice.YLLP : (mostRecentMasterPrice.YLLP / priceAgreement.Product.ProductPack.PACKFACTOR);
            let mostRecentYLAP = offerProduct.UnitPerPack === 'Pack' ? mostRecentMasterPrice.YLAP : (mostRecentMasterPrice.YLAP / priceAgreement.Product.ProductPack.PACKFACTOR);

            //calculate mostRecentPraf
            let mostRecentPRAF = 0;
            if(offerProduct.UnitPerPack === 'Pack' && ( institute.InstituteType === 'Private Account' || institute.InstituteType === 'Cluster' ) ){
                mostRecentPRAF = mostRecentMasterPrice.PRAF_Private; 
            } else if(offerProduct.UnitPerPack !== 'Pack' && ( institute.InstituteType === 'Private Account' || institute.InstituteType === 'Cluster' ) ){
                mostRecentPRAF = (mostRecentMasterPrice.PRAF_Private / priceAgreement.Product.ProductPack.PACKFACTOR);
            } else if(offerProduct.UnitPerPack === 'Pack' && institute.InstituteType !== 'Private Account' && institute.InstituteType !== 'Cluster' ){
                mostRecentPRAF = mostRecentMasterPrice.PRAF_Public; 
            } else if(offerProduct.UnitPerPack !== 'Pack' && institute.InstituteType !== 'Private Account' && institute.InstituteType !== 'Cluster' ){
                mostRecentPRAF = (mostRecentMasterPrice.PRAF_Public / priceAgreement.Product.ProductPack.PACKFACTOR);
            }

            if (mainCondition) {
                /* we are using the maincondition which is coming from the PriceConditionView
                however, the PVL value in this view, is a reference to the masterprices table, and NOT to the pricecondition table
                therefore, we're retrieving the condition again from the pricecondition table, based on the existingpriceconditionID */
                let priceCondition = null;
                if (priceAgreement.PriceConditions && priceAgreement.PriceConditions.length > 0) {
                    priceCondition = mainCondition;
                } else {
                    for(const pc of priceConditionsAll){
                        if(pc.ExistingPriceConditionID == mainCondition.ExistingPriceConditionID){
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
                    for(const pcr of priceConditionRappelAll){
                        if(pcr.ExistingPriceConditionID == rappelCondition.ExistingPriceConditionID){
                            priceConditionRappel = pcr;
                        }
                    }

                    //we'll need the discount conditions also, as these will not be filled based on this select
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
                    for(const pcf of priceConditionFOCAll){
                        if(pcf.ExistingPriceConditionID == focCondition.ExistingPriceConditionID){
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
}