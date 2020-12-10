const CronJob = require('cron').CronJob;
const express = require("express");
const axios = require('axios');
const cds = require('@sap/cds');


(async () => {

    const model = await cds.load(['db','srv']);

    let db = cds.reflect (model);
    // const db = await cds.connect.to('db'); // connect to database service

    const {Person} = db.entities("com.bayer.SXTENDER.IntegrationData");

    console.log("Scheduler Started");

    var job = new CronJob('1 * * * * *', function () {
      
        axios.get('https://services.odata.org/V4/TripPinServiceRW/People').then(function (response) {

 

            response.data.value.forEach(async person => {

                const newPerson = {
                    UserName: person.UserName,
                    FirstName: person.FirstName,
                    LastName: person.LastName,
                    Gender: person.Gender
                };

                const affectedRows = await cds.run(INSERT.into(Person).entries(newPerson));

            });

            console.log("Records successfully created");

           
        })
    });

    //job.start(); //uncomment this line to start the job schedule

})();