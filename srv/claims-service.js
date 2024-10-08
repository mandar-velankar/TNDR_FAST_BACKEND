const cds = require('@sap/cds');
const XLSX = require("xlsx");
const moment = require('moment');
const XLSXHelper = require("./utils/XLSXHelper");
const Handlebars = require("handlebars");
const ServiceHelper = require('./utils/ServiceHelper');
const { v4: uuidv4 } = require('uuid');
const dataToJson = require("data-to-json");
const CountryFileFormatterFactory = require('./claimsfile/CountryFileFormatterFactory');


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
        PT_TMTEND,
		OutgoingMails
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");
	const {
		MailTemplate
	} = cds.entities("com.bayer.SXTENDER.AdminData");
    const {
        ExcelTemplate,
        ExtractClaimFilesView,
		ExtractClaimDataView,
        ClaimDataBrandsView,
		ExtractFASTOffer,
		ClaimApproverTypes,
		ClaimApprovals,
		ClaimFileStatusView
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
        if (DateTo) {
			where += `and DateFrom <= date'${DateTo}'`;
        }
        if (DateFrom) {
			where += `and DateTo >= date'${DateFrom}'`;
        }
        let brandFilter = ''

		if (BrandId !== 'All_Brands' && Array.isArray(CountryBrands) && CountryBrands.length == 0) {
            where += " and "
			brandFilter += `ClaimFileID = 'null'`;
        }
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
		const countryCodeLocals = {
			'NL': 'nl-NL',
			'PL': 'en-US'
		}
	

        const excelData = await tx.run(query);

		excelData.forEach(ed => {
			ed.Price0 = ServiceHelper.formatCurrency(Number(ed.Price0), countryCodeLocals[CountryCode], 2, 2);
			ed.OfferPrice = ServiceHelper.formatCurrency(Number(ed.OfferPrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerPurchasedAmount = ServiceHelper.formatCurrency(Number(ed.WholesalerPurchasedAmount), countryCodeLocals[CountryCode], 2, 2);
			ed.NetSales = ServiceHelper.formatCurrency(Number(ed.NetSales), countryCodeLocals[CountryCode], 2, 2);
		});
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


	srv.on('READ', 'ExtractApprovedClaim', async (req, next) => {
		try{
		const tx = cds.tx(req);

		const {templateId, CountryCode} = req.data;

		const query = SELECT.from(ExtractClaimDataView);

		const countryCodeLocals = {
			'NL': 'nl-NL',
			'PL': 'en-US'
		}
	
        const excelData = await tx.run(query);
		
		excelData.forEach(ed => {
			ed.WholesalerPurchasePrice = ServiceHelper.formatCurrency(Number(ed.WholesalerPurchasePrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerContractPrice = ServiceHelper.formatCurrency(Number(ed.WholesalerContractPrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WartoscPNM = ServiceHelper.formatCurrency(Number(ed.WartoscPNM), countryCodeLocals[CountryCode], 2, 2);
			ed.RoznicaCenaZakupuPNM = ServiceHelper.formatCurrency(Number(ed.RoznicaCenaZakupuPNM), countryCodeLocals[CountryCode], 2, 2);
			ed.IloscSztukDoWyrownania = ServiceHelper.formatCurrency(Number(ed.IloscSztukDoWyrownania), countryCodeLocals[CountryCode], 2, 2);
			ed.TotalWholesalerClaim = ServiceHelper.formatCurrency(Number(ed.TotalWholesalerClaim), countryCodeLocals[CountryCode], 2, 2);
		});

		const template = await SELECT.one.from(ExcelTemplate).where({ templateId: templateId });

		if (!template || !template.content) {
			return req.reject(404, 'No template found for templateid:' + templateId);
		}

		let excelStreamValue = XLSXHelper.generateXLSXByFile(template.content,{ excelData },1);

		req._.res.setHeader('Content-disposition', `attachment; filename=${template.filename}`);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return excelStreamValue;
		}
		catch(error){
            console.error('Error in ExtractApprovedClaim READ');
            return req.reject(403, error?.message||"Error in ExtractApprovedClaim");
        }
        
	});


    srv.after("UPDATE", "SalesReportFile", async (req, res) => {
		/**
		 * @param {Object} file - This is uploaded excel file
		 * @param {Function} bufferToArrayBuffer - Converting Content of Excel file from Buffer to Array buffer 
		 */
		try {
			let CWID = res.user.id;
			const file = await SELECT.one.from(SalesReportFile).where({DistributorID: req.DistributorID});

			if (!file) {
				res.warn(400, "The file appears to be corrupted. Please check the file and upload a valid SalesReport file." );
			}

			const fileFactory = CountryFileFormatterFactory.create(file?.content, req.FileType, req.FileName, req.CountryCode, req.DistributorID, req.FilePeriod, CWID);
			
			const result = await fileFactory.format();

			// Insert metadata into ContrastAgentSalesData
			await INSERT.into(ContrastAgentSalesData).entries(result.contrastAgentSalesData);

			//Insert metadata into ClaimFiles
			await INSERT.into(ClaimFiles).entries(result.claimFile);

			//Insert metadata into ClaimData
			await INSERT.into(ClaimData).entries(result.claimData);

			await DELETE.from(SalesReportFile).where({DistributorID: req.DistributorID});
		} catch (error) {
			console.error('Error in SalesReportUploadFile');
			return res.reject(400, error.message || 'An unexpected error occurred.')
		}		
		return res.reply("Sales Data uploaded successfully");
	});

	srv.on('approveRejectClaimFiles', async (req) => {
		try {
			const { claimFile_ID, countryCode, status, claimFileDetailPageURL } = req.data;

			const claimFile = await SELECT.one.from(ClaimFiles).where({ID: claimFile_ID});
			const claimFileStatus = await SELECT.one.from(ClaimFileStatusView).where({ClaimFiles_ID: claimFile_ID});
			const approvals = await SELECT.from(ClaimApprovals).where({ClaimFiles_ID: claimFile_ID});
			const currentApprover = approvals.find(approval => approval.ApproverCWID === req.user.id);

			// Getting next level Approval
			const nextHierarchylvl = currentApprover.Hierarchy + 1;
			const nextHierarchyApproval = approvals.find(approval => approval.Hierarchy == nextHierarchylvl);

			// Validation messages
			const messages = {
				'rejected': 'Claim File rejected successfully',
				'approved': 'Claim File approved successfully',
				'notification': 'Approval notification sent to the next hierarchy level approver',
			}
			let validationAction = '';

			// If selected status is Approved and there is next level hierarchy approval then sending notification
			if (claimFileStatus?.STATUS?.toLowerCase() === 'pending' && status?.toLowerCase() === 'approved' && nextHierarchyApproval) {
				const approvalContentmapping = {
					CountryCode: countryCode,
					ApproverName: nextHierarchyApproval.ApproverName,
					WholesalerName: claimFile.DistributorName,
					ClaimFileDetailPageURL: claimFileDetailPageURL
				};
				await addOutgoingMail(req, approvalContentmapping, "ClaimFileApprovalNotificationMail", "Claim File for Review and Approval", nextHierarchyApproval?.ApproverEmail);
				validationAction = 'notification';
			}

			if (!validationAction) {
				validationAction = status.toLowerCase();
			};

			// Updating Claim file and approvals statuses
			await UPDATE(ClaimApprovals).with({Status: status}).where({ClaimFiles_ID: claimFile_ID, ApproverCWID: currentApprover?.ApproverCWID});
			const updatedClaimFileStatus = await SELECT.one.from(ClaimFileStatusView).where({ClaimFiles_ID: claimFile_ID});
			await UPDATE(ClaimFiles).with({Status: updatedClaimFileStatus?.STATUS}).where({ID: claimFile_ID});

			return messages[validationAction];
			
		} catch (error) {
			console.error('Error in approveRejectClaimFiles');
			return req.reject(400, error.message || 'An unexpected error occurred.')
		}
	});

	const addOutgoingMail = async function (req, data, templateId, subject, recipients) {
		const mailTemplate = await getMailTemplate(templateId);
		const mappedData = mapDataToMail(req, data, mailTemplate, subject, recipients);

		await INSERT(mappedData).into(OutgoingMails);

	}

	const mapDataToMail = function (req, data, template, subject, recipients) {
		
        return {
            CountryCode: data.CountryCode,
            Sender: "FAST-Admin@bayer.com",
            Recipients: recipients,
            Subject: subject,
            MailBody: generateMailBody(template, {
                data: { 
                    content: data
                }
            }),
            Sent: false
        };
    }

    const generateMailBody = function (mail, data) {
        return Handlebars.compile("" + mail.content)(data);
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

};