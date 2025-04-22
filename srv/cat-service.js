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

module.exports = (srv) => {

	// Use reflection to get the csn definition
	const {
		CountryBrandProducts, LegalEntityBrand, DirectBrand, DistributorBrand, CountryLegalEntity
	} = cds.entities("com.bayer.SXTENDER.MasterDataViews");
	const {
		PT_TMINST, CountryApprovers, ApproverTypes, MASTER_COUNTRY_CHANNELS, PT_TMPRDPCK, CountryPreApprovedPrices, AccountPreApprovedPrices, PT_TMSKUPRDPCK, RoyalDecree, MasterPrices, MASTER_TENDER_TYPE,PT_TMPRDHIER,PT_TMCTRY
	} = cds.entities("com.bayer.SXTENDER.MasterData");
	const {
		OfferConsolidation, OfferProductConsolidation, ApprovalRequests, ProductPricingView, PriceConditionView, TenderHistorySpain, PriceConditionBrazilView, BrandsInTender
	} = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");
	const {
		PT_TMTEND, 
		PT_TMDLVTR, 
		PT_TMUDLTRS, 
		PT_TMAPPRST, 
		PT_TMOFPR,
		PT_TMOFRS,
		PT_TMQUTO,
		FreeGoodsOther, 
		CandidatePrices, 
		ProductPricing, 
		PriceCondition, 
		DiscountCondition, 
		PriceConditionClassification, 
		ProductTypeProfitability,
		CountrySpecificTenderInfo,
		THQuotationDelevery,
		OutgoingMails,
	} = cds.entities("com.bayer.SXTENDER.TransactionalData");
	const {
		Template, TemplateCountry, MandatoryTableFieldsCountry, MailTemplate, PT_TMUSER, ExcelAttachment, WordAttachment, WordTemplateCountry,WordTemplate,SchedulerApiConfig,SchedulerApiConfigOAuth
	} = cds.entities("com.bayer.SXTENDER.AdminData");
	const {
		ProductPolicies, PolicyPrices
	} = cds.entities("com.bayer.SXTENDER.PricingPolicyData");

	const {
		LatestApprovedBrandPolicies
	} = cds.entities("PolicyService");

	const {
		InstituteDistributorBrandProduct	
	} = cds.entities("CatalogService");


	const arr = x => Array.from(x);
	const num = x => Number(x) || 0;
	const str = x => String(x);
	const isEmpty = xs => xs.length === 0;
	const take = n => xs => xs.slice(0, n);
	const drop = n => xs => xs.slice(n);
	const reverse = xs => xs.slice(0).reverse();
	const comp = f => g => x => f(g(x));
	const not = x => !x;
	const chunk = n => xs =>
		isEmpty(xs) ? [] : [take(n)(xs), ...chunk(n)(drop(n)(xs))];

/* inWords has moved to NumberHelper.js
	let inWords = (n, currency) => {

		let a = [
			'', 'One', 'Two', 'Three', 'Four',
			'Five', 'Six', 'Seven', 'Eight', 'Nine',
			'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
			'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
		];


		let b = [
			'', '', 'Twenty', 'Thirty', 'Forty',
			'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
		];

		let g = [
			'', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion',
			'Quintillion', 'Sextillion', 'Septillion', 'Octillion', 'Nonillion'
		];


		let makeGroup = ([ones, tens, huns]) => {
			return [
				num(huns) === 0 ? '' : a[huns] + ' Hundred ',
				num(ones) === 0 ? b[tens] : b[tens] && b[tens] + '-' || '',
				a[tens + ones] || a[ones]
			].join('');
		};

		let thousand = (group, i) => group === '' ? group : `${group} ${g[i]}`;



		if (typeof n === 'number')
			return inWords(String(n), currency);
		else if (n === '0')
			return 'zero';
		else {
			// get the dot position
			let amount, cents, numInWords = "";
			let dotPos = n.indexOf('.');

			if (dotPos > 0) {

				amount = n.slice(0, dotPos);  // 1234.56 = 1234
				cents = n.slice(dotPos + 1);  // 1234.56 = .56

			} else if (dotPos == 0) {

				amount = '0';
				cents = n.slice(dotPos + 1);  // 1234.56 = .56

			} else {

				amount = n.slice(0);         // 1234 = 1234
				cents = '0';
			}


			if (amount.length > 0) {
				numInWords = comp(chunk(3))(reverse)(arr(amount))
					.map(makeGroup)
					.map(thousand)
					.filter(comp(not)(isEmpty))
					.reverse()
					.join(' ');
			}

			if (Number(cents) > 0) {

				if (cents.length === 1)
					cents = cents + '0';

				numInWords += 'and ';
				numInWords += comp(chunk(3))(reverse)(arr(cents))
					.map(makeGroup)
					.map(thousand)
					.filter(comp(not)(isEmpty))
					.reverse()
					.join(' ');
				numInWords += 'cents ';
			}

			numInWords += currency + ' only';

			return numInWords;
		}

	};
*/


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
	/*function isDoubleEqual(x, y){
		const doubleComparisonThreshold = 0.0001;
		return (Math.abs(x - y) < doubleComparisonThreshold) ? true : false;
	}*/

	function buildProductValidationForType1(offer, product, productInfo, aApproverTypes, offerProductPack, countryApprovers, instituteDistributorBrandProduct) {//MEA (and default)
		//EHQUT-197468-MEA – Nucleus heads notifications flow
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval

		//Regulatory
		//Optional if business approved (country or regional)
		//Notification if NetOfferPrice = Registered Price (and registered price exists)
		let regulatory = 1;
		// if (product.BUSINESS_APPROVED === 0 && product.REGISTERED_PRICE !== 0) {
		// 	regulatory = ServiceHelper.isDoubleEqual(product.REGISTERED_PRICE, product.NET_OFFER_PRICE) ? 2 : 1;
		// }

		//Legal
		//Optional if legal approved
		//Approval if private institute OR negative profitability
		//Notification for semi-gov institute
		let legal = 1;
		if (product.LEGAL_APPROVED !== 1) {
			if (offer.INSTITUTE_TYPE === "Private" || offer.INSTITUTE_TYPE === "NGO-NPO" || ServiceHelper.isDoubleXBelowY(productInfo.GrossProfitEurSpot, 0)) {
				legal = 3;
			}
			else if (offer.INSTITUTE_TYPE === "Semi-Governmental") {
				legal = 2;
			}
		}

		//Controlling
		//Notification if OfferPrice below lowest price
		let controlling = 1;
		if (ServiceHelper.isDoubleEqual(product.MIN_PRICE, 0) || ServiceHelper.isDoubleXBelowY(product.OFFER_PRICE, product.MIN_PRICE)) {
			controlling = product.CONTROLLING_NOT_REQUIRED === null || product.CONTROLLING_NOT_REQUIRED === 0 ? 2 : 1;
		}

		//Country Business
		//Optional if business approved
		//Mandatory otherwise
		//Note: we had logic only requiring approval if
		//below APPROVED_PRICE (when existed) or below REGISTERED_PRICE (when existed and no APPROVED_PRICE) or when no REGISTERED_PRICE
		//this was removed to allow applying e-signature in quotation document (compliance required business approval)
		let countryBusiness = (product.BUSINESS_APPROVED === 1) ? 1 : product.CREDIT_MANAGER_APPROVED === 1 ? 2 : 3;

		//Regional Business
		//Optional if business approved
		//Mandatory if OfferPrice below lowest price
		//Mandatory if not default payment terms
		//let regionalBusiness = 1;
		// if (product.BUSINESS_APPROVED !== 1) {
		// 	if (ServiceHelper.isDoubleEqual(product.MIN_PRICE, 0) || ServiceHelper.isDoubleXBelowY(product.OFFER_PRICE, product.MIN_PRICE)) {
		// 		regionalBusiness = 3;
		// 	}
		// 	else if (product.IS_DEFAULT_TERMS === 0) {
		// 		regionalBusiness = 3;
		// 	}
		// }
		// Regional Business approver type is always mandatory notification
		let regionalBusiness = product.VOLUME_UOM_UPDATED === null ? 2 : product.VOLUME_UOM_UPDATED; //(product.BUSINESS_APPROVED === 1) ? 1 : 3;
		//Supply
		//Optional if supply approved
		//Mandatory otherwise
		let supply = (product.SUPPLY_APPROVED === 1) ? 1 : product.CREDIT_MANAGER_APPROVED === 1 ? 2 : 3;
		let creditManager = product.CREDIT_MANAGER_APPROVED !== null 
								? (product.CREDIT_MANAGER_APPROVED === 1) ? 3 : 1
								: instituteDistributorBrandProduct?.[0].PAYMENT_TERMS !== product.PAYMENT_TERMS ? 3 : 1


		//change corresponding ApproverTypes.ValidationType with calculated BuildProductValidationForTypeX
		//based upon the country the correct approverType will be handled 
		aApproverTypes.map(async function (oApproverType) {
			switch (oApproverType.ApproverType) {
				case "Regulatory":
					oApproverType.ValidationType = regulatory;
					break;
				case "Legal":
					oApproverType.ValidationType = legal;
					break;
				case "Controlling":
					oApproverType.ValidationType = controlling;
					break;
				case "Country Business":
					oApproverType.ValidationType = countryBusiness;
					break;
				case "Regional Business":
					oApproverType.ValidationType = regionalBusiness;
					break;
				case "Supply Chain":
					oApproverType.ValidationType = supply;
					break;
				case "Credit Manager":
					oApproverType.ValidationType = creditManager;
					break;
				default:
					oApproverType.ValidationType = oApproverType.ValidationType;
			}

			if (oApproverType.ApproverType.toLowerCase().split(" ").join("").includes("ptl")) {
				const ctryApproverType = countryApprovers.find(ca => ca.ApproverType === oApproverType.ApproverType);

				if (ctryApproverType && ctryApproverType.Nucleus === offerProductPack.Nucleus) {
					oApproverType.ValidationType = product.NUCLEUS_HEAD_APPROVED === null ? 3 : product.NUCLEUS_HEAD_APPROVED;
				}
			}
			
		});

		let results = {
			//In Policy flag
			IN_POLICY: true
		};

		/*
		let results = {
			REGULATORY: regulatory,
			LEGAL: legal,
			CONTROLLING: controlling,
			COUNTRY_BUSINESS: countryBusiness,
			REGIONAL_BUSINESS: regionalBusiness,
			SUPPLY_CHAIN: supply,
			//Other countries default values
			NSM_SM_FM: 1,
			HBU: 1,
			CDH: 1,
			MACS: 1,
			TA: 1,
			FBP: 1,
			LPC: 1,
			COM_PGA: 1,
			International_Trade: 1,
			Transfer_Pricing: 1,
			SBR: 1,
			//In Policy flag
			IN_POLICY: true
		};
		*/
		return results;
	}

	function buildProductValidationForType3(offer, product, productInfo, aApproverTypes) {//Mexico
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval

		//Country Business
		//Optional if business approved
		//Mandatory if volume above threshold
		let countryBusiness = (product.BUSINESS_APPROVED === 1 || product.REQUESTED_VOLUME < product.QTY_THRESHOLD) ? 1 : 3;
//EHQUT SCTASK0087077|REQ11341362 - Supply chain should be mandatory if volume above threshold
		//Supply
		//Optional if supply approved
		//Mandatory otherwise
		let supply = (product.SUPPLY_APPROVED === 1 || product.REQUESTED_VOLUME < product.QTY_THRESHOLD) ? 1 : 3;
//EHQUT SCTASK0087077|REQ11341362 - Supply chain should be mandatory if volume above threshold
		//change corresponding ApproverTypes.ValidationType with calculated BuildProductValidationForTypeX
		//based upon the country the correct approverType will be handled 
		aApproverTypes.map(async function (oApproverType) {
			switch (oApproverType.ApproverType) {
				case "Country Business":
					oApproverType.ValidationType = countryBusiness;
					break;
				case "Supply Chain":
					oApproverType.ValidationType = supply;
					break;
				default:
					oApproverType.ValidationType = oApproverType.ValidationType;
			}
		});

		let results = {
			//In Policy flag
			IN_POLICY: true
		};

		/*
		let results = {
			REGULATORY: 1,
			LEGAL: 1,
			CONTROLLING: 1,
			COUNTRY_BUSINESS: countryBusiness,
			REGIONAL_BUSINESS: 1,
			SUPPLY_CHAIN: supply,
			//Other countries default values
			NSM_SM_FM: 1,
			HBU: 1,
			CDH: 1,
			MACS: 1,
			TA: 1,
			FBP: 1,
			LPC: 1,
			COM_PGA: 1,
			International_Trade: 1,
			Transfer_Pricing: 1,
			SBR: 1,
			//In Policy flag
			IN_POLICY: true
		};
		*/

		return results;
	}

	function buildProductValidationForType7(offer, product, productInfo, aApproverTypes) {//Chile
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval

		if (offer.INSTITUTE_TYPE === 'Cenabast' && (product.DIVISION === 'Pharma' || product.DIVISION === 'Consumer Health') && ServiceHelper.isDoubleEqual(product.ADDITIONAL_DISCOUNT, 0)) {
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "Supply Chain":
						oApproverType.ValidationType = 3;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});
		} else if (offer.INSTITUTE_TYPE === 'Cenabast' && (product.DIVISION === 'Pharma' || product.DIVISION === 'Consumer Health') && !ServiceHelper.isDoubleEqual(product.ADDITIONAL_DISCOUNT, 0)) {
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "MACS Head":
						oApproverType.ValidationType = 3;
						break;
					case "Supply Chain":
						oApproverType.ValidationType = 3;
						break;
					case "Business Service":
						oApproverType.ValidationType = 3;
						break;
					case "Law and Patents":
						oApproverType.ValidationType = 3;
						break;
					case "CDH":
						oApproverType.ValidationType = 3;
						break;
					case "Marketing":
						oApproverType.ValidationType = 3;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});
		} else if (!offer.INSTITUTE_TYPE === 'Cenabast' && (product.DIVISION === 'Pharma' || product.DIVISION === 'Consumer Health')) {
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "Supply Chain":
						oApproverType.ValidationType = 2;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});
		} else if (product.DIVISION === 'Radiology') {
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "SBR RA ConoSur":
						oApproverType.ValidationType = 3;
						break;
					case "CDH-Chile (signature)":
						oApproverType.ValidationType = 3;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});
		} else {
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "Supply Chain":
						oApproverType.ValidationType = 2;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});
		}

		//change corresponding ApproverTypes.ValidationType with calculated BuildProductValidationForTypeX
		//based upon the country the correct approverType will be handled 
		/*aApproverTypes.map(async function (oApproverType) {
			switch(oApproverType.ApproverType){
				case "Regulatory": 
					oApproverType.ValidationType = regulatory;
					break;
				case "Legal": 
					oApproverType.ValidationType = legal;
					break;
				case "Controlling":
					oApproverType.ValidationType = controlling;
					break;
				case "Country Business":
					oApproverType.ValidationType = countryBusiness;
					break;
				case "Regional Business":
					oApproverType.ValidationType = regionalBusiness;
					break;
				case "Supply Chain":
					oApproverType.ValidationType = supply;
					break;
				default:
					oApproverType.ValidationType = 1;	
			}
		});*/

		let results = {
			//In Policy flag
			IN_POLICY: true
		};

		return results;
	}
