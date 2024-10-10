const cds = require('@sap/cds');
const BaseCountryFileFormatter = require('./BaseCountryFileFormatter');
const { v4: uuidv4 } = require('uuid');

module.exports = class NLFileFormatter extends BaseCountryFileFormatter {

    constructor(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        super(file, type, name, countryCode, distributorId, filePeriod, cwid);
    }

    async format() {

        console.log('Processing of Nederlands Sales Report File started ...');

        try {
			this.db = await cds.connect.to('db');

			let UUID = this.generateUUID();
            // Get column names from the 5th row
			const columnNames = this.data[0].map(col => col.replace(/\s+/g, '').replace(/.*\//, '').replace(/[().]/g, ''));

			// Remove initial rows that are not real data
			this.data = this.data.slice(1);
	
			// Remove empty records
			this.data = this.data.filter(row => row.some(cell => cell !== null && cell !== ''));
	
			// Map the data to the correct column names
			this.data = this.data.map(row => {
				let obj = {};
				columnNames.forEach((col, index) => {
					obj[col] = row[index];
				});
				return obj;
			});

			this.data = this.data.filter(row => row.TypeRecord !== 'H' && row.TypeRecord !== 'E');

			const { PT_TMDIST, PT_TMINST, PT_TMCTPRDPCK, PT_TMINSHIER, PT_TMPRDPCK, WholesalePurchasePrice, DistributionAgreements} = this.db.entities("com.bayer.SXTENDER.MasterData");
			const { ExtractFASTOfferNL } = this.db.entities("ClaimsService");
            const distributor = await SELECT.one.from(PT_TMDIST).where({DistributorID: this.distributorId, CountryCode: this.countryCode});
			const wPPS = await SELECT.from(WholesalePurchasePrice).where({COUNTRYCODE: this.countryCode, DistributorID:this.distributorId, Status: 'Approved'});
			const distributionAgreements = await SELECT.from(DistributionAgreements).where({COUNTRYCODE: this.countryCode, DistributorID:this.distributorId});
			const countryProductPacks = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: this.countryCode, ACTIVERECORD: 'Yes'});
			const productPacks = await SELECT.from(PT_TMPRDPCK).where({ACTIVERECORD: 'Yes'});
			const institutes = await SELECT.from(PT_TMINST).where({CountryCode: this.countryCode, ActiveRecord: 'Yes'});
			const instituteHierarcis = await SELECT.from(PT_TMINSHIER).where({ActiveRecord: 'Yes'});
			const fastOfferData = await SELECT.from(ExtractFASTOfferNL).where({CountryCode: this.countryCode});

			const { dateFrom, dateTo, filePeriodDate } = this.getDateFromAndTo(this.data[0].Claimperiode, this.filePeriod);

            // Map sales data to buffer entity
			const contrastAgentSalesData = this.mapContrastAgentSalesData(this.data, UUID, { dateFrom, dateTo, filePeriodDate });

			// Map sales data to claim file
			const claimFile = this.mapSalesDataToClaimFiles(this.data, distributor, UUID, this.cwid, { dateFrom, dateTo, filePeriodDate });

			// Map sales data to claim data
			const claimData = this.mapSalesDataToClaimData(this.data, countryProductPacks, productPacks, institutes, instituteHierarcis, fastOfferData, wPPS, distributionAgreements, UUID, this.cwid, { dateFrom, dateTo, filePeriodDate });

            const result = {contrastAgentSalesData, claimFile, claimData};

            return result;

        } catch (error) {
            console.error(error);
        }

        console.log('Processing of Nederlands Sales Report File finished.');
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
		
		const wholesalerPurchaseAmount = salesData.reduce((sum, row) => sum + (row.Inkoopprijs * row.Aantalgeleverd), 0);
		const totalClaimAmount = salesData.reduce((sum, row) => sum + row.Claimtotaal, 0);

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
			NetSales				: wholesalerPurchaseAmount,
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
					ID                              : curr.ID,
					TypeRecord                      : curr.TypeRecord,
					DatumVan                        : dateFrom,
					DatumTm                         : dateTo,
					IDFNummerKlant                  : curr.IDFnrklant,
					EANNrKlant                      : curr.EANNrklant || null,
					Klantnaam                       : curr.Klantnaam,
					EANNrArtikel                    : curr.EANNrArtikel,
					ZINrArtikel                     : curr.ZInrartikel,
					ArtnrLeverancier                : curr.ArtnrLeverancier,
					NaamArtikel                     : curr.NaamArtikel,
					Eenheid1                        : curr.Eenheid1 || null,
					Eenheid2                        : curr.Eenheid2 || null,
					VastePrijs                      : curr.Vasteprijs,
					Kortingsperc1                   : curr.kortingsperc1,
					Kortingsperc2                   : curr.kortingsperc2,
					Inkoopprijs                     : curr.Inkoopprijs,
					Claimpercentage                 : curr.Claimpercentage,
					Claimbedrag                     : curr.Claimbedrag,
					AantalGeleverd                  : curr.Aantalgeleverd,
					Claim1Bedrag                    : curr.Claim1bedrag,
					Claim2Bedrag                    : curr.Claim2bedrag,
					ClaimTotaal                     : curr.Claimtotaal,
					ClaimPeriode                    : curr.Claimperiode,
					ClaimGrondslag                  : curr.claimgrondslag,
					Klantnummer                     : null,
					KlantenOvidiusPharmaceutische   : null,
					IDFNummer                       : null,
					KlantenLairesseZiekenhuis       : null,
					Periode                         : null,
					ZIndexNummer                    : null,
					ArtikelNummerLeverancier        : null,
					ArtikelNaam                     : null,
					EenheidStuks                    : null,
					Claim1PerEenheid                : null,
					TotaalClaim1                    : null,
					Claim2PerEenheid                : null,
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
	mapSalesDataToClaimData(salesData, countryProductPacks, productPacks, institutes, instituteHierarcis, fastOfferData, wPPS, distributionAgreements, UUID, CWID, { dateFrom, dateTo, filePeriodDate }) {

		console.log(`JOB (${this.jobName }): Mapping SalesData to Claims Data ...`);
		salesData = salesData.reduce((prev, curr, idx, salesData) => {
			const productpack = countryProductPacks.find(item => item.GOV_CODE == curr.ZInrartikel);
			const productCode = productpack && productpack?.PRODUCTPACKID || null;
			const productPack = productPacks.find(i => i.PRODUCTPACKID == productCode);
			const productPackName = productPack && productPack?.PRODUCTPACKNAME || null;
			let IDFnrklant = 'H0' + curr.IDFnrklant;
			const institute = institutes.find(item => item.External_InstituteId == IDFnrklant);
			const instituteId = institute && institute.InstituteID || null;
			const instituteName = institute && institute?.InstituteName || 'Customer Not Found';
			const childInstitute = instituteHierarcis.find(item => item.ParentInstituteID == instituteId);
			const childInstituteID = childInstitute && childInstitute.InstituteID || null;
			const childInstituteData = institutes.find(item => item.InstituteID == childInstituteID);
			const childInstituteName = childInstituteData && childInstituteData.InstituteName || 'Customer Not Found';
			const wPP = wPPS.find(item => item.PRODUCTPACKID == productCode && item.StartDate <= dateFrom && item.EndDate >= dateFrom);
			const wppValue = wPP && wPP.WPPWithoutTax || 0;
			const distributionAgreement = distributionAgreements.find(item => item.PRODUCTPACKID == productCode && item.StartDate <= dateFrom && item.EndDate >= dateFrom);
			const daValue = distributionAgreement && distributionAgreement.Value || 0;
			const filteredItems = fastOfferData.filter(item => item.InstituteID == instituteId &&
																item.DistributorID == this.distributorId &&
																item.ProductCode === productCode &&
																item.ContractStartDate <= dateFrom &&
																item.ContractEndDate >= dateFrom);
			const fastOffer = filteredItems.length > 0 ? filteredItems.reduce((lowest, item) => !lowest || item.OfferPrice < lowest.OfferPrice ? item : lowest, null) : null;
			const fastContractClaim = fastOffer && ((wppValue - fastOffer.OfferPrice) * fastOffer.RequestedVolume) || 0;
			const fastDistributionArrangementClaim = fastOffer ? (distributionAgreement?.Type === 'Fixed' ? ((fastOffer.OfferPrice - daValue) * fastOffer.RequestedVolume) : ((fastOffer.OfferPrice * daValue) * fastOffer.RequestedVolume)) : 0;
			const totalFASTClaim = fastContractClaim + fastDistributionArrangementClaim;
			const wholesalerDisArPrice = curr.Vasteprijs - (curr.Claim2bedrag/curr.Aantalgeleverd);
			prev.push(
				{
					CountryCode                             : this.countryCode,
					createdBy           					: CWID,
					modifiedBy         						: CWID,
					OfferID                                 : fastOffer && fastOffer.OfferID || null, 
					ProductPackID                           : productCode,
					PRODUCTPACKNAME							: productPackName,
					MainInstituteID                         : instituteId,
					ChildInstituteID                        : childInstituteID,
					MainInstituteName                       : instituteName,
					ChildInstituteName                      : childInstituteName,
					DistributorID                           : this.distributorId,
					Date                                    : filePeriodDate,
					Type                                    : curr.Claimtotaal < 0 ? 'Correction' : 'Claim',
					Quantity                                : curr.Aantalgeleverd,
					WholesalerPurchasePrice                 : curr.Inkoopprijs, 
					WholesalerDistributionArrangement       : distributionAgreement?.Type === 'Fixed' ? wholesalerDisArPrice : 1 - wholesalerDisArPrice / curr.Vasteprijs,
					AppliedWholesalerCorrection             : curr.Claimtotaal < 0 ? curr.Claimtotaal : null,
					WholesalerContractPrice                 : curr.Vasteprijs,
					TotalClaim                              : curr.Claimtotaal > 0 ? curr.Claimtotaal : null,
					MainCustomerForContract                 : instituteId,
					FASTPendingCorrection                   : null,
					BrandContractVolume                     : null,
					PercentageUsage                         : null,
					BrandId									: fastOffer && fastOffer.BrandId || null,
					BrandName								: fastOffer && fastOffer.BrandName || null,
					Balance                                 : null,
					BrandUsedVolume                         : null,
					WholesalerContractPriceClaim            : curr.Vasteprijs,
					WholesalerDistributionArrangementClaim  : curr.Claim2bedrag,
					TotalWholesalerClaim                    : curr.Claimtotaal,
					FASTContractClaim                       : fastContractClaim,
					FASTDistributionArrangementClaim        : fastDistributionArrangementClaim,
					TotalFASTClaim                          : totalFASTClaim,
					PercentageDifference                    : fastOffer && ((curr.Claimtotaal - totalFASTClaim)/totalFASTClaim) || 0,
					Status                                  : fastOffer ? (totalFASTClaim == curr.Claimtotaal ? 'Passed' : 'FailedPriceCheck') : 'CustomerNotFound',
					Comment                                 : null,
					FASTWholesalerPurchasePrice             : wppValue || 0,
					FASTContractPrice                       : fastOffer && fastOffer.OfferPrice || 0,
					FASTDistributionArrangement             : daValue,
					QC1Passed                               : fastContractClaim == curr.Claim1bedrag ? true : false,
					QC2Passed                               : fastDistributionArrangementClaim == curr.Claim2bedrag ? true : false,
					WholesalerClaim1                        : curr.Claim1bedrag,
					WholesalerClaim2                        : curr.Claim2bedrag,
					FASTClaim1                              : fastContractClaim,
					FASTClaim2                              : fastDistributionArrangementClaim,
					ClaimFiles_ID					 		: UUID
				}
			);
			return prev;
		}, []);
		return salesData;
	}

	
	getDateFromAndTo(claimperiode, filePeriod) {

		let incomingPeriod = claimperiode ? claimperiode : filePeriod;
		// Extract year and month from the filePeriod
		const year = parseInt(incomingPeriod.slice(0, 4));
		const month = parseInt(incomingPeriod.slice(4, 6)) - 1; // JavaScript months are 0-based (0 = January, 11 = December)
	
		// Get the first day of the month
		const dateFrom = new Date(year, month, 1);
		
		// Get the last day of the month
		const dateTo = new Date(year, month + 1, 0);
		
		// Format the dates to YYYY-MM-DD
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

};