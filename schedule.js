// ================================================================================================
// Timer part (see https://crontab.guru)
// Cron format : SS MM HH Day Month weekday
// ================================================================================================

import schedule from 'node-schedule'
import { getSunrise, getSunset } from 'sunrise-sunset-js'
import path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

import { VMBmodule, VMBsubmodule } from './models/velbuslib_class.mjs'
import { writePowerByDay, writeEnergy } from './controllers/CtrlDatabase.mjs'
import * as TeleInfo from './modules/teleinfo.js'
import * as VMC from './modules/VMC.js'
import { parseScheduleFile, getActionsToExecute } from './modules/command_Parser.mjs'
import { checkAndExecuteActions } from './modules/command_Executor.mjs'

import appProfile from './config/appProfile.json' assert {type: "json"}
import * as velbuslib from './modules/velbuslib.js'
import { isDaylightSavingTime, TimeStamp2Date } from './utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// console.log(__dirname)      // "/Users/Sam/dirname-example/src/api"
// console.log(process.cwd())  // "/Users/Sam/dirname-example"
// programming action when out of house
const filePath = path.join(__dirname, 'config/prog_presence.txt')
const sunset = getSunset(appProfile.locationX, appProfile.locationY)


let launchSync = () => { velbuslib.VMBSetTime(99, 99, 99) }
// GPS coordonates for Grenoble (sunrise and sunset value)

const everyDay5h = schedule.scheduleJob('* * 5 */1 * *', () => {
    // Synchronize time each day at 5:00 (AM) because of summer/winter offset each year
    let d = new Date()
    console.log("⏰ ARVEL CRON 5h (Time Sync) : ", d.toISOString())
    velbuslib.VMBSetTime(99, 99, 99)
})

const everyDay23h59 = schedule.scheduleJob('50 59 23 */1 * *', () => {
    let d = new Date()
    console.log("⏰ ARVEL CRON Midnight : ", d.toISOString())
    // Record index and some jobs to clear old values

    // read values lists and send to SQL
    try {
        let tableCompteur = TeleInfo.resume()
        velbuslib.setSubModuleList("300-1", tableCompteur[0])
        velbuslib.setSubModuleList("300-2", tableCompteur[1])
    } catch (error) {
        console.log("Arvel - ❌ Not able to see TeleInfo", error)
    }

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
        try {
            writePowerByDay(powerTbl)
        } catch (error) {
            console.log("Arvel - ❌ Error with database!", error)
        }
    }
})

const everyMinut = schedule.scheduleJob('*/1 * * * *', () => {
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

    // scan external modules (TeleInfo & VMC)
    console.log("⚡🌀  Synchronizing external modules (TeleInfo & VMC)  ⚡🌀")
    let tableCompteur = TeleInfo.resume()
    let VMCModule = VMC.resume()

    // Create or update external modules (with addresses > 255)
    velbuslib.setSubModuleList("300-1", tableCompteur[0])
    velbuslib.setSubModuleList("300-2", tableCompteur[1])
    velbuslib.setSubModuleList("400-1", VMCModule)

    // ⏰📖 Reading and parsing file for programmed actions (new version)
    const scheduleActions = parseScheduleFile(filePath)                         // ✅ Checked up and running
    const actionsToCheck = getActionsToExecute(scheduleActions, currentDate)    // ✅ Checked up and running
    if (actionsToCheck) console.log("ACTIONS TO CHECK : ",actionsToCheck)
    checkAndExecuteActions(actionsToCheck)

    // Scan all module and search for a function
     if (velbuslib.subModulesList.size > 0) {
        console.log("THERE ARE ",velbuslib.subModulesList.size," MODULES")
        let lastSubModuleTime
        let eventDate=""
        velbuslib.subModulesList.forEach((SubModTmp, k) => {
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
                        try {
                            // FIXME Error when no database ❌

                            //writeEnergy([SubModTmp.address, SubModTmp.part, eventDate, SubModTmp.status.index, SubModTmp.status.power])
                            console.log(`📀 STORE IN DB:  ${SubModTmp.address}-${SubModTmp.part} \t${SubModTmp.status.power}w \tINDEX: ${SubModTmp.status.index} \ton ${eventDate} \t [${SubModTmp.name}]`)
                        } catch (error) {
                            console.log("Arvel: Error with database", error)
                        }
                     }
                }
                // Search for Velbus module able to manage energy counting
                if (SubModTmp.cat.includes("temp") && SubModTmp.address < 256) {
                    velbuslib.VMBRequestTemp(SubModTmp.address, SubModTmp.part)
                    .then((subModuleStatus) => {
                        if (subModuleStatus) {
                            console.log(`Temp read: ${TimeStamp2Date(new Date(subModuleStatus.timestamp))} \t${SubModTmp.address}-${SubModTmp.part}: \t${subModuleStatus.current}°C [${SubModTmp.name}]`)
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
            } catch (error) {
                console.error("❌ No energy module in list", error)
            }
        })
    }
})

export {
    launchSync,
    everyDay5h,
    everyDay23h59,
    everyMinut
}
