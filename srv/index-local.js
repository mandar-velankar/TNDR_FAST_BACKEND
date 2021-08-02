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

  const srv = await cds.load("./srv/");
  try{
    await cds.deploy(srv);
  }catch(ex){
    console.log(ex);
  }
  // OData V2
  app.use(proxy({path: "v2"}));
  // OData V4
  await cds.serve("EpaService").from("./srv/").in(app);
  await cds.serve("CatalogService").from("./srv/").in(app);
  await cds.serve("PolicyService").from("./srv/").in(app);
  await cds.serve("ContractService").from("./srv/").in(app);
  await cds.serve("AccessService").from("./srv/").in(app);
  await cds.serve("MasterDataManagementService").from("./srv/").in(app);
  await cds.serve("SalesOpportunityService").from("./srv/").in(app);
  await cds.serve("CreateOpportunityService").from("./srv/").in(app);
  await cds.serve("CpiService").from("./srv/").in(app);
  await cds.serve("ExternalService").from("./srv/").in(app);

  // Jobs Scheduler
  const scheduler = await jobScheduler();
  scheduler.mercadoPublico.fetchTenders('00 00 * * *').start();
  scheduler.mercadoPublico.fetchTenderResults('00 00 * * *').start();
  scheduler.mercadoPublico.fetchPurchaseOrders('00 00 * * *').start();
  
  
  const server = app.listen(port, host, () => console.info(`app is listing at ${host}:${port}`));
  server.on("error", error => console.error(error.stack));
})();