const cds = require('@sap/cds');

exports.syncPriceAgreements = async (tx, req, priceAgreements) => {
    const customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: req.data.ids } }));
    if (customerPrices && customerPrices.length <= 0) {
        return req.reject(404, `No customer prices were found for the following PriceAgreement: ${req.data.ids}`);
    }
    const mainPriceConditions = customerPrices.filter(item => item.PriceCondition === "YLTP" || item.PriceCondition === "YLTF" || item.PriceCondition === "YL60" || item.PriceCondition === "YDC0");
    const focPriceConditions = customerPrices.filter(item => item.PriceCondition === "YA03" || item.PriceCondition === "YA01");
    const rappelPriceConditions = customerPrices.filter(item => item.PriceCondition === "YAW1");

    const updateMainConditionPromises = mainPriceConditions.map(custPrice => updateCustomerPrice(custPrice, tx, req));
    const updateFOCConditionPromises = focPriceConditions.map(custPrice => updateFOCcustPrices(custPrice, tx, req));
    const updateRappelConditionPromises = rappelPriceConditions.map(custPrice => updateRappelcustPrices(custPrice, tx, req));

    // return promises
    const result = await Promise.all(updateMainConditionPromises.concat(updateFOCConditionPromises).concat(updateRappelConditionPromises)); 
    // Set 'Synchronized' to true and add IDOC number from the response
    result.length > 0 && await updateCustomerPrices(result, mainPriceConditions.concat(focPriceConditions).concat(rappelPriceConditions));
    
    return result;
}