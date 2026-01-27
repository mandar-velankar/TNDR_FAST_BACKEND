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

  // Load and compile the CDS model ONCE upfront
  const csn = await cds.load("./srv/");
  try {
    await cds.deploy(csn);
  } catch (ex) {
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
    returnPrimitiveNested: false,
    returnComplexNested: false
  }));

  // OData V4 - CatalogService must be ready before server starts
  await cds.serve("CatalogService").from(csn).in(app);
  await cds.serve("AccessService").from(csn).in(app);

  // Load remaining services in background (no await)
  Promise.all([
    cds.serve("EpaService").from(csn).in(app),
    cds.serve("StandardAppService").from(csn).in(app),
    cds.serve("ClaimsService").from(csn).in(app),
    cds.serve("PolicyService").from(csn).in(app),
    cds.serve("ContractService").from(csn).in(app),
    cds.serve("MasterDataManagementService").from(csn).in(app),
    cds.serve("SalesOpportunityService").from(csn).in(app),
    cds.serve("CreateOpportunityService").from(csn).in(app),
    cds.serve("BankGuaranteeService").from(csn).in(app),
    cds.serve("PriceAgreementService").from(csn).in(app),
    cds.serve("CpiService").from(csn).in(app),
    cds.serve("BrazilContractingService").from(csn).in(app),
    cds.serve("UITemplateService").from(csn).in(app),
    cds.serve("ExternalService").from(csn).in(app)
  ]).then(() => console.info("All services initialized"))
    .catch(err => console.error("Service initialization error:", err));
  // Start server immediately after CatalogService is ready
  const server = app.listen(port, host, () => console.info(`app is listing at ${host}:${port}`));
  server.on("error", error => console.error(error.stack));

})();
