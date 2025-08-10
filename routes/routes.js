/*----------------------------------------------------------------------------
  Routing API functions
  v1.0      Creation
  ----------------------------------------------------------------------------
*/

import * as express from 'express'
import * as CtrlModules from '../controllers/CtrlModules.mjs'
import * as CtrlRelay from '../controllers/CtrlRelay.mjs'
import * as CtrlBlind from '../controllers/CtrlBlind.mjs'
import * as CtrlDimmer from '../controllers/CtrlDimmer.mjs'

const Router = express.Router()
Router.use(express.static('public'))
Router.use(express.json())

// routes list with generic API functions first
Router.post('/modules/blind/:key', CtrlBlind.setDurationToJSON)
Router.get('/modules/name/:key', CtrlModules.getNameToJSON)
Router.post('/modules/name/:key', CtrlModules.setNameToJSON)
Router.get('/modules/status/:key', CtrlModules.getStatusToJSON)
Router.get('/modules/scan', CtrlModules.scanModulesToJSON)
Router.get('/modules', CtrlModules.subModulesToJSON)


// Route to change a module status
Router.post("/relay/:key", CtrlRelay.setRelayStatus)
Router.post("/blind/:key", CtrlBlind.setBlindStatus)
Router.post('/dimmer/:key', CtrlDimmer.setDimmerStatus)

// TODO remove later (this is static file to check API url)
Router.get('/index_listes.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index_listes.html'));
});

// default routes
Router.get('/', (req, res) => { res.send({msg:"200 nothing here"})})
Router.get('*', (req, res) => { res.send({msg:"404 nothing here"})})

export {Router}