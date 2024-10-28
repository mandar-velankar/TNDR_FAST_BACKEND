const XlsxFile = require('./XlsxFile');
const TxtFile = require('./TxtFile');
const FixFile = require('./FixFile')

module.exports = class FileFactory {
    static create(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        switch (type.toUpperCase()) {
            case this.fileTypes.XLSM:
                return new XlsxFile(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            case this.fileTypes.XLSX:
                return new XlsxFile(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            case this.fileTypes.TXT:
                return new TxtFile(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            case this.fileTypes.FIX:
                return new FixFile(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            default:
                throw new Error('file type not supported');
                break;
        }
    }
    static get fileTypes() {
        return {
            XLSM: "XLSM",
            XLSX: "XLSX",
            TXT: "TXT",
            FIX: "FIX"
        };
    }
}