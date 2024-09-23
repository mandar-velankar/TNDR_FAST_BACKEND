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

    srv.after('READ', 'PT_TMDIST', data => {
        const countryCode = data?.[0]?.CountryCode;
		data.unshift({
			ID: "99999999-9999-9999-9999-999999999999",
			CountryCode: countryCode,
            DistributorID: "",
            DistributorName: "All",
		})
	});
};