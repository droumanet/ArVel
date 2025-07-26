export function isDaylightSavingTime(date = new Date()) {
    // Obtenir le décalage horaire en minutes pour la date actuelle
    const january = new Date(date.getFullYear(), 0, 1); // Janvier (hiver)
    const july = new Date(date.getFullYear(), 6, 1);    // Juillet (été)

    // Comparer le décalage horaire de janvier (hiver) et juillet (été)
    const standardTimezoneOffset = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());

    // Si le décalage actuel est inférieur au décalage standard, on est en heure d'été
    return date.getTimezoneOffset() < standardTimezoneOffset;
}

/**
 * Convert a date (number) to a string "AAAA-"
 * @param {*} theDate element like new Date()
 * @returns String
 */
export function TimeStamp2Date(TS = new Date()) {
    return `${TS.getFullYear()}-${String(TS.getMonth() + 1).padStart(2, '0')}-${String(TS.getDate()).padStart(2, '0')} ${String(TS.getHours()).padStart(2, '0')}:${String(TS.getMinutes()).padStart(2, '0')}:${String(TS.getSeconds()).padStart(2, '0')}`
}