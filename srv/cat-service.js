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

module.exports = (srv) => {

	// Use reflection to get the csn definition of Books
	const {
		CountryBrandProducts, LegalEntityBrand, DirectBrand, DistributorBrand
	} = cds.entities("com.bayer.SXTENDER.MasterDataViews");
	const {
		PT_TMINST, CountryApprovers, ApproverTypes, MASTER_COUNTRY_CHANNELS
	} = cds.entities("com.bayer.SXTENDER.MasterData");
	const {
		OfferConsolidation, OfferProductConsolidation, ApprovalRequests
	} = cds.entities("com.bayer.SXTENDER.TransactionalDataViews");
	const {
		PT_TMDLVTR, PT_TMUDLTRS, PT_TMAPPRST
	} = cds.entities("com.bayer.SXTENDER.TransactionalData");
	const {
		Template, TemplateCountry, MandatoryTableFieldsCountry
	} = cds.entities("com.bayer.SXTENDER.AdminData");
	const {
		ProductPolicies, PolicyPrices
	} =cds.entities("com.bayer.SXTENDER.PricingPolicyData");

	const {
		LatestApprovedBrandPolicies
	} =cds.entities("PolicyService");


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

	/**
	 * 
	 * @param {Number n}
	 * @return {String s}
	 */
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



	function buildDirectProducts(entityBrands, directBrands, countryProducts) {
		let results = [];
		entityBrands.forEach(entityBrand => {
			directBrand = directBrands.find(x => x.BRAND_ID === entityBrand.BRAND_ID);
			countryProduct = countryProducts.find(x => x.BRAND_ID === entityBrand.BRAND_ID);
			if (directBrand && countryProduct) {
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
					COUNTRY_OF_ORIGIN: countryProduct.COUNTRY_OF_ORIGIN
				});
			}
		});
		return results;
	}
	function buildDistributorProducts(entityBrands, distributorBrands, countryProducts, instituteIds) {
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
							PACKFACTOR: countryProduct.PACK_SIZE
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

		let grossMarginEurSpot = grossProfitEurSpot / netSalesEurSpot;
		let grossMarginEurBudget = grossProfitEurBudget / netSalesEurSpot;

		let isMinPrice = !ServiceHelper.isDoubleEqual(product.MIN_PRICE, 0) ? ServiceHelper.isDoubleXBelowY(netOfferPrice, product.MIN_PRICE) : 0;

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

	function buildProductValidationForType1(offer, product, productInfo) {//MEA (and default)
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval

		//Regulatory
		//Optional if business approved (country or regional)
		//Notification if NetOfferPrice = Registered Price (and registered price exists)
		let regulatory = 1;
		if (product.BUSINESS_APPROVED === 0 && product.REGISTERED_PRICE !== 0) {
			regulatory = ServiceHelper.isDoubleEqual(product.REGISTERED_PRICE, product.NET_OFFER_PRICE) ? 2 : 1;
		}

		//Legal
		//Optional if legal approved
		//Approval if private institute OR negative profitability
		//Notification for semi-gov institute
		let legal = 1;
		if (product.LEGAL_APPROVED !== 1) {
			if (offer.INSTITUTE_TYPE === "Private" || ServiceHelper.isDoubleXBelowY(productInfo.GrossProfitEurSpot, 0)) {
				legal = 3;
			}
			else if (offer.INSTITUTE_TYPE === "Semi-Governmental") {
				legal = 2;
			}
		}

		//Controlling
		//Notification if OfferPrice below lowest price
		let controlling = 1;
		if (!ServiceHelper.isDoubleEqual(product.MIN_PRICE, 0) && ServiceHelper.isDoubleXBelowY(product.OFFER_PRICE, product.MIN_PRICE)) {
			controlling = 2;
		}

		//Country Business
		//Optional if business approved
		//Mandatory otherwise
		//Note: we had logic only requiring approval if
		//below APPROVED_PRICE (when existed) or below REGISTERED_PRICE (when existed and no APPROVED_PRICE) or when no REGISTERED_PRICE
		//this was removed to allow applying e-signature in quotation document (compliance required business approval)
		let countryBusiness = (product.BUSINESS_APPROVED === 1) ? 1 : 3;

		//Regional Business
		//Optional if business approved
		//Mandatory if OfferPrice below lowest price
		//Mandatory if not default payment terms
		let regionalBusiness = 1;
		if (product.BUSINESS_APPROVED !== 1) {
			if (!ServiceHelper.isDoubleEqual(product.MIN_PRICE, 0) && ServiceHelper.isDoubleXBelowY(product.OFFER_PRICE, product.MIN_PRICE)) {
				regionalBusiness = 3;
			}
			else if (product.IS_DEFAULT_TERMS === 0) {
				regionalBusiness = 3;
			}
		}

		//Supply
		//Optional if supply approved
		//Mandatory otherwise
		let supply = (product.SUPPLY_APPROVED === 1) ? 1 : 3;

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
			//In Policy flag
			IN_POLICY: true
		};
		return results;
	}

	function buildProductValidationForType3(offer, product, productInfo) {//Mexico
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval

		//Country Business
		//Optional if business approved
		//Mandatory if volume above threshold
		let countryBusiness = (product.BUSINESS_APPROVED === 1 || product.REQUESTED_VOLUME < product.QTY_THRESHOLD) ? 1 : 3;

		//Supply
		//Optional if supply approved
		//Mandatory otherwise
		let supply = (product.SUPPLY_APPROVED === 1) ? 1 : 3;

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
			//In Policy flag
			IN_POLICY: true
		};
		return results;
	}

	function extractPolicyValue(productPolicyPrices, role, pricingPolicyName){
		let price = 0;
		productPolicyPrices.forEach(e => {
			if (e.PricingPolicyName === pricingPolicyName && e.Role === role){
				price = e.Price;
			};
		});
		return price;
	}

	

	async function buildProductValidationForType4(tx, offer, product, productInfo) {//Thailand
		//Legend
		//1: Optional
		//2: Mandatory Notification
		//3: Mandatory Approval

		//Supply chain approval is alway mandatory
		let supply = 3;

		//Check on offer unit (pack or unit) and get factor to apply on policy prices
		let uomFactor = 1;
		if (product.UNIT === 'Unit'){
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
		if (latestApprovedBrandPolicy.length === 0){//No pricing policy
			return {
				//Default values for other countries approver types
				REGULATORY: 1,
				LEGAL: 1,
				CONTROLLING: 1,
				COUNTRY_BUSINESS: 1,
				REGIONAL_BUSINESS: 1,
				//Thailand approver types
				NSM_SM_FM: 1,
				HBU: 1,
				CDH: 1,
				SUPPLY_CHAIN: supply,
				//In Policy flag
				IN_POLICY: false
			};
		}

		//Get latest approved product pricing policy for country and product
		let wherePolicy = {
			BrandPolicy_ID: latestApprovedBrandPolicy[0].ID,
			ProductPackId: product.PRODUCTID
		};

		let productPolicy = await tx.run(SELECT.from(ProductPolicies).where(wherePolicy));
		// if (productPolicy.length === 0){//No pricing policy
		// 	return {
		// 		//Default values for other countries approver types
		// 		REGULATORY: 1,
		// 		LEGAL: 1,
		// 		COUNTRY_BUSINESS: 1,
		// 		REGIONAL_BUSINESS: 1,
		// 		//Thailand approver types
		// 		NSM_SM_FM: 1,
		// 		HBU: 1,
		// 		CDH: 1,
		// 		SUPPLY_CHAIN: supply,
		// 		//In Policy flag
		// 		IN_POLICY: false
		// 	};
		// }
		//Get linked product policy prices (MSP and NSP) for Channel
		let wherePolicyPrices = {
			ProductPolicy_ID: productPolicy[0].ID,
			Channel_ID: channel[0].ID
		};
		let productPolicyPrices = await tx.run(SELECT.from(PolicyPrices).where(wherePolicyPrices));
		if (productPolicyPrices.length !== 6){//Incomplete pricing policy
			return {
				//Default values for other countries approver types
				REGULATORY: 1,
				LEGAL: 1,
				CONTROLLING: 1,
				COUNTRY_BUSINESS: 1,
				REGIONAL_BUSINESS: 1,
				//Thailand approver types
				NSM_SM_FM: 1,
				HBU: 1,
				CDH: 1,
				SUPPLY_CHAIN: supply,
				//In Policy flag
				IN_POLICY: false
			};
		}
		//Set variables for policy prices thresholds
		let nsmMSP = extractPolicyValue(productPolicyPrices, 'NSM/SM/FM', 'MSP') / uomFactor;
		let nsmNSP = extractPolicyValue(productPolicyPrices, 'NSM/SM/FM', 'NSP') / uomFactor;
		let hbuMSP = extractPolicyValue(productPolicyPrices, 'HBU', 'MSP') / uomFactor;
		let hbuNSP = extractPolicyValue(productPolicyPrices, 'HBU', 'NSP') / uomFactor;
		let cdhMSP = extractPolicyValue(productPolicyPrices, 'CDH', 'MSP') / uomFactor;
		let cdhNSP = extractPolicyValue(productPolicyPrices, 'CDH', 'NSP') / uomFactor;

		//Set initial approvals requirement to "Optional", i.e. 1
		let nsmLevel = 1;
		let hbuLevel = 1;
		let cdhLevel = 1;
		let inPolicy = true;//Boolean used to specify if product offer and net offer prices are within policy

		let preApprovedAccountOfferPrice = product.ACCOUNT_OFFER_PRICE;
		let preApprovedAccountNetOfferPrice = product.ACCOUNT_NET_OFFER_PRICE;

		let requiredApprovalLevel = 0;//0: No business approval required; 1:NSM/SM/FM; 2: HBU; 3: CDH; 4: Approval not allowed
		if (//This means it's first offer for account or offer price is new lowest for account
			ServiceHelper.isDoubleEqual(preApprovedAccountOfferPrice, 0) ||
			ServiceHelper.isDoubleXBelowY(product.OFFER_PRICE, preApprovedAccountOfferPrice)
			){
				if (ServiceHelper.isDoubleXBelowEqualY(nsmMSP, product.OFFER_PRICE)){//NSM/SM/FM can approve
					requiredApprovalLevel = Math.max(requiredApprovalLevel, 1);
				}
				else if (ServiceHelper.isDoubleXBelowEqualY(hbuMSP, product.OFFER_PRICE)){//HBU can approve
					requiredApprovalLevel = Math.max(requiredApprovalLevel, 2);
				}
				else if (ServiceHelper.isDoubleXBelowEqualY(cdhMSP, product.OFFER_PRICE)){//CDH can approve
					requiredApprovalLevel = Math.max(requiredApprovalLevel, 3);
				}
				else{
					requiredApprovalLevel = 4;
				};
		}
		if (//This means it's first offer for account or net offer price is new lowest for account
			ServiceHelper.isDoubleEqual(preApprovedAccountNetOfferPrice, 0) ||
			ServiceHelper.isDoubleXBelowY(product.NET_OFFER_PRICE, preApprovedAccountNetOfferPrice)
			){
				if (ServiceHelper.isDoubleXBelowEqualY(nsmNSP, product.NET_OFFER_PRICE)){//NSM/SM/FM can approve
					requiredApprovalLevel = Math.max(requiredApprovalLevel, 1);
				}
				else if (ServiceHelper.isDoubleXBelowEqualY(hbuNSP, product.NET_OFFER_PRICE)){//HBU can approve
					requiredApprovalLevel = Math.max(requiredApprovalLevel, 2);
				}
				else if (ServiceHelper.isDoubleXBelowEqualY(cdhNSP, product.NET_OFFER_PRICE)){//CDH can approve
					requiredApprovalLevel = Math.max(requiredApprovalLevel, 3);
				}
				else{
					requiredApprovalLevel = 4;
				};
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

		let results = {
			//Default values for other countries approver types
			REGULATORY: 1,
			LEGAL: 1,
			CONTROLLING: 1,
			COUNTRY_BUSINESS: 1,
			REGIONAL_BUSINESS: 1,
			//Thailand approver types
			NSM_SM_FM: nsmLevel,
			HBU: hbuLevel,
			CDH: cdhLevel,
			SUPPLY_CHAIN: supply,
			//In Policy flag
			IN_POLICY: inPolicy
		};
		return results;
	}

	async function buildProductInfoForCountry(tx, offer, product) {
		let commnonProductInfo = buildCommonProductInfo(offer, product);
		let productValidation = {};
		if (offer.APPROVAL_TYPE === 1 || offer.APPROVAL_TYPE === 2) {//Applicable for MEA
			productValidation = buildProductValidationForType1(offer, product, commnonProductInfo)
		}
		else if (offer.APPROVAL_TYPE === 3){//Applicable for Mexico - TODO
			productValidation = buildProductValidationForType3(offer, product, commnonProductInfo)
		}
		else if (offer.APPROVAL_TYPE === 4){//Applicable for Thailand
			productValidation = await buildProductValidationForType4(tx, offer, product, commnonProductInfo)
		}
		else {//Not implemented yet, there will be approval type values for each case where logic is different
			productValidation = buildProductValidationForType1(offer, product, commnonProductInfo)
		}
		return {
			CommnonProductInfo: commnonProductInfo,
			ProductValidation: productValidation
		};
	}
	async function buildOfferProductValidation(tx, whereOffer) {
		let results = [];
		whereOffer[0].ref[0] = 'OFFERID'
		let offer = await tx.run(SELECT.from(OfferConsolidation).where(whereOffer));
		if (offer.length !== 1) {
			return results;
		}
		offer = offer[0];
		let offerProduct = await tx.run(SELECT.from(OfferProductConsolidation).where(whereOffer));
		if (offerProduct.length === 0) {
			return results;
		}
		results = offerProduct.map(async function (d) {
			let productInfo = await buildProductInfoForCountry(tx, offer, d);

			//Get all prices, ammounts and cogs in all units
			let toUnitFactor = (d.UNIT === "Unit") ? 1 : d.PACKSIZE;
			let toPackFactor = (d.UNIT === "Unit") ? 1 / d.PACKSIZE : 1;

			return {
				TENDER_ID: offer.TENDERID,
				COUNTRY_CODE: offer.COUNTRYCODE,
				OFFER_ID: offer.OFFERID,
				DIVISION: d.DIVISION,
				BRANDID: d.BRANDID,
				BRANDNAME: d.BRANDNAME,
				PRODUCT_UNIT_NAME: d.PRODUCT_UNIT_NAME, //thailand
				SKU: d.SKU, //thailand
				PRODUCTID: d.PRODUCTID,
				CODE: d.CODE,
				PRODUCTNAME: d.PRODUCTNAME,
				PACKSIZE: d.PACKSIZE,
				DOSAGE: d.DOSAGE,
				UOM: d.UOM,
				COUNTRYOFORIGIN: d.COUNTRYOFORIGIN,
				MANUFACTURER: d.MANUFACTURER,
				SHELFLIFE: d.SHELFLIFE,
				PRESENTATION: d.PRESENTATION,
				VAT: d.VAT,
				PRODUCT_COMMENT: productInfo.CommnonProductInfo.ProductComment,
				UNIT: d.UNIT,
				PAID_VOLUME: productInfo.CommnonProductInfo.PaidVolume,
				SORTER: d.SORTER,
				CURRENCY: offer.CURRENCY,
				REQUESTED_QUANTITY: productInfo.CommnonProductInfo.RequestedQuantityString,
				DELIVERY_TERMS: productInfo.CommnonProductInfo.DeliveryTerms,
				PAYMENT_TERMS: d.PAYMENT_TERMS,
				SHIPMENT_TERMS: d.INCO_TERMS,
				SAMPLES: d.SAMPLES,
				SAMPLES_UNIT: d.SAMPLES * toUnitFactor,
				SAMPLES_PACK: d.SAMPLES * toPackFactor,
				REGISTERED_PRICE: d.REGISTERED_PRICE,
				OFFER_PRICE: d.OFFER_PRICE,
				FOC: productInfo.CommnonProductInfo.FocString,
				TOTAL_QUANTITY_UNITS: productInfo.CommnonProductInfo.TotalVolumeUnit, //Total Volume(units) (thailand - new column missing in the screenshot)
				FOC_QUANTITY_UNITS: productInfo.CommnonProductInfo.FocAmountUnit,
				PAID_QUANTITY_UNITS: productInfo.CommnonProductInfo.PaidVolumeUnit,
				REQ_PRICE_UNIT_OFFER_CURRENCY: productInfo.CommnonProductInfo.OfferPriceUnit,
				REQ_PRICE_UNIT_OFFER_CURRENCY_VAT: productInfo.CommnonProductInfo.OfferPriceUnit * (1 + d.VAT),   //MSP incl VAT (thailand)
				REQ_PRICE_PACK_OFFER_CURRENCY: productInfo.CommnonProductInfo.OfferPricePack,
				REQ_PRICE_UNIT_EUR_BUDGET: productInfo.CommnonProductInfo.OfferPriceUnitEurBudget,
				REQ_PRICE_UNIT_EUR_SPOT: productInfo.CommnonProductInfo.OfferPriceUnitEurSpot,
				NET_PRICE_UNIT_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetPriceUnit,
				NET_PRICE_UNIT_OFFER_CURRENCY_VAT: productInfo.CommnonProductInfo.NetPriceUnit * (1 + d.VAT),   //NSP incl VAT (thailand)
				NET_PRICE_PACK_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetPricePack,
				NET_PRICE_UNIT_EUR_BUDGET: productInfo.CommnonProductInfo.NetPriceUnitEurBudget,
				NET_PRICE_UNIT_EUR_SPOT: productInfo.CommnonProductInfo.NetPriceUnitEurSpot,
				NET_OFFER_PRICE: d.NET_OFFER_PRICE,
				NET_PRICE: d.NET_PRICE,
				COGS: d.COGS,//This is now in offer currency (used to be EUR)
				COGS_EUR_UNIT: productInfo.CommnonProductInfo.CogsEurUnit,
				COGS_EUR_PACK: productInfo.CommnonProductInfo.CogsEurPack,
				GROSS_SALES_OFFER_CURRENCY: productInfo.CommnonProductInfo.GrossSales,
				NET_SALES_OFFER_CURRENCY: productInfo.CommnonProductInfo.NetSales,
				NET_SALES_EUR_BUDGET: productInfo.CommnonProductInfo.NetSalesEurBudget,
				NET_SALES_EUR_SPOT: productInfo.CommnonProductInfo.NetSalesEurSpot,
				GROSS_MARGIN_EUR_BUDGET: productInfo.CommnonProductInfo.GrossMarginEurBudget,
				GROSS_MARGIN_EUR_SPOT: productInfo.CommnonProductInfo.GrossMarginEurSpot,
				GROSS_PROFIT_EUR_BUDGET: productInfo.CommnonProductInfo.GrossProfitEurBudget,
				GROSS_PROFIT_EUR_SPOT: productInfo.CommnonProductInfo.GrossProfitEurSpot,
				REGULATORY: productInfo.ProductValidation.REGULATORY,
				LEGAL: productInfo.ProductValidation.LEGAL,
				CONTROLLING: productInfo.ProductValidation.CONTROLLING,
				COUNTRY_BUSINESS: productInfo.ProductValidation.COUNTRY_BUSINESS,
				REGIONAL_BUSINESS: productInfo.ProductValidation.REGIONAL_BUSINESS,
				SUPPLY_CHAIN: productInfo.ProductValidation.SUPPLY_CHAIN,
				IS_LOWEST: (productInfo.CommnonProductInfo.IsMinPrice) ? 1 : 0,
				IS_DEFAULT_TERMS: d.IS_DEFAULT_TERMS,
				IS_REGISTERED: d.IS_REGISTERED,
				IS_ALTERNATIVE_QUOTED: d.IS_ALTERNATIVE_QUOTED,
				IS_ALTERNATIVE_REQUESTED: d.IS_ALTERNATIVE_REQUESTED,
				NEW_APPROVAL: d.NEW_APPROVAL,
				BUDGETED_PROFITABILITY: d.BUDGETED_PROFITABILITY,
				GROSS_SALES_OFFER_CURRENCY_VAT: productInfo.CommnonProductInfo.GrossSales * (1 + d.VAT),
				VAT_TOTAL: productInfo.CommnonProductInfo.GrossSales * d.VAT,
				NSM_SM_FM: productInfo.ProductValidation.NSM_SM_FM,
				HBU: productInfo.ProductValidation.HBU,
				CDH: productInfo.ProductValidation.CDH,
				IN_POLICY: productInfo.ProductValidation.IN_POLICY
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
		let offer = await tx.run(SELECT.from(OfferConsolidation).where(whereOffer));
		if (offer.length !== 1) {
			return results;
		}
		offer = offer[0];
		let offerProductValidation = await buildOfferProductValidation(tx, whereOffer);
		if (offerProductValidation.length === 0) {
			return results;
		}
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
		if (cdhLevel === 3){//If CDH approval is mandatory, lower levels do not need to approve
			nsmLevel = 1;
			hbuLevel = 1;
		}
		else if (hbuLevel === 3){//If HBU approval is mandatory, lower levels do not need to approve
			nsmLevel = 1;
		}
		let inPolicy = Math.min.apply(Math, offerProductValidation.map((d) => {return d.IN_POLICY ? 1 : 0})) === 1 ? true : false;


		let isLowest = Math.max.apply(Math, offerProductValidation.map((d) => { return d.IS_LOWEST }));
		let isDefaultTerms = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IS_DEFAULT_TERMS }));
		let isNewApproval = Math.max.apply(Math, offerProductValidation.map((d) => { return d.NEW_APPROVAL }));
		let isRegistered = Math.min.apply(Math, offerProductValidation.map((d) => { return d.IS_REGISTERED }));


		let totalAmount = offerProductValidation.reduce((a, b) => a + b.GROSS_SALES_OFFER_CURRENCY, 0);
		let totalAmountInWords = inWords(totalAmount, offer.CURRENCY);


		let totalAmountVat = offerProductValidation.reduce((a, b) => a + b.GROSS_SALES_OFFER_CURRENCY_VAT, 0);
		let totalAmountVatInWords = inWords(totalAmountVat, offer.CURRENCY);
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
		let samplesNotZero = offerProductValidation.filter((d) => d.SAMPLES !== 0);
		let samplesRemark = "";
		if (samplesNotZero.length === offerProductValidation.length) {
			samplesRemark = "Samples will be delivered for all products as per the tender terms and conditions.";
		}
		else if (samplesNotZero.length !== 0) {
			let samplesItems = samplesNotZero.map((d) => { return d.SORTER }).join(",");
			samplesRemark = "Samples will be delivered for the quoted products with S.N. {";
			samplesRemark = samplesRemark.concat(samplesItems).concat("} as per the tender terms and conditions.")
		}

		//Shipment Terms need to be specified by item number if not same for all
		let shipmentTerms = "";
		let shipmentTermsDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { return d.SHIPMENT_TERMS }));
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
		let paymentTermsDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { return d.PAYMENT_TERMS }));
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
		let deliveryTermsDistinct = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), offerProductValidation.map((d) => { return d.DELIVERY_TERMS }));
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

		//Product comment shows in remarks, if any
		let producRemark = offerProductValidation.filter((d) => d.PRODUCT_COMMENT !== "").map((d) => { return d.PRODUCT_COMMENT }).join("<br>");

		//Comment shows in remarks if any product is not registered in country
		let registeredRemark = "";
		if (isRegistered === 0) {
			registeredRemark = "Product(s) not registered in the country. Import Permit is to be arranged by ";
			registeredRemark = registeredRemark.concat(offer.DISTRIBUTORNAME)
		}

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

		//In case of distributor sales, we have a specific note to distributor
		let remarks = (offer.TENDER_CHANNEL === "Distributor")
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
		remarks = remarks.concat((producRemark !== "") ? producRemark.concat("<br>") : "");

		results = {
			OFFERSTATUSPATH: offer.OFFERSTATUSPATH,
			TENDERID: offer.TENDERID,
			CLASSIFICATION: offer.CLASSIFICATION,//Added Classification (db#1)
			TENDER_REFERENCE: offer.TENDER_REFERENCE,
			OFFERID: offer.OFFERID,
			INSTITUTENAME: offer.INSTITUTENAME,
			INSTITUTE_TYPE: offer.INSTITUTE_TYPE,
			CUSTOMER_CODE: offer.CUSTOMER_CODE,
			DIVISION: division,//not correct, should be consolidated from product information
			OFFERDATE: offer.OFFERDATE,
			OFFERVALIDITY: offer.OFFERVALIDITY,
			COUNTRYCODE: offer.COUNTRYCODE,
			SELLINGCOMPANY: offer.SELLINGCOMPANY,
			SELLINGCOMPANYBANK: offer && offer.SELLINGCOMPANYBANK ? offer.SELLINGCOMPANYBANK.replace(/\\+/g, "<br>") : '',
			SELLING_COMPANY_AS1: offer.SELLING_COMPANY_AS1,
			SELLING_COMPANY_AS2: offer.SELLING_COMPANY_AS2,
			CURRENCY: offer.CURRENCY,
			AMOUNT_IN_NUMBERS: totalAmount,
			AMOUNT_IN_WORDS: totalAmountInWords,//Not ok
			LETTERHEAD: offer && offer.LETTERHEAD ? offer.LETTERHEAD.replace(/\\+/g, "<br>") : '',
			REGULATORY: regulatory,
			LEGAL: legal,
			CONTROLLING: controlling,
			COUNTRY_BUSINESS: countryBusiness,
			REGIONAL_BUSINESS: regionalBusiness,
			SUPPLY_CHAIN: supply,
			DISTRIBUTORNAME: offer.DISTRIBUTORNAME,
			DISTRIBUTORADDRESS: offer && offer.DISTRIBUTORADDRESS ? offer.DISTRIBUTORADDRESS.replace(/\\+/g, "<br>") : '',
			DISTRIBUTORPHONE: offer.DISTRIBUTORPHONE,
			DISTRIBUTORFAX: offer.DISTRIBUTORFAX,
			DISTRIBUTORCONTACT: offer.DISTRIBUTORCONTACT,
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
			NSM_SM_FM: nsmLevel,
			HBU: hbuLevel,
			CDH: cdhLevel,
			IN_POLICY: inPolicy
		};
		return results;
	}
	function getApprovalContent(ApproverType) {
		switch (ApproverType) {
			case "Country Business":
			case "Regional Business":
			case "Manager Business Operations":
				return "Profitability";
			case "Regulatory":
			case "Legal":
			case "Supply Chain":
				return "Quotation";
			default:
				return "Quotation";
		}
	}
	function getRequiredAction(requiredActionCode) {
		switch (requiredActionCode) {
			case 1:
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
		if(aApproval.length > 0 && aApproval[0].Hierarchy !== null){
			aApproverType[0].Hierarchy = aApproval[0].Hierarchy;
		} 

		return {
			TenderID: offerValidation.TENDERID,
			OfferId: offerValidation.OFFERID,
			CountryCode: offerValidation.COUNTRYCODE,
			ApprovalContent: getApprovalContent(approverType),
			ApproverTypeSection: (requiredActionCode === 1) ? 2 : 1,
			REQUIRED_ACTION: getRequiredAction(requiredActionCode),
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
	async function buildOfferApproval(tx, whereOffer) {
		let results = [];

		let latestApproval = await tx.run(SELECT.from(ApprovalRequests).where(whereOffer));

		whereOffer[0].ref[0] = 'OFFERID'
		let offerValidation = await buildOfferValidation(tx, whereOffer);

		if (!offerValidation.COUNTRYCODE) return results;

		let whereCountry = whereOffer;
		whereCountry[0].ref[0] = 'CountryCode';
		whereCountry[2].val = offerValidation.COUNTRYCODE;

		let countryApprovers = await tx.run(SELECT.from(CountryApprovers).where(whereCountry));

		let whereApproverType = {
			CountryCode: offerValidation.COUNTRYCODE
		}
		let approverTypes = await tx.run(SELECT.from(ApproverTypes).where(whereApproverType));
		
		let whereOfferId = {
			OfferId: offerValidation.OFFERID
		} 
		//let approvals = await tx.run(SELECT.from(PT_TMAPPRST).where(whereOfferId))
		

		//Existing saved approval entries (may not exist)
		//Shared
		let approvalSupply = latestApproval.filter((d) => d.ApproverType === "Supply Chain");
		//MEA
		let approvalRegulatory = latestApproval.filter((d) => d.ApproverType === "Regulatory");
		let approvalLegal = latestApproval.filter((d) => d.ApproverType === "Legal");
		let approvalControlling = latestApproval.filter((d) => d.ApproverType === "Controlling");
		
		let approvalCountry = latestApproval.filter((d) => d.ApproverType === "Country Business" || d.ApproverType === "Manager Business Operations");
		let approvalCountry1 = approvalCountry;
		let approvalCountry2 = [];
		if (approvalCountry.length > 1) {
			approvalCountry1 = [approvalCountry[0]];
			approvalCountry2 = [approvalCountry[1]];
		}
		let approvalRegional = latestApproval.filter((d) => d.ApproverType === "Regional Business");
		let approvalRegional1 = approvalRegional;
		let approvalRegional2 = [];
		if (approvalRegional.length > 1) {
			approvalRegional1 = [approvalRegional[0]];
			approvalRegional2 = [approvalRegional[1]];
		}
		//Thailand
		let approvalNsm = latestApproval.filter((d) => d.ApproverType === "NSM/SM/FM");
		let approvalNsm1 = approvalNsm;
		let approvalNsm2 = [];
		if (approvalNsm.length > 1){
			approvalNsm1 = [approvalNsm[0]];
			approvalNsm2 = [approvalNsm[1]];
		}
		let approvalHbu = latestApproval.filter((d) => d.ApproverType === "HBU");
		let approvalHbu1 = approvalHbu;
		let approvalHbu2 = [];
		if (approvalHbu.length > 1){
			approvalHbu1 = [approvalHbu[0]];
			approvalHbu2 = [approvalHbu[1]];
		}
		let approvalCdh = latestApproval.filter((d) => d.ApproverType === "CDH");
		let approvalCdh1 = approvalCdh;
		let approvalCdh2 = [];
		if (approvalCdh.length > 1){
			approvalCdh1 = [approvalCdh[0]];
			approvalCdh2 = [approvalCdh[1]];
		}

		//Default (first found, if exists) approvers (will be used if none saved)
		//Shared
		let defaultSupply = countryApprovers.filter((d) => d.ApproverType === "Supply Chain");
		//MEA
		let defaultRegulatory = countryApprovers.filter((d) => d.ApproverType === "Regulatory");
		let defaultLegal = countryApprovers.filter((d) => d.ApproverType === "Legal");
		let defaultControlling = countryApprovers.filter((d) => d.ApproverType === "Controlling");
		let defaultCountryPharma = countryApprovers.filter((d) => (d.ApproverType === "Country Business" || d.ApproverType === "Manager Business Operations") && d.Division === "Pharma");
		let defaultCountryRadiology = countryApprovers.filter((d) => (d.ApproverType === "Country Business" || d.ApproverType === "Manager Business Operations") && d.Division === "Radiology");
		let defaultRegionalPharma = countryApprovers.filter((d) => d.ApproverType === "Regional Business" && d.Division === "Pharma");
		let defaultRegionalRadiology = countryApprovers.filter((d) => d.ApproverType === "Regional Business" && d.Division === "Radiology");
		//Thailand
		let defaultNsmPharma = countryApprovers.filter((d) => d.ApproverType === "NSM/SM/FM" && d.Division === "Pharma");
		let defaultNsmRadiology = countryApprovers.filter((d) => d.ApproverType === "NSM/SM/FM" && d.Division === "Radiology");
		let defaultHbuPharma = countryApprovers.filter((d) => d.ApproverType === "HBU" && d.Division === "Pharma");
		let defaultHbuRadiology = countryApprovers.filter((d) => d.ApproverType === "HBU" && d.Division === "Radiology");
		let defaultCdhPharma = countryApprovers.filter((d) => d.ApproverType === "CDH" && d.Division === "Pharma");
		let defaultCdhRadiology = countryApprovers.filter((d) => d.ApproverType === "CDH" && d.Division === "Radiology");

		//Regulatory
		let regulatory = buildValidationEntry(approverTypes, approvalRegulatory, defaultRegulatory, offerValidation, offerValidation.REGULATORY);
		if (regulatory) results.push(regulatory);
		//Legal
		let legal = buildValidationEntry(approverTypes, approvalLegal, defaultLegal, offerValidation, offerValidation.LEGAL);
		if (legal) results.push(legal);
		//Controlling
		let controlling = buildValidationEntry(approverTypes, approvalControlling, defaultControlling, offerValidation, offerValidation.CONTROLLING);
		if (controlling) results.push(controlling);
		//Country Business & Regional Business
		if (offerValidation.DIVISION === "Both") {
			let countryPharma = buildValidationEntry(approverTypes, approvalCountry1, defaultCountryPharma, offerValidation, offerValidation.COUNTRY_BUSINESS);
			if (countryPharma) results.push(countryPharma);

			let countryRadiology = buildValidationEntry(approverTypes, approvalCountry2, defaultCountryRadiology, offerValidation, offerValidation.COUNTRY_BUSINESS);
			if (countryRadiology) results.push(countryRadiology);

			let regionalPharma = buildValidationEntry(approverTypes, approvalRegional1, defaultRegionalPharma, offerValidation, offerValidation.REGIONAL_BUSINESS);
			if (regionalPharma) results.push(regionalPharma);

			let regionalRadiology = buildValidationEntry(approverTypes, approvalRegional2, defaultRegionalRadiology, offerValidation, offerValidation.REGIONAL_BUSINESS);
			if (regionalRadiology) results.push(regionalRadiology);

			let nsmPharma = buildValidationEntry(approverTypes, approvalNsm1, defaultNsmPharma, offerValidation, offerValidation.NSM_SM_FM);
			if (nsmPharma) results.push(nsmPharma);

			let nsmRadiology = buildValidationEntry(approverTypes, approvalNsm2, defaultNsmRadiology, offerValidation, offerValidation.NSM_SM_FM);
			if (nsmRadiology) results.push(nsmRadiology);

			let hbuPharma = buildValidationEntry(approverTypes, approvalHbu1, defaultHbuPharma, offerValidation, offerValidation.HBU);
			if (hbuPharma) results.push(hbuPharma);

			let hbuRadiology = buildValidationEntry(approverTypes, approvalHbu2, defaultHbuRadiology, offerValidation, offerValidation.HBU);
			if (hbuRadiology) results.push(hbuRadiology);

			let cdhPharma = buildValidationEntry(approverTypes, approvalCdh1, defaultCdhPharma, offerValidation, offerValidation.CDH);
			if (cdhPharma) results.push(cdhPharma);

			let cdhRadiology = buildValidationEntry(approverTypes, approvalCdh2, defaultCdhRadiology, offerValidation, offerValidation.CDH);
			if (cdhRadiology) results.push(cdhRadiology);

		}
		else if (offerValidation.DIVISION === "Pharma") {
			let countryPharma = buildValidationEntry(approverTypes, approvalCountry1, defaultCountryPharma, offerValidation, offerValidation.COUNTRY_BUSINESS);
			if (countryPharma) results.push(countryPharma);

			let regionalPharma = buildValidationEntry(approverTypes, approvalRegional1, defaultRegionalPharma, offerValidation, offerValidation.REGIONAL_BUSINESS);
			if (regionalPharma) results.push(regionalPharma);

			let nsmPharma = buildValidationEntry(approverTypes, approvalNsm1, defaultNsmPharma, offerValidation, offerValidation.NSM_SM_FM);
			if (nsmPharma) results.push(nsmPharma);

			let hbuPharma = buildValidationEntry(approverTypes, approvalHbu1, defaultHbuPharma, offerValidation, offerValidation.HBU);
			if (hbuPharma) results.push(hbuPharma);

			let cdhPharma = buildValidationEntry(approverTypes, approvalCdh1, defaultCdhPharma, offerValidation, offerValidation.CDH);
			if (cdhPharma) results.push(cdhPharma);
		}
		else if (offerValidation.DIVISION === "Radiology") {
			let countryRadiology = buildValidationEntry(approverTypes, approvalCountry1, defaultCountryRadiology, offerValidation, offerValidation.COUNTRY_BUSINESS);
			if (countryRadiology) results.push(countryRadiology);

			let regionalRadiology = buildValidationEntry(approverTypes, approvalRegional1, defaultRegionalRadiology, offerValidation, offerValidation.REGIONAL_BUSINESS);
			if (regionalRadiology) results.push(regionalRadiology);

			let nsmRadiology = buildValidationEntry(approverTypes, approvalNsm2, defaultNsmRadiology, offerValidation, offerValidation.NSM_SM_FM);
			if (nsmRadiology) results.push(nsmRadiology);

			let hbuRadiology = buildValidationEntry(approverTypes, approvalHbu2, defaultHbuRadiology, offerValidation, offerValidation.HBU);
			if (hbuRadiology) results.push(hbuRadiology);

			let cdhRadiology = buildValidationEntry(approverTypes, approvalCdh2, defaultCdhRadiology, offerValidation, offerValidation.CDH);
			if (cdhRadiology) results.push(cdhRadiology);
		}

		//Supply Chain
		let supply = buildValidationEntry(approverTypes, approvalSupply, defaultSupply, offerValidation, offerValidation.SUPPLY_CHAIN);
		if (supply) results.push(supply);

		return results;
	}

	/*function formatNumber(num, digits) {
		if (!num){
			num = 0;
		}
		num = num.toFixed(digits);
		return num.toLocaleString();
	  }*/


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
			CURRENCY: offerValidation.CURRENCY,
			AMOUNT_IN_NUMBERS: ServiceHelper.formatNumber(offerValidation.AMOUNT_IN_NUMBERS, 2),
			AMOUNT_IN_WORDS: offerValidation.AMOUNT_IN_WORDS,
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
			SHIPMENTTERMS: (!offerValidation.SHIPMENTTERMS) ? "" : offerValidation.SHIPMENTTERMS.replace(/<br>+/g, "</br>"),
			PAYMENTTERMS: (!offerValidation.PAYMENTTERMS) ? "" : offerValidation.PAYMENTTERMS.replace(/<br>+/g, "</br>"),
			DELIVERYTERMS: (!offerValidation.DELIVERYTERMS) ? "" : offerValidation.DELIVERYTERMS.replace(/<br>+/g, "</br>"),
			CUSTOM_REMARKS: (!offerValidation.CUSTOM_REMARKS) ? "" : offerValidation.CUSTOM_REMARKS,
			LETTERHEAD: (!offerValidation.LETTERHEAD) ? "" : offerValidation.LETTERHEAD.replace(/<br>+/g, "</br>"),
			CANCELLED: (approvalStatus === "Processing") ? "No" : "Yes"
		}
	}

	async function buildWorkflowApprovalProductsEntries(tx, offerId, approvalStatus) {
		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerProductValidation = await buildOfferProductValidation(tx, whereOffer);
		return offerProductValidation.map((d) => {
			return {
				TENDERID: d.TENDER_ID,
				OFFERID: d.OFFER_ID,
				COUNTRYCODE: d.COUNTRY_CODE,
				PRODUCTCODE: d.PRODUCTID.toString(),
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
				NETOFFERPRICE: ServiceHelper.formatNumber(d.NETOFFERPRICE, 2),
				REQUESTEDVOLUME: d.REQUESTED_QUANTITY.replace(/<br>+/g, "</br>"),
				PAIDVOLUME: Math.round(d.PAID_VOLUME),
				FOC: d.FOC,
				UNIT: d.UNIT,
				TOTAL_QUANTITY_UNITS: ServiceHelper.formatNumber(d.TOTAL_QUANTITY_UNITS,0),
				FOC_QUANTITY_UNITS: ServiceHelper.formatNumber(d.FOC_QUANTITY_UNITS,0),
				PAID_QUANTITY_UNITS: ServiceHelper.formatNumber(d.PAID_QUANTITY_UNITS,0),
				REQ_PRICE_UNIT_OFFER_CURRENCY: ServiceHelper.formatNumber(d.REQ_PRICE_UNIT_OFFER_CURRENCY, 4),
				REQ_PRICE_PACK_OFFER_CURRENCY: ServiceHelper.formatNumber(d.REQ_PRICE_PACK_OFFER_CURRENCY, 2),
				REQ_PRICE_UNIT_EUR_BUDGET: ServiceHelper.formatNumber(d.REQ_PRICE_UNIT_EUR_BUDGET, 4),
				REQ_PRICE_UNIT_EUR_SPOT: ServiceHelper.formatNumber(d.REQ_PRICE_UNIT_EUR_SPOT, 4),
				NET_PRICE_UNIT_OFFER_CURRENCY: ServiceHelper.formatNumber(d.NET_PRICE_UNIT_OFFER_CURRENCY, 4),
				NET_PRICE_PACK_OFFER_CURRENCY: ServiceHelper.formatNumber(d.NET_PRICE_PACK_OFFER_CURRENCY, 2),
				NET_PRICE_UNIT_EUR_BUDGET: ServiceHelper.formatNumber(d.NET_PRICE_UNIT_EUR_BUDGET, 4),
				NET_PRICE_UNIT_EUR_SPOT: ServiceHelper.formatNumber(d.NET_PRICE_UNIT_EUR_SPOT, 4),
				COGS_EUR_UNIT: ServiceHelper.formatNumber(d.COGS_EUR_UNIT, 2),
				GROSS_MARGIN_EUR_BUDGET: ServiceHelper.formatNumber(d.GROSS_MARGIN_EUR_BUDGET, 2),
				GROSS_MARGIN_EUR_SPOT: ServiceHelper.formatNumber(d.GROSS_MARGIN_EUR_SPOT, 2),
				GROSS_SALES_OFFER_CURRENCY: ServiceHelper.formatNumber(d.GROSS_SALES_OFFER_CURRENCY, 0),
				NET_SALES_OFFER_CURRENCY: ServiceHelper.formatNumber(d.NET_SALES_OFFER_CURRENCY, 0),
				NET_SALES_EUR_BUDGET: ServiceHelper.formatNumber(d.NET_SALES_EUR_BUDGET, 0),
				NET_SALES_EUR_SPOT: ServiceHelper.formatNumber(d.NET_SALES_EUR_SPOT, 0),
				GROSS_PROFIT_EUR_BUDGET: ServiceHelper.formatNumber(d.GROSS_PROFIT_EUR_BUDGET, 0),
				GROSS_PROFIT_EUR_SPOT: ServiceHelper.formatNumber(d.GROSS_PROFIT_EUR_SPOT, 0),
				DIVISION: d.DIVISION,
				BUDGETEDPROFITABILITY: (d.BUDGETED_PROFITABILITY === -1) ? "NA" : ServiceHelper.formatNumber(100 * d.BUDGETED_PROFITABILITY, 0).concat("%"),
				PROFITABILITYBUDGET: ServiceHelper.formatNumber(100 * d.GROSS_MARGIN_EUR_BUDGET, 0).concat("%"),
				PROFITABILITYSPOT: ServiceHelper.formatNumber(100 * d.GROSS_MARGIN_EUR_SPOT, 0).concat("%")
			}
		});
	}

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
					.concat(d.ApproverType).concat("')");
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

	srv.on('getCurrentUser', (req) => {
		return {
			name: req.user.id
		};
	})
	srv.on('READ', 'InstituteDistributor', async (req) => {
		const tx = cds.transaction(req)
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
		const tx = cds.transaction(req)
		let results = [];
		if (req.query.SELECT.where) {
			//Get non-filter information
			let channel = ServiceHelper.getWhereValue(req, "CHANNEL");
			// let instituteId = ServiceHelper.getWhereValue(req, "INSTITUTE_ID");
			let instituteIds = ServiceHelper.getWhereValues(req, "INSTITUTE_ID");
			//Get filters
			let whereCountry = ServiceHelper.buildWhere(req, "COUNTRY_CODE");
			//  let whereInstitute = ServiceHelper.buildWhere(req, "INSTITUTE_ID");
			let whereInstitute = ServiceHelper.buildWhereExpression("INSTITUTE_ID","or",instituteIds);
			let whereDistributor = ServiceHelper.buildWhere(req, "DISTRIBUTOR_ID");
			let whereProduct = ServiceHelper.buildWhere(req, "PRODUCT_ID");
			let whereBrand = ServiceHelper.buildWhere(req, "BRAND_ID");
			let whereLegalEntity = ServiceHelper.buildWhere(req, "LEGAL_ENTITY_CODE");
			let whereOrigin = ServiceHelper.buildWhere(req, "COUNTRY_OF_ORIGIN");
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
				countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereProduct).where(whereOrigin));
			}
			else if (whereOrigin.length !== 0) {
				countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereOrigin));
			}
			else if (whereProduct.length !== 0) {
				countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry).where(whereProduct));
			}
			else {
				countryProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry));
			}
			//Get products available to institute either Direct or through Distributor
			if (channel === "Direct") {
				let directBrands = await tx.run(SELECT.from(DirectBrand).where(whereCountry).where(whereInstitute).where(whereDistributor));
				results = buildDirectProducts(entityBrands, directBrands, countryProducts);
			}
			else if (channel === "Distributor") {
				let distributorBrands = await tx.run(SELECT.from(DistributorBrand).where(whereCountry).where(whereDistributor));
				results = buildDistributorProducts(entityBrands, distributorBrands, countryProducts, instituteIds);
			}
		}
		return results;
	});

	srv.on('READ', 'OfferProductValidation', async (req) => {
		const tx = cds.transaction(req)
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
			let whereOffer = ServiceHelper.buildWhere(req, "OFFER_ID");
			results = await buildOfferProductValidation(tx, whereOffer);
		}
		return results;
	});

	srv.on('READ', 'OfferValidation', async (req) => {
		const tx = cds.transaction(req)
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
			let whereOffer = ServiceHelper.buildWhere(req, "OFFERID");
			results = await buildOfferValidation(tx, whereOffer);
		}
		return results;
	});

	srv.on('READ', 'OfferProductOfferStatus', async (req) => {
		const tx = cds.transaction(req)
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
			let whereOffer = ServiceHelper.buildWhere(req, "OfferId");
			results = await buildOfferApproval(tx, whereOffer);
		}
		return results;
	});
	const getNextValue = async (table, fieldname) => {
		let results = await cds.run(SELECT.from(table, ['Max(' + fieldname + ') as max']));
		let nextValue = 1;
		if (results[0].max) {
			nextValue = results[0].max + 1
		}
		return nextValue
	}
	srv.before('CREATE', 'PT_TMDLVTR', async (req) => {
		req.data.SNo = await getNextValue(PT_TMDLVTR, "SNo")
		return req;
	});
	srv.before('CREATE', 'PT_TMUDLTRS', async (req) => {
		req.data.SNO = await getNextValue(PT_TMUDLTRS, "SNO")
		return req;
	});

	srv.on('READ', 'ApprovalOffers', async (req) => {
		const tx = cds.transaction(req);
		let results = await buildWorkflowApprovalOffers(tx);
		return results;
	});

	srv.on('READ', 'ApprovalProducts', async (req) => {
		const tx = cds.transaction(req);
		let results = await buildWorkflowApprovalProducts(tx);
		return results;
	});

	srv.on('READ', 'ApprovalApprovers', async (req) => {
		const tx = cds.transaction(req);
		let results = await buildWorkflowApprovalApprovers(tx);
		return results;
	});
