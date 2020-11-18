// load modules
const express = require("express");
const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const args = process.argv.slice(2);
// const model = args[0];
// config
const csn = 'gen/csn.json'
const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 4004;

(async () => {
  // create new app
  const app = express();
  
  // serve odata v4
  await cds.connect("db") // ensure database is connected!
  //console.log("db connected");
  await cds
	// .connect("db") // ensure database is connected!
  //.serve("all")//.serve(args[0])//.serve("all")//.serve(args[0])
  .serve("CatalogService")//.serve(args[0])//.serve("all")//.serve(args[0])
  .from(csn)
  .with('cat-service.js')
    .in(app);

    await cds
    // .connect("db") // ensure database is connected!
    //.serve("all")//.serve(args[0])//.serve("all")//.serve(args[0])
    .serve("EpaService")//.serve(args[0])//.serve("all")//.serve(args[0])
    .from(csn)
    .with('epa-service.js')
      .in(app);

      
    await cds
    // .connect("db") // ensure database is connected!
    //.serve("all")//.serve(args[0])//.serve("all")//.serve(args[0])
    .serve("ExternalService")//.serve(args[0])//.serve("all")//.serve(args[0])
    .from(csn)
      .in(app);

      await cds
      // .connect("db") // ensure database is connected!
      .serve("ContractService")//.serve(args[0])//.serve("all")//.serve(args[0])
      .from(csn)
      .with('ctr-service.js')
        .in(app);
console.log("serve started");
  // serve odata v2
  process.env.XS_APP_LOG_LEVEL = "info";
  app.use(
    proxy({
      // app
      path: "FAST"
      ,
			model: csn,
      // target
      port: port
    })
  );
  // start server
  const server = app.listen(port, host, () =>
    console.info(`app is listing at ${port}`)
  );
  server.on("error", error => console.error(error.stack));
})();
