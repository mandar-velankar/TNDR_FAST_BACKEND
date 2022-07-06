const { ProcessMaterials, ProcessCustomers } = require('./ItalyJobs');
const PriceAgreementMailJob = require("./PriceAgreementMailJob");
const PriceAgreementPriceConditionNotificationMailJob = require("./PriceAgreementPriceConditionNotificationMailJob");
const ExtendPriceAgreements = require("./PriceAgreementJobs");

module.exports = class JobFactory {
    static create(jobName, jobTime) {
        switch (jobName) {
            case this.jobNames.ProcessMaterialsJob:
                return new ProcessMaterials(jobName,jobTime)
                break;
            case this.jobNames.ProcessCustomersJob:
                return new ProcessCustomers(jobName,jobTime)
                break;
            case this.jobNames.PriceAgreementMailJob:
                return new PriceAgreementMailJob(jobName,jobTime)
                break;
            case this.jobNames.PriceAgreementPriceConditionNotificationMailJob:
                return new PriceAgreementPriceConditionNotificationMailJob(jobName,jobTime)
                break;
            case this.jobNames.ExtendPriceAgreements:
                return new ExtendPriceAgreements(jobName,jobTime)
                break;
            default:
                throw new Error('Job type not supported');
                break;
        }
    }
    static get jobNames() {
        return {
            ProcessMaterialsJob: "ProcessMaterialsJob",
            ProcessCustomersJob: "ProcessCustomersJob",
            PriceAgreementMailJob: "PriceAgreementMailJob",
            PriceAgreementPriceConditionNotificationMailJob: "PriceAgreementPriceConditionNotificationMailJob",
            ExtendPriceAgreements: "ExtendPriceAgreements"
        };
    }
}