const cds = require('@sap/cds');
const XLSX = require("xlsx");
const moment = require('moment');
const XLSXHelper = require("./utils/XLSXHelper");
const Handlebars = require("handlebars");
const ServiceHelper = require('./utils/ServiceHelper');
const { v4: uuidv4 } = require('uuid');
const dataToJson = require("data-to-json");


module.exports = (srv) => {

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
        CandidateInstitutes
    } = cds.entities("StandardAppService");

    srv.on('getInstituteData', async(req)=>{
        const candidateInstituteData = await cds.run(SELECT.from(CandidateInstitutes));
        return {candidateInstituteData};
    })
};