//http://localhost:4004/v2/tender/Attachment('AE-16-100-1049-BPH-11')/content
	srv.on('READ', 'Attachment', async (req, next) => {
		//OfferID => get CountryCode => get Template by Country => get template
		//Offer Information => OfferId => ApprovalOrders + ApprovalProducts
		const tx = cds.transaction(req);
		var offerId = req.data.OfferId;
		if (!offerId) {
			return next();
		}

		let whereOffer = ServiceHelper.buildFullWhere("OFFERID", "=", offerId);
		let offerValidation = await buildOfferValidation(tx, whereOffer);
		if (!offerValidation) {
			return req.reject(404, 'No offer found');
		}
		const templatesByCountry = await tx.run(SELECT.from(TemplateCountry).where({ CountryCode: offerValidation.COUNTRYCODE , Classification: offerValidation.CLASSIFICATION}));//Added Classification (db#2)
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
		const htmlTemplate = Handlebars.compile((template.Template||""));
		const headerTemplate = Handlebars.compile((template.HeaderTemplate||""));
		const footerTemplate = Handlebars.compile((template.FooterTemplate||""));
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
		pdf.create(htmlTemplate(document.context),options).toBuffer(function(err,buffer){
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
	});

	//srv.on('sendMail', (req, sRecipient, sBody) => {
	srv.on('sendMail', async (req) => {
		let sSubject = req.data.sSubject;
		let sRecipient = 'joris.vd.bogaert@gmail.com';

		const mailer = new SapCfMailer.default("MAIL");
		const htmlMail = fs.readFileSync(path.join(__dirname, '.', 'mail', 'quotation_AR.html'), {encoding:'utf-8'});

		let test = await mailer.sendMailTemplate({
			to: sRecipient,
			subject: sSubject,
			html: htmlMail
		});

		return true;
	})
}