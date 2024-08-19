/**
 * @author David ROUMANET <golfy@free.fr>
 * @description VELBUS Library to use with Velbus NodeJS projects
 * @version 1.0
 * @license CommonCreative BY.
 * information from https://github.com/velbus/moduleprotocol
 */

// [ ] Etat Relais
// [ ] Fonctions relais
// [ ] Liste bouton
// [ ] Appui bouton
// [ ] Etat dimmer
// [ ] Fonctions dimmer
// [ ] Etat volet
// [x] Etat température
// [x] Etat énergie (compteurs)


/* ====================================================================================================================
	Velbus frame Format 0F (FB|F8) @@ LL ( FT B2 ... Bn) ## 04 
  --------------------------------------------------------------------------------------------------------------------
 |    0    |   1  |  2   |    3    |  4   |   5   |   6   |   7   |   8   |  ...  |   10  |   11  |     x    |   x+1  |
  --------------------------------------------------------------------------------------------------------------------
 | VMBStrt | Prio | Addr | RTR/Len | Func | Byte2 | Byte3 | Byte4 | Byte5 |  ...  | Byte7 | Byte8 | Checksum | VMBEnd |
  --------------------------------------------------------------------------------------------------------------------
  (1) Len = RTR/Len & 0x0F
  (2) RTR = 1 only for Module Type Request (reception). RTR is Remote Transmit Request
 =================================================================================================================== */

import EventEmitter from 'events';
import { VMBmodule, VMBsubmodule } from '../models/velbuslib_class.mjs';
import * as VMB from './velbuslib_constant.js'
import { FrameModuleScan, FrameRequestName, FrameTransmitTime, FrameRequestTime, CheckSum } from './velbuslib_generic.mjs';
import { FrameRequestMove, FrameRequestStop, FrameHello } from './velbuslib_blind.mjs'
import { relaySet, relayTimer } from './velbuslib_relay.mjs';
import { FrameRequestTemp } from './velbuslib_temp.mjs';
import { FrameRequestCounter } from './velbuslib_input.mjs';
import fs from 'fs'

// What is for this emitter?
const VMBEmitter = new EventEmitter()
const ModulesFile = "VelbusMapData.json"

// General list for event
let moduleList = new Map()		// class VMBmodule
let subModuleList = new Map()	// class VMBsubmodule (child of a VMBmodule)
let VMBNameStatus = new Map()
let VMBTempStatus = new Map()
let VMBEnergyStatus = new Map()
let VMBModification = false
const DEBUG = true

// ============================================================================================================
// =                                    Functions for internal use                                            =
// ============================================================================================================

// Manipulation of subModuleList
function setSubModuleList(addresspart, module) {
	subModuleList.set(addresspart, module)
}
function getSubModuleList(addresspart) {
	return subModuleList.get(addresspart)
}
function fullSubModuleList() {
	return subModuleList
}
function lenSubModuleList() {
	console.log("subModuleList size", subModuleList.size)
	return subModuleList.size
}

// Preload or save modules and submodules file
function saveMapData(ModuleList, subModuleList) {
	const data = {
	  ModuleList: Array.from(ModuleList.entries()),
	  subModuleList: Array.from(subModuleList.entries())
	}
  
	fs.writeFile(ModulesFile, JSON.stringify(data), (err) => {
	  if (err) {
		console.error('Error while trying to save Valbus datas :', err)
	  } else {
		console.log('Datas saved successfully in', ModulesFile)
	  }
	})
  }

  function loadMapData() {
	console.log("💾 Trying to load previous scanned Velbus devices from", ModulesFile, "--------------");
	
	if (fs.existsSync(ModulesFile)) {
	  try {
		const data = fs.readFileSync(ModulesFile, 'utf8');
		const parsedData = JSON.parse(data);
		moduleList = new Map(parsedData.ModuleList);
		subModuleList = new Map(parsedData.subModuleList);
		console.log('Success loading', ModulesFile);
		return subModuleList.size;
	  } catch (err) {
		console.error('Error while loading Velbus data from file:', err);
		return 0;
	  }
	} else {
	  console.log(ModulesFile, 'not found. First Scan needed.');
	  // Logique pour scanner les modules ici
	  return 0;
	}
  }

  // AUTO save (every hour check the VMBModification variable)
  function hourlyCheck() {
	if (VMBModification) {
	  saveMapData(moduleList, subModuleList);
	  VMBModification = false;
	}
  }
  
  let hourlyCheckID = setInterval(hourlyCheck, 60 * 60 * 1000)





