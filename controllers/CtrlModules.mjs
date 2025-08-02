/*----------------------------------------------------------------------------
  Modules
  ----------------------------------------------------------------------------
*/
import * as velbuslib from "../modules/velbuslib.js"

/**
 * Answer to GET /modules?cat=blind
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export function subModulesToJSON(req, res) {
  let httpStatus = 200
  let httpResponse
  let filter = req.query;
  if (filter.cat) {
    console.log("*** API CTRL-Module : request with Filter", filter)
    let y = new Map()
    for (const [key, value] of velbuslib.subModulesList) {
      const moduleData = velbuslib.subModulesList.get(key);
      // Vérification complète avant d'utiliser .some()
      if (moduleData && moduleData.cat && Array.isArray(moduleData.cat) && 
          moduleData.cat.some(cat => cat === filter.cat)) {
        y.set(key, value);
      } else if (!Array.isArray(moduleData.cat) ) {
        console.log("⚠️ Error on filtered request with ", key, moduleData)
        httpStatus = 400
      }
    }
    httpResponse = Object.fromEntries(y);
  } else {
    console.log("*** API CTRL-Module : request without filter ***")
    httpResponse = Object.fromEntries(velbuslib.subModulesList);
  }

  res.setHeader('content-type', 'application/json')
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.status(httpStatus).json(httpResponse) // Send object in JSON format
}

/**
 * Answer to /scan?adr=xx
 * @param {*} req 
 * @param {*} res 
 */
export function scanModulesToJSON(req, res) {
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
  res.status(200).json(mapObj) // Send object in JSON format
}

export function getNameToJSON(req, res) {
    const key = req.params.key;
    const x = velbuslib.subModulesList
    let httpStatus = 400
    let response = undefined
    
    console.log("🕸️", key, `request to get name of ${key}`)
    if (key) {
        let subModule = x.get(key)
        if (subModule) {
          response = subModule.name
          httpStatus = 200
        } 
    }
    res.setHeader('content-type', 'application/json')
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(httpStatus).json({name:response})
}

export function getStatusToJSON(req, res) {
    const key = req.params.key;
    const x = velbuslib.subModulesList
    let httpStatus = 400
    let response = undefined
    
    console.log("🕸️", key, `request to get status of ${key}`)
    if (key) {
        let subModule = x.get(key)
        if (subModule) {
          response = subModule.status
          httpStatus = 200
        } 
    }
    res.setHeader('content-type', 'application/json')
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.status(httpStatus).json(response)
}
