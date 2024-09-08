// ============================================================================================================
// =                                        functions VMB RELAY                                               =
// ============================================================================================================
// [ ] Write this module as CtrlSensor.js

import * as VMB from './velbuslib_constant.js'
import * as Velbus from './velbuslib_generic.mjs'
import { Part2Bin } from './velbuslib.js';

/**
 * Function to create frame for changing relay's state on a module
 * @param {byte} adr address of module on the bus
 * @param {int} part part to change on module
 * @param {*} state  optionnal : true (on) or false (off), default false
 * @returns  Velbus frame ready to emit
 */
function RelaySet(adr, part, state = false) {
	let trame = new Uint8Array(8);
	trame[0] = VMB.StartX;
	trame[1] = VMB.PrioHi;
	trame[2] = adr;
	trame[3] = 0x02;    // len
	if (state) trame[4] = 0x02; else trame[4] = 0x01;     // true=ON, false=OFF 
	trame[5] = Part2Bin(part);
	trame[6] = Velbus.CheckSum(trame, 0);
	trame[7] = VMB.EndX;
	return trame;
}

/**
 * Function to create frame for activating relay's state for a delimited time on a module
 * @param {byte} adr address of module on the bus
 * @param {int} part part to change on module
 * @param {*} timing  value in second, from 1 to FFFFFF (permanent), default 120 seconds
 * @returns  Velbus frame ready to emit
 */
function RelayTimer(adr, part, timing = 120) {
	let thigh = timing >> 16 & 0xFF;
	let tmid = timing >> 8 & 0xFF;
	let tlow = timing & 0xFF;
	let trame = new Uint8Array(11);
	trame[0] = VMB.StartX;
	trame[1] = VMB.PrioHi;
	trame[2] = adr;
	trame[3] = 0x05;    // len
	trame[4] = 0x03;	// timer function
	trame[5] = Part2Bin(part);
	trame[6] = thigh;   // timer with 3 bytes
	trame[7] = tmid;
	trame[8] = tlow;
	trame[9] = Velbus.CheckSum(trame, 0);
	trame[10] = VMB.EndX;
	return trame;
}


/**
 * Function to create frame for activating relay's state for a delimited time on a module
 * @param {byte} adr address of module on the bus
 * @param {int} part part to change on module
 * @param {*} timing  value in second, from 1 to FFFFFF (permanent), default 120 seconds
 * @returns  Velbus frame ready to emit
 */
function RelayBlink(adr, part, timing = 10) {
	let thigh = timing >> 16 & 0xFF;
	let tmid = timing >> 8 & 0xFF;
	let tlow = timing & 0xFF;
	let trame = new Uint8Array(11);
	trame[0] = VMB.StartX;
	trame[1] = VMB.PrioHi;
	trame[2] = adr;
	trame[3] = 0x05;    // len
	trame[4] = 0x0D;	// blink function
	trame[5] = Part2Bin(part);
	trame[6] = thigh;   // timer with 3 bytes
	trame[7] = tmid;
	trame[8] = tlow;
	trame[9] = Velbus.CheckSum(trame, 0);
	trame[10] = VMB.EndX;
	return trame;
}

export {
    RelaySet,
    RelayTimer,
	RelayBlink
}