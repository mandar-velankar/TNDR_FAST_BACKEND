const cds = require('@sap/cds');
const XLSX = require("xlsx");
const moment = require('moment');
const XLSXHelper = require("./utils/XLSXHelper");
const Handlebars = require("handlebars");
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

	const {
		MailTemplate,
		Users
	} = cds.entities("com.bayer.SXTENDER.AdminData");
	
	const {
		PT_TMDIST,
		PT_TMINST,
		PT_TMCTPRDPCK,
		PT_TMPRDPCK,
		PT_TMLE,
		PT_TMCTLE,
		PT_TMSKUPRDPCK,
		PT_TMREGPR,
		PT_TMCOGS,
		SalesData,
		WholesalePurchasePriceApprovals,
		WholesalePurchasePriceApproverTypes,
		WholesalePurchasePriceApprovers,
		NLPPPApproverTypes,
		NLPPPApprovers,
		NLPPPApprovals,
		WholesalePurchasePrice,
		NLPPP,
		DistributionAgreements
	} = cds.entities("com.bayer.SXTENDER.MasterData");

    const{
        CurrentDistributionAgreementView,
		CurrentWholesalePurchasePriceView,
		CurrentNLpppView,
		NLpppView,
		DistributionAgreementsView
	}= cds.entities("com.bayer.SXTENDER.MasterDataViews")

	const {
		ExcelUpload,
		OutgoingMails
	} = cds.entities("com.bayer.SXTENDER.TransactionalData");

	const {
		WholesalePurchasePrices,
		ExcelTemplate,
		NLDAExcelExtract,
		NLWPPExcelExtract
	} = cds.entities("MasterDataManagementService");



	const getNextValue = async (table, fieldname) => {
		let results = await cds.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
		let nextValue = 1;
		if (results[0].max) {
			nextValue = results[0].max + 1
		}
		return nextValue
	}

	const getCountryBrandProductEntities = function(data){
		// PT_TMCTPRDPCK
		const product = {
			"COUNTRYCODE": data.COUNTRYCODE || data.COUNTRY_CODE || null,
			"COUNTRYOFORIGIN": data.COUNTRY_OF_ORIGIN || null,
			"SHELFLIFE": data.SHELFLIFE || null,
			"REGISTERED": data.REGISTERED || null,
			"ACTIVERECORD": data.ACTIVERECORD || null,
			"PRODUCTPACKID": data.PRODUCT_ID || data.PRODUCTPACKID || null,
			"MANUFACTURER": data.MANUFACTURER || null,
			"Presentation_2": null,
			"VTATax": data.VAT || null,
			"COMMENT": data.COMMENT || null,
			"GOV_CODE": null,
			"QTY_THRESHOLD": null
		};

		// PT_TMPRDPCK
		const productPack = {
			"PRODUCTPACKID": data.PRODUCT_ID || data.PRODUCTPACKID,
			"PRODUCTPACKNAME": data.PRODUCT_NAME,
			"PRESENTATION": data.PRESENTATION,
			"UOM": data.UOM,
			"ACTIVERECORD": data.ACTIVERECORD,
			"HLEVEL6_CODE": data.PRODUCT_UNIT_ID,
			"CONCENTRATION": data.DOSAGE,
			"PACKFACTOR": data.PACK_SIZE,
			"PCIName": null,
			"MoleculeName": null,
			"ACTIVE_SUBSTANCE": null,
		};

		return {
			Product: product,
			ProductPack: productPack
		}
	};

	srv.on('READ', 'Users', async(req) => {
		try {
			const tx = cds.tx(req);
		
			let result = [];
			let tmvQuery = SELECT.from(req.query.SELECT.from);
			req.query.SELECT.where && (tmvQuery.where(req.query.SELECT.where));

			result = await tx.run(tmvQuery);

			const isCountQuery = Array.isArray(result) && result.some(item => '$count' in item);
		
			if (isCountQuery) {
				// If $count is present, return the original result
				return result;
			}
			
			const cwid = req.user.id;

			let resultsArray = Array.isArray(result) ? result : [result];

			resultsArray = resultsArray.filter(ra => ra.CWID === cwid);

			return resultsArray;

		} catch (error) {
			console.error('Error in PT_TMUSER READ');
            return req.reject(403, error?.message||"Error in PT_TMUSER");
		}

	});

	srv.before('CREATE', 'PT_TMDIST', async (req) => {
		req.data.DistributorID = await getNextValue(PT_TMDIST, "DistributorID");
		return req;
	});

	srv.before('CREATE', 'PT_TMINST', async (req) => {
		req.data.InstituteID = await getNextValue(PT_TMINST, "InstituteID");
		return req;
	});


	srv.before('CREATE', 'CountryBrandProducts', async (req) => {
		const nextProductID = await getNextValue(PT_TMCTPRDPCK, "PRODUCTPACKID");
		req.data.PRODUCT_ID = nextProductID;
		req.data.PRODUCTPACKID = nextProductID;
		req.data.COUNTRYCODE = req.data.COUNTRY_CODE; // this is needed because of an error message.
		return req;
	});

	srv.before('CREATE', 'PT_TMCTPRDPCK', async (req) => {
		const nextProductID = await getNextValue(PT_TMCTPRDPCK, "PRODUCTPACKID");
		req.data.PRODUCTPACKID = nextProductID;
		req.data.COUNTRYPRODUCTPACKID = nextProductID;
		req.data.ProductScope = 'All';
		return req;
	});


	srv.on('CREATE', 'CountryBrandProducts', async (req) => {

		const tx = cds.transaction(req);

		const {
			Product, 
			ProductPack
		} = getCountryBrandProductEntities(req.data);

		// check if PK's are set
		if(Product.COUNTRYCODE && Product.PRODUCTPACKID){

			try{
				const results = await tx.run(
					INSERT.into(PT_TMCTPRDPCK).entries(Product)
				);

				//tx.commit(results);

			}catch(err){
				console.log(err);
			};
			
		}

		if(ProductPack.PRODUCTPACKID){

			try{
				const results = await tx.run(
					INSERT.into(PT_TMPRDPCK).entries(ProductPack)
				);

				//tx.commit(results);

			}catch(err){
				console.log(err);
			};

		}


		return req.data;

	});

	srv.before('UPDATE', 'CountryBrandProducts', async (req) => {
		req.data.COUNTRYCODE = req.data.COUNTRY_CODE; // this is needed because of an error message.
		return req;
	});

	srv.on('UPDATE', 'CountryBrandProducts', async (req) => {
		const tx = cds.transaction(req);

		const {
			Product, 
			ProductPack
		} = getCountryBrandProductEntities(req.data);


		// check if PK's are set
		if(Product.COUNTRYCODE && Product.PRODUCTPACKID){

			try{

				const results = await tx.run(
					UPDATE(PT_TMCTPRDPCK, {"COUNTRYCODE":Product.COUNTRYCODE, "PRODUCTPACKID":Product.PRODUCTPACKID}).with(Product)
				);

				//tx.commit(results);

			}catch(err){
				console.log(err);
			};
			
		}

		if(ProductPack.PRODUCTPACKID){

			try{
				const results = await tx.run(
					UPDATE.entity(PT_TMPRDPCK, ProductPack.PRODUCTPACKID).data(ProductPack)
				);

				//tx.commit(results);

			}catch(err){
				console.log(err);
			};

		}


		return req.data;
    });

	srv.before('CREATE', 'PT_TMLE', async (req) => {
		req.data.LegalEntityID = await getNextValue(PT_TMLE, "LegalEntityID");
		return req;
	});
  
	srv.before('CREATE', 'PT_TMCTLE', async (req) => {
		req.data.CountryLegalEntityID = await getNextValue(PT_TMCTLE, "CountryLegalEntityID");
		return req;
	});

	/*srv.before('CREATE', 'PT_TMSKUPRDPCK', async (req) => {
		if(req.data.CountrySKUID === 0){
			req.data.CountrySKUID = await getNextValue(PT_TMSKUPRDPCK, "CountrySKUID");
		}
		return req;
	});*/


	srv.after("UPDATE", "ExcelUploadView", async (req, res) => {
		/**
		 * @param {Object} file - This is uploaded excel file
		 * @param {Function} bufferToArrayBuffer - Converting Content of Excel file from Buffer to Array buffer 
		 */
		const file = await SELECT.one.from(ExcelUpload).where({ID: req.ID});
		const expectedHeaders = ['CountryCode', 'Currency', 'MaterialNumber', 'Price'];
		const arrayBuffer = bufferToArrayBuffer(file?.content);
		const workbook = XLSX.read(arrayBuffer, { type: 'array' });

		// Assuming the Excel file has only one sheet, you can get the data from it
		const sheetName = workbook.SheetNames[0];
		const prices = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

		let isValid = false;

		for (let header in expectedHeaders) {
			prices.forEach((item, index) => {
			if (!Object.hasOwn(item, expectedHeaders[header])) {
				isValid = false;
			}else {
				isValid = true;
			}
			});
		}

		if (!isValid) {
			return res.reject(400, "Invalid Excel data format");
		}

		prices.forEach((price, index) => {
			upsertRegisteredPrices(price, index);
		});
		await DELETE.from(ExcelUpload).where({ID: req.ID});
		return req;
	});

	srv.after("UPDATE", "SalesDataUpload", async (req, res) => {
		/**
		 * @param {Object} file - This is uploaded excel file
		 * @param {Function} bufferToArrayBuffer - Converting Content of Excel file from Buffer to Array buffer 
		 */
		try {
			const file = await SELECT.one.from(ExcelUpload).where({ID: req.ID});
			
			const arrayBuffer = bufferToArrayBuffer(file?.content);
			const workbook = XLSX.read(arrayBuffer, { type: 'array' });

			// Assuming the Excel file has only one sheet, you can get the data from it
			const sheetName = workbook.SheetNames[0];
			let salesData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);


			for (let sd of salesData) {
				await cds.tx(async () => {
					await upsertSalesData(sd);
				});
			}

			await DELETE.from(ExcelUpload).where({ID: req.ID});
		} catch (error) {
			console.log(error);
		}
		
		return res.reply("Sales Data uploaded successfully");
	});

	async function upsertSalesData (sd) {
		sd.SYEAR = `${sd.SYEAR}`;
		sd.SMONTH = `${sd.SMONTH}`;
		sd.SCUSNO = `${sd.SCUSNO}`;
		sd.SITNO = `${sd.SITNO}`;
		sd.SYMD = `${sd.SYMD}`;

		const existingSalesData = await SELECT.one.from(SalesData).where({SYEAR: sd.SYEAR, SMONTH: sd.SMONTH, SCUSNO: sd.SCUSNO, SITNO: sd.SITNO});

		if (existingSalesData) {
			return UPDATE(SalesData).with(sd).where({SYEAR: sd.SYEAR, SMONTH: sd.SMONTH, SCUSNO: sd.SCUSNO, SITNO: sd.SITNO});
		}else {
			return INSERT.into(SalesData).entries(sd);
		}
	}

	async function upsertRegisteredPrices (price, index) {
		const skuPrdPck = await SELECT.one.from(PT_TMSKUPRDPCK).where({CountryCode: price.CountryCode, SKUCode: price.MaterialNumber});
		const registerdPrice = await SELECT.one.from(PT_TMREGPR).where({CountryCode: price.CountryCode, ProductPackID: skuPrdPck.ProductPackID});
		const lastRegPriceID = await SELECT.one.from(PT_TMREGPR, ['Max(RegisteredPriceID) as max']);

		const mappedRegisteredPrice = {
			RegisteredPriceID: lastRegPriceID?.max + (index + 1),
			CountryCode: price.CountryCode,
			ProductPackID: skuPrdPck.ProductPackID,
			EffDate: new Date().toISOString(),
			EndDate: "9999-12-31",
			UOM: "Pack",
			Currency: price.Currency,
			RegisteredPrice: price.Price,
			RegisteredPriceSource: "Excel Upload",
			ActiveRecord: "Yes"
		}
	
		if (registerdPrice) {
			delete mappedRegisteredPrice.RegisteredPriceID;

			await UPDATE(PT_TMREGPR).with (mappedRegisteredPrice).where({
				CountryCode: price.CountryCode, 
				ProductPackID: skuPrdPck.ProductPackID,
				RegisteredPriceID: registerdPrice.RegisteredPriceID
			})
		}else {
			await INSERT.into(PT_TMREGPR).entries(mappedRegisteredPrice);
		}
	}

	function bufferToArrayBuffer(buffer) {
		const arrayBuffer = new ArrayBuffer(buffer.length);
		const view = new Uint8Array(arrayBuffer);
		for (let i = 0; i < buffer.length; ++i) {
		  view[i] = buffer[i];
		}
		return arrayBuffer;
	  }

	srv.after('READ', 'MasterDistributors', data => {
		data.unshift({
			DistributorID: null,
			CountryCode: null,
			DistributorName: null,
			Address: null,
			ContactNo: null,
			Fax: null,
			CONTACT_EMAIL: null,
			ContactPerson: null
		})
	});

	srv.after('READ', 'DistinctProductBUs', data => {
		data.unshift({
			COUNTRYCODE: "PK",
			BU: null
		})
	});

	srv.on('SoftDeleteProductPrices', async (req) => {
		try {
			const {productPackID, countryCode} = req.data;

			const regPr = await SELECT.from(PT_TMREGPR).where({CountryCode: countryCode, ProductPackID: productPackID});
			const skuPrdpck = await SELECT.from(PT_TMSKUPRDPCK).where({CountryCode: countryCode, ProductPackID: productPackID});
			let promises = [];

			if (Array.isArray(regPr) && regPr.length > 0) {
				promises = promises.concat(regPr.map(rp => {
					return UPDATE(PT_TMREGPR).with({
						ACTIVERECORD: 'No'
					}).where({
						CountryCode: rp.CountryCode,
						ProductPackID: rp.ProductPackID,
						EffDate: rp.EffDate
					});
				}));
			}

			if (Array.isArray(skuPrdpck) && skuPrdpck.length > 0) {
				promises = promises.concat(skuPrdpck.map(sp => {
					return UPDATE(PT_TMSKUPRDPCK).with({
						ACTIVERECORD: 'No'
					}).where({
						CountryCode: sp.CountryCode,
						ProductPackID: sp.ProductPackID,
						SKUCode: sp.SKUCode
					});
				}));
			}

			await Promise.all(promises);

			return 'Product prices were deleted successfully';
		} catch (error) {
			console.error('Error in SoftDeleteProductPrices');
            return req.reject(403, error?.message||"Error in SoftDeleteProductPrices");
		}
	});
	
	srv.after('READ', 'DistributionAgreementsView', async (data) => {
		const countryProducts = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: "NL"});
		countryProducts.forEach(item => {
			const filteredData = data.filter(agreement => agreement.PRODUCTPACKID == item.PRODUCTPACKID);
			if (filteredData.length > 1) {
				const defaultProductIndex = data.findIndex(el => el.PRODUCTPACKID == item.PRODUCTPACKID && el.DistributionAgreementID == null);
				data.splice(defaultProductIndex, 1);
			}
		});
	});

	srv.on('CREATE', 'WholesalePurchasePriceApprovals', async (req) => {
		try{
			await upsertWholesalePurchasePriceApprovals(req);
			return req.data;
		}
		catch(error){
			console.error('Error in WholesalePurchasePriceApprovals CREATE');
			return req.reject(403, error?.message||"Error in WholesalePurchasePriceApprovals CREATE");
		}
	});

	const upsertWholesalePurchasePriceApprovals = async function(req){
		const approvalsType = await SELECT.from(WholesalePurchasePriceApproverTypes);
		const approvers = await SELECT.from(WholesalePurchasePriceApprovers);
		
		let approvals = matchApprovalsData (approvalsType, approvers, req);

		await INSERT(approvals).into(WholesalePurchasePriceApprovals);
	}

	function matchApprovalsData(approvalsType, approvers, req) {
		return approvalsType.map(approval => {
			const approver = approvers.find(approver => approver.ID === approval.WholesalePurchasePriceApprovers_ID);
	
			if (approver) {
				return {
					ApproverRole: approval.WholesalePurchasePriceApproverTypes,
					ApproverCWID: approver.WholesalePurchasePriceApproverCWID,
					ApproverName: approver.WholesalePurchasePriceApproverName,
					ApprovalStatus: req.data.ApprovalStatus,
					ApproverComment: null,
					ApprovalDate: null,
					SenderComment: null,
					WholesalePurchasePrice_ID: req.data.WholesalePurchasePrice_ID
				};
			}
		}).filter(item => item); // Filter out undefined results
	}

	srv.on('CREATE', 'NLPPPApprovals', async (req) => {
		try{
			await upsertNLPPPApprovals(req);
			return req.data;
		}
		catch(error){
			console.error('Error in NLPPPApprovals CREATE');
			return req.reject(403, error?.message||"Error in NLPPPApprovals CREATE");
		}
	});

	const upsertNLPPPApprovals = async function(req){
		const approvalsType = await SELECT.from(NLPPPApproverTypes);
		const approvers = await SELECT.from(NLPPPApprovers);
		
		let approvals = matchNLPPPApprovalsData (approvalsType, approvers, req);

		await INSERT(approvals).into(NLPPPApprovals);
	}

	function matchNLPPPApprovalsData(approvalsType, approvers, req) {
		return approvalsType.map(approval => {
			const approver = approvers.find(approver => approver.ID === approval.NLPPPApprovers_ID);
	
			if (approver) {
				return {
					ApproverRole: approval.NLPPPApproverTypes,
					ApproverCWID: approver.NLPPPApproverCWID,
					ApproverName: approver.NLPPPApproverName,
					ApprovalStatus: req.data.ApprovalStatus,
					ApproverComment: null,
					ApprovalDate: null,
					SenderComment: null,
					NLPPP_ID: req.data.NLPPP_ID
				};
			}
		}).filter(item => item); // Filter out undefined results
	}

	srv.after('READ', 'WholesalePurchasePriceView', async (data) => {
		const countryProducts = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: "NL"});
		countryProducts.forEach(item => {
			const filteredData = data.filter(purchaseprice => purchaseprice.PRODUCTPACKID == item.PRODUCTPACKID);
			if (filteredData.length > 1) {
				filteredData.forEach(fd => {
					const index = data.findIndex(el => el === fd && el.WholesalePurchasePriceID == null);
					if (index > -1) {
						data.splice(index, 1);
					}
				});
			}
		});
		
	});
    srv.before('CREATE', 'DistributionAgreements', async (req) => {
        const { StartDate, Type, Value, PRODUCTPACKID, DistributorID } = req.data;
        !StartDate && req.error({code: 400, message: 'Start Date is required', target: 'StartDate'});
        !Type && req.error({code: 400, message: 'Type is required', target: 'Type'});
        !Value && req.error({code: 400, message: 'Distribution Arrangement is required', target: 'Value'});

		//check if dates are correct
		if(req.data.CurrentStartDate &&( moment(req.data.StartDate).isSame(req.data.CurrentStartDate) || moment(req.data.StartDate).isBefore(req.data.CurrentStartDate)))
			req.error({ code: 404, message: "The contract start date of the new agreement should not be the same as the start date of the current agreement", target: "startDate" });
		
        const currentDistributionAgreementView = await SELECT.one.from(CurrentDistributionAgreementView).where({PRODUCTPACKID: PRODUCTPACKID, DistributorID: DistributorID});
        if (currentDistributionAgreementView) {
			await UPDATE(CurrentDistributionAgreementView).with ({EndDate: req.data.CurrentEndDate}).where({
				ID: currentDistributionAgreementView.ID
			})
        }
    });

	srv.after('UPDATE', 'NLPPPApprovals', async (data) => {
		await updateNLPPP(data);
		return data;
	});

	async function updateNLPPP (data) {
		const nlPPPApprovals =  await SELECT.from(NLPPPApprovals).where({NLPPP_ID: data.NLPPP_ID}); 
		// Include the current data in the check
		const updatedApprovals = nlPPPApprovals.map(approval => {
			if (approval.ID === data.ID) {
				// Replace the approval record with the incoming data
				return { ...approval, ApprovalStatus: data.ApprovalStatus };
			}
			return approval;
		});

		if(data.ApprovalStatus === 'Rejected'){
			await UPDATE(NLPPP).with ({Status: 'Rejected'}).where({
				ID: data.NLPPP_ID
			})
		}
		else if(data.ApprovalStatus === 'Approved'){
			const nlppp = await SELECT.one.from(NLPPP).where({ID: data.NLPPP_ID}); 
			await UPDATE(NLPPP).with({ApprovalsCount: nlppp.ApprovalsCount + 1}).where({ ID: data.NLPPP_ID });

			const allApproved = updatedApprovals.every(approval => approval.ApprovalStatus === 'Approved');

			if (allApproved) {
				// If all approvals are 'Approved', update the status to 'Approved'
				await UPDATE(NLPPP).with({ Status: 'Approved' }).where({ ID: data.NLPPP_ID });
			}

		}
	}

	srv.after('UPDATE', 'WholesalePurchasePriceApprovals', async (data) => {
		await updateWPP(data);
		return data;
	});

	async function updateWPP (data) {
		const wPPApprovals =  await SELECT.from(WholesalePurchasePriceApprovals).where({WholesalePurchasePrice_ID: data.WholesalePurchasePrice_ID}); 
		// Include the current data in the check
		const updatedApprovals = wPPApprovals.map(approval => {
			if (approval.ID === data.ID) {
				// Replace the approval record with the incoming data
				return { ...approval, ApprovalStatus: data.ApprovalStatus };
			}
			return approval;
		});

		if(data.ApprovalStatus === 'Rejected'){
			await UPDATE(WholesalePurchasePrice).with ({Status: 'Rejected'}).where({
				ID: data.WholesalePurchasePrice_ID
			})   
		}
		else if(data.ApprovalStatus === 'Approved'){
			const wpp = await SELECT.one.from(WholesalePurchasePrice).where({ID: data.WholesalePurchasePrice_ID}); 
			await UPDATE(WholesalePurchasePrice).with({ApprovalsCount: wpp.ApprovalsCount + 1}).where({ ID: data.WholesalePurchasePrice_ID });

			const allApproved = updatedApprovals.every(approval => approval.ApprovalStatus === 'Approved');

			if (allApproved) {
				// If all approvals are 'Approved', update the status to 'Approved'
				await UPDATE(WholesalePurchasePrice).with({ Status: 'Approved' }).where({ ID: data.WholesalePurchasePrice_ID });
			}

		}
	}

	srv.before('UPDATE', 'DistributionAgreements', async(req) => {
		const data = req.data;
		const daview = await SELECT.one.from(DistributionAgreementsView).where({PRODUCTPACKID: req.data.PRODUCTPACKID, EndDate: req.data?.CurrentEndDate});
		let newEndDate = new Date(req.data?.StartDate);
		// Subtract one day
		newEndDate.setDate(newEndDate.getDate() - 1);
		// Get the formatted date as 'YYYY-MM-DD'
		let formattedEndDate = newEndDate.toISOString().split('T')[0];
		if (daview) {
			await UPDATE(DistributionAgreements).with ({EndDate: formattedEndDate}).where({
				ID: daview.DistributionAgreementID,
				PRODUCTPACKID: req.data?.PRODUCTPACKID
			})
        }
		req.data.CurrentEndDate = formattedEndDate;
	});

    srv.before('CREATE', 'WholesalePurchasePrices', async (req) => {
        const { StartDate, Type, PRODUCTPACKID,Margin , WPPWithoutTax, DistributorID } = req.data;
        !StartDate && req.error({code: 400, message: 'Start Date is required', target: 'StartDate'});
        !Type && req.error({code: 400, message: 'Type is required', target: 'Type'});
        !Margin && req.error({code: 400, message: 'Margin is required', target: 'Margin'});
        !WPPWithoutTax && req.error({code: 400, message: 'WPP Without Tax is required', target: 'WPPWithoutTax'});

		//check if dates are correct
		if(req.data.CurrentStartDate &&( moment(req.data.StartDate).isSame(req.data.CurrentStartDate) || moment(req.data.StartDate).isBefore(req.data.CurrentStartDate)))
			req.error({ code: 404, message: "The contract start date of the new agreement should not be the same as the start date of the current agreement", target: "startDate" });
		
        const currentWholesalePurchasePriceView = await SELECT.one.from(CurrentWholesalePurchasePriceView).where({PRODUCTPACKID: PRODUCTPACKID, DistributorID: DistributorID});
        if (currentWholesalePurchasePriceView) {
			await UPDATE(CurrentWholesalePurchasePriceView).with ({EndDate: req.data.CurrentEndDate}).where({
				ID: currentWholesalePurchasePriceView.ID
			})
        }
    });
	srv.before('CREATE', 'NLppps', async (req) => {
        const { StartDate, Type, PRODUCTPACKID, MaxPrice} = req.data;
        !StartDate && req.error({code: 400, message: 'Start Date is required', target: 'StartDate'});
        !Type && req.error({code: 400, message: 'Type is required', target: 'Type'});
        !MaxPrice && req.error({code: 400, message: 'MaxPrice is required', target: 'MaxPrice'});

		//check if dates are correct
		if(req.data.CurrentStartDate &&( moment(req.data.StartDate).isSame(req.data.CurrentStartDate) || moment(req.data.StartDate).isBefore(req.data.CurrentStartDate)))
			req.error({ code: 404, message: "The contract start date of the new agreement should not be the same as the start date of the current agreement", target: "startDate" });
		
        const currentNLPPPView = await SELECT.one.from(CurrentNLpppView).where({PRODUCTPACKID: PRODUCTPACKID});
        if (currentNLPPPView) {
			await UPDATE(CurrentNLpppView).with ({EndDate: req.data.CurrentEndDate}).where({
				ID: currentNLPPPView.ID,
				PRODUCTPACKID: PRODUCTPACKID
			})
        }
    });

	srv.before('UPDATE', 'NLppps', async(req) => {
		const data = req.data;
		const nlpppview = await SELECT.one.from(NLpppView).where({PRODUCTPACKID: req.data.PRODUCTPACKID, EndDate: req.data?.CurrentEndDate});
		let newEndDate = new Date(req.data?.StartDate);
		// Subtract one day
		newEndDate.setDate(newEndDate.getDate() - 1);
		// Get the formatted date as 'YYYY-MM-DD'
		let formattedEndDate = newEndDate.toISOString().split('T')[0];
		if (nlpppview) {
			await UPDATE(NLPPP).with ({EndDate: formattedEndDate}).where({
				ID: nlpppview.PPPID,
				PRODUCTPACKID: req.data?.PRODUCTPACKID
			})
        }
		
		const nlpppapprovals = await SELECT.from(NLPPPApprovals).where({NLPPP_ID: req.data.ID});
		for (const nlpppapproval of nlpppapprovals) {
			await UPDATE(NLPPPApprovals).with ({ApprovalStatus: 'Waiting', ApproverComment: null, ApprovalDate: null}).where({ID:nlpppapproval.ID});
		}
		req.data.CurrentEndDate = formattedEndDate;
		req.data.Status = 'New';
		req.data.ApprovalsCount = 0;

	});

	srv.before('UPDATE', 'WholesalePurchasePrices', async(req) => {
		const data = req.data;
		const wholesalePurchasePrices = await SELECT.one.from(WholesalePurchasePrices).where({PRODUCTPACKID: req.data.PRODUCTPACKID, EndDate: req.data?.CurrentEndDate});
		let newEndDate = new Date(req.data?.StartDate);
		// Subtract one day
		newEndDate.setDate(newEndDate.getDate() - 1);
		// Get the formatted date as 'YYYY-MM-DD'
		let formattedEndDate = newEndDate.toISOString().split('T')[0];
		if (wholesalePurchasePrices) {
			await UPDATE(WholesalePurchasePrices).with ({EndDate: formattedEndDate}).where({
				ID: wholesalePurchasePrices.ID,
				PRODUCTPACKID: req.data?.PRODUCTPACKID
			})
        }

		const wppapprovals = await SELECT.from(WholesalePurchasePriceApprovals).where({WholesalePurchasePrice_ID: req.data.ID});
		for (const wppapproval of wppapprovals) {
			await UPDATE(WholesalePurchasePriceApprovals).with ({ApprovalStatus: 'Waiting', ApproverComment: null, ApprovalDate: null}).where({ID:wppapproval.ID});
		}
		req.data.CurrentEndDate = formattedEndDate;
		req.data.Status = 'New';
		req.data.ApprovalsCount = 0;
		
	});

	srv.on('ApproveWPP', async (req, res) => {
		try {
			const { data: { ID, ProductCode }} = req;
			if (!ID || ID == "NA") throw Error('Wholesale Purchase Price not found');

			const mappedWpp = {
				Status: 'Approved',
				PowerApproverCWID: req.user.id,
				PowerApprovalDate: new Date()
			}; 

			await UPDATE(WholesalePurchasePrices).with(mappedWpp).where({
				ID: ID
			});

			return 'Wholesale Purcahse Price approved successfully';
		} catch (error) {
			console.error('Error in ApproveWPP');
            return req.reject(403, error?.message||"Error in ApproveWPP");
		}
	});

	srv.on('ApprovePPP', async (req, res) => {
		try {
			const { data: { ID, ProductCode }} = req;
			if (!ID || ID == "NA") throw Error('Purchase Price not found');

			const mappedPpp = {
				Status: 'Approved',
				PowerApproverCWID: req.user.id,
				PowerApprovalDate: new Date()
			}; 

			await UPDATE(NLPPP).with(mappedPpp).where({
				ID: ID
			});

			return 'Purchase Price approved successfully';
		} catch (error) {
			console.error('Error in ApprovePPP');
            return req.reject(403, error?.message||"Error in ApprovePPP");
		}
	});

	srv.after('READ', 'NLpppView', async (data) => {
		const countryProducts = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: "NL"});
		countryProducts.forEach(item => {
			const filteredData = data.filter(ppp => ppp.PRODUCTPACKID == item.PRODUCTPACKID);
			if (filteredData.length > 1) {
				const defaultProductIndex = data.findIndex(el => el.PRODUCTPACKID == item.PRODUCTPACKID && el.PPPID == null);
				defaultProductIndex > -1 && data.splice(defaultProductIndex, 1);
			}
		});
		
	});

	srv.on("READ", "NLPPPApprovalsNotification", async req => {
		try {
			const results = mappedNLPPPAppovals();
			return results;
		} catch (error) {
			console.error('Error in NLPPPApprovalsNotification READ');
			return req.reject(403, error?.message||"Error in NLPPPApprovalsNotification READ");
		}
	});

	async function mappedNLPPPAppovals () {
		const pppApproverTypes = await SELECT.from(NLPPPApproverTypes).columns(
			"*", 
			"NLPPPApprovers.NLPPPApproverCWID", 
			"NLPPPApprovers.NLPPPApproverName",
			"NLPPPApprovers.NLPPPApproverEmailID"
		);

		// Deleting duplicate NLPPP ApproverTypes
		const uniqueValues = new Map();
		pppApproverTypes.forEach(item => {
			uniqueValues.set(item["NLPPPApproverTypes"], item);
		});
		const filteredNLPPPApproverTypes = Array.from(uniqueValues.values());

		return filteredNLPPPApproverTypes.map(pppAt => {
			// Getting Approvers list which assigned to the specific role
			const filteredApprovers = pppApproverTypes
				.filter(pppAppr => pppAppr.NLPPPApproverTypes.toLowerCase() === pppAt.NLPPPApproverTypes.toLowerCase())
				.map(el => ({
					NLPPPApproverCWID: el.NLPPPApproverCWID,
					NLPPPApproverName: el.NLPPPApproverName,
					NLPPPApproverEmailID: el.NLPPPApproverEmailID
				}));
			return {
				NLPPPApproverType: pppAt.NLPPPApproverTypes,
				CountryCode: 'NL',
				Send: 'Yes',
				SenderComment: null,
				NLPPPApprovers: filteredApprovers,
				SelectedNLPPPApprover_NLPPPApproverCWID: filteredApprovers?.[0]?.NLPPPApproverCWID,
				SelectedNLPPPApprover_NLPPPApproverName: filteredApprovers?.[0]?.NLPPPApproverName,
				SelectedNLPPPApprover_NLPPPApproverEmailID: filteredApprovers?.[0]?.NLPPPApproverEmailID,
				NLPPPApprovalPageLink: null
			}
		});
	}

	srv.on('READ', 'NLExcelTemplates', async (req, next) => {
		try{
			const tx = cds.tx(req);
			const {templateId, validDate, status} = req.data;
			const countryProducts = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: "NL"});
			const template = await SELECT.one.from(ExcelTemplate).where({ templateId: templateId });

			if (!template || !template.content) {
				return req.reject(404, 'No template found for templateid:' + templateId);
			}

			//Filtering
			const fullWhere = cds.parse.expr(`(StartDate <= date'${validDate}' or StartDate = null) and (EndDate >= date'${validDate}' or EndDate = null)`);
			const query = SELECT.from(NLpppView).where(fullWhere);
			!!status && query.where({Status: { '=': status }});

			//Sorting
			query.orderBy("PRODUCTPACKNAME asc");

			//Request to the database
			const excelData = await tx.run(query);

			//Delete empty PPP if there is at least one contract with the same PRODUCTPACKID 
			countryProducts.forEach(item => {
				const filteredData = excelData.filter(ppp => ppp.PRODUCTPACKID == item.PRODUCTPACKID);
				if (filteredData.length > 1) {
					const defaultProductIndex = excelData.findIndex(el => el.PRODUCTPACKID == item.PRODUCTPACKID && el.PPPID == null);
					defaultProductIndex > -1 && excelData.splice(defaultProductIndex, 1);
				}
			});

			// Formatting
			excelData.forEach(ed => {
				ed.PPP = formatNLPPPPrices(ed.PPP);
				ed.StartDate = ed.StartDate && ServiceHelper.formatDate(ed.StartDate, '', 'DD-MM-YYYY');
				ed.EndDate = ed.EndDate && ServiceHelper.formatDate(ed.EndDate, '', 'DD-MM-YYYY');
			});

			let excelStreamValue = XLSXHelper.generateXLSXByFile(template.content, { excelData }, 1);

			req._.res.setHeader('Content-disposition', `attachment; filename=${template.filename}`);
			req._.res.setHeader('Content-type', template.mediaType);
			return excelStreamValue;
		}
		catch(error){
            console.error('Error in NLExcelTemplates READ');
            return req.reject(403, error?.message||"Error in NLExcelTemplates");
        }
	});

	const formatNLPPPPrices = function (value) {
        if (!value){
            value = 0;
        };
        const formattedValue = ServiceHelper.formatCurrency(Number(value), 'en-US', 2, 2, true);
        return formattedValue.replace(/,/g, '.').replace(/\.(?=\d{2}$)/, ',');
    };

	srv.on('READ', 'NLDAExcelTemplates', async (req, next) => {
		try{
		const tx = cds.tx(req);
		const {templateId, validDate, distributorID} = req.data;

		const template = await SELECT.one.from(ExcelTemplate).where({ templateId: templateId });

		if (!template || !template.content) {
			return req.reject(404, 'No template found for templateid:' + templateId);
		}
		//Filtering
		const fullWhere = cds.parse.expr(`StartDate <= date'${validDate}' and EndDate >= date'${validDate}' and DistributorID = ${distributorID}`);
		const query = SELECT.from(NLDAExcelExtract).where(fullWhere);

		//Sorting
		query.orderBy("PRODUCTPACKNAME asc");
		const excelData = await tx.run(query);

		excelData.forEach(item => {
			// Assuming 'Type' and 'Currency' fields are part of the item
			item.Value = formatterDistributonArrangement(item.Value, item.Type);
		});

		let excelStreamValue = XLSXHelper.generateXLSXByFile(template.content,{ excelData },1);

		req._.res.setHeader('Content-disposition', `attachment; filename=${template.filename}`);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return excelStreamValue;
		}
		catch(error){
            console.error('Error in NLDAExcelTemplates READ');
            return req.reject(403, error?.message||"Error in NLDAExcelTemplates");
        }
	});

	function formatPercentage(value) {
		const percentage = value * 100;
		// Convert to a string with appropriate precision and remove unnecessary decimals
		const formatted = parseFloat(percentage.toPrecision(12)); 
		return (Number.isInteger(formatted) ? `${formatted}%` : `${formatted.toFixed(1)}%`);
	}

	srv.on('READ', 'NLWPPExcelTemplates', async (req, next) => {
		try{
		const tx = cds.tx(req);
		const {templateId, validDate, status, distributorID} = req.data;

		const template = await SELECT.one.from(ExcelTemplate).where({ templateId: templateId });

		if (!template || !template.content) {
			return req.reject(404, 'No template found for templateid:' + templateId);
		}
		//Filtering
		const fullWhere = cds.parse.expr(`StartDate <= date'${validDate}' and EndDate >= date'${validDate}' and DistributorID = ${distributorID}`);
		const query = SELECT.from(NLWPPExcelExtract).where(fullWhere);

		//Sorting
		query.orderBy("PRODUCTPACKNAME asc");
		const excelData = await tx.run(query);

		excelData.forEach(item => {
			// Assuming 'Type' and 'Currency' fields are part of the item
			item.PPP = ServiceHelper.formatCurrency(item.PPP, 'nl-NL', 2, 2, true);
			item.WPPWithoutTax = ServiceHelper.formatCurrency(Number(item.WPPWithoutTax), 'nl-NL', 2, 2, false);
			item.Margin = formatPercentage(item.Margin);
			item.CombinedWPPMarginNetPriceValues = item.Type === 'Margin' ? `Marge ${item.Margin}` : `Netto Prijs`;
			item.EndDate = item.StartDate && (item.EndDate && moment(item.EndDate).isSame("9999-12-31")) ? moment(item.StartDate).add(5, 'months').endOf('month').format('DD/MM/YYYY') : moment(item.EndDate).format('DD/MM/YYYY');
			item.StartDate = item.StartDate && ServiceHelper.formatDate(item.StartDate, '', 'DD/MM/YYYY');
			item.minEndDate = item.minEndDate && ServiceHelper.formatDate(item.minEndDate, '', 'DD/MM/YYYY');
		});

		let excelStreamValue = XLSXHelper.generateXLSXByFile(template.content,{ excelData },1);

		req._.res.setHeader('Content-disposition', `attachment; filename=${template.filename}`);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return excelStreamValue;
		}
		catch(error){
            console.error('Error in NLWPPExcelTemplates READ');
            return req.reject(403, error?.message||"Error in NLWPPExcelTemplates");
        }
	});

	srv.on("CREATE", "NLPPPApprovalsNotification", async (req, next) => {
		try {
			const {SelectedNLPPPApprover_NLPPPApproverEmailID} = req.data;
			const nlPPPs = await SELECT.from(NLpppView).where({Status: "New"});
			if (Array.isArray(nlPPPs) && nlPPPs.length > 0) {
				addOutgoingMail(req, "NLPPPApprovalNotificationMail", "New PPP Prices Pending Approval", SelectedNLPPPApprover_NLPPPApproverEmailID);
				return req.data;
			}else {
				return req.reject(404, 'No PPP found to approve');
			}
		} catch (error) {
			console.error('Error in NLPPPApprovalsNotification CREATE');
            return req.reject(403, error?.message||"Error in NLPPPApprovalsNotification");
		}
	});

	const addOutgoingMail = async function (req, templateId, subject, recipients) {
		const mailTemplate = await getMailTemplate(templateId);
		const mappedData = mapDataToMail(req, mailTemplate, subject, recipients);

		await INSERT(mappedData).into(OutgoingMails);

	}

	const mapDataToMail = function (req, template, subject, recipients) {
		const data = req.data;
		
        return {
            CountryCode: data.CountryCode,
            Sender: req.user.attr.email,
            Recipients: recipients,
            Subject: subject,
            MailBody: generateMailBody(template, {
                data: { 
                    approval: data
                }
            }),
            Sent: false
        };
    }

    const generateMailBody = function (mail, data) {
        return Handlebars.compile("" + mail.content)(data);
    }

    const getMailTemplate = async function (templateId) {
        try{
            const result = await SELECT.one.from(MailTemplate)
			.columns('*', 'MailTemplateFile.title', 'MailTemplateFile.content')
			.where({ TemplateId: templateId });
            return result;
        }catch(error){
            console.error("No mail template found");
            return;
        }
    }

	function formatterDistributonArrangement(Value, Type) {
		if (!Value || !Type) {
			return "";
		}

		Type = Type.toLowerCase();
		if (Type === "fixed") {
			return ServiceHelper.formatCurrency(Value, 'nl-NL', 2, 2, false);
		}
		if (Type === "percentage") {
			return (Value*100).toFixed(2)+"%";
		}
	}

	srv.on("READ", "WholesalePurchasePriceApprovalsNotification", async req => {
		try {
			const results = mappedWholesalePurchasePriceAppovals();
			return results;
		} catch (error) {
			console.error('Error in WholesalePurchasePriceApprovalsNotification READ');
			return req.reject(403, error?.message||"Error in WholesalePurchasePriceApprovalsNotification READ");
		}
	});

	async function mappedWholesalePurchasePriceAppovals () {
		const wpppApproverTypes = await SELECT.from(WholesalePurchasePriceApproverTypes)
									.columns(
										"*", 
										"WholesalePurchasePriceApprovers.WholesalePurchasePriceApproverCWID", 
										"WholesalePurchasePriceApprovers.WholesalePurchasePriceApproverName",
										"WholesalePurchasePriceApprovers.WholesalePurchasePriceApproverEmailID",
									);

		// Deleting duplicate WPP ApproverTypes
		const uniqueValues = new Map();
		wpppApproverTypes.forEach(item => {
			uniqueValues.set(item["WholesalePurchasePriceApproverTypes"], item);
		});
		const filteredWPPApproverTypes = Array.from(uniqueValues.values());

		return filteredWPPApproverTypes.map(wpppAt => {
			// Getting Approvers list which assigned to the specific role
			const filteredApprovers = wpppApproverTypes
				.filter(wppAppr => wppAppr.WholesalePurchasePriceApproverTypes.toLowerCase() === wpppAt.WholesalePurchasePriceApproverTypes.toLowerCase())
				.map(el => ({
					WholesalePurchasePriceApproverName: el.WholesalePurchasePriceApproverName,
					WholesalePurchasePriceApproverCWID: el.WholesalePurchasePriceApproverCWID,
					WholesalePurchasePriceApproverEmailID: el.WholesalePurchasePriceApproverEmailID
				}));

			return {
				WholesalePurchasePriceApproverType: wpppAt.WholesalePurchasePriceApproverTypes,
				CountryCode: 'NL',
				Send: 'Yes',
				SenderComment: null,
				WPPApprovers: filteredApprovers,
				SelectedWppApprover_WholesalePurchasePriceApproverCWID: filteredApprovers?.[0]?.WholesalePurchasePriceApproverCWID,
				SelectedWppApprover_WholesalePurchasePriceApproverName: filteredApprovers?.[0]?.WholesalePurchasePriceApproverName,
				SelectedWppApprover_WholesalePurchasePriceApproverEmailID: filteredApprovers?.[0]?.WholesalePurchasePriceApproverEmailID
			}
		});
	}

	srv.on("READ", "PPPApprovalsView", async (req, next) => {
		try {
			const tx = cds.tx(req);
		
			let result = [];
			let tmvQuery = SELECT.from(req.query.SELECT.from);
			req.query.SELECT.where && (tmvQuery.where(req.query.SELECT.where));

			result = await tx.run(tmvQuery);

			const isCountQuery = Array.isArray(result) && result.some(item => '$count' in item);
		
			if (isCountQuery) {
				// If $count is present, return the original result
				return result;
			}
			
			const cwid = req.user.id;

			let resultsArray = Array.isArray(result) ? result : [result];

			resultsArray = resultsArray.filter(ra => ra.ApproverCWID === cwid);

			return resultsArray;

		} catch (error) {
			console.error('Error in PPPApprovalsView READ');
            return req.reject(403, error?.message||"Error in PPPApprovalsView");
		}
	});

	srv.on("READ", "WPPApprovalsView", async (req, next) => {
		try {
			const tx = cds.tx(req);
		
			let result = [];
			let tmvQuery = SELECT.from(req.query.SELECT.from);
			req.query.SELECT.where && (tmvQuery.where(req.query.SELECT.where));

			result = await tx.run(tmvQuery);

			const isCountQuery = Array.isArray(result) && result.some(item => '$count' in item);
		
			if (isCountQuery) {
				// If $count is present, return the original result
				return result;
			}
			
			const cwid = req.user.id;

			let resultsArray = Array.isArray(result) ? result : [result];

			resultsArray = resultsArray.filter(ra => ra.ApproverCWID === cwid);

			return resultsArray;

		} catch (error) {
			console.error('Error in WPPApprovalsView READ');
            return req.reject(403, error?.message||"Error in WPPApprovalsView");
		}
	});

	srv.on("CREATE", "WholesalePurchasePriceApprovalsNotification", async (req, next) => {
		try {
			const {SelectedWppApprover_WholesalePurchasePriceApproverEmailID} = req.data;
			const wholesalePurchasePrices = await SELECT.from(WholesalePurchasePrices).where({Status: "New"});
			if (Array.isArray(wholesalePurchasePrices) && wholesalePurchasePrices.length > 0) {
				addOutgoingMail(req, "WPPApprovalNotificationMail", "New WPP Prices Pending Approval", SelectedWppApprover_WholesalePurchasePriceApproverEmailID);
				return req.data;
			}else {
				return req.reject(404, 'No WPP found to approve');
			}
		} catch (error) {
			console.error('Error in WholesalePurchasePriceApprovalsNotification CREATE');
            return req.reject(403, error?.message||"Error in WholesalePurchasePriceApprovalsNotification");
		}
	});
	srv.after('READ', 'WPPApprovalDistributors', data => {
        const countryCode = data?.[0]?.CountryCode;
		data.unshift({
			ID: "99999999-9999-9999-9999-999999999999",
			CountryCode: countryCode,
            DistributorID: "",
            DistributorName: "All",
		})
	});
};