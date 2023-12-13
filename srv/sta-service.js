const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');
const pdf = require("html-pdf");
const fs = require("fs");
const Handlebars = require("handlebars");
const SapCfMailer = require("sap-cf-mailer");
// const escape = require('escape-html');
// const html = require('html-escaper');
// const escapeStringRegexp = require('escape-string-regexp');
// const resolveWhen = require('special-escape');
const { Readable } = require('stream');
const path = require("path");
const XLSXHelper = require("./utils/XLSXHelper");
const wordTemplate = require("easy-template-x");
const createResolver = require("./libs/easy-template-x-angular-expression").createResolver;
const { Service } = require('@sap/cds');
const NumberHelper = require("./utils/NumberHelper");
const cfenv = require("cfenv");
const axios = require('axios');
const qs = require("qs");
const { nextTick } = require('process');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

module.exports = async (srv) => {
	const { mkConfig, generateCsv, asString  } = await import("export-to-csv");

	const UITemplatesService = await cds.connect.to('UITemplates');

	const { 
		CountryTemplate,
		Template: UITemplate,
		Tab,
		XMLView,
		Table,
		Form,
		FormContainer,
		FormElement,
		Column,
		Layout,
		Control,
		Properties,
		ValueHelp,
		Filter,
		StaticValue,
		MandatoryFieldsView
	} = UITemplatesService.entities;

	// Use reflection to get the csn definition
	const {
		CountryBrandProducts, LegalEntityBrand, DirectBrand, DistributorBrand, PricingPolicyView
	} = cds.entities("com.bayer.SXTENDER.MasterDataViews");
	const {
		CountryCogs, ExchangeRates
	} = cds.entities("com.bayer.SXTENDER.MasterDataLatestValues");
	const {
		PT_TMINST, 
		PT_TMDIST, 
		CountryApprovers, 
		ApproverTypes, 
		MASTER_COUNTRY_CHANNELS, 
		PT_TMPRDPCK, 
		CountryPreApprovedPrices, 
		AccountPreApprovedPrices, 
		PT_TMSKUPRDPCK, 
		RoyalDecree, 
		MasterPrices, 
		MASTER_TENDER_TYPE,
		PT_TMPRDHIER,
		PT_TMCTRY,
		PT_TMCTPRDPCK,
		SalesData,
		PT_TMINSHIER
	} = cds.entities("com.bayer.SXTENDER.MasterData");
	const {
		OfferConsolidation, 
		OfferProductConsolidation, 
		ApprovalRequests, 
		ProductPricingView, 
		PriceConditionView, 
		TenderHistorySpain, 
		PriceConditionBrazilView, 
		OfferValues, 
		OfferStatus,
		OfferRevisions,
		TenderOffers,
		ZuelligExtractView
	} = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");
	const {
		PT_TMTEND, 
		PT_TMQUTO,
		PT_TMDLVTR, 
		PT_TMUDLTRS, 
		PT_TMAPPRST, 
		PT_TMOFPR,
		PT_TMOFRS,
		PT_TMBDPR,
		PT_TMTRRES,
		FreeGoodsOther, 
		CandidatePrices, 
		ProductPricing, 
		PriceCondition, 
		DiscountCondition, 
		PriceConditionClassification, 
		ProductTypeProfitability,
		CountrySpecificTenderInfo,
		PT_TMTNOFST,
		TransCompetitorResult
	} = cds.entities("com.bayer.SXTENDER.TransactionalData");
	const {
		Template, 
		TemplateCountry, 
		MandatoryTableFieldsCountry, 
		MailTemplate, 
		PT_TMUSER, 
		ExcelAttachment, 
		WordAttachment, 
		WordTemplateCountry,
		WordTemplate,
		ExcelTemplate,
		SchedulerApiConfig,
		SchedulerApiConfigOAuth
	} = cds.entities("com.bayer.SXTENDER.AdminData");
	const {
		ProductPolicies, PolicyPrices
	} = cds.entities("com.bayer.SXTENDER.PricingPolicyData");

	const {
		LatestApprovedBrandPolicies
	} = cds.entities("PolicyService");


	srv.on('READ', 'Properties', req => {
		console.log('passing request to remote service ...');		
		return UITemplatesService.run(req.query);
	});

	// const arr = x => Array.from(x);
	// const num = x => Number(x) || 0;
	// const str = x => String(x);
	// const isEmpty = xs => xs.length === 0;
	// const take = n => xs => xs.slice(0, n);
	// const drop = n => xs => xs.slice(n);
	// const reverse = xs => xs.slice(0).reverse();
	// const comp = f => g => x => f(g(x));
	// const not = x => !x;
	// const chunk = n => xs =>
	// 	isEmpty(xs) ? [] : [take(n)(xs), ...chunk(n)(drop(n)(xs))];

	//This can probably be done in CDS layer, instead of nodejs
	//We need to decide on each nodejs implementation from cat service
	//if we: ** step away from the nodejs implementation to cds layer (preferred)
	// 		 ** if we keep the nodejs implementation, dont copy instead create the new one (to be dicussed - keep it seperate from the old application)

	/*srv.on('getCurrentUser', (req) => {
		return {
			name: req.user.id,
			email: req.user.attr.email,
		};
	})


	srv.on('READ', 'InstituteDistributor', async (req) => {
		// const tx = cds.transaction(req)
		const tx = cds.tx(req);
		let results = [];
		if (req.query.SELECT.where) {
			//Get non-filter information
			let channel = ServiceHelper.getWhereValue(req, "CHANNEL");
			let legalEntityCode = ServiceHelper.getWhereValue(req, "LEGAL_ENTITY_CODE");
			let instituteId = ServiceHelper.getWhereValue(req, "INSTITUTE_ID");
			//Get filters
			let whereCountry = ServiceHelper.buildWhere(req, "COUNTRY_CODE");
			let whereInstitute = ServiceHelper.buildWhere(req, "INSTITUTE_ID");
			if (channel === "Direct") {
				let directDistributors = await tx.run(SELECT.from(DirectBrand).where(whereCountry).where(whereInstitute));
				results = directDistributors.map(function (d) {
					let uniqueId = d.COUNTRY_CODE.concat("_")
						.concat(d.INSTITUTE_ID).concat("_")
						.concat(d.DISTRIBUTOR_ID).concat("_")
						.concat(legalEntityCode).concat("_Distributor");
					return {
						COUNTRY_INSTITUTE_DISTRIBUTOR_ID: uniqueId,
						COUNTRY_CODE: d.COUNTRY_CODE,
						INSTITUTE_ID: d.INSTITUTE_ID,
						INSTITUTE_NAME: d.INSTITUTE_NAME,
						DISTRIBUTOR_ID: d.DISTRIBUTOR_ID,
						DISTRIBUTOR_NAME: d.DISTRIBUTOR_NAME,
						LEGAL_ENTITY_CODE: legalEntityCode,
						CHANNEL: d.CHANNEL
					}
				});
				results = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), results);
			}
			else if (channel === "Distributor") {
				let distributorDistributors = await tx.run(SELECT.from(DistributorBrand).where(whereCountry));
				results = distributorDistributors.map(function (d) {
					let uniqueId = d.COUNTRY_CODE.concat("_")
						.concat(instituteId).concat("_")
						.concat(d.DISTRIBUTOR_ID).concat("_")
						.concat(legalEntityCode).concat("_Distributor");
					return {
						COUNTRY_INSTITUTE_DISTRIBUTOR_ID: uniqueId,
						COUNTRY_CODE: d.COUNTRY_CODE,
						INSTITUTE_ID: instituteId,
						INSTITUTE_NAME: 'NA',
						DISTRIBUTOR_ID: d.DISTRIBUTOR_ID,
						DISTRIBUTOR_NAME: d.DISTRIBUTOR_NAME,
						LEGAL_ENTITY_CODE: legalEntityCode,
						CHANNEL: d.CHANNEL
					}
				});
				results = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), results);
			}
		}
		return results;
	});
	*/
  
	srv.on('READ', 'InstituteDistributorBrandProduct', async (req) => {
		// const tx = cds.transaction(req)
		const tx = cds.tx(req);
		let results = [];
		let searchValue = null;
		if (req.query.SELECT.where) {
			//Get non-filter information
			let channel = ServiceHelper.getWhereValue(req, "CHANNEL");
			// let instituteId = ServiceHelper.getWhereValue(req, "INSTITUTE_ID");
			let instituteIds = ServiceHelper.getWhereValues(req, "INSTITUTE_ID");
			//Get filters
			let whereCountry = ServiceHelper.buildWhere(req, "COUNTRY_CODE");
			let whereCountrySKU = ServiceHelper.buildFullWhere("CountryCode", "=", whereCountry[2].val);
			//  let whereInstitute = ServiceHelper.buildWhere(req, "INSTITUTE_ID");
			let whereInstitute = ServiceHelper.buildWhereExpression("INSTITUTE_ID", "or", instituteIds);
			let whereDistributor = ServiceHelper.buildWhere(req, "DISTRIBUTOR_ID");
			let whereProduct = ServiceHelper.buildWhere(req, "PRODUCT_ID");

			//let whereBrand = ServiceHelper.buildWhere(req, "BRAND_ID");
			let brandIds = ServiceHelper.getWhereValues(req, "BRAND_ID");
			let whereBrand = [];
			if(brandIds.length > 0){
				for (let i = 0; i < brandIds.length; i++) {
					brandIds[i] = "\'" + brandIds[i] + "\'";
				  }
			whereBrand = ServiceHelper.buildWhereExpression("BRAND_ID", "or", brandIds);
			}
			let whereLegalEntity = ServiceHelper.buildWhere(req, "LEGAL_ENTITY_CODE");
			let whereOrigin = ServiceHelper.buildWhere(req, "COUNTRY_OF_ORIGIN");

			let sDivision = ServiceHelper.getWhereId(req, "DIVISION");
			if (sDivision && sDivision !== ""){
				var whereDivision = ServiceHelper.buildWhere(req, "DIVISION");
			}

			//Get available brands in legal entity
			let entityBrands = [];
			if (whereLegalEntity.length !== 0 && whereBrand.length !== 0) {
				entityBrands = await tx.run(SELECT.from(LegalEntityBrand).where(whereCountry).where(whereLegalEntity).where(whereBrand));
			}
			else if (whereLegalEntity.length !== 0) {
				entityBrands = await tx.run(SELECT.from(LegalEntityBrand).where(whereCountry).where(whereLegalEntity));
			}
			else if (whereBrand.length !== 0) {
				entityBrands = await tx.run(SELECT.from(LegalEntityBrand).where(whereCountry).where(whereBrand));
			}
			else {
				entityBrands = await tx.run(SELECT.from(LegalEntityBrand).where(whereCountry));
			}
			//Get available products in country
			let countryProducts = [];
			if (whereProduct.length !== 0 && whereOrigin.length !== 0) {
				if(whereDivision && whereDivision.length > 0){
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereProduct).where(whereOrigin).where(whereDivision));
				} else {
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereProduct).where(whereOrigin));
				}
			}
			else if (whereOrigin.length !== 0) {
				if(whereDivision && whereDivision.length > 0){
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereOrigin).where(whereDivision));
				} else {
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereOrigin));
				}
			}
			else if (whereProduct.length !== 0) {
				if(whereDivision && whereDivision.length > 0){
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereProduct).where(whereDivision));
				} else {
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereProduct));
				}
			}
			else {
				if(whereDivision && whereDivision.length > 0){
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereDivision));
				} else {
					countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry));
				}
			}
             //EHQUT-SCTASK13413732-Filter Active SKU Code
			//get SKU code for products
			//Get filters
			let aProductSKUs = await tx.run(SELECT.from(PT_TMSKUPRDPCK).where(whereCountrySKU).where({ActiveRecord : 'Yes'}));
             //EHQUT-SCTASK13413732-Filter Active SKU Code
			//Get products available to institute either Direct or through Distributor
			if (channel === "Direct") {
				var directBrands = await tx.run(SELECT.from(DirectBrand).where(whereCountry).where(whereInstitute).where(whereDistributor));
				results = buildDirectProducts(entityBrands, directBrands, countryProducts, aProductSKUs);
			}
			else if (channel === "Distributor") {
				var distributorBrands = await tx.run(SELECT.from(DistributorBrand).where(whereCountry).where(whereDistributor));
				results = buildDistributorProducts(entityBrands, distributorBrands, countryProducts, instituteIds, aProductSKUs);
			}

			searchValue = req.query.SELECT.where[20]?.xpr?.[0]?.args[1]?.val;
		}
		// sort by countrycode, then brand name, then product name
		results.sort((a,b)=> ( a.COUNTRY_CODE.localeCompare(b.COUNTRY_CODE) || a.BRAND_NAME.localeCompare(b.BRAND_NAME) || a.PRODUCT_NAME.localeCompare(b.PRODUCT_NAME)   ));

		// TODO: this filtering should be improved
		if(searchValue){
			results = results.filter(
				i=>i.PRODUCT_NAME.toLowerCase().includes(searchValue.toLowerCase()) || 
				i.SKUS.toLowerCase().includes(searchValue.toLowerCase())
			);
		}
	

		return results;
	});
	
	function buildDirectProducts(entityBrands, directBrands, countryProducts, productSKUs) {
		let results = [];
		entityBrands.forEach(entityBrand => {
			directBrand = directBrands.find(x => x.BRAND_ID === entityBrand.BRAND_ID);
			countryProductsList = countryProducts.filter(x => x.BRAND_ID === entityBrand.BRAND_ID);
			if (directBrand && countryProductsList.length !== 0) {
				countryProductsList.forEach((countryProduct) => {
					results.push({
						COUNTRY_CODE: entityBrand.COUNTRY_CODE,
						INSTITUTE_ID: directBrand.INSTITUTE_ID,
						INSTITUTE_NAME: directBrand.INSTITUTE_NAME,
						DISTRIBUTOR_ID: directBrand.DISTRIBUTOR_ID,
						DISTRIBUTOR_NAME: directBrand.DISTRIBUTOR_NAME,
						BRAND_ID: entityBrand.BRAND_ID,
						BRAND_NAME: countryProduct.BRAND_NAME,
						PRODUCT_ID: countryProduct.PRODUCT_ID,
						PRODUCT_NAME: countryProduct.PRODUCT_NAME,
						INCO_TERMS: directBrand.INCO_TERMS,
						PAYMENT_TERMS: directBrand.PAYMENT_TERMS,
						COMMISSION_RATE: directBrand.COMMISSION_RATE,
						LEGAL_ENTITY_CODE: entityBrand.LEGAL_ENTITY_CODE,
						CHANNEL: 'Direct',
						COUNTRY_OF_ORIGIN: countryProduct.COUNTRY_OF_ORIGIN,
                        DIVISION: countryProduct.DIVISION,
                        PACKFACTOR: countryProduct.PACK_SIZE,                        
						SKUS: Array.from(productSKUs.filter((product) => product.ProductPackID === countryProduct.PRODUCT_ID && product.ActiveRecord === "Yes").map((product) => { return product.SKUCode})).join(", ")
					});
				});
			}
		});
		return results;
	}
	function buildDistributorProducts(entityBrands, distributorBrands, countryProducts, instituteIds, productSKUs) {
		let results = [];
		entityBrands.forEach(entityBrand => {
			distributorBrand = distributorBrands.find(x => x.BRAND_ID === entityBrand.BRAND_ID);
			countryProductsList = countryProducts.filter(x => x.BRAND_ID === entityBrand.BRAND_ID);
			if (distributorBrand && countryProductsList.length !== 0) {
				countryProductsList.forEach((countryProduct) => {
					instituteIds.forEach(instituteId => {
						results.push({
							COUNTRY_CODE: entityBrand.COUNTRY_CODE,
							INSTITUTE_ID: instituteId,
							INSTITUTE_NAME: 'NA',
							DISTRIBUTOR_ID: distributorBrand.DISTRIBUTOR_ID,
							DISTRIBUTOR_NAME: distributorBrand.DISTRIBUTOR_NAME,
							BRAND_ID: entityBrand.BRAND_ID,
							BRAND_NAME: countryProduct.BRAND_NAME,
							PRODUCT_ID: countryProduct.PRODUCT_ID,
							PRODUCT_NAME: countryProduct.PRODUCT_NAME,
							INCO_TERMS: distributorBrand.INCO_TERMS,
							PAYMENT_TERMS: distributorBrand.PAYMENT_TERMS,
							COMMISSION_RATE: distributorBrand.COMMISSION_RATE,
							LEGAL_ENTITY_CODE: entityBrand.LEGAL_ENTITY_CODE,
							CHANNEL: 'Distributor',
							COUNTRY_OF_ORIGIN: countryProduct.COUNTRY_OF_ORIGIN,
							COGS: countryProduct.COGS,
							PACKFACTOR: countryProduct.PACK_SIZE,
							SKUS: Array.from(productSKUs.filter((product) => product.ProductPackID === countryProduct.PRODUCT_ID && product.ActiveRecord === "Yes").map((product) => { return product.SKUCode})).join(", ")
						});
					});
				});
			}
		});
		return results;
	}	// srv.on(['CREATE','UPDATE','DELETE'], 'AwardCriteriaTableView', async (req, next) => { 
			
	// 	debugger;	
	// 	let result = {
	// 		"CountryCode":"AE",
	// 		"TenderID":"AE-15-100-1002",
	// 		"Criteria":"Documents",
	// 		"Weight":0.05
	// 	}

	// 	return result;
		
	// });

	srv.before(['CREATE','UPDATE','DELETE'], 'TenderFormView', async (req) => {
		const today = new Date().toISOString().slice(0, 10);

		const mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: 'Tender', CountryCode: req?.data?.CountryCode, ProductScope: req?.data?.ExternalID}));

		const regex = /'?(?:path\s*:|type\s*:)\s*'([^']+)'?/;
		  
		for (const item of mandatoryFielddata) {
			let frontendField = item.Field;
			if (frontendField.includes("path")) {
				const match = regex.exec(frontendField);
				frontendField = match ? match[1] : frontendField;
			}
		
			if (
				!(frontendField in req.data) ||
				req.data[frontendField] === null ||
				req.data[frontendField] === ''
			) {
				req.error({ code: 404, message: `${item.Label} is required.`, target: frontendField });
			}
		}		
		// // validate form
		// !req.data.TenderName && req.error({ code: 404, message: "Tender Reference is required.", target: "TenderName" });
		// !req.data.Classification && req.error({ code: 404, message: "Classification is required.", target: "Classification" });
		// !req.data.InstituteID && req.error({ code: 404, message: "Institute Name is required.", target: "InstituteName" });
		// !req.data.InstituteType && req.error({ code: 404, message: "Institute Type is required.", target: "InstituteType" });
		// !req.data.TenderChannel && req.error({ code: 404, message: "Tender Channel is required.", target: "TenderChannel" });
		// !req.data.PublicationDate && req.error({ code: 404, message: "Publication Date is required.", target: "PublicationDate" });
		// !req.data.BidDueDate && req.error({ code: 404, message: "Offer Due Date is required.", target: "BidDueDate" });
		// !req.data.SubmittedBy && req.error({ code: 404, message: "Created By is required.", target: "SubmittedBy" });

		//check if dates are correct
		if(!moment(req.data.PublicationDate).isBefore(req.data.BidDueDate))
			req.error({ code: 404, message: "Publication date should be before the offer due date.", target: "PublicationDate" });

		if(req.data.AwardDate){

			if(!moment(req.data.BidDueDate).isBefore(req.data.AwardDate))
				req.error({ code: 404, message: "BidDueDate date should be before the Award date.", target: "BidDueDate" });

			if(req.data.NextPublicationDye && !moment(req.data.AwardDate).isBefore(req.data.NextPublicationDye))
				req.error({ code: 404, message: "Award date should be before the next publication date.", target: "NextPublicationDye" });
		}	
		
		req.data.ExternalID = null; //for mandatory field check in sta-service
		// remove associations data
		delete req.data.InstituteName;
		delete req.data.InstituteType;
		delete req.data.DirectTender;
		delete req.data.ParentInstituteID;
	});

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferFormView', async (req) => {

		const mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: 'Offer', CountryCode: req?.data?.CountryCode, ProductScope: req?.data?.DistributorComments}));
		const fieldMapping = {
			'DistributorName' : 'DistributorID', //this field mapping is required as on screen we display Distributor Name, but while saving we use DistributorID
		};
		const regex = /'?(?:path\s*:|type\s*:)\s*'([^']+)'?/;
		  
		for (const item of mandatoryFielddata) {
			let frontendField = item.Field;
			if (frontendField.includes("path")) {
				const match = regex.exec(frontendField);
				frontendField = match ? match[1] : frontendField;
			}
			// Check if there's a mapping, and if so, replace it
			if (fieldMapping[frontendField]) {
				frontendField = fieldMapping[frontendField];
			}
		
			if (
				!(frontendField in req.data) ||
				req.data[frontendField] === null ||
				req.data[frontendField] === ''
			) {
				req.error({ code: 404, message: `${item.Label} is required.`, target: frontendField });
			}
		}	
		// validate form
		// !req.data.DistributorID &&  req.error({ code: 404, message: "DistributorName is required.", target: "DistributorID" });
		// !req.data.SellingCompany && req.error({ code: 404, message: "SellingCompany is required.", target: "SellingCompany" });
		// !req.data.Division && req.error({ code: 404, message: "Division is required.", target: "Division" });
		// !req.data.InternalBidDueDate && req.error({ code: 404, message: "InternalBidDueDate is required.", target: "InternalBidDueDate" });
        // !req.data.Custom_String_1 && req.error({ code: 404, message: "Payment Term is required.", target: "Custom_String_1" });
        // !req.data.Currency && req.error({ code: 404, message: "Currency is required.", target: "Currency" });
		
		req.data.NewOfferDueDate = req.data.OfferDueDate;
		req.data.DistributorComments = null; //for mandatory field check in sta-service
		delete req.data.OfferDueDate;
		delete req.data.OfferStatus;
		delete req.data.InstituteID;
        delete req.data.Channel;
	});

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferProductsTableView', async (req) => {

		delete req.data.ProductPackName;
		delete req.data.NetPrice;
		delete req.data.TotalAmount;
	});

	srv.on('copyOffer', async (req) => {

		const { data: {offerID,type, QuotationInstituteID} } = req;

		!offerID && req.error({ code: 404, message: "OfferID was not provided", target: "OfferID" });
		!type && req.error({ code: 404, message: "Type was not provided. ('revisedoffer'|'continuedoffer')", target: "Type" });


		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID: offerID, ActiveOffer: 1});
		const offerStatus = await SELECT.one.from(PT_TMTNOFST).where({OfferID: offerID, Active: 1});
		const parentOfferID = offerID.split('-').slice(0,4).join("-");
		const parentOffer = await SELECT.one.from(PT_TMOFRS).where({OfferID: parentOfferID});

		// checks 
		if(!offer){
			return req.error({ code: 403, message: `Offer "${offerID}" is not active. Only active offer can be copied.`, target: "PT_TMOFRS"});
		}

		if(offerStatus.STATUS !== "Quotation Submitted" && offerStatus.STATUS !== "Results Recorded"){
			return req.error({ code: 403, message: "Only 'Quotation Submitted' or 'Results Recorded' offers can be copied", target: "OfferStatus" });
		}

		const offerProducts = await SELECT.from(PT_TMOFPR).where({OfferID: offerID, Active: 1});
		const productPricing = await SELECT.from(PT_TMBDPR).where({OfferID: offerID, Active: 1, ActiveTier: 0, LotID: 1 })
		const offerRevision = await SELECT.one.from(OfferRevisions).where({TENDERID: offer.TenderID, TENDEROFFERNO: offer.TenderOfferNo});
		const nextOfferID = await SELECT.one.from(TenderOffers).where({TENDERID: offer.TenderID});
		const priceCondtions = await SELECT.from(PriceCondition).where({OfferID: offerID});
		const priceConditionIDs = priceCondtions.map(pc => pc.ID);
		const freeGoodsOther = await SELECT.from(FreeGoodsOther).where({PriceCondition_ID: {in: priceConditionIDs}});
		const institute = await SELECT.one.from(PT_TMINST).where({CountryCode: offer.CountryCode, InstituteID: QuotationInstituteID});
		

		switch(type){
			case "revisedoffer": return createRevisedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, req});
			case "continuedoffer": return createContinuedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, req});
			case "affiliateoffer": return createAffiliateOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, nextOfferID, institute, priceCondtions, freeGoodsOther, req});
		}
	});

	async function createRevisedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, req}){
		const todaysDate = new Date().toISOString().substring(0,10);
		const revisedOfferID = `${offerRevision.TENDERID}-${offerRevision.TENDEROFFERNO}-R${offerRevision.NEXTREVISEDOFFERNO}`;

		const revisedOffer = {...offer};
		revisedOffer.OfferID = revisedOfferID;
		revisedOffer.CreationDate = todaysDate;
		revisedOffer.InternalBidDueDate = todaysDate;
		revisedOffer.NewOfferDueDate = todaysDate;
		revisedOffer.RevisedOfferNo = parentOffer.RevisedOfferNo + 1;

		const revisedOfferStatus = {...offerStatus};
		revisedOfferStatus.OfferID = revisedOfferID;
		revisedOfferStatus.STATUS = "Offer Created";
		revisedOfferStatus.Date = todaysDate;

		const revisedOfferProducts = offerProducts.map(pr => {
			const revisedProduct = {...pr};
			revisedProduct.OfferID = revisedOfferID;
			return revisedProduct;
		});

		const revisedProductsPricing = productPricing.map(pr => {
			const revisedProductPricing = {...pr};
			revisedProductPricing.OfferID = revisedOfferID;
			revisedProductPricing.SubmittedOn = todaysDate;
			return revisedProductPricing;
		});

		// 1. create revised offer
		await INSERT.into(PT_TMOFRS).entries(revisedOffer);
		// 2. create revised offer status
		await INSERT.into(PT_TMTNOFST).entries(revisedOfferStatus);
		// 3. create revised products
		await INSERT.into(PT_TMOFPR).entries(revisedOfferProducts);
		// 4. create product pricing
		await INSERT.into(PT_TMBDPR).entries(revisedProductsPricing);
		// 5. deactivate old offer by setting ActiveOffer = 0 only for Revised offer (not needed for Continued offer)
		offer.ActiveOffer = 0;
		await UPDATE(PT_TMOFRS).with (offer).where({OfferID: offer.OfferID});
		offerStatus.STATUS = "Inactive";
		await UPDATE(PT_TMTNOFST).with (offerStatus).where({OfferID: offer.OfferID});
		// 6. update the parent offer
		parentOffer.RevisedOfferNo = parentOffer.RevisedOfferNo + 1;
		parentOffer.ActiveOffer = 0;
		await UPDATE(PT_TMOFRS).with (parentOffer).where({OfferID: parentOffer.OfferID});

		return revisedOfferID;
	};


	async function createContinuedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, req}){

		const continuedOfferID = `${offerRevision.TENDERID}-${offerRevision.TENDEROFFERNO}-C${offerRevision.NEXTCONTINUEDOFFERNO}`;
		const continuedOffer = {...offer};
		const todaysDate = new Date().toISOString().substring(0,10);
		continuedOffer.OfferID = continuedOfferID;
		continuedOffer.CreationDate = todaysDate;
		continuedOffer.InternalBidDueDate = todaysDate;
		continuedOffer.NewOfferDueDate = todaysDate;	
		continuedOffer.ContinuationOfferNo = parentOffer.ContinuationOfferNo + 1;


		const continuedOfferStatus = {...offerStatus};
		continuedOfferStatus.OfferID = continuedOfferID;
		continuedOfferStatus.STATUS = "Offer Created";
		continuedOfferStatus.Date = todaysDate;

		const continuedOfferProducts = offerProducts.map(pr => {
			const continuedProduct = {...pr};
			continuedProduct.OfferID = continuedOfferID;
			return continuedProduct;
		});

		const continuedProductsPricing = productPricing.map(pr => {
			const cpp = {...pr};
			cpp.OfferID = continuedOfferID;
			cpp.SubmittedOn = todaysDate;
			return cpp;
		});

		// 1. create revised offer
		await INSERT.into(PT_TMOFRS).entries(continuedOffer);
		// 2. create revised offer status
		await INSERT.into(PT_TMTNOFST).entries(continuedOfferStatus);
		// 3. create revised products
		await INSERT.into(PT_TMOFPR).entries(continuedOfferProducts);
		// 4. create product pricing
		await INSERT.into(PT_TMBDPR).entries(continuedProductsPricing);
		// 5. update  parentOffer
		parentOffer.ContinuationOfferNo = parentOffer.ContinuationOfferNo + 1;
		await UPDATE(PT_TMOFRS).with (parentOffer).where({OfferID: parentOffer.OfferID});

		return continuedOfferID;
	};

	async function createAffiliateOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, nextOfferID, institute, priceCondtions, freeGoodsOther, req}){
		if(!institute){
			return req.error({ code: 404, message: "Institute name was not provided", target: "InstituteName" });
		}

		const affiliateOfferID = `${nextOfferID.TENDERID}-${nextOfferID.NEXTOFFERID}`;
		const affiliateOffer = {...offer};
		const todaysDate = new Date().toISOString().substring(0,10);
		affiliateOffer.OfferID = affiliateOfferID;
		affiliateOffer.CreationDate = todaysDate;
		affiliateOffer.InternalBidDueDate = todaysDate;
		affiliateOffer.NewOfferDueDate = todaysDate;	
		affiliateOffer.AffiliateOffer = true;	
		affiliateOffer.Custom_String_2 = institute.InstituteName;
		affiliateOffer.QuotationInstituteID = institute.InstituteID;	
		affiliateOffer.TenderOfferNo = nextOfferID.NEXTOFFERID;	


		const affiliateOfferStatus = {...offerStatus};
		affiliateOfferStatus.OfferID = affiliateOfferID;
		affiliateOfferStatus.STATUS = "Offer Created";
		affiliateOfferStatus.Date = todaysDate;

		const affiliateOfferProducts = offerProducts.map(pr => {
			const affiliateProduct = {...pr};
			affiliateProduct.OfferID = affiliateOfferID;
			return affiliateProduct;
		});

		const affiliateProductsPricing = productPricing.map(pr => {
			const app = {...pr};
			app.OfferID = affiliateOfferID;
			app.SubmittedOn = todaysDate;
			return app;
		});

		const affiliateProductsPriceCondtions = priceCondtions.map(pc => {
			const apc = {...pc};
			apc.OfferID = affiliateOfferID;
			apc.ID = uuidv4();
			return apc;
		});

		const affiliateFreeGoodsOther = freeGoodsOther.map(fg => {
			const afg = {...fg};
			const pricecondtion = affiliateProductsPriceCondtions.find(pc => pc.ProductCode = afg.ProductPackId);
			afg.ID = uuidv4();
			afg.PriceCondition_ID = pricecondtion.ID;
			return afg;
		});

		// 1. create affiliate offer
		await INSERT.into(PT_TMOFRS).entries(affiliateOffer);
		// 2. create affiliate offer status
		await INSERT.into(PT_TMTNOFST).entries(affiliateOfferStatus);
		// 3. create affiliate products
		await INSERT.into(PT_TMOFPR).entries(affiliateOfferProducts);
		// 4. create product pricing
		await INSERT.into(PT_TMBDPR).entries(affiliateProductsPricing);
		// 4. create price condtions
		await INSERT.into(PriceCondition).entries(affiliateProductsPriceCondtions);
		
		if (affiliateFreeGoodsOther.length > 0) {
			// 5. create free goods other
			await INSERT.into(FreeGoodsOther).entries(affiliateFreeGoodsOther);
		}
		

		return affiliateOfferID;
	};

	srv.on("softDeleteOffer", async (req) => {
		const { data: {offerID} } = req;

		!offerID && req.error({ code: 404, message: "OfferID was not provided", target: "OfferID" });
		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID: offerID, ActiveOffer: 1});

		if(!offer){
			return req.error({ code: 403, message: `Offer "${offerID}" is not active. Only active offer can be removed.`, target: "PT_TMOFRS"});
		}
		await UPDATE(PT_TMOFRS).with ({Active: 0}).where({OfferID: offer.OfferID});
		return offerID;
	})

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferProductsDetailView', async (req) => {

		const mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: 'OfferProduct', CountryCode: req?.data?.CountryCode, ProductScope: req?.data?.Line}));
		const regex = /'?(?:path\s*:|type\s*:)\s*'([^']+)'?/;
		  
		for (const item of mandatoryFielddata) {
			let frontendField = item.Field;
			if (frontendField.includes("path")) {
				const match = regex.exec(frontendField);
				frontendField = match ? match[1] : frontendField;
			}
		
			if (
				!(frontendField in req.data) ||
				req.data[frontendField] === null ||
				req.data[frontendField] === ''
			) {
				req.error({ code: 404, message: `${item.Label} is required.`, target: frontendField });
			}
		}	
		// validate form
		// !req.data.RequestedVolume &&  req.error({ code: 404, message: "RequestedVolume is required.", target: "RequestedVolume" });
		// !req.data.UnitPerPack &&  req.error({ code: 404, message: "UoM is required.", target: "UnitPerPack" });
		// !req.data.ActiveProduct &&  req.error({ code: 404, message: "Decline is required.", target: "ActiveProduct" });
		// !req.data.MoleculeName &&  req.error({ code: 404, message: "Molecule Name is required.", target: "MoleculeName" });
		// !req.data.Code1 &&  req.error({ code: 404, message: "AAH product code is required.", target: "Code1" });
		// !req.data.Code2 &&  req.error({ code: 404, message: "License number is required.", target: "Code2" });
		// !req.data.ProductGenericName &&  req.error({ code: 404, message: "Generic Product Description is required.", target: "ProductGenericName" });
		// !req.data.Custom_String_1 &&  req.error({ code: 404, message: "Pharma QC is required.", target: "Custom_String_1" });
		// !req.data.Channel && req.error({ code: 404, message: "Distribution is required.", target: "Channel" });
		// !req.data.Gov_Code && req.error({ code: 404, message: "EAN/GTIN is required.", target: "Gov_Code" });
        // !req.data.Code3 && req.error({ code: 404, message: "PIP code is required.", target: "Code3" });
		// !req.data.Custom_Integer_1 && req.error({ code: 404, message: "Pack size is required.", target: "Custom_Integer_1" });
		// !req.data.VwBudgetedProfitability && req.error({ code: 404, message: "Budgeted profitability is required.", target: "VwBudgetedProfitability" });
		
		req.data.Line = null; //for mandatory field check in sta-service
		delete req.data.MoleculeName;
        delete req.data.Code1;
        delete req.data.Code2;
        delete req.data.Code3;
        delete req.data.ProductGenericName;
        delete req.data.Gov_Code;
		delete req.data.BU;
		delete req.data.PRODUCTPACKNAME,
		delete req.data.RegistrationValidUntil;
		delete req.data.BrandName;
		delete req.data.VwBudgetedProfitability;
	});

	srv.before(
		['CREATE','UPDATE'], 
		[
			'PriceConditionPriceView',
			'PriceConditionDiscountView',
			'PriceConditionPriceWithFOCView',
			'PriceConditionDiscountWithFOCView'
		], 
		async (req) => {

			// validate form
			req.data.OfferPrice && Number(req.data.OfferPrice) > Number(req.data.BasePrice) && req.error({ code: 404, message: "OfferPrice should not be greater than BasePrice.", target: "OfferPrice" });
		
		}
	);

	srv.on(['CREATE','UPDATE','DELETE'], ['AwardedProductFormView', 'AwardedProducts'], async (req) => {
		await upsertAwardedProduct(req);
		return req.data;
	});

	const upsertAwardedProduct = async function(req){

		const offerProduct = await SELECT.one.from(PT_TMOFPR).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode,
			LotID: req.data.LotID
		});
		const awardedProduct = await SELECT.one.from(PT_TMTRRES).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode,
			LotID: req.data.LotID
		});

		const mappedAwardedProduct = {
			TenderID: req.data.TenderID,
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode,
			CountryCode: req.data.CountryCode,
			InstituteID: req.data.InstituteID,
			ContractNo: req.data.ContractNo,
			Outcome: req.data.Outcome,
			ErrorInSubmission: req.data.ErrorInSubmission,
			AwardedCompany: req.data.AwardedCompany,
			AwardedProduct: req.data.AwardedProduct,
			AwardedPrice: req.data.AwardedPrice,
			Currency: req.data.Currency,
			AwardedQty: req.data.AwardedQty,
			UoM: req.data.UoM,
			Reason: req.data.Reason,
			Comment: req.data.Comment,
			Active: req.data.Active,
			LotID: req.data.LotID,
			Custom_String_1: req.data.Custom_String_1,
			Custom_String_2: req.data.Custom_String_2,
			Custom_String_3: req.data.Custom_String_3,
			Custom_String_4: req.data.Custom_String_4,
			Custom_String_5: req.data.Custom_String_5,
			Custom_String_6: req.data.Custom_String_6,
			Custom_String_7: req.data.Custom_String_7,
			Custom_String_8: req.data.Custom_String_8,
			Custom_String_9: req.data.Custom_String_9,
			Custom_String_10: req.data.Custom_String_10,
			Custom_Integer_1: req.data.Custom_Integer_1,
			Custom_Integer_2: req.data.Custom_Integer_2,
			Custom_Integer_3: req.data.Custom_Integer_3,
			Custom_Integer_4: req.data.Custom_Integer_4,
			Custom_Integer_5: req.data.Custom_Integer_5,
			Custom_Integer_6: req.data.Custom_Integer_6,
			Custom_Integer_7: req.data.Custom_Integer_7,
			Custom_Integer_8: req.data.Custom_Integer_8,
			Custom_Integer_9: req.data.Custom_Integer_9,
			Custom_Integer_10: req.data.Custom_Integer_10,
			Custom_Double_1: req.data.Custom_Double_1,
			Custom_Double_2: req.data.Custom_Double_2,
			Custom_Double_3: req.data.Custom_Double_3,
			Custom_Double_4: req.data.Custom_Double_4,
			Custom_Double_5: req.data.Custom_Double_5,
			Custom_Double_6: req.data.Custom_Double_6,
			Custom_Double_7: req.data.Custom_Double_7,
			Custom_Double_8: req.data.Custom_Double_8,
			Custom_Double_9: req.data.Custom_Double_9,
			Custom_Double_10: req.data.Custom_Double_10,
			Custom_Date_1: req.data.Custom_Date_1,
			Custom_Date_2: req.data.Custom_Date_2,
			Custom_Date_3: req.data.Custom_Date_3,
			Custom_Date_4: req.data.Custom_Date_4,
			Custom_Date_5: req.data.Custom_Date_5,
			Custom_Date_6: req.data.Custom_Date_6,
			Custom_Date_7: req.data.Custom_Date_7,
			Custom_Date_8: req.data.Custom_Date_8,
			Custom_Date_9: req.data.Custom_Date_9,
			Custom_Date_10: req.data.Custom_Date_10,
		}

		if(awardedProduct){
			await UPDATE(PT_TMTRRES)
				.with (mappedAwardedProduct)
				.where({
					OfferID: awardedProduct.OfferID,
					ProductCode: awardedProduct.ProductCode,
					LotID: awardedProduct.LotID
				})
			await UPDATE(PT_TMOFPR)
				.with ({RequestedVolume: req.data.RequestedVolume})
				.where({
					OfferID: offerProduct.OfferID,
					ProductCode: offerProduct.ProductCode,
					LotID: offerProduct.LotID
			})
		}else{
			await INSERT.into(PT_TMTRRES).entries(mappedAwardedProduct);
		}
		const existingAwardedProducts = await SELECT.from(PT_TMTRRES).where({
			OfferID: req.data.OfferID
		});

		const awardedProductsHaveOutcome = existingAwardedProducts.every(prod => prod.Outcome && prod.Outcome !== '');

		if (awardedProductsHaveOutcome) {
			await upsertOfferStatus(req.data.OfferID, req.data.TenderID, 'Results Recorded');
		}
	}


	srv.on(['CREATE','UPDATE'], 'CompetitorResultsTableView', async (req) => {
		await upsertCompetitorResults(req);
		return req.data;
	});

	const upsertCompetitorResults = async function(req){

		const competitorResults = await SELECT.one.from(TransCompetitorResult).where({
			OFFERID: req.data.OFFERID,
			PRODUCTCODE: req.data.PRODUCTCODE,
			LOTID: req.data.LOTID,
			AWARDEDCOMPANY: req.data.AWARDEDCOMPANY,
			AWARDEDPRODUCT: req.data.AWARDEDPRODUCT,
		});
		const mappedCompetitorResults = {
			OFFERID: req.data.OFFERID,
			PRODUCTCODE: req.data.PRODUCTCODE,
			OUTCOME: req.data.OUTCOME,
			AWARDEDCOMPANY: req.data.AWARDEDCOMPANY || '',
			AWARDEDPRODUCT: req.data.AWARDEDPRODUCT || '',
			AWARDEDPRICE: req.data.AWARDEDPRICE,
			CURRENCY: req.data.CURRENCY,
			AWARDEDQTY: req.data.AWARDEDQTY,
			UOM: req.data.UOM,
			REASON: req.data.REASON,
			COMMENT: req.data.COMMENT,
			LOTID: req.data.LOTID,
			TOTALAWARDEDVALUE: req.data.TOTALAWARDEDVALUE
		}

		if(competitorResults){
			await UPDATE(TransCompetitorResult)
				.with (mappedCompetitorResults)
				.where({
					OFFERID: competitorResults.OFFERID,
					PRODUCTCODE: competitorResults.PRODUCTCODE,
					LOTID: competitorResults.LOTID,
					AWARDEDCOMPANY: competitorResults.AWARDEDCOMPANY,
					AWARDEDPRODUCT: competitorResults.AWARDEDPRODUCT,
				})
		}else{
			await INSERT.into(TransCompetitorResult).entries(mappedCompetitorResults);
		}
	}

	srv.on(['CREATE','UPDATE','DELETE'], 'OfferProductOfferStatus', async (req) => {
		const existingApprovals = await getExistingApprovals(req);
		const offerProducts = await getOfferProducts(req);
		await upsertProductApprovals(req, existingApprovals, offerProducts);
		await upsertOfferApprovalsSent(req);
		await upsertOfferStatus(req.data.OfferId, req.data.TenderID, req.data.send === 'Yes' ? 'Awaiting Approval' : 'Offer Created');
		return req.data;
	});

	const getExistingApprovals = async function(req){
		return await SELECT.from(PT_TMAPPRST).where({
			OfferID: req.data.OfferId,
			Active: 1
		});
	}

	const getOfferProducts = async function(req){
		return await SELECT.from(PT_TMOFPR).where({
			OfferID: req.data.OfferId,
		});
	}

	const upsertProductApprovals = async function(req, existingApprovals, offerProducts){

		let aApprovalsSaveInfo = [];
		const oApprovalData = req.data;
		let sStatusTime = moment().utc().toDate();
		//let sSubmittedBy = UserInfo.getCWID();

		offerProducts.forEach(function (oProduct) {

			//ActiveProduct = 2 (excluded product)
			if (oProduct.ActiveProduct !== 2) {
				aApprovalsSaveInfo.push({
					//get information for saving
					TenderID: oApprovalData.TenderID,
					OfferId: oApprovalData.OfferId,
					CountryCode: oApprovalData.CountryCode,
					productcode: oProduct.ProductCode,
					ApprovalContent: oApprovalData.ApprovalContent,
					ApproverTypeSection: oApprovalData.ApproverTypeSection,
					ApprovalStatus: oApprovalData.ApprovalStatus,
					ApproverName: oApprovalData.ApproverName,
					ApproverEmailID: oApprovalData.ApproverEmailID,
					SenderComment: oApprovalData.SenderComment,
					ApproverComment: "", //approvercomment is only set from backend process
					Active: oApprovalData.Active,
					Hierarchy: oApprovalData.Hierarchy ? oApprovalData.Hierarchy : 1,
					AP_ID: oApprovalData.AP_ID,
					RestoreKey: oApprovalData.RestoreKey,
					Statustime: sStatusTime,
					Submittedby: req.user.id, //sSubmittedBy,
					ApproverDate: oApprovalData.ApproverDate,
					ApproverType: oApprovalData.ApproverType,
					FLOW_ID: oApprovalData.FLOW_ID,
					REQUIRED_ACTION: oApprovalData.REQUIRED_ACTION,
					LotID: oProduct.LotID
				});

			}
		});

		if(existingApprovals?.length > 0 && existingApprovals.findIndex(approval => approval.ApproverType === oApprovalData.ApproverType)){
			//remove old entries before inserting
			await DELETE.from(PT_TMAPPRST)
				.where({
					OfferID: req.data.OfferId
				})
		}
		
		await INSERT.into(PT_TMAPPRST).entries(aApprovalsSaveInfo);

		return req.data;
	};

	const upsertOfferStatus = async function(offerId, tenderId, sStatus){
		await UPDATE(PT_TMTNOFST)
			.with({STATUS: sStatus})
			.where({
				OfferID: offerId,
				TenderID: tenderId,
				Active: 1
			})
	}

	const upsertOfferApprovalsSent = async function(req){
		const offer = await SELECT.one.from(PT_TMOFRS).where({
			OfferID: req.data.OfferId
		});

		await UPDATE(PT_TMOFRS)
			.with({APPROVALS_SENT: offer.APPROVALS_SENT + 1})
			.where({
				OfferID: req.data.OfferId
			})
	}

	srv.on(
		['CREATE','UPDATE'], 
		[
			'PriceConditionPriceView',
			'PriceConditionDiscountView',
			'PriceConditionPriceWithFOCView',
			'PriceConditionDiscountWithFOCView',
			'PriceConditionTaiwanPriceView'
		], 
		async (req) => {
			await upsertPriceCondition(req);
			await upsertProductPricing(req);
			return req.data;
		}
	);

	/**
	 * Upserts a price condition based on the provided request data.
	 * If `req.data.PriceConditionID` exists, updates the existing price condition.
	 * Otherwise, inserts a new price condition.
	 *
	 * @param {Object} req - The request object containing the data for the price condition.
	 * @returns {Promise<void>} A promise that resolves when the upsert operation is complete.
	 */
	const upsertPriceCondition = async function(req){

		const priceCondition = await SELECT.one.from(PriceCondition).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode
		});

		const mappedPriceCondition = mapPriceCondition(req);

		if(priceCondition){
			await UPDATE(PriceCondition)
				.with (mappedPriceCondition)
				.where({
					ID: priceCondition.ID
				})
		}else{
			await INSERT.into(PriceCondition).entries(mappedPriceCondition);
		}
	}

	const mapPriceCondition = function(req){
		const mappings = {
			"Discount" : {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				NetOfferPrice: req.data.NetOfferPrice,
				Price2: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level2Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"Price" : {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				NetOfferPrice: req.data.NetOfferPrice,
				Price2: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level2Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"PriceWithFOC" : {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Price2: req.data.Discount,
				NetOfferPrice: req.data.NetOfferPrice,
				Price3: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"DiscountWithFOC" : {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				Price2: req.data.NetOfferPrice,
				Price3: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"TaiwanPrice": {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level2Discount1:req.data.Deductions,
				Level2Discount2:req.data.Level2Discount2,
				AnnualDiscountForBranch:req.data.AnnualDiscountForBranch,
				NegotiationPrice:req.data.NegotiationPrice,
				TotalYearlyValueMainCustomer:req.data.TotalYearlyValueMainCustomer,
				AnticipatedYearlyVolumeMainCustomer:req.data.AnticipatedYearlyVolumeMainCustomer,
				AnticipatedYearlyVolumeBranch:req.data.AnticipatedYearlyVolumeBranch,
				TotalYearlyValueBranch:req.data.TotalYearlyValueBranch,
				TotalDiscountNHI:req.data.TotalDiscountNHI,
				TotalDiscountInvoice:req.data.TotalDiscountInvoice,
				Price2: req.data.NetPrice,
				Price3: req.data.Price3,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Level3Discount1,
				PriceConditionClassification_ID: req.data.ClassificationID
			}
		}

		return mappings[req.data.ConditionType];
	}

	/**
	 * Upserts product pricing based on the provided request data.
	 * If the product pricing exists, updates the existing record.
	 * Otherwise, inserts a new product pricing entry.
	 *
	 * @param {Object} req - The request object containing the data for the product pricing.
	 * @returns {Promise<void>} A promise that resolves when the upsert operation is complete.
	 */
	const upsertProductPricing = async function(req){

		const whereCondition = {
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode,
			Active: 1,
			ActiveTier: 0,
			LotID: 1
		};

		const productPricing = await SELECT.one.from(PT_TMBDPR).where(whereCondition);

		const whereConditionCogs = {
			COUNTRY_CODE: req.data.CountryCode,
			PRODUCT_ID: req.data.ProductCode,
			COGS_TYPE: 'Budget'
		}

		const cogs = await SELECT.one.from(CountryCogs).where(whereConditionCogs);

		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID:  req.data.OfferID});

		const whereConditionSpotRate = {
			CURRENCY_FROM: offer?.Currency,
			CURRENCY_TO: 'EUR',
			X_TYPE: 'Monthly Average'
		}

		const spotRate = await SELECT.one.from(ExchangeRates).where(whereConditionSpotRate);

		const whereConditionBudgetRate = {
			CURRENCY_FROM: offer?.Currency,
			CURRENCY_TO: 'EUR',
			X_TYPE: 'Budget'
		}

		const budgetRate = await SELECT.one.from(ExchangeRates).where(whereConditionBudgetRate);

		const mappedPTTMBDPR = mapToPTTMBDPR({priceCondition:req.data, offer, user: req.user, cogs, spotRate, budgetRate});

		if(productPricing){
			await UPDATE(PT_TMBDPR).with (mappedPTTMBDPR).where(whereCondition)
		}else{
			await INSERT.into(PT_TMBDPR).entries(mappedPTTMBDPR);
		}
	}

	function mapToPTTMBDPR({priceCondition, offer, user, cogs, spotRate, budgetRate}){
		return {
			TenderID              : priceCondition.TenderID, 
			OfferID               : priceCondition.OfferID, 
			CountryCode           : priceCondition.CountryCode, 
			ProductCode           : priceCondition.ProductCode, 
			SubmittedOn           : new Date().toISOString(), 
			SubmittedBy           : user.id, 
			Active                : 1, 
			Tier                  : 1, 
			VolumeFrom            : 0, 
			VolumeTo              : 0, 
			RegPrice              : priceCondition.BasePrice, 
			FOC                   : 0, 
			// FOCStep               : null, 
			// FOCType               : null, 
			Discount              : 0, 
			OfferPrice            : priceCondition.OfferPrice, 
			Deductions            : 0, 
			StandardDiscount      : 0, 
			AdditionalDiscount    : 0, 
			NetofferPrice         : priceCondition.CountryCode === 'TW' ? priceCondition.NetPrice : priceCondition.NetOfferPrice, 
			BusinessCasePrice     : 0, 
			// WholesalePrice        : null, 
			COGS                  : cogs?.COGS || 0,
			SpotRate              : spotRate?.X_RATE || 0,
			BudgetRate            : budgetRate?.X_RATE || 0,
			Scenario              : 0, 
			// FOC_ABS_PCT           : null, 
			FOC_Bundled_1         : 0, 
			// FOC_ABS_PCT_Bundled_1 : 0, 
			FOCProduct_Bundled_1  : 0, 
			ActiveTier            : 0, 
			NetPrice              : priceCondition.CountryCode === 'TW' ? priceCondition.Price3 : priceCondition.NetPrice, 
			NetPrice_OfPaid       : 0, 
			PRICE_UPDATE          : offer?.APPROVALS_SENT, 
			LotID                 : 1, 
			// Deductions_ABS_PCT    : null
		}
	}

	srv.after(
		'READ', 
		['PriceConditionPriceView','PriceConditionDiscountView'], 
		(items, req) => {
			if(!items) return [];
			const fnCalculateFields = async item => {
				item.Discount = (item.BasePrice - item.OfferPrice) / item.BasePrice;
				item.NetPrice = item.OfferPrice * (1 - item.Deductions); 
			};
			if(Array.isArray(items)){
				return items.map(fnCalculateFields)
			}else{
				return fnCalculateFields(items);
			}
		}
	);

	srv.after('READ', 'PriceConditionPriceWithFOCView', (items, req) => {
			if(!items) return [];

			if(Array.isArray(items)){
				return items.map(fnCalculateFields)
			}else{
				return fnCalculateFields(items);
			}

			async function fnCalculateFields(item){
				item.NetOfferPrice = await calculateNetOfferPrice(item);
				item.Discount = (item.BasePrice - item.OfferPrice) / item.BasePrice;
				item.NetPrice = item.NetOfferPrice * (1 - item.Deductions); 
			};
			
		}
	);

	srv.after('READ', 'PriceConditionDiscountWithFOCView', (items, req) => {
		if(!items) return [];

		if(Array.isArray(items)){
			return items.map(fnCalculateFields)
		}else{
			return fnCalculateFields(items);
		}

		async function fnCalculateFields(item){
			item.NetOfferPrice = await calculateNetOfferPrice(item);
			item.NetPrice = item.NetOfferPrice * (1 - item.Deductions); 
		};
		
	}
);

srv.after('READ', 'PriceConditionTaiwanPriceView', (items, req) => {
	if(!items) return [];

	if(Array.isArray(items)){
		return items.map(fnCalculateFields)
	}else{
		return fnCalculateFields(items);
	}

	async function fnCalculateFields(item){
		item.Last12MonthsVolumeMainCustomer = await calculateLast12MonthsVolumeMainCustomer(item);
		item.Last12MonthsVolumeBranch = await calculateLast12MonthsVolumeBranch(item);
		item.NetPrice = await calculateNetOfferTaiwanPrice(item);
		item.Level3Discount1 = item.AnnualDiscountForBranch / item.AnticipatedYearlyVolumeBranch;
		item.Price3 = item.NetPrice - item.Level3Discount1;
		item.TotalYearlyValueMainCustomer = item.Price3 * item.AnticipatedYearlyVolumeMainCustomer;
		item.TotalYearlyValueBranch = item.Price3 * item.AnticipatedYearlyVolumeBranch;
		item.TotalDiscountNHI = (item.BasePrice - item.Price3) / item.BasePrice;
		item.TotalDiscountInvoice = (item.OfferPrice - item.Price3) / item.OfferPrice;
	};
	
}
);

	async function calculateLast12MonthsVolumeMainCustomer (item) {
		const tender = await SELECT.one.from(PT_TMTEND).where({TenderID: item.TenderID});
		const institute = await SELECT.one.from(PT_TMINST).where({InstituteID: tender?.InstituteID});
		const skuPrdPck = await SELECT.one.from(PT_TMSKUPRDPCK).where({CountryCode: item.CountryCode, ProductPackID: item.ProductCode});
		const salesData = await SELECT.from(SalesData).where({SCUSNO: institute?.External_InstituteId, SITNO: skuPrdPck.SKUCode});

		return salesData.reduce((a, b) => a + Number(b.SQTY), 0);
	}

	async function calculateLast12MonthsVolumeBranch (item) {
		const tender = await SELECT.one.from(PT_TMTEND).where({TenderID: item.TenderID});
		const childInstitute = await SELECT.one.from(PT_TMINSHIER).where({InstituteID: tender?.InstituteID});

		if (childInstitute) {
			const InstitutesInBranchHierarcy = await SELECT.from(PT_TMINSHIER).where({ParentInstituteID: childInstitute?.ParentInstituteID});
			const InstitutesInBranchIds = InstitutesInBranchHierarcy?.filter(el => el.InstituteID != tender.InstituteID).map(el => el.InstituteID) || [];

			const InstitutesInBranch = await SELECT.from(PT_TMINST).where({InstituteID: {in : InstitutesInBranchIds}});
			const External_InstituteIds = InstitutesInBranch?.map(el => el.External_InstituteIds);


			const skuPrdPck = await SELECT.one.from(PT_TMSKUPRDPCK).where({CountryCode: item.CountryCode, ProductPackID: item.ProductCode});
			const salesData = await SELECT.from(SalesData).where({SCUSNO: {in: External_InstituteIds}, SITNO: skuPrdPck.SKUCode});
			return salesData.reduce((a, b) => a + Number(b.SQTY), 0);
		}

		return 0;
	}

	async function calculateNetOfferPrice(item){
		const offerProduct = item.ProductCode;
		let foc = [];
		
		if(item.PriceConditionID){
			foc = await SELECT.from(FreeGoodsOther).where({
				PriceCondition_ID: item.PriceConditionID
			});
		}

		const containsOfferProduct = hasObjectWithProductCode(foc, offerProduct); 
		const containsOfferProductAndIsAdded = hasObjectWithProductCodeAndIsAdded(foc, offerProduct); 
		const containsOfferProductAndIsIncluded = hasObjectWithProductCodeAndIsIncluded(foc, offerProduct); 

		/**
		 * Calculate NetOfferPrice based on rules
		 * Case1: No FOC in the pop up
		 * Case2: One or more FOC products which are different from Offer Product
		 * Case3: One or more FOC products in which one is same as Offer Product but Its dropdown is selected as 'Added'
		 * Case4: One or more FOC products in which one is same as Offer Product but Its dropdown is selected as 'Included'
		**/
		//Cases 1,2 and 3
		if(foc.length === 0 || !containsOfferProduct || containsOfferProductAndIsAdded) return item.OfferPrice;
		// Cases 4
		if(containsOfferProductAndIsIncluded) {
			const includedFOC = getIncludedFOCWitSameProductCode(foc, offerProduct);
			switch(includedFOC.FreeGoodsOther_ABS_PCT){
				case "ABS":
					return (item.RequestedVolume - includedFOC.FreeGoodsOther) * item.OfferPrice / item.RequestedVolume;
				case "PCT":
					return item.RequestedVolume * (1 - includedFOC.FreeGoodsOther) * item.OfferPrice / item.RequestedVolume;
				case "STP":
					return (item.RequestedVolume - item.RequestedVolume / includedFOC.FreeGoodsOther_Step * includedFOC.FreeGoodsOther) * item.OfferPrice / item.RequestedVolume;
			}
		}

		function hasObjectWithProductCode(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct);
		}

		function hasObjectWithProductCodeAndIsAdded(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Added');
		}

		function hasObjectWithProductCodeAndIsIncluded(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Included');
		}

		function getIncludedFOCWitSameProductCode(arr, offerProduct) {
			return arr.find(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Included');
		}
	}
	
	async function calculateNetOfferTaiwanPrice(item){
		const offerProduct = item.ProductCode;
		let foc = [];
		let paidVolume = 0;
		let totalVolume = 0;
		let focVolume = 0;
		
		if(item.PriceConditionID){
			foc = await SELECT.from(FreeGoodsOther).where({
				PriceCondition_ID: item.PriceConditionID
			});
		}

		const containsOfferProduct = hasObjectWithProductCode(foc, offerProduct); 
		const containsOfferProductAndIsAdded = hasObjectWithProductCodeAndIsAdded(foc, offerProduct); 
		const containsOfferProductAndIsIncluded = hasObjectWithProductCodeAndIsIncluded(foc, offerProduct); 

		/**
		 * Calculate NetPrice based on rules
		 * Case1: No FOC in the pop up
		 * Case2: One or more FOC products which are different from Offer Product
		 * Case3: One or more FOC products in which one is same as Offer Product but Its dropdown is selected as 'Added'
		 * Case4: One or more FOC products in which one is same as Offer Product but Its dropdown is selected as 'Included'
		**/
		//Cases 1,2 and 3
		if(foc.length === 0 || !containsOfferProduct) return (item.OfferPrice * (1 - item.Deductions - item.Level2Discount2)); 
		// Cases 4
		if(containsOfferProductAndIsIncluded) {
			const includedFOC = getIncludedFOCWitSameProductCode(foc, offerProduct);
			switch(includedFOC.FreeGoodsOther_ABS_PCT){
				case "ABS":
					focVolume = includedFOC.FreeGoodsOther;
				case "PCT":
					focVolume = includedFOC.FreeGoodsOther * item.AnticipatedYearlyVolumeBranch;
				case "STP":
					focVolume = (item.AnticipatedYearlyVolumeBranch / includedFOC.FreeGoodsOther_Step) * includedFOC.FreeGoodsOther;
			}
		}

		if(containsOfferProductAndIsAdded){
			paidVolume = item.AnticipatedYearlyVolumeBranch;
			totalVolume = item.AnticipatedYearlyVolumeBranch + focVolume;
		}

		if(containsOfferProductAndIsIncluded){
			paidVolume = item.AnticipatedYearlyVolumeBranch - focVolume;
			totalVolume = item.AnticipatedYearlyVolumeBranch;
		}

		let revenues = item.OfferPrice * (1 - item.Deductions - item.Level2Discount2) * paidVolume;

		let netOfferPrice = revenues / totalVolume;

		function hasObjectWithProductCode(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct);
		}

		function hasObjectWithProductCodeAndIsAdded(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Added');
		}

		function hasObjectWithProductCodeAndIsIncluded(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Included');
		}

		function getIncludedFOCWitSameProductCode(arr, offerProduct) {
			return arr.find(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Included');
		}

		return netOfferPrice;
	}

	srv.before(['CREATE','UPDATE'], ['OfferValidation'], async (req) => {

		// validate form
		// req.data.OfferPrice && Number(req.data.OfferPrice) > Number(req.data.BasePrice) && req.error({ code: 404, message: "OfferPrice should not be greater than BasePrice.", target: "OfferPrice" });
		
	});

	srv.on(['CREATE','UPDATE'], ['OfferValidation'], async (req) => {
		if(req.data.Submitted === true){
			await upsertOfferStatus(req.data.OFFERID, req.data.TENDERID, 'Quotation Submitted');
			delete req.data.Submitted;
		}
		await upsertQuotation(req);
		return req.data;
		
	});

	const upsertQuotation = async function(req){
		const mappedPTTMQUTO = {
			TenderID          : req.data.TENDERID,
			OfferID           : req.data.OFFERID,
			CountryCode       : req.data.COUNTRYCODE,
			DistributorID     : req.data.DISTRIBUTORID, // TODO: this field needs to be added to OfferValidation entity
			SubmittedOn       : new Date().toISOString(),
			SubmittedBy       : req.user.id,
			Active            : 1, 
			OfferValidity     : req.data.OFFERVALIDITY,
			DelayInSubmission : null,
			AS1               : req.data.SELLING_COMPANY_AS1,
			AS2               : req.data.SELLING_COMPANY_AS2,
			OfferDate         : req.data.OFFERDATE,
			DeliveryTerms     : req.data.DELIVERYTERMS,
			I_Q_1             : null,
			I_Q_2             : null,
			I_Q_3             : null,
			Comment           : req.data.CUSTOM_REMARKS,
			UPDATED           : 1,
			EffectiveDate     : req.data.EffectiveDate,
			ExpiryDate        : req.data.ExpiryDate
		}

		const submittedQoutation = await SELECT.one.from(PT_TMQUTO).where({
			OfferID: req.data.OFFERID,
			Active: 1,
			OfferDate: req.data.OFFERDATE
		});

		// save/update PT_TMQUTO
		if(submittedQoutation){
			await UPDATE(PT_TMQUTO).with (mappedPTTMQUTO).where({
				OfferID: req.data.OFFERID,
				Active: 1,
				OfferDate: req.data.OFFERDATE
			})
		}else{
			await INSERT.into(PT_TMQUTO).entries(mappedPTTMQUTO);
		}
	}

	srv.on('READ', 'OfferValidation', async (req) => {
		const tx = cds.tx(req);
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
			let whereOffer = ServiceHelper.buildWhere(req, "OFFERID");
			results = await buildOfferValidation(tx, whereOffer);
		}
		return results;
	});

	srv.on('READ', 'OfferProductValidation', async (req) => {
		const tx = cds.tx(req);
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
			let whereOffer = ServiceHelper.buildWhere(req, "OFFER_ID");
			results = await buildOfferProductValidation(tx, whereOffer);
		}
		return results;
	});

	srv.on('READ', 'OfferProductOfferStatus', async (req) => {
		// const tx = cds.transaction(req)
		const tx = cds.tx(req);
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
			let whereOffer = ServiceHelper.buildWhere(req, "OfferId");
			results = await buildOfferApproval(tx, whereOffer);
		}
		return results;
	});


	srv.after('READ', 'CountryLegalEntitySignatories', data => {
		data.unshift({AUTHORIZED_SIGNATORY: null, NAME: null})
	});

	srv.after('READ', 'MasterCompetitors', data => {
		data.unshift({
			CompetitorProduct: "Other",
			CompetitorCompany: "Other"
		})
	});

	srv.after('READ', 'MasterCountryOutComes', data => {
		data.unshift({
			Outcome: ""
		})
	});

	srv.after('READ', 'MasterOutComeReasons', data => {
		data.unshift({
			TenderOutcomeReasons: ""
		})
	});


	async function buildOfferApproval(tx, whereOffer) {
		let results = [];
		let approverTypes = [];
		let latestApproval = await tx.run(SELECT.from(ApprovalRequests).where(whereOffer));

		whereOffer[0].ref[0] = 'OFFERID'
		let offerValidation = await buildOfferValidation(tx, whereOffer);

		let whereCountry = whereOffer;
		whereCountry[0].ref[0] = 'CountryCode';
		whereCountry[2].val = offerValidation.COUNTRYCODE;

		let countryApprovers = await tx.run(SELECT.from(CountryApprovers).where(whereCountry));
		let offerProducts = await tx.run(SELECT.from(PT_TMOFPR).where({OfferID: offerValidation.OFFERID}));
		let offerProductPackIDs = offerProducts.map(pr => pr.ProductCode);
		let countryProductPacks = await tx.run(SELECT.from(PT_TMCTPRDPCK).where({CountryCode: offerValidation.COUNTRYCODE, PRODUCTPACKID: offerProductPackIDs}));
		let countryProductPackBUs = countryProductPacks.map(cp => cp.BU);

		if (!offerValidation.COUNTRYCODE) return results;

		//get ApproverTypes
		if (offerValidation) {
			approverTypes = offerValidation.ApproverTypes;
		}

		return await buildValidationEntryNew(approverTypes, latestApproval, offerValidation, countryApprovers, countryProductPackBUs);

	}

	async function buildOfferValidation(tx, whereOffer) {
		let results = {};

		//get offer info
		let offer = await tx.run(SELECT.from(OfferConsolidation).where(whereOffer));
		if (offer.length !== 1) {
			return results;
		}
		offer = offer[0];


		//get tender info
		const whereTender = ServiceHelper.buildFullWhere("TenderID", "=", offer.TENDERID);
		let tender = await tx.run(SELECT.from(PT_TMTEND).where(whereTender));
		tender = tender[0];
		const tenderType = await tx.run(SELECT.from(MASTER_TENDER_TYPE).where({ID: tender.TENDER_TYPE_ID}));
		let offerProductValidation = await buildOfferProductValidation(tx, whereOffer);
		let aApproverTypes = [];
        //EHQUT-INC0170495/INC15491446-Customer specific comment not included in the offer
        const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", offer.INSTITUTE_ID);
        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", offer.COUNTRYCODE);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));
         //EHQUT-INC0170495/INC15491446-Customer specific comment not included in the offer

		 //EHQUT-197468-MEA – Nucleus heads notifications flow
		let Countryregion= await tx.run(SELECT.one.from(PT_TMCTRY).where(whereCountry));
		let regionname=Countryregion.Region;
		
		const whereQuotationInstituteId = {
			InstituteID: offer.QUOTATIONINSTITUTEID,
			CountryCode: offer.COUNTRYCODE
		}
        let quotationInstitute = await tx.run(SELECT.one.from(PT_TMINST).where(whereQuotationInstituteId));

		//if we have products for the offer the offerProductValidation
		if (offerProductValidation.length === 0) {
			//no products
			return results;
		} else {

			const allApproverTypes = [...new Set(offerProductValidation.flatMap(obj => obj.ApproverTypes.map(approverType => approverType.ApproverType)))];
			const aDistinctApproverTypes = allApproverTypes.map(approverType => {
				return offerProductValidation.flatMap(obj => obj.ApproverTypes).find(obj => obj.ApproverType === approverType);
			});

			//based upon the offerProductValidations aggregate the validation types of the different approverTypes for the country
			aApproverTypes = getAggregatedValidationTypes(aDistinctApproverTypes, offerProductValidation, tender, regionname);

		}

		//convert IN_POLICY to true or false
		let inPolicy = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IN_POLICY ? 1 : 0 })) === 1 ? true : false;
		let isLowest = Math.max.apply(Math, offerProductValidation.map((d) => { return d.IS_LOWEST }));
		let isDefaultTerms = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IS_DEFAULT_TERMS }));
		let isNewApproval = Math.max.apply(Math, offerProductValidation.map((d) => { return d.NEW_APPROVAL }));
		let isRegistered = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IS_REGISTERED }));


		let totalAmount = offerProductValidation.reduce((a, b) => a + b.GROSS_SALES_OFFER_CURRENCY, 0);
		let totalAmountInWords = `${NumberHelper.formatNumberToText(tender.CountryCode,totalAmount)} ${offer.CURRENCY} only`;

		let budgetRate = Math.min.apply(Math, offerProductValidation.map((d) => { return d.BUDGET_RATE }));
		let spotRate = Math.min.apply(Math, offerProductValidation.map((d) => { return d.SPOT_RATE }));

		let totalAmountVat = offerProductValidation.reduce((a, b) => a + b.GROSS_SALES_OFFER_CURRENCY_VAT, 0);
		let totalAmountVatInWords = `${NumberHelper.formatNumberToText(tender.CountryCode,totalAmountVat)} ${offer.CURRENCY} only`;
		let vatTotal = offerProductValidation.reduce((a, b) => a + b.VAT_TOTAL, 0);

		//Division can be Pharma or Radiology, this determines division for country approvers
		//If products from both divisions are in offer, then both Pharma and Radiology approvers are required
		let divisions = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { return d.DIVISION }));
		let division = (divisions.length === 1) ? divisions[0] : "Both";

		//In case we have any FOC (on main products) in the offer, a comment should be in remarks
		let maxFOC = Math.max.apply(Math, offerProductValidation.map((d) => { return d.FOC }));
		let focRemark = "";
		if (maxFOC !== 0) {
			if (offer.FOC_TYPE === "FOC 1") {
				focRemark = "Free-of-Charge goods will be included in the ordered quantity, as specified in the quantity column above."
			}
			else {
				focRemark = "Free-of-Charge goods will be provided as an additional quantity to the ordered goods, as specified in the quantity column above.";
			}
		}

		//In case we have samples, comment should be in remarks specifying item numbers for which samples are provided
		
		// if (samplesNotZero.length === offerProductValidation.length) {
		// 	samplesRemark = "Samples will be delivered for all products as per the tender terms and conditions.";
		// }
		// else if (samplesNotZero.length !== 0) {
		// 	let samplesItems = samplesNotZero.map((d) => { return d.SORTER }).join(",");
		// 	samplesRemark = "Samples will be delivered for the quoted products with S.N. {";
		// 	samplesRemark = samplesRemark.concat(samplesItems).concat("} as per the tender terms and conditions.")
		// }
        //EHQUT-INC0170966/INC15506491-Number of Samples not reflected in the Quotation
        let samplesNotZero = offerProductValidation.filter((d) => d.SAMPLES !== 0);
        let samplesRemark = "";
        let samplesItemsToUnique = samplesNotZero.map((d) => { return d.SAMPLES });
        let uniqueSample = Array.from(new Set(samplesItemsToUnique));

        if (samplesNotZero.length === offerProductValidation.length && uniqueSample.length == 1) {

            samplesRemark = uniqueSample[0].toString().concat(" samples will be delivered for all products as per the tender terms and conditions.");
        }
        else if (uniqueSample.length >= 1) {

            for (i = 0; i < uniqueSample.length; i++) {

                let samplesItems = Array.from(samplesNotZero.filter((sample) => sample.SAMPLES === uniqueSample[i]).map((sample) => { return sample.SORTER })).join(", ");
               //EHQUT--INC0170966/INC15506491-Number of Samples not reflected in the Quotation(correction)
                if (samplesItems.length !== 1) {

                    let lastValue= samplesItems.split(",").pop();
                    let lastComma=samplesItems.lastIndexOf(",");
                    samplesItems = samplesItems.substring(0, lastComma).concat(" and ").concat(lastValue);
                     // samplesItems = samplesItems.substring(0, samplesItems.length - 3).concat(" and ").concat(samplesItems[samplesItems.length - 1]);
                }
                //EHQUT--INC0170966/INC15506491-Number of Samples not reflected in the Quotation(correction)
                samplesRemark = samplesRemark.concat(uniqueSample[i].toString().concat(" samples will be delivered for Items ").concat(samplesItems));
                if (i !== uniqueSample.length - 1) {
                    samplesRemark = samplesRemark.concat("; ");
                }
            }

            samplesRemark = samplesRemark.concat(" as per the tender terms and conditions.");

        }
