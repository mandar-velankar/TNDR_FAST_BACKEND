const express = require("express");
const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const compression = require("compression");
const args = process.argv.slice(2);
const host = "0.0.0.0";
const port = process.env.PORT || 4004;
const jobManager = require("./jobs/JobManager");

(async () => {
  console.log("begin start app gen");
  const app = express();
  console.log("begin connect app gen");
  await cds.connect.to("db");
  let srv;

    console.log("load gen")
    srv = await cds.load("./gen/srv/");

  try {
    console.log("deploy")
    await cds.deploy(srv);
  } catch (ex) {
    console.log(ex);
  }
  function shouldCompress(req, res) {
    const type = res.getHeader("Content-Type");
    if (type && typeof type === "string" && type.startsWith("multipart/mixed")) {
      return true;
    }
    // fallback to standard filter function
    return compression.filter(req, res);
  }
  app.use(compression({ filter: shouldCompress }));
  // OData V2
  app.use(proxy({
    path: "v2",
    returnPrimitiveNested: false,
    returnComplexNested: false
  }));
  // OData V4
    await cds.serve("SchedulerService").from("./gen/srv/").in(app);
    await cds.serve("EpaService").from("./gen/srv/").in(app);
    await cds.serve("CatalogService").from("./gen/srv/").in(app);
    await cds.serve("PolicyService").from("./gen/srv/").in(app);
    await cds.serve("ContractService").from("./gen/srv/").in(app);
    await cds.serve("AccessService").from("./gen/srv/").in(app);
    await cds.serve("MasterDataManagementService").from("./gen/srv/").in(app);
    await cds.serve("SalesOpportunityService").from("./gen/srv/").in(app);
    await cds.serve("CreateOpportunityService").from("./gen/srv/").in(app);
    await cds.serve("BankGuaranteeService").from("./gen/srv/").in(app);
    await cds.serve("PriceAgreementService").from("./gen/srv/").in(app);
    await cds.serve("CpiService").from("./gen/srv/").in(app);
    await cds.serve("BrazilContractingService").from("./gen/srv/").in(app);
    await cds.serve("StandardAppService").from("./gen/srv/").in(app);
    await cds.serve("ClaimsService").from("./gen/srv/").in(app);
    await cds.serve("UITemplateService").from("./gen/srv/").in(app);
    await cds.serve("ExternalService").from("./gen/srv/").in(app);

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