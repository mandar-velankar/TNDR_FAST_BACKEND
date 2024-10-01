const cds = require('@sap/cds');
const XLSX = require("xlsx");
const moment = require('moment');
const XLSXHelper = require("./utils/XLSXHelper");
const Handlebars = require("handlebars");
const ServiceHelper = require('./utils/ServiceHelper');
const { v4: uuidv4 } = require('uuid');


module.exports = (srv) => {

	const {
        ClaimFiles,
        ClaimData,
        ContrastAgentSalesData,
        SalesReportFile
    } = cds.entities("com.bayer.SXTENDER.ClaimsData");
    const {
        PT_TMPRDHIER,
        PT_TMDIST,
        PT_TMINST,
        PT_TMSKUPRDPCK,
        PT_TMPRDPCK,
		PT_TMCTPRDPCK,
		PT_TMINSHIER
    } = cds.entities("com.bayer.SXTENDER.MasterData");
    const {
        PT_TMOFRS,
        PT_TMOFPR,
        PT_TMTEND
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");
    const {
        ExcelTemplate,
        ExtractClaimFilesView,
        ClaimDataBrandsView,
		ExtractFASTOffer
    } = cds.entities("ClaimsService");

	function bufferToArrayBuffer(buffer) {
		const arrayBuffer = new ArrayBuffer(buffer.length);
		const view = new Uint8Array(arrayBuffer);
		for (let i = 0; i < buffer.length; ++i) {
		  view[i] = buffer[i];
		}
		return arrayBuffer;
	}

	// function generateUUID() {
	// 	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
	// 		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	// 	);
	// }

	function generateUUID() {
		return uuidv4();
	}

	/**
	 * Helper function to convert Excel date serial number to JS date
	 */
	function excelDateToJSDate(serial) {
		// Excel's epoch starts on December 30, 1899
		const excelEpoch = new Date(1899, 11, 30);
		const jsDate = new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms in a day
		return jsDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
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

    srv.on('READ', 'ExtractClaimsSales', async (req, next) => {
		try{
		const tx = cds.tx(req);
		const {templateId, CountryCode, DistributorID, BrandId, Status, DateFrom, DateTo} = req.data;
		const CountryBrands = await SELECT.from(ClaimDataBrandsView).where({ COUNTRYCODE: CountryCode,BRANDID: BrandId});
        let where = `
            
            CountryCode = '${CountryCode}' and 
            Status = '${Status}' 
        `
        if (DistributorID) {
            where += `and DistributorID = '${DistributorID}'`
        }
        if (DateFrom) {
            where += `and DateFrom <= date'${DateFrom}'`
        }
        if (DateTo) {
            where += `and DateTo >= date'${DateTo}'`
        }
        let brandFilter = ''
        if (Array.isArray(CountryBrands) && CountryBrands.length > 0) {
            where += " and "
            for (let i = 0; i < CountryBrands.length; i++) {
                brandFilter += `ClaimFileID = '${CountryBrands[i].ClaimFiles_ID}'`;
                if (i < CountryBrands.length - 1) {
                    brandFilter += " or ";
                }
            }
        }
		const template = await SELECT.one.from(ExcelTemplate).where({ templateId: templateId });

        const fullWhere = cds.parse.expr(where + brandFilter);
		const query = SELECT.from(ExtractClaimFilesView).where(fullWhere);

        const excelData = await tx.run(query);
		if (!template || !template.content) {
			return req.reject(404, 'No template found for templateid:' + templateId);
		}

		let excelStreamValue = XLSXHelper.generateXLSXByFile(template.content,{ excelData },1);

		req._.res.setHeader('Content-disposition', `attachment; filename=${template.filename}`);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return excelStreamValue;
		}
		catch(error){
            console.error('Error in ExtractClaimsSales READ');
            return req.reject(403, error?.message||"Error in ExtractClaimsSales");
        }
        
	});
	
    srv.after("UPDATE", "SalesReportFile", async (req, res) => {
		/**
		 * @param {Object} file - This is uploaded excel file
		 * @param {Function} bufferToArrayBuffer - Converting Content of Excel file from Buffer to Array buffer 
		 */
		try {
			let UUID = generateUUID();
			let CWID = res.user.id;
			const file = await SELECT.one.from(SalesReportFile).where({DistributorID: req.DistributorID});

			if (!file) {
				res.warn(400, "The file appears to be corrupted. Please check the file and upload a valid SalesReport file." );
			}
			
			const arrayBuffer = bufferToArrayBuffer(file?.content);
			try {
				workbook = XLSX.read(arrayBuffer, { type: 'array' });
			} catch (error) {
				throw { message: "The file format is incorrect. Please upload a valid SalesReport file." };
			}

			// Assuming the Excel file has only one sheet, you can get the data from it
			const sheetName = workbook.SheetNames[0];
			let salesData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

			// Get column names from the 5th row
			const columnNames = salesData[4].map(col => col.replace(/\s+/g, '').replace(/.*\//, '').replace(/[().]/g, ''));

			// Remove initial rows that are not real data
			salesData = salesData.slice(5);
	
			// Remove empty records
			salesData = salesData.filter(row => row.some(cell => cell !== null && cell !== ''));
	
			// Map the data to the correct column names
			salesData = salesData.map(row => {
				let obj = {};
				columnNames.forEach((col, index) => {
					obj[col] = row[index];
				});
				return obj;
			});

			const distributor = await SELECT.one.from(PT_TMDIST).where({DistributorID: req.DistributorID, CountryCode: req.CountryCode});
			const countryProductPacks = await SELECT.from(PT_TMCTPRDPCK).where({COUNTRYCODE: req.CountryCode, ACTIVERECORD: 'Yes'});
			const institutes = await SELECT.from(PT_TMINST).where({CountryCode: req.CountryCode, ActiveRecord: 'Yes'});
			const instituteHierarcis = await SELECT.from(PT_TMINSHIER).where({ActiveRecord: 'Yes'});
			const fastOfferData = await SELECT.from(ExtractFASTOffer).where({CountryCode: req.CountryCode});

			// Map sales data to buffer entity
			const contrastAgentSalesData = mapContrastAgentSalesData(salesData, UUID);

			// Map sales data to claim file
			const claimFile = mapSalesDataToClaimFiles(salesData, distributor, UUID, CWID, req);

			// Map sales data to claim data
			const claimData = mapSalesDataToClaimData(salesData, distributor, countryProductPacks, institutes, instituteHierarcis, fastOfferData, UUID, CWID, req);

			// Insert metadata into ContrastAgentSalesData
			await INSERT.into(ContrastAgentSalesData).entries(contrastAgentSalesData);

			//Insert metadata into ClaimFiles
			await INSERT.into(ClaimFiles).entries(claimFile);

			//Insert metadata into ClaimData
			await INSERT.into(ClaimData).entries(claimData);

			await DELETE.from(SalesReportFile).where({DistributorID: req.DistributorID});
		} catch (error) {
			console.error('Error in SalesReportUploadFile');
			return res.reject(400, error.message || 'An unexpected error occurred.')
		}
		
		return res.reply("Sales Data uploaded successfully");
	});

	/**
	 * Map fields from salesData to ClaimFiles
	 * @param {[Objects]} salesData 
	 * @param {Object} req - Request object containing additional data
	 * @returns {Object} claimFile
	 */
	function mapSalesDataToClaimFiles(salesData, distributor, UUID, CWID, req) {
		console.log(`JOB: Mapping Sales Data to Claim Files ...`);

		// Calculate metadata for ClaimFiles
		const { dateFrom, dateTo, filePeriodDate } = getDateFromAndTo(salesData, req.FilePeriod);
		const wholesalerPurchaseAmount = salesData.reduce((sum, row) => sum + (row.CENAZAKUPUNETTO * row.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI), 0);
		const netSales = salesData.reduce((sum, row) => sum + (row.PODSTAWANALICZENIAMARŻYNETTOPNM * row.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI), 0);
		const totalClaimAmount = salesData.reduce((sum, row) => sum + row.Wartośćdowyrównania, 0);

		const claimFile = {
			ID						: UUID,
			createdBy           	: CWID,
			modifiedBy         		: CWID,
			CountryCode				: req.CountryCode,
			ClaimFileFormat			: req.FileType,
			FileName				: req.FileName,
			DateFrom				: dateFrom,
			DateTo					: dateTo,
			FilePeriod				: filePeriodDate,
			DistributorID			: req.DistributorID,
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
	function mapContrastAgentSalesData(salesData, UUID) {

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
					DataSprzedazy                    : excelDateToJSDate(curr.DATASPRZEDAŻY),
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
	function mapSalesDataToClaimData(salesData, distributor, countryProductPacks, institutes, instituteHierarcis, fastOfferData, UUID, CWID, req) {

		console.log(`JOB (${this.jobName }): Mapping SalesData to Claims Data ...`);
		salesData = salesData.reduce((prev, curr, idx, salesData) => {
			const productpack = countryProductPacks.find(item => item.GOV_CODE == curr.KODEANARTYKUŁU);
			const productCode = productpack && productpack?.PRODUCTPACKID || null;
			const institute = institutes.find(item => item.External_InstituteId == curr.KODKLIENTAwgBAYERSpzoo.replace(/\s+/g,''));
			const instituteId = institute && institute.InstituteID || null;
			const instituteName = institute && institute?.InstituteName || null;
			const childInstitute = instituteHierarcis.find(item => item.ParentInstituteID == instituteId);
			const childInstituteID = childInstitute && childInstitute.InstituteID || null;
			const childInstituteData = institutes.find(item => item.InstituteID == childInstituteID);
			const childInstituteName = childInstituteData && childInstituteData.InstituteName || null;
			const filteredItems = fastOfferData.filter(item => item.InstituteID == instituteId &&
																item.ProductCode === productCode &&
																item.EffectiveDate <= excelDateToJSDate(curr.DATASPRZEDAŻY) &&
																item.ExpiryDate >= excelDateToJSDate(curr.DATASPRZEDAŻY));
			const fastOffer = filteredItems.length > 0 ? filteredItems.reduce((lowest, item) => !lowest || item.OfferPrice < lowest.OfferPrice ? item : lowest, null) : null;
			const fastContractClaim = fastOffer && (fastOffer.RequestedVolume * (fastOffer.RegPrice - fastOffer.OfferPrice)) || 0;
			prev.push(
				{
					CountryCode                             : req.CountryCode,
					createdBy           					: CWID,
					modifiedBy         						: CWID,
					OfferID                                 : fastOffer && fastOffer.OfferID || null, 
					ProductPackID                           : productCode,
					MainInstituteID                         : instituteId,
					ChildInstituteID                        : childInstituteID,
					MainInstituteName                       : instituteName,
					ChildInstituteName                      : childInstituteName,
					DistributorID                           : req.DistributorID,
					Date                                    : excelDateToJSDate(curr.DATASPRZEDAŻY),
					Type                                    : 'Claim',
					Quantity                                : curr.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI,
					WholesalerPurchasePrice                 : curr.CENAZAKUPUNETTO, 
					WholesalerDistributionArrangement       : null,
					AppliedWholesalerCorrection             : null,
					WholesalerContractPrice                 : curr.PODSTAWANALICZENIAMARŻYNETTOPNM,
					TotalClaim                              : curr.Wartośćdowyrównania,
					MainCustomerForContract                 : instituteId,
					FASTPendingCorrection                   : null,
					BrandContractVolume                     : fastOffer && (fastOffer.RequestedVolume * fastOffer.CONCENTRATION) || 0,
					PercentageUsage                         : null,
					BrandId									: fastOffer && fastOffer.BrandId || null,
					BrandName								: fastOffer && fastOffer.BrandName || null,
					Balance                                 : null,
					BrandUsedVolume                         : fastOffer && (curr.ILOŚĆSZTUKARTYKUŁUSPRZEDANYCHKLIENTOWI * fastOffer.CONCENTRATION) || 0,
					WholesalerContractPriceClaim            : curr.PODSTAWANALICZENIAMARŻYNETTOPNM,
					WholesalerDistributionArrangementClaim  : null,
					TotalWholesalerClaim                    : curr.Wartośćdowyrównania,
					FASTContractClaim                       : fastContractClaim,
					FASTDistributionArrangementClaim        : 0,
					TotalFASTClaim                          : fastContractClaim,
					PercentageDifference                    : fastOffer && ((curr.Wartośćdowyrównania - fastContractClaim)/fastContractClaim) || 0,
					Status                                  : fastOffer ? (fastContractClaim == curr.Wartośćdowyrównania ? 'Passed' : 'FailedPriceCheck') : 'NoContract',
					Comment                                 : null,
					FASTWholesalerPurchasePrice             : fastOffer && fastOffer.RegPrice || 0,
					FASTContractPrice                       : fastOffer && fastOffer.OfferPrice || 0,
					FASTDistributionArrangement             : null,
					QC1Passed                               : null,
					QC2Passed                               : null,
					ClaimFiles_ID					 		: UUID
				}
			);
			return prev;
		}, []);
		return salesData;
	}

	
	function getDateFromAndTo(salesData, filePeriod) {
		// Assuming all dates are in the same month/year, we extract year and month from the first date
		let firstDate = new Date(excelDateToJSDate(salesData[0].DATASPRZEDAŻY));

		// Get the first day of the month
		let dateFrom = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
		
		// Get the last day of the month
		let dateTo = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0);
		
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

};