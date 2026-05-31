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
import cors from 'cors'
import http from 'http'

// Import from self frameworks
import appProfile from './config/appProfile.json' with {type: "json"}
import { Router } from './routes/routes.js'
import VMBserver from './config/VMBServer.json' with {type: "json"}    // settings for Velbus server TCP port and address
import * as velbuslib from './modules/velbuslib.js'
import { launchSync, everyDay5h, everyDay23h59, everyMinute } from './schedule.js'


/* ===============================================================================================================
    Starting application
   ===============================================================================================================
*/
let app = express()

// Make the app available through an ADSL box (WAN) and adding CORS to SocketIO + App
app.use(cors({
    origin: '*',                                        // Accept all origin (ue specific domain in production)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],          // Authorize these methodes (HTTP)
    allowedHeaders: ['Content-Type', 'Authorization'],  // Authorize these headers ces entêtes
    optionsSuccessStatus: 200                           // return statut 200 for preliminary request in OPTIONS
  }))

app.use('/', Router)


// Launch Velbus network (connect to velserv)
velbuslib.VelbusStart(VMBserver.host, VMBserver.port)
let myhttp = http.createServer(app);
let portWeb = appProfile.listenPort;
myhttp.listen(portWeb, () => {
    console.log("ARVEL - ✅ Velbus API listening on port ", portWeb)
});

// Launch reccurent tasks
launchSync
everyMinute
everyDay5h
everyDay23h59
