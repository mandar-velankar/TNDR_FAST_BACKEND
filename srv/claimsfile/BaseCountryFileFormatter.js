const cds = require('@sap/cds');
const FileFactory = require('./FileFactory');

module.exports = class BaseCountryFileFormatter {
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

        const fileFactory = FileFactory.create(file, type);
			
        fileFactory.parse().then(data => {
            this.data = data;
        }).catch(error => {
            throw new Error('Error parsing file');
        });
    }

    async format(){
        throw new Error('No implementation for this format');
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

    getData(){
        return this.data;
    }
}