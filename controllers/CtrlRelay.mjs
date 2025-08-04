/*----------------------------------------------------------------------------
  Relay controller module
  v1.0      Creation
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"
import * as VMBRelay from "../modules/velbuslib_relay.mjs"
import * as VMBGeneric from "../modules/velbuslib_generic.mjs"

export function setRelayStatus(req, res) {
    const key = req.params.key;
    const newState = req.params.status;
    let httpStatus = 200
    let httpResponse = {}

    if (newState) {
        if (velbuslib.subModulesList.get(key)) {
            // TODO test du type de module
            const addr = key.split('-')[0]
            const part = key.split('-')[1]
            if (newState < 2 && newState > -1) {
                console.log(" ", "writing order ON/OFF on Velbus", addr+'-'+part)
                velbuslib.VMBWrite(VMBRelay.RelaySet(addr, part, newState*1))
            } else if (newState > 1 && newState < 11) {
                console.log(" ", "writing order Blinking on Velbus", addr+'-'+part)
                velbuslib.VMBWrite(VMBRelay.RelayBlink(addr, part, newState*1))
            } else {
                console.log(" ", "writing order TIMER on Velbus", addr+'-'+part)
                velbuslib.VMBWrite(VMBRelay.RelayTimer(addr, part, newState*1))
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