// #region FRAME functions
/** ---------------------------------------------------------------------------------------------
 * This function split messages that are in the same frame. Example 0F...msg1...04 / 0F...msg2...04
 * @param {*} data RAW frame that could contains multiple messages
 * @returns array containing one message by cell
 * --------------------------------------------------------------------------------------------*/
const Cut = (data) => {
	let table = [];
	let longueur, VMBSize;
	let i = 0;
	// search for 0x0F header, then look at size byte and check if end byte is in good place
	while (i < data.length) {
		if (data[i] == 0x0F && i + 3 < data.length) {
			longueur = data[i + 3];
			VMBSize = longueur + 3 + 1 + 1;     // message length + offset 3 + checksum + end byte
			if (data[i + VMBSize] == 0x04) {
				// push de i à VMBSize dans tableau
				// console.log("trame OK à position ",i, " longueur ", VMBSize);
				table.push(data.slice(i, i + VMBSize + 1));     // slice utilise position début et position fin
				i = i + VMBSize;
			} else {
				// console.log("octet à longueur VMBSize : ",data[i+VMBSize])
			}
		}
		i++;
	}
	return table;
}


/** --------------------------------------------------------------------------------------------
 * toHexa convert a buffer into a table containing hexa code (2 chars) for each byte
 * @param {Array} donnees byte buffer
 * @returns Hexadecimal string
 * -------------------------------------------------------------------------------------------*/
function toHexa(donnees) {
	if (donnees !== undefined) {
		let c = '';
		let dhex = [];
		for (const donnee of donnees) {
			c = donnee.toString(16).toUpperCase();
			if (c.length < 2) c = '0' + c;
			dhex.push(c);
		}
		return dhex;
	} else { return "" }
}


/** ------------------------------------------------------------------------------------------
 * toButtons convert a binary value into an array with active bit (ex. 0b00110 => [2,4])
 * @param {*} value 
 * @param {*} nb bits number to read (8 by default)
 * @returns array of active button's number
 * -----------------------------------------------------------------------------------------*/
function toButtons(value, nb=8) {
	let response = [];
	let x = 1;
	for (let t = 1; t < (nb + 1); t++) {
		if (value & x) {
			response.push(t);
		}
		x = x << 1
	}
	return response;
}


/** -----------------------------------------------------------------------------------------
 * Convert Binary digit to human part number (0b0100 => 3)
 * @param {*} binValue 
 * @param {*} offset 
 * @returns human readable part
 * ---------------------------------------------------------------------------------------*/
function Bin2Part(binValue, offset = 0) {
	for (let t = 1; t < 9; t++) {
		if (2 ** (t - 1) == binValue) return t + offset
	}
	return offset
}


/** ------------------------------------------------------------------------------------------------------
 * Convert human part number to binary element (5 => 0b10000)
 * @param {*} partValue 
 * @returns binary number of partValue
 * -----------------------------------------------------------------------------------------------------*/
function Part2Bin(partValue) {
	return 2 ** (partValue - 1)
}

/** ------------------------------------------------------------------------------------------------------
 * This function return a name or **** is module doesn't exist
 * @param {*} key key as 'address-part' (ex. 128-3)
 * @returns string name
 * -----------------------------------------------------------------------------------------------------*/
