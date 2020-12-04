var CronJob = require('cron').CronJob;
const axios = require('axios');
const cds = require('@sap/cds');

const {
    CountryBrandProducts, LegalEntityBrand, DirectBrand, DistributorBrand
} = cds.entities("com.bayer.SXTENDER.MasterDataViews");

var job = new CronJob('* * * * * *', function() {
  console.log('You will see this message every second');
}, null, true, 'America/Los_Angeles');
job.start();