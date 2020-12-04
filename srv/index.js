const express = require("express");
const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const args = process.argv.slice(2);
const model = args[0];
const host = "0.0.0.0";
const port = process.env.PORT || 4004;

(async () => {
  const app = express();
  await cds.connect("db");

  const srv = await cds.load(["db","srv"]);
  try{
    await cds.deploy(srv);
  }catch(ex){
    console.log(ex);
  }
  // OData V2
  app.use(proxy({
    isoDateTimeOffset:false
  }));
  // OData V4
  await cds.serve("EpaService").from(model).in(app);
  await cds.serve("CatalogService").from(model).in(app);
//   await cds.serve("PolicyService").from(model).in(app);
  await cds.serve("ContractService").from(model).in(app);
  await cds.serve("ExternalService").from(model).in(app);
  
  const server = app.listen(port, host, () => console.info(`app is listing at ${host}:${port}`));
  server.on("error", error => console.error(error.stack));
})();