function LocalModuleName(key) {
	let myModule = subModuleList.get(key)
	if (myModule) return myModule.name
	return "****"
}

function resume() {
	return moduleList;
}


/** -------------------------------------------------------------------------------------------------------
 * This function try to reassemble each frame to create a full name for submodule
 * @param {*} element Frame received (should be F0, F1 or F2 for name)
 * ------------------------------------------------------------------------------------------------------*/
function CheckName(element) {
	let key = element[2] + "-" + Bin2Part(element[5])
	let fctVelbus = element[4]

	// if VMBNameStatus doesn't exist, create one and get it value 
	let myModule = VMBNameStatus.get(key)
	if (myModule == undefined) {
		VMBNameStatus.set(key, { "address": element[2], "name": "", "n1": "", "n2": "", "n3": "", "flag": 0 })
		myModule = VMBNameStatus.get(key)
	}
	let name = [myModule.n1, myModule.n2, myModule.n3]
	let nameTmp = ["", "", ""]


	// In case it's first part name response, reset flag: make possible to update full name dynamically
	if (fctVelbus == 0xF0) {
		myModule.flag = 0
	}

	// Prepare to read 6 bytes (0xF0 and 0xF1) or 4 bytes (0xF2)
	let max = 6
	if (fctVelbus == 0xF2) max = 4

	let idx = fctVelbus - 0xF0	// idx could be 2, 1 or 0
	let flag = 2 ** idx			// 2^n transformation (bit 1, 2 or 4)
	let f = myModule.flag		// flag use a OR binary operation with 2⁰, 2¹ and 2²
	
	// Filling name char by char (n1 et n2 => max=6, n3 => max=4 as 15 char)
	for (let t = 0; t < max; t++) {
		if (element[6 + t] != 0xFF) {
			nameTmp[idx] = nameTmp[idx] + String.fromCharCode(element[6 + t])
		}
	}

	// If the received part name is different than previous part name, force VMBModification to true for saving in hourlyCheck()
	if (nameTmp[idx] != name[idx]) {
		VMBModification = true
		name[idx] = nameTmp[idx]
	}

	// in case name is complete (flag = 100 | 010 | 001)
	if ((f | flag) == 0b111) {
		let m = subModuleList.get(key)
		if (m) {
			m.name = name[0]+name[1]+name[2]
			myModule.name = m.name
			logInfo(1, "📌 VELBUS submodule " + key + " is named " + subModuleList.get(key).name)
		} else {
			logInfo(2, "Erreur de lecture du module")
		}
	}
	VMBNameStatus.set(key, { "address": element[2], "name": name[0] + name[1] + name[2], "n1": name[0], "n2": name[1], "n3": name[2], "flag": flag | f })
}


/** ---------------------------------------------------------------------------------------------
 * Check if a module address is already in the list : if yes, it check if it still the same, else
 * it create it, using some constants. 
 * @param {*} VMBmessage message from Velbus bus.
 * --------------------------------------------------------------------------------------------*/
