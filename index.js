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
import { writePowerByDay, writeEnergy } from './controllers/CtrlDatabase.mjs'
import * as TeleInfo from './modules/teleinfo.js'
import * as VMC from './modules/VMC.js'
import { parseScheduleFile, getActionsToExecute } from './modules/command_Parser.mjs'
import { checkAndExecuteActions } from './modules/command_Executor.mjs'

// GPS coordonates for Grenoble (sunrise and sunset value)
const sunset = getSunset(appProfile.locationX, appProfile.locationY)


// global.subModuleList = new Map()

const __dirname = dirname(fileURLToPath(import.meta.url))
console.log(__dirname)      // "/Users/Sam/dirname-example/src/api"
console.log(process.cwd())  // "/Users/Sam/dirname-example"
// programming action when out of house
const filePath = path.join(__dirname, 'config/prog_absence.txt')


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
// create websocket with existing port HTTP for web client
let myhttp = http.createServer(app);
// NOTE - running Velbus server on port 8001
let portWeb = appProfile.listenPort;
myhttp.listen(portWeb, () => {
    console.log("ARVEL - Velbus Service listening on port ", portWeb)
});


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
        date = TimeStamp2Date(date)

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
    let currentDate = new Date()

    // ☀️ -> 🌙 : GPS coordonates for Grenoble (sunrise and sunset value)
    let sunsetBrut = getSunset(appProfile.locationX, appProfile.locationY)
    let decalage = 30 * 60 * 1000;  // 20 minutes
    let summerTime = 0
    if (isDaylightSavingTime()) {
        summerTime = 60*60*1000
    }
    let sunset = new Date(sunsetBrut.getTime() - summerTime + decalage);

    // Format time as XX:YY in 24h hour
    let sunsetTime = sunset.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    let nowTime = currentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    console.log(`⏰ ARVEL CRON 1 minute: (now=${nowTime}, sunset=${sunsetTime})`)

    // 🌙🪟 Automatically lower the blinds/shutters 
    if (sunsetTime == nowTime) { 
        console.log("Lower the blinds/shutters", nowTime)
        velbuslib.VMBWrite(velbuslib.RelayBlink(7, 4, 5))
        velbuslib.VMBWrite(velbuslib.RelayBlink(46, 1, 5))
        setTimeout(() => {
            velbuslib.PressButton(0xAA, 8)      
        }, 20000);
    }

    // ⏰📖 Reading and parsing file for programmed actions (new version)
    const scheduleActions = parseScheduleFile(filePath)
    const actionsToCheck = getActionsToExecute(scheduleActions, currentDate)
    if (actionsToCheck) console.log("ACTIONS TO CHECK : ",actionsToCheck)
    // checkAndExecuteActions(actionsToCheck, moduleStates)
    // console.log(velbuslib.getSubModuleList("400-1").status)
 
    // scan external modules (TeleInfo & VMC)
    console.log("⚡🌀  Synchronizing external modules (TeleInfo & VMC)  ⚡🌀")
    let tableCompteur = TeleInfo.resume()
    let VMCModule = VMC.resume()

    // Create or update external modules (with addresses > 255)
    velbuslib.setSubModuleList("300-1", tableCompteur[0])
    velbuslib.setSubModuleList("300-2", tableCompteur[1])
    velbuslib.setSubModuleList("400-1", VMCModule)

    // Scan all module and search for a function
    let subList = velbuslib.fullSubModuleList()
    if (subList.size > 0) {
        console.log("THERE ARE ",subList.size," MODULES")
        let lastSubModuleTime
        let eventDate=""
        subList.forEach((SubModTmp, k) => {
            try {
                // Search for Velbus module able to manage energy counting
                if (SubModTmp.cat.includes("energy") && SubModTmp.address < 256) {
                    velbuslib.VMBRequestEnergy(SubModTmp.address, SubModTmp.part)
                    .then((subModuleStatus) => {
                        if (subModuleStatus) {
                            // let texte = `${SubModTmp.address}-${SubModTmp.part}: [${SubModTmp.name}]`
                            // console.log("VMBRequestEnergy read:", texte, subModuleStatus, TimeStamp2Date(new Date(subModuleStatus.timestamp)))
                        }
                    })
                    
                    if (SubModTmp.status.power != undefined && SubModTmp.status.index != undefined && SubModTmp.address<256) {
                        // Writing datas to database
                        lastSubModuleTime = new Date(SubModTmp.status.timestamp)
                        eventDate=TimeStamp2Date(lastSubModuleTime)
                        writeEnergy([SubModTmp.address, SubModTmp.part, eventDate, SubModTmp.status.index, SubModTmp.status.power])
                        console.log(`📀 STORE IN DB:  ${SubModTmp.address}-${SubModTmp.part} \t${SubModTmp.status.power}w \tINDEX: ${SubModTmp.status.index} \ton ${eventDate}`)
                    }
                }
                // Search for Velbus module able to manage energy counting
                if (SubModTmp.cat.includes("temp") && SubModTmp.address < 256) {
                    velbuslib.VMBRequestTemp(SubModTmp.address, SubModTmp.part)
                    .then((subModuleStatus) => {
                        if (subModuleStatus) {
                            console.log(`Temp read: ${SubModTmp.address}-${SubModTmp.part}: \t${subModuleStatus.defaultStatus}°C [${SubModTmp.name}] \t${TimeStamp2Date(new Date(subModuleStatus.timestamp))}`)
                        }
                    })
                    /* TODO adapter pour temperature
                    if (SubModTmp.status.power != undefined && SubModTmp.status.index != undefined && SubModTmp.address<256) {
                        // Writing datas to database
                        lastSubModuleTime = new Date(SubModTmp.status.timestamp)
                        eventDate=TimeStamp2Date(lastSubModuleTime)
                        writeEnergy([SubModTmp.address, SubModTmp.part, eventDate, SubModTmp.status.index, SubModTmp.status.power])
                        console.log(`📀 STORE IN DB:  ${SubModTmp.address}-${SubModTmp.part} \t${SubModTmp.status.power}w \tINDEX: ${SubModTmp.status.index} \ton ${eventDate}`)
                    }
                    */
                }   
            } catch {
                console.error("❌ No energy module in list")
            }
        })
    }
})

//#endregion
function isDaylightSavingTime(date = new Date()) {
    // Obtenir le décalage horaire en minutes pour la date actuelle
    const january = new Date(date.getFullYear(), 0, 1); // Janvier (hiver)
    const july = new Date(date.getFullYear(), 6, 1);    // Juillet (été)

    // Comparer le décalage horaire de janvier (hiver) et juillet (été)
    const standardTimezoneOffset = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());

    // Si le décalage actuel est inférieur au décalage standard, on est en heure d'été
    return date.getTimezoneOffset() < standardTimezoneOffset;
}

/**
 * Convert a date (number) to a string "AAAA-"
 * @param {*} theDate element like new Date()
 * @returns String
 */
function TimeStamp2Date(TS = new Date()) {
    return `${TS.getFullYear()}-${String(TS.getMonth() + 1).padStart(2, '0')}-${String(TS.getDate()).padStart(2, '0')} ${String(TS.getHours()).padStart(2, '0')}:${String(TS.getMinutes()).padStart(2, '0')}:${String(TS.getSeconds()).padStart(2, '0')}`
}