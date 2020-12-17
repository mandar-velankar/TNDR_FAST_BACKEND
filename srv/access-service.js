const cds = require('@sap/cds');

module.exports = (srv) => {
	srv.on('getAccess', (req) => {
		return {
			tender: req.user.is('f_tndr_cag_tnd_user'),
			ppa: req.user.is('f_tndr_cag_ext_user'),
			contract: req.user.is('f_tndr_cag_ctr_user'),
			epa: req.user.is('f_tndr_cag_epa_user')
		};
    });
};