//EHQUT-OTT-138291-Business approval condition for Radiology
	async function buildProductValidationForType9(tx, offer, product, productInfo, aApproverTypes) {//Italy
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval
		let validationType;
		let bBlOneMandatoryAppr = false;

		if (product.OfferType === "Selling"){

			const uom = product.UNIT;
			const netOfferPrice = product.NET_OFFER_PRICE;
			const whereProduct = {
				COUNTRY_CODE: offer.COUNTRYCODE,
				PRODUCT_ID: product.PRODUCTID
			};

			const whereCandidatePrices = {
				CountryCode: offer.COUNTRYCODE,
				ProductPackId: product.PRODUCTID,
				InstituteId: offer.INSTITUTE_ID
			};

			
			const countryPreApprovedPrice = await tx.run(SELECT.one.from(CountryPreApprovedPrices).where(whereProduct));
			const candidatePrice = await tx.run(SELECT.one.from(CandidatePrices).where(whereCandidatePrices));

			let minPreApprovedPrice = countryPreApprovedPrice && (uom === "Pack" ? countryPreApprovedPrice.MIN_PACK_PRICE : countryPreApprovedPrice.MIN_UNIT_PRICE);


			if(((product.ADDITIONAL_DISCOUNT !== null) && ServiceHelper.isDoubleXBelowY(0, product.ADDITIONAL_DISCOUNT) )){
				if(minPreApprovedPrice){
					if(netOfferPrice < minPreApprovedPrice){
						if(!candidatePrice || (candidatePrice && candidatePrice.Price > netOfferPrice)){
							bBlOneMandatoryAppr = true;
							validationType = 1;
						} else {
							validationType = 1; //no additional discount exists; only contract manager notification should be sent
						}
					} else {
						validationType = 1; //no additional discount exists; only contract manager notification should be sent
					}
				} else {
					bBlOneMandatoryAppr = true;
					validationType = 1;
				}
			   } else if(product.DIVISION === "Radiology" && netOfferPrice < minPreApprovedPrice){
                bBlOneMandatoryAppr = true;
                validationType = 1; 
            }
            else {
                validationType = 1; //no additional discount exists; only contract manager notification should be sent
			}
		} else {
			validationType = 1;	//if the offer type differs from selling, all approvals should be optional
		}

		aApproverTypes.map(async function (oApproverType) {	
			// for Supply Chain, optional validation type should still send a notification
			if(oApproverType.ApproverType === "Contract Manager" && validationType === 1 ){
				oApproverType.ValidationType = 2;
			} else {
				oApproverType.ValidationType = validationType;	
			}
			
			if(bBlOneMandatoryAppr && oApproverType.ApproverType === "Business Level 1"){
				oApproverType.ValidationType = 3;
			}
		})

		
		let results = {
			//In Policy flag
			IN_POLICY: true
		};

		return results;
	}
//EHQUT-OTT-138291-Business approval condition for Radiology
	function extractPolicyValue(productPolicyPrices, role, pricingPolicyName) {
		let price = 0;
		productPolicyPrices.forEach(e => {
			if (e.PricingPolicyName === pricingPolicyName && e.Role === role) {
				price = e.Price;
			};
		});
		return price;
	}
