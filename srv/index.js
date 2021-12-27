const express = require("express");
const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const args = process.argv.slice(2);
const host = "0.0.0.0";
const port = process.env.PORT || 4004;
const jobScheduler = require("./jobs/scheduler");

(async () => {
  const app = express();
  await cds.connect("db");

  const srv = await cds.load("./gen/");
  try{
    await cds.deploy(srv);
  }catch(ex){
    console.log(ex);
  }
  // OData V2
  app.use(proxy({path: "v2"}));
  // OData V4
  await cds.serve("EpaService").from("./gen/").in(app);
  await cds.serve("CatalogService").from("./gen/").in(app);
  await cds.serve("PolicyService").from("./gen/").in(app);
  await cds.serve("ContractService").from("./gen/").in(app);
  await cds.serve("AccessService").from("./gen/").in(app);
  await cds.serve("MasterDataManagementService").from("./gen/").in(app);
  await cds.serve("SalesOpportunityService").from("./gen/").in(app);
  await cds.serve("CreateOpportunityService").from("./gen/").in(app);
  await cds.serve("BankGuaranteeService").from("./gen/").in(app);
  await cds.serve("PriceAgreementService").from("./gen/").in(app);
  await cds.serve("CpiService").from("./gen/").in(app);
  await cds.serve("ExternalService").from("./gen/").in(app);
  
  // Scheduler Jobs
  const scheduler = await jobScheduler();
  scheduler.mercadoPublico.fetchTenders('00 00 * * *').start(); // runs every day at midnight server time '0 0 0 1/1 * ? *'
  //scheduler.mercadoPublico.fetchTenderResults('00 00 * * *').start();
  //scheduler.mercadoPublico.fetchPurchaseOrders('00 00 * * *').start();
  jobScheduler.ItalyJobs.processMaterials('00 00 * * *').start(); // TODO: check if this settings is correct
  jobScheduler.ItalyJobs.processCustomers('00 00 * * *').start(); // TODO: check if this settings is correct

    
  const server = app.listen(port, host, () => console.info(`app is listing at ${host}:${port}`));
  server.on("error", error => console.error(error.stack));
})();