function CheckModule(VMBmessage) {
	let adrVelbus = VMBmessage[2]
	let fctVelbus = Number(VMBmessage[4])
	let typVelbus = VMBmessage[5]
	let buildYear = VMBmessage[9]
	let buildWeek = VMBmessage[10]

	if (moduleList.has(adrVelbus)) {
		// module exist, check if it still same type ?
		if (fctVelbus == 0xFF) {
			let newModule = moduleList.get(adrVelbus)
			if (typVelbus != newModule.modType) {
				// type has changed
				VMBModification = true
				moduleList.set(adrVelbus, ChangeModule(adrVelbus, typVelbus, VMBmessage))
			} else {
				newModule.buildYear = buildYear
				newModule.buildWeek = buildWeek
				moduleList.set(adrVelbus, newModule)
			}
		}

	} else {
		// module doesn't exist : Create VMBModule
		VMBModification = true
		let newModule = new VMBmodule(adrVelbus, 0x00)
		let key, subModTmp
		if (fctVelbus == 0xFF) {
			newModule.modType = typVelbus
			newModule.buildYear = buildYear
			newModule.buildWeek = buildWeek
			newModule.powerConsumption = VMB.getPowerFromType(typVelbus)
			console.log("CREATE TYPE:", newModule.modType)
			newModule.partNumber = VMB.getPartFromCode(newModule.modType)	// Fixed 2024-04-07
			moduleList.set(adrVelbus, newModule)							// Fixed 2024-04-12
			// Création des sous-modules
			for (let i=0; i<newModule.partNumber; i++) {
				key=adrVelbus+"-"+(i+1)
				subModTmp = new VMBsubmodule(adrVelbus, i+1, key, "", {})
				subModTmp.hexId = toHexa([adrVelbus])+"-"+(i+1)
				subModTmp.cat = VMB.getCatFromCode(typVelbus)
				if (typVelbus == 0x22 && i>=4) {
					subModTmp.cat = ["input"]
				}
		
				subModTmp.type = typVelbus
				setSubModuleList(key, subModTmp)
				console.log("  |_ CREATE", key, "TYPE:", subModTmp.type, "FUNCTION:",subModTmp.cat)
				VMBWrite(FrameRequestName(adrVelbus, Part2Bin(i+1)))
			}
		}
	}

}

function ChangeModule(addr, VelbusType, VelbusMsg) {
	let newModule = moduleList.get(addr)
	for (let t=1; t <= newModule.part; t++) {
		if (subModuleList.get(addr+'-'+t)) {
			subModuleList.delete(addr+'-'+t)
		}
	}
	newModule.modType = VelbusType									// new type
	newModule.partNumber = VMB.getPartFromCode(newModule.modType)	// new part number
	newModule.buildYear = VelbusMsg[9]									// new build year
	newModule.buildWeek = VelbusMsg[10]
	let dt = new Date()
	newModule.creationDate = dt.now()
	return newModule
}

// #region Analyze
/** ----------------------------------------------------------------------------------------------
 * Show a detailled information on a message
 * @param {*} element 
 * @returns texte contening information like temperature, status, energy, etc.
 * ---------------------------------------------------------------------------------------------*/
