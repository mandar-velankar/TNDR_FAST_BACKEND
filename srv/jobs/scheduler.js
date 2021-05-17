//const CronJob = require('cron').CronJob;
const { CronJob } = require('cron');
const rax = require('retry-axios');
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
      this.consultationDate = '16052021'; //this.dateToDDMMYYYY(new Date());

    }

    /**
     * Fetches Tenders and saves them to the DB
     * @returns {CronJob}
     */
    getTenders(){

      return new CronJob('*/40 * * * * *', async () => {

        const url = `${this.host}/${this.serviceUrl}/${this.resources.tenders}?fecha=${this.consultationDate}&ticket=${this.ticket}`;

        console.log(`\n\n-----------------\nFetching Tenders from ${url} \n`);
  
        try {
  
          const results = await axios.get(url);
          const tenders = results.data.Listado;
          const tenderDetails = [];


         for(let i = 0; i < tenders.length; i++){
            try {         

              const detail = await this.getTenderDetail(tenders[i].CodigoExterno);
              tenderDetails.push(detail.data.Listado[0]);
             
              console.log(`Data received: ${i}`);
            } catch (error) {
              console.log(`FAILED: ${i}`);
            }

         }

debugger;
        for(let a = 0; a < tenderDetails.length; a++){
            const ent = this.createTenderEntity(tenderDetails[a]);

            debugger;
        }

          // const affectedRows = await cds.run(INSERT.into(MercadoPublicoLicitacione).entries(newTenders));
    
          // console.log(`Tender ${tenderDetails.CodigoExterno} successfully created in the DB`);


        }catch(err){
          if(err.response){
            console.log(`\n\nERROR: \n ${err.response.data.Mensaje} for \n ${err.response.config.url}\n`);
          }
          
        }
        
      }); 

    }

    createTenderEntity(tender){
      if(tender){

        const newTender = {
          ...tender,
          "FechaCreacion": tender.Fechas.FechaCreacion,
          "FechaCierre": tender.Fechas.FechaCierre,
          "FechaInicio": tender.Fechas.FechaInicio,
          "FechaFinal": tender.Fechas.FechaFinal,
          "FechaPubRespuestas": tender.Fechas.FechaPubRespuestas,
          "FechaActoAperturaTecnica": tender.Fechas.FechaActoAperturaTecnica,
          "FechaActoAperturaEconomica": tender.Fechas.FechaActoAperturaEconomica,
          "FechaPublicacion": tender.Fechas.FechaPublicacion,
          "FechaAdjudicacion": tender.Fechas.FechaAdjudicacion,
          "FechaEstimadaAdjudicacion": tender.Fechas.FechaEstimadaAdjudicacion,
          "FechaSoporteFisico": tender.Fechas.FechaSoporteFisico,
          "FechaTiempoEvaluacion": tender.Fechas.FechaTiempoEvaluacion,
          "FechaEstimadaFirma": tender.Fechas.FechaEstimadaFirma,
          "FechasUsuario": tender.Fechas.FechasUsuario,
          "FechaVisitaTerreno": tender.Fechas.FechaVisitaTerreno,
          "FechaEntregaAntecedentes": tender.Fechas.FechaEntregaAntecedentes,
          "AdjudicacionTipo": tender.Adjudicacion && tender.Adjudicacion.Tipo,
          "AdjudicacionFecha": tender.Adjudicacion && tender.Adjudicacion.Fecha,
          "AdjudicacionNumero": tender.Adjudicacion && tender.Adjudicacion.Numero,
          "AdjudicacionNumeroOferentes": tender.Adjudicacion && tender.Adjudicacion.NumeroOferentes,
          "AdjudicacionUrlActa": tender.Adjudicacion && tender.Adjudicacion.UrlActa,
          "Items": tender.Items && tender.Items.Listado.map(item => {
            return {
              "Correlativo" : item.Correlativo,
              "CodigoProducto": item.CodigoProducto,
              "CodigoCategoria": item.CodigoCategoria,
              "Categoria": item.Categoria,
              "NombreProducto": item.NombreProducto,
              "Descripcion": item.Descripcion,
              "UnidadMedida": item.UnidadMedida,
              "Cantidad": item.Cantidad,
              "AdjudicacionRutProveedor": item.Adjudicacion.RutProveedor,
              "AdjudicacionNombreProveedor": item.Adjudicacion.NombreProveedor,
              "AdjudicacionCantidad": item.Adjudicacion.Cantidad,
              "AdjudicacionMontoUnitario": item.Adjudicacion.MontoUnitario
            }
          })
        };

        delete newTender['Fechas'];
        delete newTender['Adjudicacion'];
        delete newTender['Items'];

        return newTender;

      }
    }

    
    /**
     * Fetches Tender details for a given tender
     * @param {object} tender 
     * @returns {promise}
     */
    async getTenderDetail(tenderId) {

      if(tenderId){
        
        const ms = 2000;
        const url = `${this.host}/${this.serviceUrl}/${this.resources.tenders}?codigo=${tenderId}&ticket=${this.ticket}`;

        console.log(`Fetching detail from ${url}`);

        try {

          await this.delay(ms);
          return await axios.get(url);

        }
        catch(err){

          if(err.response){
            await this.delay(ms);
            console.log(err);
          }

          console.log(err);

        }

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

    /**
     * 
     * @param {*} ms 
     * @returns Promise
     */
    delay(ms){
      return new Promise(resolve => setTimeout(resolve, ms));
    }

  }

  const mercadoPublico = new MercadoPublico();

  return { mercadoPublico }

}