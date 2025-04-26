import * as velbuslib from "./velbuslib.js"

// Fonction pour exécuter une commande Velbus
export function executeCommand(action, moduleAddress, modulePart, duration) {
    switch (action.toLowerCase()) {
        case 'relayblink': {
            const blinkDuration = duration || 5; // Par défaut, 5 secondes si non spécifié
            velbuslib.VMBWrite(velbuslib.RelayBlink(moduleAddress, modulePart, blinkDuration));
            break;
        }
        case 'relayon': {
            velbuslib.VMBWrite(velbuslib.RelayOn(moduleAddress, modulePart))
            break;
        }
        case 'relayoff': {
            velbuslib.VMBWrite(velbuslib.RelayOff(moduleAddress, modulePart))
            break;
        }
        case 'relaytimer': {
            velbuslib.VMBWrite(velbuslib.RelayTimer(moduleAddress, modulePart, duration))
            break;
        }
        case 'pressbutton': {
            velbuslib.VMBWrite(velbuslib.PressButton(moduleAddress, modulePart))
            break;
        }
        case 'blinddown': {
            velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, modulePart, -1, duration))
            break;
        }
        case 'blindup': {
            velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, modulePart, +1, duration))
            break;
        }
        case 'blindstop': {
            velbuslib.VMBWrite(velbuslib.BlindStop(moduleAddress, modulePart))
            break;
        }
        case 'dimon': {
            // velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, modulePart, +1, duration))
            break;
        }
        case 'dimoff': {
            // velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, modulePart, +1, duration))
            break;
        }
        default: {
            console.log(`Action inconnue : ${action}`);
        }
    }
}
