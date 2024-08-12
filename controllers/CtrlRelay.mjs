/*----------------------------------------------------------------------------
  Relay controller module
  v1.0      Creation
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"
import * as VMBRelay from "../modules/velbuslib_relay.mjs"

export function setRelayStatus(req, res) {
  let x = velbuslib.fullSubModuleList()
  const relayAddress = req.params.relayAddress;
  const modulePart = req.params.modulePart;
  const status = req.query.status;

  let key = relayAddress+"-"+modulePart

  if (x.get(key)) {
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
