const cds = require('@sap/cds');
const R = require('ramda');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {
    srv.on("createSalesOrder", async req => {
        const tx = cds.tx(req);
        const salesOrderProducts = await tx.run(SELECT.from(SalesOrderProducts).where({ SalesOrder_ID: req.data.salesOrderID }));
    });
    function getSalesOrderRequestBodyTemplate () {
        return {
            "_-BAY3_-8B_SD_RFC_TBN_SALESORD": {
              "IV_CONTRACT": "0041010261",
              "IV_DOC_TYPE": "ZWTB",
              "IV_DIVISION": "16",
              "IV_SALES_ORG": "MWHC",
              "TT_ITEMS": {
                  "item": [
                      {
                          "ITEM": "000001",
                          "MATERIAL": "000000000004432952",
                          "ITEM_QTD": "90",
                          "IV_TEXT": "Brazil Workshop Test"
                      },{
                          "ITEM": "000002",
                          "MATERIAL": "000000000004432952",
                          "ITEM_QTD": "90",
                          "IV_TEXT": "Brazil Workshop Test"
                      }
                  ]
              }
            }
          }
    }
}