function analyze2Texte(element) {
	let fctVelbus = Number(element[4])
	let adrVelbus = element[2]
	let texte = "@" + adrVelbus.toString(16) + " Fct:" + fctVelbus.toString(16).toUpperCase() + "(" + VMB.getFunctionName(fctVelbus) + ") ► "
	let buttonPress, buttonRelease, buttonLongPress
	let keyModule = ""

	switch (fctVelbus) {
		case 0x00:
			// Button pressed, released or long pressed (> 0.85 sec.)
			buttonPress = toButtons(element[5], 8)
			buttonRelease = toButtons(element[6], 8)
			buttonLongPress = toButtons(element[7], 8)
			texte += (buttonPress.length) ? `Pressed buttons: ${buttonPress} ` : ""
			texte += (buttonRelease.length) ? `Released buttons: ${buttonRelease} ` : ""
			texte += (buttonLongPress.length) ? `LongPressed buttons: ${buttonLongPress} ` : ""
			break;
		case 0xBE: {
			// Read VMB7IN counter
			let division = (element[5] >> 2) * 100;
			let part = (element[5] & 0x3);

			// part is 0 to 3 but keyModule is 1 to 4
			keyModule = element[2] + "-" + (part + 1)
			let compteur = (element[6] * 0x1000000 + element[7] * 0x10000 + element[8] * 0x100 + element[9]) / division;
			compteur = Math.round(compteur * 1000) / 1000;
			let conso = 0;
			if (element[10] != 0xFF && element[11] != 0xFF) {
				conso = Math.round((1000 * 1000 * 3600 / (element[10] * 256 + element[11])) / division * 10) / 10;
			}
			texte += LocalModuleName(keyModule) + " " + compteur + " KW, (Inst. :" + conso + " W) ";
			break;
		}
		case 0xDA:	{	// Bus error counter
			// 5 = TX, 6 = RX, 7 = Bus Off
			let errorTX = element[5]
			let errorRX = element[6]
			let errorBO = element[7]
			texte += `ERROR Counter: TX=${errorTX}, RX=${errorRX}, BusOFF=${errorBO}`
			if (moduleList.get(adrVelbus)) {
				// update existing module with current value
				let dt = new Date()
				let moduleTmp = moduleList.get(adrVelbus)
				moduleTmp.busErrorTX = element[5]
				moduleTmp.busErrorRX = element[6]
				moduleTmp.busErrorBOFF = element[7]
				moduleTmp.busRefreshDate = dt.now()
				moduleList.set(adrVelbus, moduleTmp)
			}
			break
		}
		case 0xE6:
			keyModule = adrVelbus + "-1"
			texte += LocalModuleName(keyModule) + " " + TempCurrentCalculation(element) + "°C";
			break;
		case 0xEA:
			texte += LocalModuleName(keyModule) + " " + Number(element[8]) / 2 + "°C";
			break;
		case 0xF0:
		case 0xF1:
		case 0xF2: {
			CheckName(element)
			let key = adrVelbus + "-" + Bin2Part(element[5])
			texte += " Transmit it name '" + VMBNameStatus.get(key).name + "'"
			break
		}
		case 0xFB:	{	// VMBRelayStatus
			buttonPress = toButtons(element[7], 4);
			texte += " [" + buttonPress + "]" + "Channel: "+element[5]
			let relayTimer = element[9]*(2**16) + element[10]*(2**8) + element[11]
			texte += relayTimer ? `(time: ${relayTimer} sec.)` : ""		// si relayTimer > 0
			let normalStatus = element[7] & 0x0F
			let blinkStatus = (element[7]>>4) & 0x0F
			texte += ` (ON: ${toButtons(normalStatus, 4)}, Blink: ${toButtons(blinkStatus, 4)})`
			break
		}
		case 0xFF: { // Module Type Transmit
			let moduleType = element[5]
			console.log(adrVelbus, "Detected module type ", moduleType)
			break
		}
		default:
			break
	}
	return texte
}
// #endregion


// ============================================================================================================
// =                                          functions VMB ALL                                               =
// ============================================================================================================

/** --------------------------------------------------------------------------------------------------
 * This method write a Velbus frame to the TCP connexion
 * @param {Buffer} req RAW format Velbus frame
 * @param {*} res not used
 * -------------------------------------------------------------------------------------------------*/
async function VMBWrite(req) {
	if (DEBUG) {
		console.log('\x1b[32m', "VelbusLib writing", '\x1b[0m', toHexa(req).join())
	}
	VelbusConnexion.write(req);
	await sleep(10)
}


/** --------------------------------------------------------------------------------------------------
 * Synchronize Velbus with host. If day/hour/minute are wrong (ie. 99) then use system date
 * @param {*} day if any field is wrong, function will use system date
 * @param {*} hour 
 * @param {*} minute 
 * -------------------------------------------------------------------------------------------------*/
function VMBSetTime(day, hour, minute) {
	VMBWrite(FrameTransmitTime(day, hour, minute))
}


/** --------------------------------------------------------------------------------------------------
 * Send a scan request for one or all module
 * @param {*} adrModule could be 0 (all) or any address (1-255)
 * -------------------------------------------------------------------------------------------------*/
function VMBscanAll(adrModule = 0) {
	if (adrModule == 0) {
		for (let t = 0; t < 256; t++) {
			VMBWrite(FrameModuleScan(t))
		}
	} else {
		VMBWrite(FrameModuleScan(adrModule))
	}

}

// #endregion

