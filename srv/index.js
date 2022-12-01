const express = require("express");
const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const args = process.argv.slice(2);
const host = "0.0.0.0";
const port = process.env.PORT || 4004;
const jobManager = require("./jobs/JobManager");

(async () => {
  const app = express();
  await cds.connect("db");
  let srv;
  try {
    console.log("load gen")
    srv = await cds.load("./gen/");
  } catch (error) {
    console.log("error failed loading from gen")
  }
  try {
    console.log("load srv")
    srv = await cds.load("./srv/");
  } catch (error) {
    console.log("error failed loading from srv")
  }
  try {
    await cds.deploy(srv);
  } catch (ex) {
    console.log(ex);
  }
  // OData V2
  app.use(proxy({
    path: "v2",
    returnPrimitiveNested: false,
    returnComplexNested: false
  }));
  // OData V4
  try {
    console.log("load gen")
    await cds.serve("SchedulerService").from("./gen/").in(app);
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
  } catch (error) {
    console.log("error failed loading from gen")
  }
  try {
    console.log("load srv")
    await cds.serve("SchedulerService").from("./srv/").in(app);
    await cds.serve("EpaService").from("./srv/").in(app);
    await cds.serve("CatalogService").from("./srv/").in(app);
    await cds.serve("PolicyService").from("./srv/").in(app);
    await cds.serve("ContractService").from("./srv/").in(app);
    await cds.serve("AccessService").from("./srv/").in(app);
    await cds.serve("MasterDataManagementService").from("./srv/").in(app);
    await cds.serve("SalesOpportunityService").from("./srv/").in(app);
    await cds.serve("CreateOpportunityService").from("./srv/").in(app);
    await cds.serve("BankGuaranteeService").from("./srv/").in(app);
    await cds.serve("PriceAgreementService").from("./srv/").in(app);
    await cds.serve("CpiService").from("./srv/").in(app);
    await cds.serve("ExternalService").from("./srv/").in(app);
  } catch (error) {
    console.log("error failed loading from srv")
  }

  console.log("register jobs")
  // Scheduler Jobs
  jobManager.registerJobs();
  // const scheduler = await jobScheduler();
  // //TODO: only start if config is available => start via api from now on
  // scheduler.mercadoPublico.fetchTenders();//.start(); // runs every day at midnight server time '0 0 0 1/1 * ? *'
  // //scheduler.mercadoPublico.fetchTenderResults('00 00 * * *').start();
  // //scheduler.mercadoPublico.fetchPurchaseOrders('00 00 * * *').start();
  // jobScheduler.ItalyJobs.processMaterials('00 00 * * *').start(); // TODO: check if this settings is correct
  // jobScheduler.ItalyJobs.processCustomers('00 00 * * *').start(); // TODO: check if this settings is correct

  console.log("start")

  const server = app.listen(port, host, () => console.info(`app is listing at ${host}:${port}`));
  server.on("error", error => console.error(error.stack));
})();