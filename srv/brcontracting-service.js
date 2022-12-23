const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {
    srv.on('syncContract', async req => {
        const tx = cds.tx(req);
        const contract = await tx.run(SELECT.one.from(Contracts).where({ ID: contractID }));
        if (!contract) {
            return req.reject(404, `No contracts were found for the following ID: ${req.data.ids}`);
        }

        syncContract(req.data.ids, customerPrices);
        return req.reply();
    });

    async function syncContract(contract) {
        console.log(`Start synchronisation of PriceAgreements`);



        // Set 'Synchronized' to true and add IDOC number from the response
        try {
            console.log(`Update synchronization status in DB for contract`);
            if (contractWithoutError.length > 0) {
                console.log(`Process contract count: ${paWithoutErrorsIds.length}`);
                await setSyncStatusContract(contract.ID, true);
            } else {
                console.log(`Nothing to update in DB`);
            }
            console.log(`Finished synchronisation of Contract`);
        } catch (error) {
            await setSyncStatusContract(contract.ID, 'false');//error for all
        }
    }

    async function updateContract(countryCode, resource, body) {

        if (!body) {
            console.error("The body of the request is missing.");
            return false;
        }

        console.log(`Get api config ...`);
        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'Contract', CountryCode: countryCode, Resource: resource }));
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

    function getContractRequestBodyTemplate() {
        return {
            "_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT": {
             "IV_DIVISION": "16",
             "IV_DOC_TYPE": "ZWCT",
             "IV_PARTNER": "1716676",
             "IV_PO_DATE": "20221214",
             "IV_PO_NUMBER": "XXX",
             "IV_PR_DATE": "20221214",
             "IV_SALES_ORG": "MWHC",
             "IV_SIMULATE": null,
             "IV_VALID_F": "20221214",
             "IV_VALID_T": "20231214",
             "TT_ITEMS": {
                "item": [
                    {
                    "ITEM": "1",
                    "MATERIAL": "4432952",
                    "UNIT_PRICE": "61.20",
                    "UNIT_PRICE_M": null,
                    "MANUAL_D": "0.1",
                    "EFFORT_A": null,
                    "CAP": "0.15",
                    "TX_ICMS": null,
                    "ITEM_QTD": "901"
                    },{
                        "ITEM": "2",
                        "MATERIAL": "4432952",
                        "UNIT_PRICE": "61.20",
                        "UNIT_PRICE_M": null,
                        "MANUAL_D": "0.1",
                        "EFFORT_A": null,
                        "CAP": "0.15",
                        "TX_ICMS": null,
                        "ITEM_QTD": "901"
                    }
                    ]
                }
            }
        }
    }
};