const BaseFile = require('./BaseFile');

module.exports = class FixFile extends BaseFile {

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

};