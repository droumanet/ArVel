// ============================================================================================================
// =                                        functions VMB BLIND                                               =
// ============================================================================================================
// [ ] Write this module as CtrlSensor.js

import * as VMB from './velbuslib_constant.js'
import * as Velbus from './velbuslib_generic.mjs'
import { Part2Bin } from './velbuslib.js';

/**
 * Function to create frame for moving UP or DOWN blind on a module
 * @param {byte} adr address of module on the bus
 * @param {int} part part to move on module (%0011 or %1100 or %1111)
 * @param {int} state 0+: moveUP, other moveDOWN
 * @param {int} duration in seconds, default 30 seconds
 * @returns Velbus frame ready to emit
 */
 function BlindMove(adr, part, state, duration = 0, vmb2bl=true) {
	if (vmb2bl) {
		if (part == 1) { part = 0b0011 }
		else if (part == 2) { part = 0b1100 }
		else { part = 0b1111 }
	}
	if (state > 0) { state = 0x05 } else { state = 0x06 }
	let trame = new Uint8Array(11)
	trame[0] = VMB.StartX
	trame[1] = VMB.PrioHi
	trame[2] = adr
	trame[3] = 0x05   // len
	trame[4] = state
	trame[5] = part
	trame[6] = duration >> 16 & 0xFF
	trame[7] = duration >> 8 & 0xFF
	trame[8] = duration & 0xFF
	trame[9] = Velbus.CheckSum(trame, 0)
	trame[10] = VMB.EndX
	return trame
}
function BlindStop(adr, part, vmb2bl=true) {
	if (vmb2bl) {
		if (part == 1) { part = 0b0011 }
		else if (part == 2) { part = 0b1100 }
		else { part = 0b1111 }
	}
	let trame = new Uint8Array(8)
	trame[0] = VMB.StartX
	trame[1] = VMB.PrioHi
	trame[2] = adr
	trame[3] = 0x02     // len
	trame[4] = 0x04     // stop
	trame[5] = part
	trame[6] = Velbus.CheckSum(trame, 0)
	trame[7] = VMB.EndX
	return trame
}

function FrameHello (name) {
    console.log("Hello ", name)
	return name.length
}

// ==========================================================================================================

export {
    BlindMove,
    BlindStop,
    FrameHello
}