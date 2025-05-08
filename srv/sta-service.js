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
const XLSX = require("xlsx");
const { isGeneratorFunction } = require('util/types');

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
		MandatoryFieldsView,
		FormFieldsView
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
		MasterCompetitors, 
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
		PT_TMINSHIER,
		UserTerritory,
		InstituteTerritory,
		PricingPolicy
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
		ZuelligExtractView,
		StandardTenderHistory,
		PriceConditionCurrentSectionTaiwanView,
		BrandsInTender,
		StandardTenderPriceConditionView
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
		TransCompetitorResult,
		OutgoingMails,
		NLPriceConditions,
		AwardedOfferDistributors,
		ContractInfomation,
		CCMPriceCondition
	} = cds.entities("com.bayer.SXTENDER.TransactionalData");
	const {
		Template, 
		TemplateCountry, 
		MandatoryTableFieldsCountry, 
		MailTemplate, 
		PT_TMUSER, 
		PT_TMUSERCTRY,
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
		InstitutesView,
		InstituteInBranchView,
		TenderMasterView,
		AwardedProductFormView,
		ZagisUploadFile,
		ExtractNLHistoricalInformation,
		NLExtractOffers,
		SalesReportsView
	} = cds.entities("StandardAppService");

	const {

	} = cds.entities()


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
		try{
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
		}
		catch(error){
			console.error('Error in InstituteDistributorBrandProduct READ');
			return req.reject(403, error?.message||"Error in InstituteDistributorBrandProduct");
		}
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

	srv.on('READ', 'InstitutesView', async (req, next) => {
		try{
		//const result = await next(); // Allow the original query to run
		const tx = cds.tx(req);
		let result = [];
        let ivQuery = SELECT.from(req.query.SELECT.from);
        if (req.query.SELECT.columns?.[0]?.func !== "count") {
            ivQuery.columns(req.query.SELECT.columns);
        }
        req.query.SELECT.where && (ivQuery.where(req.query.SELECT.where));
        req.query.SELECT.orderBy && (ivQuery.orderBy(req.query.SELECT.orderBy));

        result = await tx.run(ivQuery);

		// Check if the result contains $count
    	const isCountQuery = Array.isArray(result) && result.some(item => '$count' in item);
    
		if (isCountQuery) {
		// If $count is present, return the original result
		return result;
		}
		
		const cwid = req.user.id;
		const userTerritories = await SELECT.from(UserTerritory).where({ UserID: cwid });
	  
		if (!userTerritories || userTerritories.length === 0 || userTerritories.some(ut => ut.TERRITORY === null)) {
		  // If no user territories found, return all items
		  return result;
		}

		const resultsArray = Array.isArray(result) ? result : [result];
	  
		const territoryMatches = resultsArray.filter(item => {
			return userTerritories.some(userTerritory => {
				return item.Territory === userTerritory.Territory;
			});
		  });
		  
		const finalFilteredResults = territoryMatches.filter(item => {
			return userTerritories.some(userTerritory => {
				return (item.Territory === userTerritory.Territory && item.IsKAM === userTerritory.IsKAM);
			});
		});
			
		if (finalFilteredResults.length > 0) {
			// Return the final filtered results
			return finalFilteredResults;
		}else{
			// If no territory matches, return an empty array
			return territoryMatches;
		}
		}
		catch(error){
            console.error('Error in InstitutesView READ');
            return req.reject(403, error?.message||"Error in InstitutesView");
        }
	});

	srv.on('READ', 'TenderMasterView', async (req, next) => {
		try{
		//const result = await next(); // Allow the original query to run
		// Check if the result contains $count
		const tx = cds.tx(req);
		
		let result = [];
        let tmvQuery = SELECT.from(req.query.SELECT.from);
        if (req.query.SELECT.columns?.[0]?.func !== "count") {
            tmvQuery.columns(req.query.SELECT.columns);
        }
		let countryCode =  req.query.SELECT.where && ServiceHelper.getWhereValues(req, 'CountryCode') || []; 

        req.query.SELECT.where && (tmvQuery.where(req.query.SELECT.where));
        req.query.SELECT.orderBy && (tmvQuery.orderBy(req.query.SELECT.orderBy));
        //req.query.SELECT.limit && countryCode[0] !== 'TW' && (tmvQuery.limit(req.query.SELECT.limit));

        result = await tx.run(tmvQuery);

    	const isCountQuery = Array.isArray(result) && result.some(item => '$count' in item);
    
		// Custom sorting function
		const applyCustomSorting = (data) => {
			return data.sort((a, b) => {
				const tenderHistA = a.TenderID?.includes('HIST') ? 1 : 0;
				const tenderHistB = b.TenderID?.includes('HIST') ? 1 : 0;
		
				const offerHistA = a.OfferID?.includes('HIST') ? 1 : 0;
				const offerHistB = b.OfferID?.includes('HIST') ? 1 : 0;
		
				if (tenderHistA !== tenderHistB) return tenderHistA - tenderHistB;
				if (offerHistA !== offerHistB) return offerHistA - offerHistB;
		
				const tenderIdComparison = b.TenderID.localeCompare(a.TenderID);
				if (tenderIdComparison !== 0) return tenderIdComparison;
		
				return b.OfferID.localeCompare(a.OfferID);
			});
		};

		if (isCountQuery || (countryCode[0] !== 'TW' && countryCode[0] !== 'PL') || countryCode.length <= 0) {
		// If $count is present, return the original result
			return applyCustomSorting(result);
		}
		
		const cwid = req.user.id;
		const userTerritories = await SELECT.from(UserTerritory).where({ UserID: cwid });
		const instituteTerritory = await SELECT.from(InstituteTerritory);

		// Taiwan doesn't have standart limit method tmvQuery.limit(req.query.SELECT.limit); instead of that returning empty array if offset and result lengts are same
		if (
			Array.isArray(countryCode) && 
			countryCode.length > 0 && countryCode[0] === 'TW' && 
			req.query.SELECT.limit?.offset?.val == result.length
			) {
			return [];
		}
	  
		if (!userTerritories || userTerritories.length === 0 || userTerritories.some(ut => ut.TERRITORY === null)) {
		  // If no user territories found, return all items
		  return applyCustomSorting(result);
		}

		let resultsArray = Array.isArray(result) ? result : [result];
	  
		// const territoryMatches = resultsArray.filter(item => {
		// 	return userTerritories.some(userTerritory => {
		// 	  return item.Territory === userTerritory.Territory;
		// 	});
		//   });
		  
		// const finalFilteredResults = territoryMatches.filter(item => {
		// 	return userTerritories.some(userTerritory => {
		// 	return (item.Territory === userTerritory.Territory && item.IsKAM === userTerritory.IsKAM);
		// 	});
		// });
		// resultsArray = resultsArray.filter(ra => ra.createdBy === cwid);
		const territoryMatches = resultsArray.filter(item => {
			const filteredInstituteTerritory = instituteTerritory.filter(it => it.InstituteID === item.InstituteID);
			
			return userTerritories.some(userTerritory => {
				const territoryIndex = filteredInstituteTerritory.findIndex(el => el.Territory === userTerritory.Territory);
			  	return territoryIndex !== -1;
			});
		  });
		  
		const finalFilteredResults = territoryMatches.filter(item => {
			const filteredInstituteTerritory = instituteTerritory.filter(it => it.InstituteID === item.InstituteID);
			
			return userTerritories.some(userTerritory => {
				const territoryIndex = filteredInstituteTerritory.findIndex(el => el.Territory === userTerritory.Territory && el.IsKAM === userTerritory.IsKAM);
			  	return territoryIndex !== -1;
			});
		});

		// Taiwan doesn't have standart limit method tmvQuery.limit(req.query.SELECT.limit); instead of that returning empty array if offset and final result lengts are same
		if (
			Array.isArray(countryCode) && 
			countryCode.length > 0 && 
			countryCode[0] === 'TW' && 
			(
				req.query.SELECT.limit?.offset?.val == finalFilteredResults.length || 
				req.query.SELECT.limit?.offset?.val == territoryMatches.length)
			) {
			return [];
		}
			
		if (finalFilteredResults.length > 0) {
			// Return the final filtered results
			return applyCustomSorting(finalFilteredResults);
		}else{
			// If no territory matches, return an empty array
			return applyCustomSorting(territoryMatches);
		}
		}
		catch(error){
            console.error('Error in TenderMasterView READ');
            return req.reject(403, error?.message||"Error in TenderMasterView");
        }
	  });

	srv.before(['CREATE','UPDATE','DELETE'], 'TenderFormView', async (req) => {
		try{
		const today = new Date().toISOString().slice(0, 10);

		let mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: 'Tender', CountryCode: req?.data?.CountryCode, ProductScope: req?.data?.ExternalID}));

		if(req?.data?.CountryCode === 'ES'){
			// Exclude specific fields based on Classification
			if (req.data.Classification === 'Commercial Agreement') {
				mandatoryFielddata = mandatoryFielddata.filter(item => 
					item.Label !== 'Publication Date' && 
					item.Label !== 'Offer Due Date' &&
					item.Label !== 'Tender Type' &&
					item.Label !== 'Tender Type 2' &&
					item.Label !== 'Contract Length [months]'
				);
			} else if (req.data.Classification === 'Tender') {
				mandatoryFielddata = mandatoryFielddata.filter(item => 
					item.Label !== 'Effective Date' &&
					item.Label !== 'Expiry Date'
				);
			}
		}

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
		if (!(req?.data?.CountryCode === 'ES' && req.data.Classification === 'Commercial Agreement')) {
			if(!moment(req.data.PublicationDate).isBefore(req.data.BidDueDate))
				req.error({ code: 404, message: "Publication date should be before the offer due date.", target: "PublicationDate" });
		}
		
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
		delete req.data.State;
		delete req.data.ParentInstituteID;
		delete req.data.External_InstituteId;
		delete req.data.Address;
		delete req.data.Region;
		delete req.data.CustomerID;
		delete req.data.ProvinceName;
		delete req.data.City;
		delete req.data.CifCode;
		delete req.data.RegionalHealthSystem;
		}
		catch(error){
            console.error('Error in TenderFormView CREATE');
            return req.reject(403, error?.message||"Error in TenderFormView");
        }

	});

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferFormView', async (req) => {
		try{
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
		if (req.data.CountryCode === 'NL' || req.data.CountryCode === 'PL') {
			const masterDistributor =  await SELECT.one.from('StandardAppService.MasterDistributors').where({CountryCode: req.data.CountryCode, DistributorName: "Defined at results Level"})
			req.data.DistributorID = masterDistributor?.DistributorID
		}

		if (req.data.CountryCode.toLowerCase().includes('hm') && (req.event == 'CREATE' || req.method == 'CREATE')) {
			const formFieldsData = await UITemplatesService.run(SELECT.from(FormFieldsView).where({Section: {in: ['ComplianceOfficer', 'SupplyManagement', 'GlobalStrategicMarketing']}, CountryCode: req?.data?.CountryCode, ProductScope: req?.data?.DistributorComments}));
			const { data } = mappedHaematologyFields(req, formFieldsData);
			req.data = data;
		}
		await resetProductPaymentSupplyFields(req.data.OfferID);

		req.data.NewOfferDueDate = req.data.OfferDueDate;
		req.data.DistributorComments = null; //for mandatory field check in sta-service
		delete req.data.OfferDueDate;
		delete req.data.OfferStatus;
		delete req.data.InstituteID;
        delete req.data.Channel;
        delete req.data.TenderName;
		}
		catch(error){
            console.error('Error in OfferFormView CREATE');
            return req.reject(403, error?.message||"Error in OfferFormView");
        }
	});
	srv.before(['CREATE', 'UPDATE'], ['ComplianceOfficerView', 'SupplyManagementView', 'GlobalStrategicMarketingView'], async (req) => {
		try{
		const sections = {
			'StandardAppService.ComplianceOfficerView': 'ComplianceOfficer',
			'StandardAppService.SupplyManagementView': 'SupplyManagement',
			'StandardAppService.GlobalStrategicMarketingView': 'GlobalStrategicMarketing'
		};
		const mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: sections[req.entity], CountryCode: req?.data?.CountryCode, ProductScope: req?.data?.DistributorComments}));
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
		}
		catch(error){
            console.error('Error in OfferFormView CREATE');
            return req.reject(403, error?.message||"Error in OfferFormView");
        }
	});

	srv.on('UPDATE', ['ComplianceOfficerView', 'SupplyManagementView', 'GlobalStrategicMarketingView'], async (req) => {
		const sections = {
			'StandardAppService.ComplianceOfficerView': 'ComplianceOfficer',
			'StandardAppService.SupplyManagementView': 'SupplyManagement',
			'StandardAppService.GlobalStrategicMarketingView': 'GlobalStrategicMarketing'
		};
		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID: req.data.OfferID});
		const formFieldsData = await UITemplatesService.run(SELECT.from(FormFieldsView).where({Section: sections[req.entity], CountryCode: req?.data?.CountryCode, ProductScope: req?.data?.DistributorComments}));
		const { mappedFields } = mappedHaematologyFields(req, formFieldsData);
		await resetProductPaymentSupplyFields(req.data.OfferID);
		mappedFields.APPROVALS_SENT = 0; // Needed to revert Offer status back to Offer Created when updating those 3 forms
		if (offer) {
			await UPDATE(PT_TMOFRS).with(mappedFields).where({OfferID: req.data.OfferID});
		}
	});

	/**
	 * 
	 * @param {Object} req  Request object containing additional data
	 * @param {Object} entity Entity name of the request
	 * @param {[Objects]} entity Form field paths of Haematology Offer forms from UITemplates service 
	 * @returns Updated requset data if entity name is StandardAppService.OfferFormView resets field values of Compliance Officer, Supply Management and Global Strategic Marketing forms
	 * otherwise returns mappedFields with only updated values from ui side
	 */
	const mappedHaematologyFields = function ({data, entity}, formFieldsData) {
		const mappedFields = {};
		formFieldsData.forEach(el => {
			if (entity == 'StandardAppService.OfferFormView') {
				data[el.Field] = null;
			}else {
				mappedFields[el.Field] = data?.[el.Field];
			}
		});
		return {
			data,
			mappedFields
		};
	};

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferProductsTableView', async (req) => {
		try{
		await resetApprovalsSent(req.data.OfferID);
		await resetProductPaymentSupplyFields(req.data.OfferID);

		delete req.data.ProductPackName;
		delete req.data.NetPrice;
		delete req.data.TotalAmount;
		delete req.data.Region;
		delete req.data.ContractDuration_1;
		delete req.data.OfferPrice_1;
		delete req.data.ContractDuration_2;
		delete req.data.OfferPrice_2;
		delete req.data.ContractDuration_3;
		delete req.data.OfferPrice_3;
		delete req.data.NetPriceFOC;
		delete req.data.cogsUoM;
		delete req.data.GrossSales;
		delete req.data.GrossProfit;
		delete req.data.GrossMargin;
		}
		catch(error){
            console.error('Error in OfferProductsTableView CREATE');
            return req.reject(403, error?.message||"Error in OfferProductsTableView");
        }
	});

	srv.on('copyOffer', async (req) => {
		try{
		const { data: {offerID,type, QuotationInstituteID} } = req;

		!offerID && req.error({ code: 404, message: "OfferID was not provided", target: "OfferID" });
		!type && req.error({ code: 404, message: "Type was not provided. ('revisedoffer'|'continuedoffer')", target: "Type" });


		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID: offerID, ActiveOffer: 1});
		const offerStatus = await SELECT.one.from(PT_TMTNOFST).where({OfferID: offerID, Active: 1});
		//const parentOfferID = offerID.split('-').slice(0,4).join("-");
		let parentOfferID = offerID.match(/[A-Za-z0-9-]+-\d+/);
		parentOfferID = parentOfferID ? parentOfferID[0] : offerID;
		const parentOffer = await SELECT.one.from(PT_TMOFRS).where({OfferID: parentOfferID});

		// checks 
		if(!offer){
			return req.error({ code: 403, message: `Offer "${offerID}" is not active. Only active offer can be copied.`, target: "PT_TMOFRS"});
		}

		if(offerStatus.STATUS !== "Delivery Ongoing" && offerStatus.STATUS !== "Quotation Submitted" && offerStatus.STATUS !== "Results Recorded"){
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
		const awardedProducts = await SELECT.from(PT_TMTRRES).where({OfferID: offerID});
		

		switch(type){
			case "revisedoffer": return createRevisedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, priceCondtions, freeGoodsOther, req});
			case "continuedoffer": return createContinuedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, priceCondtions, freeGoodsOther, req});
			case "affiliateoffer": return createAffiliateOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, nextOfferID, institute, priceCondtions, freeGoodsOther, req});
			case "differentawardprice": return createDifferentAwardPrice({offer, parentOffer, offerStatus, offerProducts, productPricing, nextOfferID, institute, priceCondtions, freeGoodsOther, awardedProducts, req});
		}
		}
		catch(error){
            console.error('Error in copyOffer');
            return req.reject(403, error?.message||"Error in copyOffer");
        }
	});

	async function createRevisedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, priceCondtions, freeGoodsOther, req}){
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
		revisedOfferStatus.TableStatus = null;
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

		const revisedProductsPriceCondtions = priceCondtions.map(pc => {
			const rpc = {...pc};
			rpc.OfferID = revisedOfferID;
			rpc.ID = uuidv4();
			return rpc;
		});

		const revisedFreeGoodsOther = freeGoodsOther.map(fg => {
			const rfg = {...fg};
			const pricecondtion = revisedProductsPriceCondtions.find(pc => pc.ProductCode === rfg.ProductPackId);
			rfg.ID = uuidv4();
			rfg.PriceCondition_ID = pricecondtion.ID;
			return rfg;
		});

		// 1. create revised offer
		await INSERT.into(PT_TMOFRS).entries(revisedOffer);
		// 2. create revised offer status
		await INSERT.into(PT_TMTNOFST).entries(revisedOfferStatus);
		// 3. create revised products
		await INSERT.into(PT_TMOFPR).entries(revisedOfferProducts);
		// 4. create product pricing
		await INSERT.into(PT_TMBDPR).entries(revisedProductsPricing);
		// 5. create price condtions
		await INSERT.into(PriceCondition).entries(revisedProductsPriceCondtions);
		if (revisedFreeGoodsOther.length > 0) {
			// 6. create free goods other
			await INSERT.into(FreeGoodsOther).entries(revisedFreeGoodsOther);
		}
		// 7. deactivate old offer by setting ActiveOffer = 0 only for Revised offer (not needed for Continued offer)
		offer.ActiveOffer = 0;
		await UPDATE(PT_TMOFRS).with (offer).where({OfferID: offer.OfferID});
		offerStatus.STATUS = "Inactive";
		await UPDATE(PT_TMTNOFST).with (offerStatus).where({OfferID: offer.OfferID});
		// 8. update the parent offer
		parentOffer.RevisedOfferNo = parentOffer.RevisedOfferNo + 1;
		parentOffer.ActiveOffer = 0;
		await UPDATE(PT_TMOFRS).with (parentOffer).where({OfferID: parentOffer.OfferID});

		return revisedOfferID;
	};


	async function createContinuedOffer({offer, parentOffer, offerStatus, offerProducts, productPricing, offerRevision, priceCondtions, freeGoodsOther, req}){

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
		continuedOfferStatus.TableStatus = null;
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

		const continuedProductsPriceCondtions = priceCondtions.map(pc => {
			const cpc = {...pc};
			cpc.OfferID = continuedOfferID;
			cpc.ID = uuidv4();
			return cpc;
		});

		const continuedFreeGoodsOther = freeGoodsOther.map(fg => {
			const cfg = {...fg};
			const pricecondtion = continuedProductsPriceCondtions.find(pc => pc.ProductCode === cfg.ProductPackId);
			cfg.ID = uuidv4();
			cfg.PriceCondition_ID = pricecondtion.ID;
			return cfg;
		});

		// 1. create revised offer
		await INSERT.into(PT_TMOFRS).entries(continuedOffer);
		// 2. create revised offer status
		await INSERT.into(PT_TMTNOFST).entries(continuedOfferStatus);
		// 3. create revised products
		await INSERT.into(PT_TMOFPR).entries(continuedOfferProducts);
		// 4. create product pricing
		await INSERT.into(PT_TMBDPR).entries(continuedProductsPricing);
		// 5. create price condtions
		await INSERT.into(PriceCondition).entries(continuedProductsPriceCondtions);
		if (continuedFreeGoodsOther.length > 0) {
			// 5. create free goods other
			await INSERT.into(FreeGoodsOther).entries(continuedFreeGoodsOther);
		}
		// 6. update  parentOffer
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
		affiliateOfferStatus.TableStatus = null;
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
			const pricecondtion = affiliateProductsPriceCondtions.find(pc => pc.ProductCode === afg.ProductPackId);
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

	async function createDifferentAwardPrice({offer, parentOffer, offerStatus, offerProducts, productPricing, nextOfferID, institute, priceCondtions, freeGoodsOther, awardedProducts, req}){
		const differentAwardPriceOfferID = `${nextOfferID.TENDERID}-${nextOfferID.NEXTOFFERID}`;
		const differentAwardPriceOffer = {...offer};
		const todaysDate = new Date().toISOString().substring(0,10);
		differentAwardPriceOffer.OfferID = differentAwardPriceOfferID;
		differentAwardPriceOffer.CreationDate = todaysDate;
		differentAwardPriceOffer.InternalBidDueDate = todaysDate;
		differentAwardPriceOffer.NewOfferDueDate = todaysDate;	
		differentAwardPriceOffer.TenderOfferNo = nextOfferID.NEXTOFFERID;
		differentAwardPriceOffer.DifferentAwardPriceParentOfferID = parentOffer.OfferID;


		const differentAwardPriceOfferStatus = {...offerStatus};
		differentAwardPriceOfferStatus.OfferID = differentAwardPriceOfferID;
		differentAwardPriceOfferStatus.STATUS = "Offer Created";
		differentAwardPriceOfferStatus.TableStatus = null;
		differentAwardPriceOfferStatus.Date = todaysDate;

		const filteredAwardedProducts = awardedProducts.filter(pr => pr.Outcome === 'Award Price Update');

		offerProducts = offerProducts.filter(ofpr => {
			const isProducIncluded = filteredAwardedProducts.findIndex(ap => ap.ProductCode === ofpr.ProductCode);
			if (isProducIncluded > -1) return ofpr;
		});

		productPricing = productPricing.filter(price => {
			const isPriceIncluded = filteredAwardedProducts.findIndex(ap => ap.ProductCode === price.ProductCode);
			if (isPriceIncluded > -1) return price;
		});

		priceCondtions = priceCondtions.filter(pc => {
			const isPriceConditionIncluded = filteredAwardedProducts.findIndex(ap => ap.ProductCode === pc.ProductCode);
			if (isPriceConditionIncluded > -1) return pc;
		});

		freeGoodsOther = freeGoodsOther.filter(fg => {
			const isFreeGoodsOtherIncluded = filteredAwardedProducts.findIndex(ap => ap.ProductCode === fg.ProductPackId);
			if (isFreeGoodsOtherIncluded > -1) return fg;
		});

		const dapOfferProducts = offerProducts.map(pr => {
			const affiliateProduct = {...pr};
			affiliateProduct.OfferID = differentAwardPriceOfferID;
			return affiliateProduct;
		});

		const dapProductsPricing = productPricing.map(pr => {
			const app = {...pr};
			app.OfferID = differentAwardPriceOfferID;
			app.SubmittedOn = todaysDate;
			return app;
		});

		const dapPriceCondtions = priceCondtions.map(pc => {
			const apc = {...pc};
			apc.OfferID = differentAwardPriceOfferID;
			apc.ID = uuidv4();
			return apc;
		});

		const dapFreeGoodsOther = freeGoodsOther.map(fg => {
			const afg = {...fg};
			const pricecondtion = dapPriceCondtions.find(pc => pc.ProductCode === afg.ProductPackId);
			afg.ID = uuidv4();
			afg.PriceCondition_ID = pricecondtion.ID;
			return afg;
		});

		// 1. create affiliate offer
		await INSERT.into(PT_TMOFRS).entries(differentAwardPriceOffer);
		// 2. create affiliate offer status
		await INSERT.into(PT_TMTNOFST).entries(differentAwardPriceOfferStatus);
		// 3. create affiliate products
		dapOfferProducts.length > 0 && await INSERT.into(PT_TMOFPR).entries(dapOfferProducts);
		// 4. create product pricing
		dapProductsPricing.length > 0 && await INSERT.into(PT_TMBDPR).entries(dapProductsPricing);
		// 4. create price condtions
		dapPriceCondtions.length > 0 && await INSERT.into(PriceCondition).entries(dapPriceCondtions);
		// 5. create free goods other
		dapFreeGoodsOther.length > 0 && await INSERT.into(FreeGoodsOther).entries(dapFreeGoodsOther);
		

		return differentAwardPriceOfferID;
	};

	srv.on("softDeleteOffer", async (req) => {
		try{
		const { data: {offerID} } = req;

		!offerID && req.error({ code: 404, message: "OfferID was not provided", target: "OfferID" });
		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID: offerID, ActiveOffer: 1});

		if(!offer){
			return req.error({ code: 403, message: `Offer "${offerID}" is not active. Only active offer can be removed.`, target: "PT_TMOFRS"});
		}
		await UPDATE(PT_TMOFRS).with ({Active: 0}).where({OfferID: offer.OfferID});
		return offerID;
		}
		catch(error){
            console.error('Error in softDeleteOffer');
            return req.reject(403, error?.message||"Error in softDeleteOffer");
        }

	})

	srv.before(['CREATE','UPDATE','DELETE'], 'OfferProductsDetailView', async (req) => {
		try{
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
		
		if (req.data.CountryCode == 'NL' && (req.data.RequestedVolume == 0 || req.data.RequestedVolume == null)) {
			req.data.RequestedVolume = 1
		}

		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID: req.data.OfferID});

		req.data.Line = null; //for mandatory field check in sta-service
		req.data.SUPPLY_UPDATE = offer.APPROVALS_SENT;

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
		delete req.data.PACKFACTOR;
		delete req.data.INCOTerms;
		delete req.data.InstituteName;
		delete req.data.ACTIVE_MATERIAL_NUMBERS;
		delete req.data.INACTIVE_MATERIAL_NUMBERS;
		delete req.data.TenderClassification;
		}
		catch(error){
            console.error('Error in OfferProductsDetailView CREATE');
            return req.reject(403, error?.message||"Error in OfferProductsDetailView");
        }
	});

	srv.before(
		['CREATE','UPDATE'], 
		[
			'PriceConditionPriceView',
			'PriceConditionDiscountView',
			'PriceConditionPriceWithFOCView',
			'PriceConditionDiscountWithFOCView',
			"PriceConditionNLPriceView", 
			"PriceConditionNLDiscountView",
			"PriceConditionSpecialPriceView",
			"PriceConditionWithMaximumPriceView"
		], 
		async (req) => {
			try{
			// validate form
				if(req.data.CountryCode !== "AU" && req.data.CountryCode !== "PL"){
					if(req.data.ConditionType === 'PriceWithFOC' || req.data.ConditionType === 'DiscountWithFOC'){
						req.data.BasePrice = req.data.CountryCode?.includes("HM") ? roundToDecimalPlaces(req.data.BasePrice,4) : req.data.Region === 'MEA' ? roundToDecimalPlaces(req.data.BasePrice,3) : roundToDecimalPlaces(req.data.BasePrice,2);
					}
					if(req.data.ConditionType === 'Price' || req.data.ConditionType === 'Discount'){
						req.data.BasePrice = req.data.CountryCode?.includes("HM") ? roundToDecimalPlaces(req.data.BasePrice,4) : roundToDecimalPlaces(req.data.BasePrice,2);
					}
					req.data.OfferPrice && Number(req.data.OfferPrice) > Number(req.data.BasePrice) && req.error({ code: 404, message: "OfferPrice should not be greater than BasePrice.", target: "OfferPrice" });
				}
			}
			catch(error){
				console.error('Error in validation of PriceCondition View before CREATE');
				return req.reject(403, error?.message||"Error in validation of PriceCondition View before CREATE");
			}
		}
	);

	srv.on(['CREATE','UPDATE','DELETE'], ['AwardedProductFormView', 'AwardedProducts'], async (req) => {
		try{
		await upsertAwardedProduct(req);
		return req.data;
		}
		catch(error){
			console.error('Error in AwardedProducts CREATE');
			return req.reject(403, error?.message||"Error in AwardedProducts CREATE");
		}
	});

	srv.before(['CREATE','UPDATE','DELETE'], ['AwardedProductFormView', 'AwardedProducts'], async (req) => {
		try{
			if(req?.path === 'StandardAppService.AwardedProductFormView'){
				const mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: 'Award', CountryCode: req?.data?.CountryCode, ProductScope: 'All'}));

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
			}
			delete req.data.FreeGoodsOther;
			delete req.data.FreeGoodsOther_ABS_PCT;
			delete req.data.FreeGoodsOther_Step;
			delete req.data.ADD_INCLUDE;
			delete req.data.priceconditionID
		}
		catch(error){
			console.error('Error in AwardedProducts before CREATE');
			return req.reject(403, error?.message||"Error in AwardedProducts before CREATE");
		}
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
			SubmittedOn: new Date().toISOString(),
        	SubmittedBy: req.user.id,
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
				.with ({RequestedVolume: req.data.AwardedQty})
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

		if (req.data.CountryCode === "NL" || req.data.CountryCode === "PL") {
			await updateResultRecordedOutcomeOfferStatuses(req, existingAwardedProducts);
		}else {
			const awardedProductsHaveOutcome = existingAwardedProducts.every(prod => prod.Outcome && prod.Outcome !== '');
			const hasAwardPriceUpdateOutcome = existingAwardedProducts.some(prod => prod.Outcome === "Award Price Update");
	
			awardedProductsHaveOutcome && await upsertOfferStatus(req.data.OfferID, req.data.TenderID, 'Results Recorded');
	
			if (req.data.CountryCode === "TW" && awardedProductsHaveOutcome && !hasAwardPriceUpdateOutcome) {
				await sendTWResultsRecordedNotification(req);
			}
		}
		
	}

	const updateResultRecordedOutcomeOfferStatuses = async function (req, existingAwardedProducts) {
		const awardedProductsHaveOutcome = existingAwardedProducts.every(prod => prod.Outcome && prod.Outcome !== '');
		if (!awardedProductsHaveOutcome) return;

		const isEveryOutcomeWon = existingAwardedProducts.every(pr => pr.Outcome === 'Won');
		const isEveryOutcomeLost = existingAwardedProducts.every(pr => pr.Outcome === 'Lost');

		if (isEveryOutcomeWon) {
			await upsertOfferStatus(req.data.OfferID, req.data.TenderID, 'Results Recorded', 'Outcome Accepted');
		}else if (isEveryOutcomeLost) {
			await upsertOfferStatus(req.data.OfferID, req.data.TenderID, 'Results Recorded', 'Outcome Rejected');
		}else {
			upsertOfferStatus(req.data.OfferID, req.data.TenderID, 'Results Recorded', 'Outcome Partially Accepted')
		}
	}

	const sendTWResultsRecordedNotification = async function (req) {
		const recipientCWIDs = ['TWHWE', 'TWMLI'];
		const recipients = await SELECT.from(PT_TMUSER).where({CWID: {in: recipientCWIDs}});
		const promises = recipients.map(recipient => {
			return addOutgoingMail(req, "TaiwanResultsRecordedNotification", `Results recorded for Price Request ID:${req.data.OfferID}`, {RecipientEmail: recipient.UserEmail, RecipientName: recipient.UserName});
		});

		await Promise.all(promises);
	}

	const addOutgoingMail = async function (req, templateName, subject, RecipientInfo) {
		const mailTemplate = await getMailTemplate(templateName);
		const mappedData = mapDataToMail(mailTemplate, req.data, subject, RecipientInfo);

		return INSERT(mappedData).into(OutgoingMails);

	}

	const mapDataToMail = function (template, data, subject, {RecipientEmail, RecipientName}) {
        return {
            CountryCode: data.CountryCode,
            TenderID: data.TenderID,
            OfferID: data.OfferID,
            Sender: 'FAST-Admin@bayer.com',
            Recipients: RecipientEmail,
            Subject: subject,
            MailBody: generateMailBody(template, {
                data: { 
                    Offer: data,
					ReceipientName: RecipientName
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

	srv.before(['CREATE','UPDATE'], 'CompetitorResultsTableView', async (req) => {
		try{
			const mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: 'CompetitorResults', CountryCode: req?.data?.Custom_String_2, ProductScope: 'All'}));

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

			!req.data.AWARDEDCOMPANY && req.error({ code: 404, message: "Awarded Company is required.", target: "AWARDEDCOMPANY" });
			!req.data.AWARDEDPRODUCT && req.error({ code: 404, message: "Awarded Product is required.", target: "AWARDEDPRODUCT" });
		}
		catch(error){
			console.error('Error in before CompetitorResultsTableView CREATE or UPDATE');
			return req.reject(403, error?.message||"Error in before CompetitorResultsTableView CREATE or UPDATE");
		}
	});

	srv.on(['CREATE','UPDATE'], 'CompetitorResultsTableView', async (req) => {
		try{
		await upsertCompetitorResults(req);
		await upsertMasterCompetitors(req);
		return req.data;
		}
		catch(error){
			console.error('Error in CompetitorResultsTableView CREATE');
			return req.reject(403, error?.message||"Error in CompetitorResultsTableView CREATE");
		}
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
			AWARDEDCOMPANY: req.data.AWARDEDCOMPANY,
			AWARDEDPRODUCT: req.data.AWARDEDPRODUCT,
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

	const upsertMasterCompetitors = async function(req){

		const masterCompetitors = await SELECT.one.from(MasterCompetitors).where({
			CompetitorProduct	: req.data.AWARDEDPRODUCT, 
			CompetitorCompany	: req.data.AWARDEDCOMPANY,
			CountryCode: req.data.Custom_String_2,
			ProductCode: req.data.PRODUCTCODE
		});
		const mappedMasterCompetitors = {
			CountryCode			: req.data.Custom_String_2,
			ProductCode			: req.data.PRODUCTCODE,
			CompetitorProduct	: req.data.AWARDEDPRODUCT, 
			CompetitorCompany	: req.data.AWARDEDCOMPANY
		}

		if(masterCompetitors){
			await UPDATE(MasterCompetitors)
				.with (mappedMasterCompetitors)
				.where({
					ID: masterCompetitors.ID
				})
		}else{
			await INSERT.into(MasterCompetitors).entries(mappedMasterCompetitors);
		}
	}

	srv.on(['CREATE','UPDATE','DELETE'], 'OfferProductOfferStatus', async (req) => {
		try{
		const existingApprovals = await getExistingApprovals(req);
		const offerProducts = await getOfferProducts(req);
		await upsertProductApprovals(req, existingApprovals, offerProducts);
		await upsertOfferApprovalsSent(req);
		await upsertOfferStatus(req.data.OfferId, req.data.TenderID, req.data.send === 'Yes' ? 'Awaiting Approval' : 'Offer Created');
		return req.data;
		}
		catch(error){
			console.error('Error in OfferProductOfferStatus CREATE');
			return req.reject(403, error?.message||"Error in OfferProductOfferStatus CREATE");
		}
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

		if(existingApprovals && existingApprovals.some(entry => entry.ApprovalStatus === 'Rejected')){
			await DELETE.from(PT_TMAPPRST)
			.where({
				OfferId: oApprovalData.OfferId,
				ApprovalStatus: 'Rejected'
			});
		}

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

		
		await INSERT.into(PT_TMAPPRST).entries(aApprovalsSaveInfo);

		return req.data;
	};

	const upsertOfferStatus = async function(offerId, tenderId, sStatus, tableStatus){
		await UPDATE(PT_TMTNOFST)
			.with({STATUS: sStatus, TableStatus: tableStatus})
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

	srv.before(
		['CREATE','UPDATE'], 
		[
			'PriceConditionTaiwanPriceView',
			'PriceConditionTaiwanDiscountView'
		], 
		async (req) => {
			try{
				// validate form
				!req.data.AnticipatedYearlyVolumeMainCustomer && req.error({ code: 404, message: "Anticipated Yearly Volume MainCustomer is required.", target: "AnticipatedYearlyVolumeMainCustomer" });
				const individualCustomer = await validateIndividualCustomerTaiwan(req);
				if(individualCustomer){
					!req.data.AnticipatedYearlyVolumeBranch && req.error({ code: 404, message: "Anticipated Yearly Volume Branch is required.", target: "AnticipatedYearlyVolumeBranch" });
				}

				const currentOffer = await SELECT.one.from(PT_TMOFRS).where({OfferID: req.data.OfferID});
				const parentOfferProdPriceCondition = await SELECT.one.from(PriceCondition).where({OfferID: currentOffer.DifferentAwardPriceParentOfferID, ProductCode: req.data.ProductCode});
				if (!currentOffer.DifferentAwardPriceParentOfferID || !parentOfferProdPriceCondition) return;
				if (Number(parentOfferProdPriceCondition.Price2) > Number(req.data.Price3)) {
					req.error({ code: 404, message: "NetPrice can not be less than NetPrice of parent offer"});
				}
			}
			catch(error){
				console.error('Error in validation of PriceCondition Taiwan View before CREATE');
				return req.reject(403, error?.message||"Error in validation of PriceCondition Taiwan View before CREATE");
			}
		}
	);

	srv.on(
		['CREATE','UPDATE'], 
		[
			'PriceConditionPriceView',
			'PriceConditionDiscountView',
			'PriceConditionPriceWithFOCView',
			'PriceConditionDiscountWithFOCView',
			'PriceConditionTaiwanPriceView',
			'PriceConditionTaiwanDiscountView',
			"PriceConditionNLPriceView", 
			"PriceConditionNLDiscountView",
			"PriceConditionSpecialPriceView",
			"PriceConditionWithMaximumPriceView",
			"PriceConditionDescuentoComercialView",
			"PriceConditionPrecioNetoView",
			"PriceConditionPVLView"
		], 
		async (req) => {
			try{
			await updatePaymentField(req.data.OfferID, req.data.ProductCode);
			await upsertPriceCondition(req);
			await upsertProductPricing(req);
			// Check if CountryCode is TW (Taiwan)
			if (req.data.CountryCode === 'TW') {
				await updateProductRequestedVolume(req);
			}
			return req.data;
			}
			catch(error){
				console.error('Error in PriceCondition View CREATE');
				return req.reject(403, error?.message||"Error in PriceCondition View CREATE");
			}
		}
	);

	srv.after(
		['CREATE','UPDATE'], 
		[
			'PriceConditionTaiwanPriceView',
			'PriceConditionTaiwanDiscountView',
		], 
		async (data, req) => {
			try{
				const tx = cds.tx(req);
				const currentOffer = await SELECT.one.from(PT_TMOFRS).where({OfferID: data.OfferID});
				const whereOfferPrValidation = ServiceHelper.buildFullWhere("OFFER_ID", "=", data.OfferID);
				const whereOfferValidation = ServiceHelper.buildFullWhere("OFFERID", "=", data.OfferID);
				const currentOfferValidation = await buildOfferValidation(tx, whereOfferValidation);
				const currentOffeProductsValidation = await buildOfferProductValidation(tx, whereOfferPrValidation);
				const currentOfferPriceConditions = await SELECT.from(PriceCondition).where({OfferID: data.OfferID});
				const parentOfferProdPriceConditions = await SELECT.from(PriceCondition).where({OfferID: currentOffer.DifferentAwardPriceParentOfferID});
				if (!currentOffer.DifferentAwardPriceParentOfferID || parentOfferProdPriceConditions.length === 0 || currentOffeProductsValidation.length === 0) return;

				const checkNetPrices = currentOfferPriceConditions.every(pc => {
					const parentOfferPriceCondition = parentOfferProdPriceConditions.find(ppc => ppc.ProductCode === pc.ProductCode);
					const parentOffersNetPrice = parentOfferPriceCondition?.Price2 || 0;
					return Number(pc.Price2) > Number(parentOffersNetPrice);
				});
				
				if (checkNetPrices) {
					const mappedAwardedProducts = currentOffeProductsValidation.map(product => {
						return {
							TenderID: product.TENDER_ID,
							OfferID: product.OFFER_ID,
							CountryCode: product.COUNTRY_CODE,
							LotID: product.LOTID,
							ProductCode: product.PRODUCTID,
							AwardedProduct: product.PRODUCTNAME,
							AwardedCompany: "Bayer",
							UoM: product.UNIT,
							AwardedPrice: product.NET_PRICE,
							AwardedQty: product.REQUESTED_QUANTITY,
							ErrorInSubmission: "No",
						}
					});


					await INSERT.into(PT_TMTRRES).entries(mappedAwardedProducts);
					await upsertOfferStatus(req.data.OfferID, req.data.TenderID, 'Quotation Submitted');

					const mappedPTTMQUTO = mappedQuotation(req.user, currentOfferValidation);

					const submittedQoutation = await SELECT.one.from(PT_TMQUTO).where({
						OfferID: currentOfferValidation.OFFERID,
						Active: 1,
						OfferDate: currentOfferValidation.OFFERDATE
					});

					// save/update PT_TMQUTO
					if(submittedQoutation){
						await UPDATE(PT_TMQUTO).with (mappedPTTMQUTO).where({
							OfferID: currentOfferValidation.OFFERID,
							Active: 1,
							OfferDate: currentOfferValidation.OFFERDATE
						})
					}else{
						await INSERT.into(PT_TMQUTO).entries(mappedPTTMQUTO);
					}
				}
			}
			catch(error){
				console.error('Error in PriceCondition View CREATE');
				return req.reject(403, error?.message||"Error in PriceCondition View CREATE");
			}
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

	const resetApprovalsSent = async function (OfferID) {
		await UPDATE(PT_TMOFRS)
			.with({APPROVALS_SENT: 0})
			.where({
				OfferID: OfferID
			});
	};

	const updatePaymentField = async function (OfferID, ProductCode) {
		const offer = await SELECT.one.from(PT_TMOFRS).where({OfferID: OfferID});

		await UPDATE(PT_TMOFPR)
			.with({PAYMENT_UPDATE: offer.APPROVALS_SENT})
			.where({
				OfferID: OfferID,
				ProductCode: ProductCode
			});			
	}

	const resetProductPaymentSupplyFields = async function (OfferID) {
		const products = await SELECT.from(PT_TMOFPR).where({OfferID: OfferID});
		const prices = await SELECT.from(PT_TMBDPR).where({OfferID: OfferID});
		let promises = [];

		if (prices.length > 0) {
			const pricePromises = prices.map(price => {
				return UPDATE(PT_TMBDPR)
				.with({PRICE_UPDATE: 0})
				.where({
					OfferID: price.OfferID,
					ProductCode: price.ProductCode
				});
			});
			promises = promises.concat(pricePromises);
		}

		if (products.length > 0) {
			const productPromises = products.map(product => {
				return UPDATE(PT_TMOFPR)
				.with({SUPPLY_UPDATE: 0, PAYMENT_UPDATE: 0})
				.where({
					OfferID: product.OfferID,
					ProductCode: product.ProductCode
				});
			});
			promises = promises.concat(productPromises);
		}
		Promise.all(promises);
	};

	const upsertPriceCondition = async function(req){
		const selectedTender = await SELECT.one.from(PT_TMTEND).where({TenderID:req.data.TenderID});
		const priceCondition = await SELECT.one.from(PriceCondition).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode
		});

		const productCurrentPrice = await SELECT.one.from(PriceConditionCurrentSectionTaiwanView).where({
			ProductCode: req.data.ProductCode,
			INSTITUTE_ID: selectedTender.InstituteID
		});

		let individualCustomer = true;
		if(req.data.CountryCode === 'TW'){
			individualCustomer = await validateIndividualCustomerTaiwan(req);
		}

		const mappedPriceCondition = mapPriceCondition(req, individualCustomer, productCurrentPrice);

		if(priceCondition){
			foc = await SELECT.from(FreeGoodsOther).where({
				PriceCondition_ID: priceCondition.ID
			});
			const priceConditionClassification = await SELECT.one.from(PriceConditionClassification).where({
				ID: priceCondition.PriceConditionClassification_ID
			});
			if (foc.length === 0 || priceConditionClassification.ConditionType === req.data.ConditionType) {
				await handlePriceConditionUpsert(priceCondition, mappedPriceCondition);
			} else {
				if (foc.length > 0) {
					await DELETE(FreeGoodsOther)
						.where({
							PriceCondition_ID: priceCondition.ID
						});
				}
				await handlePriceConditionUpsert(priceCondition, mappedPriceCondition);
			}	
		}
		else{
			await handlePriceConditionUpsert(priceCondition, mappedPriceCondition);		
		}

		if(req.data.CountryCode === 'NL'){
			await handleNetherlandsPriceConditions(req);
		}
	}

	async function handleNetherlandsPriceConditions(req) {
		const priceCondition = await SELECT.one.from(PriceCondition).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode
		});
		const existingNLPriceConditions = await SELECT.from(NLPriceConditions).where({PriceCondition_ID: priceCondition.ID});

		if (existingNLPriceConditions.length > 0) {
			await Promise.all(req.data.NLPriceConditionType.map(pc => {
				const mappedNLPriceCondition = mappedNLPriceConditions(pc, priceCondition.ID);
				const nlPriceCondIndex = existingNLPriceConditions.findIndex(el => el.ContractDuration == pc.ContractDuration);
				if (nlPriceCondIndex > -1) {
					return UPDATE(NLPriceConditions)
					.with(mappedNLPriceCondition)
					.where({
						ContractDuration: pc.ContractDuration,
						PriceCondition_ID: priceCondition.ID
					});
				}else if (nlPriceCondIndex == -1 && pc.ContractDuration) {
					return INSERT(mappedNLPriceCondition).into(NLPriceConditions);
				}
			}))
		}else {
			await Promise.all(req.data.NLPriceConditionType.map(pc => {
				const mappedNLPriceCondition = mappedNLPriceConditions(pc, priceCondition.ID);
				if (mappedNLPriceCondition.ContractDuration) {
					return INSERT(mappedNLPriceCondition).into(NLPriceConditions);
				}
			}))
		}
	}

	async function handlePriceConditionUpsert(priceCondition, mappedPriceCondition){
		if (priceCondition) {
			await UPDATE(PriceCondition)
				.with(mappedPriceCondition)
				.where({
					ID: priceCondition.ID
				});
		} else {
			await INSERT.into(PriceCondition).entries(mappedPriceCondition);
		}
	}

	const mappedNLPriceConditions = function(pc, PriceconditionID) {
		return {
			ContractDuration: pc.ContractDuration,
			OfferPrice: pc.OfferPrice,
			Discount: pc.Discount,
			NetPrice: pc.NetPrice,
			PriceCondition_ID: PriceconditionID
		}
	}

	const mapPriceCondition = function(req, individualCustomer, productCurrentPrice){
		const mappings = {
			"Discount" : {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				NetOfferPrice: req.data.OfferPrice,
				Price2: req.data.OfferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Discount: req.data.Discount,
				Price3: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"Price" : {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				NetOfferPrice: req.data.OfferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Discount: req.data.Discount,
				Price3: req.data.NetPrice,
				Price2: req.data.OfferPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"PriceWithFOC" : {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				Price2: req.data.NetOfferPrice,
				NetOfferPrice: req.data.NetOfferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Discount: req.data.Discount,
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
				NetOfferPrice: req.data.NetOfferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Discount: req.data.Discount,
				Price2: req.data.NetOfferPrice,
				Price3: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"TaiwanContractPrice": {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level2Discount1:req.data.Deductions,
				Level2Discount2:req.data.Level2Discount2,
				AnnualDiscountForBranch:req.data.AnnualDiscountForBranch,
				NegotiationPrice:req.data.NegotiationPrice,
				TotalYearlyValueMainCustomer:req.data.TotalYearlyValueMainCustomer,
				AnticipatedYearlyVolumeMainCustomer:req.data.AnticipatedYearlyVolumeMainCustomer,
				AnticipatedYearlyVolumeBranch: individualCustomer ? req.data.AnticipatedYearlyVolumeBranch : req.data.AnticipatedYearlyVolumeMainCustomer,
				TotalYearlyValueBranch:req.data.TotalYearlyValueBranch,
				TotalDiscountNHI:req.data.TotalDiscountNHI,
				TotalDiscountInvoice:req.data.TotalDiscountInvoice,
				Price2: req.data.NetPrice,
				Price3: req.data.Price3,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Price1: req.data.OfferPrice, 
				NetPrice: req.data.Price3,
				NetOfferPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Level3Discount1: req.data.Level3Discount1,
				GeneralDiscount_Amount: (req.data.OfferPrice * req.data.Deductions),
    			SecondDiscount_Amount: (req.data.OfferPrice * req.data.Level2Discount2),
    			AnnualDiscount_Percentage: (req.data.Level3Discount1 / req.data.OfferPrice),
    			FreeGoods_Amount: (req.data.NetPrice - req.data.OfferPrice *  (1 - req.data.Deductions - req.data.Level2Discount2)),
    			FreeGoods_Percentage: ((req.data.NetPrice - req.data.OfferPrice *  (1 - req.data.Deductions - req.data.Level2Discount2)) / req.data.OfferPrice),
				PriceConditionClassification_ID: req.data.ClassificationID,
				CurrentBasePrice: productCurrentPrice?.Price0 || 0,
				CurrentInvoicePrice: productCurrentPrice?.Price1 || 0,
				CurrentGeneralDiscount: productCurrentPrice?.Level2Discount1 || 0,
				CurrentGeneralDiscount_Amount: productCurrentPrice?.GeneralDiscount_Amount || 0,
				CurrentSecondDiscount: productCurrentPrice?.Level2Discount2 || 0,
				CurrentSecondlDiscount_Amount: productCurrentPrice?.SecondDiscount_Amount || 0,
				CurrentNetOfferPrice: productCurrentPrice?.Price2 || 0,
				CurrentAnnualDiscount_Amount_Branch: productCurrentPrice?.AnnualDiscountForBranch || 0,
				CurrentAnnualDiscount_Amount_Per_Unit: productCurrentPrice?.Level3Discount1 || 0,
				CurrentNetPrice: productCurrentPrice?.Price3 || 0,
				CurrentNegotiationPrice: productCurrentPrice?.NegotiationPrice || 0,
				CurrentTotalYearlyValueMainCustomer: productCurrentPrice?.TotalYearlyValueMainCustomer || 0,
				CurrentTotalYearlyValueBranch: productCurrentPrice?.TotalYearlyValueBranch || 0,
				CurrentTotalDiscountNHI: productCurrentPrice?.TotalDiscountNHI || 0,
				CurrentTotalDiscountInvoice: productCurrentPrice?.TotalDiscountInvoice || 0
			},
			"TaiwanDiscount": {
				Price0: req.data.BasePrice,
				CountryCode: req.data.CountryCode,
				Level2Discount1:req.data.Deductions,
				Level2Discount2:req.data.Level2Discount2,
				AnnualDiscountForBranch:req.data.AnnualDiscountForBranch,
				NegotiationPrice:req.data.NegotiationPrice,
				TotalYearlyValueMainCustomer:req.data.TotalYearlyValueMainCustomer,
				AnticipatedYearlyVolumeMainCustomer:req.data.AnticipatedYearlyVolumeMainCustomer,
				AnticipatedYearlyVolumeBranch: individualCustomer ? req.data.AnticipatedYearlyVolumeBranch : req.data.AnticipatedYearlyVolumeMainCustomer,
				TotalYearlyValueBranch:req.data.TotalYearlyValueBranch,
				TotalDiscountNHI:req.data.TotalDiscountNHI,
				TotalDiscountInvoice:req.data.TotalDiscountInvoice,
				Price2: req.data.NetPrice,
				Price3: req.data.Price3,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Price1: req.data.OfferPrice, 
				NetPrice: req.data.Price3,
				NetOfferPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Level3Discount1: req.data.Level3Discount1,
				GeneralDiscount_Amount: (req.data.OfferPrice * req.data.Deductions),
    			SecondDiscount_Amount: (req.data.OfferPrice * req.data.Level2Discount2),
    			AnnualDiscount_Percentage: (req.data.Level3Discount1 / req.data.OfferPrice),
    			FreeGoods_Amount: (req.data.NetPrice - req.data.OfferPrice *  (1 - req.data.Deductions - req.data.Level2Discount2)),
    			FreeGoods_Percentage: ((req.data.NetPrice - req.data.OfferPrice *  (1 - req.data.Deductions - req.data.Level2Discount2)) / req.data.OfferPrice),
				PriceConditionClassification_ID: req.data.ClassificationID,
				CurrentBasePrice: productCurrentPrice?.Price0 || 0,
				CurrentInvoicePrice: productCurrentPrice?.Price1 || 0,
				CurrentGeneralDiscount: productCurrentPrice?.Level2Discount1 || 0,
				CurrentGeneralDiscount_Amount: productCurrentPrice?.GeneralDiscount_Amount || 0,
				CurrentSecondDiscount: productCurrentPrice?.Level2Discount2 || 0,
				CurrentSecondlDiscount_Amount: productCurrentPrice?.SecondDiscount_Amount || 0,
				CurrentNetOfferPrice: productCurrentPrice?.Price2 || 0,
				CurrentAnnualDiscount_Amount_Branch: productCurrentPrice?.AnnualDiscountForBranch || 0,
				CurrentAnnualDiscount_Amount_Per_Unit: productCurrentPrice?.Level3Discount1 || 0,
				CurrentNetPrice: productCurrentPrice?.Price3 || 0,
				CurrentNegotiationPrice: productCurrentPrice?.NegotiationPrice || 0,
				CurrentTotalYearlyValueMainCustomer: productCurrentPrice?.TotalYearlyValueMainCustomer || 0,
				CurrentTotalYearlyValueBranch: productCurrentPrice?.TotalYearlyValueBranch || 0,
				CurrentTotalDiscountNHI: productCurrentPrice?.TotalDiscountNHI || 0,
				CurrentTotalDiscountInvoice: productCurrentPrice?.TotalDiscountInvoice || 0
			},
			"NLDiscount" : {
				Price0: req.data.masterPriceAIP,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				NetOfferPrice: req.data.OfferPrice,
				Price2: req.data.OfferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Discount: req.data.Discount,
				Price3: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID
			},
			"NLPrice" : {
				Price0: req.data.masterPriceAIP,
				CountryCode: req.data.CountryCode,
				Level1Discount1: req.data.Discount,
				NetOfferPrice: req.data.OfferPrice,
				Price2: req.data.OfferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Discount: req.data.Discount,
				Price3: req.data.NetPrice,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				Tax: req.data.Tax,
				Price1: req.data.OfferPrice, 
				Level3Discount1: req.data.Deductions,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"SpecialPrice": {
				CountryCode: req.data.CountryCode,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				NetPrice: req.data.SpecialPrice || 0,
				Price0: req.data.BasePrice || 0,
				Price1: req.data.SpecialPrice || 0, 
				Price2: req.data.SpecialPrice || 0,
				Level2Discount1: 0,
				Level2Discount2: req.data.Margin || 0,
				OfferPrice: req.data.SpecialPrice || 0,
				NetOfferPrice: req.data.SpecialPrice || 0,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"WithMaximumPrice": {
				CountryCode: req.data.CountryCode,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				NetPrice: req.data.SpecialPrice || 0,
				Price0: req.data.BasePrice || 0,
				Price1: req.data.Price1 || 0,
				Price2: req.data.SpecialPrice || 0,
				Level2Discount1: req.data.Level2Discount1 || 0,
				Level2Discount2: req.data.Margin || 0,
				OfferPrice: req.data.SpecialPrice || 0,
				NetOfferPrice: req.data.SpecialPrice || 0,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"PrecioNeto":{
				CountryCode : req.data.CountryCode,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				PVL: req.data.PVL,
				ConfidentialPrice: req.data.ConfidentialPrice,
				Discount: req.data.Discount,
				RoyalDecree: req.data.RoyalDecree,
				RoyalDecreeValue: req.data.RoyalDecreeValue,
				RoyalDecreeIncl: req.data.RoyalDecreeIncl,
				StandardDiscount: req.data.StandardDiscount,
				AdditionalDiscount: req.data.AdditionalDiscount,
				NetPriceWithoutTaxBeforeDeductionRD: req.data.NetPriceWithoutTaxBeforeDeductionRD,
				NetPriceWithoutTaxAfterDeductionRD: req.data.NetPriceWithoutTaxAfterDeductionRD,
				NetPriceWithTaxAfterDeductionRD: req.data.NetPriceWithTaxAfterDeductionRD,
				NetPriceWithoutTax: req.data.NetPriceWithoutTax,
				NetPriceWithTax: req.data.NetPriceWithTax,
				MaximumPrice: req.data.MaximumPrice,
				Tax: req.data.Tax,
				NetPrice: req.data.NetPriceWithoutTaxAfterDeductionRD || req.data.NetPriceWithoutTax,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"DescuentoComercial":{
				CountryCode : req.data.CountryCode,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				PVL: req.data.PVL,
				ConfidentialPrice: req.data.ConfidentialPrice,
				Discount: req.data.Discount,
				RoyalDecree: req.data.RoyalDecree,
				RoyalDecreeValue: req.data.RoyalDecreeValue,
				RoyalDecreeIncl: req.data.RoyalDecreeIncl,
				StandardDiscount: req.data.StandardDiscount,
				AdditionalDiscount: req.data.AdditionalDiscount,
				NetPriceWithoutTaxBeforeDeductionRD: req.data.NetPriceWithoutTaxBeforeDeductionRD,
				NetPriceWithoutTaxAfterDeductionRD: req.data.NetPriceWithoutTaxAfterDeductionRD,
				NetPriceWithTaxAfterDeductionRD: req.data.NetPriceWithTaxAfterDeductionRD,
				NetPriceWithoutTax: req.data.NetPriceWithoutTax,
				NetPriceWithTax: req.data.NetPriceWithTax,
				MaximumPrice: req.data.MaximumPrice,
				Tax: req.data.Tax,
				NetPrice: req.data.NetPriceWithoutTaxAfterDeductionRD || req.data.NetPriceWithoutTax,
				PriceConditionClassification_ID: req.data.ClassificationID 
			},
			"PVL":{
				CountryCode : req.data.CountryCode,
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				PVL: req.data.PVL,
				ConfidentialPrice: req.data.ConfidentialPrice,
				NetPriceWithoutTax: req.data.NetPriceWithoutTax,
				NetPriceWithTax: req.data.NetPriceWithTax,
				MaximumPrice: req.data.MaximumPrice,
				Tax: req.data.Tax,
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

		const priceCondition = await SELECT.one.from(PriceCondition).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode
		});

		let foc = null;
		if(priceCondition){
			foc = await SELECT.one.from(FreeGoodsOther).where({
					PriceCondition_ID: priceCondition?.ID,
					ProductPackId: req.data.ProductCode
			});
		}

		const budgetRate = await SELECT.one.from(ExchangeRates).where(whereConditionBudgetRate);

		const mappedPTTMBDPR = mapToPTTMBDPR({priceCondition:req.data, offer, user: req.user, cogs, spotRate, budgetRate, foc});

		if(productPricing){
			await UPDATE(PT_TMBDPR).with (mappedPTTMBDPR).where(whereCondition)
		}else{
			await INSERT.into(PT_TMBDPR).entries(mappedPTTMBDPR);
		}
	}

	function mapToPTTMBDPR({priceCondition, offer, user, cogs, spotRate, budgetRate, foc}){
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
			RegPrice              : priceCondition.CountryCode === 'NL' ? priceCondition.masterPriceAIP : priceCondition.BasePrice, 
			FOC                   : foc?.FreeGoodsOther || 0, 
			FOCStep               : foc?.FreeGoodsOther_Step || null, 
			FOCType               : priceCondition.CountryCode === 'PL' ? 'FOC 1' : foc?.ADD_INCLUDE === 'Included' ? 'FOC 1' : 'FOC 2', 
			Discount              : priceCondition.CountryCode === 'PL' ? 0 : priceCondition.Discount, 
			OfferPrice            : priceCondition.CountryCode === 'PL' ? priceCondition.SpecialPrice : priceCondition.CountryCode === 'ES' ? priceCondition.NetPriceWithoutTaxAfterDeductionRD || priceCondition.NetPriceWithoutTax : priceCondition.OfferPrice, 
			Deductions            : priceCondition.Deductions, 
			StandardDiscount      : priceCondition.CountryCode === 'ES' ? priceCondition.StandardDiscount: 0, 
			AdditionalDiscount    : priceCondition.CountryCode === 'ES' ? priceCondition.AdditionalDiscount: 0, 
			NetofferPrice         : priceCondition.CountryCode === 'TW' ? priceCondition.NetPrice : priceCondition.CountryCode === 'PL' ? priceCondition.SpecialPrice : priceCondition.CountryCode === 'ES' ? priceCondition.NetPriceWithoutTaxAfterDeductionRD || priceCondition.NetPriceWithoutTax : priceCondition.NetOfferPrice || priceCondition.OfferPrice, 
			BusinessCasePrice     : 0, 
			// WholesalePrice        : null, 
			COGS                  : cogs?.COGS || 0,
			SpotRate              : spotRate?.X_RATE || 0,
			BudgetRate            : budgetRate?.X_RATE || 0,
			Scenario              : 0, 
			FOC_ABS_PCT           : priceCondition.CountryCode === 'PL' ? 'ABS' : foc?.FreeGoodsOther_ABS_PCT, 
			FOC_Bundled_1         : 0, 
			// FOC_ABS_PCT_Bundled_1 : 0, 
			FOCProduct_Bundled_1  : 0, 
			ActiveTier            : 0, 
			NetPrice              : priceCondition.CountryCode === 'TW' ? priceCondition.Price3 : priceCondition.CountryCode === 'PL' ? priceCondition.SpecialPrice : priceCondition.CountryCode === 'ES' ? priceCondition.NetPriceWithoutTaxAfterDeductionRD || priceCondition.NetPriceWithoutTax : priceCondition.NetPrice, 
			NetPrice_OfPaid       : 0, 
			PRICE_UPDATE          : offer?.APPROVALS_SENT, 
			LotID                 : 1, 
			// Deductions_ABS_PCT    : null
		}
	}

	/**
	 * Update a PT_TMOFPR Requested Volume based on the provided request data.
	 * If `product` exists, updates the existing PT_TMOFPR.
	 *
	 * @param {Object} req - The request object containing the data for the price condition.
	 * @returns {Promise<void>} A promise that resolves when the update operation is complete.
	 */
	const updateProductRequestedVolume = async function(req){

		const whereCondition = {
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode,
			Active: 1,
			LotID: 1
		};

		const product = await SELECT.one.from(PT_TMOFPR).where(whereCondition);
		const individualCustomer = await validateIndividualCustomerTaiwan(req);
		let AnticipatedYearlyVolumeBranch = individualCustomer ? req.data.AnticipatedYearlyVolumeBranch : req.data.AnticipatedYearlyVolumeMainCustomer;

		if(product){
			await UPDATE(PT_TMOFPR)
				.with ({RequestedVolume: AnticipatedYearlyVolumeBranch})
				.where(whereCondition)
		}
	}

	const validateIndividualCustomerTaiwan = async function(req){

		const selectedTender = await SELECT.one.from(PT_TMTEND).where({TenderID:req.data.TenderID});
		const parentInstitute = await SELECT.one.from(InstitutesView).where({InstituteID:selectedTender?.InstituteID, CountryCode:req.data.CountryCode});
		const instituteInBranch = await SELECT.from(InstituteInBranchView).where({InstituteID:parentInstitute?.InstituteID, InstituteName: {"!=": parentInstitute?.InstituteName}});

		return (instituteInBranch.length > 0);
	}

	srv.after(
		'READ', 
		['PriceConditionPriceView','PriceConditionDiscountView'], 
		(items, req) => {
		try{
			if(!items) return [];
			const fnCalculateFields = async item => {
				if(item.ConditionType === 'Discount'){
					item.OfferPrice = item.BasePrice * (1 - item.Discount);
					item.OfferPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.OfferPrice,4) : roundToDecimalPlaces(item.OfferPrice,2);
					item.NetPrice = item.OfferPrice * (1 - item.Deductions); 
					item.NetPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetPrice,4) : roundToDecimalPlaces(item.NetPrice,2);
				}
				else{
					item.Discount = (item.BasePrice - item.OfferPrice) / item.BasePrice;
					item.Discount = (item.CountryCode === 'AU' || item.CountryCode?.includes("HM")) ? roundToDecimalPlaces(item.Discount,4) : roundToDecimalPlaces(item.Discount,2);
					item.NetPrice = item.OfferPrice * (1 - item.Deductions); 
					item.NetPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetPrice,4) : roundToDecimalPlaces(item.NetPrice,2);
				}
			};
			if(Array.isArray(items)){
				return items.map(fnCalculateFields)
			}else{
				return fnCalculateFields(items);
			}
		}
		catch(error){
			console.error('Error in PriceConditionPriceView, PriceConditionDiscountView READ');
			return req.reject(403, error?.message||"Error in PriceConditionPriceView, PriceConditionDiscountView READ");
		}
		}
	);

	srv.after('READ', 'PriceConditionPriceWithFOCView', (items, req) => {
		try{
			if(!items) return [];

			if(Array.isArray(items)){
				return items.map(fnCalculateFields)
			}else{
				return fnCalculateFields(items);
			}

			async function fnCalculateFields(item){
				item.NetOfferPrice = await calculateNetOfferPrice(item);
				item.NetOfferPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetOfferPrice,4) : item.Region === 'MEA' ? roundToDecimalPlaces(item.NetOfferPrice,3) : roundToDecimalPlaces(item.NetOfferPrice,2);
				item.Discount = (item.BasePrice - item.OfferPrice) / item.BasePrice;
				item.Discount = (item.CountryCode === 'AU' || item.CountryCode?.includes("HM")) ? roundToDecimalPlaces(item.Discount,4) : item.Region === 'MEA' ? roundToDecimalPlaces(item.Discount,3) : roundToDecimalPlaces(item.Discount,2);
				item.NetPrice = item.NetOfferPrice * (1 - item.Deductions); 
				item.NetPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetPrice,4) : item.Region === 'MEA' ? roundToDecimalPlaces(item.NetPrice,3) : roundToDecimalPlaces(item.NetPrice,2);
			};
		}
		catch(error){
			console.error('Error in PriceConditionPriceWithFOCView READ');
			return req.reject(403, error?.message||"Error in PriceConditionPriceWithFOCView READ");
		}
			
		}
	);

	srv.after('READ', 'PriceConditionDiscountWithFOCView', (items, req) => {
		try{
			if(!items) return [];

			if(Array.isArray(items)){
				return items.map(fnCalculateFields)
			}else{
				return fnCalculateFields(items);
			}

			async function fnCalculateFields(item){
				item.NetOfferPrice = await calculateNetOfferPrice(item);
				item.NetOfferPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetOfferPrice,4) : item.Region === 'MEA' ? roundToDecimalPlaces(item.NetOfferPrice,3) : roundToDecimalPlaces(item.NetOfferPrice,2);
				item.NetPrice = item.NetOfferPrice * (1 - item.Deductions); 
				item.NetPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetPrice,4) : item.Region === 'MEA' ? roundToDecimalPlaces(item.NetPrice,3) : roundToDecimalPlaces(item.NetPrice,2);
			};
		}
		catch(error){
			console.error('Error in PriceConditionDiscountWithFOCView READ');
			return req.reject(403, error?.message||"Error in PriceConditionDiscountWithFOCView READ");
		}
		
	}
);

srv.after('READ', ['PriceConditionTaiwanPriceView', 'PriceConditionTaiwanDiscountView'], (items, req) => {
	try{
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
			// item.Level3Discount1 = item.AnnualDiscountForBranch / item.AnticipatedYearlyVolumeBranch;
			// item.Price3 = item.NetPrice - item.Level3Discount1;
			// item.TotalYearlyValueMainCustomer = item.Price3 * item.AnticipatedYearlyVolumeMainCustomer;
			// item.TotalYearlyValueBranch = item.Price3 * item.AnticipatedYearlyVolumeBranch;
			item.TotalDiscountNHI = (item.TotalDiscountNHI * 100).toFixed(2) / 100;
			item.TotalDiscountInvoice = (item.TotalDiscountInvoice * 100).toFixed(2) / 100;
		};
	}
	catch(error){
		console.error('Error in PriceConditionTaiwanPriceView READ');
		return req.reject(403, error?.message||"Error in PriceConditionTaiwanPriceView READ");
	}
}
);

srv.after('READ', ['PriceConditionNLPriceView', 'PriceConditionNLDiscountView'], (items, req) => {
	try{
		if(!items) return [];
		if(Array.isArray(items)){
			return items.map(fnMapNlConditions)
		}else{
			return fnMapNlConditions(items);
		}

		async function fnMapNlConditions(item){
			const nlPriceConditions = await SELECT.from(NLPriceConditions).where({PriceCondition_ID: item.PriceConditionID});
			item.NLPriceConditionType = [];
			for(let i = 1; i <= 3; i++) {
				const existingCondition = nlPriceConditions.find(el => el.ContractDuration == item[`Custom_Integer_${i}`] && el.ID);
				if (existingCondition) {
					item.NLPriceConditionType[i] = existingCondition;
				}else {
					item.NLPriceConditionType[i] = {
						ContractDuration: item[`Custom_Integer_${i}`],
						OfferPrice: item.OfferPrice,
						Discount: 0,
						NetPrice: 0,
					}
				}
			}
			item.NLPriceConditionType = item.NLPriceConditionType.filter(el => el);
			item.NetOfferPrice = await calculateNetOfferPrice(item);
			item.NetPrice = item.NetOfferPrice * (1 - item.Deductions); 
		};
	}
	catch(error){
		console.error('Error in PriceConditionTaiwanPriceView READ');
		return req.reject(403, error?.message||"Error in PriceConditionTaiwanPriceView READ");
	}
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
			const InstitutesInBranchIds = InstitutesInBranchHierarcy?.map(el => el.InstituteID);

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
		 * Calculate NetOfferPrice based on rules
		 * Case1: No FOC in the pop up
		 * Case2: One or more FOC products which are different from Offer Product
		 * Case3: One or more FOC products in which one is same as Offer Product but Its dropdown is selected as 'Added'
		 * Case4: One or more FOC products in which one is same as Offer Product but Its dropdown is selected as 'Included'
		**/
		//Cases 1 and 2
		if(foc.length === 0 || !containsOfferProduct) return item.OfferPrice;

		// Cases 3
		if(containsOfferProductAndIsAdded || containsOfferProductAndIsIncluded) {
			const FOC = getFOCWitSameProductCode(foc, offerProduct);
			switch(FOC.FreeGoodsOther_ABS_PCT){
				case "ABS":
					focVolume = FOC.FreeGoodsOther;
					break;
				case "PCT":
					focVolume = Math.round(item.RequestedVolume * FOC.FreeGoodsOther);
					break;
				case "STP":
					focVolume = Math.floor(item.RequestedVolume / FOC.FreeGoodsOther_Step) * FOC.FreeGoodsOther;
					break;
				default:
					break;
			}		
		}

		let paidVolume = containsOfferProductAndIsAdded ? item.RequestedVolume : item.RequestedVolume - focVolume;
		let totalVolume = containsOfferProductAndIsAdded ? item.RequestedVolume + focVolume : item.RequestedVolume;
		let netOfferPrice = item.OfferPrice * paidVolume / totalVolume;

		function hasObjectWithProductCode(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct);
		}

		function hasObjectWithProductCodeAndIsAdded(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Added');
		}

		function hasObjectWithProductCodeAndIsIncluded(arr, offerProduct) {
			return arr.some(obj => obj.ProductPackId === offerProduct && obj.ADD_INCLUDE === 'Included');
		}

		function getFOCWitSameProductCode(arr, offerProduct) {
			return arr.find(obj => obj.ProductPackId === offerProduct);
		}

		return netOfferPrice;
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
		if(containsOfferProductAndIsIncluded || containsOfferProductAndIsAdded) {
			const FOC = getFOCWitSameProductCode(foc, offerProduct);
			switch(FOC.FreeGoodsOther_ABS_PCT){
				case "ABS":
					focVolume = FOC.FreeGoodsOther;
					break;
				case "PCT":
					focVolume = FOC.FreeGoodsOther * item.AnticipatedYearlyVolumeBranch;
					break;
				case "STP":
					focVolume = (item.AnticipatedYearlyVolumeBranch / FOC.FreeGoodsOther_Step) * FOC.FreeGoodsOther;
					break;
				default:
					break;
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

		function getFOCWitSameProductCode(arr, offerProduct) {
			return arr.find(obj => obj.ProductPackId === offerProduct);
		}

		return netOfferPrice;
	}

	srv.before(['CREATE','UPDATE'], ['OfferValidation'], async (req) => {

		// validate form
		// req.data.OfferPrice && Number(req.data.OfferPrice) > Number(req.data.BasePrice) && req.error({ code: 404, message: "OfferPrice should not be greater than BasePrice.", target: "OfferPrice" });
		
	});

	srv.on(['CREATE','UPDATE'], ['OfferValidation'], async (req) => {
		try{
		if(req.data.Submitted === true){
			await upsertOfferStatus(req.data.OFFERID, req.data.TENDERID, 'Quotation Submitted');
			delete req.data.Submitted;
		}else {
			await resetApprovalsSent(req.data.OFFERID);
		}
		await upsertQuotation(req);
		return req.data;
		}
		catch(error){
			console.error('Error in OfferValidation CREATE');
			return req.reject(403, error?.message||"Error in OfferValidation CREATE");
		}
	});

	const upsertQuotation = async function(req){
		const mappedPTTMQUTO = mappedQuotation(req.user, req.data);

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

	const mappedQuotation = (user, data) => {
		return {
			TenderID          : data.TENDERID,
			OfferID           : data.OFFERID,
			CountryCode       : data.COUNTRYCODE,
			DistributorID     : data.DISTRIBUTORID, // TODO: this field needs to be added to OfferValidation entity
			SubmittedOn       : new Date().toISOString(),
			SubmittedBy       : user.id,
			Active            : 1, 
			OfferValidity     : data.OFFERVALIDITY,
			DelayInSubmission : null,
			AS1               : data.SELLING_COMPANY_AS1,
			AS2               : data.SELLING_COMPANY_AS2,
			OfferDate         : data.OFFERDATE,
			DeliveryTerms     : data.DELIVERYTERMS,
			I_Q_1             : null,
			I_Q_2             : null,
			I_Q_3             : null,
			Comment           : data.CUSTOM_REMARKS,
			UPDATED           : 1,
			EffectiveDate     : data.EffectiveDate,
			ExpiryDate        : data.ExpiryDate
		}
	}

	srv.on('READ', 'OfferValidation', async (req) => {
		try{
			const tx = cds.tx(req);
		
			let results = [];
			if (req.query.SELECT.where) {
				//Get filters
				let whereOffer = ServiceHelper.buildWhere(req, "OFFERID");
				results = await buildOfferValidation(tx, whereOffer);
			}
			return results;
		}
		catch(error){
			console.error('Error in OfferValidation READ');
			return req.reject(403, error?.message||"Error in OfferValidation READ");
		}
	});

	srv.on('READ', 'OfferProductValidation', async (req) => {
		try{
			const tx = cds.tx(req);
		
			let results = [];
			if (req.query.SELECT.where) {
				//Get filters
				let whereOffer = ServiceHelper.buildWhere(req, "OFFER_ID");
				results = await buildOfferProductValidation(tx, whereOffer);
			}
			return results;
		}
		catch(error){
			console.error('Error in OfferProductValidation READ');
			return req.reject(403, error?.message||"Error in OfferProductValidation READ");
		}
	});

	srv.on('READ', 'OfferProductOfferStatus', async (req) => {
		try{
		// const tx = cds.transaction(req)
		const tx = cds.tx(req);
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
			let whereOffer = ServiceHelper.buildWhere(req, "OfferId");
			results = await buildOfferApproval(tx, whereOffer);
		}
		return results;
		}
		catch(error){
			console.error('Error in OfferProductOfferStatus READ');
			return req.reject(403, error?.message||"Error in OfferProductOfferStatus READ");
		}
	});


	srv.after('READ', 'CountryLegalEntitySignatories', data => {
		data.unshift({AUTHORIZED_SIGNATORY: null, NAME: null})
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

	srv.after('READ', 'StandardDivisions', data => {
		if (data && Array.isArray(data) && data.length > 0) {
			const countryCode = data[0]?.CountryCode;
            data.unshift({
				ID: "99999999-9999-9999-9999-999999999999", 
				CountryCode: countryCode, 
				DivisionCode: "", 
				DivisionName: ""
			});
        }
	});

	srv.on('READ', 'MasterCompetitors', async (req, next) => {
		const res = await next();
		const result = res.reduce(function (a, b) {
			let company = b.CompetitorCompany;
			let currentValueIndex = a.findIndex(item => item.CompetitorCompany === company);
			if (currentValueIndex == -1) {
				a.push(b);
			}
			return a;
		}, []);
		return result;
	});

	srv.on('READ', 'MasterCompetitorProducts', async (req, next) => {
		const res = await next();
		const result = res.reduce(function (a, b) {
			let currentValueIndex = a.findIndex(item => item.CompetitorProduct === b.CompetitorProduct);
			if (currentValueIndex == -1) {
				a.push(b);
			}
			return a;
		}, []);
		return result;
	});

	srv.before(['CREATE','UPDATE'], ['DeliveryTrackingDetailView'], async (req) => {

		try{
			const today = new Date().toISOString().slice(0, 10);

			const mandatoryFielddata = await UITemplatesService.run(SELECT.from(MandatoryFieldsView).where({Section: 'DeliveryDetails', CountryCode: req?.data?.CountryCode, ProductScope: "All"}));

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

			!req.data.ActualDeliveryDate && req.error({ code: 404, message: `Actual Delivery Date is required.`, target: 'ActualDeliveryDate' });
			!req.data.ActualDeliveryQuantity && req.error({ code: 404, message: `Actual Delivery Quantity is required.`, target: 'ActualDeliveryQuantity' });

			const existingDelivery = await SELECT.one.from(PT_TMDLVTR).where({
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				SNo: req.data.SNo,
				LotID: 1
			});

			if (!existingDelivery) {
				req.data.SubmittedOn = new Date().toISOString();
				req.data.SubmittedBy = req.user.id;     
				req.data.SNo = await getNextValue(PT_TMDLVTR, "SNo");   
				req.data.Active = 1;
				req.data.LotID = 1; 
			}
			delete req.data.InstituteName;			           
		}
		catch(error){
			console.error('Error in DeliveryTrackingDetailView CREATE');
			return req.reject(403, error?.message||"Error in DeliveryTrackingDetailView CREATE");
		}
		
	});

	srv.after(['CREATE','UPDATE'], ['DeliveryTrackingDetailView'], async (data) => {
		await upsertOfferStatus(data.OfferID, data.TenderID, 'Delivery Ongoing');
		return data;
	});

	async function buildOfferApproval(tx, whereOffer) {

		let results = [];
		let approverTypes = [];
		let latestApproval = await tx.run(SELECT.from(ApprovalRequests).where(whereOffer));

		whereOffer[0].ref[0] = 'OFFER_ID'
		let offerStatus = await tx.run(SELECT.one.from(OfferStatus).where(whereOffer));

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

		return await buildValidationEntryNew(approverTypes, latestApproval, offerStatus, offerValidation, countryApprovers, countryProductPackBUs);

	}

	async function buildOfferValidation(tx, whereOffer) {

		let results = {};

		//get offer info
		let offer = await tx.run(SELECT.from(OfferConsolidation).where(whereOffer));
		if (offer.length !== 1) {
			return results;
		}
		offer = offer[0];
		const offerInformation = await SELECT.one.from(PT_TMOFRS).where({OfferID: offer.OFFERID, Active: 1});

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
		const quotation = await tx.run(SELECT.one.from(PT_TMQUTO).where({OfferID: offer.OFFERID,Active: 1}));
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
		let totalNetAmount = offerProductValidation.reduce((a, b) => a + b.NET_SALES_OFFER_CURRENCY, 0);
		let totalNetOfferAmount = offerProductValidation.reduce((a, b) => a + b.NET_OFFER_SALES_OFFER_CURRENCY, 0);
		let totalAmountInWords = `${NumberHelper.formatNumberToText(tender.CountryCode,totalAmount)} ${offer.CURRENCY} only`;
		let totalNetAmountInWords = `${NumberHelper.formatNumberToText(tender.CountryCode,totalNetAmount)} ${offer.CURRENCY} only`;
		let totalNetOfferAmountInWords = `${NumberHelper.formatNumberToText(tender.CountryCode,totalNetOfferAmount)} ${offer.CURRENCY} only`;

		let budgetRate = Math.min.apply(Math, offerProductValidation.map((d) => { return d.BUDGET_RATE }));
		let spotRate = Math.min.apply(Math, offerProductValidation.map((d) => { return d.SPOT_RATE }));

		let totalAmountVat = offerProductValidation.reduce((a, b) => a + b.GROSS_SALES_OFFER_CURRENCY_VAT, 0);
		let totalAmountVatInWords = `${NumberHelper.formatNumberToText(tender.CountryCode,totalAmountVat)} ${offer.CURRENCY} only`;
		let vatTotal = offerProductValidation.reduce((a, b) => a + b.VAT_TOTAL, 0);

		//Division can be Pharma or Radiology, this determines division for country approvers
		//If products from both divisions are in offer, then both Pharma and Radiology approvers are required
		let divisions = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { return d.DIVISION }));
		let division = (divisions.length === 1) ? divisions[0] : "Both";

		let totalPnmValue = offerProductValidation.reduce((a, b) => a + b.PNM_VALUE, 0);
/*
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
*/
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
		shipmentTerms = offer.ShipmentTerms;
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
		deliveryTerms = offer.DeliveryTerms;

/*		
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
*/
		// get SUBMITTED_BY user info 
		const whereCWID = ServiceHelper.buildFullWhere("CWID", "=", offer.TENDER_SUBMITTED_BY);
		
		const userInfo = await tx.run(SELECT.from(PT_TMUSER).where(whereCWID));
		
		const user = userInfo?.[0] || {};

		let NLHospitalManagerEmail = null;
		let NLHospitalManagerContactNumber = null;

		if(offer.COUNTRYCODE === 'NL'){
			const userInfoSignature = await tx.run(SELECT.from(PT_TMUSER).where({UserName: tender.Custom_String_1}));
			NLHospitalManagerEmail = userInfoSignature[0]?.UserEmail;
			NLHospitalManagerContactNumber = userInfoSignature[0]?.ContactNumber;
		}

		let distributor = null;
		if(offer.TENDER_CHANNEL === "Direct"){
			distributor = await tx.run(SELECT.one.from(PT_TMDIST).where({
				CountryCode: offer.COUNTRYCODE,
				DistributorID: offer.DISTRIBUTOR_ID
			}));
		}
		function checkContinuationResivedOffer(){
			if ((offerInformation.RevisedOfferNo !== 0 || offerInformation.ContinuationOfferNo !==0) && !!offerInformation.OfferID.match(/-[^-]*[CR]/)) {
				return offerInformation.NewOfferDueDate
			}else{
				return tender.BidDueDate
			}
		}

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
			AMOUNT_IN_WORDS: totalAmountInWords,
			NET_AMOUNT_IN_NUMBERS: totalNetAmount,
			NET_AMOUNT_IN_WORDS: totalNetAmountInWords,
			NET_OFFER_AMOUNT_IN_NUMBERS: totalNetOfferAmount,
			NET_OFFER_AMOUNT_IN_WORDS: totalNetOfferAmountInWords, 
			LETTERHEAD: offer && offer.LETTERHEAD ? offer.LETTERHEAD.replace(/\\+/g, "<br>") : '',
			//REGULATORY: regulatory,
			//LEGAL: legal,
			//CONTROLLING: controlling,
			//COUNTRY_BUSINESS: countryBusiness,
			//REGIONAL_BUSINESS: regionalBusiness,
			//SUPPLY_CHAIN: supply,
			DISTRIBUTORNAME: offer.TENDER_CHANNEL === "Direct" ? distributor?.DistributorName : offer.DISTRIBUTORNAME,
			DISTRIBUTORADDRESS: offer.TENDER_CHANNEL === "Direct" ? (distributor && distributor.Address ?  distributor.Address.replace(/\\+/g, "<br>") : '') : (offer && offer.DISTRIBUTORADDRESS ? offer.DISTRIBUTORADDRESS.replace(/\\+/g, "<br>") : ''),
			DISTRIBUTORPHONE: offer.TENDER_CHANNEL === "Direct" ? distributor?.ContactNo : offer.DISTRIBUTORPHONE,
			DISTRIBUTORFAX: offer.TENDER_CHANNEL === "Direct" ? distributor?.Fax : offer.DISTRIBUTORFAX,
			DISTRIBUTORCONTACT: offer.TENDER_CHANNEL === "Direct" ? distributor?.ContactPerson : offer.DISTRIBUTORCONTACT,
			DISTRIBUTOREMAIL: offer.TENDER_CHANNEL === "Direct" ? distributor?.CONTACT_EMAIL : offer.DISTRIBUTOREMAIL,
			REMARKS: offer.SELLING_COMPANY_REMARKS,
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
			BID_DUE_DATE: checkContinuationResivedOffer(),
			TENDER_SUBMITTED_BY: user.UserName || null,
			ApproverTypes: aApproverTypes,
			BUDGET_RATE: budgetRate,
			SPOT_RATE: spotRate,
			EXTERNAL_ID: tender.ExternalID,
			SAP_ID: tender.SAPID,
			// TENDER_TYPE: tenderType[0].NAME,
			CREATED_BY_USER_EMAIL : user.UserEmail || null,
			CREATED_BY_USER_ROLE : user.Role || null,
			CREATED_BY_USER_CONTACTNUMBER : user.ContactNumber || null,
			TenderChannel: offer.TenderChannel,
			ContractLength: offer.ContractLength,
			ContractExtenseion: offer.ContractExtenseion,
			NumberOfExtension: offer.NumberOfExtension,
			ClientComment: offer.ClientComment,
			Regions: offer.Regions,
			InternalDueDate: tender.BidDueDate,
        	ExpectedAwardDate: tender.AwardDate,
			Contract_Length1: offer.NumberOfExtension,
			Contract_Length2: offer.Contract_Length2,
			Contract_Length3: offer.Contract_Length3,
			InternalBidDueDate: offer.InternalBidDueDate,
			Tender_Custom_Integer_1: tender?.Custom_Integer_1,
            Tender_Custom_Integer_2: tender?.Custom_Integer_2,
            Tender_Custom_Integer_3: tender?.Custom_Integer_3,
            Tender_Custom_Integer_4: tender?.Custom_Integer_4,
            Tender_Custom_Integer_5: tender?.Custom_Integer_5,
            Tender_Custom_Integer_6: tender?.Custom_Integer_6,
            Tender_Custom_Integer_7: tender?.Custom_Integer_7,
            Tender_Custom_Integer_8: tender?.Custom_Integer_8,
            Tender_Custom_Integer_9: tender?.Custom_Integer_9,
            Tender_Custom_Integer_10: tender?.Custom_Integer_10,
            Tender_Custom_String_1: tender?.Custom_String_1,
            Tender_Custom_String_2: tender?.Custom_String_2,
            Tender_Custom_String_3: tender?.Custom_String_3,
            Tender_Custom_String_4: tender?.Custom_String_4,
            Tender_Custom_String_5: tender?.Custom_String_5,
            Tender_Custom_String_6: tender?.Custom_String_6,
            Tender_Custom_String_7: tender?.Custom_String_7,
            Tender_Custom_String_8: tender?.Custom_String_8,
            Tender_Custom_String_9: tender?.Custom_String_9,
            Tender_Custom_String_10: tender?.Custom_String_10,
            Tender_Custom_String_11: tender?.Custom_String_11,
            Tender_Custom_String_12: tender?.Custom_String_12,
            Tender_Custom_String_13: tender?.Custom_String_13,
            Tender_Custom_String_14: tender?.Custom_String_14,
            Tender_Custom_String_15: tender?.Custom_String_15,
            Tender_Custom_String_16: tender?.Custom_String_16,
            Tender_Custom_String_17: tender?.Custom_String_17,
            Tender_Custom_String_18: tender?.Custom_String_18,
            Tender_Custom_String_19: tender?.Custom_String_19,
            Tender_Custom_String_20: tender?.Custom_String_20,
            Tender_Custom_Double_1: tender?.Custom_Double_1,
            Tender_Custom_Double_2: tender?.Custom_Double_2,
            Tender_Custom_Double_3: tender?.Custom_Double_3,
            Tender_Custom_Double_4: tender?.Custom_Double_4,
            Tender_Custom_Double_5: tender?.Custom_Double_5,
            Tender_Custom_Double_6: tender?.Custom_Double_6,
            Tender_Custom_Double_7: tender?.Custom_Double_7,
            Tender_Custom_Double_8: tender?.Custom_Double_8,
            Tender_Custom_Double_9: tender?.Custom_Double_9,
            Tender_Custom_Double_10: tender?.Custom_Double_10,
            Tender_Custom_Date_1: tender?.Custom_Date_1,
            Tender_Custom_Date_2: tender?.Custom_Date_2,
            Tender_Custom_Date_3: tender?.Custom_Date_3,
            Tender_Custom_Date_4: tender?.Custom_Date_4,
            Tender_Custom_Date_5: tender?.Custom_Date_5,
            Tender_Custom_Date_6: tender?.Custom_Date_6,
            Tender_Custom_Date_7: tender?.Custom_Date_7,
            Tender_Custom_Date_8: tender?.Custom_Date_8,
            Tender_Custom_Date_9: tender?.Custom_Date_9,
            Tender_Custom_Date_10: tender?.Custom_Date_10,
            Tender_Custom_Boolean_1: tender?.Custom_Boolean_1,
            Tender_Custom_Boolean_2: tender?.Custom_Boolean_2,
            Tender_Custom_Boolean_3: tender?.Custom_Boolean_3,
            Tender_Custom_Boolean_4: tender?.Custom_Boolean_4,
            Tender_Custom_Boolean_5: tender?.Custom_Boolean_5,
            Tender_Custom_Boolean_6: tender?.Custom_Boolean_6,
            Tender_Custom_Boolean_7: tender?.Custom_Boolean_7,
            Tender_Custom_Boolean_8: tender?.Custom_Boolean_8,
            Tender_Custom_Boolean_9: tender?.Custom_Boolean_9,
            Tender_Custom_Boolean_10: tender?.Custom_Boolean_10,
            Tender_Custom_Datetime_1: tender?.Custom_Datetime_1,
            Tender_Custom_Datetime_2: tender?.Custom_Datetime_2,
            Tender_Custom_Datetime_3: tender?.Custom_Datetime_3,
            Tender_Custom_Datetime_4: tender?.Custom_Datetime_4,
            Tender_Custom_Datetime_5: tender?.Custom_Datetime_5,
            Tender_Custom_Datetime_6: tender?.Custom_Datetime_6,
            Tender_Custom_Datetime_7: tender?.Custom_Datetime_7,
            Tender_Custom_Datetime_8: tender?.Custom_Datetime_8,
            Tender_Custom_Datetime_9: tender?.Custom_Datetime_9,
            Tender_Custom_Datetime_10: tender?.Custom_Datetime_10,
			Offer_Custom_Integer_1: offerInformation?.Custom_Integer_1,
            Offer_Custom_Integer_2: offerInformation?.Custom_Integer_2,
            Offer_Custom_Integer_3: offerInformation?.Custom_Integer_3,
            Offer_Custom_Integer_4: offerInformation?.Custom_Integer_4,
            Offer_Custom_Integer_5: offerInformation?.Custom_Integer_5,
            Offer_Custom_Integer_6: offerInformation?.Custom_Integer_6,
            Offer_Custom_Integer_7: offerInformation?.Custom_Integer_7,
            Offer_Custom_Integer_8: offerInformation?.Custom_Integer_8,
            Offer_Custom_Integer_9: offerInformation?.Custom_Integer_9,
            Offer_Custom_Integer_10: offerInformation?.Custom_Integer_10,
            Offer_Custom_String_1: offerInformation?.Custom_String_1,
            Offer_Custom_String_2: offerInformation?.Custom_String_2,
            Offer_Custom_String_3: offerInformation?.Custom_String_3,
            Offer_Custom_String_4: offerInformation?.Custom_String_4,
            Offer_Custom_String_5: offerInformation?.Custom_String_5,
            Offer_Custom_String_6: offerInformation?.Custom_String_6,
            Offer_Custom_String_7: offerInformation?.Custom_String_7,
            Offer_Custom_String_8: offerInformation?.Custom_String_8,
            Offer_Custom_String_9: offerInformation?.Custom_String_9,
            Offer_Custom_String_10: offerInformation?.Custom_String_10,
            Offer_Custom_String_11: offerInformation?.Custom_String_11,
            Offer_Custom_String_12: offerInformation?.Custom_String_12,
            Offer_Custom_String_13: offerInformation?.Custom_String_13,
            Offer_Custom_String_14: offerInformation?.Custom_String_14,
            Offer_Custom_String_15: offerInformation?.Custom_String_15,
            Offer_Custom_String_16: offerInformation?.Custom_String_16,
            Offer_Custom_String_17: offerInformation?.Custom_String_17,
            Offer_Custom_String_18: offerInformation?.Custom_String_18,
            Offer_Custom_String_19: offerInformation?.Custom_String_19,
            Offer_Custom_String_20: offerInformation?.Custom_String_20,
            Offer_Custom_Double_1: offerInformation?.Custom_Double_1,
            Offer_Custom_Double_2: offerInformation?.Custom_Double_2,
            Offer_Custom_Double_3: offerInformation?.Custom_Double_3,
            Offer_Custom_Double_4: offerInformation?.Custom_Double_4,
            Offer_Custom_Double_5: offerInformation?.Custom_Double_5,
            Offer_Custom_Double_6: offerInformation?.Custom_Double_6,
            Offer_Custom_Double_7: offerInformation?.Custom_Double_7,
            Offer_Custom_Double_8: offerInformation?.Custom_Double_8,
            Offer_Custom_Double_9: offerInformation?.Custom_Double_9,
            Offer_Custom_Double_10: offerInformation?.Custom_Double_10,
            Offer_Custom_Date_1: offerInformation?.Custom_Date_1,
            Offer_Custom_Date_2: offerInformation?.Custom_Date_2,
            Offer_Custom_Date_3: offerInformation?.Custom_Date_3,
            Offer_Custom_Date_4: offerInformation?.Custom_Date_4,
            Offer_Custom_Date_5: offerInformation?.Custom_Date_5,
            Offer_Custom_Date_6: offerInformation?.Custom_Date_6,
            Offer_Custom_Date_7: offerInformation?.Custom_Date_7,
            Offer_Custom_Date_8: offerInformation?.Custom_Date_8,
            Offer_Custom_Date_9: offerInformation?.Custom_Date_9,
            Offer_Custom_Date_10: offerInformation?.Custom_Date_10,
            Offer_Custom_Boolean_1: offerInformation?.Custom_Boolean_1 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_2: offerInformation?.Custom_Boolean_2 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_3: offerInformation?.Custom_Boolean_3 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_4: offerInformation?.Custom_Boolean_4 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_5: offerInformation?.Custom_Boolean_5 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_6: offerInformation?.Custom_Boolean_6 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_7: offerInformation?.Custom_Boolean_7 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_8: offerInformation?.Custom_Boolean_8 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_9: offerInformation?.Custom_Boolean_9 === true ? 'Yes' : 'No',
            Offer_Custom_Boolean_10: offerInformation?.Custom_Boolean_10 === true ? 'Yes' : 'No',
            Offer_Custom_Datetime_1: offerInformation?.Custom_Datetime_1,
            Offer_Custom_Datetime_2: offerInformation?.Custom_Datetime_2,
            Offer_Custom_Datetime_3: offerInformation?.Custom_Datetime_3,
            Offer_Custom_Datetime_4: offerInformation?.Custom_Datetime_4,
            Offer_Custom_Datetime_5: offerInformation?.Custom_Datetime_5,
            Offer_Custom_Datetime_6: offerInformation?.Custom_Datetime_6,
            Offer_Custom_Datetime_7: offerInformation?.Custom_Datetime_7,
            Offer_Custom_Datetime_8: offerInformation?.Custom_Datetime_8,
            Offer_Custom_Datetime_9: offerInformation?.Custom_Datetime_9,
            Offer_Custom_Datetime_10: offerInformation?.Custom_Datetime_10,
			Quotation_Custom_Integer_1: quotation?.Custom_Integer_1,
            Quotation_Custom_Integer_2: quotation?.Custom_Integer_2,
            Quotation_Custom_Integer_3: quotation?.Custom_Integer_3,
            Quotation_Custom_Integer_4: quotation?.Custom_Integer_4,
            Quotation_Custom_Integer_5: quotation?.Custom_Integer_5,
            Quotation_Custom_Integer_6: quotation?.Custom_Integer_6,
            Quotation_Custom_Integer_7: quotation?.Custom_Integer_7,
            Quotation_Custom_Integer_8: quotation?.Custom_Integer_8,
            Quotation_Custom_Integer_9: quotation?.Custom_Integer_9,
            Quotation_Custom_Integer_10: quotation?.Custom_Integer_10,
            Quotation_Custom_String_1: quotation?.Custom_String_1,
            Quotation_Custom_String_2: quotation?.Custom_String_2,
            Quotation_Custom_String_3: quotation?.Custom_String_3,
            Quotation_Custom_String_4: quotation?.Custom_String_4,
            Quotation_Custom_String_5: quotation?.Custom_String_5,
            Quotation_Custom_String_6: quotation?.Custom_String_6,
            Quotation_Custom_String_7: quotation?.Custom_String_7,
            Quotation_Custom_String_8: quotation?.Custom_String_8,
            Quotation_Custom_String_9: quotation?.Custom_String_9,
            Quotation_Custom_String_10: quotation?.Custom_String_10,
            Quotation_Custom_String_11: quotation?.Custom_String_11,
            Quotation_Custom_String_12: quotation?.Custom_String_12,
            Quotation_Custom_String_13: quotation?.Custom_String_13,
            Quotation_Custom_String_14: quotation?.Custom_String_14,
            Quotation_Custom_String_15: quotation?.Custom_String_15,
            Quotation_Custom_String_16: quotation?.Custom_String_16,
            Quotation_Custom_String_17: quotation?.Custom_String_17,
            Quotation_Custom_String_18: quotation?.Custom_String_18,
            Quotation_Custom_String_19: quotation?.Custom_String_19,
            Quotation_Custom_String_20: quotation?.Custom_String_20,
            Quotation_Custom_Double_1: quotation?.Custom_Double_1,
            Quotation_Custom_Double_2: quotation?.Custom_Double_2,
            Quotation_Custom_Double_3: quotation?.Custom_Double_3,
            Quotation_Custom_Double_4: quotation?.Custom_Double_4,
            Quotation_Custom_Double_5: quotation?.Custom_Double_5,
            Quotation_Custom_Double_6: quotation?.Custom_Double_6,
            Quotation_Custom_Double_7: quotation?.Custom_Double_7,
            Quotation_Custom_Double_8: quotation?.Custom_Double_8,
            Quotation_Custom_Double_9: quotation?.Custom_Double_9,
            Quotation_Custom_Double_10: quotation?.Custom_Double_10,
            Quotation_Custom_Date_1: quotation?.Custom_Date_1,
            Quotation_Custom_Date_2: quotation?.Custom_Date_2,
            Quotation_Custom_Date_3: quotation?.Custom_Date_3,
            Quotation_Custom_Date_4: quotation?.Custom_Date_4,
            Quotation_Custom_Date_5: quotation?.Custom_Date_5,
            Quotation_Custom_Date_6: quotation?.Custom_Date_6,
            Quotation_Custom_Date_7: quotation?.Custom_Date_7,
            Quotation_Custom_Date_8: quotation?.Custom_Date_8,
            Quotation_Custom_Date_9: quotation?.Custom_Date_9,
            Quotation_Custom_Date_10: quotation?.Custom_Date_10,
            Quotation_Custom_Boolean_1: quotation?.Custom_Boolean_1,
            Quotation_Custom_Boolean_2: quotation?.Custom_Boolean_2,
            Quotation_Custom_Boolean_3: quotation?.Custom_Boolean_3,
            Quotation_Custom_Boolean_4: quotation?.Custom_Boolean_4,
            Quotation_Custom_Boolean_5: quotation?.Custom_Boolean_5,
            Quotation_Custom_Boolean_6: quotation?.Custom_Boolean_6,
            Quotation_Custom_Boolean_7: quotation?.Custom_Boolean_7,
            Quotation_Custom_Boolean_8: quotation?.Custom_Boolean_8,
            Quotation_Custom_Boolean_9: quotation?.Custom_Boolean_9,
            Quotation_Custom_Boolean_10: quotation?.Custom_Boolean_10,
            Quotation_Custom_Datetime_1: quotation?.Custom_Datetime_1,
            Quotation_Custom_Datetime_2: quotation?.Custom_Datetime_2,
            Quotation_Custom_Datetime_3: quotation?.Custom_Datetime_3,
            Quotation_Custom_Datetime_4: quotation?.Custom_Datetime_4,
            Quotation_Custom_Datetime_5: quotation?.Custom_Datetime_5,
            Quotation_Custom_Datetime_6: quotation?.Custom_Datetime_6,
            Quotation_Custom_Datetime_7: quotation?.Custom_Datetime_7,
            Quotation_Custom_Datetime_8: quotation?.Custom_Datetime_8,
            Quotation_Custom_Datetime_9: quotation?.Custom_Datetime_9,
            Quotation_Custom_Datetime_10: quotation?.Custom_Datetime_10,
			NLHospitalManagerEmail: NLHospitalManagerEmail,
            NLHospitalManagerContactNumber : NLHospitalManagerContactNumber,
			TotalPNM_Value				: totalPnmValue,
		};
		return results;
	
	}

	async function buildValidationEntryNew(approverTypes, latestApproval, offerStatus, offerValidation, countryApprovers, countryProductPackBUs) {

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
			let hierarchy = null;
			
			let approvalForType = mapApprovalForType(type.ApproverType, latestApproval, offerValidation.DIVISION);
			let defaultForType = mapDefaultCountryApprovers(countryApprovers, type.ApproverType, offerValidation, countryProductPackBUs);

			if (offerStatus.STATUS === 'Offer Created'){
				if (defaultForType.length !== 0) {
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
			}
			else if (approvalForType.length !== 0) {
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
				hierarchy = approvalForType[0].Hierarchy;
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
			if(offerValidation.COUNTRYCODE === 'PK' && countryProductPackBUs.includes("SM")){
				type.ApproverType === 'Finance Approver' ? type.Hierarchy = 1 : type.Hierarchy;
				if(type.ApproverType === 'Country Commercial Lead') {
					type.ValidationType = 3;
					type.ValidationType2 = 3;
					requiredAction = 3;
				} 
			}
			let approvalTypeSection = (requiredAction === 1) ? 2 : 1;
			let approvalTypeStatus = (offerStatus.STATUS === 'Offer Created' || approvalForType.length === 0) ? "Not Sent" : approvalForType[0].ApprovalStatus
			aResults.push({
				TenderID: offerValidation.TENDERID,
				OfferId: offerValidation.OFFERID,
				CountryCode: offerValidation.COUNTRYCODE,
				ApprovalContent: getApprovalContent(approverType),
				ApproverTypeSection: approvalTypeSection,
				REQUIRED_ACTION: offerStatus.STATUS === 'Offer Created' ? getRequiredAction(requiredAction) : approvalForType[0] && approvalForType[0].REQUIRED_ACTION ? approvalForType[0].REQUIRED_ACTION : getRequiredAction(requiredAction),
				ApprovalStatus: approvalTypeStatus,
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
				UserEmail: userEmail,
				Hierarchy: hierarchy || type.Hierarchy,
				send: approvalTypeSection === 1 || approvalTypeStatus !== 'Not Sent' ? 'Yes' : 'No'
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

		/*//For MEA specific
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
						
		}*/
		
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
		let instituteTerritory = await tx.run(SELECT.one.from(InstituteTerritory).where(whereInstituteId));
		let userInfo = await tx.run(SELECT.one.from(PT_TMUSER).where({CWID: tx?.context?.req?.user?.id}));

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

			let productInfo = await buildProductInfoForCountry(tx, offer, offerProduct, aTempApproverTypes, institute, offerProductsTotalValue, productPack, instituteTerritory, userInfo);

			//Get corresponding Product Distributor ID
			const whereProductId = {
				ProductCode: offerProduct.ProductCode,
				OfferID:offer.OFFERID,
				Active: 1
			}
			const productDistributorInfo = await tx.run(SELECT.one.from(PT_TMOFPR).where(whereProductId));
			const whereDelivery ={
				OfferID: offer.OFFERID,
				ProductCode: offerProduct.ProductCode,
				LotID: 1
			}
			const delivery = await tx.run(SELECT.one.from(PT_TMDLVTR).where(whereDelivery));
			const whereCompetitorResult ={
				OFFERID: offer.OFFERID,
				PRODUCTCODE: offerProduct.ProductCode,
				LOTID: 1
			}
			const competitorResult = await tx.run(SELECT.one.from(TransCompetitorResult).where(whereCompetitorResult));

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

			//const productPricing = await tx.run(SELECT.one.from(ProductPricingView).where(whereProductPricing));
			const productPricingTable = await tx.run(SELECT.one.from(ProductPricing).where(whereProductPricing));
			//let finalDiscount = productPricing.FinalDiscount ? Number(Number(productPricing.FinalDiscount*100).toFixed(2)) : null;
						
			// let finalDiscount;            
			// if (productPricing.UOM === "Unit") {
			// 	finalDiscount = Number(((1 -( productPricing.NetofferPrice / productPricing.ConsumerPriceExclPU ))*100).toFixed(2));
			// } else {
			// 	finalDiscount = Number(((1 -( productPricing.NetofferPrice / productPricing.ConsumerPriceExclPP ))*100).toFixed(2));
			// }
			
			//let dVat = offerProduct.VAT ? Number(Number(offerProduct.VAT*100).toFixed(2)) : null;
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
			const priceConditionClassification = await tx.run(SELECT.one.from(PriceConditionClassification).where({ ID: productConditionstmp[0]?.PriceConditionClassification_ID }));
			const productConditions = await Promise.all(productConditionstmp.map( async (productCondition) => {
				productCondition.DiscountCondition = await tx.run(SELECT.from(DiscountCondition).where({ PriceCondition_ID: productCondition.ID }));
				productCondition.FreeGoodsOther = await tx.run(SELECT.from(FreeGoodsOther).where({ PriceCondition_ID: productCondition.ID }));
				// productCondition.FreeGoodsOther.forEach(async foc => {
				// 	foc.ProductPack = await tx.run(SELECT.from(PT_TMPRDPCK).where({ PRODUCTPACKID: foc.ProductPackId, ACTIVERECORD: 'Yes' }))
				// });
				for (const foc of productCondition.FreeGoodsOther) {
					foc.ProductPack = await tx.run(SELECT.from(PT_TMPRDPCK).where({ PRODUCTPACKID: foc.ProductPackId, ACTIVERECORD: 'Yes' }));
				}
				productCondition.PriceConditionClassification = await tx.run(SELECT.one.from(PriceConditionClassification).where({ ID: productCondition.PriceConditionClassification_ID }));
				productCondition.NLPriceConditions = await tx.run(SELECT.from(NLPriceConditions).where({ PriceCondition_ID: productCondition.ID}));
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
			// const whereProductPackId = {
			// 	ProductPricing_ProductCode: offerProduct.PRODUCTID,
			// 	ProductPricing_OfferID: offer.OFFERID
			// }
			const aFreeGoodsOtherTemp = await tx.run(SELECT.from(FreeGoodsOther).where({ProductPackId: offerProduct.PRODUCTID}));

			// const wherePriceconditions = {
			// 	OfferID: offer.OFFERID,
			// 	ProductCode: offerProduct.PRODUCTID,
			// 	CountryCode: offer.COUNTRYCODE
			// }

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

				tmpFreeGoodOther.ProductPack = await tx.run(SELECT.from(PT_TMPRDPCK).where({PRODUCTPACKID: tmpFreeGoodOther.ProductPackId}));

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

			// // if no decimals on tax rate, add ',00' manually (n2words doesn't support integers like 10 or 21)
			// // this should only be done for Italy & only for vatInWords
			// let vatInWords = NumberHelper.formatNumberToText(offer.COUNTRYCODE,dVat);
			// if(Number.isInteger(dVat) && offer.COUNTRYCODE === 'IT'){
			// 	vatInWords += ",00";   
			// };

			const priceConditionCurrentSectionTaiwan = await tx.run(SELECT.one.from(PriceConditionCurrentSectionTaiwanView).where({ ProductCode: offerProduct.ProductCode, INSTITUTE_ID: offer.INSTITUTE_ID }));
			//const pricingPolicy = await tx.run(SELECT.one.from(PricingPolicy).where({ ProductPackID: offerProduct.ProductCode, CountryCode: offer.COUNTRYCODE }));
			const productFreeGoodsOther = productConditions[0]?.FreeGoodsOther?.find(fg => fg.ProductPackId === offerProduct.ProductCode);
			const awardedProduct = await tx.run(SELECT.one.from(PT_TMTRRES).where({
				OfferID: offer.OFFERID,
				ProductCode: offerProduct.ProductCode,
				LotID: offerProduct.LOTID
			}));

			const awardProductFormView = await tx.run(SELECT.one.from(AwardedProductFormView).where({
				OfferID: offer.OFFERID,
				ProductCode: offerProduct.ProductCode,
				LotID: offerProduct.LOTID
			}));

			let FOCInfoText = ''
			if (productFreeGoodsOther?.FreeGoodsOther) {
				switch (productFreeGoodsOther.FreeGoodsOther_ABS_PCT) {
					case 'PCT':
						FOCInfoText = `${Math.round(productFreeGoodsOther.FreeGoodsOther * 10000) / 100}% (${productFreeGoodsOther.ADD_INCLUDE})`
						break;
					case 'ABS':
						FOCInfoText = `${productFreeGoodsOther.FreeGoodsOther} ${offerProduct.UNIT}(s) (${productFreeGoodsOther.ADD_INCLUDE})`
						break;
					case 'STP':
						FOCInfoText = `${productFreeGoodsOther.FreeGoodsOther} ${offerProduct.UNIT}(s) for each ${productFreeGoodsOther.FreeGoodsOther_Step} ${offerProduct.UNIT}(s) purchased (${productFreeGoodsOther.ADD_INCLUDE})`
						break;
					default:
						break;
				}
			}else {
				FOCInfoText = 'NA';
			}
			let PL_VolumeInPacks = 0;
			let PNM_VALUE = 0;
			if(offer.COUNTRYCODE === 'PL'){
				PL_VolumeInPacks = parseInt(productInfo.CommnonProductInfo.RequestedQuantityString)/offerProduct.PACKSIZE;
				PNM_VALUE = productInfo.CommnonProductInfo.NetPricePack * PL_VolumeInPacks;
			}
			
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
				VAT: 0,
				VAT_IN_WORDS: '',
				PRODUCT_COMMENT: productInfo.CommnonProductInfo.ProductComment,
				UNIT: offerProduct.UNIT,
				TOTAL_VOLUME: productInfo.CommnonProductInfo.TotalVolume,
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
				MAX_PRICE_NHS_PP: 0,
				MAX_PRICE_NHS_PP_IN_WORDS: '',
				MAX_PRICE_NHS_PU: 0,
				MAX_PRICE_NHS_PU_IN_WORDS: '',
				MAX_PRICE_NHS_PU_WITH_VAT: 0,
				MAX_PRICE_NHS_PU_WITH_VAT_IN_WORDS: '',
				CONTRACT_START_DATE: '',
				NET_OFFER_PRICE_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, offerProduct.NET_OFFER_PRICE),
				CUSTOMER_ID: institute.CustomerID,
				COGS: offerProduct.COGS,//This is now in offer currency (used to be EUR)
				COGS_EUR_UNIT: productInfo.CommnonProductInfo.CogsEurUnit,
				COGS_EUR_PACK: productInfo.CommnonProductInfo.CogsEurPack,
				GROSS_SALES_OFFER_CURRENCY: productInfo.CommnonProductInfo.GrossSales,
				GROSS_SALES_OFFER_CURRENCY_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.GrossSales),
				NET_SALES_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetSales,
				NET_SALES_OFFER_CURRENCY_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.NetSales),
				NET_OFFER_SALES_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetOfferSales,
				NET_OFFER_SALES_OFFER_CURRENCY_IN_WORDS: NumberHelper.formatNumberToText(offer.COUNTRYCODE, productInfo.CommnonProductInfo.NetOfferSales),
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
				FINAL_DISCOUNT: 0,
				FINAL_DISCOUNT_IN_WORDS: '',
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
				City: DistributorInfo?.City ?? null,
				AwardedPrice: awardedProduct?.AwardedPrice,
				InstituteID: offer.INSTITUTE_ID,
				EARLIEST_DATE: offerProduct.EARLIEST_DATE,
				Comment: offerProduct.Comment,
				PackSizeRequired: offerProduct.PackSizeRequired,
				Price0: productConditionstmp[0] && productConditionstmp[0].Price0,
				Price1: productConditionstmp[0] && productConditionstmp[0].Price1,
				Price3: productConditionstmp[0] && productConditionstmp[0].Price3,
				Level2Discount1: productConditionstmp[0] && productConditionstmp[0].Level2Discount1,
				Level2Discount2: productConditionstmp[0] && productConditionstmp[0].Level2Discount2,
				AnnualDiscount_Percentage: productConditionstmp[0] && productConditionstmp[0].AnnualDiscount_Percentage,
				NegotiationPrice: productConditionstmp[0] && productConditionstmp[0].NegotiationPrice,
				PricingPolicyValue: offerProduct.UK_BUDGETED_PROFITABILITY,
				PriceConditionCurrentSectionTaiwan: priceConditionCurrentSectionTaiwan,
				FreeGoodsQuantity: productFreeGoodsOther?.FreeGoodsOther,
				FreeGoodsOther_Step: productFreeGoodsOther?.FreeGoodsOther_Step,
				FreeGoodsOther_ABS_PCT: productFreeGoodsOther?.FreeGoodsOther_ABS_PCT,
				FOC_PRODUCTPACKNAME: productFreeGoodsOther && offerProduct.PRODUCTNAME,
				ADD_INCLUDE: productFreeGoodsOther?.ADD_INCLUDE,
				Level3Discount1: productConditionstmp[0] && productConditionstmp[0].Level3Discount1,
				Level1Discount1: productConditionstmp[0] && productConditionstmp[0].Level1Discount1,
				Region: offer.Region,
				AlternateOfferYN: offerProduct.AlternateOfferYN,
				FOCInfoText: FOCInfoText,
				ContractDuration_1: (productConditions[0] && productConditions[0].NLPriceConditions?.[0]?.ContractDuration) || null,
				ContractDuration_2: (productConditions[0] && productConditions[0].NLPriceConditions?.[1]?.ContractDuration) || null,
				ContractDuration_3: (productConditions[0] && productConditions[0].NLPriceConditions?.[2]?.ContractDuration) || null,
				OfferPrice_1: (productConditions[0] && productConditions[0].NLPriceConditions?.[0]?.OfferPrice) || null,
				OfferPrice_2: (productConditions[0] && productConditions[0].NLPriceConditions?.[1]?.OfferPrice) || null,
				OfferPrice_3: (productConditions[0] && productConditions[0].NLPriceConditions?.[2]?.OfferPrice) || null,
				Discount_1: (productConditions[0] && productConditions[0].NLPriceConditions?.[0]?.Discount) || null,
				Discount_2: (productConditions[0] && productConditions[0].NLPriceConditions?.[1]?.Discount) || null,
				Discount_3: (productConditions[0] && productConditions[0].NLPriceConditions?.[2]?.Discount) || null,
				NLPriceConditionType: priceConditionClassification && priceConditionClassification.ConditionType.replace(/^NL/, ''),
				Product_Custom_Integer_1: productDistributorInfo?.Custom_Integer_1,
				Product_Custom_Integer_2: productDistributorInfo?.Custom_Integer_2,
				Product_Custom_Integer_3: productDistributorInfo?.Custom_Integer_3,
				Product_Custom_Integer_4: productDistributorInfo?.Custom_Integer_4,
				Product_Custom_Integer_5: productDistributorInfo?.Custom_Integer_5,
				Product_Custom_Integer_6: productDistributorInfo?.Custom_Integer_6,
				Product_Custom_Integer_7: productDistributorInfo?.Custom_Integer_7,
				Product_Custom_Integer_8: productDistributorInfo?.Custom_Integer_8,
				Product_Custom_Integer_9: productDistributorInfo?.Custom_Integer_9,
				Product_Custom_Integer_10: productDistributorInfo?.Custom_Integer_10,
				Product_Custom_String_1: productDistributorInfo?.Custom_String_1,
				Product_Custom_String_2: productDistributorInfo?.Custom_String_2,
				Product_Custom_String_3: productDistributorInfo?.Custom_String_3,
				Product_Custom_String_4: productDistributorInfo?.Custom_String_4,
				Product_Custom_String_5: productDistributorInfo?.Custom_String_5,
				Product_Custom_String_6: productDistributorInfo?.Custom_String_6,
				Product_Custom_String_7: productDistributorInfo?.Custom_String_7,
				Product_Custom_String_8: productDistributorInfo?.Custom_String_8,
				Product_Custom_String_9: productDistributorInfo?.Custom_String_9,
				Product_Custom_String_10: productDistributorInfo?.Custom_String_10,
				Product_Custom_String_11: productDistributorInfo?.Custom_String_11,
				Product_Custom_String_12: productDistributorInfo?.Custom_String_12,
				Product_Custom_String_13: productDistributorInfo?.Custom_String_13,
				Product_Custom_String_14: productDistributorInfo?.Custom_String_14,
				Product_Custom_String_15: productDistributorInfo?.Custom_String_15,
				Product_Custom_String_16: productDistributorInfo?.Custom_String_16,
				Product_Custom_String_17: productDistributorInfo?.Custom_String_17,
				Product_Custom_String_18: productDistributorInfo?.Custom_String_18,
				Product_Custom_String_19: productDistributorInfo?.Custom_String_19,
				Product_Custom_String_20: productDistributorInfo?.Custom_String_20,
				Product_Custom_Double_1: productDistributorInfo?.Custom_Double_1,
				Product_Custom_Double_2: productDistributorInfo?.Custom_Double_2,
				Product_Custom_Double_3: productDistributorInfo?.Custom_Double_3,
				Product_Custom_Double_4: productDistributorInfo?.Custom_Double_4,
				Product_Custom_Double_5: productDistributorInfo?.Custom_Double_5,
				Product_Custom_Double_6: productDistributorInfo?.Custom_Double_6,
				Product_Custom_Double_7: productDistributorInfo?.Custom_Double_7,
				Product_Custom_Double_8: productDistributorInfo?.Custom_Double_8,
				Product_Custom_Double_9: productDistributorInfo?.Custom_Double_9,
				Product_Custom_Double_10: productDistributorInfo?.Custom_Double_10,
				Product_Custom_Date_1: productDistributorInfo?.Custom_Date_1,
				Product_Custom_Date_2: productDistributorInfo?.Custom_Date_2,
				Product_Custom_Date_3: productDistributorInfo?.Custom_Date_3,
				Product_Custom_Date_4: productDistributorInfo?.Custom_Date_4,
				Product_Custom_Date_5: productDistributorInfo?.Custom_Date_5,
				Product_Custom_Date_6: productDistributorInfo?.Custom_Date_6,
				Product_Custom_Date_7: productDistributorInfo?.Custom_Date_7,
				Product_Custom_Date_8: productDistributorInfo?.Custom_Date_8,
				Product_Custom_Date_9: productDistributorInfo?.Custom_Date_9,
				Product_Custom_Date_10: productDistributorInfo?.Custom_Date_10,
				Product_Custom_Boolean_1: productDistributorInfo?.Custom_Boolean_1,
				Product_Custom_Boolean_2: productDistributorInfo?.Custom_Boolean_2,
				Product_Custom_Boolean_3: productDistributorInfo?.Custom_Boolean_3,
				Product_Custom_Boolean_4: productDistributorInfo?.Custom_Boolean_4,
				Product_Custom_Boolean_5: productDistributorInfo?.Custom_Boolean_5,
				Product_Custom_Boolean_6: productDistributorInfo?.Custom_Boolean_6,
				Product_Custom_Boolean_7: productDistributorInfo?.Custom_Boolean_7,
				Product_Custom_Boolean_8: productDistributorInfo?.Custom_Boolean_8,
				Product_Custom_Boolean_9: productDistributorInfo?.Custom_Boolean_9,
				Product_Custom_Boolean_10: productDistributorInfo?.Custom_Boolean_10,
				Product_Custom_Datetime_1: productDistributorInfo?.Custom_Datetime_1,
				Product_Custom_Datetime_2: productDistributorInfo?.Custom_Datetime_2,
				Product_Custom_Datetime_3: productDistributorInfo?.Custom_Datetime_3,
				Product_Custom_Datetime_4: productDistributorInfo?.Custom_Datetime_4,
				Product_Custom_Datetime_5: productDistributorInfo?.Custom_Datetime_5,
				Product_Custom_Datetime_6: productDistributorInfo?.Custom_Datetime_6,
				Product_Custom_Datetime_7: productDistributorInfo?.Custom_Datetime_7,
				Product_Custom_Datetime_8: productDistributorInfo?.Custom_Datetime_8,
				Product_Custom_Datetime_9: productDistributorInfo?.Custom_Datetime_9,
				Product_Custom_Datetime_10: productDistributorInfo?.Custom_Datetime_10,
				Delivery_Custom_Integer_1: delivery?.Custom_Integer_1,
				Delivery_Custom_Integer_2: delivery?.Custom_Integer_2,
				Delivery_Custom_Integer_3: delivery?.Custom_Integer_3,
				Delivery_Custom_Integer_4: delivery?.Custom_Integer_4,
				Delivery_Custom_Integer_5: delivery?.Custom_Integer_5,
				Delivery_Custom_Integer_6: delivery?.Custom_Integer_6,
				Delivery_Custom_Integer_7: delivery?.Custom_Integer_7,
				Delivery_Custom_Integer_8: delivery?.Custom_Integer_8,
				Delivery_Custom_Integer_9: delivery?.Custom_Integer_9,
				Delivery_Custom_Integer_10: delivery?.Custom_Integer_10,
				Delivery_Custom_String_1: delivery?.Custom_String_1,
				Delivery_Custom_String_2: delivery?.Custom_String_2,
				Delivery_Custom_String_3: delivery?.Custom_String_3,
				Delivery_Custom_String_4: delivery?.Custom_String_4,
				Delivery_Custom_String_5: delivery?.Custom_String_5,
				Delivery_Custom_String_6: delivery?.Custom_String_6,
				Delivery_Custom_String_7: delivery?.Custom_String_7,
				Delivery_Custom_String_8: delivery?.Custom_String_8,
				Delivery_Custom_String_9: delivery?.Custom_String_9,
				Delivery_Custom_String_10: delivery?.Custom_String_10,
				Delivery_Custom_String_11: delivery?.Custom_String_11,
				Delivery_Custom_String_12: delivery?.Custom_String_12,
				Delivery_Custom_String_13: delivery?.Custom_String_13,
				Delivery_Custom_String_14: delivery?.Custom_String_14,
				Delivery_Custom_String_15: delivery?.Custom_String_15,
				Delivery_Custom_String_16: delivery?.Custom_String_16,
				Delivery_Custom_String_17: delivery?.Custom_String_17,
				Delivery_Custom_String_18: delivery?.Custom_String_18,
				Delivery_Custom_String_19: delivery?.Custom_String_19,
				Delivery_Custom_String_20: delivery?.Custom_String_20,
				Delivery_Custom_Double_1: delivery?.Custom_Double_1,
				Delivery_Custom_Double_2: delivery?.Custom_Double_2,
				Delivery_Custom_Double_3: delivery?.Custom_Double_3,
				Delivery_Custom_Double_4: delivery?.Custom_Double_4,
				Delivery_Custom_Double_5: delivery?.Custom_Double_5,
				Delivery_Custom_Double_6: delivery?.Custom_Double_6,
				Delivery_Custom_Double_7: delivery?.Custom_Double_7,
				Delivery_Custom_Double_8: delivery?.Custom_Double_8,
				Delivery_Custom_Double_9: delivery?.Custom_Double_9,
				Delivery_Custom_Double_10: delivery?.Custom_Double_10,
				Delivery_Custom_Date_1: delivery?.Custom_Date_1,
				Delivery_Custom_Date_2: delivery?.Custom_Date_2,
				Delivery_Custom_Date_3: delivery?.Custom_Date_3,
				Delivery_Custom_Date_4: delivery?.Custom_Date_4,
				Delivery_Custom_Date_5: delivery?.Custom_Date_5,
				Delivery_Custom_Date_6: delivery?.Custom_Date_6,
				Delivery_Custom_Date_7: delivery?.Custom_Date_7,
				Delivery_Custom_Date_8: delivery?.Custom_Date_8,
				Delivery_Custom_Date_9: delivery?.Custom_Date_9,
				Delivery_Custom_Date_10: delivery?.Custom_Date_10,
				Delivery_Custom_Boolean_1: delivery?.Custom_Boolean_1,
				Delivery_Custom_Boolean_2: delivery?.Custom_Boolean_2,
				Delivery_Custom_Boolean_3: delivery?.Custom_Boolean_3,
				Delivery_Custom_Boolean_4: delivery?.Custom_Boolean_4,
				Delivery_Custom_Boolean_5: delivery?.Custom_Boolean_5,
				Delivery_Custom_Boolean_6: delivery?.Custom_Boolean_6,
				Delivery_Custom_Boolean_7: delivery?.Custom_Boolean_7,
				Delivery_Custom_Boolean_8: delivery?.Custom_Boolean_8,
				Delivery_Custom_Boolean_9: delivery?.Custom_Boolean_9,
				Delivery_Custom_Boolean_10: delivery?.Custom_Boolean_10,
				Delivery_Custom_Datetime_1: delivery?.Custom_Datetime_1,
				Delivery_Custom_Datetime_2: delivery?.Custom_Datetime_2,
				Delivery_Custom_Datetime_3: delivery?.Custom_Datetime_3,
				Delivery_Custom_Datetime_4: delivery?.Custom_Datetime_4,
				Delivery_Custom_Datetime_5: delivery?.Custom_Datetime_5,
				Delivery_Custom_Datetime_6: delivery?.Custom_Datetime_6,
				Delivery_Custom_Datetime_7: delivery?.Custom_Datetime_7,
				Delivery_Custom_Datetime_8: delivery?.Custom_Datetime_8,
				Delivery_Custom_Datetime_9: delivery?.Custom_Datetime_9,
				Delivery_Custom_Datetime_10: delivery?.Custom_Datetime_10,
				TenderResults_Custom_Integer_1: awardedProduct?.Custom_Integer_1,
				TenderResults_Custom_Integer_2: awardedProduct?.Custom_Integer_2,
				TenderResults_Custom_Integer_3: awardedProduct?.Custom_Integer_3,
				TenderResults_Custom_Integer_4: awardedProduct?.Custom_Integer_4,
				TenderResults_Custom_Integer_5: awardedProduct?.Custom_Integer_5,
				TenderResults_Custom_Integer_6: awardedProduct?.Custom_Integer_6,
				TenderResults_Custom_Integer_7: awardedProduct?.Custom_Integer_7,
				TenderResults_Custom_Integer_8: awardedProduct?.Custom_Integer_8,
				TenderResults_Custom_Integer_9: awardedProduct?.Custom_Integer_9,
				TenderResults_Custom_Integer_10: awardedProduct?.Custom_Integer_10,
				TenderResults_Custom_String_1: awardedProduct?.Custom_String_1,
				TenderResults_Custom_String_2: awardedProduct?.Custom_String_2,
				TenderResults_Custom_String_3: awardedProduct?.Custom_String_3,
				TenderResults_Custom_String_4: awardedProduct?.Custom_String_4,
				TenderResults_Custom_String_5: awardedProduct?.Custom_String_5,
				TenderResults_Custom_String_6: awardedProduct?.Custom_String_6,
				TenderResults_Custom_String_7: awardedProduct?.Custom_String_7,
				TenderResults_Custom_String_8: awardedProduct?.Custom_String_8,
				TenderResults_Custom_String_9: awardedProduct?.Custom_String_9,
				TenderResults_Custom_String_10: awardedProduct?.Custom_String_10,
				TenderResults_Custom_String_11: awardedProduct?.Custom_String_11,
				TenderResults_Custom_String_12: awardedProduct?.Custom_String_12,
				TenderResults_Custom_String_13: awardedProduct?.Custom_String_13,
				TenderResults_Custom_String_14: awardedProduct?.Custom_String_14,
				TenderResults_Custom_String_15: awardedProduct?.Custom_String_15,
				TenderResults_Custom_String_16: awardedProduct?.Custom_String_16,
				TenderResults_Custom_String_17: awardedProduct?.Custom_String_17,
				TenderResults_Custom_String_18: awardedProduct?.Custom_String_18,
				TenderResults_Custom_String_19: awardedProduct?.Custom_String_19,
				TenderResults_Custom_String_20: awardedProduct?.Custom_String_20,
				TenderResults_Custom_Double_1: awardedProduct?.Custom_Double_1,
				TenderResults_Custom_Double_2: awardedProduct?.Custom_Double_2,
				TenderResults_Custom_Double_3: awardedProduct?.Custom_Double_3,
				TenderResults_Custom_Double_4: awardedProduct?.Custom_Double_4,
				TenderResults_Custom_Double_5: awardedProduct?.Custom_Double_5,
				TenderResults_Custom_Double_6: awardedProduct?.Custom_Double_6,
				TenderResults_Custom_Double_7: awardedProduct?.Custom_Double_7,
				TenderResults_Custom_Double_8: awardedProduct?.Custom_Double_8,
				TenderResults_Custom_Double_9: awardedProduct?.Custom_Double_9,
				TenderResults_Custom_Double_10: awardedProduct?.Custom_Double_10,
				TenderResults_Custom_Date_1: awardedProduct?.Custom_Date_1,
				TenderResults_Custom_Date_2: awardedProduct?.Custom_Date_2,
				TenderResults_Custom_Date_3: awardedProduct?.Custom_Date_3,
				TenderResults_Custom_Date_4: awardedProduct?.Custom_Date_4,
				TenderResults_Custom_Date_5: awardedProduct?.Custom_Date_5,
				TenderResults_Custom_Date_6: awardedProduct?.Custom_Date_6,
				TenderResults_Custom_Date_7: awardedProduct?.Custom_Date_7,
				TenderResults_Custom_Date_8: awardedProduct?.Custom_Date_8,
				TenderResults_Custom_Date_9: awardedProduct?.Custom_Date_9,
				TenderResults_Custom_Date_10: awardedProduct?.Custom_Date_10,
				TenderResults_Custom_Boolean_1: awardedProduct?.Custom_Boolean_1,
				TenderResults_Custom_Boolean_2: awardedProduct?.Custom_Boolean_2,
				TenderResults_Custom_Boolean_3: awardedProduct?.Custom_Boolean_3,
				TenderResults_Custom_Boolean_4: awardedProduct?.Custom_Boolean_4,
				TenderResults_Custom_Boolean_5: awardedProduct?.Custom_Boolean_5,
				TenderResults_Custom_Boolean_6: awardedProduct?.Custom_Boolean_6,
				TenderResults_Custom_Boolean_7: awardedProduct?.Custom_Boolean_7,
				TenderResults_Custom_Boolean_8: awardedProduct?.Custom_Boolean_8,
				TenderResults_Custom_Boolean_9: awardedProduct?.Custom_Boolean_9,
				TenderResults_Custom_Boolean_10: awardedProduct?.Custom_Boolean_10,
				TenderResults_Custom_Datetime_1: awardedProduct?.Custom_Datetime_1,
				TenderResults_Custom_Datetime_2: awardedProduct?.Custom_Datetime_2,
				TenderResults_Custom_Datetime_3: awardedProduct?.Custom_Datetime_3,
				TenderResults_Custom_Datetime_4: awardedProduct?.Custom_Datetime_4,
				TenderResults_Custom_Datetime_5: awardedProduct?.Custom_Datetime_5,
				TenderResults_Custom_Datetime_6: awardedProduct?.Custom_Datetime_6,
				TenderResults_Custom_Datetime_7: awardedProduct?.Custom_Datetime_7,
				TenderResults_Custom_Datetime_8: awardedProduct?.Custom_Datetime_8,
				TenderResults_Custom_Datetime_9: awardedProduct?.Custom_Datetime_9,
				TenderResults_Custom_Datetime_10: awardedProduct?.Custom_Datetime_10,
				CompetitorResult_Custom_Integer_1: competitorResult?.Custom_Integer_1,
				CompetitorResult_Custom_Integer_2: competitorResult?.Custom_Integer_2,
				CompetitorResult_Custom_Integer_3: competitorResult?.Custom_Integer_3,
				CompetitorResult_Custom_Integer_4: competitorResult?.Custom_Integer_4,
				CompetitorResult_Custom_Integer_5: competitorResult?.Custom_Integer_5,
				CompetitorResult_Custom_Integer_6: competitorResult?.Custom_Integer_6,
				CompetitorResult_Custom_Integer_7: competitorResult?.Custom_Integer_7,
				CompetitorResult_Custom_Integer_8: competitorResult?.Custom_Integer_8,
				CompetitorResult_Custom_Integer_9: competitorResult?.Custom_Integer_9,
				CompetitorResult_Custom_Integer_10: competitorResult?.Custom_Integer_10,
				CompetitorResult_Custom_String_1: competitorResult?.Custom_String_1,
				CompetitorResult_Custom_String_2: competitorResult?.Custom_String_2,
				CompetitorResult_Custom_String_3: competitorResult?.Custom_String_3,
				CompetitorResult_Custom_String_4: competitorResult?.Custom_String_4,
				CompetitorResult_Custom_String_5: competitorResult?.Custom_String_5,
				CompetitorResult_Custom_String_6: competitorResult?.Custom_String_6,
				CompetitorResult_Custom_String_7: competitorResult?.Custom_String_7,
				CompetitorResult_Custom_String_8: competitorResult?.Custom_String_8,
				CompetitorResult_Custom_String_9: competitorResult?.Custom_String_9,
				CompetitorResult_Custom_String_10: competitorResult?.Custom_String_10,
				CompetitorResult_Custom_String_11: competitorResult?.Custom_String_11,
				CompetitorResult_Custom_String_12: competitorResult?.Custom_String_12,
				CompetitorResult_Custom_String_13: competitorResult?.Custom_String_13,
				CompetitorResult_Custom_String_14: competitorResult?.Custom_String_14,
				CompetitorResult_Custom_String_15: competitorResult?.Custom_String_15,
				CompetitorResult_Custom_String_16: competitorResult?.Custom_String_16,
				CompetitorResult_Custom_String_17: competitorResult?.Custom_String_17,
				CompetitorResult_Custom_String_18: competitorResult?.Custom_String_18,
				CompetitorResult_Custom_String_19: competitorResult?.Custom_String_19,
				CompetitorResult_Custom_String_20: competitorResult?.Custom_String_20,
				CompetitorResult_Custom_Double_1: competitorResult?.Custom_Double_1,
				CompetitorResult_Custom_Double_2: competitorResult?.Custom_Double_2,
				CompetitorResult_Custom_Double_3: competitorResult?.Custom_Double_3,
				CompetitorResult_Custom_Double_4: competitorResult?.Custom_Double_4,
				CompetitorResult_Custom_Double_5: competitorResult?.Custom_Double_5,
				CompetitorResult_Custom_Double_6: competitorResult?.Custom_Double_6,
				CompetitorResult_Custom_Double_7: competitorResult?.Custom_Double_7,
				CompetitorResult_Custom_Double_8: competitorResult?.Custom_Double_8,
				CompetitorResult_Custom_Double_9: competitorResult?.Custom_Double_9,
				CompetitorResult_Custom_Double_10: competitorResult?.Custom_Double_10,
				CompetitorResult_Custom_Date_1: competitorResult?.Custom_Date_1,
				CompetitorResult_Custom_Date_2: competitorResult?.Custom_Date_2,
				CompetitorResult_Custom_Date_3: competitorResult?.Custom_Date_3,
				CompetitorResult_Custom_Date_4: competitorResult?.Custom_Date_4,
				CompetitorResult_Custom_Date_5: competitorResult?.Custom_Date_5,
				CompetitorResult_Custom_Date_6: competitorResult?.Custom_Date_6,
				CompetitorResult_Custom_Date_7: competitorResult?.Custom_Date_7,
				CompetitorResult_Custom_Date_8: competitorResult?.Custom_Date_8,
				CompetitorResult_Custom_Date_9: competitorResult?.Custom_Date_9,
				CompetitorResult_Custom_Date_10: competitorResult?.Custom_Date_10,
				CompetitorResult_Custom_Boolean_1: competitorResult?.Custom_Boolean_1,
				CompetitorResult_Custom_Boolean_2: competitorResult?.Custom_Boolean_2,
				CompetitorResult_Custom_Boolean_3: competitorResult?.Custom_Boolean_3,
				CompetitorResult_Custom_Boolean_4: competitorResult?.Custom_Boolean_4,
				CompetitorResult_Custom_Boolean_5: competitorResult?.Custom_Boolean_5,
				CompetitorResult_Custom_Boolean_6: competitorResult?.Custom_Boolean_6,
				CompetitorResult_Custom_Boolean_7: competitorResult?.Custom_Boolean_7,
				CompetitorResult_Custom_Boolean_8: competitorResult?.Custom_Boolean_8,
				CompetitorResult_Custom_Boolean_9: competitorResult?.Custom_Boolean_9,
				CompetitorResult_Custom_Boolean_10: competitorResult?.Custom_Boolean_10,
				CompetitorResult_Custom_Datetime_1: competitorResult?.Custom_Datetime_1,
				CompetitorResult_Custom_Datetime_2: competitorResult?.Custom_Datetime_2,
				CompetitorResult_Custom_Datetime_3: competitorResult?.Custom_Datetime_3,
				CompetitorResult_Custom_Datetime_4: competitorResult?.Custom_Datetime_4,
				CompetitorResult_Custom_Datetime_5: competitorResult?.Custom_Datetime_5,
				CompetitorResult_Custom_Datetime_6: competitorResult?.Custom_Datetime_6,
				CompetitorResult_Custom_Datetime_7: competitorResult?.Custom_Datetime_7,
				CompetitorResult_Custom_Datetime_8: competitorResult?.Custom_Datetime_8,
				CompetitorResult_Custom_Datetime_9: competitorResult?.Custom_Datetime_9,
				CompetitorResult_Custom_Datetime_10: competitorResult?.Custom_Datetime_10,
				NLStaticField1: 'N',
				NLStaticField2: 'NA',
				PL_VolumeInPacks: PL_VolumeInPacks,
				PNM_VALUE		: PNM_VALUE,
				MaxNetPricePerPack  : productConditionstmp[0] && (productConditionstmp[0].Price1 * offerProduct.PACKSIZE) || 0
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

	async function buildProductInfoForCountry(tx, offer, product, aApproverTypes, institute, offerProductsTotalValue, productPack, instituteTerritory, userInfo) {
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

		if (offer.APPROVAL_TYPE === 16) {
			productValidation = await buildProductValidationForType16(tx, offer, product, commnonProductInfo, aApproverTypes, offerProductsTotalValue, productPack, instituteTerritory);
		}
		if (offer.APPROVAL_TYPE === 17) {
			productValidation = await buildProductValidationForType17(tx, offer, product, aApproverTypes);
		}
		if (offer.APPROVAL_TYPE === 18) {
			productValidation = await buildProductValidationForType18(tx, offer, product, aApproverTypes, userInfo);
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
			
			if(ServiceHelper.isDoubleEqual(priceCondition.Price1, priceCondition.Price0) || ServiceHelper.isDoubleXBelowEqualY(priceCondition.Price1, priceCondition.Price0)){
				aApproverTypes.map(async function (oApproverType) {
					oApproverType.ValidationType = oApproverType.ValidationType2;
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
					break;
				case 'NetOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? priceCondition.NetOfferPrice * product.PACKSIZE : priceCondition.NetOfferPrice;
					break;
				case 'NetPrice':
					comparisonPrice = product.UOM === 'Unit' ? priceCondition.NetPrice * product.PACKSIZE : priceCondition.NetPrice;
					break;
				case 'OfferPriceVSRegisteredPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.Price0 * product.PACKSIZE) - (priceCondition.OfferPrice * product.PACKSIZE)) / (priceCondition.Price0 * product.PACKSIZE) : 
															(priceCondition.Price0 - priceCondition.OfferPrice) / priceCondition.Price0;
					break;
				case 'NetPriceVSRegisteredPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.Price0 * product.PACKSIZE) - (priceCondition.NetPrice * product.PACKSIZE)) / (priceCondition.Price0 * product.PACKSIZE) :
															(priceCondition.Price0 - priceCondition.NetPrice) / priceCondition.Price0;
					break;
				case 'NetOfferPriceVSRegisteredPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.Price0 * product.PACKSIZE) - priceCondition.NetOfferPrice) / (priceCondition.Price0 * product.PACKSIZE) :
															(priceCondition.Price0 - priceCondition.NetOfferPrice) / priceCondition.Price0;
					break;
				case 'NetOfferPriceVSOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.OfferPrice * product.PACKSIZE) - (priceCondition.NetOfferPrice * product.PACKSIZE)) / (priceCondition.OfferPrice * product.PACKSIZE) : 
																(priceCondition.OfferPrice - priceCondition.NetOfferPrice) / priceCondition.OfferPrice;
					break;
				case 'NetPriceVSOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.OfferPrice * product.PACKSIZE) - (priceCondition.NetPrice * product.PACKSIZE)) / (priceCondition.OfferPrice * product.PACKSIZE): 
																(priceCondition.OfferPrice - priceCondition.NetPrice) / priceCondition.OfferPrice;
					break;
				case 'NetPriceVSNetOfferPrice':
					comparisonPrice = product.UOM === 'Unit' ? ((priceCondition.NetOfferPrice * product.PACKSIZE) - (priceCondition.NetPrice * product.PACKSIZE)) / (priceCondition.NetOfferPrice * product.PACKSIZE) : 
																(priceCondition.NetOfferPrice - priceCondition.NetPrice) / priceCondition.NetOfferPrice;
					break;
				case 'BudgetedProfitability':
					comparisonPrice = product.UOM === 'Unit' ? (priceCondition.NetPrice - productInfo.cogsEurUnit) / priceCondition.NetPrice :
																(priceCondition.NetPrice - productInfo.cogsEurPack) / priceCondition.NetPrice;
					break;
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

	async function buildProductValidationForType16 (tx, offer, product, commnonProductInfo, aApproverTypes, offerProductsTotalValue, productPack, instituteTerritory) {

		let results = {
			IN_POLICY: false
		}
		const policy = await tx.run(SELECT.one.from(PricingPolicyView).where({'CountryCode': offer.COUNTRYCODE, 'ProductPackID': product.ProductCode}));
		const priceCondition = await tx.run(SELECT.one.from(PriceCondition).where({'OfferID': product.OFFERID, 'ProductCode': product.ProductCode}));
		const ctryProductPack = await tx.run(SELECT.one.from(PT_TMCTPRDPCK).where({"COUNTRYCODE": offer.COUNTRYCODE, "PRODUCTPACKID": product.ProductCode}));
		const offerHistory = await tx.run(SELECT.from(StandardTenderHistory).where({'INSTITUTE_ID': offer.INSTITUTE_ID, 'ProductCode': product.ProductCode}));
		const lastHistoryPriceCondition = offerHistory[offerHistory.length-1];
		const awardedProduct = await tx.run(SELECT.one.from(PT_TMTRRES).where({'OfferID': lastHistoryPriceCondition?.OfferID, 'ProductCode': lastHistoryPriceCondition?.ProductCode}));
		let currentDiscount = null;

		if (lastHistoryPriceCondition) {
			currentDiscount = (lastHistoryPriceCondition.Price0 - awardedProduct.AwardedPrice) / lastHistoryPriceCondition.Price0;
		}
		

		if (!policy || !priceCondition || !instituteTerritory) return results;

		if(instituteTerritory.IsKAM) {
			mappedApproverTypesForKAMTerritory(aApproverTypes, priceCondition, policy);
			results.IN_POLICY = true
		}else {
			mappedApproverTypesForNonKAMTerritory(aApproverTypes, priceCondition, policy, ctryProductPack, currentDiscount);
			results.IN_POLICY = true
		}
		return results;
		
	}
	async function buildProductValidationForType17(tx, offer, product, aApproverTypes) {

		let results = {
			IN_POLICY: false
		}

		const ctryProductPack = await tx.run(SELECT.one.from(PT_TMCTPRDPCK).where({"COUNTRYCODE": offer.COUNTRYCODE, "PRODUCTPACKID": product.ProductCode}));

		aApproverTypes.map(async function (oApproverType) {
			oApproverType.ApproverType === 'Chapter Head Established Products BeNeLux' ||
			oApproverType.ApproverType === 'Hospital Management Lead BeNeLux' ? oApproverType.ValidationType = 3 : oApproverType.ValidationType = 1;
		});
		if(ctryProductPack.BU === 'RAD'){
			aApproverTypes.map(async function (oApproverType) {
				if (oApproverType.ApproverType === 'Country Head Radiology BeNeLux') {
					oApproverType.ValidationType = 3;
				}
			});
			
		}
		results.IN_POLICY = true
		return results;
			
	}
	async function buildProductValidationForType18(tx, offer, product, aApproverTypes, userInfo) {
		let results = { IN_POLICY: false };

		// Safely extract and validate Role
		const role = userInfo?.Role;

		if (!role) {
			console.warn("Role is missing in userInfo:", userInfo);
			return results; // Return early or handle as required if Role is missing
		}
		
		const normalizedRole = role.toLowerCase().replace(/ /g, '');
	
		const validationMap = {
			'kam': [{ type: 'sm', value: 3 }, { type: 'tm', value: 3 }],
			'salesmanager': [{ type: 'tm', value: 3 }, { type: 'sm', value: 1 }],
			'tendermanager': [{ type: 'sm', value: 2 }, { type: 'tm', value: 1 }]
		};
	
		(validationMap[normalizedRole] || []).forEach(({ type, value }) => {
			aApproverTypes.map(oApproverType => {
				if (oApproverType.ApproverType.toLowerCase().replace(/ /g, '').includes(type)) {
					oApproverType.ValidationType = value;
				}
			});
		});
		
		results.IN_POLICY = true
		return results;
	}
	function mappedApproverTypesForKAMTerritory (aApproverTypes, priceCondition, policy) {
		const apprIndex = aApproverTypes.findIndex(at => at.ApproverType === 'Squad Lead');
		aApproverTypes.splice(apprIndex, 1);

		if (priceCondition.Price3 <= policy.Value) {
			aApproverTypes.map(function (oApproverType) {
				oApproverType.ApproverType === 'PH Finance & LE Controlling' ||
				oApproverType.ApproverType === 'Head of Key Account Management' || 
				oApproverType.ApproverType === 'Head of MAS' ? oApproverType.ValidationType = oApproverType.ValidationType2 : oApproverType.ValidationType = oApproverType.ValidationType;
			});
		}else {
			aApproverTypes.map(function (oApproverType) {
				oApproverType.ApproverType === 'Head of Key Account Management' || 
				oApproverType.ApproverType === 'Head of MAS' ? oApproverType.ValidationType = oApproverType.ValidationType2 : oApproverType.ValidationType = oApproverType.ValidationType;
			});
		}
	}

	function mappedApproverTypesForNonKAMTerritory (aApproverTypes, priceCondition, policy, ctryProductPack, currentDiscount) {
		if (ctryProductPack.BU === "PH") {
			aApproverTypes.map(function (oApproverType) {
				oApproverType.ApproverType === 'Sales Manager' ? oApproverType.ValidationType = oApproverType.ValidationType2 : oApproverType.ValidationType = oApproverType.ValidationType;
			});
			if (!(priceCondition.Price3 >= policy.Value && priceCondition.TotalDiscountNHI <= currentDiscount)) {
				if (priceCondition.Price3 >= policy.Value) {
					aApproverTypes.map(function (oApproverType) {
						oApproverType.ApproverType === 'Squad Lead' ? oApproverType.ValidationType = oApproverType.ValidationType2 : oApproverType.ValidationType = oApproverType.ValidationType;
					});
				}else {
					aApproverTypes.map(function (oApproverType) {
						oApproverType.ApproverType === 'Squad Lead' || 
						oApproverType.ApproverType === 'PH Finance & LE Controlling' ? oApproverType.ValidationType = oApproverType.ValidationType2 : oApproverType.ValidationType = oApproverType.ValidationType;
					});
				}
			}
		}else if (ctryProductPack.BU === "CC") {
			aApproverTypes.map(function (oApproverType) {
				oApproverType.ApproverType === 'Sr. National Sales Manager' || 
				oApproverType.ApproverType === 'CH CDH, TW&HK' ? oApproverType.ValidationType = oApproverType.ValidationType2 : oApproverType.ValidationType = oApproverType.ValidationType;
			});
		}else if (ctryProductPack.BU === "RAI") {
			aApproverTypes.map(function (oApproverType) {
				oApproverType.ApproverType === 'Country Group Head, Radiology North Asia' || 
				oApproverType.ApproverType === 'Sr. National Sales Manager' ? oApproverType.ValidationType = oApproverType.ValidationType2 : oApproverType.ValidationType = oApproverType.ValidationType;
			});
		}
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

		//let focAmount = (product.FOC_ABS_PCT === "PCT") ? Math.round(product.FOC * requestedVolume) : Math.round(product.FOC);
		let focAmount = 0;
		switch (product.FOC_ABS_PCT)
		{
				case "PCT": focAmount = Math.round(product.FOC * requestedVolume); break;
				case "ABS": focAmount = Math.round(product.FOC); break;
				case "STP": focAmount = (product.FOC_STEP === null || product.FOC_STEP === 0) ? 0 : Math.floor(requestedVolume / product.FOC_STEP) * product.FOC; break;
				default: break;
		};
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
		let cogsEurUnit = cogs / product.BUDGET_RATE / toUnitFactor; 
		let cogsEurPack = cogs / product.BUDGET_RATE / toPackFactor; 
		let netPriceUnit = netPrice / toUnitFactor;
		let netPricePack = netPrice / toPackFactor;
		let netPriceUnitEurSpot = netPriceUnit / product.SPOT_RATE;
		let netPriceUnitEurBudget = netPriceUnit / product.BUDGET_RATE;

		let grossSales = offerPrice * paidVolume;
		let netOfferSales = netOfferPrice * totalVolume;
		let netSales = grossSales * (1 - product.Deductions);
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

			TotalVolume: totalVolume,
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
			NetOfferSales: netOfferSales,
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
		try{
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
						numberNL: (input) => {  
							if(Number(input) === 0 || input === null  ){
								return "0,00";
							}          
							let usString;
							if(typeof input === 'string'){
								const normalizedInput = input.replace(/,/g, '').replace(/\./, ',');
								usString = Number(normalizedInput.replace(/\,/g, '.')).toLocaleString('nl-NL', { 
									minimumFractionDigits: 2, 
									maximumFractionDigits: 2 
								});
							} else {
								usString = input.toLocaleString('nl-NL',{ minimumFractionDigits: 2, maximumFractionDigits: 2 });
							} 
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
						dateFormatHEM: (input) => {
							return input.split("-").reverse().join("-").replaceAll("-",".");
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
						dateFormatterEU: (input) => input && input.split("-").reverse().join("-"),
						dateYear: (input) => input && input.substring(0,4),
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
		}
		catch(error){
            console.error('Error in WordAttachments READ');
            return req.reject(403, error?.message||"Error in WordAttachments");
        }
	});

	//http://localhost:4004/v2/tender/WordAttachment('AE-16-100-1049-BPH-11')/content
	srv.on('READ', 'ExcelAttachments', async (req, next) => {
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		try{
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
			let excelStreamValue = XLSXHelper.generateXLSXByFile(templateContent,excelData,1);
			req._.res.setHeader('Content-disposition', `attachment; filename=${offerId}.xlsx`);
			req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			return excelStreamValue;
		}
		catch(error){
            console.error('Error in ExcelAttachments READ');
            return req.reject(403, error?.message||"Error in ExcelAttachments");
        }
	});

	srv.before('CREATE', 'PdfEmail', async (req) => {
		try{
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
		}
		catch(error){
            console.error('Error in PdfEmail CREATE');
            return req.reject(403, error?.message||"Error in PdfEmail");
        }
	});

	async function getOfferData(tx,offerId){

		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerValidation = await buildOfferValidation(tx, whereOffer);
		if (!offerValidation) {
			throw 'No offer found';
		}

		//Get product data
		let productValidation = await buildOfferProductValidation(tx, whereOffer);

		let userSignatureImageBuffer = await getUserSignatureBuffer(tx, offerValidation);
		let commaSeparatedBrandName = [...new Set(productValidation?.map(prd => prd.BRANDNAME))]?.join(', ');
		//format prices
		productValidation.forEach(prd => {
			prd.PAID_VOLUME = ServiceHelper.formatNumber(prd.PAID_VOLUME, 0, 0);
			prd.PACKSIZE = ServiceHelper.formatNumber(prd.PACKSIZE, 0, 0);
			prd.OFFER_PRICE = prd.COUNTRY_CODE.includes('HM') ? ServiceHelper.formatNumber(prd.OFFER_PRICE, 4, 4) : prd.COUNTRY_CODE === 'PL' ? formatPolandPrices(prd.OFFER_PRICE) : prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.OFFER_PRICE, 3, 3) : ServiceHelper.formatNumber(prd.OFFER_PRICE, 2, 2);
			prd.OFFER_PRICE_VAT = prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.OFFER_PRICE_VAT, 3, 3) : ServiceHelper.formatNumber(prd.OFFER_PRICE_VAT, 2, 2);
			prd.GROSS_SALES_OFFER_CURRENCY = ServiceHelper.formatNumber(prd.GROSS_SALES_OFFER_CURRENCY, 2, 2);
			prd.GROSS_SALES_OFFER_CURRENCY_VAT = prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.GROSS_SALES_OFFER_CURRENCY_VAT, 3, 3) : ServiceHelper.formatNumber(prd.GROSS_SALES_OFFER_CURRENCY_VAT, 2, 2);
			prd.SAMPLES = ServiceHelper.formatNumber(prd.SAMPLES, 0, 0);
			prd.FOC = ServiceHelper.formatNumber(prd.FOC, 0, 0);
			prd.NET_PRICE = prd.COUNTRY_CODE.includes('HM') ? ServiceHelper.formatNumber(prd.NET_PRICE, 4, 4) : prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.NET_PRICE, 3, 3) : ServiceHelper.formatNumber(prd.NET_PRICE, 2, 2);
			prd.NET_SALES_OFFER_CURRENCY = prd.COUNTRY_CODE.includes('HM') ? ServiceHelper.formatNumber(prd.NET_SALES_OFFER_CURRENCY, 4, 4) : prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.NET_SALES_OFFER_CURRENCY, 3, 3) : ServiceHelper.formatNumber(prd.NET_SALES_OFFER_CURRENCY, 2, 2);
			prd.NegotiationPrice = prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.NegotiationPrice, 3, 3) : ServiceHelper.formatNumber(prd.NegotiationPrice, 2, 2);
			prd.Price0 = prd.Region === 'MEA' ? prd.Price0 && ServiceHelper.formatNumber(Number(prd.Price0.replace(/\,/g,'')), 3, 3) : prd.COUNTRY_CODE === 'PL' ? formatPolandPrices(prd.Price0) : prd.Price0 && ServiceHelper.formatNumber(Number(prd.Price0.replace(/\,/g,'')), 2, 2);
			prd.Price1 = prd.Region === 'MEA' ? prd.Price1 && ServiceHelper.formatNumber(Number(prd.Price1.replace(/\,/g,'')), 3, 3) : prd.COUNTRY_CODE === 'PL' ? formatPolandPrices(prd.Price1) : prd.Price1 && ServiceHelper.formatNumber(Number(prd.Price1.replace(/\,/g,'')), 2, 2);
			prd.Price3 = prd.Region === 'MEA' ? prd.Price3 && ServiceHelper.formatNumber(Number(prd.Price3.replace(/\,/g,'')), 3, 3) : prd.COUNTRY_CODE === 'PL' ? formatPolandPrices(prd.Price3) : prd.Price3 && ServiceHelper.formatNumber(Number(prd.Price3.replace(/\,/g,'')), 2, 2);
			prd.Level1Discount1 = prd.COUNTRY_CODE === 'AU' ? ServiceHelper.formatNumber((prd.Level1Discount1 * 100), 4, 4) : ServiceHelper.formatNumber((prd.Level1Discount1 * 100), 2, 2);
			prd.Level2Discount1 = prd.COUNTRY_CODE === 'AU' ? ServiceHelper.formatNumber((prd.Level2Discount1 * 100), 4, 4) : ServiceHelper.formatNumber((prd.Level2Discount1 * 100), 2, 2);
			prd.Level2Discount2 = prd.COUNTRY_CODE === 'AU' ? ServiceHelper.formatNumber((prd.Level2Discount2 * 100), 4, 4) : ServiceHelper.formatNumber((prd.Level2Discount2 * 100), 2, 2);
			prd.Level3Discount1 = prd.COUNTRY_CODE === 'AU' ? ServiceHelper.formatNumber((prd.Level3Discount1 * 100), 4, 4) : prd.Region === 'MEA' ? ServiceHelper.formatNumber((prd.Level3Discount1 * 100), 3, 3) : ServiceHelper.formatNumber((prd.Level3Discount1 * 100), 2, 2);
			prd.AnnualDiscount_Percentage = ServiceHelper.formatNumber((prd.AnnualDiscount_Percentage * 100), 2, 2);
			prd.REQ_PRICE_UNIT_OFFER_CURRENCY = prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.REQ_PRICE_UNIT_OFFER_CURRENCY, 3, 3) : ServiceHelper.formatNumber(prd.REQ_PRICE_UNIT_OFFER_CURRENCY, 2, 2);
			prd.REQ_PRICE_PACK_OFFER_CURRENCY = prd.Region === 'MEA' ? ServiceHelper.formatNumber(prd.REQ_PRICE_PACK_OFFER_CURRENCY, 3, 3) : ServiceHelper.formatNumber(prd.REQ_PRICE_PACK_OFFER_CURRENCY, 2, 2); 
			prd.EARLIEST_DATE = prd.COUNTRY_CODE === 'AU' ? prd.EARLIEST_DATE && ServiceHelper.formatDate(prd.EARLIEST_DATE, 'YYYY-MM-DD','DD.MM.YYYY') : prd.EARLIEST_DATE;
			prd.Product_Custom_Integer_1 = prd.COUNTRY_CODE.includes('HM') ? ServiceHelper.formatNumber(prd.Product_Custom_Integer_1, 0, 0) : prd.Product_Custom_Integer_1;
			prd.REQUESTED_QUANTITY = prd.COUNTRY_CODE.includes('HM') ? ServiceHelper.formatNumber(prd.REQUESTED_QUANTITY, 0, 0) : prd.REQUESTED_QUANTITY;
			if (prd.COUNTRY_CODE.includes('HM') && prd.PriceCondition?.[0]?.FreeGoodsOther?.[0]) {
				const freeGoodsOther = prd.PriceCondition[0].FreeGoodsOther[0];
				if (['STP', 'ABS'].includes(freeGoodsOther.FreeGoodsOther_ABS_PCT)) {
					freeGoodsOther.FreeGoodsOther = freeGoodsOther.FreeGoodsOther && ServiceHelper.formatNumber(freeGoodsOther.FreeGoodsOther, 0, 0);
					freeGoodsOther.FreeGoodsOther_Step = freeGoodsOther.FreeGoodsOther_Step && ServiceHelper.formatNumber(freeGoodsOther.FreeGoodsOther_Step, 0, 0);
				}
			}
			prd.OfferPrice_1 = prd.COUNTRY_CODE === 'NL' ? prd.OfferPrice_1 && ServiceHelper.formatNumber(Number((prd.OfferPrice_1).toString().replace(/\,/g,'')), 2, 2) : prd.OfferPrice_1;
			prd.OfferPrice_2 = prd.COUNTRY_CODE === 'NL' ? prd.OfferPrice_2 && ServiceHelper.formatNumber(Number((prd.OfferPrice_2).toString().replace(/\,/g,'')), 2, 2) : prd.OfferPrice_2;
			prd.OfferPrice_3 = prd.COUNTRY_CODE === 'NL' ? prd.OfferPrice_3 && ServiceHelper.formatNumber(Number((prd.OfferPrice_3).toString().replace(/\,/g,'')), 2, 2) : prd.OfferPrice_3;
			prd.NET_PRICE_PACK_OFFER_CURRENCY = prd.COUNTRY_CODE === 'PL' ? prd.NET_PRICE_PACK_OFFER_CURRENCY && formatPolandPrices(prd.NET_PRICE_PACK_OFFER_CURRENCY) : prd.NET_PRICE_PACK_OFFER_CURRENCY;
			prd.PNM_VALUE = prd.COUNTRY_CODE === 'PL' ? prd.PNM_VALUE && formatPolandPrices(prd.PNM_VALUE) : prd.PNM_VALUE;
			prd.PL_VolumeInPacks = prd.COUNTRY_CODE === 'PL' ? prd.PL_VolumeInPacks && formatPolandQuantity(prd.PL_VolumeInPacks) : prd.PL_VolumeInPacks;
			prd.REQUESTED_QUANTITY = prd.COUNTRY_CODE === 'PL' ? prd.REQUESTED_QUANTITY && formatPolandQuantity(prd.REQUESTED_QUANTITY) : prd.REQUESTED_QUANTITY;
			prd.MaxNetPricePerPack = prd.COUNTRY_CODE === 'PL' ? prd.MaxNetPricePerPack && formatPolandPrices(prd.MaxNetPricePerPack) : prd.MaxNetPricePerPack;

		});

		offerValidation.AMOUNT_IN_NUMBERS = ServiceHelper.formatNumber(offerValidation.AMOUNT_IN_NUMBERS, 2, 2);
		offerValidation.VAT_TOTAL = ServiceHelper.formatNumber(offerValidation.VAT_TOTAL, 2, 2);
		offerValidation.AMOUNT_IN_NUMBERS_VAT = ServiceHelper.formatNumber(offerValidation.AMOUNT_IN_NUMBERS_VAT, 2, 2);
		offerValidation.OFFERDATE = (offerValidation.COUNTRYCODE === 'AU' || offerValidation.COUNTRYCODE.includes('HM'))
									? offerValidation.OFFERDATE && ServiceHelper.formatDate(offerValidation.OFFERDATE, 'YYYY-MM-DD', 'DD.MM.YYYY')
									: (productValidation[0]?.Region === 'MEA' ? offerValidation.OFFERDATE && ServiceHelper.formatDate(offerValidation.OFFERDATE, 'YYYY-MM-DD', 'DD-MMM-YYYY') : offerValidation.OFFERDATE);
		offerValidation.OFFERVALIDITY = (offerValidation.COUNTRYCODE === 'AU' || offerValidation.COUNTRYCODE.includes('HM'))
										? offerValidation.OFFERVALIDITY && ServiceHelper.formatDate(offerValidation.OFFERVALIDITY, 'YYYY-MM-DD', 'DD.MM.YYYY')
										: (productValidation[0]?.Region === 'MEA' ? offerValidation.OFFERVALIDITY && ServiceHelper.formatDate(offerValidation.OFFERVALIDITY, 'YYYY-MM-DD', 'DD-MMM-YYYY') : offerValidation.OFFERVALIDITY);
		offerValidation.PUBLICATION_DATE = (offerValidation.COUNTRYCODE === 'AU' || offerValidation.COUNTRYCODE.includes('HM')) ? offerValidation.PUBLICATION_DATE && ServiceHelper.formatDate(offerValidation.PUBLICATION_DATE, 'YYYY-MM-DD','DD.MM.YYYY') : (offerValidation.COUNTRYCODE === 'PL' ? offerValidation.PUBLICATION_DATE && ServiceHelper.formatDate(offerValidation.PUBLICATION_DATE, 'YYYY-MM-DD','DD/MM/YYYY') : offerValidation.PUBLICATION_DATE);
		offerValidation.InternalDueDate = (offerValidation.COUNTRYCODE === 'AU' || offerValidation.COUNTRYCODE.includes('HM')) ? offerValidation.InternalDueDate && ServiceHelper.formatDate(offerValidation.InternalDueDate, 'YYYY-MM-DD','DD.MM.YYYY') : offerValidation.InternalDueDate;
		offerValidation.InternalBidDueDate = (offerValidation.COUNTRYCODE === 'AU' || offerValidation.COUNTRYCODE.includes('HM')) ? offerValidation.InternalBidDueDate && ServiceHelper.formatDate(offerValidation.InternalBidDueDate, 'YYYY-MM-DD','DD.MM.YYYY') : offerValidation.InternalBidDueDate;
		offerValidation.BID_DUE_DATE = (offerValidation.COUNTRYCODE === 'AU' || offerValidation.COUNTRYCODE.includes('HM')) ? offerValidation.BID_DUE_DATE && ServiceHelper.formatDate(offerValidation.BID_DUE_DATE, 'YYYY-MM-DD','DD.MM.YYYY') : (offerValidation.COUNTRYCODE === 'PL' ? offerValidation.BID_DUE_DATE && ServiceHelper.formatDate(offerValidation.BID_DUE_DATE, 'YYYY-MM-DD','DD/MM/YYYY') : offerValidation.BID_DUE_DATE);
		offerValidation.ExpectedAwardDate = (offerValidation.COUNTRYCODE === 'AU' || offerValidation.COUNTRYCODE.includes('HM')) ? offerValidation.ExpectedAwardDate && ServiceHelper.formatDate(offerValidation.ExpectedAwardDate, 'YYYY-MM-DD','DD.MM.YYYY') : offerValidation.ExpectedAwardDate;
		offerValidation.EffectiveDate = offerValidation.COUNTRYCODE === 'AU' ? offerValidation.EffectiveDate && ServiceHelper.formatDate(offerValidation.EffectiveDate, 'YYYY-MM-DD','DD.MM.YYYY') : (offerValidation.COUNTRYCODE === 'PL' ? offerValidation.EffectiveDate && ServiceHelper.formatDate(offerValidation.EffectiveDate, 'YYYY-MM-DD','DD/MM/YYYY') : offerValidation.EffectiveDate);
		offerValidation.ExpiryDate = offerValidation.COUNTRYCODE === 'AU' ? offerValidation.ExpiryDate && ServiceHelper.formatDate(offerValidation.ExpiryDate, 'YYYY-MM-DD','DD.MM.YYYY') : (offerValidation.COUNTRYCODE === 'PL' ? offerValidation.ExpiryDate && ServiceHelper.formatDate(offerValidation.ExpiryDate, 'YYYY-MM-DD','DD/MM/YYYY') : offerValidation.ExpiryDate);
		offerValidation.Offer_Custom_Date_1 = offerValidation.COUNTRYCODE.includes('HM') ? offerValidation.Offer_Custom_Date_1 && ServiceHelper.formatDate(offerValidation.Offer_Custom_Date_1, 'YYYY-MM-DD','DD.MM.YYYY') : offerValidation.Offer_Custom_Date_1;
		offerValidation.Offer_Custom_Date_4 = offerValidation.COUNTRYCODE.includes('HM') ? offerValidation.Offer_Custom_Date_4 && ServiceHelper.formatDate(offerValidation.Offer_Custom_Date_4, 'YYYY-MM-DD','DD.MM.YYYY') : offerValidation.Offer_Custom_Date_4;
		offerValidation.Offer_Custom_Date_5 = offerValidation.COUNTRYCODE.includes('HM') ? offerValidation.Offer_Custom_Date_5 && ServiceHelper.formatDate(offerValidation.Offer_Custom_Date_5, 'YYYY-MM-DD','DD.MM.YYYY') : offerValidation.Offer_Custom_Date_5;
		offerValidation.TotalPNM_Value = offerValidation.COUNTRYCODE === 'PL' ? offerValidation.TotalPNM_Value && formatPolandPrices(offerValidation.TotalPNM_Value) : offerValidation.TotalPNM_Value;
		offerValidation.UserSignature = {
			_type: "image",
			source: userSignatureImageBuffer, 
			format: "image/png",
			width: 100, 
			height: 50 
		};
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
			groupedOfferProductValidation: groupedOfferProductValidation,
			commaSeparatedBrandName: commaSeparatedBrandName
			// flatOfferProductValidation.reduce((group, product) => {
			// 	const { PriceConditionClassification } = product;
			// 	group[PriceConditionClassification.ConditionType.replace(/\s/g, '')] ??= {items:[]};
			// 	group[PriceConditionClassification.ConditionType.replace(/\s/g, '')].items.push(product);
			// 	return group;
			//   }, {})
		};

	}

	async function getUserSignatureBuffer(tx, offerValidation){
		let signatureBuffer = null;
		const userInfoSignature = await tx.run(SELECT.from(PT_TMUSER).where({UserName: offerValidation.Tender_Custom_String_1}));
		if (userInfoSignature && userInfoSignature.length > 0 && userInfoSignature[0].UserSignatureImg) {
			signatureBuffer = Buffer.from(userInfoSignature[0].UserSignatureImg, 'base64');
		}
		return signatureBuffer;
	}

	srv.on("READ", "CSVAttachment", async (req, res) => {
		try{
			let startTime, endTime;

			console.log("Checking cds.env.features.assert_integrity parameter:");
			console.log(cds?.env?.features?.assert_integrity);

			console.log("Fetching data from ZuelligExtractView...");
        	startTime = moment();
			console.log("Start Time: ", startTime.format());
			let zuelligExtract = await SELECT.from(ZuelligExtractView);
			endTime = moment();
			console.log("End Time: ", endTime.format());
        	console.log("Duration: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
        	console.log(`Number of ZuelligExtractView data fetched: ${zuelligExtract.length}`);

			const csvConfig = mkConfig({ useKeysAsHeaders: true, useTextFile: true });
			const zuellig = req.data.Zuellig;
			const fileName = zuellig ? 'Zuellig Extract' : 'Single View';

			console.log("Filtering data...");
			startTime = moment(); 
			console.log("Start Time: ", startTime.format());
			// zuelligExtract = getUniqueFilterItems(zuelligExtract);
			endTime = moment();
			console.log("End Time: ", endTime.format());
        	console.log("Duration: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
			console.log(`Number of unique data fetched: ${zuelligExtract.length}`);

			console.log("Mapping data...");
			startTime = moment();
			console.log("Start Time: ", startTime.format());
			let mappedZuelligExtract = [];

			if (zuellig) {
				mappedZuelligExtract = mappedZuelligExtractView(zuelligExtract);
			}else {
				mappedZuelligExtract = mappedSingleView(zuelligExtract);
			}
			endTime = moment(); 
			console.log("End Time: ", endTime.format());
			console.log("Duration: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
				
			if (mappedZuelligExtract.length === 0) return req.reject(404, "No Zuellig Extracts were found");

			console.log("Generating CSV...");
			startTime = moment();
			console.log("Start Time: ", startTime.format());
			// Converts your Array<Object> to a CsvOutput string based on the configs
			const csv = generateCsv(csvConfig)(mappedZuelligExtract);
			endTime = moment(); 
			console.log("End Time: ", endTime.format());
			console.log("Duration: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);

			req._.res.setHeader('Content-disposition', `attachment; filename=${fileName}.csv`);
			req._.res.setHeader('Content-type', 'text/csv');
			return _createStream(csv)
		}
		catch(error){
            console.error('Error in CSVAttachment READ');
            return req.reject(403, error?.message||"Error in CSVAttachment");
        }
	});

	srv.on("READ", "TaiwanFASTData", async (req, res) => {
		try{
			let startTime, endTime;

			console.log("Fetching data from ZuelligExtractView...");
        	startTime = moment();
			console.log("Start Time: ", startTime.format());
			let zuelligExtract = await SELECT.from(ZuelligExtractView);
			endTime = moment();
			console.log("End Time: ", endTime.format());
        	console.log("Duration: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
        	console.log(`Number of ZuelligExtractView data fetched: ${zuelligExtract.length}`);

			console.log("Filtering data...");
			startTime = moment(); 
			console.log("Start Time: ", startTime.format());
			// zuelligExtract = getUniqueFilterItems(zuelligExtract);
			endTime = moment();
			console.log("End Time: ", endTime.format());
        	console.log("Duration: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
			console.log(`Number of unique data fetched: ${zuelligExtract.length}`);

			console.log("Mapping data...");
			startTime = moment();
			console.log("Start Time: ", startTime.format());
			let mappedTaiwanFASTData = mappedSingleView(zuelligExtract);
			endTime = moment(); 
			console.log("End Time: ", endTime.format());
			console.log("Duration: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
			
			if (mappedTaiwanFASTData.length === 0) return req.reject(404, "No Zuellig Extracts were found");
			
			req._.res.json({
				data: mappedTaiwanFASTData
			});
		}
		catch(error){
            console.error('Error in TaiwanFASTData READ');
            return req.reject(403, error?.message||"Error in TaiwanFASTData");
        }
	});

	function mappedZuelligExtractView(zuelligExtract) {
		return zuelligExtract.flatMap(item => {
			let ZuelligCustomerNumbers = item.CNPJ.split(','); 
			if (ZuelligCustomerNumbers.length > 1) {
				return ZuelligCustomerNumbers.map(ZuelligCustomerNumber => ZuelligExtractObject(item, ZuelligCustomerNumber));
			}else{
				return ZuelligExtractObject(item, item.CNPJ)
			}
			
		});
	}
	function ZuelligExtractObject(item,ZuelligCustomerNumber) {
		return {
			"KAM_Territory": item.KAM_Territory,
			"ZuelligCustomerNumber.": ZuelligCustomerNumber,
			"InstituteName": item.InstituteName,
			"SKUCode":`'${addLeadingZeros(item.SKUCode, 8) }'` || "",
			"ProductPackName": item.PRODUCTPACKNAME,
			"Current_NHI_Price": Number(item.RegisteredPrice).toFixed(4),
			"Invoice Price": Number(item.Price1).toFixed(4),
			"GeneralDiscount_Amount": item.GeneralDiscount_Amount.toFixed(4),
			"HandlingCharge_Amount": 0,
			"HandlingCharge_Amount2": 0,
			"CashDiscount_Amount": 0,
			"SecondDiscount_Amount": item.SecondDiscount_Amount.toFixed(4),
			"AnnualDiscount_Pack": Number(item.Level3Discount1).toFixed(4),
			"FGBuy": 0,
			"FGGift": 0,
			"NetPrice": Number(item.Price3).toFixed(4),
			"BT": "BT",
			"FreeGoods_Amount": item.FreeGoods_Amount.toFixed(4),
			"ModifiedAt": item.SubmittedOn? moment(item.SubmittedOn).format('YYYY-MM-DD') : "",
			"OfferID": item.OfferID,
			"BranchNumber": item.ParentInst_External_InstituteId || ''
			
		}
	}
	function mappedSingleView (zuelligExtract) { // TaiwanFASTData
		return zuelligExtract.map(item => {
			return {
				"CreationDate":item.CreationDate? moment(item.CreationDate).format('YYYY-MM-DD'): "",
				"CWID": item.SubmittedBy,
				"BU": item.BU,
				"EffectiveDate":item.EffectiveDate? moment(item.EffectiveDate).format('YYYY-MM-DD'): "",
				"PreviousNetPrice": Number(item.Price3).toFixed(4),
				"CountProducts": item.CountProducts,
				"Invoice Price": Number(item.Price1).toFixed(4),
				"HandlingCharge_Amount": 0,
				"Institute Type": item.InstituteType,
				"Class": item.Class || "",
				"PackFactor": item.PACKFACTOR || "",
				"CreatedAt/CreationDate":item.createdAt? moment(item.createdAt).format('YYYY-MM-DD'): "",
				"Branch": item.ParentInstituteID || "",
				"ModifiedAt":item.SubmittedOn? moment(item.SubmittedOn).format('YYYY-MM-DD'): "",
				"InvoicePrice": Number(item.Price1).toFixed(4),
				"NetPrice": Number(item.Price3).toFixed(4),
				"TotalDiscount": (item.TotalDiscountNHI * 100).toFixed(4),
				"GeneralDiscount_Percentage": (item.Level2Discount1 * 100).toFixed(4),
				"GeneralDiscount_Amount": item.GeneralDiscount_Amount.toFixed(4),
				"SecondDiscount_Percentage": (item.Level2Discount2 * 100).toFixed(4),
				"SecondDiscount_Amount": item.SecondDiscount_Amount.toFixed(4),
				"HandlingCharge_Percentage": 0,
				"CashDiscount_Percentage": 0,
				"CashDiscount_Amount": 0,
				"FreeGoods_Percentage": (item.FreeGoods_Percentage * 100).toFixed(4),
				"FreeGoods_Amount": item.FreeGoods_Amount.toFixed(4),
				"AnnualDiscount_Percentage": (item.AnnualDiscount_Percentage * 100).toFixed(4),
				"AnnualDiscount_Amount": item.AnnualDiscountForBranch.toFixed(4),
				"OfferID": item.OfferID,
				"UserName": item.UserName,
				"CustomerID": item.External_InstituteId,
				"InstituteName": item.InstituteName,
				"SKUCode": `'${addLeadingZeros(item.SKUCode, 8) }'` || "",
				"ProductPackName": item.PRODUCTPACKNAME,
				"KAM_Territory": item.KAM_Territory,
				"NHI_Price": Number(item.Price0).toFixed(4),
				"ZuelligCustomerNumber": item.CNPJ,
				"Territory No.": item.KAM_Territory,
				"Status: A-Active, S-Suspend": item.Status,
				"NetOfferPrice": Number(item.Price2).toFixed(4),
				"AnnualDiscount_Pack": Number(item.Level3Discount1).toFixed(4),
				"BranchNumber": item.ParentInst_External_InstituteId || '',
				"PriceRequestFrameworkID": item.TenderID,
				"HandlingCharge_Amount2": 0,
				"FGBuy": 0,
				"FGGift": 0,
				"BT": "BT",
				"Current_NHI_Price": Number(item.RegisteredPrice).toFixed(4)
			}
		});
	}
	
	function getUniqueFilterItems (filterItems) {
		let uniqueItems = filterItems.reduce(function (a, b) {
			let instituteID = b.InstituteID;
			let productCode = b.ProductCode;
			let currentValueIndex = a.findIndex(function (item) {
				return item.InstituteID === instituteID && item.ProductCode === productCode;
			});
			if (currentValueIndex < 0) {
				a.push(b);
			}
			return a;
		}, []);
		return uniqueItems;
	}

	function _createStream (data) {        
		const buffer = new Buffer.from(asString(data))          
		const stream = new Readable()        
		stream.push(buffer)        
		stream.push(null)        
	
		return { value: stream }    
	}

	const getNextValue = async (table, fieldname) => {
		let results = await cds.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
		let nextValue = 1;
		if (results[0].max) {
			nextValue = results[0].max + 1
		}
		return nextValue
	}

	srv.after(
		['CREATE','UPDATE'], 'FreeGoodsOther', 
		async (data) => {
			const priceCondition = await SELECT.one.from(PriceCondition).where({
				ID: data?.PriceCondition_ID
			});
			await updatePaymentField(priceCondition?.OfferID, priceCondition?.ProductCode);
			return data;
		}
	);

	srv.on(
		['CREATE','UPDATE'], 'PT_TMBDPR', 
		async (req) => {
			try{
			await updateProductPricing(req);
			await updatePriceCondition(req);

			return req.data;
			}
			catch(error){
				console.error('Error in Price UPDATE after FOC');
				return req.reject(403, error?.message||"Error in Price UPDATE after FOC");
			}
		}
	);

	const updatePriceCondition = async function(req){

		const priceCondition = await SELECT.one.from(PriceCondition).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode
		});

		const priceConditionClassification = await SELECT.one.from(PriceConditionClassification).where({
			ID: priceCondition.PriceConditionClassification_ID
		});

		const mappedPriceCondition = mappingPriceCondition(req, priceConditionClassification.ConditionType);

		if (priceCondition) {
			await UPDATE(PriceCondition)
				.with(mappedPriceCondition)
				.where({
					ID: priceCondition.ID
				});
		}
	}

	const mappingPriceCondition = function(req, ConditionType){
		const mappings = {
			"Discount" : {
				NetOfferPrice: req.data.OfferPrice,
				Price2: req.data.OfferPrice,
				Price3: req.data.NetPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Price1: req.data.OfferPrice
			},
			"Price" : {
				NetOfferPrice: req.data.OfferPrice,
				NetPrice: req.data.NetPrice,
				Price3: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Price2: req.data.OfferPrice,
				Price1: req.data.OfferPrice
			},
			"PriceWithFOC" : {
				NetOfferPrice: req.data.NetofferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Price2: req.data.NetofferPrice,
				Price3: req.data.NetPrice,
				Price1: req.data.OfferPrice
			},
			"DiscountWithFOC" : {
				NetOfferPrice: req.data.NetofferPrice,
				NetPrice: req.data.NetPrice,
				OfferPrice: req.data.OfferPrice,
				Price2: req.data.NetofferPrice,
				Price3: req.data.NetPrice,
				Price1: req.data.OfferPrice
			},
			"TaiwanContractPrice": {
				Price2: req.data.NetofferPrice,
				Price3: req.data.NetPrice,
				Price1: req.data.OfferPrice, 
				NetPrice: req.data.NetPrice,
				NetOfferPrice: req.data.NetofferPrice,
				OfferPrice: req.data.OfferPrice
			},
			"TaiwanDiscount": {
				Price2: req.data.NetofferPrice,
				Price3: req.data.NetPrice,
				Price1: req.data.OfferPrice, 
				NetPrice: req.data.NetPrice,
				NetOfferPrice: req.data.NetofferPrice,
				OfferPrice: req.data.OfferPrice
			}
		}

		return mappings[ConditionType];
	}

	const updateProductPricing = async function(req){

		const whereCondition = {
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode,
			Active: 1,
			ActiveTier: 0,
			LotID: 1
		};

		const productPricing = await SELECT.one.from(PT_TMBDPR).where(whereCondition);

		const priceCondition = await SELECT.one.from(PriceCondition).where({
			OfferID: req.data.OfferID,
			ProductCode: req.data.ProductCode
		});

		let foc = null;
		if(priceCondition){
			foc = await SELECT.one.from(FreeGoodsOther).where({
					PriceCondition_ID: priceCondition?.ID,
					ProductPackId: req.data.ProductCode
			});
		}

		const mappedPTTMBDPR = mapPTTMBDPR({priceCondition:req.data, foc});

		if(productPricing){
			await UPDATE(PT_TMBDPR).with (mappedPTTMBDPR).where(whereCondition)
		}
	}

	function mapPTTMBDPR({priceCondition, foc}){
		return {
			FOC                   : foc?.FreeGoodsOther || 0, 
			FOCStep               : foc?.FreeGoodsOther_Step || null, 
			FOCType               : foc?.ADD_INCLUDE === 'Included' ? 'FOC 1' : 'FOC 2', 
			OfferPrice            : priceCondition.OfferPrice,
			NetofferPrice         : priceCondition.NetofferPrice || priceCondition.OfferPrice,
			FOC_ABS_PCT           : foc?.FreeGoodsOther_ABS_PCT,
			NetPrice              : priceCondition.NetPrice
		}
	}
	srv.on('getNotificationMailTemplate', async (req) => {
		try{
			const { data: {offerID,templateId,url} } = req;
			const tx = cds.tx(req);
			const offerInformation = await SELECT.one.from(TenderMasterView).where({OfferID: offerID})
			const whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerID);
			let offerConsolidation = await tx.run(SELECT.from(OfferConsolidation).where(whereOffer));
			let offerProductConsolidation = await tx.run(SELECT.from(OfferProductConsolidation).where(whereOffer));
			let offerProductValidation = await buildOfferProductValidation(tx, whereOffer);
			const offerValidation = await buildOfferValidation(tx, whereOffer);
			const mailTemplate = await getMailTemplate(templateId);
			const mappedData = mapNotificationData(mailTemplate, offerInformation, offerValidation, offerConsolidation, offerProductConsolidation, offerProductValidation, url);
			return mappedData
		}catch(error){
			console.error('Error in getNotificationMailTemplate');
            return req.reject(403, error?.message||"Error in getNotificationMailTemplate");
		}
	})
	const mapNotificationData = function (template, offerInformation,offerValidation, offerConsolidation, offerProductConsolidation, offerProductValidation,url) {
		let data = {};
		if(offerInformation.CountryCode === 'NL'){
			offerInformation.BidDueDate = offerInformation.BidDueDate && ServiceHelper.formatDate(offerInformation.BidDueDate, 'YYYY-MM-DD','DD-MM-YYYY');
			offerInformation.Custom_Date_1 = offerInformation.Custom_Date_1 && ServiceHelper.formatDate(offerInformation.Custom_Date_1, 'YYYY-MM-DD','DD-MM-YYYY');

			data = {
				offerInformation: offerInformation,
				offerValidation: offerValidation,
				DirectURLToOffer : url
			}
		}
		else if(offerInformation.CountryCode === 'ES'){
			offerProductConsolidation.forEach(function (product) {
				product.NET_PRICE_TOTAL = product.NET_OFFER_PRICE * product.REQUESTED_VOLUME;
				product.NET_PRICE_TOTAL_VAT = product.REGISTERED_PRICE * product.REQUESTED_VOLUME * (1 + product.VAT);
				product.PSL = ((product.NET_OFFER_PRICE - product.REGISTERED_PRICE) / product.REGISTERED_PRICE) * 100;
			});
	
	
			offerConsolidation = offerConsolidation[0];
			if (offerProductValidation.length > 0) {
				let divisions = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { return d.DIVISION })); //TODO include RAMA
				if (divisions.length > 0) {
					offerConsolidation.DIVISION = divisions[0];
				}
			}
	
			//add url to offerConsolidation
			
			offerConsolidation.URL = url;

			data = {
				offerConsolidation: offerConsolidation,
				offerProductConsolidation: offerProductConsolidation
			}
		}
		
        return generateMailBody(template, {
			data
		})	
    }
	srv.before(['CREATE','UPDATE'], ['Outbox'], async (req) => {

		!req.data.Sender && req.error({ code: 404, message: "Sender is required", target: "Sender" });
		!req.data.Recipients && req.error({ code: 404, message: "Recipients is required", target: "Recipients" });
		!req.data.Subject && req.error({ code: 404, message: "Subject is required", target: "subject" });
		!req.data.MailBody && req.error({ code: 404, message: "MailBody is required", target: "content" });
		
	});
	srv.on('sendHematologyNotificationMailTemplate', async (req) => {
		try {
			const { data: {tenderId, offerID, url, CountryCode} } = req;
			const tx = cds.tx(req);
			const userInfo = await tx.run(
				SELECT.from(PT_TMUSERCTRY)
					.columns('User.CWID', 'User.Role', 'User.UserName', 'User.UserEmail', 'CountryCode' )
					.where({ CountryCode: CountryCode, 'User.Role': { in: ['Supply Management', 'Compliance Officer', 'Price Management', 'Global Strategic Marketing'] }})
			);
			const whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerID);
			const offerValidation = await buildOfferValidation(tx, whereOffer);
			const mailTemplate = await getMailTemplate('HematologyNotificationMailTemplate');
			const {createdByName} = await SELECT.one.from(TenderMasterView).where({TenderID:tenderId,OfferID:offerID});
			const offer = await SELECT.one.from('StandardAppService.OfferFormView').where({TenderID:tenderId,OfferID:offerID});
			const {CountryName} = await SELECT.one.from(PT_TMCTRY).where({CountryCode: CountryCode});
			const CountryNameReplace = CountryName.replace('Hematology', '');
			const HematologyNotificationData = mappedHematologyNotificationData(userInfo,mailTemplate,req,offerValidation,createdByName,CountryNameReplace, offer);
			await INSERT.into(OutgoingMails).entries(HematologyNotificationData);
			return "Notification mail sent successfully";
		}catch (error) {
				console.error('Error in sendHematologyNotificationMailTemplate');
				return req.reject(400, error.message || 'An unexpected error occurred.');
		}

	});
	function mappedHematologyNotificationData (userInfo,mailTemplate,req,offerValidation,createdByName,CountryNameReplace, offer){
		// Format Date
		offer.InternalBidDueDate  = offer.InternalBidDueDate  && ServiceHelper.formatDate(offer.InternalBidDueDate , 'YYYY-MM-DD','DD.MM.YYYY');
		offer.OfferDueDate  = offer.OfferDueDate  && ServiceHelper.formatDate(offer.OfferDueDate , 'YYYY-MM-DD','DD.MM.YYYY');
		return userInfo.map(data =>{
			return {
				CountryCode: req.data.CountryCode,
				TenderID: req.data.tenderId,
				OfferID: req.data.offerID,
				Sender: 'FAST-Admin@bayer.com',
				Recipients:  data.UserEmail,
				Subject: `New HEM Tender Created for ${CountryNameReplace}`,
				MailBody: generateMailBody(mailTemplate, {
					data: { 
						content:{
							UserName: data.UserName,
							CountryName: CountryNameReplace,
							Offer: offer,
							DirectURLToOffer: req.data.url,
							TenderCreator: createdByName,
						}
					}
				}),
				Sent: false,
			}
		})
	}
	function addLeadingZeros (num, size) {
        if (num === null) {
            throw new Error(`${text} doesn't exist`);
        }
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };

	srv.after("UPDATE", "ZagisUploadFile", async (req, res) => {
		try {
			const {OfferID} = req;
			const offer = await SELECT.one.from(PT_TMOFRS).where({CountryCode: 'NL', OfferID: OfferID});
			const offerProducts = await SELECT.from(PT_TMOFPR).where({CountryCode: 'NL', OfferID: OfferID});
			const zagisFile = await SELECT.one.from(ZagisUploadFile).where({"OfferID": OfferID});
			const ctryProductPack = await SELECT.from(PT_TMCTPRDPCK).where({"COUNTRYCODE": 'NL'});

			if (!zagisFile) {
				res.warn(400, "The file appears to be corrupted. Please check the file and upload a valid ZAGIS file." );
			}

			/**
			 * @param {Function} bufferToArrayBuffer - Converting Content of Excel file from Buffer to Array buffer 
			 */
			const arrayBuffer = bufferToArrayBuffer(zagisFile.content);
			try {
				workbook = XLSX.read(arrayBuffer, { type: 'array' });
			} catch (error) {
				throw { message: "The file format is incorrect. Please upload a valid ZAGIS file." };
			}

			// Assuming the Excel file has only one sheet, you can get the data from it
			const sheetName = workbook.SheetNames[0];
			const products = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

			// Validate data in fields and check if ZI-Nr. exists in the database
			const invalidZIFields = [];
			products.forEach(product => {
				const code1 = product["PRK"];
				const productPack = ctryProductPack.find(pck => pck.CODE1 == code1);
				if (!productPack) {
					invalidZIFields.push(code1);
				}
			});
			// Validate required fields
			const requiredFields = ["PRK"];
			let missingFields = [];

			products.forEach((product, index) => {
				const productMissingFields = requiredFields.filter(field => !product.hasOwnProperty(field) || !product[field]);
				if (productMissingFields.length > 0) {
				  missingFields.push({
					index,
					fields: productMissingFields
				  });
				}
			});
			const errorMessages = missingFields?.map(item => `Product at index ${item?.index + 1} is missing fields: ${item?.fields?.join(", ")}`);

			let promises;
			if (missingFields.length > 0) {
				res.warn(400,`The file is missing required fields:\n${errorMessages.join("\n")}. Please update the file and try again.`);
			}
			else if(invalidZIFields.length > 0){
				res.warn(400,`The following PRK values do not exist in the database: ${invalidZIFields.join(', ')}. Please check and correct the data.` );
			}
			// setting initial sorter as SORTER + 1 if there is product already, otherwise 0
			let sorter = offerProducts[offerProducts.length - 1]?.SORTER + 1 || 0;
			promises = products.filter(product => product["PRK"]).map(product => {
				const productPack = ctryProductPack.find(pck => pck.CODE1 == product["PRK"]);
				if (productPack) {
					const productIndex = offerProducts.findIndex(pr => pr.ProductCode === productPack.PRODUCTPACKID);
					const promise = upsertOfferProduct(res.req, product, offer, productPack, productIndex, sorter);
					if (productIndex === -1) {
						sorter++; // Increment sorter only for new products
					}
					return promise;
				}
				return []
			});

			await DELETE.from(ZagisUploadFile).where({offerId: OfferID});
			await Promise.all([promises]);
			return req;
		} catch (error) {
			console.error('Error in ZagisUploadFile');
			return res.reject(400, error.message || 'An unexpected error occurred.')
		}
	});

	 async function upsertOfferProduct (req, product, offer, productPack, productIndex, sorter) {	
		const mappedProduct = {
			TenderID: offer.TenderID,
			OfferID: offer.OfferID,
			CountryCode: offer.CountryCode,
			SubmittedOn: new Date().toISOString(),
			SubmittedBy: req.user.id,
			Active: 1,
			ProductCode: productPack.PRODUCTPACKID,
			RequestedVolume: product["Jaarverbruik in stuks"] || product["Totaal verbruik in stuks"] || 1,
			UnitPerPack: "Pack",
			DistributorID: offer.DistributorID,
			ActiveProduct: 1,
			SORTER: sorter,
			SUPPLY_UPDATE: 0,
			PAYMENT_UPDATE: 0,
			Line: "1",
			LotID: 1,
			SampleQuantity: 0,
			NoofLots: 0,
			IntervalBetweenShipments: 0,
			NoOfTier: 0,
			DEFAULT_COMMISSION_RATE: 0,
			MinInvoiceAmount: 0,
		}
	
		if (productIndex > -1) {
			// deleting SORTER to avoid incrementing already created products SORTER
			delete mappedProduct.SORTER;
			return UPDATE(PT_TMOFPR).with(mappedProduct).where({
				OfferID: offer.OfferID,
				ProductCode: productPack.PRODUCTPACKID
			})
		}else {
			return INSERT(mappedProduct).into(PT_TMOFPR);
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
	function roundToDecimalPlaces(number, decimalPlaces) {
		const factor = Math.pow(10, decimalPlaces);
		return Math.round(number * factor) / factor;
	};
	srv.on('READ', 'ExtractNLHistoricalInformation', async (req, next) => {
		try{
		const tx = cds.tx(req);

		const templateId = req.data.templateId;

		const templates = await tx.run(SELECT.from(ExtractNLHistoricalInformation).where({ templateId: templateId }));
		let excelData = await tx.run(SELECT.from(NLExtractOffers));
		excelData = formatNLExtractOfferHistoryData(excelData);
		const data = {excelData}
		const templateContent = templates[0].content;

		let excelStreamValue = XLSXHelper.generateXLSXByFile(templateContent,data,1);

			req._.res.setHeader('Content-disposition', `attachment; filename= Extract History.xlsx`);
			req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			return excelStreamValue;
		}
		catch(error){
            console.error('Error in ExcelAttachments READ');
            return req.reject(403, error?.message||"Error in ExcelAttachments");
        }
	});

	function formatNLExtractOfferHistoryData (excelData) {
		excelData.forEach(ed => {
			ed.OfferPrice_1 = ed.OfferPrice_1 && ServiceHelper.formatCurrency(Number(ed.OfferPrice_1), 'nl-NL', 2, 2);
			ed.OfferPrice_2 = ed.OfferPrice_2 && ServiceHelper.formatCurrency(Number(ed.OfferPrice_2), 'nl-NL', 2, 2);
			ed.OfferPrice_3 = ed.OfferPrice_3 && ServiceHelper.formatCurrency(Number(ed.OfferPrice_3), 'nl-NL', 2, 2);
			ed.NetPrice = ed.NetPrice && ServiceHelper.formatCurrency(Number(ed.NetPrice), 'nl-NL', 2, 2);
			ed.EffectiveDate = ed.EffectiveDate && ServiceHelper.formatDate(ed.EffectiveDate, '', 'DD-MM-YYYY');
			ed.ExpiryDate = ed.ExpiryDate && ServiceHelper.formatDate(ed.ExpiryDate, '', 'DD-MM-YYYY');
			ed.BidDueDate = ed.BidDueDate && ServiceHelper.formatDate(ed.BidDueDate, '', 'DD-MM-YYYY');
			ed.PublicationDate = ed.PublicationDate && ServiceHelper.formatDate(ed.PublicationDate, '', 'DD-MM-YYYY');
		});
		return excelData;
	}

	srv.on('CREATE', 'AwardedOfferDistributors', async (req, res) => {
		try {
			const { DistributorName, ProductPackName, OfferID, AssignedProductCode, CountryCode } = req.data;
			let splitedDistributors = DistributorName.split(';');
			const splitedProductPacks = ProductPackName.split(';');
			const distributors = await SELECT.from('StandardAppService.MasterDistributors').where({ CountryCode: CountryCode});
			const productPacks = await SELECT.from(PT_TMPRDPCK);
			const awardedOfferDistributors = await SELECT.from(AwardedOfferDistributors).where({
				OfferID: OfferID,
				CountryCode: CountryCode
			});

	
			const deletePromises = awardedOfferDistributors.map(el => {
				if (!splitedDistributors.includes(`${el.DistributorID}`) && el.AssignedProductCode == AssignedProductCode) {
					return DELETE.from(AwardedOfferDistributors).where({
						OfferID: OfferID,
						DistributorID: el.DistributorID
					});
				} else if (!splitedDistributors.includes(`${el.DistributorID}`) && el.AssignedProductCode !== AssignedProductCode && el.ProductPackID == AssignedProductCode) {
					return DELETE.from(AwardedOfferDistributors).where({
						OfferID: OfferID,
						ProductPackID: AssignedProductCode,
						DistributorID: el.DistributorID
					});
				} else if (
					(!splitedProductPacks.includes(`${el.ProductPackID}`) && 
					el.AssignedProductCode == AssignedProductCode) || 
					(!splitedProductPacks.includes(`${el.ProductPackID}`) && 
					el.AssignedProductCode !== AssignedProductCode && 
					el.ProductPackID == AssignedProductCode)) {
					return DELETE.from(AwardedOfferDistributors).where({
						OfferID: OfferID,
						ProductPackID: el.ProductPackID
					});
				}
			}).filter(el => el);
	
			let mappedAwardedOfferDistributors = [];
	
			if (DistributorName && ProductPackName) {
				splitedDistributors.forEach(dId => {
					splitedProductPacks.forEach(pId => {
						const distributor = distributors.find(dist => dist.DistributorID == dId);
						const product = productPacks.find(product => product.PRODUCTPACKID == pId);
						mappedAwardedOfferDistributors.push({
							OfferID: OfferID,
							CountryCode: CountryCode,
							DistributorName: distributor?.DistributorName,
							ProductPackName: product?.PRODUCTPACKNAME,
							DistributorID: dId,
							ProductPackID: pId,
							AssignedProductCode: AssignedProductCode
						});
					});
				});
			}
	
			// Remove items already saved in db from mappedAwardedOfferDistributors
			mappedAwardedOfferDistributors = mappedAwardedOfferDistributors.filter(el => 
				!awardedOfferDistributors.some(nlo => 
					el.OfferID == nlo.OfferID && 
					el.ProductPackID == nlo.ProductPackID && 
					el.DistributorID == nlo.DistributorID
				)
			);
			let insertPromise;
			if (mappedAwardedOfferDistributors.length > 0) {
				insertPromise = INSERT.into(AwardedOfferDistributors).entries(mappedAwardedOfferDistributors);
			}
	
			await Promise.all([...deletePromises, insertPromise]);
	
			return req.data;
		} catch (error) {
			console.error('Error in AwardedOfferDistributors CREATE', error);
			return req.reject(403, error?.message || "Error in AwardedOfferDistributors");
		}
	});
	srv.on('CREATE', 'ContractInfomation', async (req, res) => {
		try {
			const { InstituteName, ProductCode, OfferID, ContractDuration, ContractStartDate, ContractEndDate, CountryCode} = req.data;
			const Institutes = await SELECT.from(PT_TMINST).where({CountryCode: CountryCode});	     

			switch (CountryCode) {
				case "NL":
					await saveNetherlandsContractInformation(req, InstituteName, ProductCode, OfferID, ContractDuration, ContractStartDate, ContractEndDate, CountryCode, Institutes);
					break;
				case "PL":
					await savePolandContractInformation(req, ProductCode, OfferID, ContractStartDate, ContractEndDate, CountryCode);
					break;
				default:
					break;
			}
			
			return req.data;
		} catch (error) {
			console.error('Error in ContractInfomation CREATE');
            return req.reject(403, error?.message||"Error in ContractInfomation");
		}
	});

	const savePolandContractInformation = async (req, ProductCode, OfferID, ContractStartDate, ContractEndDate, CountryCode) => {
		if (!ContractStartDate) {return req.reject(403,"Contract Start Date field is mandatory")}
		if (!moment(ContractStartDate).isBefore(ContractEndDate)) {return req.reject(403,"Contract Start date should be before the Contract End date.")}

		const mappedContractDurations = [];

		const data = {
			CountryCode,
			OfferID,
			ProductCode,
			ContractStartDate,
			ContractEndDate
		}
		mappedContractDurations.push(mappedContractInformations(req, data));

		const deletePromise = DELETE.from(ContractInfomation).where({OfferID: OfferID, ProductCode: ProductCode});
		const insertPromises = INSERT.into(ContractInfomation).entries(mappedContractDurations);

		return Promise.all([deletePromise, insertPromises]);
	};

	const saveNetherlandsContractInformation = async (req, InstituteName, ProductCode, OfferID, ContractDuration, ContractStartDate, ContractEndDate, CountryCode, Institutes) => {
		if (!InstituteName) {return req.reject(403,"Institutes In Group field is mandatory")}
		if (!ContractDuration) {return req.reject(403,"Contract Duration field is mandatory")}
		if (!ContractStartDate) {return req.reject(403,"Contract Start Date field is mandatory")}

		const mappedContractDurations = [];

		InstituteName.split(',').map(instID => {
			const Institute = Institutes.find(inst => inst.InstituteID == instID);
			const data = {
				CountryCode,
				OfferID,
				ProductCode,
				instID,
				InstituteName: Institute.InstituteName,
				ContractDuration,
				ContractStartDate,
				ContractEndDate
			}
			mappedContractDurations.push(mappedContractInformations(req, data))
		});
		const deletePromise = DELETE.from(ContractInfomation).where({OfferID: OfferID, ProductCode: ProductCode});

		let insertPromises = [];
		if (mappedContractDurations.length > 0) {
			insertPromises = INSERT.into(ContractInfomation).entries(mappedContractDurations);
		}

		return Promise.all([deletePromise, insertPromises]);
	}

	const mappedContractInformations = (req, data) => {
		const mapping = {
			"NL": {
				CountryCode: data.CountryCode,
				OfferID: data.OfferID,
				ProductCode: data.ProductCode,
				InstituteID: +data.instID,
				InstituteName: data.InstituteName,
				ContractDuration: data.ContractDuration,
				ContractStartDate: data.ContractStartDate,
				ContractEndDate: data.ContractEndDate,
				Active: true,
				createdBy: req.user.id
			},
			"PL": {
				CountryCode:  data.CountryCode,
				ContractStartDate:  data.ContractStartDate,
				ContractEndDate:  data.ContractEndDate,
				OfferID: data.OfferID,
				ProductCode: data.ProductCode,
				Active: true,
				createdBy: req.user.id
			}
		}
		return mapping[data.CountryCode]
	};

	srv.after('READ', 'NLPriceConditions', data => {
		data.unshift({
			ID: "99999999-9999-9999-9999-999999999999",
			ContractDuration: "",
            OfferPrice: "", 
            Discount: "",
            NetPrice: "",
		})
	});

	const formatPolandPrices = function (value) {
		if (!value){
            value = 0;
        };
		// Node JS version 18.18 doesn't support currency formatting with locale pl-PL
		const formattedValue = ServiceHelper.formatCurrency(Number(value), 'en-US', 2, 2);
		return formattedValue.replace(/,/g, ' ').replace(/\.(?=\d{2}$)/, ',');
	};

	const formatPolandQuantity = function (value) {
		if (!value){
            value = 0;
        };
		const formattedValue = ServiceHelper.formatNumber(Number(value), 0, 0);
		return formattedValue.replace(/,/g, ' ');
	}

	srv.after('READ', 'PT_TMDIST', data => {
        const countryCode = data?.[0]?.CountryCode;
		data.unshift({
			ID: "99999999-9999-9999-9999-999999999999",
			CountryCode: countryCode,
            DistributorID: "",
            DistributorName: "All",
		})
	});

	srv.on('READ', 'SalesReportInstitutesView', async (req, next) => {
		try{
			const tx = cds.tx(req);
			let result = [];
			let ivQuery = SELECT.from(req.query.SELECT.from);
			if (req.query.SELECT.columns?.[0]?.func !== "count") {
				ivQuery.columns(req.query.SELECT.columns);
			}
			req.query.SELECT.where && (ivQuery.where(req.query.SELECT.where));
			req.query.SELECT.orderBy && (ivQuery.orderBy(req.query.SELECT.orderBy));

			result = await tx.run(ivQuery);

			const isCountQuery = Array.isArray(result) && result.some(item => '$count' in item);
		
			if (isCountQuery) {
			return result;
			}
			
			const cwid = req.user.id;
			const userTerritories = await SELECT.from(UserTerritory).where({ UserID: cwid });
		
			if (!userTerritories || userTerritories.length === 0 || userTerritories.some(ut => ut.TERRITORY === null)) {
			return result;
			}

			const resultsArray = Array.isArray(result) ? result : [result];
		
			const territoryMatches = resultsArray.filter(item => {
				return userTerritories.some(userTerritory => {
					return item.Territory === userTerritory.Territory;
				});
			});
			
			const finalFilteredResults = territoryMatches.filter(item => {
				return userTerritories.some(userTerritory => {
					return (item.Territory === userTerritory.Territory && item.IsKAM === userTerritory.IsKAM);
				});
			});
				
			if (finalFilteredResults.length > 0) {
				return finalFilteredResults;
			}else{
				return territoryMatches;
			}
		}
		catch(error){
            console.error('Error in SalesReportInstitutesView READ');
            return req.reject(403, error?.message||"Error in SalesReportInstitutesView");
        }
	});

	srv.on('READ', 'OverviewSectionsView', async (req) => {
		try {
			const uniqueBrands = [];
			const brandNames = new Set();
	
			const brandData = {};
			const tx = cds.tx(req);
	
			let result = [];
			let tmvQuery = SELECT.from(req.query.SELECT.from);
			if (req.query.SELECT.columns?.[0]?.func !== "count") {
				tmvQuery.columns(req.query.SELECT.columns);
			}
	
			req.query.SELECT.where && (tmvQuery.where(req.query.SELECT.where));
			req.query.SELECT.orderBy && (tmvQuery.orderBy(req.query.SELECT.orderBy));
			//req.query.SELECT.limit && (tmvQuery.limit(req.query.SELECT.limit));
	
			result = await tx.run(tmvQuery);
	
			const isCountQuery = Array.isArray(result) && result.some(item => '$count' in item);
	
			if (isCountQuery) {
				return result;
			}
	
			result.forEach(item => {
				if (!brandNames.has(item.BrandName)) {
					brandNames.add(item.BrandName);
					uniqueBrands.push(item);
				}
	
				if (!brandData[item.BrandName]) {
					brandData[item.BrandName] = {
						prices: [],
						quantities: [],
						totalQuantitySold: 0,
						totalSales: 0
					};
				}
	
				if (item.MinPrice !== null && item.MaxPrice !== null) {
					brandData[item.BrandName].prices.push(item.AvgPrice);
					brandData[item.BrandName].quantities.push(item.QuantitySold);
				}
	
				if (item.QuantitySold !== null) {
					brandData[item.BrandName].totalQuantitySold += item.QuantitySold;
				}
				if (item.TotalSales !== null) {
					brandData[item.BrandName].totalSales += item.TotalSales;
				}
			});
	
			const calculateRealAverage = (prices, quantities) => {
				if (!prices.length || !quantities.length) return 0;
			
				const totalWeightedPrice = prices.reduce((acc, price, index) => acc + price * quantities[index], 0);
				const totalQuantity = quantities.reduce((acc, qty) => acc + qty, 0);
			
				return totalQuantity !== 0 ? totalWeightedPrice / totalQuantity : 0;
			};

			const calculateMin = (prices) => {
				if (!prices.length) return 0;
				let min = prices[0];
				for (let price of prices) {
					if (price < min) {
						min = price;
					}
				}
				return min;
			};

			const calculateMax = (prices) => {
				if (!prices.length) return 0;
				let max = prices[0];
				for (let price of prices) {
					if (price > max) {
						max = price;
					}
				}
				return max;
			};
	
			uniqueBrands.forEach(brand => {
				const brandInfo = brandData[brand.BrandName];
	
				let minPrice = brandInfo.prices.length > 0 ? calculateMin(brandInfo.prices) : 0;
				let maxPrice = brandInfo.prices.length > 0 ? calculateMax(brandInfo.prices) : 0;
				let avgPrice = brandInfo.prices.length > 0 ? calculateRealAverage(brandInfo.prices, brandInfo.quantities) : 0;
	
				brand.MinPrice = minPrice;
				brand.MaxPrice = maxPrice;
				brand.AvgPrice = avgPrice;
	
				brand.TotalSales = brandInfo.totalSales || 0;
				brand.QuantitySold = brandInfo.totalQuantitySold || 0;
			});
	
			result.length = 0;
			result.push(...uniqueBrands);
	
			return result;
		} catch (error) {
			console.error('Error in OverviewSectionsView READ');
			return req.reject(403, error?.message || "Error in OverviewSectionsView");
		}
	});
	
	
	
	
		/** The below logic to generate PolandSalesReport is moved to the frontend 
		 * 	due to the issue while parsing data to the excel template
		 * the data volume was creating sudden memory peak and causing system freeze */ 
	
	srv.on('READ', 'ExtractPolandSalesReport', async (req, next) => {
		try{
		let startTime, endTime;
		const tx = cds.tx(req);
		const {templateId, TenderID, CountryCode, DistributorID, BrandID, ProductPackID, KAM_Territory, InstituteType, InstituteID, DateFrom, DateTo} = req.data;

		console.log("Fetching template from ExcelTemplate...");
		startTime = moment();
		console.log("Start Time: ", startTime.format());
		const template = await SELECT.one.from(ExcelTemplate).where({ templateId: 13 });
		endTime = moment();
		console.log("End Time: ", endTime.format());
		console.log("Finished fetching the template: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);

		console.log("Start building the SalesReportFullWhereQuery...");
		startTime = moment();
		console.log("Start Time: ", startTime.format());
		// Getting full where query
		const query = buildSalesReportFullWhereQuery(TenderID, CountryCode, DistributorID, BrandID, ProductPackID, KAM_Territory, InstituteType, InstituteID, DateFrom, DateTo);
		endTime = moment();
		console.log("End Time: ", endTime.format());
		console.log("Finished building the query: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);

		console.log("Start Executing the SalesReportExtract Select Query...");
		startTime = moment();
		console.log("Start Time: ", startTime.format());

        const salesReportExtract = await tx.run(query);
		endTime = moment();
		console.log("End Time: ", endTime.format());
		console.log("Finished Executing the SalesReportExtract Select Query: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
		console.log(`Number of SalesReportExtract data fetched: ${salesReportExtract.length}`);

		const isCountQuery = Array.isArray(salesReportExtract) && salesReportExtract.some(item => '$count' in item);
		
		if (isCountQuery) {
			return salesReportExtract;
		}
		
		console.log("Start formatting the SalesReportExtract Data...");
		startTime = moment();
		console.log("Start Time: ", startTime.format());
		const excelData = formattedSalesReportExtract(salesReportExtract, CountryCode);
		endTime = moment();
		console.log("End Time: ", endTime.format());
		console.log("Finished formatting the SalesReportExtract Data: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);
		
		if (!template || !template.content) {
			return req.reject(404, 'No template found for templateid:' + templateId);
		}

		console.log("Start parsing the SalesReportExtract data to excel template...");
		startTime = moment();
		console.log("Start Time: ", startTime.format());
		let excelStreamValue = XLSXHelper.generateXLSXByFile(template.content,{ excelData },1);
		endTime = moment();
		console.log("End Time: ", endTime.format());
		console.log("Finished parsing the SalesReportExtract data to excel template: ", `(${endTime.diff(startTime, 'seconds')} seconds)`);

		req._.res.setHeader('Content-disposition', `attachment; filename=${template.filename}`);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return excelStreamValue;
		}
		catch(error){
            console.error('Error in ExtractClaimsSales READ');
            return req.reject(403, error?.message||"Error in ExtractPolandSalesReport");
        }
        
	});

	const buildSalesReportFullWhereQuery = function (TenderID, CountryCode, DistributorID, BrandID, ProductPackID, KAM_Territory, InstituteType, InstituteID, DateFrom, DateTo) {
		// Build full wheres
		const tenderFullWhere = (TenderID && TenderID !== "All" && ServiceHelper.buildFullWhere('TenderID', '=', TenderID)) || [];
		const countryCodeFullWhere = (CountryCode && ServiceHelper.buildFullWhere('CountryCode', '=', CountryCode)) || [];
		const wholesalerFullWhere = (DistributorID && ServiceHelper.buildFullWhere('DistributorID', '=', DistributorID)) || [];
		const brandFullWhere = BrandID && BrandID !== "All_Brands" ? ServiceHelper.buildFullWhere('BrandId', '=', BrandID) : [];
      	const productFullWhere = (ProductPackID && ProductPackID !== "All_Products" && ServiceHelper.buildFullWhere('ProductPackID', '=', ProductPackID)) || [];
      	const kamTerritoryFullWhere = (KAM_Territory && KAM_Territory !== "All" && ServiceHelper.buildFullWhere('KAM_Territory', '=', KAM_Territory)) || [];
      	const instituteTypeFullWhere = (InstituteType && InstituteType !== "All" && ServiceHelper.buildFullWhere('InstituteType', '=', InstituteType)) || [];
      	const instituteFullWhere = (InstituteID && InstituteID !== "All" && ServiceHelper.buildFullWhere('MainInstituteID', '=', InstituteID)) || [];
		const dateFromFullWhere =  (DateTo && ServiceHelper.buildFullWhere('DateFrom', '<=', DateTo)) || [];
		const dateToFullWhere =  (DateFrom && ServiceHelper.buildFullWhere('DateTo', '>=', DateFrom)) || [];

		// return fullwhere query
		return SELECT.from(SalesReportsView)
				.where(tenderFullWhere)
				.where(countryCodeFullWhere)
				.where(wholesalerFullWhere)
				.where(brandFullWhere)
				.where(productFullWhere)
				.where(kamTerritoryFullWhere)
				.where(instituteTypeFullWhere)
				.where(instituteFullWhere)
				.where(dateFromFullWhere)
				.where(dateToFullWhere)
	};

	const formattedSalesReportExtract = function (excelData, CountryCode) {
		// Node JS version 18.18 doesn't support currency formatting with locale pl-PL
		const countryCodeLocals = {
			'PL': 'en-US'
		}
	
		excelData.forEach(ed => {
			// Format Quantities
			ed.Quantity = formatPolandQuantity(ed.Quantity, CountryCode);
			ed.QuantityML = formatPolandQuantity(ed.QuantityML, CountryCode);
			ed.RequestedVolume = formatPolandQuantity(ed.RequestedVolume, CountryCode);
			ed.BrandUsedVolume = formatPolandQuantity(ed.BrandUsedVolume, CountryCode);
			ed.BrandContractVolume = formatPolandQuantity(ed.BrandContractVolume, CountryCode);

			// Format Prices
			ed.WholesalerPurchasePrice = formatPolandPrices(ed.WholesalerPurchasePrice, countryCodeLocals[CountryCode], CountryCode);
			ed.WholesalerContractPrice = formatPolandPrices(ed.WholesalerContractPrice, countryCodeLocals[CountryCode], CountryCode);
			ed.WholesalerPurchasedAmount = formatPolandPrices(ed.WholesalerPurchasedAmount, countryCodeLocals[CountryCode], CountryCode);
			ed.ExcelNetSales = ed.TotalSales;
			ed.TotalSales = formatPolandPrices(ed.TotalSales, countryCodeLocals[CountryCode], CountryCode);
			
			// // Format Date
			ed.ExcelDate = new Date(ed.FilePeriod);
			ed.FilePeriod = ed.FilePeriod && ServiceHelper.formatDate(ed.FilePeriod, '', 'DD-MM-YYYY');

			//Format Percentage
			ed.ContractBrandUsage = ed.ContractBrandUsage ? ed.ContractBrandUsage : 0; 
			ed.ContractBrandUsage = `${(Number(ed.ContractBrandUsage) * 100).toFixed(2)}%`;
		});

		return excelData
	}

	srv.after('READ','PriceConditionWithMaximumPriceView', (items, req) => {
		try{
			if(!items) return [];

			if(Array.isArray(items)){
				return items.map(fnCalculateFields)
			}else{
				return fnCalculateFields(items);
			}

			async function fnCalculateFields(item){
				item.SpecialPrice = parseFloat(item.Price1 / (1 + parseFloat(item.Level2Discount1)));
				item.Margin = !!item.SpecialPrice ? (item.SpecialPrice - item.COGS) / item.SpecialPrice : 0;
			};

		}
		catch(error){
			console.error('Error in PriceConditionWithMaximumPriceView READ');
			return req.reject(403, error?.message||"Error in PriceConditionWithMaximumPriceView READ");
		}
		}
	);
	srv.after(['CREATE','UPDATE','DELETE'], 'OfferFormView', async (data, req) => {
		try{
			if (data.CountryCode === 'PL') {
				const priceConditions = await SELECT.from(PriceCondition).columns('*','PriceConditionClassification.ConditionType' ).where({
					OfferID: data.OfferID,
					'PriceConditionClassification.ConditionType': 'WithMaximumPrice'
				});
				if (priceConditions.length > 0) {
					await Promise.all(
						priceConditions.flatMap(item => 
							{
								const maxWholealerMargin = data.Custom_Double_9 || 0;
								const specialPrice = parseFloat(item.Price1 / (1 + parseFloat(maxWholealerMargin)));

								return [
									UPDATE(PriceCondition).with({ 
										NetPrice: specialPrice,
										Price2: specialPrice,
										OfferPrice: specialPrice,
										NetOfferPrice: specialPrice,
										Level2Discount1: maxWholealerMargin 
									}).where({ 
										ID: item.ID 
									}),
									UPDATE(PT_TMBDPR).with({ 
										OfferPrice: specialPrice,
										NetofferPrice: specialPrice,
										NetPrice: specialPrice 
									}).where({ 
										OfferID: item.OfferID, 
										ProductCode: item.ProductCode 
									}),
								]
							}
							
						)
					);
				}
			}
		}
		catch(error){
            console.error('Error in OfferFormView CREATE');
            return req.reject(403, error?.message||"Error in OfferFormView");
        }
	});
		
	srv.on('UPDATE', 'ProfitabilityCalcParamView', async (req) => {
		
		await UPDATE(PT_TMOFRS).with({ 
				ProfitabilityStartMnth: req.data.ProfitabilityStartMnth,
				ProfitabilityAgrDur   : req.data.ProfitabilityAgrDur,
				ProfitabilityYrlyMntCost: req.data.ProfitabilityYrlyMntCost,
				ProfitabilityDiscRate : req.data.ProfitabilityDiscRate,
				ProfitabilityGrowthRate: req.data.ProfitabilityGrowthRate
			}).where({OfferID: req.data.OfferID});
	});
	
	srv.on(['CREATE','UPDATE'], 'PriceConditionRappelView' , async (req) => {
		try{
			const priceCondition = await SELECT.one.from(PriceCondition).where({
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				PriceConditionCode: 'YAW1'
			});

			const standardTenderPriceConditionView = await SELECT.one.from(StandardTenderPriceConditionView).where({
				OfferID: req.data.OfferID,
				ProductCode: req.data.ProductCode,
				ConditionType: req.data.ConditionType
			});

			const mappedPriceConditionRappel = mapPriceConditionRappel(req, standardTenderPriceConditionView);

			if (priceCondition) {
				await UPDATE(PriceCondition)
					.with(mappedPriceConditionRappel)
					.where({
						ID: priceCondition.ID
					});
			}else{
				mappedPriceConditionRappel.ID = req.data.PriceConditionID;
				await INSERT.into(PriceCondition).entries(mappedPriceConditionRappel);
			}
		}
		catch(error){
            console.error('Error in PriceConditionRappelView CREATE');
            return req.reject(403, error?.message||"Error in PriceConditionRappelView");
        }

	});

	function mapPriceConditionRappel(req, standardTenderPriceConditionView){
		return {
			OfferID                             : req.data.OfferID,
			ProductCode                         : req.data.ProductCode,
			PVL                                 : req.data.PVL ? req.data.PVL : standardTenderPriceConditionView?.PVL,
			ConfidentialPrice                   : req.data.ConfidentialPrice ? req.data.ConfidentialPrice : standardTenderPriceConditionView?.ConfidentialPrice,
			Discount                            : standardTenderPriceConditionView?.Discount,
			RoyalDecree                         : req.data.RoyalDecree ? req.data.RoyalDecree : standardTenderPriceConditionView?.RoyalDecree,
			Tax                                 : standardTenderPriceConditionView?.Tax,
			Liquidation                         : req.data.Liquidation ? req.data.Liquidation : standardTenderPriceConditionView?.Liquidation,
			RefundDate                          : req.data.RefundDate ? req.data.RefundDate : standardTenderPriceConditionView?.RefundDate,
			PriceConditionCode                  : req.data.PriceConditionCode ? req.data.PriceConditionCode : standardTenderPriceConditionView?.PriceConditionCode,
			LotID                               : 1,
			Settlement_ID						: req.data.Settlement_ID ? req.data.Settlement_ID : standardTenderPriceConditionView?.Settlement_ID,
			PriceConditionClassification_ID        : standardTenderPriceConditionView?.ClassificationID,
		}
	}

	srv.on(['CREATE','UPDATE'], 'DiscountConditionView' , async (req) => {
		try{
			const discountConditions = await SELECT.from(DiscountCondition).where({
				PriceCondition_ID: req.data.PriceConditionID
			});
			if (discountConditions.length > 0){
				for (const discountCondition of discountConditions) {
					await UPDATE(DiscountCondition)
						.with({
							Volume: req.data.Volume,
							Discount: req.data.Discount,
							NetPriceWithoutTax: req.data.NetPriceWithoutTax,
							NetPriceWithTax: req.data.NetPriceWithTax
						})
						.where({ ID: discountCondition.ID });
				}
			}else{
				const mappedDiscountCondition = mapDiscountCondition(req);
				await INSERT.into(DiscountCondition).entries(mappedDiscountCondition);
			}
		}
		catch(error){
            console.error('Error in DiscountConditionView CREATE');
            return req.reject(403, error?.message||"Error in DiscountConditionView");
        }

	});

	function mapDiscountCondition(req){
		return {
			Volume              : req.data.Volume,
			Discount            : req.data.Discount,
			NetPriceWithoutTax  : req.data.NetPriceWithoutTax,
			NetPriceWithTax     : req.data.NetPriceWithTax,
			PriceCondition_ID      : req.data.PriceConditionID
		}
	}

	srv.after(
		'READ', 
		['PriceConditionDescuentoComercialView','PriceConditionPVLView', 'PriceConditionPrecioNetoView'], 
		async (items, req) => {
		try{
			if(items.hasPriceCondition){
				return items;
			}else{
				const ccmPriceCondition = await SELECT.one.from(CCMPriceCondition).where({
					OfferID: items.OfferID,
					TenderID: items.TenderID,
					ProductCode: items.ProductCode
				});
				if(ccmPriceCondition){
					items.PVL = ccmPriceCondition.YP00;
					items.ConfidentialDiscount = ccmPriceCondition.YP04;
					items.RoyalDecree = ccmPriceCondition.RoyalDecree;
					items.ConfidentialPrice = ccmPriceCondition.ConfidentialPrice;
					items.ESDiscount = ccmPriceCondition.YD02;
					items.RoyalDecreeValue = ccmPriceCondition.RoyalDecreeValue;
					items.RoyalDecreeIncl = ccmPriceCondition.RoyalDecreeIncl;
					items.RoyalDecreePercentage_1 = ccmPriceCondition.YD06;
					items.StandardDiscount = ccmPriceCondition.StandardDiscount;
					items.AdditionalDiscount = ccmPriceCondition.YD75;
					items.NetPriceWithoutTaxBeforeDeductionRD = ccmPriceCondition.YP10;
					items.NetPriceWithoutTaxAfterDeductionRD = ccmPriceCondition.NETPRICEWITHOUTTAXAFTERDEDUCTIONRD;
					items.NetPriceWithTaxAfterDeductionRD = ccmPriceCondition.NETPRICEWITHTAXAFTERDEDUCTIONRD;
					items.NetPriceWithoutTax = ccmPriceCondition.NETPRICEWITHOUTTAX;
					items.NetPriceWithTax = ccmPriceCondition.NETPRICEWITHTAX;
					items.Tax = ccmPriceCondition.SAPTAX;
					items.Currency = 'EUR'
				}

				return items;
			}
			// const fnCalculateFields = async item => {
			// 	if(item.ConditionType === 'Discount'){
			// 		item.OfferPrice = item.BasePrice * (1 - item.Discount);
			// 		item.OfferPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.OfferPrice,4) : roundToDecimalPlaces(item.OfferPrice,2);
			// 		item.NetPrice = item.OfferPrice * (1 - item.Deductions); 
			// 		item.NetPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetPrice,4) : roundToDecimalPlaces(item.NetPrice,2);
			// 	}
			// 	else{
			// 		item.Discount = (item.BasePrice - item.OfferPrice) / item.BasePrice;
			// 		item.Discount = (item.CountryCode === 'AU' || item.CountryCode?.includes("HM")) ? roundToDecimalPlaces(item.Discount,4) : roundToDecimalPlaces(item.Discount,2);
			// 		item.NetPrice = item.OfferPrice * (1 - item.Deductions); 
			// 		item.NetPrice = item.CountryCode?.includes("HM") ? roundToDecimalPlaces(item.NetPrice,4) : roundToDecimalPlaces(item.NetPrice,2);
			// 	}
			// };
			// if(Array.isArray(items)){
			// 	return items.map(fnCalculateFields)
			// }else{
			// 	return fnCalculateFields(items);
			// }
		}
		catch(error){
			console.error('Error in PriceConditionDescuentoComercialView, PriceConditionPVLView, PriceConditionPrecioNetoView after READ');
			return req.reject(403, error?.message||"Error in PriceConditionDescuentoComercialView, PriceConditionPVLView, PriceConditionPrecioNetoView after READ");
		}
		}
	);

	srv.on("getSAPSalesOrderSimulation", async (req) => {
			const tx = cds.tx(req);
	
			try {
				const { offerID, tenderID, productCode, instituteID, customerID, materialNumber, countryCode } = req.data;
				const ccmPriceCondition = await tx.run(SELECT.one.from(CCMPriceCondition).where({
					OfferID: offerID,
					TenderID: tenderID,
					ProductCode: productCode,
					CountryCode: countryCode
				}));

				const body = updateSAPSalesOrderSimulationRequestBody(customerID, materialNumber);
				const response = await getSAPSalesOrderSimulation(tx, countryCode, "SalesOrderSimulation", body);

				const pricingElements = response.data.d.to_Item.results[0].to_PricingElement.results;
				if (!pricingElements) {
					return req.reject(404, "No Pricing Exist in SAP");
				}
				
				const mappedData = mapPricingElementsToDbFormat(pricingElements, offerID, tenderID, productCode, instituteID, customerID, materialNumber, countryCode);

				if (!mappedData.ConditionType) {
					return req.reject(422, "SAP response does not match any FAST ConditionType");
				}
				
				if(ccmPriceCondition){
					await tx.run(UPDATE(CCMPriceCondition).with(mappedData).where({ID: ccmPriceCondition.ID}));
				}else{
					await tx.run(INSERT.into(CCMPriceCondition).entries(mappedData));
				}

				return req.reply("Current Pricing were received from SAP");
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

	async function getSAPSalesOrderSimulation (tx, countryCode, resource, body) {
			if (!body) {
				throw new Error("ERR_MISSING_PARAMETER:body");
			}
			try {
				const apiConfig = await tx.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'SAPSalesOrderSimulation', CountryCode: countryCode, Resource: resource })); 
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
	}

	function updateSAPSalesOrderSimulationRequestBody (customerID, materialNumber) {
        let body = getSAPSalesOrderSimulationRequestBody();
        if (!body) {
            return false;
        }

		body["SoldToParty"] = customerID;
        body["to_Item"][0]["Material"] = materialNumber;
        return body;
    }

	async function getBearerToken(oauthAuth) {
	
			if (oauthAuth.OAuthProvider && oauthAuth.ClientID && oauthAuth.ClientSecret && oauthAuth.Scope) {
				console.log(`Calling ${oauthAuth.OAuthProvider}`);
				return axios({
					method: 'post',
					url: oauthAuth.OAuthProvider,
					headers: {
						'Authorization': `Basic ${Buffer.from(`${oauthAuth.ClientID}:${oauthAuth.ClientSecret}`).toString('base64')}`,
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept-Encoding': 'gzip, deflate',
						'accept': 'application/json'
					},
					data: qs.stringify({
						'grant_type': oauthAuth.GrantType,
						'scope': oauthAuth.Scope
					})/*, when testing locally, comment out the proxy
					proxy: {
						host: priceAgreementApi.ProxyHost,
						port: priceAgreementApi.ProxyPort
					}*/
				});
			}
	
			throw Error("Missing OAUTH config parameters");
	};

	function getSAPSalesOrderSimulationRequestBody () {
        return {
			"SalesOrderType": "YCOR",
			"SalesOrganization": "QFHC",
			"SoldToParty": "900000352",
			"to_Pricing": {},
			"to_Item": [
				{
					"Material": "66040304",
					"RequestedQuantity": "1",
					"to_PricingElement": []
				}
			]
		}
    }

	function mapPricingElementsToDbFormat(pricingElements, offerID, tenderID, productCode, instituteID, customerID, materialNumber, countryCode) {
		const result = {
		  CountryCode: countryCode,
		  OfferID: offerID,
		  TenderID: tenderID,
		  ProductCode: productCode,
		  MaterialNumber: materialNumber,
		  InstituteID: instituteID,
		  CustomerID: customerID,
		  Currency: "EUR",
		  YP00: 0,
		  YP04: 0,
		  ConfidentialPrice: 0,
		  YD02: 0,
		  RoyalDecree: "No",
		  YD06: 0,
		  RoyalDecreeValue: 0,
		  RoyalDecreeIncl: true,
		  YD30: 0,
		  YD75: null,
		  YP10: null,
		  NETPRICEWITHOUTTAXBEFOREDEDUCTIONRD: null,
		  NETPRICEWITHOUTTAXAFTERDEDUCTIONRD: null,
		  NETPRICEWITHTAXAFTERDEDUCTIONRD: null,
		  NETPRICEWITHOUTTAX: null,
		  NETPRICEWITHTAX: null,
		  SAPTAX: 0,
		  SAPPriceWithTax: 0,
		  SAPBaseGrossPrice: 0,
		  ConditionType: null
		};
	  
		const conditions = {};
	  
		// Iterate through the pricing elements to collect necessary conditions
		for (const elem of pricingElements) {
		  const { ConditionType, PricingProcedureStep, ConditionRateValue, ConditionAmount } = elem;
	  
		  if (ConditionType) {
			conditions[ConditionType] = {
			  ConditionRateValue: parseFloat(ConditionRateValue || 0),
			  ConditionAmount: parseFloat(ConditionAmount || 0)
			};
		  }
	  
		  // Handle PricingProcedureStep-specific values
		  if (PricingProcedureStep === "330") {
			result.SAPTAX = parseFloat(ConditionAmount || 0);
		  }
	  
		  if (PricingProcedureStep === "332") {
			result.SAPPriceWithTax = parseFloat(ConditionAmount || 0);
		  }

		  if (PricingProcedureStep === "306") {
			result.NETPRICEWITHOUTTAX = parseFloat(ConditionAmount || 0);
		  }
		}
	  
		// Assign the condition values
		const YP00 = conditions["YP00"]?.ConditionRateValue || 0;
		const YP04 = conditions["YP04"] ? Math.abs(conditions["YP04"].ConditionRateValue) / 100 : 0;
		const YP10 = conditions["YP10"]?.ConditionRateValue ?? null;
		const YD02 = conditions["YD02"] ? Math.abs(conditions["YD02"].ConditionRateValue) / 100 : 0;
		const YD06 = conditions["YD06"] ? Math.abs(conditions["YD06"].ConditionRateValue) / 100 : 0;
		const YD75 = conditions["YD75"]?.ConditionAmount ?? null;
		const YD30 = conditions["YD30"]?.ConditionRateValue ?? 0;
	  
		

		result.YP00 = YP00;
		result.YP04 = YP04;
		result.ConfidentialPrice = YP04 ? YP00 * (1 - YP04) : YP00;
		result.YD02 = YD02;
		result.RoyalDecree = YD06 ? "Yes" : "No";
		result.YD06 = YD06;
		result.RoyalDecreeValue = YD06 && YP10 ? YD06 * YP10 : 0;
		result.RoyalDecreeIncl = YD06 ? false : true;
		result.YD30 = YD30;
		result.YP10 = YP10;

		const useConfidential = YP04 !== 0;
		const basePrice = useConfidential ? result.ConfidentialPrice : YP00;

		result.YD75 = (basePrice - YP10) / basePrice;
	  
		// Mapped values for NETPRICE fields
		result.NETPRICEWITHOUTTAXBEFOREDEDUCTIONRD = YP10;
		result.NETPRICEWITHOUTTAXAFTERDEDUCTIONRD = YP10 ? (YD06 ? YP10 * (1 - YD06) : YP10) : null;
		result.NETPRICEWITHTAXAFTERDEDUCTIONRD = (YD02 || YD30) ? result.SAPPriceWithTax : null;
		result.NETPRICEWITHOUTTAX = YD02 ? result.NETPRICEWITHOUTTAX : null;  
		result.NETPRICEWITHTAX = (YD02 || YD30) ? result.SAPPriceWithTax : null;
		result.SAPBaseGrossPrice = YP00;
	  
		// Determine the condition type
		if (YP10) {
			result.ConditionType = "PrecioNeto";
		} else if (YD02) {
			result.ConditionType = "DescuentoComercial";
		} else if (YP00) {
			result.ConditionType = "PVL";
		} else {
			result.ConditionType = null;
		}
	  
		return result;
	}
	  
	  
	  


}