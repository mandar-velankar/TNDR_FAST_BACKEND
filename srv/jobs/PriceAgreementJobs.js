const cds = require('@sap/cds');
// const BaseCron = require('cron-es6');
const BaseJob = require('./BaseJob');
const core = require('@sap-cloud-sdk/core');

module.exports.ExtendPriceAgreements = class ExtendPriceAgreements extends BaseJob {

    constructor(jobName,jobTime) {
        super(jobName,jobTime);
    }

    async syncPriceAgreements(ids){
        const tx = cds.tx();
        const customerPrices = await tx.run(SELECT.from(CustomerPrices).where({ PriceAgreementId: { in: ids } }));
        if (customerPrices && customerPrices.length <= 0) {
            return req.reject(404, `No customer prices were found for the following PriceAgreement: ${ids}`);
        }
        const mainPriceConditions = customerPrices.filter(item => item.PriceCondition === "YLTP" || item.PriceCondition === "YLTF" || item.PriceCondition === "YL60" || item.PriceCondition === "YDC0");
        const updateMainConditionPromises = mainPriceConditions.map(custPrice => updateCustomerPrice(custPrice, tx, req));

        // Synchronize
        const result = await Promise.all(updateMainConditionPromises); 
        // Set 'Synchronized' to true and add IDOC number from the response
        result.length > 0 && await updateCustomerPrices(result, mainPriceConditions); // !!the order of PriceCondition arrays is important

        return req.reply(result);
    };

    async updateCustomerPrices(response, priceConditions){
        const tx = cds.tx();
        const refIdocIDs = response && response.map(res => res.headers.sapidocdbid) || [];
        const customerPriceIDs = priceConditions && priceConditions.map(condition => condition.ID) || [];
        if(refIdocIDs.length === customerPriceIDs.length){
            try {     
                const updatePromises = refIdocIDs.map((IdocID, index) => {
                    return tx.run(UPDATE(CustomerPrices).with({Synchronized: true, RefIdocNumber: IdocID}).where({ ID: customerPriceIDs[index] }));
                });
                await Promise.all(updatePromises);
                await tx.commit();
            } catch (error) {
                await tx.rollback(error);
            }
        }
    };

    async updateCustomerPrice(customerPrice, tx, req){
        const body = getPriceAgreementRequestBodyTemplate(); 
        const effectiveDate = new Date(customerPrice.EffectiveDate);
        const expiryDate = new Date(customerPrice.ExpiryDate);
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", customerPrice.InstituteId);
        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", customerPrice.CountryCode);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));
        if (!institute) {
            return req.reject(404, `No institute was found for InstituteID: ${customerPrice.InstituteId}`);
        }
        const wherePriceAgreementId = ServiceHelper.buildFullWhere("Id", "=", customerPrice.PriceAgreementId);
        let priceAgreement = await tx.run(SELECT.one.from(PriceAgreements).where(wherePriceAgreementId));
        if (!priceAgreement) {
            return req.reject(404, `No priceAgreement was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
        }
        const whereOfferID = ServiceHelper.buildFullWhere("OfferID", "=", priceAgreement.OfferId);
        const whereProductpackID = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", customerPrice.ProductPackId);
        let offer = await tx.run(SELECT.one.from(PT_TMOFRS).where(whereOfferID));     
        if (!offer) {
            return req.reject(404, `No offer was found for OfferID: ${priceAgreement.OfferId}`);
        }

        const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({TenderID: priceAgreement.TenderId}));

        let packFactor;
        if(customerPrice.ProductPackId){
            let productPack = await tx.run(SELECT.one.from(PT_TMPRDPCK).where(whereProductpackID));
            packFactor = productPack.PACKFACTOR;
        } else {
            packFactor = 1;
        }

        let kbetr = parseFloat(customerPrice.Price);
        
        // Spain only
        if(customerPrice.CountryCode === 'ES'){
            const wherePriceAgreement_ID = ServiceHelper.buildFullWhere("PriceAgreement_ID", "=", customerPrice.PriceAgreementId);
            const wherePriceConditionCode = ServiceHelper.buildFullWhere("PriceConditionCode", "=", customerPrice.PriceCondition);
            let priceCondition = await tx.run(SELECT.one.from(PriceCondition).where(wherePriceAgreement_ID).where(wherePriceConditionCode));     
            if (!priceCondition) {
                return req.reject(404, `No priceCondition was found for PriceAgreementID: ${customerPrice.PriceAgreementId}`);
            }
            // set KBETR value
            if(customerPrice.PriceCondition === "YLTF" || customerPrice.PriceCondition === "YLTP") kbetr = priceCondition.NetPriceWithoutTaxAfterDeductionRD;
            else kbetr = priceCondition.Discount * 100;

            // set partner and sales organisation
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.VKORG = "QFHC";
            body["_-BAY0_-GZ_SDCOND_A04"].IDOC.EDI_DC40.SNDPRN = "FAST_ES";

        }

        // KBETR per Pack or Unit
        if (offer.Division === "Pharma" && priceAgreement.UoM === "Unit" ){// convert and send per pack
            kbetr  = kbetr * packFactor;
        }else if (offer.Division === "Radiology" && priceAgreement.UoM === "Pack" ) { // => radiology so per unit
            kbetr  = kbetr / packFactor;

        }
 
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KUNNR = parseInt(institute.CustomerID);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.MATNR = parseInt(customerPrice.MaterialNumber);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATAB = parseInt(`${effectiveDate.getFullYear()}${("0" + (effectiveDate.getMonth()+1)).slice(-2)}${("0" + effectiveDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.DATBI = parseInt(`${expiryDate.getFullYear()}${("0" + (expiryDate.getMonth()+1)).slice(-2)}${("0" + expiryDate.getDate()).slice(-2)}`);
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KBETR = kbetr;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.E1KONH.E1KONP.KSCHL = customerPrice.PriceCondition;
        body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG.KSCHL = customerPrice.PriceCondition;

        tender && (body["_-BAY0_-GZ_SDCOND_A04"].IDOC.E1KOMG["_-BAY0_-GZ_SDREFINFO01"].REFVAL = tender.SAPID);

        return await updatePriceConditions(customerPrice.CountryCode, "PriceCondition", body);

    }

    async getPriceAgreementRequestBodyTemplate(){
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
                  "VTWEG": 0,
                  "SPART": 0,
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

    async updatePriceConditions(countryCode, resource, body){

        if (!body) {
            throw Error("The body of the request is missing.");
        }
        
        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({Provider:'PriceAgreement', CountryCode: countryCode, Resource: resource}));

        const url = `${apiConfig.Host}${apiConfig.BasePath}${apiConfig.ResourcePath}`;
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


    async getBearerToken() {

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

    async updatePriceAgreementExpiration(){
        const tx = cds.tx();
        try {

            const { PriceAgreements } = this.db.entities("com.bayer.SXTENDER.PriceAgreementsData");

            //get all price agreements which have to be extended
            let query = cds.parse.cql (`SELECT * FROM ${PriceAgreements.name} as PriceAgreements where PriceAgreements.ExtendPriceAgreement = 'true'`);

            const priceAgreements = await tx.run(query);
            let aPriceAgreementIds = {};

            const promises = priceAgreements.map(agreement => {
                let newDate = new Date(agreement.ExpiryDate);
                newDate.setMonth(newDate.getMonth()+agreement.ExpiryExtensionPeriod);
                aPriceAgreementIds.push(priceAgreements.ID); //prepare agreements to be synchronised

                const obj = {
                    ExpiryDate: newDate
                }

                //update the actual price agreement withh the new price agreement date
                const result = tx.run(UPDATE(PriceAgreements).with(obj).where({ ID: priceAgreements.ID }));

                return result;
            });

            //execute the promises and log the output
            if(promises && promises.length > 0){
                console.log(`Updating ${PriceAgreements.name} ...`);
                const result = await Promise.all(promises);
                await tx.commit();
                console.log(`${promises.length} Expiry dates successfully updated in ${PriceAgreements.name}.`);
                return result;
            }

            //resync all updated price agreements
            //const resultSync = await paFactory.syncPriceAgreements(tx, req, priceAgreements);
            const sDestinationName = 'API-Fast';

            let response = await core.executeHttpRequest({ destinationName: sDestinationName}, {
                method: 'POST',
                url: "/v2/priceagreement/syncPriceAgreements",
                data: aPriceAgreementIds //gather all priceagreement IDs
            });

            await tx.commit();
            return;

        } catch (error) {
            console.log('Updating expiry dates has failed.');
            console.log(error);
            await tx.rollback(error);
        }   
    };
};