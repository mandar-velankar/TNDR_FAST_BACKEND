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
		OutgoingMails,
        OutgoingMailBodyUploads
    } = cds.entities("com.bayer.SXTENDER.TransactionalData");
	const {
		MailTemplate
	} = cds.entities("com.bayer.SXTENDER.AdminData");
    const {
        CandidateInstitutes,
        UserCountries
    } = cds.entities("StandardAppService");

    srv.on('getUserCountries', async(req)=>{
        const userCountries = await cds.run(SELECT.from(UserCountries));
        return {userCountries};
    })

    srv.on('getInstituteData', async(req)=>{
        const candidateInstituteData = await cds.run(SELECT.from(CandidateInstitutes));
        return {candidateInstituteData};
    })

    srv.on('completeMailBodyUpload', async (req) => {
        const { uploadId } = req.data;
        const tx = cds.tx(req);
        const upload = await tx.run(
            SELECT.one.from(OutgoingMailBodyUploads).where({ ID: uploadId })
        );

        if (!upload) {
            return req.reject(404, 'Outgoing mail body upload not found');
        }

        if (upload.Status === 'COMPLETED') {
            return true;
        }

        if (upload.Status !== 'UPLOADING') {
            return req.reject(409, 'Outgoing mail body upload is not pending');
        }

        if (!upload.Content) {
            return req.reject(400, 'Outgoing mail body upload has no content');
        }

        const mailId = uuidv4();
        const mailBody = await contentToString(upload.Content);
        await tx.run(
            INSERT.into(OutgoingMails).entries({
                ID: mailId,
                CountryCode: upload.CountryCode,
                TenderID: upload.TenderID,
                OfferID: upload.OfferID,
                Sender: upload.Sender,
                Recipients: upload.Recipients,
                Subject: upload.Subject,
                MailBody: mailBody,
                Sent: upload.Sent
            })
        );

        await tx.run(
            UPDATE(OutgoingMailBodyUploads)
                .set({
                    Status: 'COMPLETED',
                    mail_ID: mailId
                })
                .where({ ID: uploadId })
        );

        return true;
    });
};

async function contentToString(content) {
    if (typeof content === 'string') {
        return content;
    }

    if (Buffer.isBuffer(content)) {
        return content.toString('utf8');
    }

    if (content && content[Symbol.asyncIterator]) {
        const chunks = [];
        for await (const chunk of content) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString('utf8');
    }

    return Buffer.from(content).toString('utf8');
}
