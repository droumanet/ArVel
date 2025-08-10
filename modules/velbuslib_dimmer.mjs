// ============================================================================================================
// =                                        functions VMB DIMMER                                               =
// ============================================================================================================

import * as VMB from './velbuslib_constant.js'
import * as Velbus from './velbuslib_generic.mjs'
import { Part2Bin } from './velbuslib.js';

/**
 * Function to create frame for changing dimmer's state on a module
 * @param {byte} adr address of module on the bus
 * @param {int} part part to change on module
 * @param {*} state : percentage value (default is OFF = 0%)
 * @param {*} duration : timer for dimming  (default is 0 second)
 * @returns  Velbus frame ready to emit
 */
function DimmerSet(adr, part, state = 0, duration = 0) {
    state = Number(state)
    duration = Number(duration)
	let trame = new Uint8Array(8);
	trame[0] = VMB.StartX;
	trame[1] = VMB.PrioHi;
	trame[2] = adr;
	trame[3] = 0x05;    // len
	trame[4] = 0x07;    // set Dimvalue
    trame[5] = 1;
    trame[6] = Math.min(100,Math.max(0,state))     // value clipped from 0 to 100%
	trame[7] = (duration >> 8) & 0xFF;
    trame[8] = duration & 0xFF;
	trame[9] = Velbus.CheckSum(trame, 0);
	trame[10] = VMB.EndX;
	return trame;
}


export {
    DimmerSet
}