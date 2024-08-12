/*----------------------------------------------------------------------------
  Relay controller module
  v1.0      Creation
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"
import * as VMBRelay from "../modules/velbuslib_relay.mjs"

export function setRelayStatus(req, res) {
    let x = velbuslib.fullSubModuleList()
    const relayAddress = req.params.addr;
    const modulePart = req.params.part;
    const status = req.query.status;

    let key = relayAddress+"-"+modulePart
    console.log("🔌", key, "need to change to ", status*1)

    if (x.get(key)) {
        console.log("    ", "writing order on Velbus")
        // TODO test du type de module
        velbuslib.VMBWrite(VMBRelay.relaySet(relayAddress, velbuslib.Part2Bin(modulePart), status*1))
    }
    // let filter = req.query;

    res.setHeader('content-type', 'application/json')
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).json({operation:"done"}) // Envoyer l'objet converti en JSON
}

export function setRelayStatus2(req, res) {
    console.log("🔌 chemin /relay")
    res.status(200).json({operation:"done"})
}

