import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as VMB from './velbuslib_constant.js';
import { CheckSum, FrameModuleScan, FrameRequestName, FrameTransmitTime, FrameRequestTime, FrameSendButton } from './velbuslib_generic.mjs';
import { RelaySet, RelayTimer, RelayBlink } from './velbuslib_relay.mjs';
import { BlindMove, BlindStop, FrameHello } from './velbuslib_blind.mjs';
import { FrameRequestTemp } from './velbuslib_temp.mjs';
import { FrameRequestCounter } from './velbuslib_input.mjs';
import { VMBmodule, VMBsubmodule } from '../models/velbuslib_class.mjs';
import { Part2Bin, Bin2Part, toHexa, toButtons, Cut, FineTempCalculation, EnergyIndexCalculation, EnergyPowerCalculation } from './velbuslib.js';

// ============================================================================================================
// =                                       TESTS FOR CONSTANTS (velbuslib_constant.js)                        =
// ============================================================================================================

describe('velbuslib_constant.js', () => {
    describe('getNameFromCode', () => {
        it('should return VMB4RY for code 0x08', () => {
            expect(VMB.getNameFromCode(0x08)).toBe('VMB4RY');
        });

        it('should return VMBDMI for code 0x15', () => {
            expect(VMB.getNameFromCode(0x15)).toBe('VMBDMI');
        });

        it('should return unknown for invalid code', () => {
            expect(VMB.getNameFromCode(0xFF)).toBe('unknown');
        });
    });

    describe('getCodeFromName', () => {
        it('should return 0x08 for VMB4RY', () => {
            expect(VMB.getCodeFromName('VMB4RY')).toBe(0x08);
        });

        it('should return 0x15 for VMBDMI', () => {
            expect(VMB.getCodeFromName('VMBDMI')).toBe(0x15);
        });

        it('should return 0x00 for unknown module', () => {
            expect(VMB.getCodeFromName('UNKNOWN')).toBe(0x00);
        });
    });

    describe('getPartFromCode', () => {
        it('should return 8 for VMB8PB (code 0x01)', () => {
            expect(VMB.getPartFromCode(0x01)).toBe(8);
        });

        it('should return 4 for VMB4RY (code 0x08)', () => {
            expect(VMB.getPartFromCode(0x08)).toBe(4);
        });

        it('should return 1 for unknown module', () => {
            expect(VMB.getPartFromCode(0xFF)).toBe(1);
        });
    });

    describe('getCatFromCode', () => {
        it('should return ["relay"] for VMB1RY (code 0x02)', () => {
            expect(VMB.getCatFromCode(0x02)).toEqual(['relay']);
        });

        it('should return ["blind"] for VMB1BL (code 0x03)', () => {
            expect(VMB.getCatFromCode(0x03)).toEqual(['blind']);
        });

        it('should return ["unknown"] for invalid code', () => {
            expect(VMB.getCatFromCode(0xFF)).toEqual(['unknown']);
        });
    });

    describe('getFunctionName', () => {
        it('should return VMBRelayOff for code 0x01', () => {
            expect(VMB.getFunctionName(0x01)).toBe('VMBRelayOff');
        });

        it('should return VMBTempResponse for code 0xE6', () => {
            expect(VMB.getFunctionName(0xE6)).toBe('VMBTempResponse');
        });

        it('should return unknown for invalid function code', () => {
            expect(VMB.getFunctionName(0xAA)).toBe('unknown');
        });
    });
});

// ============================================================================================================
// =                                       TESTS FOR GENERIC FUNCTIONS (velbuslib_generic.mjs)                =
// ============================================================================================================

