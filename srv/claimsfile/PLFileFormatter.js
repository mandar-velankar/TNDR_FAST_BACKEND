const cds = require('@sap/cds');
const BaseCountryFileFormatter = require('./BaseCountryFileFormatter');
const { v4: uuidv4 } = require('uuid');

module.exports = class PLFileFormatter extends BaseCountryFileFormatter {

    constructor(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        super(file, type, name, countryCode, distributorId, filePeriod, cwid);
    }

    async format() {

        console.log('Processing of Poland Sales Report File Started ...');

        try {
			this.db = await cds.connect.to('db');

			let UUID = this.generateUUID();
            // Get column names from the 5th row
			const columnNames = this.data[4].map(col => col.replace(/\s+/g, '').replace(/.*\//, '').replace(/[().]/g, ''));

			// Remove initial rows that are not real data
			this.data = this.data.slice(5);
	
			// Remove empty records
			this.data = this.data.filter(row => row.some(cell => cell !== null && cell !== ''));
	
			// Map the data to the correct column names
			this.data = this.data.map((row, rowIndex) => {
				let obj = {RowOrder: rowIndex + 1};
				columnNames.forEach((col, index) => {
					obj[col] = row[index];
				});
				return obj;
			});

			const { PT_TMDIST, PT_TMINST, PT_TMCTPRDPCK, PT_TMSKUPRDPCK, PT_TMINSHIER, PT_TMPRDPCK, PT_TMPRDHIER} = this.db.entities("com.bayer.SXTENDER.MasterData");
			const { ClaimData} = this.db.entities("com.bayer.SXTENDER.ClaimsData");
			const { ExtractFASTOffer } = this.db.entities("ClaimsService");

            const distributor = await SELECT.one.from(PT_TMDIST).where({DistributorID: this.distributorId, CountryCode: this.countryCode});
			const countryProductPacks = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: this.countryCode, ACTIVERECORD: 'Yes'});
			const productPacks = await SELECT.from(PT_TMPRDPCK).where({ACTIVERECORD: 'Yes'});
			const productPackSKUs = await SELECT.from(PT_TMSKUPRDPCK).where({CountryCode: this.countryCode, ActiveRecord: 'Yes'});
			const brands =  await SELECT.from(PT_TMPRDHIER);
			const institutes = await SELECT.from(PT_TMINST).where({CountryCode: this.countryCode, ActiveRecord: 'Yes'});
			const instituteHierarcis = await SELECT.from(PT_TMINSHIER).where({ActiveRecord: 'Yes'});
			const fastOfferData = await SELECT.from(ExtractFASTOffer).where({CountryCode: this.countryCode});
			const claimsData = await SELECT.from(ClaimData).where({CountryCode: this.countryCode});

            // Map sales data to buffer entity
			const contrastAgentSalesData = this.mapContrastAgentSalesData(this.data, UUID);

			// Map sales data to claim file
			const claimFile = this.mapSalesDataToClaimFiles(this.data, distributor, UUID, this.cwid);

			// Map sales data to claim data
			const claimData = this.mapSalesDataToClaimData(this.data, countryProductPacks, productPacks, productPackSKUs, brands, institutes, instituteHierarcis, fastOfferData, UUID, this.cwid, claimsData);

            const result = {contrastAgentSalesData, claimFile, claimData};

            return result;

        } catch (error) {
            console.error(error);
        }

        console.log('Processing of Poland Sales Report File finished.');
    }

    /**
	 * Map fields from salesData to ClaimFiles
	 * @param {[Objects]} salesData 
	 * @param {Object} req - Request object containing additional data
	 * @returns {Object} claimFile
	 */
	mapSalesDataToClaimFiles(salesData, distributor, UUID, CWID) {
		console.log(`JOB: Mapping Sales Data to Claim Files ...`);

		// Calculate metadata for ClaimFiles
		const { dateFrom, dateTo, filePeriodDate } = this.getDateFromAndTo(salesData, this.filePeriod);
		const wholesalerPurchaseAmount = salesData.reduce((sum, row) => sum + (row.CENAZAKUPUNETTO * row.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI), 0);
		const netSales = salesData.reduce((sum, row) => sum + (row.PODSTAWANALICZENIAMARŻYNETTOPNM * row.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI), 0);
		const totalClaimAmount = salesData.reduce((sum, row) => sum + row.Wartośćdowyrównania, 0);

		const claimFile = {
			ID						: UUID,
			createdBy           	: CWID,
			modifiedBy         		: CWID,
			CountryCode				: this.countryCode,
			ClaimFileFormat			: this.type,
			FileName				: this.name,
			DateFrom				: dateFrom,
			DateTo					: dateTo,
			FilePeriod				: filePeriodDate,
			DistributorID			: this.distributorId,
			DistributorName			: distributor.DistributorName,
			WholesalerPurchaseAmount: wholesalerPurchaseAmount,
			NetSales				: netSales,
			TotalClaimAmount		: totalClaimAmount,
			Status					: "Pending",
			ApprovalsCount			: 0
		};

	return claimFile;
	}

	/**
     * Map fields from salesData to ContrastAgentSalesData buffer entity 
     * @param {[Objects]} salesData 
     * @returns {[Objects]} mapped bufferdata
     */
	mapContrastAgentSalesData(salesData, UUID) {

		console.log(`JOB (${this.jobName }): Mapping SalesData to ContrastAgentSalesData ...`);
		salesData = salesData.reduce((prev, curr, idx, salesData) => {
			prev.push(
				{
					NazwaArtykulu                    : curr.NAZWAARTYKUŁU,
					KODEANArtykulu                   : String(curr.KODEANARTYKUŁU),
					IloscSztukSprzedanychKlientowi   : curr.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI,
					CenaZakupuNetto                  : curr.CENAZAKUPUNETTO,
					PodstawaNaliczeniaMarzyNettoPNM  : curr.PODSTAWANALICZENIAMARŻYNETTOPNM,
					KodKlientaBayer                  : curr.KODKLIENTAwgBAYERSpzoo,
					KlientNazwa                      : curr.KLIENTnazwa,
					NrFaktury                        : curr.NRFAKTURY,
					DataSprzedazy                    : this.excelDateToJSDate(curr.DATASPRZEDAŻY),
					RoznicaCenaZakupuPNM             : curr.RóżnicapomiędzycenązakupuaPNM,
					WartoscPNM                       : curr.WartośćwgPNM,
					WartoscDoWyrownania              : curr.Wartośćdowyrównania,
					IloscSztukDoWyrownania           : curr.Ilośćsztukdowyrównania,
					NrFakturyZakupu                  : curr.NRFAKTURYZAKUPU || null,
					ClaimFiles_ID					 : UUID
				}
			);
			return prev;
		}, []);
		return salesData;
	}

	/**
	 * Map fields from salesData to ClaimFiles
	 * @param {[Objects]} salesData 
	 * @param {Object} req - Request object containing additional data
	 * @returns {Object} claimData
	 */
	mapSalesDataToClaimData(salesData, countryProductPacks, productPacks, productPackSKUs, brands, institutes, instituteHierarcis, fastOfferData, UUID, CWID, claimsData) {

		console.log(`JOB (${this.jobName }): Mapping SalesData to Claims Data ...`);
		salesData = salesData.reduce((prev, curr, idx, salesData) => {
			const kodeAnArtykulu = typeof curr.KODEANARTYKUŁU === 'string' ? curr.KODEANARTYKUŁU.trim() : String(curr.KODEANARTYKUŁU);
			const productpack = countryProductPacks.find(item => item.GOV_CODE == kodeAnArtykulu);
			const productCode = productpack && productpack?.PRODUCTPACKID || null;
			const productPack = productPacks.find(i => i.PRODUCTPACKID == productCode);
			const productPackName = productPack && productPack?.PRODUCTPACKNAME || null;
			const hLEVEL6_CODE = productPack && productPack?.HLEVEL6_CODE || null;
			const brand =  brands.find(i => i.HLEVEL6_CODE == hLEVEL6_CODE);
			const brandName = brand && brand?.HLEVEL4_NAME || null;
			const brandId = brand && brand?.HLEVEL4_CODE || null;
			const productPackSKU = productPackSKUs.find(item => item.ProductPackID == productCode);
			const sKUCode = productPackSKU && productPackSKU?.SKUCode || null;
			const institute = institutes.find(item => item.External_InstituteId == curr.KODKLIENTAwgBAYERSpzoo);
			const instituteId = institute && institute.InstituteID || null;
			const instituteName = institute && institute?.InstituteName || null;
			const externalInstituteId = institute && institute.External_InstituteId || null;
			const childInstitute = instituteHierarcis.find(item => item.ParentInstituteID === instituteId);
			const childInstituteID = childInstitute && childInstitute.InstituteID || null;
			const childInstituteData = institutes.find(item => item.InstituteID === childInstituteID);
			const childInstituteName = childInstituteData && childInstituteData.InstituteName || null;
			const filteredItems = fastOfferData.filter(item => item.InstituteID == instituteId &&
																item.ProductCode === productCode &&
																item.ContractStartDate <= this.excelDateToJSDate(curr.DATASPRZEDAŻY) &&
																item.ContractEndDate >= this.excelDateToJSDate(curr.DATASPRZEDAŻY));
			const fastOffer = filteredItems.length > 0 ? filteredItems.reduce((lowest, item) => !lowest || item.OfferPrice < lowest.OfferPrice ? item : lowest, null) : null;
			const offerID = fastOffer && fastOffer.OfferID || null;
			const fastContractClaim = fastOffer && ((fastOffer.RegPrice - fastOffer.OfferPrice) * curr.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI) || 0;
			const percentageDifference = fastOffer ? (fastContractClaim && fastContractClaim !== 0 ? ((curr.Wartośćdowyrównania - fastContractClaim) / fastContractClaim) : 0) : 0;
			const filteredClaimsData = claimsData.filter(item => item.OfferID == offerID && item.MainInstituteID == instituteId && item.ProductPackID == productCode && item.BrandId == brandId);
			const brandContractVolume = fastOffer && (fastOffer.RequestedVolume * fastOffer.CONCENTRATION) || 0;
			const brandUsedVolume = fastOffer && (curr.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI * fastOffer.CONCENTRATION) || 0;
			const brandContractCalculatedVolume = filteredClaimsData.length > 0 ? filteredClaimsData.reduce((sum, row) => sum + row.BrandContractVolume, 0) : 0;
			const brandUsedCalculatedVolume = filteredClaimsData.length > 0 ? filteredClaimsData.reduce((sum, row) => sum + row.BrandUsedVolume, 0) : 0;
		
			prev.push(
				{
					CountryCode                             : this.countryCode,
					createdBy           					: CWID,
					modifiedBy         						: CWID,
					OfferID                                 : offerID, 
					ProductPackID                           : productCode,
					PRODUCTPACKNAME							: productPackName,
					MainInstituteID                         : instituteId,
					EANNumber                               : kodeAnArtykulu,
					External_InstituteId					: String(curr.KODKLIENTAwgBAYERSpzoo),
					ChildInstituteID                        : childInstituteID,
					MainInstituteName                       : instituteName,
					ChildInstituteName                      : childInstituteName,
					DistributorID                           : this.distributorId,
					Date                                    : this.excelDateToJSDate(curr.DATASPRZEDAŻY),
					Type                                    : 'Claim',
					Quantity                                : Number(curr.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI || 0),
					WholesalerPurchasePrice                 : Number(curr.CENAZAKUPUNETTO || 0), 
					WholesalerDistributionArrangement       : null,
					AppliedWholesalerCorrection             : null,
					WholesalerContractPrice                 : Number(curr.PODSTAWANALICZENIAMARŻYNETTOPNM || 0),
					TotalClaim                              : curr.Wartośćdowyrównania,
					MainCustomerForContract                 : instituteId,
					FASTPendingCorrection                   : null,
					BrandContractVolume                     : brandContractVolume,
					BrandContractCalculatedVolume			: Number(brandContractVolume + brandContractCalculatedVolume),
					PercentageUsage                         : null,
					UsedVolume								: null,
					BrandId									: brandId,
					BrandName								: brandName,
					Balance                                 : null,
					BrandUsedVolume                         : brandUsedVolume,
					BrandUsedCalculatedVolume				: Number(brandUsedVolume + brandUsedCalculatedVolume),
					WholesalerContractPriceClaim            : Number(curr.Wartośćdowyrównania || 0),
					WholesalerDistributionArrangementClaim  : null,
					TotalWholesalerClaim                    : Number(curr.Wartośćdowyrównania || 0),
					FASTContractClaim                       : Number(fastContractClaim || 0),
					FASTDistributionArrangementClaim        : 0,
					TotalFASTClaim                          : Number(fastContractClaim || 0),
					PercentageDifference                    : percentageDifference,
					Status                                  : fastOffer ? (fastContractClaim == curr.Wartośćdowyrównania ? 'Passed' : 'Failed') : 'NoContract',
					Comment                                 : null,
					FASTWholesalerPurchasePrice             : fastOffer && Number(fastOffer.RegPrice) || 0,
					FASTContractPrice                       : fastOffer && Number(fastOffer.OfferPrice) || 0,
					FASTDistributionArrangement             : null,
					FASTDistributionAgreementType			: null,
					QC1Passed                               : false,
					QC2Passed                               : false,
					WholesalerClaim1                        : null,
					WholesalerClaim2                        : null,
					FASTClaim1                              : null,
					FASTClaim2                              : null,
					NrFaktury                               : String(curr.NRFAKTURY || ''),
					RoznicaCenaZakupuPNM                    : Number(curr.RóżnicapomiędzycenązakupuaPNM || 0),
					WartoscPNM                              : Number(curr.WartośćwgPNM || 0),
					IloscSztukDoWyrownania                  : Number(curr.Ilośćsztukdowyrównania || 0),
					NrFakturyZakupu                         : String(curr.NRFAKTURYZAKUPU || ''),
					SKUCode									: sKUCode,
					RowOrder								: curr.RowOrder,
					ClaimFiles_ID					 		: UUID
				}
			);
			return prev;
		}, []);
		return salesData;
	}

	
	getDateFromAndTo(salesData, filePeriod) {
		// Assuming all dates are in the same month/year, we extract year and month from the first date
		let firstDate = new Date(this.excelDateToJSDate(salesData[0].DATASPRZEDAŻY));

		// Get the first day of the month
		let dateFrom = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
		
		// Get the last day of the month
		let dateTo = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0);
		
		// Format the dates to YYYY-MM-DD
		let formatDate = (date) => date.toISOString().split('T')[0];

		const polishToEnglishMonths = {
			'sty': 'Jan',
			'lut': 'Feb',
			'mar': 'Mar',
			'kwi': 'Apr',
			'maj': 'May',
			'cze': 'Jun',
			'lip': 'Jul',
			'sie': 'Aug',
			'wrz': 'Sep',
			'paź': 'Oct',
			'lis': 'Nov',
			'gru': 'Dec'
		};

		// Convert filePeriod to a date
		let [filePeriodMonth, filePeriodYear] = filePeriod.split('-');
		filePeriodMonth = polishToEnglishMonths[filePeriodMonth] || filePeriodMonth;
		const monthIndex = new Date(`${filePeriodMonth} 1, ${filePeriodYear}`).getMonth() + 1;
		const formattedMonth = String(monthIndex).padStart(2, '0');
		const filePeriodDate = `${filePeriodYear}-${formattedMonth}-01`;
	  
		return {
		  dateFrom: formatDate(dateFrom), // YYYY-MM-DD format
		  dateTo: formatDate(dateTo),
		  filePeriodDate
		};
	}

	generateUUID() {
		return uuidv4();
	}

	/**
	 * Helper function to convert Excel date serial number to JS date
	 */
	excelDateToJSDate(serial) {
		// Excel's epoch starts on December 30, 1899
		const excelEpoch = new Date(1899, 11, 30);
		const jsDate = new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms in a day
		return jsDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
	}

	bufferToArrayBuffer(buffer) {
		const arrayBuffer = new ArrayBuffer(buffer.length);
		const view = new Uint8Array(arrayBuffer);
		for (let i = 0; i < buffer.length; ++i) {
		  view[i] = buffer[i];
		}
		return arrayBuffer;
	}

};