const PLFileFormatter = require("./PLFileFormatter");
const NLFileFormatter = require("./NLFileFormatter");

module.exports = class CountryFileFormatterFactory {
    static create(file, type, name, countryCode, distributorId, filePeriod, cwid) {
        switch (countryCode.toUpperCase()) {
            case this.countryCodeTypes.PL:
                return new PLFileFormatter(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            case this.countryCodeTypes.NL:
                return new NLFileFormatter(file, type, name, countryCode, distributorId, filePeriod, cwid)
                break;
            default:
                throw new Error('Country type not supported');
                break;
        }
    }
    static get countryCodeTypes() {
        return {
            PL: "PL",
            NL: "NL"
        };
    }
}