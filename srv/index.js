const express = require("express");
const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const compression = require("compression");
const args = process.argv.slice(2);
const host = "0.0.0.0";
const port = process.env.PORT || 4004;

(async () => {
  const startTime = Date.now();
  console.log("[STARTUP] Beginning application initialization...");

  const app = express();

  // Step 1: Connect to database
  console.log("[STARTUP] Connecting to database...");
  const dbStartTime = Date.now();
  await cds.connect.to("db");
  console.log(`[STARTUP] Database connected in ${Date.now() - dbStartTime}ms`);

  // Step 2: Load and compile the CDS model ONCE upfront
  console.log("[STARTUP] Loading CDS model from ./gen/srv/...");
  const csnStartTime = Date.now();
  const csn = await cds.load("./gen/srv/");
  console.log(`[STARTUP] CDS model loaded in ${Date.now() - csnStartTime}ms`);

  // Step 3: Deploy the model
  try {
    console.log("[STARTUP] Deploying CDS model...");
    const deployStartTime = Date.now();
    await cds.deploy(csn);
    console.log(`[STARTUP] CDS model deployed in ${Date.now() - deployStartTime}ms`);
  } catch (ex) {
    console.error("[STARTUP] Deploy error:", ex);
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

  // Step 4: OData V4 - CatalogService must be ready before server starts
  console.log("[STARTUP] Initializing CatalogService and AccessService (required before server start)...");
  const catalogStartTime = Date.now();
  await cds.serve("CatalogService").from(csn).in(app);
  await cds.serve("AccessService").from(csn).in(app);
  await cds.serve("EpaService").from(csn).in(app);
  await cds.serve("PolicyService").from(csn).in(app);
  await cds.serve("ContractService").from(csn).in(app);
  await cds.serve("MasterDataManagementService").from(csn).in(app);
  await cds.serve("SalesOpportunityService").from(csn).in(app);
  await cds.serve("CreateOpportunityService").from(csn).in(app);
  await cds.serve("BankGuaranteeService").from(csn).in(app);
  await cds.serve("PriceAgreementService").from(csn).in(app);
  await cds.serve("CpiService").from(csn).in(app);
  await cds.serve("BrazilContractingService").from(csn).in(app);
  await cds.serve("StandardAppService").from(csn).in(app);
  await cds.serve("ClaimsService").from(csn).in(app);
  await cds.serve("UITemplateService").from(csn).in(app);
  await cds.serve("ExternalService").from(csn).in(app);
  console.log(`[STARTUP] CatalogService and AccessService initialized in ${Date.now() - catalogStartTime}ms`);

  // Step 5: Load remaining services in parallel
  // console.log("[STARTUP] Initializing remaining services in parallel...");
  // const servicesStartTime = Date.now();
  // await Promise.all([
  //   cds.serve("EpaService").from(csn).in(app),
  //   cds.serve("PolicyService").from(csn).in(app),
  //   cds.serve("ContractService").from(csn).in(app),
  //   cds.serve("MasterDataManagementService").from(csn).in(app),
  //   cds.serve("SalesOpportunityService").from(csn).in(app),
  //   cds.serve("CreateOpportunityService").from(csn).in(app),
  //   cds.serve("BankGuaranteeService").from(csn).in(app),
  //   cds.serve("PriceAgreementService").from(csn).in(app),
  //   cds.serve("CpiService").from(csn).in(app),
  //   cds.serve("BrazilContractingService").from(csn).in(app),
  //   cds.serve("StandardAppService").from(csn).in(app),
  //   cds.serve("ClaimsService").from(csn).in(app),
  //   cds.serve("UITemplateService").from(csn).in(app),
  //   cds.serve("ExternalService").from(csn).in(app)
  // ]);
  // console.log(`[STARTUP] All remaining services initialized in ${Date.now() - servicesStartTime}ms`);

  // Step 6: Start server
  console.log("[STARTUP] Starting HTTP server...");
  const server = app.listen(port, host, () => {
    console.log(`[STARTUP] Server listening at ${host}:${port}`);
    console.log(`[STARTUP] Total startup time: ${Date.now() - startTime}ms`);
  });
  server.on("error", error => console.error("[STARTUP] Server error:", error.stack));
})();
