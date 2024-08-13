/*
   Router : 
*/

import * as express from 'express'
const Router = express.Router()

import * as CtrlModules from '../controllers/CtrlModules.mjs'
import * as CtrlRelay from '../controllers/CtrlRelay.mjs'

// routes list
Router.get('/modules', CtrlModules.getModules)

// Route pour activer/désactiver un relais
// TODO POST and not GET
Router.get("/relay/:addr/:part/:status", CtrlRelay.setRelayStatus)
Router.get("/relay", CtrlRelay.setRelayStatus2)

// default routes
Router.get('/', (req, res) => { res.send({msg:"nothing here"})})
Router.get('*', (req, res) => { res.send({msg:"nothing here"})})

export {Router}