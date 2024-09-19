const cds = require('@sap/cds');

module.exports = (srv) => {
	srv.on('getAccess', (req) => {
		return {
			tender: req.user.is('f_tndr_cag_tnd_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			tenderAccess:{
				COGS:req.user.is('f_tndr_cag_cogs_user'),
				SPAINTENDERVIEW:req.user.is('f_tndr_cag_spaintenderview_user'),
				PHARMATENDERVIEW:req.user.is('f_tndr_cag_Pharmatenderview_user'),
				RADIOLOGYTENDERVIEW:req.user.is('f_tndr_cag_Radiologytenderview_user'),
				MEATENDERVIEW:req.user.is('f_tndr_cag_meatenderview_user')
				
			},
			adminAccess:{
				ConsumerPrices:req.user.is('f_tndr_cag_consumerprice_user'),
				DistributorManagememt:req.user.is('f_tndr_cag_distributormanagement_user'),
				DistributorManagementExclusiveAccess:req.user.is('f_tndr_cag_distributormanagementexclusiveaccess_user'),
				WPPManagementPowerApproverAccess: req.user.is('f_tndr_cag_wpppowerapproveraccess_user'),
				PPPManagementPowerApproverAccess: req.user.is('f_tndr_cag_ppppowerapproveraccess_user'),
				NLPricesManagementAccess: req.user.is('f_tndr_cag_nlpricesmanagement_user')
			},
			standardtenderAccess: {
				OverviewDownload: req.user.is('f_tnndr_cag_standardtenderdownload_user'),
				ZuelligExtract: req.user.is('f_tnndr_cag_standardtenderzuelligextract_user'),
            	LimitedPricingTabAccess: req.user.is('f_tndr_cag_standardtenderlimitedpricingtabaccess_user')
			},
			ppa: req.user.is('f_tndr_cag_ppa_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			contract: req.user.is('f_tndr_cag_ctr_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			epa: req.user.is('f_tndr_cag_epa_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			masterdata: req.user.is('f_tndr_cag_mdm_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			bankguarantees: req.user.is('f_tndr_cag_bankguarantees_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			priceagreements: req.user.is('f_tndr_cag_priceagreements_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			salesopportunity: req.user.is('f_tndr_cag_salesopportunity_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			createopportunity: req.user.is('f_tndr_cag_createopportunity_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			brazilcontracting: req.user.is('f_tndr_cag_brcontracting_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			cpi: req.user.is('f_tndr_cag_cpi_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			standardtender: req.user.is('f_tndr_cag_standardtender_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			whc: req.user.is('f_tndr_cag_whc_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user') || req.user.is('f_tndr_cag_whcapprover_user') || req.user.is('f_tndr_cag_whcproposalcreator_user'),
		};
    });
};