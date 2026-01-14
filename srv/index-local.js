const express = require("express");
const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const compression = require("compression");
const args = process.argv.slice(2);
const host = "localhost";
const port = process.env.PORT || 4004;
(async () => {
  const app = express();
  await cds.connect("db");

  const srv = await cds.load("./srv/");
  try{
    await cds.deploy(srv);
  }catch(ex){
    console.log(ex);
  }

function shouldCompress(req, res) {
  const type = res.getHeader("Content-Type");
  if (type && typeof type === "string" && type.startsWith("multipart/mixed")) {
    return true;
  }

  if (type && typeof type === "string" && type.startsWith("text/csv")) {
    return false;
  }

  if (type && typeof type === "string" && (type.startsWith("text/plain") && req.url.includes("TaiwanFASTData"))) {
    return false;
  }
  
  // fallback to standard filter function
  return compression.filter(req, res);
}
app.use(compression({ filter: shouldCompress }));
  // OData V2
  app.use(proxy({
    path: "v2",
    returnPrimitiveNested:false,
    returnComplexNested:false
}));
  // OData V4
  await cds.serve("EpaService").from("./srv/").in(app);
  await cds.serve("CatalogService").from("./srv/").in(app);
  await cds.serve("StandardAppService").from("./srv/").in(app);
  await cds.serve("ClaimsService").from("./srv/").in(app);
  await cds.serve("PolicyService").from("./srv/").in(app);
  await cds.serve("ContractService").from("./srv/").in(app);
  await cds.serve("AccessService").from("./srv/").in(app);
  await cds.serve("MasterDataManagementService").from("./srv/").in(app);
  await cds.serve("SalesOpportunityService").from("./srv/").in(app);
  await cds.serve("CreateOpportunityService").from("./srv/").in(app);
  await cds.serve("BankGuaranteeService").from("./srv").in(app);
  await cds.serve("PriceAgreementService").from("./srv").in(app);
  await cds.serve("CpiService").from("./srv/").in(app);
  await cds.serve("BrazilContractingService").from("./srv/").in(app);
  await cds.serve("UITemplateService").from("./srv/").in(app);
  await cds.serve("ExternalService").from("./srv/").in(app);

  const server = app.listen(port, host, () => console.info(`app is listing at ${host}:${port}`));
  server.on("error", error => console.error(error.stack));
})();