const cds = require('@sap/cds');

module.exports = (srv) => {
	srv.on('getAccess', (req) => {
		return {
			tender: req.user.is('f_tndr_cag_tnd_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			ppa: req.user.is('f_tndr_cag_ppa_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			contract: req.user.is('f_tndr_cag_ctr_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			epa: req.user.is('f_tndr_cag_epa_user') || req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_technical_user'),
			cpi: req.user.is('f_tndr_cag_admin') || req.user.is('f_tndr_cag_cpi_user')
		};
    });
};