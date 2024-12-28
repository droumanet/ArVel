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

import path from 'path'
import { dirname } from 'path'
import express from 'express'
import cors from "cors"
import http from 'http'
import { Server } from 'socket.io'
import { Router } from './routes/routes.js'
import { fileURLToPath } from 'url'
import schedule from 'node-schedule'
import VMBserver from './config/VMBServer.json' assert {type: "json"}    // settings for Velbus server TCP port and address
import appProfile from './config/appProfile.json' assert {type: "json"}
import * as velbuslib from "./modules/velbuslib.js"
import { VMBmodule, VMBsubmodule } from './models/velbuslib_class.mjs'
import { getSunrise, getSunset } from 'sunrise-sunset-js'
import { writePowerByDay, writeEnergy } from './controllers/CtrlDatabase.mjs';
import * as TeleInfo from './modules/teleinfo.js'
import * as VMC from './modules/VMC.js'

// GPS coordonates for Grenoble (sunrise and sunset value)
const sunset = getSunset(appProfile.locationX, appProfile.locationY);


// global.subModuleList = new Map()

const __dirname = dirname(fileURLToPath(import.meta.url))
console.log(__dirname)      // "/Users/Sam/dirname-example/src/api"
console.log(process.cwd())  // "/Users/Sam/dirname-example"

let app = express()

// Make the app available through an ADSL box (WAN) and adding CORS to SocketIO + App
app.use(cors({
    origin: '*', // Autoriser toutes les origines (utiliser un domaine spcifique en production)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Autoriser ces mthodes HTTP
    allowedHeaders: ['Content-Type', 'Authorization'], // Autoriser ces en-ttes
    optionsSuccessStatus: 200 // Renvoyer le statut 200 pour les requtes prliminaires (preflight) en OPTIONS
  }))

app.use('/', Router)

// create websocket with existing port HTTP for web client
let myhttp = http.createServer(app);
let myio = new Server(myhttp, {
    // manage CORS for NAT traversal
    cors: {
        origin: appProfile.CORSwebsite,
        methods: ["GET", "POST"]
    }
});

// Launch Velbus network (connect to velserv)
velbuslib.VelbusStart(VMBserver.host, VMBserver.port)

// #region SocketIO functions 
// ================================================================================================
// here is an example on how to connect, from HTML/JS page : let listenClients = io.listen(http);

myio.on('connection', (socket) => {
    console.log(`▶️ SocketIO (re)connected to @IP:${socket.request.remoteAddress} (client ${socket.id})`)
    let modulesTeleInfo = TeleInfo.resume()
    velbuslib.setSubModuleList("300-1", modulesTeleInfo[0])
    velbuslib.setSubModuleList("300-2", modulesTeleInfo[1])
    // subModuleList.set("300-1", modulesTeleInfo[0])
    // subModuleList.set("300-2", modulesTeleInfo[1])

    let json = JSON.stringify(Object.fromEntries(velbuslib.fullSubModuleList()))
    myio.emit("resume", json)
    console.log("▶️ Loaded modules numbers : ", velbuslib.lenSubModuleList())
    socket.on("energy", (msg) => {
        console.log("► Energy request transmitted (socketIO client)")
        velbuslib.VMBWrite(velbuslib.CounterRequest(msg.address, msg.part))
    })
    socket.on('relay', (msg) => {
        console.log("▶️ ", msg)
        if (msg.status == "ON") velbuslib.VMBWrite(velbuslib.relaySet(msg.address, msg.part, 1))
        if (msg.status == "OFF") velbuslib.VMBWrite(velbuslib.relaySet(msg.address, msg.part, 0))
        console.log("▶️ Action on relay: ", msg, "address:", msg.address);
    });
    socket.on('blind', (msg) => {
        if (msg.status == "DOWN") velbuslib.VMBWrite(velbuslib.blindMove(msg.address, msg.part, -1, 10))
        if (msg.status == "UP") velbuslib.VMBWrite(velbuslib.blindMove(msg.address, msg.part, 1, 10))
        if (msg.status == "STOP") velbuslib.VMBWrite(velbuslib.blindStop(msg.address, msg.part))
        console.log("▶️ Action on blind: ", msg)
    })
    socket.on('discover', () => {

    })
})

// when a message is detected on Velbus bus, send it to socketIO client
velbuslib.VMBEmitter.on("msg", (dataSend) => {
    myio.emit("msg", dataSend)
});

// NOTE - running Velbus server on port 8001
let portWeb = appProfile.listenPort;
myhttp.listen(portWeb, () => {
    console.log("ARVEL - Velbus Service listening on port ", portWeb)
});

myio.listen(myhttp)
console.log("____________________________________________________________\n")

let pad = function (num) { return ('00' + num).slice(-2) }


// #endregion

// #region CRONTAB functions 
// ================================================================================================
// Timer part (see https://crontab.guru)
// Cron format : SS MM HH Day Month weekday
// ================================================================================================

let launchSync = () => { velbuslib.VMBsyncTime() }

let everyDay5h = schedule.scheduleJob('* * 5 */1 * *', () => {
    // Synchronize time each day at 5:00 (AM) because of summer/winter offset each year
    let d = new Date()
    console.log("⏰ ARVEL CRON 5h (Time Sync) : ", d.toISOString())
    velbuslib.VMBSetTime(99, 99, 99)
})

