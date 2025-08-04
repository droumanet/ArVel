/*----------------------------------------------------------------------------
  Blind controller module
  v1.0      Creation
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"
import * as VMBBlind from "../modules/velbuslib_blind.mjs"
import * as VMBGeneric from "../modules/velbuslib_generic.mjs"

export function setBlindStatus(req, res) {
    const key = req.params.key;
    const newState = req.params.status;
    let httpStatus = 200
    let httpResponse = {}

    if (newState) {
        if (velbuslib.subModulesList.get(key)) {
            // TODO test du type de module
            const addr = key.split('-')[0]
            const part = key.split('-')[1]
            if (newState > 0) {
                console.log(" ", "writing order UP on Velbus", addr+'-'+part)
                velbuslib.VMBWrite(VMBBlind.BlindMove(addr, part, newState*1))
            } else if (newState < 0) {
                console.log(" ", "writing order DOWN on Velbus", addr+'-'+part)
                velbuslib.VMBWrite(VMBBlind.BlindMove(addr, part, newState*1))
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
