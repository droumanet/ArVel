 import * as VMB from '../modules/velbuslib_constant.js'
 
class VMBmodule {
	address = 0
	modType = 0
	modCat = []
	partNumber = 0
	powerConsumption = 0		// consumption in mA
	description = ""
	location = ""
	creationDate = 0
	buildWeek = 0
	buildYear = 0
	busErrorTX = 0
	busErrorRX = 0
	busErrorOFF = 0
	busRefreshDate = 0

	/**
	 * Create a new module
	 * @param {Int} address 
	 * @param {Int} type 
	 */
	constructor(address, type) {
		this.address = address
		this.modType = type


	}
}

class VMBsubmodule {
	address = 0		// from 1 to 250
	part = 0		// part in main module (at least, is equal to 1)
	id = ""			// adr-part : part always be 1 to n, ex. VMB1TS would be 128-1
	hexId=""		// adr-part but in hexadecimal format. 170-4 ==> AA-4 (more readable)
	name = ""
	type = 0		// exact type module
	cat=[""]		// category like 'temp', 'energy', 'relay', 'lamp', 'dimmer', blind', 'motor'...
	status = {}		// object containing the specific status
	room = ""
	zone = []		// could be multiple : room, floor, orientation (west, north...) or some useful tags

	/**
	 * Create a new SubModule
	 * @param {Int} address (0-255)
	 * @param {Int} part (1-x)
	 * @param {String} key adr-part (ex. 128-4)
	 * @param {Array<String>} cat contains energy, blind, relay...
	 * @param {Object} status non standard information (temp, energy, relay state,...)
	 */
	constructor(address, part, key, cat, status) {
		this.address = address
		this.part = part
		this.id = key
		this.cat = cat
		this.status = status
	}
}


export {
	VMBmodule, VMBsubmodule
}