const cds = require('@sap/cds');
const BaseCountryFileFormatter = require('./BaseCountryFileFormatter');
const { v4: uuidv4 } = require('uuid');

module.exports = class NLFileFormatter extends BaseCountryFileFormatter {

    constructor(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        super(file, type, name, countryCode, distributorId, filePeriod, cwid);
    }

    async format() {

        console.log('Processing of Nederlands Sales Report File started ...');

       // try {
			this.db = await cds.connect.to('db');
			const { PT_TMDIST, PT_TMINST, PT_TMCTPRDPCK, PT_TMSKUPRDPCK, PT_TMINSHIER, PT_TMPRDPCK, PT_TMPRDHIER, WholesalePurchasePrice, DistributionAgreements} = this.db.entities("com.bayer.SXTENDER.MasterData");
			const { ClaimData, SalesReportFileFieldMetaData} = this.db.entities("com.bayer.SXTENDER.ClaimsData");
			const { ExtractFASTOfferNL } = this.db.entities("ClaimsService");

			let UUID = this.generateUUID(); 
			const distributor = await SELECT.one.from(PT_TMDIST).where({DistributorID: this.distributorId, CountryCode: this.countryCode});
			const fieldMetadata = await SELECT.from(SalesReportFileFieldMetaData).where({Wholesaler: distributor?.DistributorName});

			// Get the mapping for the distributor
			const currentMappings = this.columnMappings(distributor);

			this.data = this.formatData(this.data, currentMappings, distributor?.DistributorName, fieldMetadata);
           
			const wPPS = await SELECT.from(WholesalePurchasePrice).where({COUNTRYCODE: this.countryCode, DistributorID:this.distributorId, Status: 'Approved'});
			const distributionAgreements = await SELECT.from(DistributionAgreements).where({COUNTRYCODE: this.countryCode, DistributorID:this.distributorId});
			const countryProductPacks = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: this.countryCode, ACTIVERECORD: 'Yes'});
			const productPacks = await SELECT.from(PT_TMPRDPCK).where({ACTIVERECORD: 'Yes'});
			const productPackSKUs = await SELECT.from(PT_TMSKUPRDPCK).where({CountryCode: this.countryCode, ActiveRecord: 'Yes'});
			const brands =  await SELECT.from(PT_TMPRDHIER);
			const institutes = await SELECT.from(PT_TMINST).where({CountryCode: this.countryCode, ActiveRecord: 'Yes'});
			const instituteHierarcis = await SELECT.from(PT_TMINSHIER).where({ActiveRecord: 'Yes'});
			const fastOfferData = await SELECT.from(ExtractFASTOfferNL).where({CountryCode: this.countryCode});
			const claimsData = await SELECT.from(ClaimData).where({CountryCode: this.countryCode});

			const { dateFrom, dateTo, filePeriodDate } = this.getDateFromAndTo(this.data[0].Claimperiode, this.filePeriod);

            // Map sales data to buffer entity
			const contrastAgentSalesData = this.mapContrastAgentSalesData(this.data, UUID, { dateFrom, dateTo, filePeriodDate });

			// Map sales data to claim file
			const claimFile = this.mapSalesDataToClaimFiles(this.data, distributor, UUID, this.cwid, { dateFrom, dateTo, filePeriodDate });

			// Map sales data to claim data
			const claimData = this.mapSalesDataToClaimData(this.data, countryProductPacks, productPacks, productPackSKUs, brands, institutes, instituteHierarcis, fastOfferData, wPPS, distributionAgreements, UUID, this.cwid, claimsData, { dateFrom, dateTo, filePeriodDate });

            const result = {contrastAgentSalesData, claimFile, claimData};

            return result;

        // } catch (error) {
        //     console.error(error);
        // }

    }

    /**
	 * Map fields from salesData to ClaimFiles
	 * @param {[Objects]} salesData 
	 * @param {Object} req - Request object containing additional data
	 * @returns {Object} claimFile
	 */
	mapSalesDataToClaimFiles(salesData, distributor, UUID, CWID, { dateFrom, dateTo, filePeriodDate }) {
		console.log(`JOB: Mapping Sales Data to Claim Files ...`);

		// Calculate metadata for ClaimFiles
		
		let wholesalerPurchaseAmount = salesData.reduce((sum, row) => sum + (row.PurchasePrice * row.TotalDelivered), 0);
		wholesalerPurchaseAmount = (!wholesalerPurchaseAmount && wholesalerPurchaseAmount !== 0) ? 0 : wholesalerPurchaseAmount;
		let netSales = salesData.reduce((sum, row) => sum + (row.FixedPrice * row.TotalDelivered), 0);
		netSales = (!netSales && netSales !== 0) ? 0 : netSales;
		let totalClaimAmount = salesData.reduce((sum, row) => sum + row.ClaimTotal, 0);
		totalClaimAmount = (!totalClaimAmount && totalClaimAmount !== 0) ? 0 : totalClaimAmount; 

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
	mapContrastAgentSalesData(salesData, UUID, { dateFrom, dateTo, filePeriodDate }) {

		console.log(`JOB (${this.jobName }): Mapping SalesData to ContrastAgentSalesData ...`);
		salesData = salesData.reduce((prev, curr, idx, salesData) => {
			prev.push(
				{
					ID                              : curr.ID || null,
					TypeRecord                      : String(curr.TypeRecord) || null,
					DatumVan                        : curr.DatumVan || null ,
					DatumTm                         : curr.Datumtm || null,
					IDFNummerKlant                  : String(curr.IDFNumber) || null,
					EANNrKlant                      : String(curr.EANCustomerNumber) || null,
					Klantnaam                       : String(curr.CustomerName) || null,
					EANNrArtikel                    : String(curr.EANItemNumber) || null,
					ZINrArtikel                     : String(curr.ZIndexNumber) || null,
					ArtnrLeverancier                : String(curr.SupplierItemNumber) || null,
					NaamArtikel                     : String(curr.ProductName) || null,
					Eenheid1                        : String(curr.Eenheid1) || null,
					Eenheid2                        : String(curr.Eenheid2) || null,
					VastePrijs                      : curr.FixedPrice || null,
					Kortingsperc1                   : curr.kortingsperc1 || null,
					Kortingsperc2                   : curr.kortingsperc2 || null,
					Inkoopprijs                     : curr.PurchasePrice || null,
					Claimpercentage                 : curr.ClaimPercentage || null,
					Claimbedrag                     : curr.ClaimAmount || null,
					AantalGeleverd                  : curr.TotalDelivered || null,
					Claim1Bedrag                    : curr.Claim1Amount || null,
					Claim2Bedrag                    : curr.Claim2Amount || null,
					ClaimTotaal                     : curr.ClaimTotal || null,
					ClaimPeriode                    : String(curr.Claimperiode) || null,
					ClaimGrondslag                  : String(curr.claimgrondslag) || null,
					Klantnummer                     : null,
					KlantenOvidiusPharmaceutische   : String(curr.KlantenOvidiusPahramceutischeGroothandel) || null,
					IDFNummer                       : null,
					KlantenLairesseZiekenhuis       : String(curr.KlantenLairesseziekenhuisfarmacie) || null,
					Periode                         : null,
					ZIndexNummer                    : null,
					ArtikelNummerLeverancier        : String(curr.artikelnummerleverancier) || null,
					ArtikelNaam                     : String(curr.Artikelnaam) || null,
					EenheidStuks                    : curr.Eenheidstuks || null,
					Claim1PerEenheid                : curr.Claim1pereenheid || null,
					TotaalClaim1                    : null,
					Claim2PerEenheid                : curr.Claim22pereenheid || null,
					TotaalClaim2                    : null,
					ClaimbedragTotaal               : null,
					Leverancier                     : null,
					AccountcombinatieNaam           : null,
					Woonplaats                      : null,
					IDFCode                         : null,
					Uitleverdatum                   : null,
					OrderNummer                     : null,
					RegelNr                         : null,
					Jaarweek                        : null,
					Jaar                            : null,
					KalenderMaand                   : null,
					ZINummer                        : null,
					ArtikelnrLeverancier            : null,
					ArtikelOmschrijving             : null,
					VerpakkingAantal                : null,
					VerpakkingsEenheid              : null,
					AIP                             : null,
					DAPrijs                         : null,
					LeveranciersbijdragePercentage  : null,
					Grondslag                       : null,
					LeveranciersbijdrageBedrag      : null,
					TotaalLeveranciersbijdrage      : null,
					Ultimo                          : null,
					Betaald                         : null,
					DAClaimPerArtikel               : null,
					TotaleClaimPerArtikel           : null,
					TotaleClaimPerRegel             : null,
					ContractPrice                   : null,
					WPP                             : null,
					Claim1                          : null,
					Claim2                          : null,
					Quantity                        : null,
					TotalClaim                      : null,
					Date                            : null,
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
	mapSalesDataToClaimData(salesData, countryProductPacks, productPacks, productPackSKUs, brands, institutes, instituteHierarcis, fastOfferData, wPPS, distributionAgreements, UUID, CWID, claimsData, { dateFrom, dateTo, filePeriodDate }) {

		console.log(`JOB (${this.jobName }): Mapping SalesData to Claims Data ...`);
		salesData = salesData.reduce((prev, curr, idx, salesData) => {
			const productpack = countryProductPacks.find(item => item.GOV_CODE == curr.ZIndexNumber);
			const productCode = productpack && productpack?.PRODUCTPACKID || null;
			const productPack = productPacks.find(i => i.PRODUCTPACKID == productCode);
			const productPackName = productPack && productPack?.PRODUCTPACKNAME || null;
			const hLEVEL6_CODE = productPack && productPack?.HLEVEL6_CODE || null;
			const brand =  brands.find(i => i.HLEVEL6_CODE == hLEVEL6_CODE);
			const brandName = brand && brand?.HLEVEL4_NAME || null;
			const brandId = brand && brand?.HLEVEL4_CODE || null;
			const productPackSKU = productPackSKUs.find(item => item.ProductPackID == productCode);
			const sKUCode = productPackSKU && productPackSKU?.SKUCode || null;
			const institute = institutes.find(item => {
				const externalIds = item.External_InstituteId || ""; // Fallback to an empty string if null or undefined
				return externalIds.split(',')
					.map(id => Number(id.trim()))
					.includes(Number(curr.IDFNumber));
			});
			const instituteId = institute && institute.InstituteID || null;
			const instituteName = institute && institute?.InstituteName || 'Customer Not Found';
			const childInstitute = instituteHierarcis.find(item => item.ParentInstituteID === instituteId);
			const childInstituteID = childInstitute && childInstitute.InstituteID || null;
			const childInstituteData = institutes.find(item => item.InstituteID === childInstituteID);
			const childInstituteName = childInstituteData && childInstituteData.InstituteName || null;
			const wPP = wPPS.find(item => item.PRODUCTPACKID == productCode && item.StartDate <= dateFrom && item.EndDate >= dateFrom);
			const wppValue = wPP && wPP.WPPWithoutTax || 0;
			const distributionAgreement = distributionAgreements.find(item => item.PRODUCTPACKID == productCode && item.StartDate <= dateFrom && item.EndDate >= dateFrom);
			const daValue = distributionAgreement && distributionAgreement.Value || 0;
			const daType = distributionAgreement && distributionAgreement.Type || null;
			const filteredItems = fastOfferData.filter(item => item.InstituteID == instituteId &&
																item.ProductCode === productCode &&
																item.ContractStartDate <= dateFrom &&
																item.ContractEndDate >= dateFrom);
			const fastOffer = filteredItems.length > 0 ? filteredItems.reduce((lowest, item) => !lowest || item.OfferPrice < lowest.OfferPrice ? item : lowest, null) : null;
			const offerID = fastOffer && fastOffer.OfferID || null;
			let fastContractClaim = fastOffer && ((wppValue - fastOffer.OfferPrice) * curr.TotalDelivered) || 0;
			fastContractClaim = Number(wppValue) < Number(fastOffer?.OfferPrice || 0) ? 0 : Math.round(fastContractClaim * 100) / 100;
			let fastDistributionArrangementClaim = fastOffer ? (distributionAgreement?.Type === 'Fixed' ? ((fastOffer.OfferPrice - daValue) * curr.TotalDelivered) : ((fastOffer.OfferPrice * daValue) * curr.TotalDelivered)) : 0;
			fastDistributionArrangementClaim = Math.round(fastDistributionArrangementClaim * 100) / 100;
			let totalFASTClaim = fastContractClaim + fastDistributionArrangementClaim;
			totalFASTClaim = Math.round(totalFASTClaim * 100) / 100;
			const wholesalerDisArPricePerUnit = curr.Claim2Amount / curr.TotalDelivered;
			const wholesalerDisArPrice = curr.FixedPrice - wholesalerDisArPricePerUnit;
			const wholesalerDistributionArrangement = distributionAgreement && distributionAgreement?.Type === 'Fixed' ? parseFloat(wholesalerDisArPrice.toFixed(3)) : Number((Math.round((wholesalerDisArPricePerUnit / curr.FixedPrice)*1000)/1000).toFixed(3)) || null;
			const percentageDifference = fastOffer && Number((Math.round(((curr.ClaimTotal - totalFASTClaim) /totalFASTClaim)*1000)/1000).toFixed(3)) || 0;
			const filteredClaimsData = claimsData.filter(item => item.OfferID == offerID && item.MainInstituteID == instituteId && item.ProductPackID == productCode);
			const fastPendingCorrection = filteredClaimsData.length > 0 ? filteredClaimsData.reduce((sum, row) => sum + (row.TotalWholesalerClaim - row.TotalFASTClaim), 0) : 0;
			const usageCalculation = filteredClaimsData.length > 0 ? filteredClaimsData.reduce((sum, row) => sum + row.Quantity, 0) : 0;
			prev.push(
				{
					CountryCode                             : this.countryCode,
					createdBy           					: CWID,
					modifiedBy         						: CWID,
					OfferID                                 : offerID, 
					ProductPackID                           : productCode,
					PRODUCTPACKNAME							: productPackName,
					EANNumber								: String(curr.ZIndexNumber),
					External_InstituteId					: String(curr.IDFNumber),
					MainInstituteID                         : instituteId,
					ChildInstituteID                        : childInstituteID,
					MainInstituteName                       : instituteName,
					ChildInstituteName                      : childInstituteName,
					DistributorID                           : this.distributorId,
					Date                                    : filePeriodDate,
					Type                                    : curr.ClaimTotal < 0 ? 'Correction' : 'Claim',
					Quantity                                : (!curr.TotalDelivered && curr.TotalDelivered !== 0) ? null : Number(curr.TotalDelivered || 0),
					WholesalerPurchasePrice                 : (!curr.PurchasePrice && curr.PurchasePrice !== 0) ? null : Number(curr.PurchasePrice || 0), 
					WholesalerDistributionArrangement       : wholesalerDistributionArrangement,
					AppliedWholesalerCorrection             : curr.ClaimTotal < 0 ? curr.ClaimTotal : null,
					WholesalerContractPrice                 : (!curr.FixedPrice && curr.FixedPrice !== 0) ? null : Number(curr.FixedPrice || 0),
					TotalClaim                              : curr.ClaimTotal > 0 ? curr.ClaimTotal : null,
					MainCustomerForContract                 : instituteId,
					FASTPendingCorrection                   : Number(fastPendingCorrection || 0),
					BrandContractVolume                     : null,
					BrandContractCalculatedVolume			: null,
					PercentageUsage                         : null,
					UsedVolume								: Number(usageCalculation + curr.TotalDelivered),
					BrandId									: brandId,
					BrandName								: brandName,
					Balance                                 : null,
					BrandUsedVolume                         : null,
					BrandUsedCalculatedVolume				: null,
					WholesalerContractPriceClaim            : (!curr.Claim1Amount && curr.Claim1Amount !== 0) ? null : Number(curr.Claim1Amount || 0),
					WholesalerDistributionArrangementClaim  : (!curr.Claim2Amount && curr.Claim2Amount !== 0) ? null : Number(curr.Claim2Amount || 0),
					TotalWholesalerClaim                    : (!curr.ClaimTotal && curr.ClaimTotal !== 0) ? null : Number(curr.ClaimTotal || 0),
					FASTContractClaim                       : Number(fastContractClaim || 0),
					FASTDistributionArrangementClaim        : Number(fastDistributionArrangementClaim || 0),
					TotalFASTClaim                          : Number(totalFASTClaim || 0),
					PercentageDifference                    : percentageDifference,
					Status                                  : instituteName === 'Customer Not Found' ? 'CustomerNotFound' : (fastOffer ? (totalFASTClaim == curr.ClaimTotal) ? 'Passed' : 'Failed' :'Failed'),
					Comment                                 : null,
					FASTWholesalerPurchasePrice             : Number(wppValue || 0),
					FASTContractPrice                       : fastOffer && Number(fastOffer.OfferPrice) || 0,
					FASTDistributionArrangement             : Number(daValue || 0),
					FASTDistributionAgreementType			: String(daType || ''),
					QC1Passed                               : fastContractClaim == curr.Claim1Amount ? true : false,
					QC2Passed                               : fastDistributionArrangementClaim == curr.Claim2Amount ? true : false,
					WholesalerClaim1                        : (!curr.Claim1Amount && curr.Claim1Amount !== 0) ? null : Number(curr.Claim1Amount || 0),
					WholesalerClaim2                        : (!curr.Claim2Amount && curr.Claim2Amount !== 0) ? null : Number(curr.Claim2Amount || 0),
					FASTClaim1                              : Number(fastContractClaim || 0),
					FASTClaim2                              : Number(fastDistributionArrangementClaim || 0),
					NrFaktury                               : null,
					RoznicaCenaZakupuPNM                    : null,
					WartoscPNM                              : null,
					IloscSztukDoWyrownania                  : null,
					NrFakturyZakupu                         : null,
					SKUCode									: sKUCode,
					RowOrder								: null,
					ClaimFiles_ID					 		: UUID
				}
			);
			return prev;
		}, []);
		return salesData;
	}

	
	getDateFromAndTo(claimperiode, filePeriod) {

		let incomingPeriod = String(claimperiode || filePeriod);
		let year, month;
	
		if (incomingPeriod.length === 6 && !isNaN(incomingPeriod) && parseInt(incomingPeriod.slice(0, 4)) > 1900 && parseInt(incomingPeriod.slice(0, 4)) < 2100) {
			year = parseInt(incomingPeriod.slice(0, 4));
			month = parseInt(incomingPeriod.slice(4, 6)) - 1; // JavaScript months are 0-based (0 = January, 11 = December)
		} else if (!isNaN(incomingPeriod) && incomingPeriod.length > 4) {
			// Convert Excel date serial number to JS date
			const excelEpoch = new Date(1899, 11, 30);
			const jsDate = new Date(excelEpoch.getTime() + (parseInt(incomingPeriod)) * 86400000); // 86400000 ms in a day
			year = jsDate.getFullYear();
			month = jsDate.getMonth();
		} else if (incomingPeriod.includes('-')) {
			const [monthStr, yearStr] = incomingPeriod.split('-');
			month = new Date(Date.parse(`${monthStr} 1, ${yearStr}`)).getMonth();
			year = parseInt(yearStr);
		} else {
			throw new Error("Invalid claim period format");
		}
	
		const dateFrom = new Date(year, month, 1);
		const dateTo = new Date(year, month + 1, 0);
		
		let formatDate = (date) => date.toISOString().split('T')[0];

		// Convert filePeriod to a date
		const [filePeriodMonth, filePeriodYear] = filePeriod.split('-');
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

	formatData(salesdata, currentMappings, DistributorName, fieldMetadata){
		if(DistributorName === 'Ovidius Pharma & Care' || DistributorName === 'Klinifarma'){
			salesdata = this.formatXslxData(salesdata, currentMappings, DistributorName);
		}
		else{
			salesdata = this.formatFixData(salesdata, fieldMetadata);
		}
		return salesdata;
	}
	
	formatXslxData(salesdata, currentMappings, DistributorName){

		let columnNames = null;
		if(DistributorName === 'Ovidius Pharma & Care'){
			// Get column names from the 5th row
			columnNames = salesdata[2].map(col => currentMappings[col.replace(/\s+/g, '').replace(/.*\//, '').replace(/[().€%]/g, '')] || col);

			// Remove initial rows that are not real data
			salesdata = salesdata.slice(3);
		}
		else{
			// Get column names from the 5th row
			columnNames = salesdata[0].map(col => currentMappings[col.replace(/\s+/g, '').replace(/.*\//, '').replace(/[().€%]/g, '')] || col);

			// Remove initial rows that are not real data
			salesdata = salesdata.slice(1);
		}

		salesdata = salesdata.filter(row => row.some(cell => cell !== null && cell !== '' && cell !== ' '));

		// Map the data to the correct column names
		salesdata = salesdata.map(row => {
			let obj = {};
			columnNames.forEach((col, index) => {
				let value = row[index];
				
				/*
				if (['FixedPrice', 'PurchasePrice', 'Claim1Amount', 'Claim2Amount','ClaimTotal'].includes(col)) {
					// Convert last two digits to decimal
					value = parseFloat(String(value).replace(/^\+?0+/, '')) / 100;
				}*/
				
				obj[col] = value;
			});
			return obj;
		});

		return salesdata;
	}

	formatFixData(salesdata, fieldMetadata){
		// Remove initial rows that are not real data
		salesdata = salesdata.slice(1);		

		// Calculate the start and end positions for each field based on its length
		let currentPosition = 1;
		fieldMetadata.forEach((field) => {
			field.startPosition = currentPosition;
			field.endPosition = currentPosition + field.FieldLength - 1;
			currentPosition += field.FieldLength;
		});
		
		salesdata = salesdata.map((line) => {
			const detailRecord = {};  // Create a new object for the parsed fields
		
			// Parse each field based on metadata and add it to detailRecord
			fieldMetadata.forEach((field) => {
				const startPosition = field.startPosition - 1;
				const endPosition = field.endPosition;
				
				// Extract and trim the value
				let value = line.substring(startPosition, endPosition).trim();

				// Apply transformations based on field requirements
				if (['FixedPrice', 'PurchasePrice', 'Claim1Amount', 'Claim2Amount','ClaimTotal'].includes(field.FieldName)) {
					// Convert last two digits to decimal
					if (/^\+?0+$/.test(value)) {
						value = 0;
					} else {
						value = parseFloat(value.replace(/^\+?0+/, '')) / 100;
					}
				} else if (field.FieldName === 'TotalDelivered') {
					// Remove leading + and leading zeros
					value = /^\+?0+$/.test(value) ? 0 : parseInt(value.replace(/^\+?0+/, ''), 10);
				}
				
				// Assign the extracted value to the field name
				detailRecord[field.FieldName] = value;
			});
			
				// Return the enriched line object
				return detailRecord;
		}).filter((record) => {
			// Filter out records with TypeOfRecord as 'E' or empty records
			return record.TypeOfRecord && !record.TypeOfRecord?.startsWith('E') && record.TypeOfRecord !== String.fromCharCode(26) && Object.values(record).some((value) => value !== "");
		});

		return salesdata;
	}


	// Column mappings defined outside the function
	columnMappings = function(distributor){
		const mappings = {
    		'Ovidius Pharma & Care': {
				"Klantnummer": "EANCustomerNumber",
				"Klantnaam": "CustomerName",
				"KlantenOvidiusPahramceutischeGroothandel": "KlantenOvidiusPahramceutischeGroothandel",
				"IDFnummer": "IDFNumber",
				"KlantenLairesseziekenhuisfarmacie": "KlantenLairesseziekenhuisfarmacie",
				"Periode": "Claimperiode",
				"Z-indexnummer": "ZIndexNumber",
				"artikelnummerleverancier": "SupplierItemNumber",
				"Artikelnaam": "ProductName",
				"Eenheidstuks": "Eenheid1",
				"Vasteprijs": "FixedPrice",
				"Inkoopprijs": "PurchasePrice",
				"Claim1pereenheid": "Claim1pereenheid",
				"Aantalgeleverd": "TotalDelivered",
				"Totaalclaim1": "Claim1Amount",
				"Claim22pereenheid": "Claim22pereenheid",
				"Totaalclaim2": "Claim2Amount",
				"Claimbedragtotaal": "ClaimTotal"
    		},
			'Klinifarma': {
				"Klantnummer": "EANCustomerNumber",
				"Klantnaam": "CustomerName",
				"KlantenOvidiusPahramceutischeGroothandel": "KlantenOvidiusPahramceutischeGroothandel",
				"IDFnummer": "IDFNumber",
				"KlantenLairesseziekenhuisfarmacie": "KlantenLairesseziekenhuisfarmacie",
				"Periode": "Claimperiode",
				"Z-indexnummer": "ZIndexNumber",
				"artikelnummerleverancier": "SupplierItemNumber",
				"Artikelnaam": "ProductName",
				"Eenheidstuks": "Eenheid1",
				"Vasteprijs": "FixedPrice",
				"Inkoopprijs": "PurchasePrice",
				"Claim1pereenheid": "Claim1pereenheid",
				"Aantalgeleverd": "TotalDelivered",
				"Totaalclaim1": "Claim1Amount",
				"Claim22pereenheid": "Claim22pereenheid",
				"Totaalclaim2": "Claim2Amount",
				"Claimbedragtotaal": "ClaimTotal"
    		}
		}
		return mappings[distributor.DistributorName];
	}

};