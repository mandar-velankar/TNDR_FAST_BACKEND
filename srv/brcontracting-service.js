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
            PriceCondition
        } = cds.entities("com.bayer.SXTENDER.TransactionalData");

        const tx = cds.tx(req);
        try {
            const contract = await tx.run(SELECT.one.from(Contracts).where({ ID: req.data.contractID }));
            const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({ TenderID: contract.TenderID }));
            const contractProducts = await tx.run(SELECT.from(ContractProducts).where({ Contract_ID: req.data.contractID, OfferID: contract.OfferID }));
            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({ OfferID: contract.OfferID }));
            const offer = await tx.run(SELECT.one.from(PT_TMOFRS).where({ OfferID: contract.OfferID }));

            if (!offer) {
                return req.reject(404, "Offer is not found");
            }

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
            
            if (!divisionCode) {
                return req.reject(404, "Division is not found");
            }
            if (!offerDistributor) {
                return req.reject(404, "Offer distributor is not found");
            }

            // Update all fields in sales order body template  
            const updateContractBody = updateContract(contract, contractProducts, offerProducts, divisionCode, offerDistributor, institute, distributor, tender, priceconditions);
            // Send request to SAP
            const createdContractResult = await sendCreatedContractToSAP(tx, "BR", "Contract", updateContractBody);
            const EV_CONTRACT_NUMBER = createdContractResult["data"]["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT.Response"]["EV_CONTRACT_NUMBER"];
            if (!EV_CONTRACT_NUMBER) {
                const errorMsg = createdContractResult["data"]["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT.Response"]["TT_RETURN"]["item"]["LINE"];
                return req.reject(404, errorMsg);
            }
            // Update SalesOrder Status
            await tx.run(UPDATE(Contracts).with({StatusID: "51a102b8-8119-11ed-a1eb-0242ac120002"}).where({ID: req.data.contractID}));
            // await tx.commit();
            return req.reply("Contract is synchronized successfully");
        } catch (error) {
            if(error.response && error.response.data){
				console.error(error.response.data);
				return req.reject(error.response.status, JSON.stringify(error.response.data));
			}
            if(error.code && error.message){
				console.error(error.message);
				return req.reject(error.code, error.message);
			}
            // await tx.rollback(req);
			return req.reject(500, error.message);
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
                ITEM: addLeadingZeros(offerProducts[index].SORTER, 6, "Sorter"),
                MATERIAL: addLeadingZeros(offerProducts[index].ProductCode, 18, "ProductCode"),
                UNIT_PRICE: "0",
                EFFORT_A: "0",
                ITEM_QTD: offerProducts.filter(product => product.ProductCode === el.ProductPackID)[0]?.RequestedQty,
                MANUAL_D: (Number(productPriceCondition?.StandardDiscount) + Number(productPriceCondition?.AdditionalDiscount)).toFixed(2),
                CAP: productPriceCondition?.PriceAfterCAP
            }
        })
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["TT_ITEMS"].item = items;
        return body;
    };

    async function sendCreatedContractToSAP (tx, countryCode, resource, body) {
        const {
            SchedulerApiConfig,
            SchedulerApiConfigOAuth
        } = cds.entities("com.bayer.SXTENDER.AdminData");

        if (!body) {
            throw new Error("ERR_MISSING_PARAMETER:body");
        }
        try {
            const apiConfig = await tx.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'Contract', CountryCode: countryCode, Resource: resource })); 
            const oauthAuth = await tx.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
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
        } catch (error) {
            throw error
        }
        

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

    srv.before("CREATE", "SalesOrders", async (req) => {
        const {
            SalesOrderStatus
        } = cds.entities("com.bayer.SXTENDER.AdminData");

        const tx = cds.tx(req);

        try {
            const salesOrderStatus = await tx.run(SELECT.one.from(SalesOrderStatus).where({Status: "New FAST"}));
            if (!salesOrderStatus) req.reject(404, "New FAST status not found");
            req.data.StatusID = salesOrderStatus.ID;
            // await tx.commit(); 
        } catch (error) {
            // await tx.rollback(error);
        }
    })


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
        const tx = cds.tx(req);

        try {
            if (!req.data.salesOrderID) {
                return req.reject(404, "Sales order ID not found");
            }
            const salesOrder = await tx.run(SELECT.one.from(SalesOrders).where({ ID: req.data.salesOrderID }));
            const contract = await tx.run(SELECT.one.from(Contracts).where({ ID: salesOrder.Contract_ID }));
            const salesOrderProducts = await tx.run(SELECT.from(SalesOrderProducts).where({ SalesOrder_ID: req.data.salesOrderID, OfferID: contract.OfferID }));

            if (!salesOrderProducts || salesOrderProducts.length <= 0) {
                return req.reject(404, `No sales order products were found for the following sales order: ${salesOrder.EmpenhoNumber}`);
            }

            const salesOrderProductsProductPackIDs = salesOrderProducts.map(el => el.ProductPackID);

            if (salesOrderProductsProductPackIDs.length <= 0) {
                return req.reject(404, `No sales order product ProductPackIDs were found`);
            }

            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({ OfferID: contract.OfferID, ProductCode: {in: salesOrderProductsProductPackIDs} }));
            const offer = await tx.run(SELECT.one.from(PT_TMOFRS).where({ OfferID: contract.OfferID }));

            if (!offer) {
                return req.reject(404, "Offer not found");
            }
            const divisionCode = await tx.run(SELECT.one.from(PT_TMPRDHIER).where({ HLEVEL1_NAME: offer.Division }));
            
            if (!offerProducts || offerProducts.length <= 0) {
                return req.reject(404, `No offer products were found for the following sales order product: ${salesOrderProductsProductPackIDs}`);
            }
            if (!divisionCode) {
                return req.reject(404, "divisionCode not found");
            }

            // Update all fields in sales order body template  
            const updateSalesOrderBody = updateSalesOrder(contract, salesOrderProducts, offerProducts, divisionCode);
            // Send request to SAP
            const createSalesOrderResult = await sendCreatedSalesOrderToSAP(tx, "BR", "SalesOrder", updateSalesOrderBody);
            const EV_ORDER_NUMBER = createSalesOrderResult["data"]["_-BAY3_-8B_SD_RFC_TBN_SALESORD.Response"]["EV_ORDER_NUMBER"];
            if (!EV_ORDER_NUMBER) {
                const errorMsg = createSalesOrderResult["data"]["_-BAY3_-8B_SD_RFC_TBN_SALESORD.Response"]["TT_RETURN"]["item"]["LINE"];
                return req.reject(404, errorMsg);
            }
            // Update SalesOrder Status
            await tx.run(UPDATE(SalesOrders).with({StatusID: "87d5c04e-8119-11ed-a1eb-0242ac120002"}).where({ID: req.data.salesOrderID}));
            // await tx.commit();
            return req.reply("Sales order is successfully synchronized with SAP");
        } catch (error) {
            console.log("ERROR:SalesOrder" + error);
            if(error.response && error.response.data){
				console.error(error.response.data);
				return req.reject(error.response.status, JSON.stringify(error.response.data));
			}
            if(error.code && error.message){
				console.error(error.message);
				return req.reject(error.code, error.message);
			}
            if (error.message) {
                return req.reject(400, error.message);
            }
            // await tx.rollback(req);
			return req.reject(500, error.message);
        }
    });

    function updateSalesOrder (contract, salesOrderProducts, offerProducts, divisionCode) {
        const body = getSalesOrderRequestBodyTemplate();
        if (!body) {
            return false;
        }
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["IV_CONTRACT"] = addLeadingZeros(contract.ContractNumber, 10, "ContractNumber");
        if (Number(divisionCode.HLEVEL1_CODE) == 8) {
            body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["IV_DIVISION"] = "0" + divisionCode.HLEVEL1_CODE;
        }
        let items = salesOrderProducts.map(el => {
            const offerProduct = offerProducts.find(pr => pr.ProductCode === el.ProductPackID);
            if (offerProduct) {
                return {
                    ITEM: addLeadingZeros(offerProduct.SORTER, 6, "Sorter"),
                    MATERIAL: addLeadingZeros(offerProduct.ProductCode, 18, "ProductCode"),
                    ITEM_QTD: `${el.RequestedQty}`,
                    IV_TEXT: ""
                }
            }
        })
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["TT_ITEMS"].item = items;
        return body;
    };

    function addLeadingZeros (num, size, text) {
        if (num === null) {
            throw new Error(`${text} doesn't exist`);
        }
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };

    async function sendCreatedSalesOrderToSAP (tx, countryCode, resource, body) {
        const {
            SchedulerApiConfig,
            SchedulerApiConfigOAuth
        } = cds.entities("com.bayer.SXTENDER.AdminData");
        if (!body) {
            throw new Error("ERR_MISSING_PARAMETER:body");
        }
        try {
            const apiConfig = await tx.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'Contract', CountryCode: countryCode, Resource: resource })); 
            const oauthAuth = await tx.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
            const url = `${apiConfig.Host}${apiConfig.BasePath}${apiConfig.ResourcePath}`;

            const oauthCredentials = await getBearerToken(oauthAuth);
            console.log("Sending data to CPI");
            return axios({
                method: 'post',
                url: url,
                headers: {
                    'Authorization': `Bearer ${oauthCredentials.data.access_token}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(body)
            });
        } catch (error) {
            console.log(error);
            throw error;
        }
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

    srv.on("approveRejectContract", async (req) => {
        const {
            Contracts
        } = cds.entities("com.bayer.SXTENDER.BrazilContractingData");
        const {
            ContractStatus
        } = cds.entities("com.bayer.SXTENDER.AdminData");
        const {
            PT_TMOFPR
        } = cds.entities("com.bayer.SXTENDER.TransactionalData");
        const tx = cds.tx(req);

        try {
            const contract = await tx.run(SELECT.one.from(Contracts).where({ID: req.data.contractID}));
            const contractStatus = await tx.run(SELECT.one.from(ContractStatus).where({Status: req.data.sContractStatus}));
            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({TenderID: contract.TenderID, OfferID: contract.OfferID}));

            if (!offerProducts || offerProducts.length <= 0) {
                return req.reject(404, `No offer products were found for the following contract: ${contract.ID}`);
            }
            const body = updateContractApprovalTemplate(contractStatus);
            await shareContractApprovalToIBIZ(req, body, contract, offerProducts[0]);
            await tx.run(UPDATE(Contracts).with({StatusID: contractStatus.Status}).where({ID: req.data.contractID}));
            // await tx.commit();
            return req.reply("Correct")
        } catch (error) {
            if(error.response && error.response.data){
				console.error(error.response.data);
				return req.reject(error.response.status, JSON.stringify(error.response.data));
			}
            if(error.code && error.message){
				console.error(error.message);
				return req.reject(error.code, error.message);
			}
            // await tx.rollback(req);
			return req.reject(500, error.message); 
        }
    });

    function updateContractApprovalTemplate (contractStatus) {
        let body = getContractApprovalTemplate();
        if (!body) return false;

        body["is_ok"] = contractStatus.Status === "Approved" ? 1 : -1;
        body["nm_motivo"] = contractStatus.Status === "Approved" ? "Contract Approved" : "Contract Rejected";
        return body;
    };

    async function shareContractApprovalToIBIZ (req, body, contract, offerProduct) {
        const {
            SchedulerApiConfig,
            SchedulerApiConfigOAuth
        } = cds.entities("com.bayer.SXTENDER.AdminData");

        if (!offerProduct.IbizWorkflowID) {
            return req.reject(404, `No IbizWorkflowID found for: ${offerProduct.OfferID} - ${offerProduct.ProductCode} in COM_BAYER_SXTENDER_TRANSACTIONALDATA_PT_TMOFPR`);
        }
        if (!contract.IbizContractID) {
            return req.reject(404, `No IbizContractID found for: ${contract.ID} in COM_BAYER_SXTENDER_BRAZILCONTRACTINGDATA_CONTRACTS`);
        }
        
        try {
            const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'IBIZ', CountryCode: "BR", Resource: "Contract" })); 
		    const oauthAuth = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
            const url = `${apiConfig.Host}${apiConfig.BasePath}?id_qp=${offerProduct.IbizWorkflowID}&id_contrato=${contract.IbizContractID}`;

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
        } catch (error) {
            console.log(error);
            throw error;
        }

    };

    function getContractApprovalTemplate () {
        return {
            "is_ok": 0,
            "nm_motivo": "Item 123 it is not good for contract"
        };
    };
    
    // Approve or reject Sales order
    srv.on("approveRejectSalesOrder", async (req) => {
        const {
            Contracts,
            SalesOrders
        } = cds.entities("com.bayer.SXTENDER.BrazilContractingData");
        const {
            SalesOrderStatus
        } = cds.entities("com.bayer.SXTENDER.AdminData");
        const {
            PT_TMOFPR
        } = cds.entities("com.bayer.SXTENDER.TransactionalData");
        const tx = cds.tx(req);

        try {
            const salesOrder = await tx.run(SELECT.one.from(SalesOrders).where({ID: req.data.salesOrderID}));
            const contract = await tx.run(SELECT.one.from(Contracts).where({ID: salesOrder.Contract_ID}));
            const salesOrderStatus = await tx.run(SELECT.one.from(SalesOrderStatus).where({Status: req.data.sSalesOrderStatus}));
            if (!contract) {
                return req.reject(404, `Contract not found`);
            }
            if (!salesOrder) {
                return req.reject(404, `No Sales order found for Sales order with this ID: ${salesOrder.ID} in COM_BAYER_SXTENDER_ADMINDATA_SALESORDERSTATUS table`);
            }
            if (!salesOrderStatus) {
                return req.reject(404, `No Sales order status found for the following contract: ${contract.ID}`);
            }
            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({TenderID: contract.TenderID, OfferID: contract.OfferID}));

            if (!offerProducts || offerProducts.length <= 0) {
                return req.reject(404, `No offer products were found for the following contract: ${contract.ID}`);
            }
            const body = updateSalesOrderApprovalTemplate(salesOrderStatus);
            await shareSalesOrderApprovalToIBIZ(req, body, salesOrder, offerProducts[0]);
            await tx.run(UPDATE(SalesOrders).with({StatusID: salesOrderStatus.Status}).where({ID: req.data.salesOrderID}));
            // await tx.commit();
            return req.reply("Correct")
        } catch (error) {
            if(error.response && error.response.data){
				console.error(error.response.data);
				return req.reject(error.response.status, JSON.stringify(error.response.data));
			}
            if(error.code && error.message){
				console.error(error.message);
				return req.reject(error.code, error.message);
			}
            // await tx.rollback(req);
			return req.reject(500, error.message); 
        }
    });

    function updateSalesOrderApprovalTemplate (salesOrderStatus) {
        let body = getSalesOrderApprovalTemplate();
        if (!body) return false;

        body["is_ok"] = salesOrderStatus.Status === "Approved" ? 1 : -1;
        body["nm_motivo"] = salesOrderStatus.Status === "Approved" ? "Empenho Approved" : "Empenho Rejected";
        return body;
    };

    async function shareSalesOrderApprovalToIBIZ (req, body, salesOrder, offerProduct) {
        const {
            SchedulerApiConfig,
            SchedulerApiConfigOAuth
        } = cds.entities("com.bayer.SXTENDER.AdminData");

        if (!offerProduct.IbizWorkflowID) {
            return req.reject(404, `No IbizWorkflowID found for: ${offerProduct.OfferID} - ${offerProduct.ProductCode} in COM_BAYER_SXTENDER_TRANSACTIONALDATA_PT_TMOFPR`);
        }
        if (!salesOrder.EmpenhoID) {
            return req.reject(404, `No IbizContractID found for: ${salesOrder.ID} in COM_BAYER_SXTENDER_BRAZILCONTRACTINGDATA_CONTRACTS`);
        }
        
        try {
            const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'IBIZ', CountryCode: "BR", Resource: "SalesOrder" })); 
		    const oauthAuth = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
            const url = `${apiConfig.Host}${apiConfig.BasePath}?id_qp=${offerProduct.IbizWorkflowID}&id_empenho=${salesOrder.EmpenhoID}`;

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
        } catch (error) {
            console.log(error);
            throw error;
        }

    };

    function getSalesOrderApprovalTemplate () {
        return {
            "is_ok": 0,
            "nm_motivo": "Item 123 it is not good for contract"
        };
    };

    srv.after("READ", "ContractStatus", async (req) => {
        // Add an empty line 
        if (req && Array.isArray(req) && req.length > 0) {
            req.unshift({ID: "99999999-9999-9999-9999-999999999999", Status: ""});
        }
    })
}
