const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');
const axios = require('axios');
const qs = require("qs");

module.exports = (srv) => {

    const {
        Contracts,
        ContractProducts,
        SalesOrders,
        SalesOrderProducts
    } = cds.entities("com.bayer.SXTENDER.BrazilContractingData");
    const {
        PT_TMPRDHIER,
        PT_TMDIST,
        PT_TMINST,
        PT_TMSKUPRDPCK,
        PT_TMPRDPCK
    } = cds.entities("com.bayer.SXTENDER.MasterData");
    const {
        PT_TMOFRS,
        PT_TMOFPR,
        PT_TMTEND,
        PriceCondition
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");
    const {
        ContractStatus,
        SalesOrderStatus,
        SchedulerApiConfig,
        SchedulerApiConfigOAuth
    } = cds.entities("com.bayer.SXTENDER.AdminData");
    const {
        MostRecentCapView
    } = cds.entities("com.bayer.SXTENDER.MasterDataViews");
    const {
        DirectIndirectCustomers,
        PriceConditionBrazilView
    } = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");
    const {
        BrazilDeliveriesHeader,
        BrazilDeliveriesItems
    } = cds.entities("com.bayer.SXTENDER.MasterData.SAP");

    srv.on('createContract', async req => {
        
        const tx = cds.tx(req);
        try {
            const contract = await tx.run(SELECT.one.from(Contracts).where({ ID: req.data.contractID }));
            const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({ TenderID: contract.TenderID }));
            const contractProducts = await tx.run(SELECT.from(ContractProducts).where({ Contract_ID: req.data.contractID, OfferID: contract.OfferID }));
            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({ OfferID: contract.OfferID }));
            const offer = await tx.run(SELECT.one.from(PT_TMOFRS).where({ OfferID: contract.OfferID }));
            const contractStatus = await tx.run(SELECT.one.from(ContractStatus).where({Status: "Synchronized"}));
            const contractProductProductPackIDs = contractProducts.map(el => el.ProductPackID);
            if (contractProductProductPackIDs.length <= 0) {
                return req.reject(404, `No contract product ProductPackIDs were found`);
            }
            const skuPrdPck = await tx.run(SELECT.from(PT_TMSKUPRDPCK).where({CountryCode: "BR", ProductPackID: {in: contractProductProductPackIDs}}));
            const productPacks = await tx.run(SELECT.from(PT_TMPRDPCK).where({PRODUCTPACKID: {in: contractProductProductPackIDs}}));
            if (!contractStatus) req.reject(404, "Status Synchronized not found");
            if (!skuPrdPck || !skuPrdPck.length) req.reject(404, "No SKUCodes were found in COM_BAYER_SXTENDER_MASTERDATA_PT_TMSKUPRDPCK");
            if (!productPacks || !productPacks.length) req.reject(404, `No PackFactors were found in ${PT_TMPRDPCK.name}`);

            if (!offer) {
                return req.reject(404, "Offer is not found");
            }

            const divisionCode = await tx.run(SELECT.one.from(PT_TMPRDHIER).where({ HLEVEL1_NAME: offer.Division }));
            const offerDistributor = await tx.run(SELECT.one.from(PT_TMDIST).where({ DistributorID: offer.DistributorID }));
            const institute = await tx.run(SELECT.one.from(PT_TMINST).where({ InstituteID: contract.InstituteID }));
            const distributor = await tx.run(SELECT.one.from(PT_TMDIST).where({ DistributorID: contract.DistributorID }));
            const priceconditions = await tx.run(SELECT.from(PriceCondition).where({ OfferID: contract.OfferID }));
            const capBrazil = await tx.run(SELECT.one.from(MostRecentCapView));

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
            const updateContractBody = updateContract(contract, contractProducts, offerProducts, divisionCode, offerDistributor, institute, distributor, tender, priceconditions, skuPrdPck, capBrazil, productPacks);
            // Send request to SAP
            const createdContractResult = await sendCreatedContractToSAP(tx, "BR", "Contract", updateContractBody);
            const EV_CONTRACT_NUMBER = createdContractResult["data"]["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT.Response"]["EV_CONTRACT_NUMBER"];
            if (!EV_CONTRACT_NUMBER) {
                const errorMsg = createdContractResult["data"]["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT.Response"]["TT_RETURN"]["item"]["LINE"];
                return req.reject(404, errorMsg);
            }
            // Update Contract Status and add Contract Number in DB if EV_CONTRACT_NUMBER exists in response from SAP
            await tx.run(UPDATE(Contracts).with({StatusID: contractStatus.ID, ContractNumber: EV_CONTRACT_NUMBER}).where({ID: req.data.contractID}));
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

    srv.before("CREATE", "SalesOrders", async (req) => {
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
        const tx = cds.tx(req);
        try {
            if (!req.data.salesOrderID) {
                return req.reject(404, "Sales order ID not found");
            }
            const salesOrder = await tx.run(SELECT.one.from(SalesOrders).where({ ID: req.data.salesOrderID }));
            const contract = await tx.run(SELECT.one.from(Contracts).where({ ID: salesOrder.Contract_ID }));
            const salesOrderProducts = await tx.run(SELECT.from(SalesOrderProducts).where({ SalesOrder_ID: req.data.salesOrderID, OfferID: contract.OfferID }));
            const salesOrderStatus = await tx.run(SELECT.one.from(SalesOrderStatus).where({Status: "Synchronized"}));
            if (!salesOrderStatus) req.reject(404, "Status Synchronized not found");

            if (!salesOrderProducts || salesOrderProducts.length <= 0) {
                return req.reject(404, `No sales order products were found for the following sales order: ${salesOrder.EmpenhoNumber}`);
            }

            const salesOrderProductsProductPackIDs = salesOrderProducts.map(el => el.ProductPackID);

            if (salesOrderProductsProductPackIDs.length <= 0) {
                return req.reject(404, `No sales order product ProductPackIDs were found`);
            }

            const offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({ OfferID: contract.OfferID, ProductCode: {in: salesOrderProductsProductPackIDs} }));
            const skuPrdPcks = await tx.run(SELECT.from(PT_TMSKUPRDPCK).where({CountryCode: "BR", ProductPackID: {in: salesOrderProductsProductPackIDs}}));
            const productPacks = await tx.run(SELECT.from(PT_TMPRDPCK).where({PRODUCTPACKID: {in: salesOrderProductsProductPackIDs}}));

            if (!productPacks || !productPacks.length) req.reject(404, `No PackFactors were found in ${PT_TMPRDPCK.name}`);
            if (!skuPrdPcks || !skuPrdPcks.length) req.reject(404, "No SKUCodes were found in COM_BAYER_SXTENDER_MASTERDATA_PT_TMSKUPRDPCK");

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
            //const IV_TEXT = await mappedSalesOrder_IV_TEXT(req, tx, salesOrder, contract);
            // Update all fields in sales order body template  
            const updateSalesOrderBody = updateSalesOrder(contract, salesOrderProducts, offerProducts, divisionCode, skuPrdPcks, productPacks);
            // Send request to SAP
            const createSalesOrderResult = await sendCreatedSalesOrderToSAP(tx, "BR", "SalesOrder", updateSalesOrderBody);
            const EV_ORDER_NUMBER = createSalesOrderResult["data"]["_-BAY3_-8B_SD_RFC_TBN_SALESORD.Response"]["EV_ORDER_NUMBER"];
            if (!EV_ORDER_NUMBER) {
                const errorMsg = createSalesOrderResult["data"]["_-BAY3_-8B_SD_RFC_TBN_SALESORD.Response"]["TT_RETURN"]["item"]["LINE"];
                return req.reject(404, errorMsg);
            }
            // Update SalesOrder Status
            await tx.run(UPDATE(SalesOrders).with({StatusID: salesOrderStatus.ID, SalesOrderNumber: EV_ORDER_NUMBER}).where({ID: req.data.salesOrderID}));
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

    // Approve or reject Sales order
    srv.on("approveRejectSalesOrder", async (req) => {
        const tx = cds.tx(req);
        try {
            const salesOrder = await tx.run(SELECT.one.from(SalesOrders).where({ID: req.data.salesOrderID}));
            const contract = await tx.run(SELECT.one.from(Contracts)
                .columns('*', 'Institute.State', 'Institute.InstituteName', 'Tender.TenderName')
                .where({ID: salesOrder.Contract_ID}));
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
            const sComment = `${contract.State} - ${contract.InstituteName} - Edital: ${contract.TenderName} - Empenho: ${salesOrder.EmpenhoNumber}`;
            await shareSalesOrderApprovalToIBIZ(req, body, salesOrder, offerProducts[0]);
            await tx.run(UPDATE(SalesOrders).with({StatusID: salesOrderStatus.ID}).where({ID: req.data.salesOrderID}));
            await tx.run(UPDATE(SalesOrderProducts).with({Comment: sComment}).where({SalesOrder_ID: req.data.salesOrderID}));
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

    srv.on("READ", "ContractsView", async (req) => {
        try {
            const tx = cds.tx(req);
            let tmvQuery = SELECT.from(req.query.SELECT.from);
            let contractIDFullWhere = [];
            let contractTypeWhere = [];
            const salesOrderStatusID = req.query.SELECT.where && ServiceHelper._getWhereId(req, "SalesOrderStatus") !== -1 && ServiceHelper.getWhereValue(req, "SalesOrderStatus");
            const contractType = req.query.SELECT.where && ServiceHelper._getWhereId(req, "SalesOrderStatus") !== -1 && ServiceHelper.getWhereValue(req, "ContractType");

            if (contractType) {
                contractTypeWhere = ServiceHelper.buildWhere(req, "ContractType");
                ServiceHelper.deleteFilter(req, "ContractType");
            }

            if (salesOrderStatusID) {
                const salesOrders = await SELECT.from(SalesOrders).where({"StatusID": salesOrderStatusID});
                const contractIDs = salesOrders.map(so => so.Contract_ID);

                contractIDs.forEach((el, index) => {
                    contractIDFullWhere.push(ServiceHelper.buildFullWhere("ID", "=", el));
                    if (index !== contractIDs.length-1) {
                        contractIDFullWhere.push('or');
                    }
                });
                contractIDFullWhere = contractIDFullWhere.flat();
                contractIDFullWhere.length > 1 && ServiceHelper.deleteFilter(req, "SalesOrderStatus");
            }

            req.query.SELECT.where && (tmvQuery.where(req.query.SELECT.where).where(contractIDFullWhere)).where(contractTypeWhere);
            req.query.SELECT.orderBy && (tmvQuery.orderBy(req.query.SELECT.orderBy));
            return await tx.run(tmvQuery);
        } catch (error) {
            console.error('Error in ContractsView READ');
            return req.reject(403, error?.message||"Error in ContractsView");
        }
    });

    srv.after("READ", ["ContractStatus", "SalesOrderStatus"], async (req) => {
        // Add an empty line 
        if (req && Array.isArray(req) && req.length > 0) {
            req.unshift({ID: "99999999-9999-9999-9999-999999999999", Status: ""});
        }
    });

    srv.on("approveRejectContract", async (req) => {
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
            await tx.run(UPDATE(Contracts).with({StatusID: contractStatus.ID}).where({ID: req.data.contractID}));
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

    srv.on("checkSAPDeliveries", async (req) => {
        const tx = cds.tx(req);

        try {
            const salesOrder = await tx.run(SELECT.one.from(SalesOrders).where({ID: req.data.salesOrderID}));
            if (!salesOrder) {
                return req.reject(404, `No Sales order was found with this Sales Order ID: ${req.data.salesOrderID}`);
            }
            const body = updateSAPDeliveriesReqBody(salesOrder);
            const response = await getSAPDeliveries(tx, "BR", "SalesOrder", body);
            const TT_ITEMS = response["data"]["rfc:_-BAY3_-8B_SD_RFC_TBN_DELIVERY.Response"]["TT_ITEMS"];
            const TT_SALES_DOCUMENTS = response["data"]["rfc:_-BAY3_-8B_SD_RFC_TBN_DELIVERY.Response"]["TT_SALES_DOCUMENTS"];
            if (!TT_ITEMS || !TT_SALES_DOCUMENTS) {
                return req.reject(404, "No deliveries exist in SAP");
            }
            for (let item in TT_ITEMS) {
                TT_ITEMS[item] = mappedBrazilDeliveryItems(TT_ITEMS[item]);
            }
            for (let item in TT_SALES_DOCUMENTS) {
                TT_SALES_DOCUMENTS[item] = mappedBrazilDeliveryHeader(TT_SALES_DOCUMENTS[item]);
            }
            await tx.run(INSERT.into(BrazilDeliveriesItems).entries(TT_ITEMS["item"]));
            await tx.run(INSERT.into(BrazilDeliveriesHeader).entries(TT_SALES_DOCUMENTS["item"]));
            return req.reply("Deliveries were received from SAP");
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

    async function getSAPDeliveries (tx, countryCode, resource, body) {
        if (!body) {
            throw new Error("ERR_MISSING_PARAMETER:body");
        }
        try {
            const apiConfig = await tx.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'SAPDelivery', CountryCode: countryCode, Resource: resource })); 
            const oauthAuth = await tx.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
            const url = `${apiConfig.Host}${apiConfig.BasePath}${apiConfig.ResourcePath}`;

            const oauthCredentials = await getBearerToken(oauthAuth);

            return axios({
                method: 'get',
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
    }

    function updateSAPDeliveriesReqBody (salesOrder) {
        let body = getSAPDeliveriesRequestbody();
        if (!body) {
            return false;
        }
        const item = [
            {
                "VBELN": addLeadingZeros(salesOrder.SalesOrderNumber, 10, "SalesOrderNumber")
            }
        ]
        body["_-BAY3_-8B_SD_RFC_TBN_DELIVERY"]["IT_DOC_NUMBER"]["item"] = item;
        return body;
    }

    function mappedBrazilDeliveryItems (item) {
        return {
            "SALES_DOCUMENT"			: removeLeadingZeros(item.SALES_DOCUMENT, 4, "SALES_DOCUMENT"),		
			"SALES_ITEM"				: removeLeadingZeros(item.SALES_ITEM, 4, "SALES_ITEM"),		
			"SALES_REJECTION"			: item.SALES_REJECTION,
			"MATERIAL"					: removeLeadingZeros(item.MATERIAL, 10, "MATERIAL"),		
			"DESCRPTION"				: item.DESCRPTION,	                                     
			"PRODUCT_HIERARCHY"			: item.PRODUCT_HIERARCHY,
			"SALES_QUTY"				: item.SALES_QUTY,
			"QUTY_CONFIRMED"			: item.QUTY_CONFIRMED,				
			"ITEM_CATEGORY"				: item.ITEM_CATEGORY,			
			"UNIT_MEASURE"				: item.UNIT_MEASURE,		
			"PRICE_UNIT"				: item.PRICE_UNIT,			
			"SALES_NET_PRICE"			: item.SALES_NET_PRICE,			
			"SALES_NET_VALUE"			: item.SALES_NET_VALUE,				
			"DELIVERY_QUANTITY"			: item.DELIVERY_QUANTITY,			
			"DATE_DELIVERY"				: item.DATE_DELIVERY,			
			"DATE_REQUESTED_POSITION"	: item.DATE_REQUESTED_POSITION,				
			"QUANT_BILL"				: item.QUANT_BILL
        }
    }

    function mappedBrazilDeliveryHeader (item) {
        return {
            "SALES_DOCUMENT"			: removeLeadingZeros(item.SALES_DOCUMENT, 4, "SALES_DOCUMENT"),
			"DISTR_CHAN"				: item.DISTR_CHAN,
			"DIVISION"				    : item.DIVISION,
			"CUSTOMER"				    : removeLeadingZeros(item.CUSTOMER, 3, "CUSTOMER"),
			"CUSTOMER_NAME"			    : item.CUSTOMER_NAME,
			"STATUS_REJECTION"		    : item.STATUS_REJECTION,
			"STATUS"					: item.STATUS,
			"CREATED_BY"				: item.CREATED_BY,
			"SALES_CREATED_ON"		    : item.SALES_CREATED_ON,
			"TERMS_PAY"				    : item.TERMS_PAY,
			"SALES_NET"				    : item.SALES_NET,
			"CURRENCY"				    : item.CURRENCY,
			"DELIVERY_DOCUMENT"		    : removeLeadingZeros(item.DELIVERY_DOCUMENT, 2, "DELIVERY_DOCUMENT"),
			"DELIVERY_CREATED_ON"		: item.DELIVERY_CREATED_ON,
			"DATE_REQUESTED_HEADER"	    : item.DATE_REQUESTED_HEADER,
			"DATE_GOODS_ISSUE"		    : item.DATE_GOODS_ISSUE,
			"NUMBER_BILL"				: removeLeadingZeros(item.NUMBER_BILL, 2, "NUMBER_BILL"),
			"DATE_BILL"				    : item.DATE_BILL,
			"NET_BILL"				    : item.NET_BILL
        }
    }

    function getSAPDeliveriesRequestbody () {
        return {
            "_-BAY3_-8B_SD_RFC_TBN_DELIVERY": {
              "IT_DOC_NUMBER": {
                "item": [
                  {"VBELN": "0000828072"}
                ]
              }
            }
        }
    }

    function updateContract (contract, contractProducts, offerProducts, divisionCode, offerDistributor, institute, distributor, tender, priceconditions, skuPrdPcks, capBrazil, productPacks) {
        const body = getContractRequestBodyTemplate();
        if (!body) {
            return false;
        }
        const IV_PO_NUMBER = contract.OfferID.split("-");
        IV_PO_NUMBER.shift();

        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_VALID_F"]      = contract.StartDate ? contract.StartDate.split("-").join("") : contract.StartDate;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_VALID_T"]      = contract.EndDate ? contract.EndDate.split("-").join("") : contract.EndDate;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_DIVISION"]     = Number(divisionCode.HLEVEL1_CODE) == 8 ? "0" + divisionCode.HLEVEL1_CODE : divisionCode.HLEVEL1_CODE;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PARTNER"]      = offerDistributor.DistributorName === 'Bayer Brazil' ? institute.CustomerID : distributor.CustomerID;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PO_NUMBER"]    = IV_PO_NUMBER.join("-");
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PR_DATE"]      = tender.PublicationDate ? tender.PublicationDate.split("-").join("") : tender.PublicationDate;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PO_DATE"]      = tender.PublicationDate ? tender.PublicationDate.split("-").join("") : tender.PublicationDate;

        let items = contractProducts.map((el) => {
            let productPriceCondition = priceconditions.filter(cond => cond.ProductCode === el.ProductPackID)[0];
            const offerProduct = offerProducts.find(pr => pr.ProductCode === el.ProductPackID);
            const skuPrdPck = skuPrdPcks.find(pr => pr.ProductPackID === el.ProductPackID);
            const productPack = productPacks.find(pr => pr.PRODUCTPACKID === el.ProductPackID);
            const itemQty = offerProduct.UnitPerPack === "Pack" ? el?.RequestedVolume * 1.25 : (el?.RequestedVolume * 1.25) / productPack.PACKFACTOR;
            return {
                ITEM: addLeadingZeros(offerProduct.SORTER, 6, "Sorter"),
                MATERIAL: addLeadingZeros(skuPrdPck.SKUCode, 18, "SKUCode"),
                UNIT_PRICE: "0",
                EFFORT_A: "0",
                ITEM_QTD: Math.ceil(itemQty),
                MANUAL_D: (100 * Number(productPriceCondition?.AdditionalDiscount)).toFixed(2),
                CAP: productPriceCondition?.CAP === "No" ? 0 : (100 * Number(capBrazil.CAP)).toFixed(2)
            }
        })
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["TT_ITEMS"].item = items;
        return body;
    };

    async function sendCreatedContractToSAP (tx, countryCode, resource, body) {
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

    function updateSalesOrder (contract, salesOrderProducts, offerProducts, divisionCode, skuPrdPcks, productPacks) {
        const body = getSalesOrderRequestBodyTemplate();
        if (!body) {
            return false;
        }
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["IV_CONTRACT"] = addLeadingZeros(contract.ContractNumber, 10, "ContractNumber");
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["IV_DIVISION"] = Number(divisionCode.HLEVEL1_CODE) == 8 ? "0" + divisionCode.HLEVEL1_CODE : divisionCode.HLEVEL1_CODE;
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["IV_TEXT"] = salesOrderProducts[0].Comment.replace(/\r?\n|\r/g," ");

        let items = salesOrderProducts.map(el => {
            const offerProduct = offerProducts.find(pr => pr.ProductCode === el.ProductPackID);
            const skuPrdPck = skuPrdPcks.find(pr => pr.ProductPackID === el.ProductPackID);
            const productPack = productPacks.find(pr => pr.PRODUCTPACKID === el.ProductPackID);
            const itemQty = offerProduct.UnitPerPack === "Pack" ? el?.RequestedQty : el?.RequestedQty / productPack.PACKFACTOR;
            if (offerProduct) {
                return {
                    ITEM: addLeadingZeros(offerProduct.SORTER, 6, "Sorter"),
                    MATERIAL: addLeadingZeros(skuPrdPck.SKUCode, 18, "SKUCode"),
                    ITEM_QTD: Math.ceil(itemQty),
                }
            }
        })
        body["_-BAY3_-8B_SD_RFC_TBN_SALESORD"]["TT_ITEMS"].item = items;
        return body;
    };
    /*async function mappedSalesOrder_IV_TEXT (req, tx, salesOrder, contract) {
        try {
            const directIndirectCustomers = await tx.run(SELECT.one.from(DirectIndirectCustomers).where({OfferID: contract.OfferID}));
            if (!directIndirectCustomers || directIndirectCustomers.length == 0) req.reject(404, "CustomerID is not found");
            let IV_TEXT = "";
            if (directIndirectCustomers.isDirect) {
                let inst = await tx.run(SELECT.one.from(PT_TMINST).where({CountryCode: "BR", InstituteID: contract.InstituteID }));
                if (!inst) req.reject(404, "Institute not found for direct offer");
                IV_TEXT = `${inst.State} ${inst.InstituteName} ${contract.OfferID} ${contract.IbizContractNumber} ${salesOrder.EmpenhoNumber} Institute ${salesOrder.EmpenhoNumber}`;
            }else {
                let dist = await tx.run(SELECT.one.from(PT_TMDIST).where({CountryCode: "BR", DistributorID: contract.DistributorID }));
                if (!dist) req.reject(404, "Distributor not found for indirect offer");
                IV_TEXT = `${dist.State} ${dist.DistributorName} ${contract.OfferID} ${contract.IbizContractNumber} ${salesOrder.EmpenhoNumber} Distributor ${salesOrder.EmpenhoNumber}`;
            }
            return IV_TEXT;
        } catch (error) {
            console.log(error);
            if(error.code && error.message){
				console.error(error.message);
				return req.reject(error.code, error.message);
			}
			return req.reject(500, error.message);
        }
    };*/
    function addLeadingZeros (num, size, text) {
        if (num === null) {
            throw new Error(`${text} doesn't exist`);
        }
        if (text === "Sorter") {
            num = Number(num) + 1;
        }
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };
    function removeLeadingZeros (num, size, text) {
        if (num === null) {
            throw new Error(`${text} doesn't exist`);
        }
        num = num.toString();
        let subStr = num.substring(0, size);
        return num.replace(subStr, "");
    };

    async function sendCreatedSalesOrderToSAP (tx, countryCode, resource, body) {
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
              "IV_TEXT": "Brazil Workshop Test",
              "TT_ITEMS": {
                  "item": [
                    {
                        "ITEM": "000001",
                        "MATERIAL": "000000000004432952",
                        "ITEM_QTD": "90"
                    },{
                        "ITEM": "000002",
                        "MATERIAL": "000000000004432952",
                        "ITEM_QTD": "90"
                    }
                  ]
              }
            }
        }
    };

    function updateContractApprovalTemplate (contractStatus) {
        let body = getContractApprovalTemplate();
        if (!body) return false;

        body["is_ok"] = contractStatus.Status === "Approved" ? 1 : -1;
        body["nm_motivo"] = contractStatus.Status === "Approved" ? "Contract Approved" : "Contract Rejected";
        return body;
    };

    async function shareContractApprovalToIBIZ (req, body, contract, offerProduct) {
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

    function updateSalesOrderApprovalTemplate (salesOrderStatus) {
        let body = getSalesOrderApprovalTemplate();
        if (!body) return false;

        body["is_ok"] = salesOrderStatus.Status === "Approved" ? 1 : -1;
        body["nm_motivo"] = salesOrderStatus.Status === "Approved" ? "Empenho Approved" : "Empenho Rejected";
        return body;
    };

    async function shareSalesOrderApprovalToIBIZ (req, body, salesOrder, offerProduct) {
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

}
