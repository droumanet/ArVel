import fs from 'fs';
import path from 'path';

// Fonction pour lire et analyser le fichier
export function parseScheduleFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => {
            return line.trim() !== '' && !line.trim().startsWith('#');
        });

        const schedule = lines.map(line => {
            const [time, days, action, module, preAlert] = line.split(' ');
            const [hour, minute] = time.split(':').map(Number);

            // Analyse du module et de la durée (si spécifiée)
            const moduleParts = module.replace('$', '').split('=');
            const [moduleAddress, modulePart] = moduleParts[0].split('-').map(part => parseInt(part, 16));
            const duration = moduleParts[1] ? parseInt(moduleParts[1], 10) : null;

            return {
                hour,
                minute,
                days,
                action,
                moduleAddress,
                modulePart,
                duration, // Durée du clignotement (si applicable)
                preAlert: preAlert === '!',
            };
        });

        return schedule;
    } catch (error) {
        console.error('Error while reading or parsing the file: ', error.message);
        return [];
    }
}

/**
 * Return list on action to do at the time passed as parameter
 * @param {List} schedule 
 * @param {Date} now The actual time for checking if action in schedule is needed
 * @returns List of actions to do
 */
export function getActionsToExecute(schedule, now) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return schedule.filter(item => {
        return item.hour === currentHour && item.minute === currentMinute;
    });
}
