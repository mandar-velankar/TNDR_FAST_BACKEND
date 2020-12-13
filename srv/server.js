"use strict";
const cds = require("@sap/cds");


const proxy = require("@sap/cds-odata-v2-adapter-proxy");
const port = process.env.PORT || 4004;
cds.on("bootstrap", app => app.use(proxy({
    path: "FAST",
    port: port
  })));
  cds.on ('serving', ({services})=>{
    console.log("listener");
  })
  cds.once ('served', ({services})=>{
    console.log("served")
  })
  cds.once ('listening', ({server,url})=>{
    console.log("listening")
  })
  // require("./scheduler");
module.exports = cds.server;