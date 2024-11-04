const cds = require('@sap/cds');
const BaseFile = require('./BaseFile');
const cfenv = require("cfenv");
const XLSX = require("xlsx");
const moment = require('moment');
const XLSXHelper = require("../utils/XLSXHelper");
const ServiceHelper = require('../utils/ServiceHelper');
const { v4: uuidv4 } = require('uuid');
const dataToJson = require("data-to-json");
const Handlebars = require("handlebars");

module.exports = class TxtFile extends BaseFile {

    constructor(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        super(file, type, name, countryCode, distributorId, filePeriod, cwid);
    }

    //override
    async parse() {

        console.log('Processing reminder mails for Price Agreements started ...');

        try {

            const text = this.file.toString('utf8');
            const lines = text.split('\n');
            
            return lines;

        } catch (error) {
            console.error(error);
        }

        console.log('Processing reminder mails for Price Agreements finished.');
    }

	bufferToArrayBuffer(buffer) {
		const arrayBuffer = new ArrayBuffer(buffer.length);
		const view = new Uint8Array(arrayBuffer);
		for (let i = 0; i < buffer.length; ++i) {
		  view[i] = buffer[i];
		}
		return arrayBuffer;
	}

};