//let everyDay23h59 = schedule.scheduleJob('50 59 23 */1 * *', () => {
let everyDay23h59 = schedule.scheduleJob('50 59 23 */1 * *', () => {
    let d = new Date()
    console.log("⏰ ARVEL CRON Midnight : ", d.toISOString())
    // Record index and some jobs to clear old values

    // read values lists and send to SQL
    let tableCompteur = TeleInfo.resume()
    velbuslib.setSubModuleList("300-1", tableCompteur[0])
    velbuslib.setSubModuleList("300-2", tableCompteur[1])

    if (velbuslib.getSubModuleList('300-1') != undefined) {
        let date = new Date();
        date = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())

        // date, indexHP, indexHC, indexProd, powerProdmax, powerConsoMax, powerProdConso

        let powerTbl = [date,
            velbuslib.getSubModuleList('300-1').status.index + "",
            velbuslib.getSubModuleList('300-1').status.indexHC + "",
            velbuslib.getSubModuleList('300-2').status.index + "",
            velbuslib.getSubModuleList('300-2').status.powerMax + "",
            velbuslib.getSubModuleList('300-1').status.powerMax + "",
            velbuslib.getSubModuleList('300-2').status.indexConso + ""
        ]
        writePowerByDay(powerTbl)
    }
})

let everyMinut = schedule.scheduleJob('*/1 * * * *', () => {
    // call every minute energy counter
    let d = new Date()

    // GPS coordonates for Grenoble (sunrise and sunset value)
    let sunsetBrut = getSunset(appProfile.locationX, appProfile.locationY)
    let decalage = 10 * 60 * 1000;  // 10 minutes
    let sunset = new Date(sunsetBrut.getTime() + decalage);

    let sunsetMinut = sunset.getMinutes()
    let sunsetHour = sunset.getHours()
    let dMinut = d.getMinutes()
    let dHour = d.getHours()

    console.log("⏰ ARVEL CRON 1 minute : ", d.toISOString(), "sunset=", sunsetHour+":"+sunsetMinut)

    if (sunsetHour == dHour && sunsetMinut == dMinut) {
        // descendre les volets 🌙  
        console.log("Baisser les volets", dHour+":"+dMinut+"  =  "+sunsetHour+":"+sunsetMinut)
        let subModTmp = velbuslib.fullSubModuleList();
        velbuslib.VMBWrite(velbuslib.RelayBlink(7, 4, 5))
        velbuslib.VMBWrite(velbuslib.RelayBlink(46, 1, 5))
        setTimeout(() => {
            velbuslib.VMBWrite(velbuslib.FrameSendButton(0xAA, 8, 1)) 
            velbuslib.VMBWrite(velbuslib.FrameSendButton(0xAA, 8, 0))          
        }, 20000);
    }
    /*
    if (dHour == 7 && dMinut == 25) {
        // Monter les volets le matin (simulation présence) 🌞  
        console.log("Monter les volets", dHour+":"+dMinut+"  =  "+sunsetHour+":"+sunsetMinut)
        velbuslib.VMBWrite(velbuslib.RelayBlink(7, 4, 5))
        velbuslib.VMBWrite(velbuslib.RelayBlink(46, 1, 5))
        setTimeout(() => {
            velbuslib.VMBWrite(velbuslib.FrameSendButton(0xAA, 6, 1)) 
            velbuslib.VMBWrite(velbuslib.FrameSendButton(0xAA, 6, 0))          
        }, 20000);
    }  
        */

    // scan external modules (TeleInfo & VMC)
    console.log("⚡⚡  Resuming external modules (TeleInfo & VMC)  ⚡⚡")
    let tableCompteur = TeleInfo.resume()
    let VMCModule = VMC.resume()

    // Create or update external modules
    velbuslib.setSubModuleList("300-1", tableCompteur[0])
    velbuslib.setSubModuleList("300-2", tableCompteur[1])
    velbuslib.setSubModuleList("400-1", VMCModule)

    // Scan all module and search for a function
    let subList = velbuslib.fullSubModuleList()
    if (subList) {
        console.log("LIST EXIST")
        if (subList.size > 0) {
            console.log("THERE ARE ",subList.size," MODULES")
            let ll
            let eventDate=""
            let texte=""
            subList.forEach((SubModTmp, k) => {
                texte = ""
                if (SubModTmp.cat.includes("energy") && SubModTmp.address < 256) {
                    texte = SubModTmp.address+"-"+SubModTmp.part+" : "+SubModTmp.name + "   (Loop index: "+k+")"
                    velbuslib.VMBRequestEnergy(SubModTmp.address, SubModTmp.part)
                    .then((msg) => {console.log("VMBRequestEnergy", texte, msg)})
                    ll = new Date(SubModTmp.status.timestamp)
                    eventDate=ll.getFullYear()+"-"+pad(ll.getMonth()+1)+"-"+pad(ll.getDate())+" "+pad(ll.getHours())+":"+pad(ll.getMinutes())+":00"
                    //eventDate = (new Date(v.status.timestamp)-).toISOString().slice(0, 19).replace('T', ' ')
                    console.log(eventDate, SubModTmp.id, SubModTmp.cat, SubModTmp.status.power, SubModTmp.status.index, 'w (', SubModTmp.address,'-' ,SubModTmp.part,')')
                    if (SubModTmp.status.power != undefined && SubModTmp.status.index != undefined && SubModTmp.address<256) {
                        // Writing datas to database
                        console.log("📀 SENDING TO DB : ", SubModTmp.address, SubModTmp.part, eventDate, SubModTmp.status.index, SubModTmp.status.power)
                        writeEnergy([SubModTmp.address, SubModTmp.part, eventDate, SubModTmp.status.index, SubModTmp.status.power])
                    }
                }
            })
        } else {
            console.error("!!!!!!   ModuleList empty   !!!!!!!!!!!!!!")
        }
        
    } else { console.error("!!!!!!   ModuleList undefined   !!!!!!!!!!!!!!")}

})

//#endregion
