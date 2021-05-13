//const CronJob = require('cron').CronJob;
const { CronJob } = require('cron');
const axios = require('axios');
const cds = require('@sap/cds');

module.exports = async () => {

  const model = await cds.load(['db', 'srv']);

  let db = cds.reflect(model);
  // const db = await cds.connect.to('db'); // connect to database service

  const {
    MercadoPublicoLicitacione
  } = db.entities("com.bayer.SXTENDER.IntegrationData");


  class MercadoPublico {

    constructor(){

      this.host = 'http://api.mercadopublico.cl';
      this.serviceUrl = 'servicios/v1/publico';
      this.ticket = '902EA5FB-1628-4220-8F75-4ABC4EEC569F';
      this.resources = {
        tenders: 'licitaciones.json'
      };
      this.consultationDate = this.dateToDDMMYYYY(new Date());

    }

    /**
     * Fetches Tenders and saves them to the DB
     * @returns {CronJob}
     */
    getTenders(){

      return new CronJob('*/10 * * * * *', async () => {

        const url = `${this.host}/${this.serviceUrl}/${this.resources.tenders}?fecha=${this.consultationDate}&ticket=${this.ticket}`;
        console.log(`Fetching Tenders from ${url}`);
  
        try {
  
          const results = await axios.get(url);
          const tenders = results.data.Listado;
  
          tenders.forEach(async tender => {

            try{
              const tenderDetails = await this.getTenderDetail(tender);

              // const newTenders = {
              //   ...tenderDetails.data.Listado[0]
              // };
              
  
              // const affectedRows = await cds.run(INSERT.into(MercadoPublicoLicitacione).entries(newTenders));
        
              // console.log(`Tender ${tenderDetails.CodigoExterno} successfully created in the DB`);


            }catch(err){
              throw new Error(err);
            }
          
          });
  
        }catch(err){
          console.log(err);
        }
        
      }); 

    }

    
    /**
     * Fetches Tender details for a given tender
     * @param {object} tender 
     * @returns {promise}
     */
    async getTenderDetail(tender) {
      const codigo = tender.CodigoExterno;
      const url = `${this.host}/${this.serviceUrl}/${this.resources.tenders}?codigo=${codigo}&ticket=${this.ticket}`;

      try{
        const result = await axios.get(url); 
      
        return result;

      }catch(err){
        console.log(err);
      }
     
    }

    /**
     * Formats given date to ddmmyyyy
     * @param {object} date 
     * @returns {string}
     */
    dateToDDMMYYYY(date) {
        var d = date.getDate();
        var m = date.getMonth() + 1;
        var y = date.getFullYear();
        return `${(d <= 9 ? '0' + d : d)}${(m<=9 ? '0' + m : m)}${y}`;
    }

  }

  const mercadoPublico = new MercadoPublico();

  return { mercadoPublico }

}