// #region LISTENER Functions
/* ============================================================================================================
   =                                 functions with Listener                                                  =
   ============================================================================================================
   Basic calculation function are named by Type/Value/Calculation
   Listener are named as 'survey'/Type/'Value'
   Function that return a value are named 'VMBRequest'/Type and read a Map
   ===========================================================================================================*/

function EnergyIndexCalculation(msg) {
	let pulse = (msg.RAW[5] >> 2) * 100
	let rawcounter = msg.RAW[6] * 2 ** 24 + msg.RAW[7] * 2 ** 16 + msg.RAW[8] * 2 ** 8 + msg.RAW[9]
	return Math.round(rawcounter / pulse * 1000) / 1000;
}
function EnergyPowerCalculation(msg) {
	let power = 0
	let pulse = (msg.RAW[5] >> 2) * 100
	if (msg.RAW[10] != 0xFF && msg.RAW[11] != 0xFF) {
		power = Math.round((1000 * 1000 * 3600 / (msg.RAW[10] * 256 + msg.RAW[11])) / pulse * 10) / 10;
	}
	return power
}

// Function that calculate full digit for temperature. PartA is main part, partB is low digit part
function FineTempCalculation(partA, partB) {
	return partA / 2 - Math.round(((4 - partB) >> 5) * 0.0625 * 10) / 10
}
// Function to calculate temperature with high precision
function TempCurrentCalculation(msg) {
	// E6 (Transmit Temp) or EA (Sensor status)
	switch (msg[4]) {
		case 0xE6:
			return FineTempCalculation(msg[5], msg[6])
		case 0xEA:
			return FineTempCalculation(msg[8], msg[9])
		default:
			console.error("ERROR with TempCalculation", msg)
			return undefined
	}
}
function TempMinCalculation(msg) {
	// E6 (Transmit Temp)
	if (msg[4] == 0xE6) {
		return FineTempCalculation(msg[7], msg[8])
	} else {
		return undefined
	}
}
function TempMaxCalculation(msg) {
	// E6 (Transmit Temp)
	if (msg[4] == 0xE6) {
		return FineTempCalculation(msg[9], msg[10])
	} else {
		return undefined
	}
}

/**
 * This function actualize element in the collection 'moduleList'
 * @param {String} key Addr-part of module (ex: 7A-1)
 * @param {Object} value specific status information (temp, counter, etc.)
 */
function UpdateModule(key, value) {
	let m = moduleList.get(key)
	if (m != undefined) {
		m.status = value
		moduleList.set(key, m)
		return true
	} else {
		// unexistant module
		return false
	}
}


// Function to wait before reading values (async problem)
async function sleep(timeout) {
	await new Promise(r => setTimeout(r, timeout));
}

/** 🌡️ GESTION TEMPERATURE
 *  This function use an emitter to receive specific message, then analyze and update module status
 */
function surveyTempStatus() {
	VMBEmitter.on("TempStatus", (msg) => {
		if (msg.RAW[4] == 0xE6) {
			let currentT = TempCurrentCalculation(msg.RAW)
			let minT = TempMinCalculation(msg.RAW)
			let maxT = TempMaxCalculation(msg.RAW)
			let key = msg.RAW[2] + "-1"
			let status = { "current": currentT, "min": minT, "max": maxT, "timestamp": Date.now() }
			// ajout pour gestion avec subModuleList
			let subModTemp = subModuleList.get(key)
			if (subModTemp) {
				subModTemp.status = status
				if (subModTemp.name == undefined) {
					// if it has no name, ask it
					VMBWrite(FrameRequestName(msg.RAW[2], 1))
				}
				if (subModTemp.cat == "") {
					subModTemp.cat = "temp"
				}
			}
		}
	})
}

