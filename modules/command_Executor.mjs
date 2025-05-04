import * as velbuslib from "./velbuslib.js"

/**
 * Vérifie si toutes les conditions sont remplies
 * @param {Array} conditions Liste des conditions à vérifier
 * @param {Object} moduleStates État actuel des modules (objets JSON)
 * @returns {boolean} Vrai si toutes les conditions sont remplies
 */
export function checkConditions(conditions, moduleStates = {}) {
    // S'il n'y a pas de conditions, retourner vrai
    if (!conditions || conditions.length === 0) {
        return true;
    }
    
    try {
        // Vérifier chaque condition (ET logique)
        for (const condition of conditions) {
            // Formater la clé du module
            const moduleKey = `${condition.moduleAddress.toString(16).padStart(2, '0')}-${condition.modulePart}`;
            
            // Obtenir l'état du module (objet JSON)
            let moduleStatus;
            
            if (moduleStates[moduleKey] !== undefined) {
                moduleStatus = moduleStates[moduleKey];
            } else {
                // Utilisation de la méthode synchrone de velbuslib
                moduleStatus = velbuslib.getSubModuleList(moduleKey);
            }
            
            // Accéder à l'attribut spécifié dans la condition (comme temp, power, etc.)
            const attributeValue = moduleStatus[condition.attribute];
            
            // Si l'attribut n'existe pas, la condition échoue
            if (attributeValue === undefined) {
                console.warn(`Attribut '${condition.attribute}' introuvable pour le module ${moduleKey}`);
                return false;
            }
            
            // Évaluer la condition selon l'opérateur
            let conditionMet = false;
            
            switch (condition.operator) {
                case '==':
                    if (condition.isNumeric) {
                        conditionMet = attributeValue === condition.expectedStatus;
                    } else {
                        conditionMet = String(attributeValue).toLowerCase() === condition.expectedStatus.toLowerCase();
                    }
                    break;
                case '>':
                    conditionMet = attributeValue > condition.expectedStatus;
                    break;
                case '<':
                    conditionMet = attributeValue < condition.expectedStatus;
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
    // Convertir l'action en minuscules pour insensibilité à la casse
    const actionLower = action.toLowerCase();
    
    modules.forEach(module => {
        const { moduleAddress, modulePart, duration } = module;
        
        switch (actionLower) {
            case 'relayblink': {
                const blinkDuration = duration || 5; // 5 secondes par défaut
                velbuslib.VMBWrite(velbuslib.RelayBlink(moduleAddress, modulePart, blinkDuration));
                console.log(`Action "relayblink" exécutée sur le module ${moduleAddress}-${modulePart} avec une durée de ${blinkDuration}s.`);
                break;
            }
            case 'relayon': {
                velbuslib.VMBWrite(velbuslib.RelayOn(moduleAddress, modulePart));
                console.log(`Action "relayOn" exécutée sur le module ${moduleAddress}-${modulePart}.`);
                break;
            }
            case 'relayoff': {
                velbuslib.VMBWrite(velbuslib.RelayOff(moduleAddress, modulePart));
                console.log(`Action "relayOff" exécutée sur le module ${moduleAddress}-${modulePart}.`);
                break;
            }
            case 'blindup': {
                const blindDuration = duration || null;
                if (blindDuration) {
                    velbuslib.VMBWrite(velbuslib.BlindUpWithTimer(moduleAddress, modulePart, blindDuration));
                    console.log(`Action "blindUp" avec timer ${blindDuration}s sur le module ${moduleAddress}-${modulePart}.`);
                } else {
                    velbuslib.VMBWrite(velbuslib.BlindUp(moduleAddress, modulePart));
                    console.log(`Action "blindUp" exécutée sur le module ${moduleAddress}-${modulePart}.`);
                }
                break;
            }
            case 'blinddown': {
                const blindDuration = duration || null;
                if (blindDuration) {
                    velbuslib.VMBWrite(velbuslib.BlindDownWithTimer(moduleAddress, modulePart, blindDuration));
                    console.log(`Action "blindDown" avec timer ${blindDuration}s sur le module ${moduleAddress}-${modulePart}.`);
                } else {
                    velbuslib.VMBWrite(velbuslib.BlindDown(moduleAddress, modulePart));
                    console.log(`Action "blindDown" exécutée sur le module ${moduleAddress}-${modulePart}.`);
                }
                break;
            }
            case 'blindstop': {
                velbuslib.VMBWrite(velbuslib.BlindStop(moduleAddress, modulePart));
                console.log(`Action "blindStop" exécutée sur le module ${moduleAddress}-${modulePart}.`);
                break;
            }
            case 'clicbutton': {
                velbuslib.VMBWrite(velbuslib.FrameSendButton(moduleAddress, modulePart, 1));
                velbuslib.VMBWrite(velbuslib.FrameSendButton(moduleAddress, modulePart, 0));
                console.log(`Action "clicButton" exécutée sur le module ${moduleAddress}-${modulePart}.`);
                break;
            }
            default: {
                console.log(`Action inconnue: ${action}`);
            }
        }
    });
}

/**
 * Vérifie et exécute les actions dont les conditions sont remplies
 * @param {Array} actionsToCheck Actions à vérifier et potentiellement exécuter
 * @param {Object} moduleStates État actuel des modules
 */
export function checkAndExecuteActions(actionsToCheck, moduleStates = {}) {
    // Obtenir l'heure actuelle formatée pour les logs
    const d = new Date();
    const nowTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    
    for (const action of actionsToCheck) {
        // Vérifier si toutes les conditions sont remplies
        
        if (checkConditions(action.conditions, moduleStates)) {
            // Si une préalerte est demandée
            if (action.preAlert) {
                // Exécuter immédiatement les commandes de préalerte (clignotement)
                executeCommand("relayblink", [
                    { moduleAddress: 7, modulePart: 4, duration: 5 },
                    { moduleAddress: 46, modulePart: 1, duration: 5 }
                ]);
                
                // Afficher un message indiquant que l'action sera exécutée dans quelques secondes
                console.log(`${nowTime} Action "${action.action}" on modules will be executed in few seconds`);
                
                // Programmer l'exécution de l'action principale après 20 secondes
                setTimeout(() => {
                    executeCommand(action.action, action.modules);
                    console.log(`${nowTime} Scheduled action "${action.action}" executed on modules`);
                }, 20000);
            } else {
                // Sans préalerte, exécuter l'action immédiatement
                executeCommand(action.action, action.modules);
                
                // Afficher un message pour chaque module
                action.modules.forEach(module => {
                    console.log(`${nowTime} Action "${action.action}" on ${module.moduleAddress}-${module.modulePart} now`);
                });
            }
        } else {
            console.log(`${nowTime} Action "${action.action}" not executed because conditions are not met`);
        }
    }
}
