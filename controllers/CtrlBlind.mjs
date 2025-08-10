/*----------------------------------------------------------------------------
  Blind controller module
  v1.0      Creation
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"
import * as VMBBlind from "../modules/velbuslib_blind.mjs"
import * as VMBGeneric from "../modules/velbuslib_generic.mjs"

export function setBlindStatus(req, res) {
    const key = req.params.key
    const newState = Number(req.body.status)
    let httpStatus = 200
    let httpResponse = {}

    if (newState != NaN && newState != undefined) {
        if (velbuslib.subModulesList.get(key)) {
            // TODO test du type de module
            const addr = key.split('-')[0]
            const part = key.split('-')[1]
            if (newState > 0) {
                console.log(" ", "writing order UP on Velbus", addr+'-'+part)
                velbuslib.VMBWrite(VMBBlind.BlindMove(addr, part, newState, 30, true))
            } else if (newState < 0) {
                console.log(" ", "writing order DOWN on Velbus", addr+'-'+part, 30)
                velbuslib.VMBWrite(VMBBlind.BlindMove(addr, part, newState, 0, true))
            } else {
                console.log(" ", "writing order STOP on Velbus", addr+'-'+part)
                velbuslib.VMBWrite(VMBBlind.BlindStop(addr, part))
            }
        }
        // let filter = req.query;
    } else {
        console.log("ERROR while transmitting", addr, part, newState, "===============")
        httpStatus = 400
        httpResponse = {err:`Error: following key isn't existing (${key})`}
    }
    res.setHeader('content-type', 'application/json')
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(httpStatus).json(httpResponse)
}

export function setDurationToJSON(req, res) {
    const key = req.params.key;
    const duration = Number(req.body.duration);
    let httpStatus = 200
    let httpResponse = {}
    if (duration > 2 && duration < 180) {
        console.log(`blind ${key} realTime set to ${duration} secondes`)
        let subModule = velbuslib.subModulesList.get(key)
        subModule.status.realTime = duration
        velbuslib.subModulesList.set(key, subModule)
    } else {
        httpStatus = 400
        httpResponse = {"erreur": "argument incorrect"}
    }

    res.setHeader('content-type', 'application/json')
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(httpStatus).json(httpResponse)
}