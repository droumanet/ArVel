/*
   Router : 
*/

import * as express from 'express'
import * as CtrlModules from '../controllers/CtrlModules.mjs'
import * as CtrlRelay from '../controllers/CtrlRelay.mjs'

const Router = express.Router()
Router.use(express.static('public'))

// routes list
Router.get('/modules', CtrlModules.getModules)
Router.get('/scan', CtrlModules.scanModules)

// Route pour activer/désactiver un relais
// TODO POST and not GET ?
Router.get("/name/:addr/:part", CtrlRelay.getName)
Router.get("/relay/:addr/:part/:status", CtrlRelay.setRelayStatus)

// TODO remove later
Router.get('/index_listes.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index_listes.html'));
});


// default routes
Router.get('/', (req, res) => { res.send({msg:"nothing here"})})
Router.get('*', (req, res) => { res.send({msg:"nothing here"})})

export {Router}