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

module.exports = (srv) => {

	// Use reflection to get the csn definition
	const {
		CountryBrandProducts, LegalEntityBrand, DirectBrand, DistributorBrand
	} = cds.entities("com.bayer.SXTENDER.MasterDataViews");
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
		PT_TMCTRY
	} = cds.entities("com.bayer.SXTENDER.MasterData");
	const {
		OfferConsolidation, OfferProductConsolidation, ApprovalRequests, ProductPricingView, PriceConditionView, TenderHistorySpain, PriceConditionBrazilView, OfferValues, OfferStatus
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
		PT_TMTNOFST
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
		SchedulerApiConfig,
		SchedulerApiConfigOAuth
	} = cds.entities("com.bayer.SXTENDER.AdminData");
	const {
		ProductPolicies, PolicyPrices
	} = cds.entities("com.bayer.SXTENDER.PricingPolicyData");

	const {
		LatestApprovedBrandPolicies
	} = cds.entities("PolicyService");


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

			searchValue = req.query.SELECT.where[16]?.xpr?.[0]?.args[1]?.val;
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

		// validate form
		!req.data.TenderName && req.error({ code: 404, message: "Tender Reference is required.", target: "TenderName" });
		!req.data.Classification && req.error({ code: 404, message: "Classification is required.", target: "Classification" });
		!req.data.InstituteID && req.error({ code: 404, message: "Institute Name is required.", target: "InstituteName" });
		!req.data.InstituteType && req.error({ code: 404, message: "Institute Type is required.", target: "InstituteType" });
		!req.data.TenderChannel && req.error({ code: 404, message: "Tender Channel is required.", target: "TenderChannel" });
		!req.data.PublicationDate && req.error({ code: 404, message: "Publication Date is required.", target: "PublicationDate" });
		!req.data.BidDueDate && req.error({ code: 404, message: "Offer Due Date is required.", target: "BidDueDate" });
		!req.data.SubmittedBy && req.error({ code: 404, message: "Created By is required.", target: "SubmittedBy" });

		//check if dates are correct
		if(moment(req.data.PublicationDate).isBefore(today))
			req.error({ code: 404, message: "Publication date can not be in the past.", target: "PublicationDate" });
		if(!moment(req.data.PublicationDate).isBefore(req.data.BidDueDate))
			req.error({ code: 404, message: "Publication date should be before the offer due date.", target: "PublicationDate" });

		if(req.data.AwardDate){

			if(!moment(req.data.BidDueDate).isBefore(req.data.AwardDate))
				req.error({ code: 404, message: "BidDueDate date should be before the Award date.", target: "BidDueDate" });

			if(req.data.NextPublicationDye && !moment(req.data.AwardDate).isBefore(req.data.NextPublicationDye))
				req.error({ code: 404, message: "Award date should be before the next publication date.", target: "NextPublicationDye" });
		}	
		
		// remove associations data
		delete req.data.InstituteName;
		delete req.data.InstituteType;
		delete req.data.DirectTender;
	});

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferFormView', async (req) => {

		// validate form
		!req.data.DistributorID &&  req.error({ code: 404, message: "DistributorName is required.", target: "DistributorID" });
		!req.data.SellingCompany && req.error({ code: 404, message: "SellingCompany is required.", target: "SellingCompany" });
		!req.data.Division && req.error({ code: 404, message: "Division is required.", target: "Division" });
		!req.data.InternalBidDueDate && req.error({ code: 404, message: "InternalBidDueDate is required.", target: "InternalBidDueDate" });
        !req.data.Custom_String_1 && req.error({ code: 404, message: "Payment Term is required.", target: "Custom_String_1" });
		
		delete req.data.OfferDueDate;
		delete req.data.OfferStatus;
		delete req.data.InstituteID;
        delete req.data.Channel;
	});


	srv.before(['CREATE','UPDATE'], ['PriceConditionPriceView','PriceConditionDiscountView'], async (req) => {

		// validate form
		req.data.OfferPrice && Number(req.data.OfferPrice) > Number(req.data.BasePrice) && req.error({ code: 404, message: "OfferPrice should not be greater than BasePrice.", target: "OfferPrice" });
		
	});

	srv.on(['CREATE','UPDATE','DELETE'], 'AwardedProductFormView', async (req) => {
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
			LotID: req.data.LotID
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
					Submittedby: "ELLTZ", //sSubmittedBy,
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

	srv.on(['CREATE','UPDATE'], ['PriceConditionPriceView','PriceConditionDiscountView'], async (req) => {
		upsertPriceCondition(req);
		upsertProductPricing(req);
		return req.data;
	});

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

		const mappedPriceCondition = {
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
		}

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
		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID:  req.data.OfferID});

		const mappedPTTMBDPR = {
			TenderID              : req.data.TenderID, 
			OfferID               : req.data.OfferID, 
			CountryCode           : req.data.CountryCode, 
			ProductCode           : req.data.ProductCode, 
			SubmittedOn           : new Date().toISOString(), 
			SubmittedBy           : req.user.id, 
			Active                : 1, 
			Tier                  : 1, 
			VolumeFrom            : 0, 
			VolumeTo              : 0, 
			RegPrice              : req.data.BasePrice, 
			FOC                   : 0, 
			// FOCStep               : null, 
			// FOCType               : null, 
			Discount              : 0, 
			OfferPrice            : req.data.OfferPrice, 
			Deductions            : 0, 
			StandardDiscount      : 0, 
			AdditionalDiscount    : 0, 
			NetofferPrice         : req.data.NetOfferPrice, 
			BusinessCasePrice     : 0, 
			// WholesalePrice        : null, 
			COGS                  : 0, 
			SpotRate              : 0, 	
			BudgetRate            : 0, 
			Scenario              : 0, 
			// FOC_ABS_PCT           : null, 
			FOC_Bundled_1         : 0, 
			FOC_ABS_PCT_Bundled_1 : 0, 
			FOCProduct_Bundled_1  : 0, 
			ActiveTier            : 0, 
			NetPrice              : req.data.NetPrice, 
			NetPrice_OfPaid       : 0, 
			PRICE_UPDATE          : offer.APPROVALS_SENT, 
			LotID                 : 1, 
			// Deductions_ABS_PCT    : null
		}

		if(productPricing){
			await UPDATE(PT_TMBDPR).with (mappedPTTMBDPR).where(whereCondition)
		}else{
			await INSERT.into(PT_TMBDPR).entries(mappedPTTMBDPR);
		}
	}

	srv.after('READ', ['PriceConditionPriceView','PriceConditionDiscountView'], (items, req) => {
		const fnCalculateFields = async item => {
			item.Discount = (item.BasePrice - item.OfferPrice) / item.BasePrice;
			item.NetPrice = item.OfferPrice * (1 - item.Deductions); 
		};
		if(Array.isArray(items)){
			return items.map(fnCalculateFields)
		}else{
			return fnCalculateFields(items);
		}
	});

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

		if (!offerValidation.COUNTRYCODE) return results;

		//get ApproverTypes
		if (offerValidation) {
			approverTypes = offerValidation.ApproverTypes;
		}

		return await buildValidationEntryNew(approverTypes, latestApproval, offerValidation, countryApprovers);

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
		
		//if we have products for the offer the offerProductValidation
		if (offerProductValidation.length === 0) {
			//no products
			return results;
		} else {

			//only keep 1 approvertypes array (an array exists for each product)
			aDistinctApproverTypes = offerProductValidation[0].ApproverTypes;

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
		let paymentTerms = "";
		let paymentTermsDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { 
			if(d && d.PAYMENT_TERMS){
				return d.PAYMENT_TERMS;
			}else{
				return 'NA';
			}		
		}));
		if (paymentTermsDistinct.length === 1) {
			paymentTerms = paymentTermsDistinct[0];
		}
		else {
			let paymentTermsRow = [];
			for (let i = 0; i < paymentTermsDistinct.length; i++) {
				let paymentTermsItems = offerProductValidation.filter((d) => d.PAYMENT_TERMS === paymentTermsDistinct[i]).map((d) => { return d.SORTER }).join(",");
				paymentTermsRow[i] = paymentTermsItems.concat(": ").concat(paymentTermsDistinct[i]);
			}
			paymentTerms = paymentTermsRow.join("<br>")
		}

	
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
			INSTITUTE_TYPE: offer.INSTITUTE_TYPE,
			INSTITUTE_STATE: offer.INSTITUTE_STATE,
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

	async function buildValidationEntryNew(approverTypes, latestApproval, offerValidation, countryApprovers) {

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
			let defaultForType = mapDefaultCountryApprovers(countryApprovers, type.ApproverType, offerValidation);

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

		return aResults;
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
			let sApproverTypeAttrName = oApproverType.ApproverType.replace(/\s/g, '_').toUpperCase();

			//get max ValidationType
			offerProductValidation.map((productValidation) => {

				//keep current validation type
				let iValidationType = oApproverType.ValidationType;

				//check if a product is found with a higher calculated validation type for the same approverType as the current
				if (oApproverType.ValidationType < productValidation.ApproverTypes.find(approverType => approverType.ApproverType === sApproverType).ValidationType) {
					iValidationType = productValidation.ApproverTypes.find(approverType => approverType.ApproverType === sApproverType).ValidationType;
				};

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

	function mapDefaultCountryApprovers(countryApprovers, approverType, offerValidation) {
		if (!offerValidation.DIVISION || offerValidation.DIVISION === "Both") {
			//take all approver types
			return countryApprovers.filter((d) => d.ApproverType === approverType);
		} else {
			//take approver types division which maches the offervalidation Division + division = both
			return countryApprovers.filter((d) => d.ApproverType === approverType && (d.Division === offerValidation.DIVISION || d.Division === "Both"));
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
			let productInfo = await buildProductInfoForCountry(tx, offer, offerProduct, aTempApproverTypes, institute, offerProductsTotalValue);
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

			//Get corresponding ProductPack
			const whereProductPack = {
				PRODUCTPACKID: offerProduct.ProductCode,
			}
			const productPack = await tx.run(SELECT.from(PT_TMPRDPCK).where(whereProductPack));

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
				REQUESTED_QUANTITY: productInfo.CommnonProductInfo.RequestedQuantityString,
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
				IBIZWORKFLOWID: offerProduct.IBIZWORKFLOWID
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

	async function buildProductInfoForCountry(tx, offer, product, aApproverTypes, institute, offerProductsTotalValue) {
		let commnonProductInfo = buildCommonProductInfo(offer, product);
		let productValidation = {};

		if (offer.APPROVAL_TYPE === 12) { //Default for standard tender app
			productValidation = await buildProductValidationForType12(tx, offer, product, commnonProductInfo, aApproverTypes, offerProductsTotalValue)
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
}