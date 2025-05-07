/*----------------------------------------------------------------------------
  Modules
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"

export function getModules(req, res) {
  let x = velbuslib.fullSubModuleList()
  let mapObj
  let filter = req.query;
  if (filter.cat) {
    console.log("*** API CTRL-Module : Filtered request", filter)
    let y = new Map()
    for (const [key, value] of x) {
      const moduleData = x.get(key);
      // Vérification complète avant d'utiliser .some()
      if (moduleData && moduleData.cat && Array.isArray(moduleData.cat) && 
          moduleData.cat.some(cat => cat === filter.cat)) {
        y.set(key, value);
      } else if (!Array.isArray(moduleData.cat) ) {
        console.log("⚠️ Error on filtered request with ", key, moduleData)
      }
    }
    mapObj = Object.fromEntries(y);
  } else {
    console.log("*** API CTRL-Module : full ***")
    mapObj = Object.fromEntries(x); // Convertir la Map en objet
  }

  res.setHeader('content-type', 'application/json')
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).json(mapObj) // Envoyer l'objet converti en JSON
}

export function scanModules(req, res) {
  let filter = req.query;
  let mapObj = {}
  if (filter.addr) {
    velbuslib.VMBscanAll(filter.addr)
    mapObj = {"Message":`Scan launched on ${filter.addr}`, "Error":0}
  } else if (!filter) {
    velbuslib.VMBscanAll()
    mapObj = {"Message":`Scan launched on ALL modules`, "Error":0}
  }
  
  res.setHeader('content-type', 'application/json')
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).json(mapObj) // Envoyer l'objet converti en JSON
}

