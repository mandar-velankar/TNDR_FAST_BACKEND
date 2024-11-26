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
		ContrastAgentSalesDataNL,
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
		ExtractApprovedClaim,
        PLExtractClaimFilesView,
        NLExtractClaimFilesView,
		ExtractClaimDataView,
        ClaimDataBrandsView,
		ExtractFASTOffer,
		ClaimApproverTypes,
		ClaimApprovals,
		ClaimFileStatusView,
		ExcelClaimFileSalesReportTemplate
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
		const {templateId, CountryCode, DistributorID, BrandId, templateName, DateFrom, DateTo} = req.data;

		const template = await SELECT.one.from(ExcelClaimFileSalesReportTemplate).where({ templateId: templateId });

		// Getting full where query
		const query = buildClaimSalesReportFullWhereQuery(CountryCode, templateName, DistributorID, DateFrom, DateTo, BrandId);
        const salesReportExtract = await tx.run(query);
		
		const excelData = formattedClaimFilesSalesReportExtract(salesReportExtract, CountryCode);
		
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

	const buildClaimSalesReportFullWhereQuery = function (CountryCode, templateName, DistributorID, DateFrom, DateTo, BrandId) {
		// Statuses based on selected Sales Report template name
		const statuses = {
			"NL": {
				"excludepending": [`'Approved (All QC Passed)'`, `'Approved (Some QC Failed)'`],
				"includepending": [`'Approved (All QC Passed)'`, `'Approved (Some QC Failed)'`, `'Pending'`],
			},
			"PL": {
				"excludepending": [`'Approved (All QC Passed)'`],
				"includepending": [`'Approved (All QC Passed)'`, `'Pending'`],
			}
		};

		// Build full wheres
		const countryCodeFullWhere = (CountryCode && ServiceHelper.buildFullWhere('CountryCode', '=', CountryCode)) || [];
		const statusFullWhere = ServiceHelper.buildWhereExpression('ClaimFileStatus', 'or', statuses[CountryCode][templateName]) || [];
      	const wholesalerFullWhere = (DistributorID && ServiceHelper.buildFullWhere('DistributorID', '=', DistributorID)) || [];
		const dateFromFullWhere =  (DateTo && ServiceHelper.buildFullWhere('DateFrom', '<=', DateTo)) || [];
		const dateToFullWhere =  (DateFrom && ServiceHelper.buildFullWhere('DateTo', '>=', DateFrom)) || [];
		const brandFullWhere = BrandId && BrandId !== 'All_Brands' ? ServiceHelper.buildFullWhere('BrandId', '=', BrandId) : [];

		const entity = CountryCode === 'NL' ? NLExtractClaimFilesView : PLExtractClaimFilesView;
		
		// return fullwhere query
		return SELECT.from(entity)
				.where(countryCodeFullWhere)
				.where(statusFullWhere)
				.where(wholesalerFullWhere)
				.where(dateFromFullWhere)
				.where(dateToFullWhere)
				.where(brandFullWhere);
	};

	const formattedClaimFilesSalesReportExtract = function (excelData, CountryCode) {
		const countryCodeLocals = {
			'NL': 'nl-NL',
			'PL': 'en-US'
		}
	
		excelData.forEach(ed => {
			// Format Quantities
			ed.Quantity = ServiceHelper.formatNumber(Number(ed.Quantity), 0, 0);
			ed.QuantityML = ServiceHelper.formatNumber(Number(ed.QuantityML), 0, 0);
			ed.ContractBrandUsage = ServiceHelper.formatNumber(Number(ed.ContractBrandUsage), 0, 0);
			ed.BrandUsedCalculatedVolume = ServiceHelper.formatNumber(Number(ed.BrandUsedCalculatedVolume), 0, 0);
			ed.BrandContractCalculatedVolume = ServiceHelper.formatNumber(Number(ed.BrandContractCalculatedVolume), 0, 0);

			// Format Prices
			ed.WholesalerContractPrice = ServiceHelper.formatCurrency(Number(ed.WholesalerContractPrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerPurchasedAmount = ServiceHelper.formatCurrency(Number(ed.WholesalerPurchasedAmount), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTContractPrice = ServiceHelper.formatCurrency(Number(ed.FASTContractPrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerPurchasePrice = ServiceHelper.formatCurrency(Number(ed.WholesalerPurchasePrice), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTWholesalerPurchasePrice = ServiceHelper.formatCurrency(Number(ed.FASTWholesalerPurchasePrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerClaim1 = ServiceHelper.formatCurrency(Number(ed.WholesalerClaim1), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTClaim1 = ServiceHelper.formatCurrency(Number(ed.FASTClaim1), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerClaim2 = ServiceHelper.formatCurrency(Number(ed.WholesalerClaim2), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTClaim2 = ServiceHelper.formatCurrency(Number(ed.FASTClaim2), countryCodeLocals[CountryCode], 2, 2);
			ed.TotalWholesalerClaim = ServiceHelper.formatCurrency(Number(ed.TotalWholesalerClaim), countryCodeLocals[CountryCode], 2, 2);
			ed.TotalFASTClaim = ServiceHelper.formatCurrency(Number(ed.TotalFASTClaim), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerPurchaseAmount = ServiceHelper.formatCurrency(Number(ed.WholesalerPurchaseAmount), countryCodeLocals[CountryCode], 2, 2);
			ed.NetSales = ServiceHelper.formatCurrency(Number(ed.NetSales), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTDistributionArrangement = ed.FASTDistributionArrangement || 0;
			ed.FASTDistributionArrangement = ed.FASTDistributionAgreementType === 'Fixed' ? ServiceHelper.formatCurrency(Number(ed.FASTDistributionArrangement), countryCodeLocals[CountryCode], 2, 2) : (Number(ed.FASTDistributionArrangement) * 100).toFixed(2)
			ed.FASTPendingCorrection = ed.FASTPendingCorrection && ed.Type === 'Correction' ? ServiceHelper.formatCurrency(Number(ed.FASTPendingCorrection), countryCodeLocals[CountryCode], 2, 2) : '';
			ed.Balance = ed.Balance && ServiceHelper.formatCurrency(Number(ed.Balance), countryCodeLocals[CountryCode], 2, 2);

			// Format Date
			ed.Date = ed.Date && ServiceHelper.formatDate(ed.Date, '', 'DD-MM-YYYY');
			ed.ClaimApprovalModifiedAt = ed.ClaimApprovalModifiedAt && ServiceHelper.formatDate(ed.ClaimApprovalModifiedAt, '', 'DD-MM-YYYY');
		});

		return excelData
	}


	srv.on('READ', 'ExtractApprovedClaim', async (req, next) => {
		try{
		const tx = cds.tx(req);
		let query;
		const {templateId, ClaimFileID, CountryCode, Brand, Status, Type} = req.data;
		let whereBrand, whereStatus, whereType;

			if (CountryCode === 'PL') {
				query = SELECT.from(PLExtractClaimFilesView).where({ClaimFileID: ClaimFileID});

	
				if (templateId === 'PLClaimDataFilteredFiles') {
					whereBrand = Brand && Brand !== 'All_Brands' ? ServiceHelper.buildFullWhere('BrandId', '=', Brand) : [];

					whereStatus = Status ? ServiceHelper.buildFullWhere('Status', '=', Status) : [];
					
					whereType = Type ?  ServiceHelper.buildFullWhere('Type', '=', Type) : [];
					
					query = query.where(whereBrand).where(whereStatus).where(whereType);
				}
			}else{
				query = SELECT.from(NLExtractClaimFilesView).where({ClaimFileID: ClaimFileID});
	
				if (templateId === 'NLClaimDataFilteredFiles') {
					let QCPassedStatus = {
						'failedpricecheck' : 'QC1Passed',
						'faileddistributioncheck' : 'QC2Passed'
					}
					whereBrand = Brand && Brand !== 'All_Brands' ? ServiceHelper.buildFullWhere('BrandId', '=', Brand) : [];

					if (QCPassedStatus[Status]) {
						whereStatus = Status ? ServiceHelper.buildFullWhere(QCPassedStatus[Status], '=', false) : [];
					}else{
						whereStatus = Status ? ServiceHelper.buildFullWhere('ClaimDataStatus', '=', Status) : [];
					}
					
					whereType = Type ?  ServiceHelper.buildFullWhere('Type', '=', Type) : [];
					
					query = query.where(whereBrand).where(whereStatus).where(whereType);
				}
			}

	
        const excelData = await tx.run(query);

		const formattedData = formattingExcelValue(excelData, CountryCode)
		

		const template = await SELECT.one.from(ExcelClaimFileSalesReportTemplate).where({ templateId: templateId });

		if (!template || !template.content) {
			return req.reject(404, 'No template found for templateid:' + templateId);
		}

		let excelStreamValue = XLSXHelper.generateXLSXByFile(template.content,{ excelData: formattedData },1);

		req._.res.setHeader('Content-disposition', `attachment; filename=${template.filename}`);
		req._.res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		return excelStreamValue;
		}
		catch(error){
            console.error('Error in ExtractApprovedClaim READ');
            return req.reject(403, error?.message||"Error in ExtractApprovedClaim");
        }
        
	});

	const formattingExcelValue = function (excelData, CountryCode) {
		const countryCodeLocals = {
			'NL': 'nl-NL',
			'PL': 'en-US'
		}
		 excelData.forEach(ed => {
			ed.Quantity = ServiceHelper.formatNumber(Number(ed.Quantity), 0, 0);
			ed.WholesalerPurchasePrice = ServiceHelper.formatCurrency(Number(ed.WholesalerPurchasePrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerContractPrice = ServiceHelper.formatCurrency(Number(ed.WholesalerContractPrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WartoscPNM = ServiceHelper.formatCurrency(Number(ed.WartoscPNM), countryCodeLocals[CountryCode], 2, 2);
			ed.RoznicaCenaZakupuPNM = ServiceHelper.formatCurrency(Number(ed.RoznicaCenaZakupuPNM), countryCodeLocals[CountryCode], 2, 2);
			ed.IloscSztukDoWyrownania = ServiceHelper.formatCurrency(Number(ed.IloscSztukDoWyrownania), countryCodeLocals[CountryCode], 2, 2);
			ed.TotalWholesalerClaim = ServiceHelper.formatCurrency(Number(ed.TotalWholesalerClaim), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTContractPrice = ServiceHelper.formatCurrency(Number(ed.FASTContractPrice), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTWholesalerPurchasePrice = ServiceHelper.formatCurrency(Number(ed.FASTWholesalerPurchasePrice), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerClaim1 = ServiceHelper.formatCurrency(Number(ed.WholesalerClaim1), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTClaim1 = ServiceHelper.formatCurrency(Number(ed.FASTClaim1), countryCodeLocals[CountryCode], 2, 2);
			ed.WholesalerClaim2 = ServiceHelper.formatCurrency(Number(ed.WholesalerClaim2), countryCodeLocals[CountryCode], 2, 2);
			ed.FASTClaim2 = ServiceHelper.formatCurrency(Number(ed.FASTClaim2), countryCodeLocals[CountryCode], 2, 2);
			ed.TotalFASTClaim = ServiceHelper.formatCurrency(Number(ed.TotalFASTClaim), countryCodeLocals[CountryCode], 2, 2);
			ed.TotalFASTClaim = ServiceHelper.formatCurrency(Number(ed.TotalFASTClaim), countryCodeLocals[CountryCode], 2, 2);
			ed.Balance = ServiceHelper.formatCurrency(Number(ed.Balance), countryCodeLocals[CountryCode], 2, 2);
			ed.ClaimApprovalModifiedAt = ed.ClaimApprovalModifiedAt && ServiceHelper.formatDate(ed.ClaimApprovalModifiedAt, '', 'DD-MM-YYYY');
			ed.Date = ed.Date && ServiceHelper.formatDate(ed.Date, '', 'DD-MM-YYYY');
		});
		return excelData
	}
    srv.after("UPDATE", "SalesReportFile", async (req, res) => {
		/**
		 * @param {Object} file - This is uploaded excel file
		 * @param {Function} bufferToArrayBuffer - Converting Content of Excel file from Buffer to Array buffer 
		 */
		// try {
			let CWID = res.user.id;
			const file = await SELECT.one.from(SalesReportFile).where({DistributorID: req.DistributorID});

			if (!file) {
				res.warn(400, "The file appears to be corrupted. Please check the file and upload a valid SalesReport file." );
			}

			const fileFactory = CountryFileFormatterFactory.create(file?.content, req.FileType, req.FileName, req.CountryCode, req.DistributorID, req.FilePeriod, CWID);
			
			const result = await fileFactory.format();

			const claimApprovertypes = await SELECT.from(ClaimApproverTypes).where({CountryCode: req.CountryCode}); 

			const mappedClaimApprovals = mapClaimApprovals(claimApprovertypes, result.claimFile);

			// Insert metadata into ContrastAgentSalesData
			if(req.CountryCode === 'PL'){
				await INSERT.into(ContrastAgentSalesData).entries(result.contrastAgentSalesData);
			}else{
				await INSERT.into(ContrastAgentSalesDataNL).entries(result.contrastAgentSalesData);
			}

			//Insert metadata into ClaimFiles
			await INSERT.into(ClaimFiles).entries(result.claimFile);

			//Insert metadata into ClaimData
			await INSERT.into(ClaimData).entries(result.claimData);

			//Insert Claim Approvals
			await INSERT.into(ClaimApprovals).entries(mappedClaimApprovals);

			await DELETE.from(SalesReportFile).where({DistributorID: req.DistributorID});
		// } catch (error) {
		// 	console.error('Error in SalesReportUploadFile');
		// 	return res.reject(400, error.message || 'An unexpected error occurred.')
		// }		
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

			// Claim Notification mail template ids
			const templateIds = {
				"NL": "NLClaimFileApprovalNotificationMail",
				"PL": "PLClaimFileApprovalNotificationMail"
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
				await addOutgoingMail(req, approvalContentmapping, templateIds[countryCode], "Claim File for Review and Approval", nextHierarchyApproval?.ApproverEmail);
				validationAction = 'notification';
			}

			if (!validationAction) {
				validationAction = status.toLowerCase();
			};

			// Updating Claim file and approvals statuses
			await UPDATE(ClaimApprovals).with({Status: status}).where({ClaimFiles_ID: claimFile_ID, ApproverCWID: currentApprover?.ApproverCWID});
			const updatedClaimFileStatus = await SELECT.one.from(ClaimFileStatusView).where({ClaimFiles_ID: claimFile_ID});

			if (status?.toLowerCase() === 'approved') {
				await UPDATE(ClaimFiles).with({Status: updatedClaimFileStatus?.STATUS, ApprovalsCount: claimFile.ApprovalsCount + 1}).where({ID: claimFile_ID});
			}else {
				await UPDATE(ClaimFiles).with({Status: updatedClaimFileStatus?.STATUS}).where({ID: claimFile_ID});
			}

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

	function mapClaimApprovals(claimApprovertypes, claimFile) {

		console.log(`JOB (${this.jobName }): Mapping ClaimsApprovals ...`);
		claimApprovertypes = claimApprovertypes.reduce((prev, curr, idx, claimApprovertypes) => {
			prev.push(
				{
					ApproverName: curr.ApproverName,
					ApproverEmail: curr.ApproverEmail,
					ApproverCWID: curr.ApproverCWID,
					Hierarchy: curr.Hierarchy,
					Status: "Pending",
					ClaimFiles_ID: claimFile.ID
				}
			);
			return prev;
		}, []);
		return claimApprovertypes;
	}

};