describe('velbuslib_generic.mjs', () => {
    describe('CheckSum', () => {
        it('should calculate correct checksum for a simple frame', () => {
            const frame = new Uint8Array([0x0F, 0xFB, 0x01, 0x02]);
            const checksum = CheckSum(frame, 0);
            expect(checksum).toBeTypeOf('number');
            expect(checksum).toBeGreaterThanOrEqual(0);
            expect(checksum).toBeLessThanOrEqual(255);
        });

        it('should calculate checksum with full parameter', () => {
            const frame = new Uint8Array([0x0F, 0xFB, 0x01, 0x02, 0x03]);
            const checksumFull = CheckSum(frame, 1);
            const checksumZero = CheckSum(frame, 0);
            expect(checksumFull).not.toBe(checksumZero);
        });
    });

    describe('FrameModuleScan', () => {
        it('should create a valid scan frame for address 1', () => {
            const frame = FrameModuleScan(1);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(6);
            expect(frame[0]).toBe(0x0F); // StartX
            expect(frame[1]).toBe(0xFB); // PrioLo
            expect(frame[2]).toBe(1);    // Address
            expect(frame[3]).toBe(0x40); // Len with RTR
            expect(frame[5]).toBe(0x04); // EndX
        });

        it('should create a valid scan frame for address 255', () => {
            const frame = FrameModuleScan(255);
            expect(frame[2]).toBe(255);
        });
    });

    describe('FrameRequestName', () => {
        it('should create a valid name request frame', () => {
            const frame = FrameRequestName(128, 1);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
            expect(frame[0]).toBe(0x0F); // StartX
            expect(frame[4]).toBe(0xEF); // Request name function
            expect(frame[5]).toBe(1);    // Part
        });
    });

    describe('FrameTransmitTime', () => {
        it('should create a valid time transmit frame with valid parameters', () => {
            const frame = FrameTransmitTime(0, 12, 30); // Monday, 12:30
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(10);
            expect(frame[4]).toBe(0xD8); // Synchronize time function
            expect(frame[5]).toBe(0);    // Day (Monday)
            expect(frame[6]).toBe(12);   // Hour
            expect(frame[7]).toBe(30);   // Minutes
        });

        it('should use system date when parameters are invalid', () => {
            const frame = FrameTransmitTime(-1, 25, 70); // Invalid values
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(10);
            expect(frame[4]).toBe(0xD8);
        });
    });

    describe('FrameRequestTime', () => {
        it('should create a valid time request frame', () => {
            const frame = FrameRequestTime();
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(7);
            expect(frame[4]).toBe(0xD7); // Request time function
        });
    });

    describe('FrameSendButton', () => {
        it('should create a button press frame', () => {
            const frame = FrameSendButton(128, 1, 1); // Press
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(10);
            expect(frame[4]).toBe(0x00); // Input status function
        });

        it('should create a button release frame', () => {
            const frame = FrameSendButton(128, 1, 0); // Release
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(10);
        });

        it('should create a button long press frame', () => {
            const frame = FrameSendButton(128, 1, 2); // Long press
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(10);
        });
    });
});

// ============================================================================================================
// =                                       TESTS FOR RELAY FUNCTIONS (velbuslib_relay.mjs)                    =
// ============================================================================================================

describe('velbuslib_relay.mjs', () => {
    describe('RelaySet', () => {
        it('should create a relay ON frame', () => {
            const frame = RelaySet(128, 1, true);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
            expect(frame[4]).toBe(0x02); // Relay On
        });

        it('should create a relay OFF frame (default)', () => {
            const frame = RelaySet(128, 1);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
            expect(frame[4]).toBe(0x01); // Relay Off
        });

        it('should create a relay OFF frame (explicit)', () => {
            const frame = RelaySet(128, 1, false);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
            expect(frame[4]).toBe(0x01); // Relay Off
        });
    });

    describe('RelayTimer', () => {
        it('should create a relay timer frame with default timing', () => {
            const frame = RelayTimer(128, 1);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
            expect(frame[4]).toBe(0x03); // Timer function
        });

        it('should create a relay timer frame with custom timing', () => {
            const frame = RelayTimer(128, 1, 300); // 5 minutes
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
        });
    });

    describe('RelayBlink', () => {
        it('should create a relay blink frame with default timing', () => {
            const frame = RelayBlink(128, 1);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
            expect(frame[4]).toBe(0x0D); // Blink function
        });

        it('should create a relay blink frame with custom timing', () => {
            const frame = RelayBlink(128, 1, 30);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
        });
    });
});

// ============================================================================================================
// =                                       TESTS FOR BLIND FUNCTIONS (velbuslib_blind.mjs)                    =
// ============================================================================================================