//EHQUT-INC0170966/INC15506491-Number of Samples not reflected in the Quotation

		//Shipment Terms need to be specified by item number if not same for all
		let shipmentTerms = "";
		let shipmentTermsDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => {   
			if(d && d.SHIPMENT_TERMS){
				return d.SHIPMENT_TERMS;
			}else{
				return 'NA';
			}	
		}));
		if (shipmentTermsDistinct.length === 1) {
			shipmentTerms = shipmentTermsDistinct[0];
		}
		else {
			let shipmentTermsRow = [];
			for (let i = 0; i < shipmentTermsDistinct.length; i++) {
				let shipmentTermsItems = offerProductValidation.filter((d) => d.SHIPMENT_TERMS === shipmentTermsDistinct[i]).map((d) => { return d.SORTER }).join(",");
				shipmentTermsRow[i] = shipmentTermsItems.concat(": ").concat(shipmentTermsDistinct[i]);
			}
			shipmentTerms = shipmentTermsRow.join("<br>")
		}

		//Payment Terms need to be specified by item number if not same for all
		let paymentTerms = offer.PaymentTerms;

		/**
		 * In this commented fields we use offerProduct PaymentTerms field.
		 * It is not needed to use offerProduct PaymentTerms field because offer has it's own PaymentTerm field --> Custom_String_1
		 */
		
		// let paymentTermsDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { 
		// 	if(d && d.PAYMENT_TERMS){
		// 		return d.PAYMENT_TERMS;
		// 	}else{
		// 		return 'NA';
		// 	}		
		// }));
		// if (paymentTermsDistinct.length === 1) {
		// 	paymentTerms = paymentTermsDistinct[0];
		// }
		// else {
		// 	let paymentTermsRow = [];
		// 	for (let i = 0; i < paymentTermsDistinct.length; i++) {
		// 		let paymentTermsItems = offerProductValidation.filter((d) => d.PAYMENT_TERMS === paymentTermsDistinct[i]).map((d) => { return d.SORTER }).join(",");
		// 		paymentTermsRow[i] = paymentTermsItems.concat(": ").concat(paymentTermsDistinct[i]);
		// 	}
		// 	paymentTerms = paymentTermsRow.join("<br>")
		// }

	
		let deliveryTerms = "";
		let deliveryTermsDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { 
			if(d && d.DELIVERY_TERMS){
				return d.DELIVERY_TERMS;
			}else{
				return 'NA';
			}	
		}));
		if (deliveryTermsDistinct.length === 1) {
			deliveryTerms = deliveryTermsDistinct[0];
		}
		else {
			let deliveryTermsRow = [];
			for (let i = 0; i < deliveryTermsDistinct.length; i++) {
				let deliveryTermsItems = offerProductValidation.filter((d) => d.DELIVERY_TERMS === deliveryTermsDistinct[i]).map((d) => { return d.SORTER }).join(",");
				deliveryTermsRow[i] = deliveryTermsItems.concat(": ").concat(deliveryTermsDistinct[i]);
			}
			deliveryTerms = deliveryTermsRow.join("<br>")
		}

		
