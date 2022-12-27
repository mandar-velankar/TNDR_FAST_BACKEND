const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');
const axios = require('axios');
const qs = require("qs");

module.exports = (srv) => {
    srv.on('createContract', async req => {
        const {
            Contracts,
            ContractProducts
        } = cds.entities("com.bayer.SXTENDER.BrazilContractingData");
        const {
            PT_TMPRDHIER,
            PT_TMDIST,
            PT_TMINST
        } = cds.entities("com.bayer.SXTENDER.MasterData");
        const {
            PT_TMOFRS,
            PT_TMOFPR,
            PT_TMTEND,
            PriceConditions
        } = cds.entities("com.bayer.SXTENDER.TransactionalData");

        try {
            const tx = cds.tx(req);
            const contract = await tx.run(SELECT.one.from(Contracts).where({ ID: req.data.contractID }));
            const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({ TenderID: contract.TenderID }));
            const contractProducts = await tx.run(SELECT.from(ContractProducts).where({ Contract_ID: req.data.contractID, OfferID: contract.OfferID }));
            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({ OfferID: contract.OfferID }));
            const offer = await tx.run(SELECT.one.from(PT_TMOFRS).where({ OfferID: contract.OfferID }));
            const divisionCode = await tx.run(SELECT.one.from(PT_TMPRDHIER).where({ HLEVEL1_NAME: offer.Division }));
            const offerDistributor = await tx.run(SELECT.one.from(PT_TMDIST).where({ DistributorID: offer.DistributorID }));
            const institute = await tx.run(SELECT.one.from(PT_TMINST).where({ InstituteID: contract.InstituteID }));
            const distributor = await tx.run(SELECT.one.from(PT_TMDIST).where({ DistributorID: contract.DistributorID }));
            const priceconditions = await tx.run(SELECT.from(PriceCondition).where({ OfferID: contract.OfferID }));

            if (!contract) {
                return req.reject(404, "Contract is not found");
            }
            if (!contractProducts.length) {
                return req.reject(404, "Contract Products are not found");
            }
            if (!offerProducts.length) {
                return req.reject(404, "Offer products are not found");
            }
            if (!offer) {
                return req.reject(404, "Offer is not found");
            }
            if (!divisionCode) {
                return req.reject(404, "Division is not found");
            }
            if (!offerDistributor) {
                return req.reject(404, "Offer distributor is not found");
            }

            // Update all fields in sales order body template  
            const updateContractBody = updateContract(contract, contractProducts, offerProducts, divisionCode, offerDistributor, institute, distributor, tender, priceconditions);
            // Send request to SAP
            const resFromSAP = await sendCreatedContractToSAP("BR", "Contract", updateContractBody);
            // Update SalesOrder Status
            await tx.run(UPDATE(Contracts).with({StatusID: "51a102b8-8119-11ed-a1eb-0242ac120002"}).where({ID: req.data.contractID}));
            await tx.commit();
            return req.reply("Contract is created");
        } catch (error) {
            await tx.rollback();
        }
    });

    function updateContract (contract, contractProducts, offerProducts, divisionCode, offerDistributor, institute, distributor, tender, priceconditions) {
        const body = getContractRequestBodyTemplate();
        if (!body) {
            return false;
        }
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_VALID_F"]      = contract.StartDate;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_VALID_T"]      = contract.EndDate;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_DIVISION"]     = Number(divisionCode.HLEVEL1_CODE) == 8 ? "0" + divisionCode.HLEVEL1_CODE : divisionCode.HLEVEL1_CODE;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PARTNER"]      = offerDistributor.DistributorName === 'Bayer Brazil' ? institute.CustomerID : distributor.CustomerID;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PO_NUMBER"]    = offerDistributor.DistributorName === 'Bayer Brazil' ? institute.CNPJ : distributor.CNPJ;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PR_DATE"]      = tender.PublicationDate;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PO_DATE"]      = tender.PublicationDate;

        let items = contractProducts.map((el,index) => {
            let productPriceCondition = priceconditions.filter(cond => cond.ProductCode === el.ProductPackID)[0];
            return {
                ITEM: addLeadingZeros(offerProducts[index].SORTER, 6),
                MATERIAL: addLeadingZeros(offerProducts[index].ProductCode, 18),
                UNIT_PRICE: "0",
                EFFORT_A: "0",
                ITEM_QTD: offerProducts.filter(product => product.ProductCode === el.ProductPackID)[0]?.RequestedQty,
                MANUAL_D: productPriceCondition?.StandardDiscount + productPriceCondition?.AdditionalDiscount,
                CAP: productPriceCondition?.PriceAfterCAP
            }
        })
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["TT_ITEMS"].item = items;
        return body;
    };

    async function sendCreatedContractToSAP (countryCode, resource, body) {
        const {
            SchedulerApiConfig,
            SchedulerApiConfigOAuth
        } = cds.entities("com.bayer.SXTENDER.AdminData");

        if (!body) {
            return false;
        }
        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'Contract', CountryCode: countryCode, Resource: resource })); 
		const oauthAuth = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
        const url = `${apiConfig.Host}${apiConfig.BasePath}${apiConfig.ResourcePath}`;

        const oauthCredentials = await getBearerToken(oauthAuth);

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

    async function getBearerToken(oauthAuth) {

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
                    "UNIT_PRICE": "0",
                    "UNIT_PRICE_M": null,
                    "MANUAL_D": "0.1",
                    "EFFORT_A": null,
                    "CAP": "0.15",
                    "TX_ICMS": null,
                    "ITEM_QTD": "901"
                    },{
                        "ITEM": "2",
                        "MATERIAL": "4432952",
                        "UNIT_PRICE": "0",
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

    srv.on("createSalesOrder", async (req) => {
        const {
            Contracts,
            SalesOrders,
            SalesOrderProducts
        } = cds.entities("com.bayer.SXTENDER.BrazilContractingData");
        const {
            PT_TMPRDHIER
        } = cds.entities("com.bayer.SXTENDER.MasterData");
        const {
            PT_TMOFRS,
            PT_TMOFPR
        } = cds.entities("com.bayer.SXTENDER.TransactionalData");

        try {
            const tx = cds.tx(req);
            const salesOrder = await tx.run(SELECT.one.from(SalesOrders).where({ ID: req.data.salesOrderID }));
            const contract = await tx.run(SELECT.one.from(Contracts).where({ ID: salesOrder.Contract_ID }));
            const salesOrderProducts = await tx.run(SELECT.from(SalesOrderProducts).where({ SalesOrder_ID: req.data.salesOrderID, OfferID: contract.OfferID }));
            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({ OfferID: contract.OfferID }));
            const offer = await tx.run(SELECT.one.from(PT_TMOFRS).where({ OfferID: contract.OfferID }));
            const divisionCode = await tx.run(SELECT.one.from(PT_TMPRDHIER).where({ HLEVEL1_NAME: offer.Division }));

            
            if (!salesOrder) {
                return req.reject(404, "Sales order is not found");
            }
            if (!contract) {
                return req.reject(404, "Contract is not found");
            }
            if (!salesOrderProducts.length) {
                return req.reject(404, "Sales order Products are not found");
            }
            if (!offerProducts.length) {
                return req.reject(404, "Offer products are not found");
            }
            if (!offer) {
                return req.reject(404, "Offer is not found");
            }
            if (!divisionCode) {
                return req.reject(404, "Division is not found");
            }

            // Update all fields in sales order body template  
            const updateSalesOrderBody = updateSalesOrder(contract, salesOrderProducts, offerProducts, divisionCode);
            // Send request to SAP
            const resFromSAP = await sendCreatedSalesOrderToSAP("BR", "SalesOrder", updateSalesOrderBody);
            // Update SalesOrder Status
            await tx.run(UPDATE(SalesOrders).with({StatusID: "87d5c04e-8119-11ed-a1eb-0242ac120002"}).where({ID: req.data.salesOrderID}));
            await tx.commit();
            return req.reply("Sales order is created");
        } catch (error) {
            await tx.rollback();
        }
    });

    function updateSalesOrder (contract, salesOrderProducts, offerProducts, divisionCode) {
        const body = getSalesOrderRequestBodyTemplate();
        if (!body) {
            return false;
        }
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["IV_CONTRACT"] = addLeadingZeros(contract.ContractNumber, 10);
        if (Number(divisionCode.HLEVEL1_CODE) == 8) {
            body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["IV_DIVISION"] = "0" + divisionCode.HLEVEL1_CODE;
        }
        let items = salesOrderProducts.map((el,index) => {
            return {
                ITEM: addLeadingZeros(offerProducts[index].SORTER, 6),
                MATERIAL: addLeadingZeros(offerProducts[index].ProductCode, 18),
                ITEM_QTD: `${el.RequestedQty}`,
                IV_TEXT: ""
            }
        })
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["TT_ITEMS"].item = items;
        return body;
    };

    function addLeadingZeros (num, size) {
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };

    async function sendCreatedSalesOrderToSAP (countryCode, resource, body) {
        const {
            SchedulerApiConfig,
            SchedulerApiConfigOAuth
        } = cds.entities("com.bayer.SXTENDER.AdminData");

        if (!body) {
            return false;
        }
        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'Contract', CountryCode: countryCode, Resource: resource })); 
		const oauthAuth = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
        const url = `${apiConfig.Host}${apiConfig.BasePath}${apiConfig.ResourcePath}`;

        const oauthCredentials = await getBearerToken(oauthAuth);

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
    
    function getSalesOrderRequestBodyTemplate () {
        return {
            "_-BAY3_-8B_SD_RFC_TBN_SALESORD": {
              "IV_CONTRACT": "0041010261",
              "IV_DOC_TYPE": "ZWTB",
              "IV_DIVISION": "16",
              "IV_SALES_ORG": "MWHC",
              "TT_ITEMS": {
                  "item": [
                    {
                        "ITEM": "000001",
                        "MATERIAL": "000000000004432952",
                        "ITEM_QTD": "90",
                        "IV_TEXT": "Brazil Workshop Test"
                    },{
                        "ITEM": "000002",
                        "MATERIAL": "000000000004432952",
                        "ITEM_QTD": "90",
                        "IV_TEXT": "Brazil Workshop Test"
                    }
                  ]
              }
            }
        }
    };
}