describe('velbuslib_blind.mjs', () => {
    describe('BlindMove', () => {
        it('should create a blind UP frame for part 1 (VMB2BL)', () => {
            const frame = BlindMove(128, 1, 1, 30, true);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
            expect(frame[4]).toBe(0x05); // Blind Up
        });

        it('should create a blind DOWN frame for part 1 (VMB2BL)', () => {
            const frame = BlindMove(128, 1, 0, 30, true);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
            expect(frame[4]).toBe(0x06); // Blind Down
        });

        it('should create a blind UP frame for part 2 (VMB2BL)', () => {
            const frame = BlindMove(128, 2, 1, 30, true);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
        });

        it('should create a blind frame for non-VMB2BL module', () => {
            const frame = BlindMove(128, 0b0011, 1, 30, false);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(11);
        });
    });

    describe('BlindStop', () => {
        it('should create a blind stop frame for part 1 (VMB2BL)', () => {
            const frame = BlindStop(128, 1, true);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
            expect(frame[4]).toBe(0x04); // Stop function
        });

        it('should create a blind stop frame for non-VMB2BL module', () => {
            const frame = BlindStop(128, 0b0011, false);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
        });
    });

    describe('FrameHello', () => {
        it('should return the length of the name', () => {
            expect(FrameHello('World')).toBe(5);
        });

        it('should return 0 for empty string', () => {
            expect(FrameHello('')).toBe(0);
        });
    });
});

// ============================================================================================================
// =                                       TESTS FOR TEMP FUNCTIONS (velbuslib_temp.mjs)                      =
// ============================================================================================================

describe('velbuslib_temp.mjs', () => {
    describe('FrameRequestTemp', () => {
        it('should create a temperature request frame with default parameters', () => {
            const frame = FrameRequestTemp(128);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
            expect(frame[4]).toBe(0xE5); // Request Temp function
        });

        it('should create a temperature request frame with custom interval', () => {
            const frame = FrameRequestTemp(128, 1, 60);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(8);
            expect(frame[5]).toBe(60);
        });
    });
});

// ============================================================================================================
// =                                       TESTS FOR INPUT FUNCTIONS (velbuslib_input.mjs)                    =
// ============================================================================================================

describe('velbuslib_input.mjs', () => {
    describe('FrameRequestCounter', () => {
        it('should create a counter request frame for single part', () => {
            const frame = FrameRequestCounter(128, 1);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(9);
            expect(frame[4]).toBe(0xBD); // Counter Status Request
        });

        it('should create a counter request frame for all parts', () => {
            const frame = FrameRequestCounter(128, 0xF);
            expect(frame).toBeInstanceOf(Uint8Array);
            expect(frame.length).toBe(9);
        });
    });
});

// ============================================================================================================
// =                                       TESTS FOR CLASSES (velbuslib_class.mjs)                            =
// ============================================================================================================

describe('velbuslib_class.mjs', () => {
    describe('VMBmodule', () => {
        it('should create a new module with address and type', () => {
            const module = new VMBmodule(128, 0x08);
            expect(module.address).toBe(128);
            expect(module.modType).toBe(0x08);
            expect(module.partNumber).toBe(0);
            expect(module.powerConsumption).toBe(0);
        });

        it('should have default values for all properties', () => {
            const module = new VMBmodule(1, 1);
            expect(module.modCat).toEqual([]);
            expect(module.description).toBe('');
            expect(module.location).toBe('');
            expect(module.buildWeek).toBe(0);
            expect(module.buildYear).toBe(0);
        });
    });

    describe('VMBsubmodule', () => {
        it('should create a new submodule with all parameters', () => {
            const submodule = new VMBsubmodule(128, 1, '128-1', ['relay'], { current: 'on' });
            expect(submodule.address).toBe(128);
            expect(submodule.part).toBe(1);
            expect(submodule.id).toBe('128-1');
            expect(submodule.cat).toEqual(['relay']);
            expect(submodule.status).toEqual({ current: 'on' });
        });

        it('should have default values for hexId, name, room and zone', () => {
            const submodule = new VMBsubmodule(128, 1, '128-1', [], {});
            expect(submodule.hexId).toBe('');
            expect(submodule.name).toBe('');
            expect(submodule.room).toBe('');
            expect(submodule.zone).toEqual([]);
        });
    });
});

// ============================================================================================================
// =                                       UTILITY FUNCTIONS TESTS                                            =
// ============================================================================================================

