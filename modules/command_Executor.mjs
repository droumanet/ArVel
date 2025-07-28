import * as velbuslib from "./velbuslib.js"

/**
 * Vérifie si toutes les conditions sont remplies
 * @param {Array} conditions Liste des conditions à vérifier
 * @param {Object} modulesList État actuel des modules (objets JSON)
 * @returns {boolean} Vrai si toutes les conditions sont remplies
 */
export function checkConditions(conditions) {
    // no condition, return TRUE
    if (!conditions || conditions.length === 0) {
        return true;
    }
    
    const modulesList = velbuslib.fullSubModuleList()
    let queriedModule
    try {
        // Check each condition (AND logic)
        for (const condition of conditions) {
            // format a modulekey with condition's attribute (ex: '$3C-1') then search in list
            const moduleKey = `${condition.moduleAddress.toString(16).padStart(2, '0')}-${condition.modulePart}`;
            if (modulesList.has(moduleKey)) {
                queriedModule = modulesList.get(moduleKey);
            } else {
                queriedModule = velbuslib.getSubModuleList(moduleKey);
            }
            
            console.log("Queried SubModule", moduleKey, queriedModule)
            // Search if condition's attribute exist (temp, power, etc.)
            const catType = queriedModule.cat.includes(condition.attribute)
            if (catType === undefined) {
                console.warn(`Attribut '${condition.attribute}' introuvable pour le module ${moduleKey}`);
                return false;
            }
            
            let queriedModuleStatus = queriedModule.status.defaultStatus
            
            // Évaluer la condition selon l'opérateur
            let conditionMet = false;
            
            switch (condition.operator) {
                case '==':
                    if (condition.isNumeric) {
                        console.log("Condition == on Number", queriedModuleStatus, condition.expectedStatus)
                        conditionMet = queriedModuleStatus === condition.expectedStatus;
                    } else {
                        console.log("Condition == on Number", queriedModuleStatus, condition.expectedStatus)
                        conditionMet = String(queriedModuleStatus).toLowerCase() === condition.expectedStatus.toLowerCase();
                    }
                    break;
                case '>':
                    console.log("Condition module > value", queriedModuleStatus, condition.expectedStatus)
                    conditionMet = queriedModuleStatus > condition.expectedStatus;
                    break;
                case '<':
                    console.log("Condition module < value", queriedModuleStatus, condition.expectedStatus)
                    conditionMet = queriedModuleStatus < condition.expectedStatus;
                    break;
            }
            
            // Si une condition n'est pas remplie, retourner faux
            if (!conditionMet) {
                return false;
            }
        }
        
        // Toutes les conditions sont remplies
        return true;
        
    } catch (error) {
        console.error(`Erreur lors de la vérification des conditions: `, error);
        return false;
    }
}

/**
 * Exécute une commande sur plusieurs modules
 * @param {string} action L'action à exécuter
 * @param {Array} modules Liste des modules avec leurs paramètres
 */
