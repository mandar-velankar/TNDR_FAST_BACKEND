//const CronJob = require('cron').CronJob;
const { CronJob } = require('cron');
const axios = require('axios');
const cds = require('@sap/cds');
const { v4:uuidv4 } = require('uuid');


module.exports = async () => {

  // const model = await cds.load(['db', 'srv']);
  // let db = cds.reflect(model);

  const db = await cds.connect.to('db'); // connect to database service

  // const {
  //   MercadoPublicoLicitacione,
  //   MercadoPublicoComprador,
  //   MercadoPublicoProducto
  // } = db.entities("com.bayer.SXTENDER.IntegrationData");

  const { SchedulerApiConfig } = db.entities("com.bayer.SXTENDER.AdminData");

  // get api config
  const mercadoApi = await cds.run(SELECT.one.from(SchedulerApiConfig).where({Provider:'MercadoPublco'}).where({Resource: 'Tender'}));

  class MercadoPublico {

    constructor(){

      this.host = mercadoApi.Host; 
      this.serviceUrl = mercadoApi.BasePath; 
      this.ticket = mercadoApi.ApiKey; 
      this.resources = {
        tenders: {
          path: mercadoApi.ResourcePath,
          requestDelay: mercadoApi.RequestDelay,
          requestMaxRetry: mercadoApi.RequestMaxRetry
        }
      };
      this.consultationDate = '23052021'; //this.dateToDDMMYYYY(new Date());

    }

    /**
     * Fetches Tenders and saves them to the DB
     * @returns {CronJob}
     */
     fetchTenders(cronTime){

      return new CronJob(cronTime, async () => {

        const url = `${this.host}${this.serviceUrl}${this.resources.tenders.path}?fecha=${this.consultationDate}&ticket=${this.ticket}`;

        const start = new Date().getTime();
        console.log(` `);
        console.log(`Job started : ${new Date()}`);
  
        try {

          console.log(` `);
          console.log(`Fetching data from ${url} `);
          
          const results = await this.fetchWithRetry(url);
          const tenders = results.data.Listado;
          
          const tenderDetails = await this.getTendersWithDetails(tenders);

          if(tenderDetails && tenderDetails.length > 0){
            console.log(` `);
            console.log(`${tenderDetails.length} tenders successfully fetched`);
            console.log(` `);
            console.log(`Saving data ...`);
            await this.saveTenders(tenderDetails);
          }

        }catch(err) {
          console.log(err);
        }finally {

          const end = new Date().getTime();
          const time = end - start;

          console.log(` `);
          console.log(`Job completed successfully : ${new Date()}`);
          console.log(`Execution time: ${time}ms`);

        }
        
      }); 

    }

    /**
     * Fetches data from a given entpoint. In case of failure, the request will be retried.
     * @param {String} url 
     * @returns {Promise}
     */
    fetchWithRetry(url){

      const REQUEST_DELAY = this.resources.tenders.requestDelay;
      const MAX_RETRY = this.resources.tenders.requestMaxRetry;
      const _that = this;

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
          // console.log(`Retrying ... \n\t [${currentRetry}] - ${url}`);
          return sendWithRetry();
        } else {
          // console.log(`Retried ${currentRetry} times but still failed to fetch from: \n${url}`);
          const errLog = await _that.saveError(error, url);
          throw new Error(errLog);
         
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
           const url = `${this.host}${this.serviceUrl}${this.resources.tenders.path}?codigo=${tenders[i].CodigoExterno}&ticket=${this.ticket}`;
          
           const detail = await this.fetchWithRetry(url);
           tenderDetails.push(detail.data.Listado[0]);
          
           console.log(`Tender ${detail.data.Listado[0].CodigoExterno} -> success`);
         }catch (error) {
           console.log(`Tender ${error.message}`);
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

          try{
            await Promise.all(insertPromises);
            console.log(`Tender ${mappedTenderObj.CodigoExterno} success`);
          }catch(error){
            console.log(`Tender ${mappedTenderObj.CodigoExterno} -> failed - ${error.message}`);
          }
          
        }

      }

    }

    /**
     * Saves the error in the DB.
     * @param {Object} error 
     * @returns {Promise}
     */
    async saveError(error, url){

      if(error){

        try{

          const errorEntity = {
            ErrorMessage: error.message,
            ResourceURL: url,
            ConsultationDate: new Date().toJSON()
          };

          await cds.run(INSERT.into('com.bayer.SXTENDER.AdminData.SchedulerErrorLog', errorEntity));

          const tenderId = url.match(/=(.*?)&/)[1];

          return `${tenderId} -> failed. See 'SchedulerErrorLog'`;

        }catch(err){
          return err.message;
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
          }),
          createdAt: new Date().toJSON(),
          createdBy: "system"
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