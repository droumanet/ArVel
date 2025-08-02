/*----------------------------------------------------------------------------
  Relay controller module
  v1.0      Creation
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"
import * as VMBRelay from "../modules/velbuslib_blind.mjs"
import * as VMBGeneric from "../modules/velbuslib_generic.mjs"

export function setBlindStatus(req, res) {
    let x = velbuslib.fullSubModuleList()
    const addr = req.params.addr;
    const part = req.params.part;
    const status = req.params.status;

    let key = addr+"-"+part
    console.log("🪟", key, "blind status need to change to ", status*1)
    if (addr && part && status) {
        if (x.get(key)) {
            // TODO test du type de module
            if (status < 2 && status > -1) {
                console.log(" ", "writing order ON/OFF on Velbus")
                velbuslib.VMBWrite(VMBRelay.RelaySet(addr, velbuslib.Part2Bin(part), status*1))
            } else if (status > 1 && status < 11) {
                console.log(" ", "writing order Blinking on Velbus")
                velbuslib.VMBWrite(VMBRelay.RelayBlink(addr, velbuslib.Part2Bin(part), status*1))
            } else {
                console.log(" ", "writing order TIMER on Velbus")
                velbuslib.VMBWrite(VMBRelay.RelayTimer(addr, velbuslib.Part2Bin(part), status*1))
            }
        }
        // let filter = req.query;
    } else {
        console.log("ERROR while transmitting", addr, part, status, "===============")
        res.status(400).json({operation:"error"})
    }
    res.setHeader('content-type', 'application/json')
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).json({operation:"done"}) // Envoyer l'objet converti en JSON
}