export function executeCommand(action, modules) {
    const actionLower = action.toLowerCase();
    
    console.warn("module ----- ", modules) // 🖥️
    modules.forEach(module => {
        const { moduleAddress, parsedModulePart, duration } = module;
        
        switch (actionLower) {
            case 'relayblink': {
                const blinkDuration = duration || 5; // 5 secondes par défaut
                velbuslib.VMBWrite(velbuslib.RelayBlink(moduleAddress, parsedModulePart, blinkDuration));
                console.log(`Action "relayblink" exécutée sur le module ${moduleAddress}-${parsedModulePart} avec une durée de ${blinkDuration}s.`);
                break;
            }
            case 'on':
            case 'relayon': {
                velbuslib.VMBWrite(velbuslib.RelaySet(moduleAddress, parsedModulePart, true));
                console.log(`Action "relayOn" exécutée sur le module ${moduleAddress}-${parsedModulePart}.`);
                break;
            }
            case 'off':
            case 'relayoff': {
                velbuslib.VMBWrite(velbuslib.RelaySet(moduleAddress, parsedModulePart, false));
                console.log(`Action "relayOff" exécutée sur le module ${moduleAddress}-${parsedModulePart}.`);
                break;
            }
            case 'relaytimer': {
                velbuslib.VMBWrite(velbuslib.RelayTimer(moduleAddress, parsedModulePart, duration));
                console.log(`Action "relayTimer" exécutée sur le module ${moduleAddress}-${parsedModulePart} pendant ${duration}.`);
                break;
            }
            case 'up':
            case 'blindup': {
                const blindDuration = duration || null;
                if (blindDuration) {
                    velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, parsedModulePart, 1, blindDuration));
                    console.log(`Action "blindUp" avec timer ${blindDuration}s sur le module ${moduleAddress}-${parsedModulePart}.`);
                } else {
                    velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, parsedModulePart, 1));
                    console.log(`Action "blindUp" exécutée sur le module ${moduleAddress}-${parsedModulePart}.`);
                }
                break;
            }
            case 'down':
            case 'blinddown': {
                const blindDuration = duration || null;
                if (blindDuration) {
                    velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, parsedModulePart, -1, blindDuration));
                    console.log(`Action "blindDown" avec timer ${blindDuration}s sur le module ${moduleAddress}-${parsedModulePart}.`);
                } else {
                    velbuslib.VMBWrite(velbuslib.BlindMove(moduleAddress, parsedModulePart, -1));
                    console.log(`Action "blindDown" exécutée sur le module ${moduleAddress}-${parsedModulePart}.`);
                }
                break;
            }
            case 'stop':
            case 'blindstop': {
                velbuslib.VMBWrite(velbuslib.BlindStop(moduleAddress, parsedModulePart));
                console.log(`Action "blindStop" exécutée sur le module ${moduleAddress}-${parsedModulePart}.`);
                break;
            }
            case 'pressbutton': {
                velbuslib.VMBWrite(velbuslib.FrameSendButton(moduleAddress, parsedModulePart, 1));
                velbuslib.VMBWrite(velbuslib.FrameSendButton(moduleAddress, parsedModulePart, 0));
                console.log(`Action "clicButton" exécutée sur le module ${moduleAddress}-${parsedModulePart}.`);
                break;
            }
            case 'longpressbutton': {
                velbuslib.VMBWrite(velbuslib.FrameSendButton(moduleAddress, parsedModulePart, 1));
                setTimeout(() => {
                    velbuslib.VMBWrite(velbuslib.FrameSendButton(moduleAddress, parsedModulePart, 0));
                    console.log(`Action "clicButton" exécutée sur le module ${moduleAddress}-${parsedModulePart}.`);
                }, 1000);
                break;
            }
            default: {
                console.log(`Action inconnue: ${action}`);
            }
        }
    });
}

/**
 * Check and execute all actions where conditions are satisfied
 * @param {Array} actionsToCheck Actions to check and then to execute
 * @param {Object} modulesList Present status for modules
 */
export function checkAndExecuteActions(actionsToCheck) {
    // Obtenir l'heure actuelle formatée pour les logs
    const d = new Date();
    const nowTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const preAlertDelay = 20
    for (const action of actionsToCheck) {
        // Vérifier si toutes les conditions sont remplies
        
        if (checkConditions(action.conditions)) {
            // On prealert, launch blinking command and delay action's
            if (action.preAlert) {
                executeCommand("relayblink", [
                    { moduleAddress: 7, modulePart: 4, duration: 5 },
                    { moduleAddress: 46, modulePart: 1, duration: 5 }
                ]);
                console.log(`${nowTime} Action "${action.action}" on modules will be executed in ${preAlertDelay} seconds`);
                setTimeout(() => {
                    executeCommand(action.action, action.modules)
                    console.log(`${nowTime} Scheduled action "${action.action}" executed on modules`)
                    // Show a list of actions
                    action.modules.forEach(module => {
                        console.log(`${nowTime} Action "${action.action}" on ${module.moduleAddress}-${module.parsedModulePart} now`);
                    })

                }, preAlertDelay*1000);
            } else {
                // Sans préalerte, exécuter l'action immédiatement
                executeCommand(action.action, action.modules);
                
                // Show a list of actions
                action.modules.forEach(module => {
                    console.log(`${nowTime} Action "${action.action}" on ${module.moduleAddress}-${module.parsedModulePart} now`);
                })
            }
        } else {
            console.log(`${nowTime} Action "${action.action}" not executed because conditions are not met`);
        }
    }
}