// 🌡️ GESTION TEMPERATURE
async function VMBRequestTemp(adr, part) {
	let trame = FrameRequestTemp(adr, part);
	VMBWrite(trame);
	await sleep(200);
	let result = VMBTempStatus.get(adr + "-" + part)
	if (result != undefined) return result;
	return { "currentT": 1000, "min": 1000, "max": 1000, "timestamp": Date.now() };

}

// 
/** ☢️ GESTION ENERGIE
 *  This function use an emitter to receive specific message, then analyze and update module status
 */
function surveyEnergyStatus() {
	VMBEmitter.on("EnergyStatus", (msg) => {
		if (msg.RAW[4] == 0xBE) {
			let rawcounter = EnergyIndexCalculation(msg)
			let power = EnergyPowerCalculation(msg)
			let addr = msg.RAW[2]
			let part = (msg.RAW[5] & 3) + 1
			let key = addr + "-" + part
			let status = { "index": rawcounter, "power": power, "timestamp": Date.now() }

			// ajout pour gestion avec subModuleList
			let subModTemp = subModuleList.get(key)
			if (subModTemp) {
				subModTemp.status = status
			} else {
				console.log("NON EXISTENT SUBMODULE", key)
			}
			// Fin ajout
			/*
			VMBEnergyStatus.set(key, status)
			UpdateModule(key, status)

			// Seems we have found a new module (undefined) : send a request for it name
			if (VMBNameStatus.get(key) == undefined) {
				VMBWrite(FrameRequestName(msg.RAW[2], Part2Bin(part)))
				moduleList.set(key, new VMBsubmodule(addr, part, key, "energy", status))
			}
			*/
		}
	})
}

async function VMBRequestEnergy(adr, part) {
	if (part < 5) {
		// Send request to a specific part
		let trame = FrameRequestCounter(adr, Part2Bin(part)); // need to change 1 => 1, 2 => 2, 3 => 4 and 4 => 8
		VMBWrite(trame);
		await sleep(200); // VMBEmitter isn't synchronous, need to wait few milliseconds to be sure answer is back
		// Received answer
		let result = subModuleList.get(adr+"-"+part)
		if (result) return result.status;
		return { "power": undefined, "index": undefined, "timestamp": Date.now() };
	} else {
		// part is 0xF or more : send request on all part of a module
		let tableModule = [];
		let trame = FrameRequestCounter(adr, part || 0xF);
		VMBWrite(trame);

		await sleep(200);
		tableModule.push(subModuleList.get(adr + "-1").status);
		tableModule.push(subModuleList.get(adr + "-2").status);
		tableModule.push(subModuleList.get(adr + "-3").status);
		tableModule.push(subModuleList.get(adr + "-4").status);
		return tableModule;
	}

}

// [ ] Write a function that store the request in a array then,
// [ ] Write a function in receive part, that compare mask & msg and execute callback if true
/*function VMBSearchMsg(msg, callBackFct, part = 0xFF) {
	
}*/
// #endregion

function logInfo(priority, text) {
	if (DEBUG) {
		const symbols = ['🔵', '⚠️', '🛑']
		const priorityNames = ['INFO', 'WARNING', 'ERROR']
		if (typeof(priority) == 'string') {
			priority = priorityNames.indexOf(priority.toUpperCase())
		} 
		if (priority<0 || priority>=priorityNames.length) {
				priority = 0
		}
		const now = new Date();
		const hours = String(now.getHours()).padStart(2, '0')
		const minutes = String(now.getMinutes()).padStart(2, '0')
		const seconds = String(now.getSeconds()).padStart(2, '0')
		const timeString = `${hours}:${minutes}:${seconds}`
	
		const symbol = symbols[priority] || '🤖'
		const priorityName = priorityNames[priority] || 'UNKNOWN'
	
		console.log(`${symbol} [${timeString}] [${priorityName}] ${text}`)
	}
}



// #region VELBUS COMMUNICATION (TCP)
// ============================================================================================================
// =                                           VELBUS SERVER PART                                             =
// ============================================================================================================

