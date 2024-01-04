const cds = require('@sap/cds');
const XLSX = require("xlsx");

module.exports = (srv) => {


	const {
		PT_TMDIST,
		PT_TMINST,
		PT_TMCTPRDPCK,
		PT_TMPRDPCK,
    PT_TMLE,
    PT_TMCTLE,
	PT_TMSKUPRDPCK,
	PT_TMREGPR
	} = cds.entities("com.bayer.SXTENDER.MasterData");

	const {
		ExcelUpload
	} = cds.entities("com.bayer.SXTENDER.TransactionalData");




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
};