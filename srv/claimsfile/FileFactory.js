const XlsxFile = require('./XlsxFile');

module.exports = class FileFactory {
    static create(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        switch (type.toUpperCase()) {
            case this.fileTypes.XLSM:
                return new XlsxFile(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            case this.fileTypes.XLSX:
                return new XlsxFile(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            default:
                throw new Error('file type not supported');
                break;
        }
    }
    static get fileTypes() {
        return {
            XLSM: "XLSM",
            XLSX: "XLSX"
        };
    }
}