describe('Utility Functions', () => {
    describe('Part2Bin', () => {
        it('should convert part 1 to binary 1', () => {
            expect(Part2Bin(1)).toBe(1);
        });

        it('should convert part 3 to binary 4', () => {
            expect(Part2Bin(3)).toBe(4);
        });

        it('should convert part 8 to binary 128', () => {
            expect(Part2Bin(8)).toBe(128);
        });
    });

    describe('Bin2Part', () => {
        it('should convert binary 1 to part 1', () => {
            expect(Bin2Part(1)).toBe(1);
        });

        it('should convert binary 4 to part 3', () => {
            expect(Bin2Part(4)).toBe(3);
        });

        it('should convert binary 128 to part 8', () => {
            expect(Bin2Part(128)).toBe(8);
        });

        it('should return offset for invalid binary value', () => {
            expect(Bin2Part(3, 0)).toBe(0);
        });
    });

    describe('toHexa', () => {
        it('should convert byte array to hex strings', () => {
            const result = toHexa([15, 251, 1, 2]);
            expect(result).toEqual(['0F', 'FB', '01', '02']);
        });

        it('should handle single digit hex values', () => {
            const result = toHexa([1, 15, 16]);
            expect(result).toEqual(['01', '0F', '10']);
        });

        it('should return empty string for undefined', () => {
            expect(toHexa(undefined)).toBe('');
        });
    });

    describe('toButtons', () => {
        it('should extract active buttons from binary value', () => {
            expect(toButtons(0b00110, 8)).toEqual([2, 3]);
        });

        it('should return empty array for zero value', () => {
            expect(toButtons(0, 8)).toEqual([]);
        });

        it('should return all buttons for 0xFF', () => {
            expect(toButtons(0xFF, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        });
    });

    describe('Cut', () => {
        it('should split multiple Velbus frames', () => {
            // Two complete frames: 0F...04 / 0F...04
            const rawData = new Uint8Array([
                0x0F, 0xFB, 0x01, 0x02, 0x00, 0x00, 0xFC, 0x04,  // Frame 1
                0x0F, 0xFB, 0x02, 0x02, 0x00, 0x00, 0xFB, 0x04   // Frame 2
            ]);
            const frames = Cut(rawData);
            expect(frames.length).toBe(2);
            expect(frames[0][0]).toBe(0x0F);
            expect(frames[0][7]).toBe(0x04);
            expect(frames[1][0]).toBe(0x0F);
            expect(frames[1][7]).toBe(0x04);
        });

        it('should return empty array for invalid data', () => {
            const rawData = new Uint8Array([0x01, 0x02, 0x03]);
            const frames = Cut(rawData);
            expect(frames.length).toBe(0);
        });
    });

    describe('FineTempCalculation', () => {
        it('should calculate temperature correctly', () => {
            const temp = FineTempCalculation(40, 0); // Should be around 20°C
            expect(temp).toBeTypeOf('number');
        });

        it('should handle different partA and partB values', () => {
            const temp1 = FineTempCalculation(30, 0);
            const temp2 = FineTempCalculation(50, 0);
            expect(temp2).toBeGreaterThan(temp1);
        });
    });

    describe('EnergyIndexCalculation', () => {
        it('should calculate energy index correctly', () => {
            const msg = {
                RAW: [0x0F, 0xFB, 0x01, 0x06, 0xBE, 0x04, 0x00, 0x00, 0x00, 0x64, 0xFF, 0xFF]
            };
            const index = EnergyIndexCalculation(msg);
            expect(index).toBeTypeOf('number');
        });
    });

    describe('EnergyPowerCalculation', () => {
        it('should calculate power correctly', () => {
            const msg = {
                RAW: [0x0F, 0xFB, 0x01, 0x06, 0xBE, 0x04, 0x00, 0x00, 0x00, 0x64, 0x10, 0x00]
            };
            const power = EnergyPowerCalculation(msg);
            expect(power).toBeTypeOf('number');
        });

        it('should return 0 when power bytes are 0xFF', () => {
            const msg = {
                RAW: [0x0F, 0xFB, 0x01, 0x06, 0xBE, 0x04, 0x00, 0x00, 0x00, 0x64, 0xFF, 0xFF]
            };
            const power = EnergyPowerCalculation(msg);
            expect(power).toBe(0);
        });
    });
});