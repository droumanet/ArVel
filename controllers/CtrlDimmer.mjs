/*----------------------------------------------------------------------------
  Dimmer controller module
  v1.0      Creation
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"
import * as VMBDimmer from "../modules/velbuslib_dimmer.mjs"
import * as VMBGeneric from "../modules/velbuslib_generic.mjs"

export function setDimmerStatus(req, res) {
    const key = req.params.key;
    const newState = Number(req.body.status)
    const duration = Number(req.body.duration) || 1
    let httpStatus = 200
    let httpResponse = {}

    console.log("key", key, "set Status", newState, "duration", duration)
    if (newState>=0 && newState<=100) {
        if (velbuslib.subModulesList.get(key)) {
            // TODO test du type de module
            const addr = key.split('-')[0]
            const part = key.split('-')[1]
            
            console.log(" ", `writing order ${newState} on Velbus`, addr+'-'+part)
            console.log(velbuslib.toHexa(VMBDimmer.DimmerSet(addr, part, newState, duration)))
            velbuslib.VMBWrite(VMBDimmer.DimmerSet(addr, part, newState, duration))

        }
    } else {
        console.log("ERROR while transmitting", key, newState, "===============")
        httpStatus = 400
        httpResponse = {err:`Error: following key isn't existing (${key})`}
    }
    res.setHeader('content-type', 'application/json')
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(httpStatus).json(httpResponse)
}