//CR2
//EFRCL- 384446- Spain - issues with the new approval process for PH
//EFRCL- 383690- Spain - mandatory approval of Finance and Legal for commercial agreements where payment back date are above one month from the effective date
    async function buildProductValidationForType10(tx, offer, product, productInfo, aApproverTypes, institute) {//Spain
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval
		let supply=(offer.CLASSIFICATION === 'Tender') ? 2 : 1;
		let Difference_In_Days=0;
        const whereProductTypeProfitability = {
            CountryCode: offer.COUNTRYCODE,
            OfferId: offer.OFFERID,
            ProductType: 'Total'
        };

		const whereoffer={
			OfferId: offer.OFFERID,
			PriceConditionCode : ['YAW1','YAW2']
		};

        const whereProduct = {
            CountryCode: offer.COUNTRYCODE,
            ProductPackId: product.PRODUCTID,
			ValidTo :'9999-12-31 00:00:00.000000000'
        };

		const PriceConditionvalue= await tx.run(SELECT.from(PriceCondition).where(whereoffer));
		if(PriceConditionvalue.length>0){
			const EffectiveDate=new Date(offer.EffectiveDate);
			const PaymentBackdate= new Date(PriceConditionvalue[0].RefundDate);
			const Difference_In_Time = PaymentBackdate.getTime() - EffectiveDate.getTime();
		    Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
		}
        
        const MasterProductPrice = await tx.run(SELECT.one.from(MasterPrices).where(whereProduct));
        //EHQUT-412965-ES-Bug Reported by Victor
        var dFloorPrice = MasterProductPrice && ( institute.InstituteType === 'Private Account' || institute.InstituteType === 'Cluster' ) ? MasterProductPrice.PRAF_Private :
						  MasterProductPrice && institute.InstituteType !== 'Private Account' && institute.InstituteType !== 'Cluster' ? MasterProductPrice.PRAF_Public : 0;
						  var UOMValue=product.UNIT;
						  var packfactor=product.PACKSIZE;
						  if(UOMValue=== 'Unit'){
							  dFloorPrice=dFloorPrice/packfactor;
						  }

        let dRadiologyProfitability = 0;

        if(product.DIVISION === 'Radiology'){
            const ProductProfitability = await tx.run(SELECT.one.from(ProductTypeProfitability).where(whereProductTypeProfitability));
            dRadiologyProfitability = ProductProfitability ? Number(ProductProfitability.Profitability)*100 : 0;
//EHQUT-392059-Spain - mandatory notifications to Supply for all offers		
// EFRCL- 360368- Spain- changes in approval workflow for Radiology(Profit, floor price)
// EFRCL- 377753- Spain - changes in approval workflow for Pharma
            if(product.NET_PRICE > dFloorPrice && dRadiologyProfitability >= 40){
                aApproverTypes.map(async function (oApproverType) {
                    switch (oApproverType.ApproverType) {
                        case "KAMS":
                            oApproverType.ValidationType = 3;
                            break;
						case "Supply Chain":
							oApproverType.ValidationType = supply;
							break;
                        default:
                            oApproverType.ValidationType = oApproverType.ValidationType;
                    }
                });
            } else if(product.NET_PRICE > dFloorPrice && dRadiologyProfitability < 40){
                aApproverTypes.map(async function (oApproverType) {
                    switch (oApproverType.ApproverType) {
                        case "KAMS":
                            oApproverType.ValidationType = 3;
                            break;
                        case "BU/RAM":
                            oApproverType.ValidationType = 3;
                            break;
						case "Supply Chain":
							oApproverType.ValidationType = supply;
							break;
                        default:
                            oApproverType.ValidationType = oApproverType.ValidationType;
                    }
                });
            }
         else {
                aApproverTypes.map(async function (oApproverType) {
                    switch (oApproverType.ApproverType) {
						case "KAMS":
							oApproverType.ValidationType = 3;
							break;
						case "CDH":
							oApproverType.ValidationType = 3;
							break;
                        case "BU/RAM":
                            oApproverType.ValidationType = 3;
                            break;
						case "Supply Chain":
							oApproverType.ValidationType = supply;
							break;
                        default:
                            oApproverType.ValidationType = oApproverType.ValidationType;
                    }
                });
		 }
		} else if (product.DIVISION === 'Pharma') {
			if(product.NET_PRICE < dFloorPrice || (Difference_In_Days > 30 && offer.CLASSIFICATION !=='Tender') ){
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "BU/RAM 1":
						oApproverType.ValidationType = 3;
						break;
					case "BU/RAM 2":
						oApproverType.ValidationType = 3;
						break;
					case "Legal":
						oApproverType.ValidationType = 3;
						break;
					case "Financial Business Partner":
						oApproverType.ValidationType = 3;
						break;
					case "Supply Chain":
						oApproverType.ValidationType = supply;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});
		}else{
				aApproverTypes.map(async function (oApproverType) {
					switch (oApproverType.ApproverType) {
						case "BU/RAM 1":
							oApproverType.ValidationType = 3;
							break;
						case "BU/RAM 2":
							oApproverType.ValidationType = 3;
							break;
						case "Supply Chain":
							oApproverType.ValidationType = supply;
							break;
						default:
							oApproverType.ValidationType = oApproverType.ValidationType;
					}
				});
			}
		}
            else {
                
                aApproverTypes.map(async function (oApproverType) {
                    switch (oApproverType.ApproverType) {
                        case "BU/RAM":
                            oApproverType.ValidationType = product.DIVISION === 'Pharma' ? 3 : oApproverType.ValidationType;
                            break;
                        case "Legal":
                            oApproverType.ValidationType = product.DIVISION === 'Pharma' ? 3 : oApproverType.ValidationType;
                            break;
                        case "Financial Business Partner":
                            oApproverType.ValidationType = product.DIVISION === 'Pharma' ? 3 : oApproverType.ValidationType;
                            break;
                        case "Controlling":
                            oApproverType.ValidationType = product.DIVISION === 'Consumer Health' ? 3 : oApproverType.ValidationType;
                            break;
						case "Supply Chain":
							oApproverType.ValidationType = supply;
							break;
                        default:
                            oApproverType.ValidationType = oApproverType.ValidationType;
                    }
                });
            }
        
		
		let results = {
			//In Policy flag
			IN_POLICY: true
		};

		return results;
	}

	function extractPolicyValue(productPolicyPrices, role, pricingPolicyName) {
		let price = 0;
		productPolicyPrices.forEach(e => {
			if (e.PricingPolicyName === pricingPolicyName && e.Role === role) {
				price = e.Price;
			};
		});
		return price;
	}

	/**
	 * Product validation for Brazil
	 * Legend : ValidationType: = 1: Optional, 2: Mandatory Notification, 3: Mandatory Approval
	 * ApproverType Supply is set to ValidationType = 2 in the DB
	 * @param {*} tx 
	 * @param {*} offer 
	 * @param {*} product 
	 * @param {*} productInfo 
	 * @param {*} aApproverTypes 
	 * @param {*} institute 
	 * @returns 
	 */
	async function buildProductValidationForType11(tx, offer, product, productInfo, aApproverTypes, offerProductsTotalValue) {
		const { BrazilPricingPolicy, DistributorDivision, InstituteDivision } = cds.entities("com.bayer.SXTENDER.MasterData");
		const { PriceCondition, PT_TMOFRS } = cds.entities("com.bayer.SXTENDER.TransactionalData");
		const { OfferProductConsolidation, OfferStatus } = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");

		const offers = await tx.run(SELECT.from(PT_TMOFRS).where({TenderID: offer.TENDERID, Active: 1}));
		const offerIds = offers.map(dop => dop.OfferID);
		const offerStatus = await tx.run(SELECT.from(OfferStatus).where({'OFFER_ID': { in: offerIds }, STATUS: ['Offer Approved', 'Results Recorded', 'Quotation Submitted'] }));
		const offerstatusIds = offerStatus.map(dop => dop.OFFER_ID);
		const offerProductConsolidation  = offerStatus.length > 0 && await tx.run(SELECT.from(OfferProductConsolidation).where({'OFFERID': { in: offerstatusIds }})) || null;
		const approvedOfferDiscount = offerProductConsolidation && offerProductConsolidation.find(opc => opc.ProductCode == product.ProductCode);
		const totaldiscountApprovedOffer = approvedOfferDiscount && Math.round((approvedOfferDiscount.ADDITIONAL_DISCOUNT + approvedOfferDiscount.STANDARD_DISCOUNT + Number.EPSILON) * 10_000) / 10_000;
		const priceCondition = await tx.run(SELECT.one.from(PriceCondition).where({'OfferID': product.OFFERID, ProductCode: product.ProductCode}));
        const distributorDivision = await tx.run(SELECT.one.from(DistributorDivision).where({DistributorID: offer.DISTRIBUTOR_ID, DivisionName: product.DIVISION}));
        const institudeDivision = await tx.run(SELECT.one.from(InstituteDivision).where({InstituteID: offer.INSTITUTE_ID, DivisionName: product.DIVISION}));

		const bDirectTender = offer.DISTRIBUTORNAME.toLowerCase() === 'bayer brazil' ? true : false;
		const totalDiscount = Math.round((product.ADDITIONAL_DISCOUNT + product.STANDARD_DISCOUNT + Number.EPSILON) * 10_000) / 10_000; // we want 4 decimal places after the comma, that's why / 10_000
		const whereBrazilPricingPolicyCondition = getBrazilPricingPolicyWhereCondition(bDirectTender, product, offer, priceCondition, institudeDivision, distributorDivision);

		const brazilPricingPolicy = await tx.run(SELECT.one.from(BrazilPricingPolicy).where(whereBrazilPricingPolicyCondition));
		const pricingPolicyDiscount = brazilPricingPolicy?.Discount || 1; // if no brazilPricingPolicy is found, then the policy is within the CommercialPolicy and discount = 100%
		const bWithinCommercialPolicy = !brazilPricingPolicy || totalDiscount <= brazilPricingPolicy?.Discount ? true : totalDiscount <= totaldiscountApprovedOffer ? true : false; // if no brazilPricingPolicy is found, then the policy is within the CommercialPolicy
		const maxAllowedDiscount = Math.round((pricingPolicyDiscount + 0.05 + Number.EPSILON) * 100) / 100; // max allowed discount is 5$ more than the policy discount

		// Outside of commercial policy
		if(!bWithinCommercialPolicy){ 
			// Pharma
			if(product.DIVISION.toLowerCase() === 'pharma'){
				aApproverTypes.map(oApproverType => {
					switch (oApproverType.ApproverType) {
						case "TA Head":
						case "Pricing Manager":
						case "Divisional Finance Manager or Director":
						case "Bill to Cash coordinator":
						case "Order to Cash":
							oApproverType.ValidationType = 3;
							break;
						case "Legal department":
						case "CDH Pharma":
							if(totalDiscount > maxAllowedDiscount){
								oApproverType.ValidationType = 3;
								oApproverType.Hierarchy = 2;
							}
							break;
						default:
							oApproverType.ValidationType = oApproverType.ValidationType;
					}
				});
			}
			// Consumer Health
			if(product.DIVISION.toLowerCase() === 'consumer health'){
				aApproverTypes.map(oApproverType => {
					switch (oApproverType.ApproverType) {
						case "Commercial Operations Manager Consumer Health":
						case "Sales Department":
						case "Director or Manager of Finance BP":
						case "Legal / Antitrust Department":
						case "Bill to Cash coordinator":
						case "Country Division Head Consumer Health":
							oApproverType.ValidationType = 3;
							break;
						default:
							oApproverType.ValidationType = oApproverType.ValidationType;
					}
				});
			}
			// Radiology
			if(product.DIVISION.toLowerCase() === 'radiology'){
				aApproverTypes.map(oApproverType => {
					switch (oApproverType.ApproverType) {
						case "National Sales Manager":
						case "Customer Service Manager":
						case "Director or Coordinator of Finance BP":
						case "National Sales Manager":
						case "CDH Radiology":
						case "Legal / Competition Department":
							oApproverType.ValidationType = 3;
							break;
						default:
							oApproverType.ValidationType = oApproverType.ValidationType;
					}
				});
			}

		}

		// General approvers
		// only for indirect tenders and if total value (all products) is above 500k BRL
		if(!bDirectTender && offerProductsTotalValue > 500_000){
			aApproverTypes.map(oApproverType => {
				switch (oApproverType.ApproverType) {
					case "Credit Team":
						oApproverType.ValidationType = 3;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});
		}
		
		let results = {
			//In Policy flag is used to block the UI for clicking on the approval button (for example used for Thailand)
			IN_POLICY: true
		};

		return results;
	}

	function getBrazilPricingPolicyWhereCondition(bDirectTender, product, offer, priceCondition, institudeDivision, distributorDivision){
		if(product.DIVISION.toLowerCase() === 'pharma' || product.DIVISION.toLowerCase() === 'consumer health'){
			if(product.BRANDNAME.toLowerCase() === 'xarelto'){
				return {
					BrandID: product.BRANDID,
					ProductPackID: product.ProductCode,
					Direct: bDirectTender,
					Division: product.DIVISION,
					ICMS: priceCondition.ICMSTax,
					CAP: priceCondition.CAP === 'Yes' ? true : false
				};
			}else {
				return {
					BrandID: product.BRANDID,
					Direct: bDirectTender,
					Division: product.DIVISION 
				};
			}
		}else if(product.DIVISION.toLowerCase() === 'radiology' ){
			return {
				ProductPackID: product.ProductCode,
				CustomerGroup: bDirectTender ? institudeDivision && institudeDivision.CustomerGroup : distributorDivision && distributorDivision.CustomerGroup
			};
		}
	}

	async function buildProductValidationForType4(tx, offer, product, productInfo, aApproverTypes) {//Thailand
		let results = {
			//In Policy flag
			IN_POLICY: false
		};
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval
         //EHQUT-167489-Supply Chain as optional
		//Supply chain approval is alway mandatory
		let supply = 1;
        //EHQUT-167489-Supply Chain as optional
		//Check on offer unit (pack or unit) and get factor to apply on policy prices
		let uomFactor = 1;
		if (product.UNIT === 'Unit') {
			uomFactor = product.PACKSIZE;
		};

		//Get ChannelId
		let whereChannel = {
			ChannelCountry: offer.COUNTRYCODE,
			ChannelName: offer.INSTITUTE_TYPE
		};
		let channel = await tx.run(SELECT.from(MASTER_COUNTRY_CHANNELS).where(whereChannel));

		let whereLatestApprovedBrandPolicy = {
			CountryCode: offer.COUNTRYCODE,
			BrandId: product.BRANDID,
		};

		let latestApprovedBrandPolicy = await tx.run(SELECT.from(LatestApprovedBrandPolicies).where(whereLatestApprovedBrandPolicy));
		if (latestApprovedBrandPolicy.length === 0) {//No pricing policy
			//change corresponding ApproverTypes.ValidationType with calculated BuildProductValidationForTypeX
			//based upon the country the correct approverType will be handled 
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "PoH/CEH":
						oApproverType.ValidationType = 1;
						break;
					case "CDH":
						oApproverType.ValidationType = 1;
						break;
					case "SM/PCEA":
						oApproverType.ValidationType = 1;
						break;
					case "Supply Chain":
						oApproverType.ValidationType = supply;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});

			return results = {
				//In Policy flag
				IN_POLICY: false
			};

			/*
			return {
				//Default values for other countries approver types
				REGULATORY: 1,
				LEGAL: 1,
				CONTROLLING: 1,
				COUNTRY_BUSINESS: 1,
				REGIONAL_BUSINESS: 1,
				MACS: 1,
				TA: 1,
				FBP: 1,
				LPC: 1,
				COM_PGA: 1,
				International_Trade: 1,
				Transfer_Pricing: 1,
				SBR: 1,
				//Thailand approver types
				NSM_SM_FM: 1,
				HBU: 1,
				CDH: 1,
				SUPPLY_CHAIN: supply,
				//In Policy flag
				IN_POLICY: false
			};
			*/
		}

		//Get latest approved product pricing policy for country and product
		let wherePolicy = {
			BrandPolicy_ID: latestApprovedBrandPolicy[0].ID,
			ProductPackId: product.PRODUCTID
		};

		let productPolicy = await tx.run(SELECT.from(ProductPolicies).where(wherePolicy));
		//Get linked product policy prices (MSP and NSP) for Channel
		let wherePolicyPrices = {
			ProductPolicy_ID: productPolicy[0].ID,
			Channel_ID: channel[0].ID
		};
		let productPolicyPrices = await tx.run(SELECT.from(PolicyPrices).where(wherePolicyPrices));
		if (productPolicyPrices.length !== 6) {//Incomplete pricing policy

			//change corresponding ApproverTypes.ValidationType with calculated BuildProductValidationForTypeX
			//based upon the country the correct approverType will be handled 
			aApproverTypes.map(async function (oApproverType) {
				switch (oApproverType.ApproverType) {
					case "PoH/CEH":
						oApproverType.ValidationType = 1;
						break;
					case "CDH":
						oApproverType.ValidationType = 1;
						break;
					case "SM/PCEA":
						oApproverType.ValidationType = 1;
						break;
					case "Supply Chain":
						oApproverType.ValidationType = supply;
						break;
					default:
						oApproverType.ValidationType = oApproverType.ValidationType;
				}
			});

			return results = {
				//In Policy flag
				IN_POLICY: false
			};

			/*
			return {
				//Default values for other countries approver types
				REGULATORY: 1,
				LEGAL: 1,
				CONTROLLING: 1,
				COUNTRY_BUSINESS: 1,
				REGIONAL_BUSINESS: 1,
				MACS: 1,
				TA: 1,
				FBP: 1,
				LPC: 1,
				COM_PGA: 1,
				International_Trade: 1,
				Transfer_Pricing: 1,
				SBR: 1,
				//Thailand approver types
				NSM_SM_FM: 1,
				HBU: 1,
				CDH: 1,
				SUPPLY_CHAIN: supply,
				//In Policy flag
				IN_POLICY: false
			};
			*/
		}
		//Set variables for policy prices thresholds
		let nsmMSP = extractPolicyValue(productPolicyPrices, 'SM/PCEA', 'MSP') / uomFactor;
		let nsmNSP = extractPolicyValue(productPolicyPrices, 'SM/PCEA', 'NSP') / uomFactor;
		let hbuMSP = extractPolicyValue(productPolicyPrices, 'PoH/CEH', 'MSP') / uomFactor;
		let hbuNSP = extractPolicyValue(productPolicyPrices, 'PoH/CEH', 'NSP') / uomFactor;
		let cdhMSP = extractPolicyValue(productPolicyPrices, 'CDH', 'MSP') / uomFactor;
		let cdhNSP = extractPolicyValue(productPolicyPrices, 'CDH', 'NSP') / uomFactor;

		//Set initial approvals requirement to "Optional", i.e. 1
		let nsmLevel = 1;
		let hbuLevel = 1;
		let cdhLevel = 1;
		let inPolicy = true;//Boolean used to specify if product offer and net offer prices are within policy

		let preApprovedAccountOfferPrice = product.ACCOUNT_OFFER_PRICE;
		let preApprovedAccountNetOfferPrice = product.ACCOUNT_NET_OFFER_PRICE;

		const FOCValue = calculateFOCVolume(product) * product.REGISTERED_PRICE;

		let requiredApprovalLevel = 0;//0: No business approval required; 1:SM/PCEA; 2: PoH/CEH; 3: CDH; 4: Approval not allowed
		if (//This means it's first offer for account or offer price is new lowest for account
			ServiceHelper.isDoubleEqual(preApprovedAccountOfferPrice, 0) ||
			ServiceHelper.isDoubleXBelowY(product.OFFER_PRICE, preApprovedAccountOfferPrice)
		) {
			if (ServiceHelper.isDoubleXBelowEqualY(nsmMSP, product.OFFER_PRICE)) {//SM/PCEA can approve
				requiredApprovalLevel = Math.max(requiredApprovalLevel, 1);
			}
			else if (ServiceHelper.isDoubleXBelowEqualY(hbuMSP, product.OFFER_PRICE)) {//PoH/CEH can approve
				requiredApprovalLevel = Math.max(requiredApprovalLevel, 2);
			}
			else if (ServiceHelper.isDoubleXBelowEqualY(cdhMSP, product.OFFER_PRICE)) {//CDH can approve
				requiredApprovalLevel = Math.max(requiredApprovalLevel, 3);
			}
			else {
				requiredApprovalLevel = 4;
			};
		}
		//EHQUT-INC18040340-Please change price approval authority tracking system - Offer Management Application (FAST)
		if (//This means it's first offer for account or net offer price is new lowest for account
			ServiceHelper.isDoubleEqual(preApprovedAccountNetOfferPrice, 0) ||
			ServiceHelper.isDoubleXBelowY(product.NET_PRICE, preApprovedAccountNetOfferPrice)
		) {
			if (ServiceHelper.isDoubleXBelowEqualY(nsmNSP, product.NET_PRICE)) {//SM/PCEA can approve
				requiredApprovalLevel = Math.max(requiredApprovalLevel, 1);
			}
			else if (ServiceHelper.isDoubleXBelowEqualY(hbuNSP, product.NET_PRICE)) {//PoH/CEH can approve
				requiredApprovalLevel = Math.max(requiredApprovalLevel, 2);
			}
			else if (ServiceHelper.isDoubleXBelowEqualY(cdhNSP, product.NET_PRICE)) {//CDH can approve
				requiredApprovalLevel = Math.max(requiredApprovalLevel, 3);
			}
			else {
				requiredApprovalLevel = 4;
			};
		}

		if (ServiceHelper.isDoubleXBelowEqualY(FOCValue, 30000)) {
			requiredApprovalLevel = Math.max(requiredApprovalLevel, 1);
		}else if (ServiceHelper.isDoubleXBelowY(30000, FOCValue) && ServiceHelper.isDoubleXBelowEqualY(FOCValue, 200000)) {
			requiredApprovalLevel = Math.max(requiredApprovalLevel, 2);
		}else if (ServiceHelper.isDoubleXBelowY(200000, FOCValue)) {
			requiredApprovalLevel = Math.max(requiredApprovalLevel, 3);
		}else {
			requiredApprovalLevel = 4;
		}

		switch (requiredApprovalLevel) {
			case 4:
				inPolicy = false;
				break;
			case 3:
				cdhLevel = 3;
				break;
			case 2:
				hbuLevel = 3;
				break;
			case 1:
				nsmLevel = 3;
				break;
		}

		//change corresponding ApproverTypes.ValidationType with calculated BuildProductValidationForTypeX
		//based upon the country the correct approverType will be handled 
		aApproverTypes.map(async function (oApproverType) {
			switch (oApproverType.ApproverType) {
				case "PoH/CEH":
					oApproverType.ValidationType = hbuLevel;
					break;
				case "CDH":
					oApproverType.ValidationType = cdhLevel;
					break;
				case "SM/PCEA":
					oApproverType.ValidationType = nsmLevel;
					break;
				case "Supply Chain":
					oApproverType.ValidationType = supply;
					break;
			}
		});

		results = {
			//In Policy flag
			IN_POLICY: inPolicy
		};

		/*
		let results = {
			//Default values for other countries approver types
			REGULATORY: 1,
			LEGAL: 1,
			CONTROLLING: 1,
			COUNTRY_BUSINESS: 1,
			REGIONAL_BUSINESS: 1,
			MACS: 1,
			TA: 1,
			FBP: 1,
			LPC: 1,
			COM_PGA: 1,
			International_Trade: 1,
			Transfer_Pricing: 1,
			SBR: 1,
			//Thailand approver types
			NSM_SM_FM: nsmLevel,
			HBU: hbuLevel,
			CDH: cdhLevel,
			SUPPLY_CHAIN: supply,
			//In Policy flag
			IN_POLICY: inPolicy
		};
		*/

		return results;
	}

	function buildProductValidationForType5(offer, product, productInfo, aApproverTypes) {//Argentina
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval

		//change corresponding ApproverTypes.ValidationType with calculated BuildProductValidationForTypeX
		//based upon the country the correct approverType will be handled 

		aApproverTypes.map(async function (oApproverType) {
			switch (oApproverType.ApproverType) {
				case "MACS":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 3 : 3;
					break;
				case "TA":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 3 : 3;
					break;
				case "FBP":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 3 : 3;
					break;
				case "LPC":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 3 : 3;
					break;
				case "COM/PGA":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 3 : 3;
					break;
				case "Supply Chain":  
                    oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 2 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 2 : 3;
					break;
				case "International Trade":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 1 : 3;
					break;
				case "Transfer Pricing":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 1 : 3;
					break;
				case "CDH":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 3 : 3;
					break;
				case "SBR":
					oApproverType.ValidationType = ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_OFFER_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_OFFER_PRICE)) ? 1 : 3;
					break;
				default:
					oApproverType.ValidationType = oApproverType.ValidationType;
			}
		});

		let results = {
			//In Policy flag
			IN_POLICY: true
		};
		/*
				let results = {
					//Default values for other countries approver types
					REGULATORY: 1,
					LEGAL: 1,
					CONTROLLING: 1,
					COUNTRY_BUSINESS: 1,
					REGIONAL_BUSINESS: 1,
					NSM_SM_FM: 1,
					HBU: 1,
					//Argentina approver types
					MACS: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 3 : 3,
					TA: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 3 : 3,
					FBP: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 1 : 3,
					LPC: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 3 : 3,
					COM_PGA: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 3 : 3,
					International_Trade: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 1 : 3,
					Transfer_Pricing: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 1 : 3,
					SBR: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 1 : 3,
					CDH: ServiceHelper.isDoubleEqual(product.OFFER_PRICE, product.NET_PRICE) ? 1 : (product.BUSINESS_CASE_PRICE && ServiceHelper.isDoubleXBelowEqualY(product.BUSINESS_CASE_PRICE, product.NET_PRICE)) ? 3 : 3,
					SUPPLY_CHAIN: 3,
					//In Policy flag
					IN_POLICY: true
				};
		*/
		return results;
	}

	async function buildProductInfoForCountry(tx, offer, product, aApproverTypes, institute, offerProductsTotalValue, offerProductPack, countryApprovers, instituteDistributorBrandProduct) {
		let commnonProductInfo = buildCommonProductInfo(offer, product);
		let productValidation = {};
		if (offer.APPROVAL_TYPE === 1 || offer.APPROVAL_TYPE === 2) {//Applicable for MEA
			productValidation = buildProductValidationForType1(offer, product, commnonProductInfo, aApproverTypes, offerProductPack, countryApprovers, instituteDistributorBrandProduct)
		}
		else if (offer.APPROVAL_TYPE === 3) {//Applicable for Mexico
			productValidation = buildProductValidationForType3(offer, product, commnonProductInfo, aApproverTypes)
		}
		else if (offer.APPROVAL_TYPE === 4) {//Applicable for Thailand
			productValidation = await buildProductValidationForType4(tx, offer, product, commnonProductInfo, aApproverTypes)
		}
		else if (offer.APPROVAL_TYPE === 5) {//Applicable for Argentina
			productValidation = buildProductValidationForType5(offer, product, commnonProductInfo, aApproverTypes)
		}
		else if (offer.APPROVAL_TYPE === 7) { //Applicable for Chile
			productValidation = buildProductValidationForType7(offer, product, commnonProductInfo, aApproverTypes)
		}
		else if (offer.APPROVAL_TYPE === 9) { //Applicable for Italy
			productValidation = await buildProductValidationForType9(tx, offer, product, commnonProductInfo, aApproverTypes)
		}
        else if (offer.APPROVAL_TYPE === 10) { //Applicable for Spain
			productValidation = await buildProductValidationForType10(tx, offer, product, commnonProductInfo, aApproverTypes, institute)
        }
		else if (offer.APPROVAL_TYPE === 11) { //Applicable for Brazil
			productValidation = await buildProductValidationForType11(tx, offer, product, commnonProductInfo, aApproverTypes, offerProductsTotalValue)
        }
		else {//Not implemented yet, there will be approval type values for each case where logic is different
			productValidation = buildProductValidationForType1(offer, product, commnonProductInfo, aApproverTypes, offerProductPack, countryApprovers, instituteDistributorBrandProduct)
		}

		return {
			CommnonProductInfo: commnonProductInfo,
			ProductValidation: productValidation
		};
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

		const productPackIDs = aOfferProduct.map(el => el.ProductCode);
        const offerProductPacks = await tx.run(SELECT.from(PT_TMPRDPCK).where({PRODUCTPACKID: {in: productPackIDs}}));

		const countryApprovers = await tx.run(SELECT.from(CountryApprovers).where({CountryCode: offer.COUNTRYCODE}));
		const countryLegalEntity = await tx.run(SELECT.one.from(CountryLegalEntity).where({CountryCode: offer.COUNTRYCODE}));


		//where statement
		let whereApproverType = {
			CountryCode: offer.COUNTRYCODE
		}

		//Get corresponding approvertypes
		let aApproverTypes = await tx.run(SELECT.from(ApproverTypes).where(whereApproverType));

		results = aOfferProduct.map(async function (offerProduct) {
			const offerProductPack = offerProductPacks.find(pck => pck.PRODUCTPACKID === offerProduct.ProductCode);
			const instituteDistributorBrandProduct = await srv.run(SELECT.one.from(InstituteDistributorBrandProduct).where({
				COUNTRY_CODE: offer.COUNTRYCODE,
				INSTITUTE_ID: offer.INSTITUTE_ID,
				DISTRIBUTOR_ID: offer.DISTRIBUTOR_ID,
				PRODUCT_ID: offerProduct.ProductCode,
				CHANNEL: offerProduct.CHANNEL,
				LEGAL_ENTITY_CODE: countryLegalEntity.LegalEntityCode,
				DIVISION: offerProduct.DIVISION
			}));


			let aTempApproverTypes = JSON.parse(JSON.stringify(aApproverTypes)); //lose previous references to approverTypes
			let productInfo = await buildProductInfoForCountry(tx, offer, offerProduct, aTempApproverTypes, institute, offerProductsTotalValue, offerProductPack, countryApprovers, instituteDistributorBrandProduct);
			
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
				PRODUCTGENERICNAME: offerProduct.PRODUCTGENERICNAME,
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
				IBIZWORKFLOWID: offerProduct.IBIZWORKFLOWID,
				ItemNumber: offerProduct.ItemNumber,
				TenderAnnouncementReference: offer.PaymentTerms
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

		const whereSelectedOffer = ServiceHelper.buildFullWhere("OfferID", "=", offer.OFFERID);
		let selectedOffer = await tx.run(SELECT.one.from(PT_TMOFRS).where(whereSelectedOffer));

		let quotation = await tx.run(SELECT.one.from(PT_TMQUTO).where({"OfferID": offer.OFFERID, "Active": 1}));

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

		/*
				//Shared
				let supply = Math.max.apply(Math, offerProductValidation.map((d) => { return d.SUPPLY_CHAIN }));
				//MEA
				let regulatory = Math.max.apply(Math, offerProductValidation.map((d) => { return d.REGULATORY }));
				let legal = Math.max.apply(Math, offerProductValidation.map((d) => { return d.LEGAL }));
				let controlling = Math.max.apply(Math, offerProductValidation.map((d) => { return d.CONTROLLING }));
				let countryBusiness = Math.max.apply(Math, offerProductValidation.map((d) => { return d.COUNTRY_BUSINESS }));
				let regionalBusiness = Math.max.apply(Math, offerProductValidation.map((d) => { return d.REGIONAL_BUSINESS }));
				countryBusiness = (regionalBusiness !== 1) ? 1 : countryBusiness;//No need for country business approval if regional business approval is required
				//Thailand
				let nsmLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.NSM_SM_FM }));
				let hbuLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.HBU }));
				let cdhLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.CDH }));
				if (cdhLevel === 3) {//If CDH approval is mandatory, lower levels do not need to approve
					nsmLevel = 1;
					hbuLevel = 1;
				}
				else if (hbuLevel === 3) {//If HBU approval is mandatory, lower levels do not need to approve
					nsmLevel = 1;
				}
				let inPolicy = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IN_POLICY ? 1 : 0 })) === 1 ? true : false;
				//Argentina
				let macsLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.MACS }));
				let taLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.TA }));
				let fbpLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.FBP }));
				let lpcLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.LPC }));
				let comPgaLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.COM_PGA }));
				let internationTradeLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.International_Trade }));
				let transferPricingLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.Transfer_Pricing }));
				let sbrLevel = Math.max.apply(Math, offerProductValidation.map((d) => { return d.SBR }));
		*/
		let isLowest = Math.max.apply(Math, offerProductValidation.map((d) => { return d.IS_LOWEST }));
		let isDefaultTerms = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IS_DEFAULT_TERMS }));
		let isNewApproval = Math.max.apply(Math, offerProductValidation.map((d) => { return d.NEW_APPROVAL }));
		let isRegistered = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IS_REGISTERED }));


		let totalAmount = offerProductValidation.reduce((a, b) => a + b.GROSS_SALES_OFFER_CURRENCY, 0);
		// let totalAmountInWords = inWords(totalAmount, offer.CURRENCY);
		let totalAmountInWords = `${NumberHelper.formatNumberToText(tender.CountryCode,totalAmount)} ${offer.CURRENCY} only`;

		let budgetRate = Math.min.apply(Math, offerProductValidation.map((d) => { return d.BUDGET_RATE }));
		let spotRate = Math.min.apply(Math, offerProductValidation.map((d) => { return d.SPOT_RATE }));

		let totalAmountVat = offerProductValidation.reduce((a, b) => a + b.GROSS_SALES_OFFER_CURRENCY_VAT, 0);
		// let totalAmountVatInWords = inWords(totalAmountVat, offer.CURRENCY);
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

		//Delivery Terms need to be specified by item number if not same for all
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
        remarks=remarks.concat((InstituteRemark !== "" && offer.COUNTRYCODE !== 'IT') ? InstituteRemark.concat("<br>") : "");
		remarks = remarks.concat((producRemark !== "") ? producRemark.concat("<br>") : "");

		// get SUBMITTED_BY user info 
		const whereCWID = ServiceHelper.buildFullWhere("CWID", "=", offer.TENDER_SUBMITTED_BY);
		
		const userInfo = await tx.run(SELECT.from(PT_TMUSER).where(whereCWID));
		const THQuotationDeleveryResults = {
			QuotationDeliverymethod: '',
			QuotationRecipientname: '',
			QuotationRecipientcontact: '',
		};
		
		if (tender.CountryCode === 'TH') {
			let QuotationDeleveryTH = await tx.run(SELECT.from(THQuotationDelevery).where({ "OfferID": offer.OFFERID }));
			
			QuotationDeleveryTH.forEach((item, index) => {
				if (item.QuotationDeliverymethod) {
					THQuotationDeleveryResults.QuotationDeliverymethod += (THQuotationDeleveryResults.QuotationDeliverymethod ? ',' : '') + item.QuotationDeliverymethod;
				}
				if (item.QuotationRecipientname) {
					THQuotationDeleveryResults.QuotationRecipientname += (THQuotationDeleveryResults.QuotationRecipientname ? ',' : '') + item.QuotationRecipientname;
				}
				if (item.QuotationRecipientcontact) {
					THQuotationDeleveryResults.QuotationRecipientcontact += (THQuotationDeleveryResults.QuotationRecipientcontact ? ',' : '') + item.QuotationRecipientcontact;
				}
			});
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
			TENDER_TYPE: tenderType[0]?.NAME,
			CREATED_BY_USER_EMAIL : userInfo[0] && userInfo[0].UserEmail,
			CREATED_BY_USER_ROLE :userInfo[0] && userInfo[0].Role,
            CREATED_BY_USER_CONTACTNUMBER :userInfo[0] && userInfo[0].ContactNumber,
			CONTENT :tender.CONTENT,
			Unitofvalidityperiod: quotation?.Custom_String_1,
			DeliveryDue: tender?.Custom_Integer_1,
			Unitofdeliverydue: tender?.Custom_String_4,
			QuotationDeliverymethod: THQuotationDeleveryResults?.QuotationDeliverymethod,
			QuotationRecipientname: THQuotationDeleveryResults?.QuotationRecipientname,
			QuotationRecipientcontact: THQuotationDeleveryResults?.QuotationRecipientcontact,
			Expectdatetoreceivethedocument: quotation?.Custom_Date_1,
			RequestorPphoneNnumber: tender.Custom_String_2,
            BayerRepresentativeName: tender.Custom_String_1,
            BayerRepresentativePhoneNumber: tender.Custom_String_3,
            PeriodOfBankGauranteeStart: tender.Custom_Date_1,
            PeriodOfBankGauranteeEnd: tender.Custom_Date_2,
            BGValueBaht: ServiceHelper.formatNumber(tender.Custom_Double_1, 2, 2),
			TenderAnnouncementReference: selectedOffer?.Custom_String_1,
			ContractLength: tender.ContractLength,
            ContractLenghtUnit: tender.Custom_String_5,
			AttentionTo: quotation?.Custom_String_6,
            QuotationDate: quotation?.Custom_Date_3
		};
		return results;
		
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
		let countriesNeedCountryBusinessApproverType = ['AL', 'TN', 'MO'];

		if(tenderyear> '22' && regionname === 'MEA' && !countriesNeedCountryBusinessApproverType.includes(Countrycode)){
			if (CountryBusinessindex !== -1) {
				aApproverTypes.splice(CountryBusinessindex, 1);
			}				
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
		let oNSM = aApproverTypes.find(approverType => approverType.ApproverType === 'SM/PCEA');
		let oHBU = aApproverTypes.find(approverType => approverType.ApproverType === 'PoH/CEH');
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
			case "Specialty Medicine PTL":
			case "Value Brands PTL":
			case "Oncology PTL":
			case "Cardio-Renal PTL":
			case "Womens Healthcare PTL":
			case "Ophthalmology PTL":
			case "Cardiology PTL":
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
	function buildValidationEntry(approverTypes, approvalForType, defaultForType, offerValidation, requiredActionCode) {
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
			//			hierarchy = approvalForType[0].Hierarchy;
		}
		else if (defaultForType.length !== 0) {
			approverName = defaultForType[0].ApproverName;
			approverEmailID = defaultForType[0].ApproverEmailID;
		}
		else {
			return null;
		}
		approverType = defaultForType[0].ApproverType;
		division = defaultForType[0].Division;

		//let aApproval = approvals.filter((a) => a.ApproverType === approverType);
		let aApproval = approvalForType.filter((a) => a.ApproverType === approverType);
		let aApproverType = approverTypes.filter((d) => d.ApproverType === approverType);
		if (aApproval.length > 0 && aApproval[0].Hierarchy !== null) {
			aApproverType[0].Hierarchy = aApproval[0].Hierarchy;
		}

		return {
			TenderID: offerValidation.TENDERID,
			OfferId: offerValidation.OFFERID,
			CountryCode: offerValidation.COUNTRYCODE,
			ApprovalContent: getApprovalContent(approverType),
			ApproverTypeSection: (requiredActionCode === 1) ? 2 : 1,
			REQUIRED_ACTION: approvalForType[0] && approvalForType[0].REQUIRED_ACTION ? approvalForType[0].REQUIRED_ACTION : getRequiredAction(requiredActionCode),
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
		};
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
		const THApproverTypes = {
			"SM/PCEA": "NSM/SM/FM",
			"PoH/CEH": "HBU"
		};

		approverType = THApproverTypes[approverType] && latestApproval.filter(la => la.ApproverType === approverType).length == 0 ? THApproverTypes[approverType] : approverType;

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

	async function buildValidationEntryNew(approverTypes, latestApproval, offerValidation, countryApprovers, country) {

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

			if (country.Region === "MEA") {
				if (type.ApproverType === 'Regional Business') {
					const validationType = type.ValidationType === 2 && ServiceHelper.isDoubleXBelowY(1000000, offerValidation.AMOUNT_IN_NUMBERS) ? 2 : 1;
					type.ValidationType = validationType;
					type.ValidationType2 = validationType;
					requiredAction = validationType;
				}
			}

			aResults.push({
				TenderID: offerValidation.TENDERID,
				OfferId: offerValidation.OFFERID,
				CountryCode: offerValidation.COUNTRYCODE,
				ApprovalContent: getApprovalContent(approverType),
				ApproverTypeSection: (requiredAction === 1) ? 2 : 1,
				REQUIRED_ACTION: approvalForType[0] && approvalForType[0].REQUIRED_ACTION ? country.Region === "MEA" ? getRequiredAction(requiredAction) : approvalForType[0].REQUIRED_ACTION : getRequiredAction(requiredAction),
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
		let country = await tx.run(SELECT.one.from(PT_TMCTRY).where(whereCountry));


		if (!offerValidation.COUNTRYCODE) return results;

		//get ApproverTypes
		if (offerValidation) {
			approverTypes = offerValidation.ApproverTypes;
		}

		return await buildValidationEntryNew(approverTypes, latestApproval, offerValidation, countryApprovers, country);

	}

	async function getOffersForWorkflow(tx, approvalStatus) {
		let whereStatus = ServiceHelper.buildFullWhere("ApprovalStatus", "=", approvalStatus);

		let workflowApprovals = await tx.run(SELECT.from(ApprovalRequests).where(whereStatus));
		let workflowOffers = workflowApprovals.map((d) => d.OfferId);
		return R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), workflowOffers);
	}

	async function buildWorkflowApprovalOffersEntry(tx, offerId, approvalStatus) {
		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerValidation = await buildOfferValidation(tx, whereOffer);
		return {
			OFFERSTATUSPATH: offerValidation.OFFERSTATUSPATH,
			COUNTRYCODE: offerValidation.COUNTRYCODE,
			TENDERID: offerValidation.TENDER_REFERENCE, //offerValidation.TENDERID,
			OFFERID: offerValidation.OFFERID,
			INSTITUTENAME: offerValidation.INSTITUTENAME,
			TAXCODE: offerValidation.TAXCODE,
			VATCODE: offerValidation.VATCODE,
			CURRENCY: offerValidation.CURRENCY,
			AMOUNT_IN_NUMBERS: ServiceHelper.formatNumber(offerValidation.AMOUNT_IN_NUMBERS, 2, 2),
			AMOUNT_IN_WORDS: offerValidation.AMOUNT_IN_WORDS,
			AMOUNT_IN_NUMBERS_VAT : offerValidation.AMOUNT_IN_NUMBERS_VAT,
            AMOUNT_IN_WORDS_VAT   : offerValidation.AMOUNT_IN_WORDS_VAT,
			DISTRIBUTORNAME: offerValidation.DISTRIBUTORNAME,
			DISTRIBUTORADDRESS: (!offerValidation.DISTRIBUTORADDRESS) ? "" : offerValidation.DISTRIBUTORADDRESS.replace(/<br>+/g, "</br>"),
			DISTRIBUTORPHONE: (!offerValidation.DISTRIBUTORPHONE) ? "" : offerValidation.DISTRIBUTORPHONE,
			DISTRIBUTORFAX: (!offerValidation.DISTRIBUTORFAX) ? "" : offerValidation.DISTRIBUTORFAX,
			DISTRIBUTORCONTACT: (!offerValidation.DISTRIBUTORCONTACT) ? "" : offerValidation.DISTRIBUTORCONTACT,
			OFFERDATE: offerValidation.OFFERDATE,
			OFFERVALIDITY: offerValidation.OFFERVALIDITY,
			SELLINGCOMPANY: offerValidation.SELLINGCOMPANY,
			SELLINGCOMPANYBANK: (!offerValidation.SELLINGCOMPANYBANK) ? "" : offerValidation.SELLINGCOMPANYBANK.replace(/<br>+/g, "</br>"),
			REMARKS: (!offerValidation.REMARKS) ? "" : offerValidation.REMARKS.replace(/<br>+/g, "</br>").replace("NULL", ""),
			APPROVER1: (!offerValidation.SELLING_COMPANY_AS1) ? "" : offerValidation.SELLING_COMPANY_AS1.replace(/\\+/g, "</br>"),
			APPROVER2: (!offerValidation.SELLING_COMPANY_AS2) ? "" : offerValidation.SELLING_COMPANY_AS2.replace(/\\+/g, "</br>"),
			E_SIGNATURE1: offerValidation.E_SIGNATURE1,
			E_SIGNATURE2: offerValidation.E_SIGNATURE2,
			SHIPMENTTERMS: (!offerValidation.SHIPMENTTERMS) ? "" : offerValidation.SHIPMENTTERMS.replace(/<br>+/g, "</br>"),
			PAYMENTTERMS: (!offerValidation.PAYMENTTERMS) ? "" : offerValidation.PAYMENTTERMS.replace(/<br>+/g, "</br>"),
			DELIVERYTERMS: (!offerValidation.DELIVERYTERMS) ? "" : offerValidation.DELIVERYTERMS.replace(/<br>+/g, "</br>"),
			CUSTOM_REMARKS: (!offerValidation.CUSTOM_REMARKS) ? "" : offerValidation.CUSTOM_REMARKS,
			LETTERHEAD: (!offerValidation.LETTERHEAD) ? "" : offerValidation.LETTERHEAD.replace(/<br>+/g, "</br>"),
			CANCELLED: (approvalStatus === "Processing") ? "No" : "Yes",
			BUDGET_RATE: offerValidation.BUDGET_RATE,
			SPOT_RATE: offerValidation.SPOT_RATE,
			EFFECTIVEDATE :offerValidation.EffectiveDate,
			EXPIRYDATE : offerValidation.ExpiryDate
		}
	}
//EHQUT-201601-INC17103555 Price per unit is rounded to 4 decimals, we need 5 decimals.
	async function buildWorkflowApprovalProductsEntries(tx, offerId, approvalStatus) {
		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerProductValidation = await buildOfferProductValidation(tx, whereOffer);
		return offerProductValidation.map((d) => {
			return {
				TENDERID: d.TENDER_ID,
				OFFERID: d.OFFER_ID,
				COUNTRYCODE: d.COUNTRY_CODE,
				PRODUCTCODE: d.CODE && d.CODE.toString() || "",
				SORTER: d.SORTER,
				BRANDNAME: d.BRANDNAME,
				PRODUCT_UNIT_NAME: d.PRODUCT_UNIT_NAME,
				PRODUCTNAME: d.PRODUCTNAME,
				PACKSIZE: d.PACKSIZE,
				DOSAGE: d.DOSAGE,
				UOM: d.UOM,
				COUNTRYOFORIGIN: d.COUNTRYOFORIGIN,
				MANUFACTURER: d.MANUFACTURER,
				SHELFLIFE: d.SHELFLIFE,
				PRESENTATION: d.PRESENTATION,
				VAT: d.VAT,
				CURRENCY: d.CURRENCY,
				NETOFFERPRICE: ServiceHelper.formatNumber(d.NETOFFERPRICE, 2, 2),
				REQUESTEDVOLUME: d.REQUESTED_QUANTITY.replace(/<br>+/g, "</br>"),
				PAIDVOLUME: Math.round(d.PAID_VOLUME),
				FOC: d.FOC,
				UNIT: d.UNIT,
				TOTAL_QUANTITY_UNITS: ServiceHelper.formatNumber(d.TOTAL_QUANTITY_UNITS, 0, 0),
				FOC_QUANTITY_UNITS: ServiceHelper.formatNumber(d.FOC_QUANTITY_UNITS, 0, 0),
				PAID_QUANTITY_UNITS: ServiceHelper.formatNumber(d.PAID_QUANTITY_UNITS, 0, 0),
				REQ_PRICE_UNIT_OFFER_CURRENCY: (d.COUNTRY_CODE === "IT") ? ServiceHelper.formatNumber(d.REQ_PRICE_UNIT_OFFER_CURRENCY, 5, 5) : ServiceHelper.formatNumber(d.REQ_PRICE_UNIT_OFFER_CURRENCY, 4, 4),
				REQ_PRICE_PACK_OFFER_CURRENCY: ServiceHelper.formatNumber(d.REQ_PRICE_PACK_OFFER_CURRENCY, 2, 2),
				REQ_PRICE_UNIT_EUR_BUDGET: ServiceHelper.formatNumber(d.REQ_PRICE_UNIT_EUR_BUDGET, 4, 4),
				REQ_PRICE_UNIT_EUR_SPOT: ServiceHelper.formatNumber(d.REQ_PRICE_UNIT_EUR_SPOT, 4, 4),
				NET_PRICE_UNIT_OFFER_CURRENCY: ServiceHelper.formatNumber(d.NET_PRICE_UNIT_OFFER_CURRENCY, 4, 4),
				NET_PRICE_PACK_OFFER_CURRENCY: ServiceHelper.formatNumber(d.NET_PRICE_PACK_OFFER_CURRENCY, 2, 2),
				NET_PRICE_UNIT_EUR_BUDGET: ServiceHelper.formatNumber(d.NET_PRICE_UNIT_EUR_BUDGET, 4, 4),
				NET_PRICE_UNIT_EUR_SPOT: ServiceHelper.formatNumber(d.NET_PRICE_UNIT_EUR_SPOT, 4, 4),
				COGS_EUR_UNIT: ServiceHelper.formatNumber(d.COGS_EUR_UNIT, 2, 2),
				GROSS_MARGIN_EUR_BUDGET: ServiceHelper.formatNumber(d.GROSS_MARGIN_EUR_BUDGET, 2, 2),
				GROSS_MARGIN_EUR_SPOT: ServiceHelper.formatNumber(d.GROSS_MARGIN_EUR_SPOT, 2, 2),
				GROSS_SALES_OFFER_CURRENCY: ServiceHelper.formatNumber(d.GROSS_SALES_OFFER_CURRENCY, 2, 2),
				NET_SALES_OFFER_CURRENCY: ServiceHelper.formatNumber(d.NET_SALES_OFFER_CURRENCY, 0, 0),
				NET_SALES_EUR_BUDGET: ServiceHelper.formatNumber(d.NET_SALES_EUR_BUDGET, 0, 0),
				NET_SALES_EUR_SPOT: ServiceHelper.formatNumber(d.NET_SALES_EUR_SPOT, 0, 0),
				GROSS_PROFIT_EUR_BUDGET: ServiceHelper.formatNumber(d.GROSS_PROFIT_EUR_BUDGET, 0, 0),
				GROSS_PROFIT_EUR_SPOT: ServiceHelper.formatNumber(d.GROSS_PROFIT_EUR_SPOT, 0, 0),
				DIVISION: d.DIVISION,
				BUDGETEDPROFITABILITY: (d.BUDGETED_PROFITABILITY === -1) ? "NA" : ServiceHelper.formatNumber(100 * d.BUDGETED_PROFITABILITY, 2, 2).concat("%"),
				PROFITABILITYBUDGET: ServiceHelper.formatNumber(100 * d.GROSS_MARGIN_EUR_BUDGET, 2, 2).concat("%"),
				PROFITABILITYSPOT: ServiceHelper.formatNumber(100 * d.GROSS_MARGIN_EUR_SPOT, 2, 2).concat("%"),
				BUDGET_RATE: d.BUDGET_RATE,
				SPOT_RATE: d.SPOT_RATE,
				BUSINESS_CASE_PRICE: ServiceHelper.formatNumber(d.BUSINESS_CASE_PRICE, 2, 2),
				IS_LOWEST: d.IS_LOWEST,
				REQ_PRICE_UNIT_OFFER_CURRENCY_VAT: d.REQ_PRICE_UNIT_OFFER_CURRENCY_VAT,
            	NET_PRICE_UNIT_OFFER_CURRENCY_VAT: d.NET_PRICE_UNIT_OFFER_CURRENCY_VAT,
            	GROSS_SALES_OFFER_CURRENCY_VAT: d.GROSS_SALES_OFFER_CURRENCY_VAT,
				WARRANTY: d.Warranty,
				AGREEMENTDURATION: d.AgreementDuration,
				MONTHLYRENT: d.MonthlyRent,
				MONTHSPERINVOICE: d.MonthsPerInvoice,
				CONTRACTSTARTDATE: d.ContractStartDate,
				VALUEOFDEVICES: d.ValueOfDevices,
				STATUSOFDEVICE: d.StatusOfDevice,
				MINCONTRACTUAL: d.MinContractual,
				MINANNPURCH: d.MinAnnPurch,
				FOC_STEP: d.FOC_STEP,
				MOLECULE_NAME: d.MOLECULE_NAME,
				
				//missing SKU & SKUCountry fields
				MOLECULE_NAME: d.MOLECULE_NAME,
				ACTIVERECORD: d.ACTIVERECORD,
				HLEVEL6_CODE: d.HLEVEL6_CODE,
				PCI_NAME: d.PCI_NAME,
				ACTIVE_SUBSTANCE: d.ACTIVE_SUBSTANCE,
				PRODUCT_TYPE: d.PRODUCT_TYPE,

				SKUCOUNTRY_ACTIVERECORD: d.SKUCOUNTRY_ACTIVERECORD,
				PRESENTATION_2: d.PRESENTATION_2,
				PRODUCT_COMMENT: d.PRODUCT_COMMENT,
				GOV_CODE: d.GOV_CODE,
				CODE1: d.CODE1,
				CODE2: d.CODE2,
                CODE3: d.CODE3,
				QTY_THRESHOLD: d.QTY_THRESHOLD,
				//end of missing SKU & SKUCountry fields

				FreeGoodsOther: d.FreeGoodsOther
				
			}
		});
	}
//EHQUT-201601-INC17103555 Price per unit is rounded to 4 decimals, we need 5 decimals.
	async function buildWorkflowApprovalApprovalsEntries(tx, offerId, approvalStatus) {
		let whereOffer = ServiceHelper.buildFullWhere("OfferId", "=", offerId);
		let offerApprovals = await buildOfferApproval(tx, whereOffer);//HERE
		
		offerApprovals = offerApprovals.filter((d) => d.ApprovalStatus === approvalStatus);

		whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerProductValidation = await buildOfferProductValidation(tx, whereOffer);

		return offerApprovals.map((d) => {
			let statusPath = offerProductValidation.map((p) => {
				let result = "PT_TMAPPRST(OfferId='";
				result = result.concat(d.OfferId)
					.concat("',productcode=")
					.concat(p.PRODUCTID).concat(",ApproverEmailID='")
					.concat(d.ApproverEmailID).concat("',Active=1,Statustime=")
					.concat(d.Statustime.replace(" ", "T")).concat(",ApproverType='")
					.concat(d.ApproverType)
					.concat("',LotID=")
					.concat(p.LOTID)
					.concat(")");
				return result;
			});
			statusPath = statusPath.join(";")
			return {
				STATUSPATH: statusPath,
				TENDERID: d.TenderID,
				OFFERID: d.OfferId,
				COUNTRYCODE: d.CountryCode,
				SUBMITTED_BY: d.Submittedby,
				SUBMITTED_BY_NAME: d.UserName,
				SUBMITTED_BY_EMAIL: d.UserEmail,
				APPROVAL_TYPE: (d.ApproverTypeSection === 1) ? "Mandatory" : "Optional",
				ApprovalContent: d.ApprovalContent,
				ApproverName: d.ApproverName,
				ApproverEmailID: d.ApproverEmailID,
				SenderComment: (!d.SenderComment) ? "" : d.SenderComment,
				ApproverType: d.ApproverType,
				REQUIRED_ACTION: d.REQUIRED_ACTION,
				APPROVAL_STATUS: d.ApprovalStatus,
				FLOW_ID: (!d.FLOW_ID) ? "" : d.FLOW_ID,
				DIVISION: d.Division,
				COUNTRYNAME: d.CountryName,
				HIERARCHY: d.ApproverTypes[0].Hierarchy
			}
		})
	}

	async function buildWorkflowApprovalOffers(tx) {
		let results = [];

		let waitingOffers = await getOffersForWorkflow(tx, "Processing");
		let cancellingOffers = await getOffersForWorkflow(tx, "Cancelling");

		for (let i = 0; i < waitingOffers.length; i++) {
			let newEntry = await buildWorkflowApprovalOffersEntry(tx, waitingOffers[i], "Processing");
			if (newEntry.OFFERSTATUSPATH) results.push(newEntry);
		}

		for (let i = 0; i < cancellingOffers.length; i++) {
			let newEntry = await buildWorkflowApprovalOffersEntry(tx, cancellingOffers[i], "Cancelling");
			if (newEntry.OFFERSTATUSPATH) results.push(newEntry);
		}

		return results;
	}

	async function buildWorkflowApprovalProducts(tx) {
		let results = [];

		let waitingOffers = await getOffersForWorkflow(tx, "Processing");
		let cancellingOffers = await getOffersForWorkflow(tx, "Cancelling");

		for (let i = 0; i < waitingOffers.length; i++) {
			results = results.concat(await buildWorkflowApprovalProductsEntries(tx, waitingOffers[i], "Processing"));
		}

		for (let i = 0; i < cancellingOffers.length; i++) {
			results = results.concat(await buildWorkflowApprovalProductsEntries(tx, cancellingOffers[i], "Cancelling"));
		}

		return results;
	}

	async function buildWorkflowApprovalApprovers(tx) {
		let results = [];

		let waitingOffers = await getOffersForWorkflow(tx, "Processing");
		let cancellingOffers = await getOffersForWorkflow(tx, "Cancelling");

		for (let i = 0; i < waitingOffers.length; i++) {
			results = results.concat(await buildWorkflowApprovalApprovalsEntries(tx, waitingOffers[i], "Processing"));
		}

		for (let i = 0; i < cancellingOffers.length; i++) {
			results = results.concat(await buildWorkflowApprovalApprovalsEntries(tx, cancellingOffers[i], "Cancelling"));
		}

		return results;
	}
	async function getOfferData(tx,offerId){
		const QuotationDeleveryTH = await tx.run(SELECT.from(THQuotationDelevery).where({ "OfferID": offerId }));
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
		offerValidation.PeriodOfBankGauranteeStart = offerValidation.COUNTRYCODE === 'TH' ? offerValidation.PeriodOfBankGauranteeStart && ServiceHelper.formatDate(offerValidation.PeriodOfBankGauranteeStart, 'YYYY-MM-DD','DD-MMM-YYYY') : offerValidation.PeriodOfBankGauranteeStart;
		offerValidation.PeriodOfBankGauranteeEnd = offerValidation.COUNTRYCODE === 'TH' ? offerValidation.PeriodOfBankGauranteeEnd && ServiceHelper.formatDate(offerValidation.PeriodOfBankGauranteeEnd, 'YYYY-MM-DD','DD-MMM-YYYY') : offerValidation.PeriodOfBankGauranteeEnd;
		offerValidation.OFFERDATE = offerValidation.COUNTRYCODE === 'TH' ? offerValidation.OFFERDATE && ServiceHelper.formatDate(offerValidation.OFFERDATE, 'YYYY-MM-DD','DD-MMM-YYYY') : offerValidation.OFFERDATE;
		offerValidation.OFFERVALIDITY = offerValidation.COUNTRYCODE === 'TH' ? offerValidation.OFFERVALIDITY && ServiceHelper.formatDate(offerValidation.OFFERVALIDITY, 'YYYY-MM-DD','DD-MMM-YYYY') : offerValidation.OFFERVALIDITY;
		offerValidation.QuotationDate = offerValidation.COUNTRYCODE === 'TH' ? offerValidation.QuotationDate && ServiceHelper.formatDate(offerValidation.QuotationDate, 'YYYY-MM-DD','DD-MMM-YYYY') : offerValidation.QuotationDate;
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
			quotationDelevery: QuotationDeleveryTH
			// flatOfferProductValidation.reduce((group, product) => {
			// 	const { PriceConditionClassification } = product;
			// 	group[PriceConditionClassification.ConditionType.replace(/\s/g, '')] ??= {items:[]};
			// 	group[PriceConditionClassification.ConditionType.replace(/\s/g, '')].items.push(product);
			// 	return group;
			//   }, {})
		};
	}


	srv.before('CREATE', 'PT_TMTEND', async (req) => {
		try {
			// only runs for 'ES'
			if(req && req.data && ~req.data.CountryCode.toLowerCase().indexOf('es')){
				await addTenderExternalIDs(req.data);
			}
		} catch (error) {
			console.error('Error in PT_TMTEND CREATE');
			return req.reject(403, error?.message||"Error in PT_TMTEND CREATE");
		}
		
	});

	async function addTenderExternalIDs(tender){
		// Tender
		if(tender && tender.Classification && ~tender.Classification.toLowerCase().indexOf('tender')){
			tender.SAPID = "CO-".concat(tender && tender.TenderName && tender.TenderName.replace(/ /g,'-')); 
			tender.ExternalID = "TE-".concat(tender.TenderID);
		}
		// Commercial Agreement
		if(tender && tender.Classification && ~tender.Classification.toLowerCase().indexOf('commercial agreement')){
			tender.SAPID = "OF-".concat(tender.TenderID); 
		}
	};

	srv.on('getCurrentUser', (req) => {
		try{
		return {
			name: req.user.id,
			email: req.user.attr.email,
		};
		}
		catch(error){
			console.error('Error in getCurrentUser');
			return req.reject(403, error?.message||"Error in getCurrentUser");
		}
	})
	srv.on('READ', 'InstituteDistributor', async (req) => {
		try{
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
		}
		catch(error){
			console.error('Error in InstituteDistributor READ');
            return req.reject(403, error?.message||"Error in InstituteDistributor");
		}
	});
    //EHQUT-167489-Auto Approval in Thailand
    srv.on('READ', 'AccountPreApprovedPrices', async (req) => {
        try{
        const tx = cds.tx(req);
      var instituteIds = ServiceHelper.getWhereValue(req, "INSTITUTE_ID");
      var whereCountry = ServiceHelper.getWhereValue(req, "COUNTRY_CODE");
            
        const wherePrices = {
            INSTITUTE_ID: instituteIds,
            COUNTRY_CODE: whereCountry 
           
        };
        let results = await tx.run(SELECT.from(AccountPreApprovedPrices).where(wherePrices));
         
        
       
        return results;
		}
		catch(error){
			console.error('Error in AccountPreApprovedPrices READ');
            return req.reject(403, error?.message||"Error in AccountPreApprovedPrices");
		}
    });

	srv.on('READ', 'InstituteDistributorBrandProduct', async (req) => {
		try{
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
		}
		catch(error){
			console.error('Error in InstituteDistributorBrandProduct READ');
			return req.reject(403, error?.message||"Error in InstituteDistributorBrandProduct");
		}
	});

	srv.on('READ', 'OfferProductValidation', async (req) => {
		try{
		// const tx = cds.transaction(req)
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
			return req.reject(403, error?.message||"Error in OfferProductValidation");
		}

	});

	srv.on('READ', 'OfferValidation', async (req) => {
		try{
		// const tx = cds.transaction(req)
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
			return req.reject(403, error?.message||"Error in OfferValidation");
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
			return req.reject(403, error?.message||"Error in OfferProductOfferStatus");
		}
	});
	const getNextValue = async (table, fieldname) => {
		let results = await cds.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
		let nextValue = 1;
		if (results[0].max) {
			nextValue = results[0].max + 1
		}
		return nextValue
	}
	// srv.before('CREATE', 'PT_TMDLVTR', async (req) => {
	srv.on('CREATE', 'PT_TMDLVTR', async (req,next) => {
		try{
        // const tx = cds.transaction(req);
		const tx = cds.tx(req);
		req.data.SNo = await getNextValue(PT_TMDLVTR, "SNo");
        const delivery = await next();   
        await tx.commit();     
        return delivery; 
		}
		catch(error){
            console.error('Error in PT_TMDLVTR CREATE');
            return req.reject(403, error?.message||"Error in PT_TMDLVTR CREATE");
        }
	});
	srv.before('CREATE', 'PT_TMUDLTRS', async (req) => {
		try{
		req.data.SNO = await getNextValue(PT_TMUDLTRS, "SNO")
		return req;
		}
		catch(error){
			console.error('Error in PT_TMUDLTRS CREATE');
            return req.reject(403, error?.message||"Error in PT_TMUDLTRS CREATE");
		}
	});

	srv.on('READ', 'ApprovalOffers', async (req) => {
		try{
		// const tx = cds.transaction(req);
		//console.log("Inside Approval Offers");
		const tx = cds.tx(req);
		let results = await buildWorkflowApprovalOffers(tx);
		return results;
		}
		catch(error){
			console.error('Error in ApprovalOffers READ');
            return req.reject(403, error?.message||"Error in ApprovalOffers");
		}
	});

	srv.on('READ', 'ApprovalProducts', async (req) => {
		try{
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		let results = await buildWorkflowApprovalProducts(tx);
		return results;
		}
		catch(error){
			console.error('Error in ApprovalProducts READ');
            return req.reject(403, error?.message||"Error in ApprovalProducts");
		}
	});

	srv.on('READ', 'ApprovalApprovers', async (req) => {
		try{
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		let results = await buildWorkflowApprovalApprovers(tx);
		return results;
		}
		catch(error){
			console.error('Error in ApprovalApprovers READ');
            return req.reject(403, error?.message||"Error in ApprovalApprovers");
		}
	});
	//http://localhost:4004/v2/tender/Attachment('AE-16-100-1049-BPH-11')/content
	srv.on('READ', 'Attachment', async (req, next) => {
		try{
		//OfferID => get CountryCode => get Template by Country => get template
		//Offer Information => OfferId => ApprovalOrders + ApprovalProducts
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		var offerId = req.data.OfferId;
		if (!offerId) {
			return next();
		}

		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerValidation = await buildOfferValidation(tx, whereOffer);
		if (!offerValidation) {
			return req.reject(404, 'No offer found');
		}
		const templatesByCountry = await tx.run(SELECT.from(TemplateCountry).where({ CountryCode: offerValidation.COUNTRYCODE, Classification: offerValidation.CLASSIFICATION }));//Added Classification (db#2)
		if (templatesByCountry.length === 0) {
			return req.reject(404, 'No template found for offer: ' + offerId + ' and for country: ' + offerValidation.COUNTRYCODE);
		}
		const templates = await tx.run(SELECT.from(Template).where({ TemplateId: templatesByCountry[0].TemplateId }));
		if (templates.length === 0) {
			return req.reject(404, 'No template found for offer:' + offerId + ' and templateid:' + templatesByCountry[0].TemplateId);
		}
		const template = templates[0];


		var document = {
			type: "buffer",
			template: template.Template,
			context: {
				data: {
					offerValidation: offerValidation,
					offerProductValidation: await buildOfferProductValidation(tx, whereOffer)
					// institute:await tx.run(SELECT.from(Template).where({CountryCode:req.data.CountryCode}))
				},
				baseurl: req._.req.protocol + '://' + req._.req.get('host')
			}
		};
		const htmlTemplate = Handlebars.compile((template.Template || ""));
		const headerTemplate = Handlebars.compile((template.HeaderTemplate || ""));
		const footerTemplate = Handlebars.compile((template.FooterTemplate || ""));
		var options = {
			format: template.Format,
			orientation: template.Orientation,
			border: template.Border,
			header: {
				height: template.HeaderHeight,
				contents: headerTemplate(document.context)
			},
			footer: {
				height: template.FooterHeight,
				contents: footerTemplate(document.context)
			}
		};
		// /Pictures(da07ae51-d0d3-41e7-a737-2555a213e5a9)/content
		req._.res.setHeader('Content-disposition', 'attachment; filename=output.pdf');
		req._.res.setHeader('Content-type', 'application/pdf');
		return new Promise((resolve, reject) => {
			pdf.create(htmlTemplate(document.context), options).toBuffer(function (err, buffer) {
				const readableInstanceStream = new Readable({
					read() {
						this.push(buffer);
						this.push(null);
					}
				});
				resolve({
					value: readableInstanceStream
				});
			});
		});

		// return pdf.create(document, options)
		// 	.then(res => {
		// 		// console.log(fs.createReadStream("../output.pdf"))
		// 		const readableInstanceStream = new Readable({
		// 			read() {
		// 				this.push(res);
		// 				this.push(null);
		// 			}
		// 		});

		// 		return {
		// 			value: readableInstanceStream//Buffer.isBuffer(res)//fs.createReadStream(res.filename)
		// 		};
		// 	})
		// 	.catch(error => {
		// 		console.error(error)
		// 	});
		}
		catch(error){
			console.error('Error in Attachment READ');
            return req.reject(403, error?.message||"Error in Attachment");
		}
	});
	http://localhost:4004/v2/tender/ExcelAttachment('AE-16-100-1049-BPH-11')/content
	// srv.after('READ', 'ExcelAttachment', async function(data, req) {
	srv.on('READ', 'ExcelAttachment', async (req, next) => {
		try{
		// const data = await next(); 
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		const offerId = req.data.OfferId;
		// const template = req.data.template;
		if (!offerId){// || !template) {
			return next();
		}
		let excelData = {};
		try {
			excelData = await getOfferData(tx,offerId);
		} catch (error) {
			return req.reject(404, 'No offer found');
		}
		//generate XLSX
		let excelStreamValue = XLSXHelper.generateXLSX("TH - Quotation Template.xlsx",excelData);
		req._.res.setHeader('Content-disposition', 'attachment; filename=' + offerId + '.xlsx');
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		excelStreamValue.value.pipe(req._.res);
		return;
		}
		catch(error){
			console.error('Error in ExcelAttachment READ');
            return req.reject(403, error?.message||"Error in ExcelAttachment");
		}
	});
	//http://localhost:4004/v2/tender/WordAttachment('AE-16-100-1049-BPH-11')/content
	srv.on('READ', 'WordAttachments', async (req, next) => {
		try{
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

		const readableStreamValue = {
			value: readableInstanceStream
		};

		readableStreamValue.value.pipe(req._.res);
		return ;
		}
		catch(error){
			console.error('Error in WordAttachments READ');
			return req.reject(403, error?.message||"Error in WordAttachments");
		}
	});
	//http://localhost:4004/v2/tender/DeliveryExcel('AE-16-100-1049-BPH-11')/content
	srv.on('READ', 'DeliveryExcel', async (req, next) => {
		try{
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		var offerId = req.data.OfferId;
		if (!offerId) {
			return next();
		}

		//Get offer data
		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerValidation = await buildOfferValidation(tx, whereOffer);
		if (offerValidation) {
			var offerDeliveries = await tx.run(SELECT.from(PT_TMDLVTR).where(whereOffer));
			if (!offerDeliveries) {
				return req.reject(404, 'No deliveries found');
			}
		} else {
			return req.reject(404, 'No offer found');
		}

		//format prices
		for (let i = 0; i < offerDeliveries.length; i++){

		    let delivery = offerDeliveries[i];
			let whereProduct = ServiceHelper.buildFullWhere("PRODUCTPACKID", "=", delivery.ProductCode);
			let product = await tx.run(SELECT.from(PT_TMPRDPCK).where(whereProduct));

			delivery.InstituteID = delivery.InstituteID ? delivery.InstituteID.toString() : 'NA';
			delivery.SKUCode = delivery.SKUCode ? delivery.SKUCode.toString() : 'NA';
			delivery.RequestedQuantity = delivery.RequestedQuantity ? ServiceHelper.formatNumber(delivery.RequestedQuantity, 2, 2) : 0;
			delivery.ActualDeliveryQuantity = delivery.ActualDeliveryQuantity ? ServiceHelper.formatNumber(delivery.ActualDeliveryQuantity, 2, 2) : 0;
			delivery.PenaltyValue = delivery.PenaltyValue ? ServiceHelper.formatNumber(delivery.PenaltyValue, 2, 2) : 0;
			delivery.ProductCode = delivery.ProductCode ? delivery.InstituteID.toString() : 'NA';
			delivery.SNo = delivery.SNo ? delivery.SNo.toString() : 'NA';
			delivery.LocalOrDirectDelivery = delivery.LocalOrDirectDelivery === 'L' ? 'Local' : delivery.LocalOrDirectDelivery === 'D' ? 'Direct' : 'NA';
			delivery.PlannedInAPO = delivery.PlannedInAPO ? delivery.PlannedInAPO : 'NA';
			delivery.RequestedDeliveryDate = delivery.RequestedDeliveryDate ? delivery.RequestedDeliveryDate : '1970-01-01';
			delivery.ActualDeliveryDate = delivery.ActualDeliveryDate ? delivery.ActualDeliveryDate : '1970-01-01';
			delivery.PaidOrFree = delivery.PaidOrFree ? delivery.PaidOrFree : 'NA';
			delivery.Penalty = delivery.Penalty ? delivery.Penalty : 'NA';
			delivery.Compensated = delivery.Compensated ? delivery.Compensated : 'NA';
			delivery.ProductName = product[0].PRODUCTPACKNAME;

			offerDeliveries[i] = delivery;

		};

		const filedata = fs.readFileSync(path.join(__dirname, './xlsx-templates', "DeliveryTemplate.xlsx"));
		//generate XLSX
		let excelStreamValue = XLSXHelper.generateXLSXByFile(filedata,
			{
				offerValidation: offerValidation,
				deliveries: offerDeliveries
			},1);
		req._.res.setHeader('Content-disposition', 'attachment; filename=' + offerId + '.xlsx');
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		excelStreamValue.value.pipe(req._.res);
		return;
		}
		catch(error){
			console.error('Error in DeliveryExcel READ');
			return req.reject(403, error?.message||"Error in DeliveryExcel");
		}
	});
	//srv.on('sendMail', (req, sRecipient, sBody) => {
	srv.on('sendMail', async (req) => {
		try{
		let sSubject = req.data.sSubject;
		let sRecipient = 'joris.vd.bogaert@gmail.com';

		const mailer = new SapCfMailer.default("MAIL");
		const htmlMail = fs.readFileSync(path.join(__dirname, '.', 'mail', 'quotation_AR.html'), { encoding: 'utf-8' });

		let test = await mailer.sendMailTemplate({
			to: sRecipient,
			subject: sSubject,
			html: htmlMail
		});

		return true;
		}
		catch(error){
			console.error('Error in sendMail');
			return req.reject(403, error?.message||"Error in sendMail");
		}
	});

	srv.on('getMailTemplate', async (req) => {
		try{
		// const tx = cds.transaction(req);
		const tx = cds.tx(req);
		const sLanguage = req.data.language ? req.data.language : "ES";
		const sOfferId = req.data.offerId;
        const appEnv = cfenv.getAppEnv();
		const fastUIAppHost = appEnv.url.replace('fast-srv','fastui-app');

		//quotation data retrieval for filling template
		let whereOffer = ServiceHelper.buildFullWhere("OfferId", "=", sOfferId);
		let offerConsolidation = await tx.run(SELECT.from(OfferConsolidation).where(whereOffer));
		let offerProductConsolidation = await tx.run(SELECT.from(OfferProductConsolidation).where(whereOffer));
		let offerProductValidation = await buildOfferProductValidation(tx, whereOffer);
		if (offerConsolidation.length === 0) {
			return req.reject(404, 'No offer found');
		}

		const templates = await tx.run(SELECT.from(MailTemplate).where({ CountryCode: req.data.countryCode, Language: sLanguage }));
		if (templates.length === 0) {
			return req.reject(404, 'No mail template found for country:' + req.data.countryCode + ' and Language:' + req.data.language);
		}
		const htmlMail = fs.readFileSync(path.join(__dirname, '.', 'mail', templates[0].TemplateId + '.html'), { encoding: 'utf-8' });

		//execute required calculations for data to be displayed and add it to the product object
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
        
        offerConsolidation.URL = `${fastUIAppHost}/index.html#/tender&/t/detail/${offerConsolidation.COUNTRYCODE}/${offerConsolidation.TENDERID}/${offerConsolidation.OFFERID}/__component0---tenderManagementDetailId--basicInformationId//TwoColumnsMidExpanded`

		var document = {
			type: "buffer",
			template: htmlMail,
			context: {
				data: {
					offerConsolidation: offerConsolidation,
					offerProductConsolidation: offerProductConsolidation
				}
			}
		};
		const htmlTemplate = Handlebars.compile((htmlMail || ""));

		return htmlTemplate(document.context);
		}
		catch(error){
			console.error('Error in getMailTemplate');
			return req.reject(403, error?.message||"Error in getMailTemplate");
		}
	});

    srv.on('READ', 'PT_TMINST', async (req,next) => {
		try{
        delete req.query.SELECT.limit;
        const data = await next(); 
        return data;
		}
		catch(error){
			console.error('Error in PT_TMINST READ');
			return req.reject(403, error?.message||"Error in PT_TMINST READ");
		}
    });



	srv.on('notifyIbiz', async (req) => {
		try{
		const id_qp = req.data.ibizWorkflowID;
		const nu_direto_indireto = req.data.directIndirect; //  (0 = direct; 1 = indirect)
		const ccs_qps = req.data.lineNumbers; 

		if(typeof nu_direto_indireto != "number" || typeof id_qp != "number"|| (!ccs_qps && !Array.isArray(ccs_qps))) return req.reject(400, "Invalid request: missing/invalid parameters.");

		const body = {
			"nu_direto_indireto": nu_direto_indireto,
			"ccs_qps": ccs_qps
		};

		try {
            const result = await notifyIbiz(id_qp, body);
			await UPDATE(PT_TMOFRS).with({isIBIZNotified: true}).where({IbizWorkflowID: id_qp, ActiveOffer: 1});
			const msg = `Ibiz channel switch notification successful. WorkflowID: ${id_qp}`;
            console.log(msg);
            return msg;
        } catch (error) {
			if(error.response && error.response.data){
				console.error(error.response.data);
				return req.reject(error.response.status, JSON.stringify(error.response.data));
			}
			console.error(`ERROR: Ibiz channel switch notification failed. WorkflowID: ${id_qp}`);
			return req.reject(500, error.message);
        }
		}
		catch(error){
			console.error('Error in notifyIbiz');
			return req.reject(403, error?.message||"Error in notifyIbiz");
		}

	});


	async function notifyIbiz(id_qp, body) {

		if (!id_qp) {
            console.error("The Ibiz workflow ID is missing.");
            return false;
        }

        if (!body) {
            console.error("The body of the request is missing.");
            return false;
        }

        console.log(`Get api config ...`);
        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'IBIZ', CountryCode: "BR", Resource: "OfferProductChannel" }));
        
        console.log(`Get bearer token ...`);
		const oauthAuth = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
        const oauthCredentials = await getBearerToken(oauthAuth);

		const queryString = qs.stringify({
			'id_qp': id_qp
		});

		const url = `${apiConfig.Host}${apiConfig.BasePath}?${queryString}`;

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


	srv.on('sendApprovalToIbiz', async (req) => {
		try{
		const id_qp = req.data.ibizWorkflowID;
		const is_ok = req.data.offerStatus; //  (0 = not approved; 1 = approved)
		const nm_motivo = req.data.comment; 

		if(typeof is_ok != "number" || typeof id_qp != "number" || typeof nm_motivo != "string" ) return req.reject(400, "Invalid request: missing/invalid parameters.");

		const body = {
			"is_ok": is_ok,
			"nm_motivo": nm_motivo
		};

		try {
            const result = await sendOfferApproval(id_qp, body);
			const msg = `Ibiz Offer approval successful. WorkflowID: ${id_qp}`;
            console.log(msg);
            return msg;
        } catch (error) {
			if(error.response && error.response.data){
				console.error(error.response.data);
				return req.reject(error.response.status, JSON.stringify(error.response.data));
			}
			console.error(`ERROR: Ibiz Offer approval failed. WorkflowID: ${id_qp}`);
			return req.reject(500, error.message);
        }
		}
		catch(error){
			console.error('Error in sendApprovalToIbiz');
			return req.reject(403, error?.message||"Error in sendApprovalToIbiz");
		}

	});


	async function sendOfferApproval(id_qp, body) {

		if (!id_qp) {
            console.error("The Ibiz workflow ID is missing.");
            return false;
        }

        if (!body) {
            console.error("The body of the request is missing.");
            return false;
        }

        console.log(`Get api config ...`);
        const apiConfig = await cds.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'IBIZ', CountryCode: "BR", Resource: "OfferApproval" }));
        
        console.log(`Get bearer token ...`);
		const oauthAuth = await cds.run(SELECT.one.from(SchedulerApiConfigOAuth, apiConfig.OAuth_ID));
        const oauthCredentials = await getBearerToken(oauthAuth);

		const queryString = qs.stringify({
			'id_qp': id_qp
		});

		const url = `${apiConfig.Host}${apiConfig.BasePath}?${queryString}`;

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
                })
            });
        }

        throw Error("Missing OAUTH config parameters");
    };


	srv.on("simulateTaxes", async req => {
        const tx = cds.tx(req);
        try {
            
            const contract = await getContract(tx, req.data.offerID, req.data.lotID, req.data.productCode, req.data.conditionType);
            // Send request to SAP
            const result = await simulateTaxes(tx, contract);
            const TT_CONTRACT_DETAILS = result["data"]["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT.Response"]["TT_CONTRACT_DETAILS"];
            if (!TT_CONTRACT_DETAILS) {
                return req.reject(404, JSON.stringify(result.data));
            }

			// When taxes are 0% (default when no correct response from SAP), Net Price should be same as Commercial Proposal
			if(Number(result["data"]["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT.Response"]["TT_CONTRACT_DETAILS"]["item"]["NET_VALUE"]) <= 0){
				result["data"]["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT.Response"]["TT_CONTRACT_DETAILS"]["item"]["NET_VALUE"] = req.data.commercialProposal;
			}

            return req.reply(result.data);
        } catch (error) {
            if(error.response && error.response.data){
				console.error(error.response.data);
				return req.reject(error.response.status, JSON.stringify(error.response.data));
			}
            if(error.code && error.message){
				console.error(error.message);
				return req.reject(error.code, error.message);
			}
			return req.reject(500, error.message);
        }
    });

	srv.on('sendTHNotificationMailTemplate', async (req) => {
		try {
			const { data: {tenderId, offerID, CountryCode} } = req;
			const tx = cds.tx(req);
			const mailTemplate = await getMailTemplate('THNotificationMailTemplate');
			const checkOfferForBrand = await tx.run(SELECT.from(BrandsInTender).where({ OfferID: offerID }));
			const tender = await tx.run(SELECT.one.from(PT_TMTEND).where({ TenderID: tenderId }))
			let recipient;
			let brandNames = checkOfferForBrand.map(el => el.BRANDNAME.toLowerCase())
			if (brandNames.includes('xofigo')) {
				if (tender.Classification === "Tender") {
					recipient = "quotation.hec.th@ipservices.co.th"
				} else {
					recipient = "tender.hec.th@ipservices.co.th"
				}
			} else {
				recipient = "nutthawuth.nainanont@globalmedicalsolutions.com"
			}
			const THNotificationData = mappedTHNotificationData(mailTemplate, req, recipient);
			await INSERT.into(OutgoingMails).entries(THNotificationData);
			return "Notification mail sent successfully";
		}catch (error) {
				console.error('Error in sendTHNotificationMailTemplate');
				return req.reject(400, error.message || 'An unexpected error occurred.');
		}

	});
	function mappedTHNotificationData (mailTemplate, req, recipient){
		return {
			CountryCode: 'TH',
			TenderID: req.tenderId,
			OfferID: req.offerID,
			Sender: 'FAST-Admin@bayer.com',
			Recipients:  recipient,
			Subject: `New TH Tender Created for`,
			MailBody: generateMailBody(mailTemplate, {
				data: { 
					content:{
						UserName: 'Test',
						CountryName: 'Test',
						Offer: 'Test',
						DirectURLToOffer: 'Test',
						TenderCreator: 'Test',
					}
				}
			}),
			Sent: false,
		}
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
	const generateMailBody = function (mail, data) {
        return Handlebars.compile("" + mail.content)(data);
    }
	async function getContract(tx, offerID, lotID, productCode, conditionType){

		const offer = await tx.run(SELECT.one.from(PT_TMOFRS).where({ OfferID: offerID }));
		if (!offer) throw new Error(`Offer ${offerID} was not found in ${PT_TMOFRS.name}`);

		const division = await tx.run(SELECT.one.from(PT_TMPRDHIER).where({ HLEVEL1_NAME: offer.Division }));
		if (!division) throw new Error(`Division ${offer.Division} was not found in ${PT_TMPRDHIER.name}`);

		const offerProduct = await tx.run(SELECT.one.from(PT_TMOFPR).where({ OfferID: offerID,  ProductCode: productCode, LotID: lotID}));
		if (!offerProduct) throw new Error(`Product ${productCode} in Lot ${lotID} was not found in ${PT_TMOFPR.name}`);

		const skuPrdPck = await tx.run(SELECT.one.from(PT_TMSKUPRDPCK).where({CountryCode: "BR", ProductPackID: productCode, ActiveRecord: 'Yes'}));
		if (!skuPrdPck) throw new Error(`No SkuCode was found for product ${productCode} in ${PT_TMSKUPRDPCK.name}`);

		const priceConditionBrazilView = await tx.run(SELECT.one.from(PriceConditionBrazilView).where({ 
			OfferID: offerID, 
			TenderID: offer.TenderID, 
			ProductCode: productCode, 
			LotID: lotID, 
			ConditionType: conditionType 
		}));
		if (!priceConditionBrazilView) throw new Error(`No result found in ${PriceConditionBrazilView.name} for Offer: ${offerID}`);


        const body = getContractRequestBodyTemplate();

        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_DIVISION"] = division.HLEVEL1_CODE < 10 ? addLeadingZeros(division.HLEVEL1_CODE, 2) : division.HLEVEL1_CODE;
        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["IV_PARTNER"] = priceConditionBrazilView.CustomerID;

        const items = [{
			ITEM: addLeadingZeros(++offerProduct.SORTER, 6),
			MATERIAL: addLeadingZeros(skuPrdPck.SKUCode, 18),
			UNIT_PRICE: "0",
			EFFORT_A: "0",
			ITEM_QTD: "1",
			MANUAL_D: (100 * Number(priceConditionBrazilView?.AdditionalDiscount)).toFixed(2),
			CAP: priceConditionBrazilView?.CAP === "Yes" ? (priceConditionBrazilView?.CapValue * 100).toFixed(2) : 0
		}];

        body["_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT"]["TT_ITEMS"].item = items;
        return body;
    };


	function getContractRequestBodyTemplate() {
		const today = new Date();
		const todayPlusOneYear = addOneYear(today);
        return {
            "_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT": {
             "IV_DIVISION": "",
             "IV_DOC_TYPE": "ZWCT", // Fixed
             "IV_PARTNER": "",
             "IV_PO_DATE": formatDateYYYYMMDD(today), 
             "IV_PO_NUMBER": "XXX", // Fixed
             "IV_PR_DATE": formatDateYYYYMMDD(today),
             "IV_SALES_ORG": "MWHC", // Fixed
             "IV_SIMULATE": "X", //Fixed (X indicate that we are SIMULATING a contract and not creating one in SAP)
             "IV_VALID_F": formatDateYYYYMMDD(today),
             "IV_VALID_T": formatDateYYYYMMDD(todayPlusOneYear),
             "TT_ITEMS": {
                "item": [
                    {
						"ITEM": "",
						"MATERIAL": "",
						"UNIT_PRICE": "0", // Fixed
						"EFFORT_A": "0", // Fixed
						"ITEM_QTD": "1", // Fixed
						"MANUAL_D": "",
						"CAP": "0"
                    }
                ]
            }
            }
        }
    };

	async function simulateTaxes (tx, body) {
        if (!body) {
            throw new Error("ERR_MISSING_PARAMETER:body");
        }
        try {
            const apiConfig = await tx.run(SELECT.one.from(SchedulerApiConfig).where({ Provider: 'Contract', CountryCode: "BR", Resource: "Contract" })); 
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

	function addOneYear(date) {
		const dateCopy = new Date(date);
		dateCopy.setFullYear(dateCopy.getFullYear() + 1);
		return dateCopy;
	};

	function formatDateYYYYMMDD(date) {
		return date.toJSON().slice(0,10).replace(/-/g,'');
	}


	function addLeadingZeros (num, size) {
        if (num === null) {
            throw new Error(`${text} doesn't exist`);
        }
        num = num.toString();
        while (num.length < size) num = "0" + num;
        return num;
    };

	function calculateFOCVolume (product) {
		if(!product.FOC) return 0;

		switch(product.FOC_ABS_PCT){
			case "ABS":
				return focVolume = product.FOC;
			case "PCT":
				return focVolume = Math.round(product.REQUESTED_VOLUME * product.FOC);
			case "STP":
				return focVolume = Math.floor(product.REQUESTED_VOLUME / product.FOC_STEP) * product.FOC;
			default:
				break;
		}		
	}

}