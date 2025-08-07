/**
 * ------------  ArVel  ---------------------------------------------------------------------------------
 * This is main API for connecting Velbus with database and other web services (port 8001)
 * ------------------------------------------------------------------------------------------------------
 * @author David ROUMANET <golfy@free.fr>
 * @version 0.2
 * v0.2 Transform to API Restful
 * ------------------------------------------------------------------------------------------------------
 * This code is experimental and is published only for those who want to use Velbus with NodeJS project.
 * Use it without any warranty.
 * ------------------------------------------------------------------------------------------------------
 */
'use strict';

// Import from official frameworks
import express from 'express'
import cors from "cors"
import http from 'http'

// Import from self frameworks
import appProfile from './config/appProfile.json' assert {type: "json"}
import { Router } from './routes/routes.js'
import VMBserver from './config/VMBServer.json' assert {type: "json"}    // settings for Velbus server TCP port and address
import * as velbuslib from "./modules/velbuslib.js"
import { launchSync, everyDay5h, everyDay23h59, everyMinut } from './schedule.js'


/* ===============================================================================================================
    Starting application
   ===============================================================================================================
*/
let app = express()

// Make the app available through an ADSL box (WAN) and adding CORS to SocketIO + App
app.use(cors({
    origin: '*', // Autoriser toutes les origines (utiliser un domaine spcifique en production)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Autoriser ces mthodes HTTP
    allowedHeaders: ['Content-Type', 'Authorization'], // Autoriser ces entêtes
    optionsSuccessStatus: 200 // Renvoyer le statut 200 pour les requtes prliminaires (preflight) en OPTIONS
  }))

app.use('/', Router)


// Launch Velbus network (connect to velserv)
velbuslib.VelbusStart(VMBserver.host, VMBserver.port)
let myhttp = http.createServer(app);
let portWeb = appProfile.listenPort;
myhttp.listen(portWeb, () => {
    console.log("ARVEL - Velbus Service listening on port ", portWeb)
});

// Launch reccurent tasks
launchSync
everyMinut
everyDay5h
everyDay23h59