//EHQUT modified the producRemark to fix MOQ Comment-populating of same comment multiple times in remarks
	//Product comment shows in remarks, if any
		// let producRemark = offerProductValidation.filter((d) => d.PRODUCT_COMMENT !== "").map((d) => { return d.PRODUCT_COMMENT }).join("<br>");
	let producRemark = "";
		let productRemarkDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => {   
			if(d && d.PRODUCT_COMMENT){
				return d.PRODUCT_COMMENT;
			}
            else{
           		return ' ';// EHQUT-introduce the space
			}	
            }));        
        //EUTVP: fix wrong condition                            
       // if (typeof (productRemarkDistinct[0])!=="undefined")
       // {
	//EFRCL- 331661- SCTASK14558875 MEA Remarks issue in quotation tab
	if (productRemarkDistinct.length === 1) {
		producRemark  = productRemarkDistinct[0];
	}
	else{
		if(regionname === 'MEA'){
			let emptyindex = productRemarkDistinct.findIndex(x => x === ' ');
		if(emptyindex !== -1){
				productRemarkDistinct.splice(emptyindex,1);
			}
		}

		let productTermsRow = [];
		for (let i = 0; i < productRemarkDistinct.length; i++) {
			let productTermsItems = offerProductValidation.filter((d) => d.PRODUCT_COMMENT === productRemarkDistinct[i]).map((d) => { return d.SORTER }).join(",");
			productTermsRow[i] = productTermsItems.concat(" ").concat(productRemarkDistinct[i]);//removed the colon
		}
		producRemark = productTermsRow.join("<br>")
	}
    //}
