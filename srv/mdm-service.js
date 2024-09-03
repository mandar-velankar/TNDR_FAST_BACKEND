const cds = require('@sap/cds');
const XLSX = require("xlsx");
const moment = require('moment');
const XLSXHelper = require("./utils/XLSXHelper");
const Handlebars = require("handlebars");
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

	const {
		MailTemplate
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
	SalesData,
	WholesalePurchasePriceApprovals,
	WholesalePurchasePriceApproverTypes,
	WholesalePurchasePriceApprovers,
	NLPPPApproverTypes,
	NLPPPApprovers,
	NLPPPApprovals,
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
		NLDAExcelTemplates,
		NLDAExcelExtract,
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
        const { StartDate, Type, Value, PRODUCTPACKID } = req.data;
        !StartDate && req.error({code: 400, message: 'Start Date is required', target: 'StartDate'});
        !Type && req.error({code: 400, message: 'Type is required', target: 'Type'});
        !Value && req.error({code: 400, message: 'Distribution Arrangement is required', target: 'Value'});

		//check if dates are correct
		if(req.data.CurrentStartDate &&( moment(req.data.StartDate).isSame(req.data.CurrentStartDate) || moment(req.data.StartDate).isBefore(req.data.CurrentStartDate)))
			req.error({ code: 404, message: "The contract start date of the new agreement should not be the same as the start date of the current agreement", target: "startDate" });
		
        const currentDistributionAgreementView = await SELECT.one.from(CurrentDistributionAgreementView).where({PRODUCTPACKID: PRODUCTPACKID});
        if (currentDistributionAgreementView) {
			await UPDATE(CurrentDistributionAgreementView).with ({EndDate: req.data.CurrentEndDate}).where({
				ID: currentDistributionAgreementView.ID,
				PRODUCTPACKID: PRODUCTPACKID
			})
        }
    });

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
        const { StartDate, Type, PRODUCTPACKID,Margin , WPPWithoutTax } = req.data;
        !StartDate && req.error({code: 400, message: 'Start Date is required', target: 'StartDate'});
        !Type && req.error({code: 400, message: 'Type is required', target: 'Type'});
        !Margin && req.error({code: 400, message: 'Margin is required', target: 'Margin'});
        !WPPWithoutTax && req.error({code: 400, message: 'WPP Without Tax is required', target: 'WPPWithoutTax'});

		//check if dates are correct
		if(req.data.CurrentStartDate &&( moment(req.data.StartDate).isSame(req.data.CurrentStartDate) || moment(req.data.StartDate).isBefore(req.data.CurrentStartDate)))
			req.error({ code: 404, message: "The contract start date of the new agreement should not be the same as the start date of the current agreement", target: "startDate" });
		
        const currentWholesalePurchasePriceView = await SELECT.one.from(CurrentWholesalePurchasePriceView).where({PRODUCTPACKID: PRODUCTPACKID});
        if (currentWholesalePurchasePriceView) {
			await UPDATE(CurrentWholesalePurchasePriceView).with ({EndDate: req.data.CurrentEndDate}).where({
				ID: currentWholesalePurchasePriceView.ID,
				PRODUCTPACKID: PRODUCTPACKID
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
		req.data.CurrentEndDate = formattedEndDate;
	});

	srv.before('UPDATE', 'WholesalePurchasePrices', async(req) => {
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
		req.data.CurrentEndDate = formattedEndDate;
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
		const pppApproverTypes = await SELECT.from(NLPPPApproverTypes);

		return pppApproverTypes.map(pppAt => ({
			NLPPPApproverType: pppAt.NLPPPApproverTypes,
			CountryCode: 'NL',
			Send: 'Yes',
			SenderComment: null,
			NLPPPApproverCWID: null,
			NLPPPApproverName: null,
			NLPPPApproverEmailID: null,
			NLPPPApprovalPageLink: null
		}));
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
				ed.PPP = ServiceHelper.formatCurrency(ed.PPP, 'nl-NL', 2, 2);
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

	srv.on("CREATE", "NLPPPApprovalsNotification", async (req, next) => {
		try {
			const nlPPPs = await SELECT.from(NLpppView).where({Status: "New"});
			const nlPPPappovers = await SELECT.from(NLPPPApprovers);
			if (Array.isArray(nlPPPs) && nlPPPs.length > 0) {
				addOutgoingMail(req, nlPPPappovers, "NLPPPApprovalNotificationMail", "New PPP Prices Pending Approval Or Your approval is required");
				return req.data;
			}else {
				return req.reject(404, 'No PPP found to approve');
			}
		} catch (error) {
			console.error('Error in NLPPPApprovalsNotification CREATE');
            return req.reject(403, error?.message||"Error in NLPPPApprovalsNotification");
		}
	});

	const addOutgoingMail = async function (req, nlPPPappovers, templateId, subject) {
		const mailTemplate = await getMailTemplate(templateId);
		const mappedData = mapDataToMail(req, nlPPPappovers, mailTemplate, subject);

		await INSERT(mappedData).into(OutgoingMails);

	}

	const mapDataToMail = function (req, nlPPPappovers, template, subject) {
		const nlPPPapprover = nlPPPappovers.find(el => el.NLPPPApproverCWID === req.data.NLPPPApproverCWID);
		const data = {
			...req.data,
			NLPPPApproverName: nlPPPapprover.NLPPPApproverName,
			NLPPPApproverEmailID: nlPPPapprover.NLPPPApproverEmailID
		};
		
        return {
            CountryCode: data.CountryCode,
            Sender: req.user.attr.email,
            Recipients: data.NLPPPApproverEmailID,
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
			return ServiceHelper.formatCurrency(Value, 'nl-NL', 2, 2);
		}
		if (Type === "percentage") {
			return (Value*100).toFixed(2)+"%";
		}
	}
};