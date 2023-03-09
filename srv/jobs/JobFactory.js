const { ProcessMaterials, ProcessCustomers } = require('./ItalyJobs');
const PriceAgreementMailJob = require("./PriceAgreementMailJob");
const PriceAgreementPriceConditionNotificationMailJob = require("./PriceAgreementPriceConditionNotificationMailJob");
const PriceAgreementNotificationNetPriceAbovePVLJob = require("./PriceAgreementNotificationNetPriceAbovePVLJob");
const PriceAgreementNotificationNetPriceBelowFloorJob = require("./PriceAgreementNotificationNetPriceBelowFloorJob");
const ExtendPriceAgreements = require("./PriceAgreementJobs");
const ProcessSpainRappelData = require("./ProcessSpainRappelData");

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
            case this.jobNames.PriceAgreementNotificationNetPriceAbovePVLJob:
                return new PriceAgreementNotificationNetPriceAbovePVLJob(jobName,jobTime)
                break;
            case this.jobNames.PriceAgreementNotificationNetPriceBelowFloorJob:
                return new PriceAgreementNotificationNetPriceBelowFloorJob(jobName,jobTime)
                break;
            case this.jobNames.ExtendPriceAgreements:
                return new ExtendPriceAgreements(jobName,jobTime)
                break;
            case this.jobNames.ProcessSpainRappelData:
                return new ProcessSpainRappelData(jobName,jobTime)
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
            PriceAgreementNotificationNetPriceAbovePVLJob: "PriceAgreementNotificationNetPriceAbovePVLJob",
            PriceAgreementNotificationNetPriceBelowFloorJob: "PriceAgreementNotificationNetPriceBelowFloorJob",
            ExtendPriceAgreements: "ExtendPriceAgreements",
            ProcessSpainRappelData: "ProcessSpainRappelData"
        };
    }
}