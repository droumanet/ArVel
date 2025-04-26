// Require node js dgram module.
import Dgram from "dgram"
import {VMBmodule, VMBsubmodule} from '../models/velbuslib_class.mjs'
// const Dgram = require('dgram')
let port = 65433
// Create a udp socket client object.
const VMC = Dgram.createSocket("udp4")
let VMCStatus = {}

/**
 * This function return an array with two VMBsubModule (address with $300-1 and $300-2)
 * @returns array of two VMBSubModule
 */
function resume() {
    let VMC = new VMBsubmodule(400, 1, "400-1", ["temp", "vmc"], VMCStatus)
    VMC.name = "VMC Vents home"

    return VMC
}



VMC.on('listening', () => {
    console.log("ARVEL - Connexion to VMC established (UDP)")
})
// example on how to use it
VMC.on('message', (message) => {
    VMCStatus = JSON.parse(message.toString())
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const timeString = `${hours}:${minutes}:${seconds}`
    console.log(timeString, VMCStatus.current+"°C", VMCStatus.fanInPercent+"%", VMCStatus.Alarm)
})
VMC.on('error', (message, info) => {
    console.log("Error message from VMC", message)

})

VMC.bind(port)

export {resume}