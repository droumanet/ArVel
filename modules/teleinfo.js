// Require node js dgram module.
import Dgram from "dgram"
import { VMBmodule, VMBsubmodule } from '../models/velbuslib_class.mjs'
// const Dgram = require('dgram')
let port = 65432
// Create a udp socket client object.
const TeleInfo = Dgram.createSocket("udp4")

let compteurConso = {
    "TYPE": "CONSOMMATION",
    "DATE": "",     // current date (format: AAAA-MM-JJ HH:mm:ss)
    "PRM": "",      // counter officiel ID
    "EASF01": "",   // Energie Active Soutirée Fournisseur index 01
    "EASF02": "",
    "IRMS1": "",    // Courant (I rms)
    "URMS1": "",    // Tension (U rms)
    "SINSTS": "",   // current power consummed
    "UMOY1": "",    // Tension (U moyen)
    "NGTF": "",     // Nom Calendrier Tarif Fournisseur
    "NTARF": "",    // Numéro Tarif Fournisseur en cours
    "MSG1": "",     // Message court
    "SMAXSN": "",   // Puissance maximum soutirée + date
    "SMAXSN1": "",  // Puissance maximum soutirée précédente (n-1)
    "RELAIS": "",
}
let compteurProd = {
    "TYPE": "PRODUCTION",
    "DATE": "",
    "PRM": "",
    "EASF01": "",   // Energie Active Soutirée Fournisseur index 01
    "EAIT": "",     // Energie Active injectée totale
    "IRMS1": "",    // Courant (I rms)
    "URMS1": "",    // Tension (U rms)
    "SINSTI": "",   // Puissance instantanée soutirée
    "SMAXIN": "",   // Puissance maximum injectée + date
    "SMAXIN1": "",  // Puissance maximum injectée précédente (n-1)
    "NGTF": "",     // Nom Calendrier Tarif Fournisseur
    "MSG1": ""
}

/**
 * This function return an array with two VMBsubModule (address with $300-1 and $300-2)
 * @returns array of two VMBSubModule
 */
function resume() {
    let maxConsoDate = decodeDate(compteurConso.SMAXSN)
    let maxConsoWatt = decodePower(compteurConso.SMAXSN)
    let maxProdDate = decodeDate(compteurProd.SMAXIN)
    let maxProdWatt = decodePower(compteurProd.SMAXIN)

    // Convert from TeleInfo to Velbus module status
    let statusConso = {
        "index": compteurConso.EASF01 * 1,
        "power": compteurConso.SINSTS * 1,
        "indexHC": compteurConso.EASF02 * 1,
        "powerMax": maxConsoWatt,
        "powerMaxDate": maxConsoDate,
        "message": compteurConso.MSG1,
        "Urms": compteurConso.URMS1,
        "Umoy": compteurConso.UMOY1,
        "timestamp": Date.now(),
        "dateRefresh": compteurConso.DATE
    }


    // let statusProd = {"power":compteurProd.SINSTI*1, "indexProd":compteurProd.EAIT*1, "indexConso":compteurProd.EASF01*1, "powerMax":compteurProd.SMAXIN, "timestamp":Date.now()}
    let statusProd = {
        "index": compteurProd.EAIT * 1,
        "power": compteurProd.SINSTI * 1,
        "indexConso": compteurProd.EASF01 * 1,
        "Urms": compteurProd.URMS1,
        "Umoy": compteurProd.Umoy,
        "powerMax": maxProdWatt,
        "powerMaxDate": maxProdDate,
        "message": compteurProd.MSG1,
        "timestamp": Date.now(),
        "dateRefresh": compteurProd.DATE
    }

    let cptConso = new VMBsubmodule(300, 1, "300-1", ["energy", "electricity"], statusConso)
    cptConso.name = "TeleInfo Conso"

    let cptProd = new VMBsubmodule(300, 2, "300-2", ["energy", "electricity"], statusProd)
    cptProd.name = "TeleInfo Prod"

    return [cptConso, cptProd]
}

// decode TeleInfo date :SAISON (E/H)+YYMMDDHHmmSS
function decodeDate(m) {
    if (typeof m === 'string') {
        if (m.includes(' ')) {
            let msg = m.split(" ")
            // let HeureEte = "E" == m[0].substr(0,1)
            if (msg[0].length > 12) {
                return "20" + msg[0].substring(1, 3) + "-" + msg[0].substring(3, 5) + "-" + msg[0].substring(5, 7) + " " + msg[0].substring(7, 9) + ":" + msg[0].substring(9, 11) + ":" + msg[0].substring(11, 13)
            }
            return msg[0]
        }
    }
    return "0000-00-00 00:00:00"
}

// decode TeleInfo max power :"DATE POWER"
function decodePower(m) {
    if (typeof m === 'string') {
        if (m.includes(' ')) {
            let msg = m.split(" ")
            return msg[1] * 1
        }
    }
    return -1
}


TeleInfo.on('listening', () => {
    console.log("ARVEL - Connexion to TeleInfo established (UDP)")
})
// example on how to use it
TeleInfo.on('message', (message) => {
    let maVariable = JSON.parse(message.toString())
    if (maVariable.TYPE == "CONSOMMATION") {
        console.log("------------------------------------------")
        if (compteurConso != undefined && maVariable.EASF01 > compteurConso.EASF01) {
            compteurConso = structuredClone(maVariable)
        }
        console.log(compteurConso.TYPE + " : ", compteurConso.SINSTS * 1, "Pmax : ", decodePower(compteurConso.SMAXSN), "W", decodeDate(compteurConso.SMAXSN), "Urms:", compteurConso.URMS1 * 1, "Umoy:", decodePower(compteurConso.UMOY1) * 1, decodeDate(compteurConso.UMOY1));
    } else {
        try {
            // Keep best index value but show current Power
            if (compteurProd != undefined && maVariable.EAIT > compteurProd.EAIT) {
                compteurProd = structuredClone(maVariable)
            } else {
                compteurProd.SINSTI = maVariable.SINSTI
            }
            console.log(compteurProd.TYPE + " : ", compteurProd.SINSTI * 1, "Pmax : ", decodePower(compteurProd.SMAXIN), "W", decodeDate(compteurProd.SMAXIN))
        } catch {
            console.log(compteurProd.TYPE, maVariable)
        }
    }
})
TeleInfo.on('error', (message, info) => {
    console.log("Error message from TeleInfo", message)

})

TeleInfo.bind(port)

export { resume, decodeDate, decodePower }