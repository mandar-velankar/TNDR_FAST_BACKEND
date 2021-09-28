const cds = require('@sap/cds');
const R = require('ramda');
const axios = require('axios');
const ServiceHelper = require('./utils/ServiceHelper');

module.exports = (srv) => {


    // srv.after('READ', 'Contracts', (contracts, req) => {
    //     const tx = cds.transaction(req);
    //     // const queryOptions = req._.odataReq.getQueryOptions();

    //     contracts.map(async contract => {
            
    //         //Calculate offervalue
    //         const products = contract.Products;

    //         const offerValue = products && products.reduce((total, product) => (total + product.NspPerUnit) * product.Quantity, 0);
    //         contract.OfferValue = offerValue;
    //     });
        
    // })

    srv.on('createBrazilContract', (req) => {

      const url = "https://y100134-iflmap.hcisbp.eu1.hana.ondemand.com/http/BAY3_X01_8B_SD_RFC_TBN_CONTRACTFT";
      const API_USER = "S0021213202";
      const API_PASSWORD = "C0mpli@nT";
      const requestData = "{\n  \"_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT\": {\n   \"IV_DIVISION\": \"08\",\n   \"IV_DOC_TYPE\": \"ZWCT\",\n   \"IV_PARTNER\": \"3185848\",\n   \"IV_PO_DATE\": \"20210802\",\n   \"IV_PO_NUMBER\": \"TESTE\",\n   \"IV_PR_DATE\": \"20210802\",\n   \"IV_SALES_ORG\": \"MWHC\",\n   \"IV_SIMULATE\": \"X\",\n   \"IV_VALID_F\": \"20210802\",\n   \"IV_VALID_T\": \"20210802\",\n   \"TT_ITEMS\": {\n      \"item\": {\n         \"ITEM\": \"10\",\n         \"MATERIAL\": \"82961489\",\n         \"UNIT_PRICE\": \"851.53\",\n         \"UNIT_PRICE_M\": null,\n         \"MANUAL_D\": \"-7.50\",\n         \"EFFORT_A\": null,\n         \"CAP\": \"-30\",\n         \"TX_ICMS\": null,\n         \"ITEM_QTD\": \"100\"\n      }\n   },\n   \"TT_CONTRACT_DETAILS\": {\n       \"item\": {\n         \"ITM_NUM\": \"10\",\n         \"MATERIAL\": \"82961489\",\n         \"TAX_AMOUNT\": \"8251.41\",\n         \"NET_VALUE\": \"35176.61\"\n      }\n   }\n  }\n}";
      
      let result = "";
        
      try{
        axios.get(url, {
            auth:{
              username: API_USER,
              password: API_PASSWORD
            }, // when testing locally, comment out the proxy
            /*proxy: {
              host: PROXY_HOST,
              port: PROXY_PORT
            }*/
          }).then(successHandler).catch(errorHandler);
      }catch(error){
        console.log(error);
      }

      function successHandler(response) {
        result = response;
      }

      async function errorHandler(error) {
        throw new Error(error);
      }


        return "{'response':'test'}";

    });



}