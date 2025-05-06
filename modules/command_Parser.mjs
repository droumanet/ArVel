import fs from 'fs';
import path from 'path';

/*
    The parser part should parse a file where each line contains an action by hour, day, type of action, module address-part.
    An # is to command a line.
    An ! imply a warning (blinking light) before launching action
    [$02-4.temp>25] at end of a line is a condition to execute action (checks if temp attribute > 25)
    # Format : 07:25 LMM-V-- relayblink $07-4=x ! [$1B-1.power<5000]
    # Actions: relayBlink, relayTimer, relayOff, relayOn, PressButton, LongPressButton, blindUp, blindDown, blindStop
*/

// Fonction pour lire et analyser le fichier
export function parseScheduleFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => {
            return line.trim() !== '' && !line.trim().startsWith('#');
        });

        const schedule = lines.map(line => {
            // Extract parts: time, days, action
            const parts = line.split(' ');
            const time = parts[0];
            const days = parts[1];
            const action = parts[2];
            
            const [hour, minute] = time.split(':').map(Number);

            // Process modules with their parameters
            const modules = [];
            let currentIndex = 3; // Start after action
            
            // Process all modules (starting with $)
            while (currentIndex < parts.length && parts[currentIndex].startsWith('$')) {
                const modulePart = parts[currentIndex];
                
                // Check if module has a duration parameter (=)
                if (modulePart.includes('=')) {
                    const [moduleStr, durationStr] = modulePart.split('=');
                    const [moduleAddress, modulePart] = moduleStr.replace('$', '').split('-').map(part => parseInt(part, 16));
                    
                    modules.push({
                        moduleAddress,
                        modulePart,
                        duration: parseInt(durationStr, 10)
                    });
                } else {
                    const [moduleAddress, modulePart] = modulePart.replace('$', '').split('-').map(part => parseInt(part, 16));
                    
                    modules.push({
                        moduleAddress,
                        modulePart,
                        duration: null
                    });
                }
                
                currentIndex++;
            }
            
            // Check for pre-alert
            const preAlert = line.includes(' ! ') || parts.includes('!');
            
            // Extract all conditions with attribute support
            const conditionRegexes = [
                // Numeric equals with attribute: [$02-4.temp==25]
                /\[\$([0-9A-Fa-f]+)-([0-9]+)\.([a-zA-Z0-9_]+)==([0-9]+)\]/g,
                
                // String equals with attribute: [$02-4.mode=="auto"]
                /\[\$([0-9A-Fa-f]+)-([0-9]+)\.([a-zA-Z0-9_]+)=="([^"]+)"\]/g,
                
                // Greater than with attribute: [$02-4.temp>25]
                /\[\$([0-9A-Fa-f]+)-([0-9]+)\.([a-zA-Z0-9_]+)>([0-9]+)\]/g,
                
                // Less than with attribute: [$1B-1.power<5000]
                /\[\$([0-9A-Fa-f]+)-([0-9]+)\.([a-zA-Z0-9_]+)<([0-9]+)\]/g
            ];
            
            const conditions = [];
            
            for (const regex of conditionRegexes) {
                let match;
                regex.lastIndex = 0; // Reset regex state
                
                while ((match = regex.exec(line)) !== null) {
                    // Determine operator type based on regex
                    let operator = '==';
                    let isNumeric = true;
                    
                    if (regex.toString().includes('>')) {
                        operator = '>';
                    } else if (regex.toString().includes('<')) {
                        operator = '<';
                    } else if (regex.toString().includes('=="')) {
                        operator = '==';
                        isNumeric = false;
                    }
                    
                    conditions.push({
                        moduleAddress: parseInt(match[1], 16),
                        modulePart: parseInt(match[2], 10),
                        attribute: match[3], // Attribut comme 'temp' ou 'power'
                        operator,
                        expectedStatus: isNumeric ? parseInt(match[4], 10) : match[4],
                        isNumeric
                    });
                }
            }
            
            return {
                hour,
                minute,
                days,
                action,
                modules, // Tableau de modules avec leurs paramètres
                preAlert,
                conditions // Tableau de conditions
            };
        });

        return schedule;
    } catch (error) {
        console.error('❌ Command_Parser: Error while reading or parsing the file: ', error.message);
        return [];
    }
}

/**
 * Return list of actions to do at the time passed as parameter
 * @param {List} schedule 
 * @param {Date} now The actual time for checking if action in schedule is needed
 * @returns List of actions to do
 */
export function getActionsToExecute(schedule, now) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayMap = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // Dimanche à Samedi
    const currentDay = dayMap[now.getDay()];
    
    // Filtrer par heure et jour
    return schedule.filter(item => {
        return item.hour === currentHour && 
               item.minute === currentMinute &&
               item.days.charAt(now.getDay()) !== '-';
    });
}
