const cds = require('@sap/cds');
const XLSX = require("xlsx");
const moment = require('moment');
const XLSXHelper = require("./utils/XLSXHelper");
const Handlebars = require("handlebars");
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {

    const {
        PT_TMPRDHIER,
        PT_TMDIST,
        PT_TMINST,
        PT_TMSKUPRDPCK,
        PT_TMPRDPCK
    } = cds.entities("com.bayer.SXTENDER.MasterData");
    const {
        PT_TMOFRS,
        PT_TMOFPR,
        PT_TMTEND
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");
    const {
        ExcelTemplate,
        ExtractClaimFilesView,
        ClaimDataBrandsView
    } = cds.entities("ClaimsService");
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
};