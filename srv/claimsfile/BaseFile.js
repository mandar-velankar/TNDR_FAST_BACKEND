const cds = require('@sap/cds');

class BaseFile {
    constructor(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        if (!file) {
            throw new Error('ERR_INVALID_ARG_VALUE');
        }
        this.file = file;
        this.type = type;
        this.name = name;
        this.countryCode = countryCode;
        this.distributorId = distributorId;
        this.filePeriod = filePeriod;
        this.cwid = cwid;
    }
    async parse() {
        throw new Error('No implementation for this parse');
    }

    getFile(){
        return this.file;
    }

    getType(){
        return this.type;
    }

    getName(){
        return this.name;
    }

    getCountryCode(){
        return this.countryCode;
    }

    getDistrubutorId(){
        return this.distributorId;
    }

    getFilePeriod(){
        return this.filePeriod;
    }

    getCWID(){
        return this.cwid;
    }
}

module.exports = BaseFile;