const CNX = { host: "127.0.0.1", port: 8445 }
import net from 'net'
import { get } from 'http';

const connectVelbus = (TCPConnexion) => {
	let velbusConnexion = new net.Socket();
	return velbusConnexion;
}

let VelbusConnexion = connectVelbus(CNX);
const VelbusStart = (host, port) => {
	VelbusConnexion.connect(port, host);
}

let ReconnectTimer
let DisconnectDate



VelbusConnexion.on('connect', () => {
	console.log("  ✅ connected to Velbus server > ", VelbusConnexion.remoteAddress, ":", VelbusConnexion.remotePort);
	console.log("--------------------------------------------------------------", '\n\n')
	surveyTempStatus()
	surveyEnergyStatus()

	if (ReconnectTimer != undefined) {
		let duration = ((Date.now() - DisconnectDate) / 1000)
		console.log("Reconnect after ", Math.round(duration / 60), "minuts and", Math.round(duration % 60), "seconds")
		clearInterval(ReconnectTimer)
		ReconnectTimer = undefined
	}

})

VelbusConnexion.once('connect', () => {
	// Load Modules (synchrone method) before starting asynchrone communication with Velbus
	if (!loadMapData()) {
		console.log("subModuleList size", subModuleList.size)
		setTimeout(() => {
			// VMBscanAll() after 1 second
			console.log("Now scanning all devices on BUS 🔎")
			VMBscanAll(0)
		}, 1000)
		setTimeout(() => {
			saveMapData(moduleList, subModuleList) // after 90 second
			console.log("List saved after scan on BUS 💾")
		}, 90000)		
	} else {
		console.log("List loaded, no need to scan on BUS 💾")
	}
})

VelbusConnexion.on('data', (data) => {
	let VMBmessage = {}
	let desc = ''

	// data may contains multiples RAW Velbus frames: send
	Cut(data).forEach(element => {
		CheckModule(element);
		desc = analyze2Texte(element);
		logInfo('INFO', desc)

		VMBmessage = { "RAW": element, "Description": desc, "TimeStamp": Date.now(), "Address": element[2], "Function": element[4] }

		// TODO seems to be for socketIO. Could be removed?
		VMBEmitter.emit("msg", VMBmessage);

		switch (element[4]) {
			case 0xBE:
				VMBEmitter.emit("EnergyStatus", VMBmessage);
				break;
			case 0xE6:
				VMBEmitter.emit("TempStatus", VMBmessage);
				break;
			default:
				break;
		}

	})
});
VelbusConnexion.on('error', (err) => {
	// TODO Check if this part is needed (lost connexion start event 'close') and how...
	console.log("  ❌ Connexion Error! Velbus reusedSocket:", VelbusConnexion.reusedSocket, "   err.code:", err.code)
	if (!VelbusConnexion.destroyed) {
		VelbusConnexion.destroy();
		setTimeout(() => {VelbusConnexion=connectVelbus(CNX)}, 5000) // Reconnexion après 5 secondes
	}
});
VelbusConnexion.on('close', () => {
	console.log("  ✂️ Closing velbus server connexion");
});
VelbusConnexion.once('close', () => {
	// Try to reconnect every 10 seconds
	console.log("  📶 Try velbus server reconnexion");
	DisconnectDate = Date.now()
	ReconnectTimer = setInterval(() => {
		VelbusConnexion.connect(CNX.port, CNX.host)
	}, 10 * 1000)
})
// ==================================================================================
// #endregion


export {
	setSubModuleList, getSubModuleList, lenSubModuleList, fullSubModuleList,
	CheckSum,
	Cut,
	toHexa, Part2Bin,
	VMB, resume,
	VMBWrite, VMBSetTime, VMBscanAll,
	relaySet, relayTimer,
	FrameRequestCounter as CounterRequest,
	VelbusStart, VMBEmitter,
	VMBRequestTemp, VMBRequestEnergy
}

