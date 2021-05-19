//const CronJob = require('cron').CronJob;
const { CronJob } = require('cron');
const axios = require('axios');
const cds = require('@sap/cds');
const { v4:uuidv4 } = require('uuid');


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
     fetchTenders(cronTime){

      return new CronJob(cronTime, async () => {

        const url = `${this.host}/${this.serviceUrl}/${this.resources.tenders}?fecha=${this.consultationDate}&ticket=${this.ticket}`;

        console.log(`\n------------------------------------------------------\n`);
        console.log(`Fetching data from ${url} \n`);
  
        try {

          const results = await this.fetchWithRetry(url);
          const tenders = results.data.Listado;
          
          const tenderDetails = await this.getTendersWithDetails(tenders);
          await this.saveTenders(tenderDetails);
         

        }catch(err){
          console.log(err);
        }
        
      }); 

    }

    /**
     * Fetches data from a given entpoint. In case of failure, the request will be retried.
     * @param {String} url 
     * @returns {Promise}
     */
    fetchWithRetry(url){

      const REQUEST_DELAY = 1000;
      const MAX_RETRY = 5;
      let currentRetry = 0;

      function wait(ms){
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      function successHandler(response) {
        return response;
      }

      async function errorHandler(error) {
        if (currentRetry < MAX_RETRY) {
          currentRetry++;
          console.log(`Retrying... \n ${url}`);
          return sendWithRetry();
        } else {
          console.log(`Retried ${currentRetry} times but still failed to fetch from: \n${url}`);
          return error;
        }
      }

      async function sendWithRetry() {
        await wait(REQUEST_DELAY);
        return axios.get(url).then(successHandler).catch(errorHandler);
      }

      return sendWithRetry();
    }

    /**
     * Fetches Tenders with details
     * @param {Array} tenders 
     * @returns {Promise <Array>}
     */
    async getTendersWithDetails(tenders){
      const tenderDetails = [];
      
      for(let i = 0; i < tenders.length; i++){
         try {         
           const url = `${this.host}/${this.serviceUrl}/${this.resources.tenders}?codigo=${tenders[i].CodigoExterno}&ticket=${this.ticket}`;
          
           const detail = await this.fetchWithRetry(url);
           tenderDetails.push(detail.data.Listado[0]);
          
           console.log(`Tender detail received: ${i}`);
         } catch (error) {
           console.log(`Failed fetching tender detail: ${i}`);
         }
      }

      return tenderDetails;

    }

    async saveTenders(tenders){

      if(tenders && tenders.length > 0){

        for(let a = 0; a < tenders.length; a++ ){

          const mappedTenderObj = this.mapMercadoFields(tenders[a]);
          const licitacione = this.getEntity(mappedTenderObj, 'licitacione');
          const comprador = this.getEntity(mappedTenderObj, 'comprador');
          const items = this.getEntity(mappedTenderObj, 'items');

          const insertPromises = [];
  
          insertPromises.push(cds.run(INSERT.into('com.bayer.SXTENDER.IntegrationData.MercadoPublicoLicitacione', licitacione)));
          insertPromises.push(cds.run(INSERT.into('com.bayer.SXTENDER.IntegrationData.MercadoPublicoComprador', comprador)));
          insertPromises.push(cds.run(INSERT.into('com.bayer.SXTENDER.IntegrationData.MercadoPublicoProducto', items)));

          await Promise.all(insertPromises);
  
          console.log(`Tender ${mappedTenderObj.CodigoExterno} successfully created in the DB`);
  
        }

      }

    }


    /**
     * Return only a part of the tender object
     * @param {Object} tender 
     * @param {String} entityType 
     * @returns {Object}
     */
    getEntity(tender, entityType){

      if(entityType === "licitacione"){
        const obj =  {
          ...tender
        };
        delete obj['Comprador'];
        delete obj['Items'];
        return obj;
      }

      if(entityType === "comprador"){
        const obj =  {
          ...tender
        };
        return obj['Comprador'];
      }

      if(entityType === "items"){
        const obj =  {
          ...tender
        };
        return obj['Items'];
      }

    }

    /**
     * Maps the fields from the API response to the entity fields
     * @param {Object} tender 
     * @returns {Object}
     */
    mapMercadoFields(tender){
      if(tender){
        const compradorUUID =  uuidv4();

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
          "Comprador_ID": compradorUUID,
          "Comprador": {
              "ID": compradorUUID,
              ...tender.Comprador
          },
          "Items": tender.Items && tender.Items.Listado.map(item => {
            return {
              "ID": uuidv4(),
              "Licitacione_CodigoExterno": tender.CodigoExterno,
              "Correlativo" : item.Correlativo,
              "CodigoProducto": item.CodigoProducto,
              "CodigoCategoria": item.CodigoCategoria,
              "Categoria": item.Categoria,
              "NombreProducto": item.NombreProducto,
              "Descripcion": item.Descripcion,
              "UnidadMedida": item.UnidadMedida,
              "Cantidad": item.Cantidad,
              "AdjudicacionRutProveedor": item.Adjudicacion && item.Adjudicacion.RutProveedor,
              "AdjudicacionNombreProveedor": item.Adjudicacion && item.Adjudicacion.NombreProveedor,
              "AdjudicacionCantidad": item.Adjudicacion && item.Adjudicacion.Cantidad,
              "AdjudicacionMontoUnitario": item.Adjudicacion && item.Adjudicacion.MontoUnitario
            }
          })
        };

        delete newTender['Fechas'];
        delete newTender['Adjudicacion'];

        return newTender;

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