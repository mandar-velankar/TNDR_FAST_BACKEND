const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {
    // Use reflection to get the csn definition of Books
	const {
		CountryBrandProducts
    } = cds.entities("com.bayer.SXTENDER.MasterDataViews");
    const {
		InstituteGroup
    } = cds.entities("com.bayer.SXTENDER.PricingAppData");
    const {
		PT_TMINST
	} = cds.entities("com.bayer.SXTENDER.MasterData");
    const {
		ApprovalRequests, CountryApprovers, ApprovalStatus
	} = cds.entities("com.bayer.SXTENDER.PricingAppData");
    
    /*function getWhereId(req, fieldName){
		return req.query.SELECT.where.findIndex((filter) => filter && filter.ref && filter.ref.find((field) => field === fieldName));
	}*/

	/*function buildWhere(req, fieldName) {
		let result = [];
		idx = ServiceHelper.getWhereId(req, fieldName);
		if (idx !== -1){
			result.push(req.query.SELECT.where[idx]);
			result.push(req.query.SELECT.where[idx + 1]);
			result.push(req.query.SELECT.where[idx + 2]);
		}
		return result;
	}*/
	
    /*function isEquivalent(a, b) {
		// Create arrays of property names
		var aProps = Object.getOwnPropertyNames(a);
		var bProps = Object.getOwnPropertyNames(b);
	
		// If number of properties is different,
		// objects are not equivalent
		if (aProps.length != bProps.length) {
			return false;
		}
	
		for (var i = 0; i < aProps.length; i++) {
			var propName = aProps[i];
	
			// If values of same property are not equal,
			// objects are not equivalent
			if (a[propName] !== b[propName]) {
				return false;
			}
		}
	
		// If we made it this far, objects
		// are considered equivalent
		return true;
	}*/
    function tempGetFakePrice(){
        return {
            Currency:'BAT',
            RegisteredPrice:{
                Currency:'BAT',
                UoM:'Pack',
                Price:100
            },
            MaxMarketSalesPrice:{
                Currency:'BAT',
                UoM:'Pack',
                Price:90
            },
            MinMarketSalesPrice:{
                Currency:'BAT',
                UoM:'Pack',
                Price:90
            },
            FloorPrice:{
                Currency:'BAT',
                UoM:'Pack',
                Price:60
            },
            MaxWonOfferPrice:{
                Currency:'BAT',
                UoM:'Pack',
                Price:100
            },
            MinLostOfferPrice:{
                Currency:'BAT',
                UoM:'Pack',
                Price:100
            }
        };
    }

    async function buildDivisionsForCountry(tx, whereCountry){
        let results = [];
        //Get all products in country
        let countryBrandProducts = await tx.run(SELECT.from(CountryBrandProducts).where(whereCountry));
        //Get distinct divisions
        let divisions = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), countryBrandProducts.map((d) => {return d.DIVISION}));
        divisions.forEach((d) => {
            let divisionProducts = countryBrandProducts.filter((cbp) => cbp.DIVISION === d);
            let brands = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), divisionProducts.map((dp) => {return {
                BrandId:dp.BRAND_ID,
                Brand:dp.BRAND_NAME
            }}));
            let brandsForDivision = [];
            brands.forEach((b) => {
                let products = countryBrandProducts.filter((cbp) => cbp.BRAND_ID === b.BrandId).map((cbp) => {
                    return {
                        BrandId:b.BrandId,
                        ProductId:cbp.PRODUCT_ID,
                        Product:cbp.PRODUCT_NAME,
                        PackFactor:cbp.PACK_SIZE,
                        Prices:tempGetFakePrice()
                    };
                });
                brandsForDivision.push({    
                    Division:d,
                    BrandId:b.BrandId,
                    Brand:b.Brand,
                    Products:products
                });
            })
            results.push({
                CountryCode:whereCountry[2].val,
                Division:d,
                Brands:brandsForDivision
            });
        });
        return results;
    }

    /**
     * This method return a list of approver names per approver type and country.
     * The first listed approver for each type in country is set as default. 
     * Other approvers that may exist for same type in country will be listed, along with default.
     * 
     * @param {*} tx 
     * @param {*} whereCountryCode 
     * @param {*} whereInstituteGroupId 
     * @param {*} whereProductPackId 
     * @param {*} whereDivision 
     */
    async function buildPricingApproval(tx, whereCountryCode, whereInstituteGroupId, whereProductPackId, whereDivision){
		let results = [];
		
		let latestApproval = await tx.run(SELECT.from(ApprovalRequests).where(whereCountryCode).where(whereInstituteGroupId).where(whereProductPackId).where(whereDivision));
        let countryApprovers = await tx.run(SELECT.from(CountryApprovers).where(whereCountryCode).where(whereDivision));
		
		let priceApprovalValidation = buildPriceApprovalValidation();

		let countryCode = whereCountryCode[2].val;
		let instituteGroupId = whereInstituteGroupId[2].val;
		let productPackId = whereProductPackId[2].val;
		let division = whereDivision[2].val;
	
		//Existing saved approval entries (may not exist)
		let approvalRegulatory = latestApproval.filter((d) => d.ApproverType === "Regulatory");
		let approvalLegal = latestApproval.filter((d) => d.ApproverType === "Legal");
		let approvalSupply = latestApproval.filter((d) => d.ApproverType === "Supply Chain");
		let approvalCountryPharma = latestApproval.filter((d) => (d.ApproverType === "Country Business" || d.ApproverType === "Manager Business Operations") && (d.Division === "Pharma" || d.Division === "Consumer Health"));
		let approvalCountryRadiology = latestApproval.filter((d) => (d.ApproverType === "Country Business" || d.ApproverType === "Manager Business Operations") && d.Division === "Radiology");
		let approvalRegionalPharma = latestApproval.filter((d) => d.ApproverType === "RegionalBusiness" && (d.Division === "Pharma" || d.Division === "Consumer Health"));
		let approvalRegionalRadiology = latestApproval.filter((d) => d.ApproverType === "RegionalBusiness" && d.Division === "Radiology");

		//Default (first found, if exists) approvers (will be used if none saved)
		let defaultRegulatory = countryApprovers.filter((d) => d.ApproverType === "Regulatory");
		let defaultLegal = countryApprovers.filter((d) => d.ApproverType === "Legal");
		let defaultSupply = countryApprovers.filter((d) => d.ApproverType === "Supply Chain");
		let defaultCountryPharma = countryApprovers.filter((d) => (d.ApproverType === "Country Business" || d.ApproverType === "Manager Business Operations") && (d.Division === "Pharma" || d.Division === "Consumer Health"));
		let defaultCountryRadiology = countryApprovers.filter((d) => (d.ApproverType === "Country Business" || d.ApproverType === "Manager Business Operations") && d.Division === "Radiology");
		let defaultRegionalPharma = countryApprovers.filter((d) => d.ApproverType === "RegionalBusiness" && (d.Division === "Pharma" || d.Division === "Consumer Health"));
		let defaultRegionalRadiology = countryApprovers.filter((d) => d.ApproverType === "RegionalBusiness" && d.Division === "Radiology");
		
        //Regulatory
        // requiredActionCode = (1 = optional notification, 2 = mandatory notification, 3 = mandatory approval)
		let regulatory = buildValidationEntry(approvalRegulatory, defaultRegulatory, countryCode, instituteGroupId, productPackId, priceApprovalValidation.REGULATORY); 
		if (regulatory) results.push(regulatory);
		//Legal
		let legal = buildValidationEntry(approvalLegal, defaultLegal, countryCode, instituteGroupId, productPackId, priceApprovalValidation.LEGAL);
		if (legal) results.push(legal);
		//Country Business & Regional Business
		if (division === "Both"){
			let countryPharma = buildValidationEntry(approvalCountryPharma, defaultCountryPharma, countryCode, instituteGroupId, productPackId, priceApprovalValidation.COUNTRY_BUSINESS);
			if (countryPharma) results.push(countryPharma);

			let countryRadiology = buildValidationEntry(approvalCountryRadiology, defaultCountryRadiology, countryCode, instituteGroupId, productPackId, priceApprovalValidation.COUNTRY_BUSINESS);
			if (countryRadiology) results.push(countryRadiology);

			let regionalPharma = buildValidationEntry(approvalRegionalPharma, defaultRegionalPharma, countryCode, instituteGroupId, productPackId, priceApprovalValidation.REGIONAL_BUSINESS);
			if (regionalPharma) results.push(regionalPharma);

			let regionalRadiology = buildValidationEntry(approvalRegionalRadiology, defaultRegionalRadiology, countryCode, instituteGroupId, productPackId, priceApprovalValidation.REGIONAL_BUSINESS);
			if (regionalRadiology) results.push(regionalRadiology);
		}
		else if (division === "Pharma" || division === "Consumer Health"){
			let countryPharma = buildValidationEntry(approvalCountryPharma, defaultCountryPharma, countryCode, instituteGroupId, productPackId, priceApprovalValidation.COUNTRY_BUSINESS);
			if (countryPharma) results.push(countryPharma);
			
			let regionalPharma = buildValidationEntry(approvalRegionalPharma, defaultRegionalPharma, countryCode, instituteGroupId, productPackId, priceApprovalValidation.REGIONAL_BUSINESS);
			if (regionalPharma) results.push(regionalPharma);
		}
		else if (division === "Radiology"){
			let countryRadiology = buildValidationEntry(approvalCountryRadiology, defaultCountryRadiology, countryCode, instituteGroupId, productPackId, priceApprovalValidation.COUNTRY_BUSINESS);
			if (countryRadiology) results.push(countryRadiology);

			let regionalRadiology = buildValidationEntry(approvalRegionalRadiology, defaultRegionalRadiology, countryCode, instituteGroupId, productPackId, priceApprovalValidation.REGIONAL_BUSINESS);
			if (regionalRadiology) results.push(regionalRadiology);
		}

		//Supply Chain
		let supply = buildValidationEntry(approvalSupply, defaultSupply, countryCode, instituteGroupId, productPackId, priceApprovalValidation.SUPPLY_CHAIN);
		if (supply) results.push(supply);

		return results;
    }
    
    function buildValidationEntry(approvalForType, defaultForType, CountryCode, InstituteGroupId, ProductPackId, requiredActionCode){
        let approverName = '';
		let approverEmailId = '';
		let senderComment = '';
		let approverComment = '';
		let statusTime = null;
		let sentBy = null;
		let approvalDate = null;
		let flowId = null;
		let approverType = '';
        let division = '';
        let productPackId = ProductPackId;
        let instituteGroupId = InstituteGroupId;
        let countryCode = CountryCode;
        
		if (approvalForType.length !== 0){
			approverName = approvalForType[0].ApproverName; // don't have approver name in this entity
			approverEmailId = approvalForType[0].ApproverEmailId;
			senderComment = approvalForType[0].SenderComment;
			approverComment = approvalForType[0].ApproverComment;
			statusTime = approvalForType[0].StatusTime;
			sentBy = approvalForType[0].SentBy;
			approvalDate = approvalForType[0].ApprovalDate;
			flowId = approvalForType[0].FlowId;
			approverType = approvalForType[0].ApproverType;
        	division = approvalForType[0].Division;
		}
		else if (defaultForType.length !== 0){
			approverName = defaultForType[0].ApproverName;
			approverEmailId = defaultForType[0].ApproverEmailId;
			approverType = defaultForType[0].ApproverType;
			division = defaultForType[0].Division;
			statusTime = new Date().toJSON();
		}
		else{
			return null;
        }
        
		

		return {
			CountryCode: countryCode, 
            InstituteGroupId: instituteGroupId,
			ProductPackId:productPackId,
			ApproverEmailId:approverEmailId,
            ApproverType:approverType,
            StatusTime:statusTime,
            Division:division,
            ApproverTypeSection:(requiredActionCode === 1) ? 2 : 1, // requiredActionCode( 1 = optional notification, 2 = mandatory notificaiton, 3 = mandatory approval) | ApproverTypeSection(1 = mandatory, 2 = optional)
            ApprovalStatus:(approvalForType.length === 0) ? "Not Sent" : approvalForType[0].ApprovalStatus,
            SenderComment:senderComment,
            ApproverComment:approverComment,
            SentBy:sentBy,
            ApprovalDate:approvalDate,
            FlowId:flowId,
            RequiredAction:getRequiredAction(requiredActionCode),
			CountryApprover:defaultForType
		};
    }

    function buildPriceApprovalValidation(){
		return {
			REGULATORY:1,
			LEGAL:1,
			COUNTRY_BUSINESS:1,
			REGIONAL_BUSINESS:1,
			SUPPLY_CHAIN:1
		};
	}
    
    function getRequiredAction(requiredActionCode){
		switch (requiredActionCode){
			case 1:
			case 2:
				return "Notification"
			default:
				return "Approval"
		}
	}

    srv.on('READ', 'DivisionsForCountry', async (req) => {
		// const tx = cds.transaction(req)
		const tx = cds.tx();
		let results = [];
		if (req.query.SELECT.where) {
            let whereCountry = ServiceHelper.buildWhere(req, "CountryCode");
            whereCountry[0].ref[0] = 'COUNTRY_CODE';
            results = buildDivisionsForCountry(tx, whereCountry);
		}
		return results;
    });

    srv.on('READ', 'ChannelsForCountry', async (req) => {
		// const tx = cds.transaction(req)
		const tx = cds.tx();
		let results = [];
		if (req.query.SELECT.where) {
            let whereCountry = ServiceHelper.buildWhere(req, "CountryCode");
            let countryInstituteGroups = await tx.run(SELECT.from(InstituteGroup).where(whereCountry));
            //Get distinct channels
            let channels = R.uniqWith((a, b) => ServiceHelper.isEquivalent(a, b), countryInstituteGroups.map((d) => {return d.Channel}));
            channels.forEach((d) => {
                let channelInstituteGroups = countryInstituteGroups.filter((cig) => cig.Channel === d);
                results.push({
                    CountryCode:whereCountry[2].val,
                    Channel:d,
                    InstituteGroups:channelInstituteGroups
                });
            });
		}
		return results;
    });

    srv.on('READ', 'LatestApprovals', async (req) => {
		// const tx = cds.transaction(req)
		const tx = cds.tx();
		let results = [];
		if (req.query.SELECT.where) {
			//Get filters
            let whereCountryCode = ServiceHelper.buildWhere(req, "CountryCode");
            let whereInstituteGroupId = ServiceHelper.buildWhere(req, "InstituteGroupId");
			let whereProductPackId = ServiceHelper.buildWhere(req, "ProductPackId");
			let whereDivision = ServiceHelper.buildWhere(req, "Division");
			
			results = await buildPricingApproval(tx, whereCountryCode, whereInstituteGroupId, whereProductPackId, whereDivision);
		}
		return results;
	});

	// TODO: insert is working, but gives an error message 
	// error: the key 'CountryCode' does not exist in the given entity
	srv.on('CREATE', 'LatestApprovals', async (req) => {
		// const tx = cds.transaction(req);
		const tx = cds.tx();
		const approvalRequests = req.query.INSERT.entries;
		try{
			const affectedRows = await tx.run( INSERT.into(ApprovalStatus).entries(approvalRequests) );
			await tx.commit();
			req.reply(req.data);
		}catch(err){
			if(err.code == '301') req.error(409, "Unique constraint violated. Duplicate value in a restricted field.");
			await tx.rollback(err);
		}

		// .then(rec => {
		// 	req.reply(req.data);
		// })
		// .catch(err =>{
		// 	if(err.code == '301')
		// 		req.error(409, "Unique constraint violated. Duplicate value in a restricted field.");
		// });
		
		
	});

}