//EHQUT modified the producRemark to fix MOQ Comment-populating of same comment multiple times in remarks
		//Comment shows in remarks if any product is not registered in country
		let registeredRemark = "";
		if (isRegistered === 0) {
			registeredRemark = "Product(s) not registered in the country. Import Permit is to be arranged by ";
			registeredRemark = registeredRemark.concat(offer.DISTRIBUTORNAME)
		}
        //EHQUT-INC0170495/INC15491446-Customer specific comment not included in the offer
        let InstituteRemark = institute.Comment ? institute.Comment : ""; //solution for TCS (otherwise line concat will not work if its null)
        //EHQUT-INC0170495/INC15491446-Customer specific comment not included in the offer

		//Comment if any product is alternative to quoted
		let isAlternativeToQuoted = Math.max.apply(Math, offerProductValidation.map((d) => { return d.IS_ALTERNATIVE_QUOTED }));
		let alternativeQuotedRemark = (isAlternativeToQuoted !== 0)
			? "** marked products are alternative to quoted products"
			: "";

		//Comment if any product is alternative to requested
		let isAlternativeToRequested = Math.max.apply(Math, offerProductValidation.map((d) => { return d.IS_ALTERNATIVE_REQUESTED }));
		let alternativeRequestedRemark = (isAlternativeToRequested !== 0)
			? "* marked products are alternative to requested products"
			: "";
			//EHQUT-INC17933752-FAST SEWA - Workflow issue
		//In case of distributor sales, we have a specific note to distributor
		let remarks = (offer.TENDER_CHANNEL === "Distributor" && offer.REGION_NAME !== "SEWA")
			? "With reference to the above tender, you must not on-sell the above mentioned products at a price higher than those listed above. However, you are always free to price lower, at your discretion.<br>"
			: "";
		//Building full remarks text
		remarks = remarks.concat((offer.SELLING_COMPANY_REMARKS !== "") ? offer.SELLING_COMPANY_REMARKS.replace(/\\+/g, "<br>").concat("<br>") : "");
		remarks = remarks.concat((offer.SELLING_COMPANY_FOOTER !== "") ? offer.SELLING_COMPANY_FOOTER.replace(/\\+/g, "<br>").concat("<br>") : "");
		remarks = remarks.concat((offer.COUNTRY_COMMENT !== "") ? offer.COUNTRY_COMMENT.concat("<br>") : "");
		remarks = remarks.concat((registeredRemark !== "") ? registeredRemark.concat("<br>") : "");
		remarks = remarks.concat((samplesRemark !== "") ? samplesRemark.concat("<br>") : "");
		remarks = remarks.concat((focRemark !== "") ? focRemark.concat("<br>") : "");
		remarks = remarks.concat((alternativeQuotedRemark !== "") ? alternativeQuotedRemark.concat("<br>") : "");
		remarks = remarks.concat((alternativeRequestedRemark !== "") ? alternativeRequestedRemark.concat("<br>") : "");
        remarks=remarks.concat((InstituteRemark !== "") ? InstituteRemark.concat("<br>") : "");
		remarks = remarks.concat((producRemark !== "") ? producRemark.concat("<br>") : "");

		// get SUBMITTED_BY user info 
		const whereCWID = ServiceHelper.buildFullWhere("CWID", "=", offer.TENDER_SUBMITTED_BY);
		
		const userInfo = await tx.run(SELECT.from(PT_TMUSER).where(whereCWID));
		//EHQUT- Spain - correct mistakes on Commercial agreement templates
		results = {
			OFFERSTATUSPATH: offer.OFFERSTATUSPATH,
			TENDERID: offer.TENDERID,
			CLASSIFICATION: offer.CLASSIFICATION,//Added Classification (db#1)
			TENDER_REFERENCE: offer.TENDER_REFERENCE,
			PROCUREMENT_REASON: tender.PROCUREMENT_METHOD_ID,
			OFFERID: offer.OFFERID,
			INSTITUTENAME: offer.INSTITUTENAME,
			EXTERNAL_INSTITUTEID: offer.EXTERNAL_INSTITUTEID,
			INSTITUTECITY: offer.INSTITUTECITY,
			QUOTATIONINSTITUTENAME : quotationInstitute?.InstituteName,
            QUOTATIONINSTITUTECITY : quotationInstitute?.City,
            QUOTATIONINSTITUTECUSTOMERID : quotationInstitute?.CustomerID,
			INSTITUTE_TYPE: offer.INSTITUTE_TYPE,
			INSTITUTE_STATE: offer.INSTITUTE_STATE,
			INSTITUTE_ADDRESS:offer.INSTITUTE_ADDRESS,
			TENDERCONTACT:offer.TENDERCONTACT,
            INSTITUTE_REGION: offer.REGION_NAME,
            INSTITUTE_PROVINCE: offer.REGION_PROVINCE,
            INSTITUTE_CIFCODE: offer.CIF_CODE,
            INSTITUTE_REGIONALHEALTHSYSTEM: offer.REGIONAL_HEALTH_SYSTEM,
            INSTITUTE_CUSTOMER_GROUP: offer.CUSTOMER_GROUP,
			VATCODE: offer.VATCODE,
			TAXCODE: offer.TAXCODE,
			CUSTOMER_CODE: offer.CUSTOMER_CODE,
			DIVISION: division,//not correct, should be consolidated from product information
			OFFERDATE: offer.OFFERDATE,
			OFFERVALIDITY: offer.OFFERVALIDITY,
			EffectiveDate: offer.EffectiveDate,
			ExpiryDate: offer.ExpiryDate,
			COUNTRYCODE: offer.COUNTRYCODE,
			SELLINGCOMPANY: offer.SELLINGCOMPANY,
			SELLINGCOMPANYBANK: offer && offer.SELLINGCOMPANYBANK ? offer.SELLINGCOMPANYBANK.replace(/\\+/g, "<br>") : '',
			SELLING_COMPANY_AS1: offer.SELLING_COMPANY_AS1,
			SELLING_COMPANY_AS1_NAMEI: offer.SELLING_COMPANY_AS1_NAMEI,
			SELLING_COMPANY_AS1_TITLEI: offer.SELLING_COMPANY_AS1_TITLEI,
			SELLING_COMPANY_AS2: offer.SELLING_COMPANY_AS2,
			SELLING_COMPANY_AS2_NAMEI: offer.SELLING_COMPANY_AS2_NAMEI,
			SELLING_COMPANY_AS2_TITLEI: offer.SELLING_COMPANY_AS2_TITLEI,
			E_SIGNATURE1: offer.E_SIGNATURE1,
			E_SIGNATURE2: offer.E_SIGNATURE2,
			CURRENCY: offer.CURRENCY,
			AMOUNT_IN_NUMBERS: totalAmount,
			AMOUNT_IN_WORDS: totalAmountInWords,//Not ok
			LETTERHEAD: offer && offer.LETTERHEAD ? offer.LETTERHEAD.replace(/\\+/g, "<br>") : '',
			//REGULATORY: regulatory,
			//LEGAL: legal,
			//CONTROLLING: controlling,
			//COUNTRY_BUSINESS: countryBusiness,
			//REGIONAL_BUSINESS: regionalBusiness,
			//SUPPLY_CHAIN: supply,
			DISTRIBUTORNAME: offer.DISTRIBUTORNAME,
			DISTRIBUTORADDRESS: offer && offer.DISTRIBUTORADDRESS ? offer.DISTRIBUTORADDRESS.replace(/\\+/g, "<br>") : '',
			DISTRIBUTORPHONE: offer.DISTRIBUTORPHONE,
			DISTRIBUTORFAX: offer.DISTRIBUTORFAX,
			DISTRIBUTORCONTACT: offer.DISTRIBUTORCONTACT,
			DISTRIBUTOREMAIL: offer.DISTRIBUTOREMAIL,
			REMARKS: remarks,
			CUSTOM_REMARKS: offer.CUSTOM_REMARKS,
			DELIVERYTERMS: deliveryTerms,
			PAYMENTTERMS: paymentTerms,
			SHIPMENTTERMS: shipmentTerms,
			IS_LOWEST: isLowest,
			IS_DEFAULT_TERMS: isDefaultTerms,
			NEW_APPROVAL: isNewApproval,
			AMOUNT_IN_NUMBERS_VAT: totalAmountVat,
			AMOUNT_IN_WORDS_VAT: totalAmountVatInWords,
			VAT_TOTAL: vatTotal,
			//NSM_SM_FM: nsmLevel,
			//HBU: hbuLevel,
			//CDH: cdhLevel,
			IN_POLICY: inPolicy,
			//MACS: macsLevel,
			//TA: taLevel,
			//FBP: fbpLevel,
			//LPC: lpcLevel,
			//COM_PGA: comPgaLevel,
			//International_Trade: internationTradeLevel,
			//Transfer_Pricing: transferPricingLevel,
			//SBR: sbrLevel,
			PUBLICATION_DATE: offer.PUBLICATION_DATE,
			BID_DUE_DATE: offer.BID_DUE_DATE,
			TENDER_SUBMITTED_BY: userInfo[0] && userInfo[0].UserName,
			ApproverTypes: aApproverTypes,
			BUDGET_RATE: budgetRate,
			SPOT_RATE: spotRate,
			EXTERNAL_ID: tender.ExternalID,
			SAP_ID: tender.SAPID,
			// TENDER_TYPE: tenderType[0].NAME,
			CREATED_BY_USER_EMAIL : userInfo[0] && userInfo[0].UserEmail,
			CREATED_BY_USER_ROLE :userInfo[0] && userInfo[0].Role,
            CREATED_BY_USER_CONTACTNUMBER :userInfo[0] && userInfo[0].ContactNumber
		};
		return results;
		
	}

	async function buildValidationEntryNew(approverTypes, latestApproval, offerValidation, countryApprovers, countryProductPackBUs) {

		let aResults = [];
		approverTypes.forEach(function (type, index) {

			let approverName = "";
			let approverEmailID = "";
			let senderComment = "";
			let approverComment = "";
			let statusTime = null;
			let submittedBy = null;
			let approverDate = null;
			let flowId = null;
			let approverType = "";
			let division = "";
			let countryName = "";
			let userName = "";
			let userEmail = "";
			let requiredAction = "";
			
			let approvalForType = mapApprovalForType(type.ApproverType, latestApproval, offerValidation.DIVISION);
			let defaultForType = mapDefaultCountryApprovers(countryApprovers, type.ApproverType, offerValidation, countryProductPackBUs);

			if (approvalForType.length !== 0) {
				approverName = approvalForType[0].ApproverName;
				approverEmailID = approvalForType[0].ApproverEmailID;
				statusTime = approvalForType[0].Statustime;
				submittedBy = approvalForType[0].Submittedby;
				approverDate = approvalForType[0].ApproverDate;
				flowId = approvalForType[0].FLOW_ID;
				countryName = approvalForType[0].CountryName;
				userName = approvalForType[0].UserName;
				userEmail = approvalForType[0].UserEmail;
				senderComment = approvalForType[0].SenderComment;
				approverComment = approvalForType[0].ApproverComment;
				//			hierarchy 		= approvalForType[0].Hierarchy;
				requiredAction = type.ValidationType;
				approverType = defaultForType.length !== 0 ? defaultForType[0].ApproverType : "";
				division = defaultForType.length !== 0 ? defaultForType[0].Division : "";
			}
			else if (defaultForType.length !== 0) {
				approverName = defaultForType[0].ApproverName;
				approverEmailID = defaultForType[0].ApproverEmailID;
				approverType = defaultForType[0].ApproverType;
				division = defaultForType[0].Division;
				requiredAction = approverTypes.filter((d) => d.ApproverType === defaultForType[0].ApproverType)[0].ValidationType
				approverType = defaultForType[0].ApproverType;
				division = defaultForType[0].Division;
			}
			else {
				return null;
			}

			let aApproval = approvalForType.filter((a) => a.ApproverType === approverType);
			let aApproverType = approverTypes.filter((d) => d.ApproverType === approverType);
			if (aApproval.length > 0 && aApproval[0].Hierarchy !== null) {
				aApproverType[0].Hierarchy = aApproval[0].Hierarchy;
			}

			aResults.push({
				TenderID: offerValidation.TENDERID,
				OfferId: offerValidation.OFFERID,
				CountryCode: offerValidation.COUNTRYCODE,
				ApprovalContent: getApprovalContent(approverType),
				ApproverTypeSection: (requiredAction === 1) ? 2 : 1,
				REQUIRED_ACTION: approvalForType[0] && approvalForType[0].REQUIRED_ACTION ? approvalForType[0].REQUIRED_ACTION : getRequiredAction(requiredAction),
				ApprovalStatus: (approvalForType.length === 0) ? "Not Sent" : approvalForType[0].ApprovalStatus,
				ApproverName: approverName,
				ApproverEmailID: approverEmailID,
				SenderComment: senderComment,
				ApproverComment: approverComment,
				Active: 1,
				AP_ID: null,
				RestoreKey: null,
				Statustime: statusTime,
				Submittedby: submittedBy,
				ApproverDate: approverDate,
				ApproverType: approverType,
				Division: division,
				FLOW_ID: flowId,
				ApproverList: defaultForType,
				ApproverTypes: aApproverType,
				CountryName: countryName,
				UserName: userName,
				UserEmail: userEmail
			});

		});

		return aResults.sort((a, b) => a.ApproverTypeSection - b.ApproverTypeSection);
	}

	//get aggregated validation types for offerValidation, based upon the productValidations that are underneath the offerValidation
	//EHQUT-197468-MEA – Nucleus heads notifications flow
	function getAggregatedValidationTypes(aApproverTypes, offerProductValidation, tender, regionname) {
		let tenderid = offerProductValidation[0].TENDER_ID;
		let Countrycode=offerProductValidation[0].COUNTRY_CODE;

		let tenderyear = tenderid.split("-")[1].substring(0, 2);
		
		//Calculate max validation type for each type in each product
		aApproverTypes.map(async function (oApproverType) {

			//convert to name of property (space = _ + all CAPITALS --> e.a Supply Chain = SUPPLY_CHAIN)
			let sApproverType = oApproverType.ApproverType;
			//let sApproverTypeAttrName = oApproverType.ApproverType.replace(/\s/g, '_').toUpperCase();

			//get max ValidationType
			offerProductValidation.map((productValidation) => {

				//keep current validation type
				let iValidationType = oApproverType.ValidationType;

				//check if a product is found with a higher calculated validation type for the same approverType as the current
				let matchingApproverType = productValidation.ApproverTypes.find(approverType => approverType.ApproverType === sApproverType);
				if (matchingApproverType && matchingApproverType.ValidationType) {
					if (iValidationType < matchingApproverType.ValidationType) {
						iValidationType = matchingApproverType.ValidationType;
					}
				}
		// 		if (oApproverType.ValidationType < productValidation.ApproverTypes.find(approverType => approverType.ApproverType === sApproverType).ValidationType) {
		// 			iValidationType = productValidation.ApproverTypes.find(approverType => approverType.ApproverType === sApproverType).ValidationType;
		// 		};

				oApproverType.ValidationType = iValidationType;

			});

		});

		//For MEA specific
		//No need for country business approval if regional business approval is required
		let oRegionalBusiness = aApproverTypes.find(approverType => approverType.ApproverType === 'Regional Business');
		let oCountryBusiness = aApproverTypes.find(approverType => approverType.ApproverType === 'Country Business');
		if (oCountryBusiness && oRegionalBusiness) {
			oCountryBusiness.ValidationType = (oRegionalBusiness.ValidationType !== 1) ? 1 : oCountryBusiness.ValidationType;
		}
		// if(tenderid > '22'){
		// 	aApproverTypes.splice(oCountryBusiness,1);
		// }
		
		let CountryBusinessindex = aApproverTypes.findIndex(x => x.ApproverType === 'Country Business' );
		if(tenderyear> '22' && regionname === 'MEA'){
			aApproverTypes.splice(CountryBusinessindex,1);
						
		}
		
		//For Thailand specific
		//EHQUT-197882-Thailand - Additional approver for Nalador
		let index = aApproverTypes.findIndex(x => x.ApproverType === 'Additional Approver' );
		let total=offerProductValidation.length;
		let BrandName=[];

		for(var i=0;i<total;i++){
			BrandName.push(offerProductValidation[i].BRANDNAME);	
			}

			if(!(BrandName.includes('Nalador')) && Countrycode === 'TH'){
				aApproverTypes.splice(index,1);
				
			}

		//EHQUT-197882-Thailand - Additional approver for Nalador
		let oCDH = aApproverTypes.find(approverType => approverType.ApproverType === 'CDH');
		let oNSM = aApproverTypes.find(approverType => approverType.ApproverType === 'NSM/SM/FM');
		let oHBU = aApproverTypes.find(approverType => approverType.ApproverType === 'HBU');
		if (oCDH && oNSM && oHBU) {
			//If CDH approval is mandatory, lower levels do not need to approve
			if (oCDH.ValidationType === 3) {
				oNSM.ValidationType = 1;
				oHBU.ValidationType = 1;
			}
			//If HBU approval is mandatory, lower levels do not need to approve
			else if (oHBU.ValidationType === 3) {
				oNSM.ValidationType = 1;
			}
		}

		//return the unique approvertypes for the offer & there re-calculated validation type
		return aApproverTypes;

	}
    //EHQUT-197468-MEA – Nucleus heads notifications flow
	function getApprovalContent(ApproverType) {
		switch (ApproverType) {
			case "Country Business":
			case "Regional Business":
			case "Manager Business Operations":
			case "Legal":
				return "Profitability";
			case "Regulatory":
			case "Supply Chain":
				return "Quotation";
			default:
				return "Quotation";
		}
	}
	function getRequiredAction(requiredActionCode) {
		switch (requiredActionCode) {
			case 1:
				return "Approval"
			case 2:
				return "Notification"
			default:
				return "Approval"
		}
	}

	function mapDefaultCountryApprovers(countryApprovers, approverType, offerValidation, countryProductPackBUs) {
		if (!offerValidation.DIVISION || offerValidation.DIVISION === "Both") {
			//take all approver types
			return countryApprovers.filter((d) => d.ApproverType === approverType);
		} else {
			//take approver types division which maches the offervalidation Division + division = both
			return countryApprovers.filter((d) => d.ApproverType === approverType && (d.Division === offerValidation.DIVISION || d.Division === "Both") && (d.BU === countryProductPackBUs?.[0] || d.BU === "All"));
		}
	}

	function mapApprovalForType(approverType, latestApproval, division) {
		aApprovalForTypeResult = [];
		oApprovalForType = latestApproval.filter((d => d.ApproverType === approverType));
		if (oApprovalForType.length > 1 && approverType != 'Supply Chain' && approverType != 'Regulatory' && approverType != 'Legal' && approverType != 'Controlling') {
			switch (division) {
				case 'Pharma':
					aApprovalForTypeResult.push(oApprovalForType[0]);
					return aApprovalForTypeResult;
				case 'Radiology':
					aApprovalForTypeResult.push(oApprovalForType[1]);
					return aApprovalForTypeResult;
				case 'Both':
					aApprovalForTypeResult.push(oApprovalForType[0]);
					aApprovalForTypeResult.push(oApprovalForType[1]);
					return aApprovalForTypeResult;
				case 'Consumer Health':
					aApprovalForTypeResult.push(oApprovalForType[0]);
					return aApprovalForTypeResult;
			}
		} else {
			return oApprovalForType;
		}
	}

	async function buildOfferProductValidation(tx, whereOffer) {

		let results = [];
        let aFreeGoodsOther = [];
		let DistributorInfo = [];
        
		whereOffer[0].ref[0] = 'OFFERID'
		let offer = await tx.run(SELECT.from(OfferConsolidation).where(whereOffer));
		if (offer.length !== 1) {
			return results;
		}

		offer = offer[0];
		let aOfferProduct = await tx.run(SELECT.from(OfferProductConsolidation).where(whereOffer));
		if (aOfferProduct.length === 0) {
			return results;
		}

		const offerProductsTotalValue = aOfferProduct.reduce((acc, currentProduct) => acc + (currentProduct.REQUESTED_VOLUME * currentProduct.OFFER_PRICE), 0);

		const whereInstituteId = ServiceHelper.buildFullWhere("InstituteID", "=", offer.INSTITUTE_ID);
        const whereCountry = ServiceHelper.buildFullWhere("CountryCode", "=", offer.COUNTRYCODE);
        let institute = await tx.run(SELECT.one.from(PT_TMINST).where(whereCountry).where(whereInstituteId));

		//where statement
		let whereApproverType = {
			CountryCode: offer.COUNTRYCODE
		}

		//Get corresponding approvertypes
		let aApproverTypes = await tx.run(SELECT.from(ApproverTypes).where(whereApproverType));

		results = aOfferProduct.map(async function (offerProduct) {
			let aTempApproverTypes = JSON.parse(JSON.stringify(aApproverTypes)); //lose previous references to approverTypes

			//Get corresponding ProductPack
			const whereProductPack = {
				PRODUCTPACKID: offerProduct.ProductCode,
			}
			const productPack = await tx.run(SELECT.from(PT_TMPRDPCK).where(whereProductPack));

			let productInfo = await buildProductInfoForCountry(tx, offer, offerProduct, aTempApproverTypes, institute, offerProductsTotalValue, productPack);

			//Get corresponding Product Distributor ID
			const whereProductId = {
				ProductCode: offerProduct.ProductCode,
				OfferID:offer.OFFERID,
				Active: 1
			}
			const productDistributorInfo = await tx.run(SELECT.one.from(PT_TMOFPR).where(whereProductId));

			if(productDistributorInfo.Custom_String_1 && offer.COUNTRYCODE == 'PK'){
				//Get corresponding Distributor Data
				const whereDistributorId = {
					DistributorID: productDistributorInfo.Custom_String_1,
					CountryCode: offer.COUNTRYCODE
				}
				DistributorInfo = await tx.run(SELECT.one.from(PT_TMDIST).where(whereDistributorId));
			}	
			//Get corresponding ProductPricing
			const whereProductPricing = {
				OfferID: offer.OFFERID,
				ProductCode: offerProduct.ProductCode,
				CountryCode: offer.COUNTRYCODE
			}

			const productPricing = await tx.run(SELECT.one.from(ProductPricingView).where(whereProductPricing));
			const productPricingTable = await tx.run(SELECT.one.from(ProductPricing).where(whereProductPricing));
			//let finalDiscount = productPricing.FinalDiscount ? Number(Number(productPricing.FinalDiscount*100).toFixed(2)) : null;
                        
            let finalDiscount;            
            if (productPricing.UOM === "Unit") {
                finalDiscount = Number(((1 -( productPricing.NetofferPrice / productPricing.ConsumerPriceExclPU ))*100).toFixed(2));
            } else {
                finalDiscount = Number(((1 -( productPricing.NetofferPrice / productPricing.ConsumerPriceExclPP ))*100).toFixed(2));
            }
            
			let dVat = offerProduct.VAT ? Number(Number(offerProduct.VAT*100).toFixed(2)) : null;
			// EFRCL- 268955-Spain - correct mistakes on Commercial agreement templates
			// let whereRoyalDecree = {
			// 	ProductPackID: offerProduct.ProductCode,
			// 	ValidTo : '9999-12-31'
			// }
			// let RoyalDecreePercentageValue = await tx.run(SELECT.one.from(RoyalDecree).where(whereRoyalDecree));

            /*Get corresponding ProductConditions*/
			const whereProductConditions = {
				OfferID: offer.OFFERID,
				ProductCode: offerProduct.ProductCode,
				CountryCode: offer.COUNTRYCODE
			}
			const productConditionstmp = await tx.run(SELECT.from(PriceCondition).where(whereProductConditions));
            const productConditions = await Promise.all(productConditionstmp.map( async (productCondition) => {
                productCondition.DiscountCondition = await tx.run(SELECT.from(DiscountCondition).where({ PriceCondition_ID: productCondition.ID }));
				productCondition.FreeGoodsOther = await tx.run(SELECT.from(FreeGoodsOther).where({ PriceCondition_ID: productCondition.ID }));
				productCondition.FreeGoodsOther.forEach(async foc => {
					foc.ProductPack = await tx.run(SELECT.from(PT_TMPRDPCK).where({ PRODUCTPACKID: foc.ProductPackId, ACTIVERECORD: 'Yes' }))
				});
                productCondition.PriceConditionClassification = await tx.run(SELECT.one.from(PriceConditionClassification).where({ ID: productCondition.PriceConditionClassification_ID }));
                return productCondition;
            }));
            /*end of ProductCondition information */


			const whereMaterial = {
				CountryCode: offer.COUNTRYCODE,
				ProductPackId: offerProduct.ProductCode
			}
			const materials = await tx.run(SELECT.from(PT_TMSKUPRDPCK).where(whereMaterial));

			//Get all prices, ammounts and cogs in all units
			let toUnitFactor = (offerProduct.UNIT === "Unit") ? 1 : offerProduct.PACKSIZE;
			let toPackFactor = (offerProduct.UNIT === "Unit") ? 1 / offerProduct.PACKSIZE : 1;

			//let aFreeGoodsOtherTemp = [];
            const whereProductPackId = {
                ProductPricing_ProductCode: offerProduct.PRODUCTID,
                ProductPricing_OfferID: offer.OFFERID
            }
			const aFreeGoodsOtherTemp = await tx.run(SELECT.from(FreeGoodsOther).where(whereProductPackId));

            const wherePriceconditions = {
                OfferID: offer.OFFERID,
                ProductCode: offerProduct.PRODUCTID,
                CountryCode: offer.COUNTRYCODE
            }

            //const aPriceConditions = await tx.run(SELECT.from(PriceConditionView).where(wherePriceconditions));

            //loop over freegoodsother and retrieve productpricing, material and productpack data
            aFreeGoodsOther = await Promise.all(aFreeGoodsOtherTemp.map( async (tmpFreeGoodOther) => { 
                let whereMaterialFOC = {
                    CountryCode: offer.COUNTRYCODE,
                    ProductPackId: tmpFreeGoodOther.ProductPackId
                }
                
                tmpFreeGoodOther.Materials = await tx.run(SELECT.from(PT_TMSKUPRDPCK).where(whereMaterialFOC));

                let whereProductPricingFOC = {
                    OfferID: offer.OFFERID,
                    ProductCode: tmpFreeGoodOther.ProductPricing_ProductCode,
                    CountryCode: offer.COUNTRYCODE
                }
    
                tmpFreeGoodOther.ProductPricing = await tx.run(SELECT.one.from(ProductPricing).where(whereProductPricingFOC));

                const whereProductPackFOC = {
                    PRODUCTPACKID: tmpFreeGoodOther.ProductPackId,
                }
                tmpFreeGoodOther.ProductPack = await tx.run(SELECT.from(PT_TMPRDPCK).where(whereProductPackFOC));

                //Get corresponding ProductConditions
                const whereFocProductConditions = {
                    OfferID: offer.OFFERID,
                    ProductCode: tmpFreeGoodOther.ProductPackId,
                    CountryCode: offer.COUNTRYCODE
                }
                let productConditionFOCtmp = await tx.run(SELECT.from(PriceCondition).where(whereFocProductConditions));

                let productFOCConditions = await Promise.all(productConditionFOCtmp.map( async (productFOCCondition) => {
                    let whereFOCDiscountCondition = {
                        ID: productFOCCondition.ID
                    }
                    productFOCCondition.DiscountCondition = await tx.run(SELECT.from(DiscountCondition).where(whereFOCDiscountCondition));

                    /*let whereFOCRoyalDecree = {
                        ProductPackID: PriceCondition.ProductCode
                    }
                    productFOCCondition.RoyalDecree = await tx.run(SELECT.from(RoyalDecree).where(whereFOCRoyalDecree));*/

                    let wherePriceConditionClassification = {
                        ID: productFOCCondition.PriceConditionClassification_ID
                    }
                    productFOCCondition.PriceConditionClassification = await tx.run(SELECT.one.from(PriceConditionClassification).where(wherePriceConditionClassification));

                    return productFOCCondition;

                }));

                tmpFreeGoodOther.priceCondition = productFOCConditions;

                return tmpFreeGoodOther;
            }));

            // if no decimals on tax rate, add ',00' manually (n2words doesn't support integers like 10 or 21)
			// this should only be done for Italy & only for vatInWords
            let vatInWords = NumberHelper.formatNumberToText(offer.COUNTRYCODE,dVat);
            if(Number.isInteger(dVat) && offer.COUNTRYCODE === 'IT'){
                vatInWords += ",00";   
            }; 

			return {
				TENDER_ID: offer.TENDERID,
				COUNTRY_CODE: offer.COUNTRYCODE,
				OFFER_ID: offer.OFFERID,
				DIVISION: offerProduct.DIVISION,
				BRANDID: offerProduct.BRANDID,
				BRANDNAME: offerProduct.BRANDNAME,
				PRODUCT_UNIT_NAME: offerProduct.PRODUCT_UNIT_NAME, //thailand
				SKU: offerProduct.SKU, //thailand
				PRODUCTID: offerProduct.PRODUCTID,
				CODE: offerProduct.CODE,
				PRODUCTNAME: offerProduct.PRODUCTNAME,
				PACKSIZE: offerProduct.PACKSIZE,
				DOSAGE: offerProduct.DOSAGE,
				UOM: offerProduct.UOM,
				COUNTRYOFORIGIN: offerProduct.COUNTRYOFORIGIN,
				MANUFACTURER: offerProduct.MANUFACTURER,
				SHELFLIFE: offerProduct.SHELFLIFE,
				PRESENTATION: offerProduct.PRESENTATION,
				VAT: dVat,
				VAT_IN_WORDS: vatInWords,
				PRODUCT_COMMENT: productInfo.CommnonProductInfo.ProductComment,
				UNIT: offerProduct.UNIT,
				PAID_VOLUME: productInfo.CommnonProductInfo.PaidVolume,
				SORTER: offerProduct.SORTER,
				CURRENCY: offer.CURRENCY,
				REQUESTED_QUANTITY: parseInt(productInfo.CommnonProductInfo.RequestedQuantityString),
				DELIVERY_TERMS: productInfo.CommnonProductInfo.DeliveryTerms,
				PAYMENT_TERMS: offerProduct.PAYMENT_TERMS,
				SHIPMENT_TERMS: offerProduct.INCO_TERMS,
				SAMPLES: offerProduct.SAMPLES,
				SAMPLES_UNIT: offerProduct.SAMPLES * toUnitFactor,
				SAMPLES_PACK: offerProduct.SAMPLES * toPackFactor,
				REGISTERED_PRICE: offerProduct.REGISTERED_PRICE,
				REGISTERED_PRICE_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE,offerProduct.REGISTERED_PRICE),
				OFFER_PRICE: offerProduct.OFFER_PRICE,
				FOC: productInfo.CommnonProductInfo.FocString,
                FOC_ABS_PCT_STP:    offerProduct.FOC_ABS_PCT,         
				TOTAL_QUANTITY_UNITS: productInfo.CommnonProductInfo.TotalVolumeUnit, //Total Volume(units) (thailand - new column missing in the screenshot)
				FOC_QUANTITY_UNITS: productInfo.CommnonProductInfo.FocAmountUnit,
				PAID_QUANTITY_UNITS: productInfo.CommnonProductInfo.PaidVolumeUnit,
				REQ_PRICE_UNIT_OFFER_CURRENCY: productInfo.CommnonProductInfo.OfferPriceUnit,
				REQ_PRICE_UNIT_OFFER_CURRENCY_VAT: productInfo.CommnonProductInfo.OfferPriceUnit * (1 + offerProduct.VAT),   //MSP incl VAT (thailand)
				REQ_PRICE_PACK_OFFER_CURRENCY: productInfo.CommnonProductInfo.OfferPricePack,
				REQ_PRICE_UNIT_EUR_BUDGET: productInfo.CommnonProductInfo.OfferPriceUnitEurBudget,
				REQ_PRICE_UNIT_EUR_SPOT: productInfo.CommnonProductInfo.OfferPriceUnitEurSpot,
				NET_PRICE_UNIT_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetPriceUnit,
				NET_PRICE_UNIT_OFFER_CURRENCY_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.NetPriceUnit),
				NET_PRICE_UNIT_OFFER_CURRENCY_VAT: productInfo.CommnonProductInfo.NetPriceUnit * (1 + offerProduct.VAT),   //NSP incl VAT (thailand)
				NET_PRICE_UNIT_OFFER_CURRENCY_VAT_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.NetPriceUnit * (1 + offerProduct.VAT)),
				NET_PRICE_PACK_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetPricePack,
				NET_PRICE_PACK_OFFER_CURRENCY_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.NetPricePack),
				NET_PRICE_PACK_OFFER_CURRENCY_VAT: productInfo.CommnonProductInfo.NetPricePack * (1 + offerProduct.VAT),
				NET_PRICE_PACK_OFFER_CURRENCY_VAT_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.NetPricePack * (1 + offerProduct.VAT)),
				NET_PRICE_UNIT_EUR_BUDGET: productInfo.CommnonProductInfo.NetPriceUnitEurBudget,
				NET_PRICE_UNIT_EUR_SPOT: productInfo.CommnonProductInfo.NetPriceUnitEurSpot,
				NET_OFFER_PRICE: offerProduct.NET_OFFER_PRICE,
				NET_PRICE: offerProduct.NET_PRICE,
				ADDITIONAL_DISCOUNT: offerProduct.ADDITIONAL_DISCOUNT,
				ADDITIONAL_DISCOUNT_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, offerProduct.ADDITIONAL_DISCOUNT),
				MAX_PRICE_NHS_PP: productPricing.MaxPriceNhsPP,
				MAX_PRICE_NHS_PP_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productPricing.MaxPriceNhsPP),
				MAX_PRICE_NHS_PU: productPricing.MaxPriceNhsPU,
				MAX_PRICE_NHS_PU_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productPricing.MaxPriceNhsPU),
				MAX_PRICE_NHS_PU_WITH_VAT: productPricing.MaxPriceNhsPU + (productPricing.MaxPriceNhsPU * offerProduct.VAT),
				MAX_PRICE_NHS_PU_WITH_VAT_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, (productPricing.MaxPriceNhsPU + (productPricing.MaxPriceNhsPU * offerProduct.VAT))),
				CONTRACT_START_DATE: productPricing.ContractStartDate,
				NET_OFFER_PRICE_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, offerProduct.NET_OFFER_PRICE),
				CUSTOMER_ID: institute.CustomerID,
				COGS: offerProduct.COGS,//This is now in offer currency (used to be EUR)
				COGS_EUR_UNIT: productInfo.CommnonProductInfo.CogsEurUnit,
				COGS_EUR_PACK: productInfo.CommnonProductInfo.CogsEurPack,
				GROSS_SALES_OFFER_CURRENCY: productInfo.CommnonProductInfo.GrossSales,
				GROSS_SALES_OFFER_CURRENCY_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.GrossSales),
				NET_SALES_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetSales,
				NET_SALES_EUR_BUDGET: productInfo.CommnonProductInfo.NetSalesEurBudget,
				NET_SALES_EUR_SPOT: productInfo.CommnonProductInfo.NetSalesEurSpot,
				GROSS_MARGIN_EUR_BUDGET: productInfo.CommnonProductInfo.GrossMarginEurBudget,
				GROSS_MARGIN_EUR_SPOT: productInfo.CommnonProductInfo.GrossMarginEurSpot,
				GROSS_PROFIT_EUR_BUDGET: productInfo.CommnonProductInfo.GrossProfitEurBudget,
				GROSS_PROFIT_EUR_SPOT: productInfo.CommnonProductInfo.GrossProfitEurSpot,
				//REGULATORY: productInfo.ProductValidation.REGULATORY,
				//LEGAL: productInfo.ProductValidation.LEGAL,
				//CONTROLLING: productInfo.ProductValidation.CONTROLLING,
				//COUNTRY_BUSINESS: productInfo.ProductValidation.COUNTRY_BUSINESS,
				//REGIONAL_BUSINESS: productInfo.ProductValidation.REGIONAL_BUSINESS,
				//SUPPLY_CHAIN: productInfo.ProductValidation.SUPPLY_CHAIN,
				IS_LOWEST: (productInfo.CommnonProductInfo.IsMinPrice) ? 1 : 0,
				IS_DEFAULT_TERMS: offerProduct.IS_DEFAULT_TERMS,
				IS_REGISTERED: offerProduct.IS_REGISTERED,
				IS_ALTERNATIVE_QUOTED: offerProduct.IS_ALTERNATIVE_QUOTED,
				IS_ALTERNATIVE_REQUESTED: offerProduct.IS_ALTERNATIVE_REQUESTED,
				NEW_APPROVAL: offerProduct.NEW_APPROVAL,
				BUDGETED_PROFITABILITY: offerProduct.BUDGETED_PROFITABILITY,
				UK_BUDGETED_PROFITABILITY: offerProduct.UK_BUDGETED_PROFITABILITY,
				CHANNEL: offerProduct.CHANNEL,
				ACT_PROFITABILITY: (offerProduct.NET_PRICE - offerProduct.COGS) / offerProduct.NET_PRICE,
				GROSS_SALES_OFFER_CURRENCY_VAT: productInfo.CommnonProductInfo.GrossSales * (1 + offerProduct.VAT),
				GROSS_SALES_OFFER_CURRENCY_VAT_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.GrossSales * (1 + offerProduct.VAT)),
				VAT_TOTAL: productInfo.CommnonProductInfo.GrossSales * offerProduct.VAT,
				//NSM_SM_FM: productInfo.ProductValidation.NSM_SM_FM,
				//HBU: productInfo.ProductValidation.HBU,
				//CDH: productInfo.ProductValidation.CDH,
				IN_POLICY: productInfo.ProductValidation.IN_POLICY,
				//MACS: productInfo.ProductValidation.MACS,
				//TA: productInfo.ProductValidation.TA,
				//FBP: productInfo.ProductValidation.FBP,
				//LPC: productInfo.ProductValidation.LPC,
				//COM_PGA: productInfo.ProductValidation.COM_PGA,
				//International_Trade: productInfo.ProductValidation.International_Trade,
				//Transfer_Pricing: productInfo.ProductValidation.Transfer_Pricing,
				//SBR: productInfo.ProductValidation.SBR,
				MOLECULE_NAME: offerProduct.MOLECULE_NAME,
				OFFER_PRICE_VAT: offerProduct.OFFER_PRICE * (1 + offerProduct.VAT),
				ApproverTypes: aTempApproverTypes,
				BUDGET_RATE: offerProduct.BUDGET_RATE,
				SPOT_RATE: offerProduct.SPOT_RATE,
				BUSINESS_CASE_PRICE: offerProduct.BUSINESS_CASE_PRICE,

				WARRANTY: offerProduct.Warranty,
				AGREEMENTDURATION: offerProduct.AgreementDuration,
				MONTHLYRENT: offerProduct.MonthlyRent,
                MONTHLYRENT_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE,offerProduct.MonthlyRent),
				MONTHSPERINVOICE: offerProduct.MonthsPerInvoice,
				CONTRACTSTARTDATE: offerProduct.ContractStartDate,
				VALUEOFDEVICES: offerProduct.ValueOfDevices,
				STATUSOFDEVICE: offerProduct.StatusOfDevice,
				MINCONTRACTUAL: offerProduct.MinContractual,
				MINANNPURCH: offerProduct.MinAnnPurch,
				FOC_STEP: offerProduct.FOC_STEP,
				OFFER_TYPE: offerProduct.OfferType,
				FreeGoodsOther: aFreeGoodsOtherTemp,
                PriceCondition: productConditions,

				//missing SKU & SKUCountry fields
				MOLECULE_NAME: offerProduct.MOLECULE_NAME,
				ACTIVERECORD: offerProduct.ACTIVERECORD,
				HLEVEL6_CODE: offerProduct.HLEVEL6_CODE,
				PCI_NAME: offerProduct.PCI_NAME,
				ACTIVE_SUBSTANCE: offerProduct.ACTIVE_SUBSTANCE,
				PRODUCT_TYPE: offerProduct.PRODUCT_TYPE,

				SKUCOUNTRY_ACTIVERECORD: offerProduct.SKUCOUNTRY_ACTIVERECORD,
				PRESENTATION_2: offerProduct.PRESENTATION_2,
				PRODUCT_COMMENT: offerProduct.PRODUCT_COMMENT,
				GOV_CODE: offerProduct.GOV_CODE,
				CODE1: offerProduct.CODE1,
				CODE2: offerProduct.CODE2,
                CODE3: offerProduct.CODE3,                
				QTY_THRESHOLD: offerProduct.QTY_THRESHOLD,
				ProductClass: offerProduct.ProductClass,
				ProductDescription: offerProduct.ProductDescription,
				FINAL_DISCOUNT: finalDiscount,
				FINAL_DISCOUNT_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, finalDiscount),
				PRODUCT_FULL_DESCRIPTION: offerProduct.PRODUCT_FULL_DESCRIPTION,
                LOTID: offerProduct.LOTID,
				// PERCENTAGE: RoyalDecreePercentageValue.Percentage,
				ProductPricing: productPricingTable,
				ProductPack: productPack,
				Materials: materials,
                //PriceCondition: aPriceConditions,
				LINE: offerProduct.LINE,
				REFERENCE: offerProduct.REFERENCE,
				IBIZWORKFLOWID: offerProduct.IBIZWORKFLOWID,
				DISTRIBUTORID: productDistributorInfo.Custom_String_1,
				DistributorName: DistributorInfo?.DistributorName ?? null,
				Address: DistributorInfo?.Address ?? null,
				City: DistributorInfo?.City ?? null
			}
		});
		let resolvedResults = await Promise.all(results);
		resolvedResults.sort((a, b) => (a.SORTER > b.SORTER) ? 1 : -1);
		let sorter = 0;
		for (let i = 0; i < resolvedResults.length; i++) {
			sorter = sorter + 1;
			resolvedResults[i].SORTER = sorter;
		}

		return resolvedResults;
	}

	async function buildProductInfoForCountry(tx, offer, product, aApproverTypes, institute, offerProductsTotalValue, productPack) {
		let commnonProductInfo = buildCommonProductInfo(offer, product);
		let productValidation = {};

		if (offer.APPROVAL_TYPE === 12) { //Default for standard tender app
			productValidation = await buildProductValidationForType12(tx, offer, product, commnonProductInfo, aApproverTypes, offerProductsTotalValue)
        }

		if (offer.APPROVAL_TYPE === 14) {
			productValidation = await buildProductValidationForType14(tx, offer, product, commnonProductInfo, aApproverTypes, offerProductsTotalValue);
		}

		if (offer.APPROVAL_TYPE === 15) {
			productValidation = await buildProductValidationForType15(tx, offer, product, commnonProductInfo, aApproverTypes, offerProductsTotalValue, productPack);
		}
		return {
			CommnonProductInfo: commnonProductInfo,
			ProductValidation: productValidation
		};
	}

	async function buildProductValidationForType12(tx, offer, product, productInfo, aApproverTypes, offerProductsTotalValue) {
		const { PriceCondition} = cds.entities("com.bayer.SXTENDER.TransactionalData");
		let results = {
			IN_POLICY: false
		}

		const priceCondition = await tx.run(SELECT.one.from(PriceCondition).where({'OfferID': product.OFFERID, ProductCode: product.ProductCode}));

		if(priceCondition){
			if(ServiceHelper.isDoubleXBelowEqualY(priceCondition.Price1, priceCondition.Price0)){
				aApproverTypes.map(async function (oApproverType) {
					oApproverType.ValidationType = 3;
				});
			}
			
			if(ServiceHelper.isDoubleEqual(priceCondition.Price1, priceCondition.Price0) || ServiceHelper.isDoubleXBelowEqualY(priceCondition.Price0, priceCondition.Price1)){
				aApproverTypes.map(async function (oApproverType) {
					oApproverType.ValidationType = oApproverType.ValidationType;
				});
			}
		
			//In Policy flag is used to block the UI for clicking on the approval button (for example used for Thailand)
			results.IN_POLICY = true
			
		}

		return results;
	}

	async function buildProductValidationForType14(tx, offer, product, productInfo, aApproverTypes, offerProductsTotalValue) {
		const { PriceCondition} = cds.entities("com.bayer.SXTENDER.TransactionalData");
		let results = {
			IN_POLICY: false
		}

		let comparisonPrice = 0;

		const policy = await tx.run(SELECT.one.from(PricingPolicyView).where({'ProductPackID': product.ProductCode, 'CountryCode': offer.COUNTRYCODE, 'InstituteID': offer.INSTITUTE_ID, 'DistributorID': offer.DISTRIBUTOR_ID}));
		const priceCondition = await tx.run(SELECT.one.from(PriceCondition).where({'OfferID': product.OFFERID, 'ProductCode': product.ProductCode}));

		if(policy && priceCondition){
			switch(policy.Type){
				case 'OfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? priceCondition.OfferPrice * product.PACKSIZE : priceCondition.OfferPrice;
				case 'NetOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? priceCondition.NetOfferPrice * product.PACKSIZE : priceCondition.NetOfferPrice;
				case 'NetPrice':
					comparisonPrice = product.UOM === 'Unit' ? priceCondition.NetPrice * product.PACKSIZE : priceCondition.NetPrice;
				case 'OfferPriceVSRegisteredPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.Price0 * product.PACKSIZE) - (priceCondition.OfferPrice * product.PACKSIZE)) / (priceCondition.Price0 * product.PACKSIZE) : 
															   (priceCondition.Price0 - priceCondition.OfferPrice) / priceCondition.Price0;
				case 'NetPriceVSRegisteredPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.Price0 * product.PACKSIZE) - (priceCondition.NetPrice * product.PACKSIZE)) / (priceCondition.Price0 * product.PACKSIZE) :
															   (priceCondition.Price0 - priceCondition.NetPrice) / priceCondition.Price0;
				case 'NetOfferPriceVSRegisteredPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.Price0 * product.PACKSIZE) - priceCondition.NetOfferPrice) / (priceCondition.Price0 * product.PACKSIZE) :
															   (priceCondition.Price0 - priceCondition.NetOfferPrice) / priceCondition.Price0;
				case 'NetOfferPriceVSOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.OfferPrice * product.PACKSIZE) - (priceCondition.NetOfferPrice * product.PACKSIZE)) / (priceCondition.OfferPrice * product.PACKSIZE) : 
																(priceCondition.OfferPrice - priceCondition.NetOfferPrice) / priceCondition.OfferPrice;
				case 'NetPriceVSOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.OfferPrice * product.PACKSIZE) - (priceCondition.NetPrice * product.PACKSIZE)) / (priceCondition.OfferPrice * product.PACKSIZE): 
																(priceCondition.OfferPrice - priceCondition.NetPrice) / priceCondition.OfferPrice;
				case 'NetPriceVSNetOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.NetOfferPrice * product.PACKSIZE) - (priceCondition.NetPrice * product.PACKSIZE)) / (priceCondition.NetOfferPrice * product.PACKSIZE) : 
																(priceCondition.NetOfferPrice - priceCondition.NetPrice) / priceCondition.NetOfferPrice;
				case 'BudgetedProfitability':
					comparisonPrice = product.UOM === 'Unit' ? (priceCondition.NetPrice - productInfo.cogsEurUnit) / priceCondition.NetPrice :
																(priceCondition.NetPrice - productInfo.cogsEurPack) / priceCondition.NetPrice;
			}

			if(comparisonPrice < policy.Value){
				aApproverTypes.map(async function (oApproverType) {
					oApproverType.ValidationType = oApproverType.ValidationType;
				});
			} else {
				aApproverTypes.map(async function (oApproverType) {
					oApproverType.ValidationType = oApproverType.ValidationType2;
				});
			}

			//In Policy flag is used to block the UI for clicking on the approval button (for example used for Thailand)
			results.IN_POLICY = true
		}
		
		return results;
	}

	async function buildProductValidationForType15 (tx, offer, product, productInfo, aApproverTypes, offerProductsTotalValue, productPack) {
		let results = {
			IN_POLICY: false
		}
		const policy = await tx.run(SELECT.one.from(PricingPolicyView).where({'CountryCode': offer.COUNTRYCODE, "Type": "OfferPriceVSRegisteredPrice"}));
		const priceCondition = await tx.run(SELECT.one.from(PriceCondition).where({'OfferID': product.OFFERID, 'ProductCode': product.ProductCode}));
		const ctryProductPack = await tx.run(SELECT.one.from(PT_TMCTPRDPCK).where({"COUNTRYCODE": offer.COUNTRYCODE, "PRODUCTPACKID": product.ProductCode}));
		const countryApprovers = await tx.run(SELECT.from(CountryApprovers).where({"CountryCode": offer.COUNTRYCODE, "Division": product.DIVISION, "BU": ctryProductPack.BU}));
		const productThreshold = product.UNIT === "Unit" ? product.REQUESTED_VOLUME / productPack[0].PACKFACTOR : product.QTY_THRESHOLD

		if(policy && priceCondition) {
			if (offer.AffiliateOffer) {
				const apprTypesToBeRemoved = [];
				aApproverTypes.map(function (oApproverType) {
					if (oApproverType.ApproverType !== "Order-to-Cash-Ready") {
						oApproverType.ValidationType = 1;
					}
					const currentCtryApprType = countryApprovers.findIndex(ca => ca.ApproverType === oApproverType.ApproverType);
					if (currentCtryApprType === -1 ) {
						apprTypesToBeRemoved.push(oApproverType.ApproverType)
					}
				});
				const orderToCashReadyIndex = apprTypesToBeRemoved.findIndex(el => el === "Order-to-Cash-Ready");
				apprTypesToBeRemoved.splice(orderToCashReadyIndex, 1);
				updateApproverTypesListForPakistan(aApproverTypes, apprTypesToBeRemoved);
			}else {
				if (priceCondition.Level1Discount1 < policy.Value) {
					if (product.REQUESTED_VOLUME < productThreshold) {
						const apprTypesToBeRemoved = [];
						aApproverTypes.map(function (oApproverType) {
							oApproverType.ValidationType = oApproverType.ValidationType2;
							const currentCtryApprType = countryApprovers.findIndex(ca => ca.ApproverType === oApproverType.ApproverType);
							if (currentCtryApprType === -1) apprTypesToBeRemoved.push(oApproverType.ApproverType);
						});
						updateApproverTypesListForPakistan(aApproverTypes, apprTypesToBeRemoved);
					}else {
						const apprTypesToBeRemoved = [];
						aApproverTypes.map(function (oApproverType) {
							oApproverType.ValidationType = oApproverType.ValidationType2;
							const currentCtryApprType = countryApprovers.findIndex(ca => ca.ApproverType === oApproverType.ApproverType);
							if (currentCtryApprType === -1 && oApproverType.ApproverType !== "SCM") apprTypesToBeRemoved.push(oApproverType.ApproverType);
						});
						updateApproverTypesListForPakistan(aApproverTypes, apprTypesToBeRemoved);
					}
				}else {
					if (product.REQUESTED_VOLUME < productThreshold) {
						const apprTypesToBeRemoved = [];
						aApproverTypes.map(function (oApproverType) {
							oApproverType.ValidationType = oApproverType.ValidationType;
							const currentCtryApprType = countryApprovers.findIndex(ca => ca.ApproverType === oApproverType.ApproverType);
							if (currentCtryApprType === -1) apprTypesToBeRemoved.push(oApproverType.ApproverType);
						});
						updateApproverTypesListForPakistan(aApproverTypes, apprTypesToBeRemoved);
					}else {
						const apprTypesToBeRemoved = [];
						aApproverTypes.map(function (oApproverType) {
							oApproverType.ValidationType = oApproverType.ValidationType;
							const currentCtryApprType = countryApprovers.findIndex(ca => ca.ApproverType === oApproverType.ApproverType);
							if (currentCtryApprType === -1 && oApproverType.ApproverType !== "SCM") apprTypesToBeRemoved.push(oApproverType.ApproverType);
						});
						updateApproverTypesListForPakistan(aApproverTypes, apprTypesToBeRemoved);
					}
				}
			}
			results.IN_POLICY = true
		}
		return results;
	}

	function updateApproverTypesListForPakistan (aApproverTypes, apprTypesToBeRemoved) {
		apprTypesToBeRemoved.forEach(apprType => {
			const apprIndex = aApproverTypes.findIndex(at => at.ApproverType === apprType);
			aApproverTypes.splice(apprIndex, 1);
		});
	}

	function buildCommonProductInfo(offer, product) {
		//Get all prices, ammounts and cogs in all units
		let toUnitFactor = (product.UNIT === "Unit") ? 1 : product.PACKSIZE;
		let toPackFactor = (product.UNIT === "Unit") ? 1 / product.PACKSIZE : 1;

		let requestedVolume = product.REQUESTED_VOLUME;
		//let requestedUnit = toUnitFactor * requestedVolume;

		let focAmount = (product.FOC_ABS_PCT === "PCT") ? Math.round(product.FOC * requestedVolume) : Math.round(product.FOC);
		let focAmountUnit = toUnitFactor * focAmount;
		let totalVolume = (product.FOC_TYPE === "FOC 1") ? requestedVolume : requestedVolume + focAmount;
		let totalVolumeUnit = toUnitFactor * totalVolume;
		let paidVolume = (product.FOC_TYPE === "FOC 1") ? requestedVolume - focAmount : requestedVolume;
		let paidVolumeUnit = toUnitFactor * paidVolume;

		//let registeredPrice = product.REGISTERED_PRICE;
		let offerPrice = product.OFFER_PRICE;
		let netOfferPrice = product.NET_OFFER_PRICE;
		let netPrice = product.NET_PRICE;
		let cogs = product.COGS;

		let offerPriceUnit = offerPrice / toUnitFactor;
		let offerPricePack = offerPrice / toPackFactor;
		let offerPriceUnitEurSpot = offerPriceUnit / product.SPOT_RATE;
		let offerPriceUnitEurBudget = offerPriceUnit / product.BUDGET_RATE;
		let cogsEurUnit = cogs / product.SPOT_RATE / toUnitFactor; 
		let cogsEurPack = cogs / product.SPOT_RATE / toPackFactor; 
		let netPriceUnit = netPrice / toUnitFactor;
		let netPricePack = netPrice / toPackFactor;
		let netPriceUnitEurSpot = netPriceUnit / product.SPOT_RATE;
		let netPriceUnitEurBudget = netPriceUnit / product.BUDGET_RATE;

		let grossSales = offerPrice * paidVolume;
       
		let netSales = netPrice * totalVolume;
		let netSalesEurSpot = netSales / product.SPOT_RATE;
		let netSalesEurBudget = netSales / product.BUDGET_RATE;

		let totalCostEur = totalVolume * cogs / product.SPOT_RATE;
		if (product.FOC_BUNDLED_1 !== 0) {
			if (product.FOC_BUNDLED_1_ABS_PCT === "PCT") {
				totalCostEur = totalCostEur + Math.round(product.FOC_BUNDLED_1 * requestedVolume) * product.FOC_BUNDLED_1_COGS / product.SPOT_RATE;
			}
			else {
				totalCostEur = totalCostEur + Math.round(product.FOC_BUNDLED_1) * product.FOC_BUNDLED_1_COGS / product.SPOT_RATE;
			}
		}

		let grossProfitEurSpot = netSalesEurSpot - totalCostEur;
		let grossProfitEurBudget = netSalesEurBudget - totalCostEur;
        
        //EHQUT-202296-MEA-change the formula for the calculation of the GP% to be divided by the Gross sales in Euros
           let grossMarginEurSpot = grossProfitEurSpot / netSalesEurSpot;
           let grossMarginEurBudget = grossProfitEurBudget / netSalesEurBudget;
    
        //EHQUT-202296-MEA-change the formula for the calculation of the GP% to be divided by the Gross sales in Euros
		let isMinPrice = !ServiceHelper.isDoubleEqual(product.MIN_PRICE, 0) ? ServiceHelper.isDoubleXBelowY(offerPrice, product.MIN_PRICE) : 1;

		//Product Comment: master data product comment + info on additional brand FOC, if any
		let productComment = product.PRODUCT_COMMENT;
		if (product.FOC_BUNDLED_1 !== 0) {
			if (product.PRODUCT_COMMENT !== "") productComment = productComment.concat("<br>");
			if (product.FOC_BUNDLED_1_ABS_PCT === "PCT") {
				productComment = productComment.concat(Math.round(100 * product.FOC_BUNDLED_1).toString().concat("%"));
			}
			else {
				productComment = productComment.concat(Math.round(product.FOC_BUNDLED_1).toString().concat(" ").concat(product.UNIT));
			}
			productComment = productComment
				.concat(" of ")
				.concat(product.FOC_BUNDLED_1_PRODUCT_NAME)
				.concat(" will be provided with the ")
				.concat(product.PRODUCTNAME)
		}
		//Delivery terms
		let deliveryTerms = "";
		//EHQUT-RITM12706398-SEWA Change Request
		if(offer.REGION_NAME === "SEWA"){
			deliveryTerms = product.FIRST_SHIPMENT;
		}else{
		if (product.NUMBER_LOTS === 0 && product.INTERVAL_SHIPMENTS === 0) {
			deliveryTerms = "Multiple deliveries from local stocks with first ";
			deliveryTerms = deliveryTerms.concat(product.FIRST_SHIPMENT);
		}
		else if (product.NUMBER_LOTS === 1 && product.INTERVAL_SHIPMENTS === 0) {
			deliveryTerms = "Single delivery ";
			deliveryTerms = deliveryTerms.concat(product.FIRST_SHIPMENT);
		}
		else {
			deliveryTerms = product.NUMBER_LOTS.toString()
				.concat(" lots at interval of ")
				.concat(product.INTERVAL_SHIPMENTS.toString())
				.concat(" months with first ")
			
				.concat(product.FIRST_SHIPMENT);
		}
	}
	
		//Requested Quantity & FOC string
		let focString = "";
		let requestedQuantityString = requestedVolume.toString().concat(" ").concat(product.UNIT);
		if (product.FOC !== 0) {
			if (product.FOC_ABS_PCT === "PCT") {
				focString = Math.round(100 * product.FOC).toString().concat("%");
				requestedQuantityString = requestedQuantityString.concat("<br> (FOC: ").concat(focString);
			}
			else {
				focString = Math.round(product.FOC).toString();
				requestedQuantityString = requestedQuantityString.concat("<br> (FOC: ")
					.concat(focString)
					.concat(" ")
					.concat(product.UNIT);
			}
			requestedQuantityString = requestedQuantityString
				.concat((product.FOC_TYPE === "FOC 1") ? " included)" : " added)");
		}
		//Build results object
		let results = {
			ProductComment: productComment,

			DeliveryTerms: deliveryTerms,

			FocString: focString,
			RequestedQuantityString: requestedQuantityString,

			TotalVolumeUnit: totalVolumeUnit,
			PaidVolume: paidVolume,
			PaidVolumeUnit: paidVolumeUnit,
			FocAmountUnit: focAmountUnit,

			OfferPriceUnit: offerPriceUnit,
			OfferPricePack: offerPricePack,
			OfferPriceUnitEurBudget: offerPriceUnitEurBudget,
			OfferPriceUnitEurSpot: offerPriceUnitEurSpot,

			NetPriceUnit: netPriceUnit,
			NetPricePack: netPricePack,
			NetPriceUnitEurBudget: netPriceUnitEurBudget,
			NetPriceUnitEurSpot: netPriceUnitEurSpot,

			CogsEurUnit: cogsEurUnit,
			CogsEurPack: cogsEurPack,

			GrossSales: grossSales,
			NetSales: netSales,
			NetSalesEurBudget: netSalesEurBudget,
			NetSalesEurSpot: netSalesEurSpot,

			GrossProfitEurSpot: grossProfitEurSpot,
			GrossProfitEurBudget: grossProfitEurBudget,
			GrossMarginEurSpot: grossMarginEurSpot,
			GrossMarginEurBudget: grossMarginEurBudget,

			IsMinPrice: isMinPrice
		};
		return results;
	}

	//http://localhost:4004/v2/tender/WordAttachment('AE-16-100-1049-BPH-11')/content
	srv.on('READ', 'WordAttachments', async (req, next) => {
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		const offerId = req.data.offerId;
		const templateId = req.data.templateId;
		if (!offerId) {
			return next();
		}

		const templates = await tx.run(SELECT.from(WordTemplate).where({ templateId: templateId }));
		if (templates.length === 0) {
			return req.reject(404, 'No template found for offer:' + offerId + ' and templateid:' + templateId);
		}
		const templateContent = templates[0].content;
		let wordData = {};
		//Get offer data
		if (offerId) {
			try {
				wordData = await getOfferData(tx,offerId);
			} catch (error) {
				return req.reject(404, 'No offer found');
			}
		}
		const handler = new wordTemplate.TemplateHandler({
			scopeDataResolver: createResolver({
				angularFilters: {
					upper: (input) => (input || "").toUpperCase(),
					lower: (input) => (input || "").toLowerCase(),
					numberEU2: (input) => {  
                        if(Number(input) === 0 || input === null  ){
                            return "0,00";
                        }          
                        var usString;
						if(typeof input === 'string'){
                            usString = Number(input.replace(/\,/g,'')).toLocaleString('en-US',{ minimumFractionDigits: 2, maximumFractionDigits: 2 });
						} else {
                            usString = input.toLocaleString('en-US',{ minimumFractionDigits: 2, maximumFractionDigits: 2 });
						}
                        usString = usString.replace(/\,/g,'$');
                        usString = usString.replace(/\./g,',');  
                        usString = usString.replace(/\$/g,'.');   
                        return  usString;                  
				   },
				   numberUS2: (input) => {  
						if(Number(input) === 0 || input === null  ){
							return "0.00";
						}          
						var usString;
						if(typeof input === 'string'){
							usString = Number(input.replace(/\,/g,'')).toLocaleString('en-US',{ minimumFractionDigits: 2, maximumFractionDigits: 2 });
						} else {
							usString = input.toLocaleString('en-US',{ minimumFractionDigits: 2, maximumFractionDigits: 2 });
						}
						return  usString;
					},
					dateFormatUK: (input) => {
						return input.split("-").reverse().join("-").replaceAll("-","/");
					},
					currentdatePK: (input) => {
						const curr_date = new Date();
						return curr_date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
					
					},
					currentdateUK: (input) => {
						const c_date = new Date();
						let day = c_date.getDate();
						let year = c_date.getFullYear();
						let Month = c_date.getMonth()+1;
						let current_date = `${day}/${Month}/${year}`;
						return current_date;
					},				   
					numberEU5: (input) => {
                    if(Number(input) === 0 || input === null  ){
                        return "0,00000";
                    } 
                    var usString;
                    if(typeof input === 'string'){
                        usString = Number(input.replace(/\,/g,'')).toLocaleString('en-US',{ minimumFractionDigits: 5, maximumFractionDigits: 5 });
                    } else {
                        usString = input.toLocaleString('en-US',{ minimumFractionDigits: 5, maximumFractionDigits: 5 });
                    }
                    usString = usString.replace(/\,/g,'$');
                    usString = usString.replace(/\./g,',');  
                    usString = usString.replace('$','.');   
                    return  usString; 
			   	},
				dateFormatterEU: (input) => input.split("-").reverse().join("-"),
				dateYear: (input) => input.substring(0,4),
                extract2Decimals: (input) => {
                    if(typeof input === 'string'){
                        return input.split(".")[1].substring(0, 2);
                    } else {
                        return Number(input).toFixed(2).split(".")[1];
                    }
                },
                   extract5Decimals: (input) => {
                    if(typeof input === 'string'){
                        return input.split(".")[1].substring(0, 5);
                    } else {
                        return Number(input).toFixed(5).split(".")[1];
                    }
                },
                //EHQUT-167492-Quotation Adjustment in word file
                Decimals2Unit: (input) => {
                    if(typeof input === 'string'){
                        return input.split(".")[1].substring(0, 2);
                    } else {
                        return Number(input).toFixed(2);
                    }
                    
                }
                //EHQUT-167492-Quotation Adjustment in word file


				}
			})
		});
		const doc = await handler.process(templateContent, wordData);
		const readableInstanceStream = new Readable({
			read() {
				this.push(doc);
				this.push(null);
			}
		});
		const filename = offerId+'.docx';
		req._.res.setHeader('Content-disposition', 'attachment; filename=' + filename);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
		return {
			value: readableInstanceStream
		};
	});

	//http://localhost:4004/v2/tender/WordAttachment('AE-16-100-1049-BPH-11')/content
	srv.on('READ', 'ExcelAttachments', async (req, next) => {
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		const offerId = req.data.offerId;
		const templateId = req.data.templateId;
		if (!offerId) {
			return next();
		}

		const templates = await tx.run(SELECT.from(ExcelTemplate).where({ templateId: templateId }));
		if (templates.length === 0) {
			return req.reject(404, 'No template found for offer:' + offerId + ' and templateid:' + templateId);
		}
		const templateContent = templates[0].content;
		let excelData = {};
		//Get offer data
		if (offerId) {
			try {
				excelData = await getOfferData(tx,offerId);
			} catch (error) {
				return req.reject(404, 'No offer found');
			}
		}
		//generate XLSX
		let excelStreamValue = XLSXHelper.generateXLSX(`${templates[0]?.filename}`,excelData);
		req._.res.setHeader('Content-disposition', `attachment; filename=${offerId}.xlsx`);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return excelStreamValue;
	});

	srv.before('CREATE', 'PdfEmail', async (req) => {
		const tx = cds.tx(req);
		const cwid = req.user.id;
		const tenderInstituteId = req.data.TenderInstitute;
		const offerInstituteId = req.data.OfferInstitute;
		const userInfo = await tx.run(SELECT.from(PT_TMUSER).where({CWID: cwid}));
		const tenderInstituteInfo = await tx.run(SELECT.from(PT_TMINST).where({InstituteID: tenderInstituteId}));
		const offerInstituteInfo = await tx.run(SELECT.from(PT_TMINST).where({InstituteID: offerInstituteId}));
		req.data.TenderInstitute = tenderInstituteInfo[0]?.InstituteName;
		req.data.OfferInstitute = offerInstituteInfo[0]?.InstituteName;
		req.data.UserEmail = userInfo[0]?.UserEmail;
		req.data.UserName = userInfo[0]?.UserName;
	});

	async function getOfferData(tx,offerId){
		
		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerValidation = await buildOfferValidation(tx, whereOffer);
		if (!offerValidation) {
			throw 'No offer found';
		}

		//Get product data
		let productValidation = await buildOfferProductValidation(tx, whereOffer);

		//format prices
		productValidation.forEach(prd => {
			prd.PAID_VOLUME = ServiceHelper.formatNumber(prd.PAID_VOLUME, 0, 0);
			prd.PACKSIZE = ServiceHelper.formatNumber(prd.PACKSIZE, 0, 0);
			prd.OFFER_PRICE = ServiceHelper.formatNumber(prd.OFFER_PRICE, 2, 2);
			prd.OFFER_PRICE_VAT = ServiceHelper.formatNumber(prd.OFFER_PRICE_VAT, 2, 2);
			prd.GROSS_SALES_OFFER_CURRENCY = ServiceHelper.formatNumber(prd.GROSS_SALES_OFFER_CURRENCY, 2, 2);
			prd.GROSS_SALES_OFFER_CURRENCY_VAT = ServiceHelper.formatNumber(prd.GROSS_SALES_OFFER_CURRENCY_VAT, 2, 2);
			prd.SAMPLES = ServiceHelper.formatNumber(prd.SAMPLES, 0, 0);
			prd.FOC = ServiceHelper.formatNumber(prd.FOC, 0, 0);
			prd.NET_PRICE = ServiceHelper.formatNumber(prd.NET_PRICE, 0, 0);
		});

		offerValidation.AMOUNT_IN_NUMBERS = ServiceHelper.formatNumber(offerValidation.AMOUNT_IN_NUMBERS, 2, 2);
		offerValidation.VAT_TOTAL = ServiceHelper.formatNumber(offerValidation.VAT_TOTAL, 2, 2);
		offerValidation.AMOUNT_IN_NUMBERS_VAT = ServiceHelper.formatNumber(offerValidation.AMOUNT_IN_NUMBERS_VAT, 2, 2);
		const flatOfferProductValidation = productValidation.reduce((acc,prod)=> acc.concat(prod.PriceCondition.map(pc=>({...pc,...prod}))),[]);
		const groupedOfferProductValidation = flatOfferProductValidation.reduce((groups, product) => {
			const { ConditionType } = product.PriceConditionClassification;
			const foundGroup = groups.find(group=>group[ConditionType.replace(/\s/g, '')]);
			if(!foundGroup){
			  let test = {};
			  test[ConditionType.replace(/\s/g, '')]=[{items:[product]}];
			  groups.push(test);
			}else{
			  foundGroup[ConditionType.replace(/\s/g, '')][0].items.push(product);
			}
			return groups;
		  }, []);
		return {
			offerValidation: offerValidation,
			offerProductValidation: productValidation,
			groupedOfferProductValidation: groupedOfferProductValidation
			// flatOfferProductValidation.reduce((group, product) => {
			// 	const { PriceConditionClassification } = product;
			// 	group[PriceConditionClassification.ConditionType.replace(/\s/g, '')] ??= {items:[]};
			// 	group[PriceConditionClassification.ConditionType.replace(/\s/g, '')].items.push(product);
			// 	return group;
			//   }, {})
		};
	}

	srv.on("READ", "CSVAttachment", async (req, res) => {

		const zuelligExtract = await SELECT.from(ZuelligExtractView).where({CountryCode: "TW"});
		const offerProducts = await SELECT.from(PT_TMOFPR).where({CountryCode: "TW"});
		const csvConfig = mkConfig({ useKeysAsHeaders: true, useTextFile: true });
		const zuellig = req.data.Zuellig;
		let mappedZuelligExtract = [];

		if (zuellig) {
			mappedZuelligExtract = zuelligExtract.map(item => {
				return {
					"CONT_PRICE": Number(item.Price1),
					"DONATION": 0,
					"GROUP": item.InstituteType,
					"CCGRCD": item.Class,
					"Modified": new Date(item.SubmittedOn).toISOString(),
					"QoNetPrice": Number(item.Price3),
					"QoDisCP1": item.Level2Discount1,
					"QoDisCM1": item.GeneralDiscount_Amount,
					"QoDisCM2": item.SecondDiscount_Amount,
					"QoDisCM5": item.FreeGoods_Percentage,
					"QoDisCM6": item.AnnualDiscountForBranch,
					"cusno": item.External_InstituteId,
					"susnm": item.InstituteName,
					"ProdNo": item.SKUCode,
					"ProdName": item.PRODUCTPACKNAME,
					"Territory": item.KAM_Territory,
					"SDSNo.": item.CNPJ,
					"SLSNO": item.KAM_Territory,
					"STS": item.Status,
					"ItemNo": item.SKUCode,
					"ItemName": item.PRODUCTPACKNAME,
					"SBE": item.BU,
					"BU": item.BU,
					"BasePrice": Number(item.RegisteredPrice),
					"Display": item.Display,
					"Pack": item.PACKFACTOR
				}
			});
		}else {
			mappedZuelligExtract = zuelligExtract.map(item => {
				const products = offerProducts.filter(pr => pr.OfferID === item.OfferID);
				return {
					"ApplyDate": new Date(item.CreationDate).toISOString(),
					"ApplicantID": item.SubmittedBy,
					"BUCode": item.BU,
					"EffectiveDate": new Date(item.EffectiveDate).toISOString(),
					"CurNetPrice": Number(item.Price3),
					"pk": products.length,
					"CONT_PRICE": Number(item.Price1),
					"DONATION": 0,
					"GROUP": item.InstituteType,
					"CCGRCD": item.Class,
					"PACK": item.PACKFACTOR,
					"CREATE_DAT": item.createdAt,
					"CONCS": item.ParentInstituteID,
					"Modified": new Date(item.SubmittedOn).toISOString(),
					"QoNetPrice": Number(item.Price3),
					"QoTotal": item.TotalDiscountNHI,
					"QoDisCP1": item.Level2Discount1,
					"QoDisCM1": item.GeneralDiscount_Amount,
					"QoDisCP2": item.Level2Discount2,
					"QoDisCM2": item.SecondDiscount_Amount,
					"QoDisCP3": 0,
					"QoDisCP4": 0,
					"QoDisCM4": 0,
					"QoDisCP5": item.FreeGoods_Amount,
					"QoDisCM5": item.FreeGoods_Percentage,
					"QoDisCP6": item.AnnualDiscount_Percentage,
					"QoDisCM6": item.AnnualDiscountForBranch,
					"PASNumber": item.OfferID,
					"Unmsr": item.UserName,
					"cusno": item.External_InstituteId,
					"susnm": item.InstituteName,
					"ProdNo": item.SKUCode,
					"ProdName": item.PRODUCTPACKNAME,
					"Territory": item.KAM_Territory,
					"BasePrice": Number(item.Price0),
					"SDSNo.": item.CNPJ,
					"SLSNO": item.KAM_Territory,
					"CurrentBasePrice": Number(item.Price0),
					"STS": item.Status
				}
			});
		}
		
		if (mappedZuelligExtract.length === 0) return req.reject(404, "No Zuellig Extracts were found"); ;
		// Converts your Array<Object> to a CsvOutput string based on the configs
		const csv = generateCsv(csvConfig)(mappedZuelligExtract);

		req._.res.setHeader('Content-disposition', `attachment; filename=ZuelligExtract.csv`);
		req._.res.setHeader('Content-type', 'text/csv');

		return _createStream(csv);
	});

	function _createStream (data) {        
		const buffer = new Buffer.from(asString(data))          
		const stream = new Readable()        
		stream.push(buffer)        
		stream.push(null)        
	
		return { value: stream }    
	}
}