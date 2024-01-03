const cds = require('@sap/cds');

module.exports = (srv) => {


	const {
		PT_TMDIST,
		PT_TMINST,
		PT_TMCTPRDPCK,
		PT_TMPRDPCK,
    PT_TMLE,
    PT_TMCTLE,
	PT_TMSKUPRDPCK
	} = cds.entities("com.bayer.SXTENDER.MasterData");




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




};