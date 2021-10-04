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

    srv.on('createBrazilContract', async req => {

      const url = "https://y100134-iflmap.hcisbp.eu1.hana.ondemand.com/http/BAY3_X01_8B_SD_RFC_TBN_CONTRACTFT";
      const API_USER = "S0021326681";
      const API_PASSWORD = "CP1m4chtSp4ß";
      const requestData = '{"_-BAY3_-8B_SD_RFC_TBN_CONTRACTFT":{"IV_DIVISION":"08","IV_DOC_TYPE":"ZWCT","IV_PARTNER":"3185848","IV_PO_DATE":"20210802","IV_PO_NUMBER":"TESTE","IV_PR_DATE":"20210802","IV_SALES_ORG":"MWHC","IV_SIMULATE":"X","IV_VALID_F":"20210802","IV_VALID_T":"20210802","TT_ITEMS":{"item":{"ITEM":"10","MATERIAL":"82961489","UNIT_PRICE":"851.53","UNIT_PRICE_M":null,"MANUAL_D":"-7.50","EFFORT_A":null,"CAP":"-30","TX_ICMS":null,"ITEM_QTD":"100"}},"TT_CONTRACT_DETAILS":{"item":{"ITM_NUM":"10","MATERIAL":"82961489","TAX_AMOUNT":"8251.41","NET_VALUE":"35176.61"}}}}';
    
      let result = '';
      
      let axiosConfig = {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8'
        },
        auth:{
          username: API_USER,
          password: API_PASSWORD
        } // when testing locally, comment out the proxy
        /*proxy: {
          host: PROXY_HOST,
          port: PROXY_PORT
        }*/
      };
        
      try{
        result = await axios.post(url, requestData, axiosConfig);
      }catch(error){
        console.log(error);
      }

      return JSON.stringify(result.data);

    });



}