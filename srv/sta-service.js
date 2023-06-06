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
		PT_TMINST, PT_TMDIST, CountryApprovers, ApproverTypes, MASTER_COUNTRY_CHANNELS, PT_TMPRDPCK, CountryPreApprovedPrices, AccountPreApprovedPrices, PT_TMSKUPRDPCK, RoyalDecree, MasterPrices, MASTER_TENDER_TYPE,PT_TMPRDHIER
	} = cds.entities("com.bayer.SXTENDER.MasterData");
	const {
		OfferConsolidation, OfferProductConsolidation, ApprovalRequests, ProductPricingView, PriceConditionView, TenderHistorySpain, PriceConditionBrazilView, OfferValues, OfferStatus
	} = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");
	const {
		PT_TMTEND, 
		PT_TMDLVTR, 
		PT_TMUDLTRS, 
		PT_TMAPPRST, 
		PT_TMOFPR,
		PT_TMOFRS,
		FreeGoodsOther, 
		CandidatePrices, 
		ProductPricing, 
		PriceCondition, 
		DiscountCondition, 
		PriceConditionClassification, 
		ProductTypeProfitability,
		CountrySpecificTenderInfo
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
  
	srv.on('READ', 'InstituteDistributorBrandProduct', async (req) => {
		// const tx = cds.transaction(req)
		const tx = cds.tx(req);
		let results = [];
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
		}
		// sort by countrycode, then brand name, then product name
		results.sort((a,b)=> ( a.COUNTRY_CODE.localeCompare(b.COUNTRY_CODE) || a.BRAND_NAME.localeCompare(b.BRAND_NAME) || a.PRODUCT_NAME.localeCompare(b.PRODUCT_NAME)   ));




		return results;
	});
	*/

	// srv.on(['CREATE','UPDATE','DELETE'], 'AwardCriteriaTableView', async (req, next) => { 
			
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

		// validate form
		!req.data.TenderName && req.error({ code: 404, message: "TenderName is required.", target: "TenderName" });
		!req.data.Classification && req.error({ code: 404, message: "Classification is required.", target: "Classification" });
		!req.data.InstituteID && req.error({ code: 404, message: "InstituteName is required.", target: "InstituteName" });
		!req.data.InstituteType && req.error({ code: 404, message: "InstituteType is required.", target: "InstituteType" });
		!req.data.TenderChannel && req.error({ code: 404, message: "TenderChannel is required.", target: "TenderChannel" });
		!req.data.PublicationDate && req.error({ code: 404, message: "PublicationDate is required.", target: "PublicationDate" });
		!req.data.BidDueDate && req.error({ code: 404, message: "BidDueDate is required.", target: "BidDueDate" });

		//check if dates are correct
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
	});

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferFormView', async (req) => {
		delete req.data.OfferDueDate;
	});


	srv.before(['CREATE','UPDATE'], 'PriceConditionPriceView', async (req) => {

		// validate form
		req.data.OfferPrice && Number(req.data.OfferPrice) > Number(req.data.BasePrice) && req.error({ code: 404, message: "OfferPrice should not be greater than BasePrice.", target: "OfferPrice" });
		
	});

	srv.on(['CREATE','UPDATE'], 'PriceConditionPriceView', async (req) => {

		// save/update PriceCondition
		if(req.data.PriceConditionID){
			await UPDATE(PriceCondition)
				.with ({
					Price1: req.data.OfferPrice, 
					Level2Discount1: req.data.Deductions
				})
				.where({
					ID:req.data.PriceConditionID
				})
		}else{
			await INSERT.into(PriceCondition).entries({
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
			});
		}

		return req.data;
		
	});

	srv.after('READ', 'PriceConditionPriceView', (items, req) => {

		const fnCalculateFields = async item => {
			item.Discount = (item.BasePrice - item.OfferPrice) / 100;
			item.NetPrice = item.OfferPrice * (1 - item.Deductions); 
		};

		if(Array.isArray(items)){
			return items.map(fnCalculateFields)
		}else{
			return fnCalculateFields(items);
		}

	
	});

}