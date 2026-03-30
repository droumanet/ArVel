import SunCalc from 'suncalc'
import appProfile from './config/appProfile.json' with {type: "json"}

/**
 * Compute if the date is in daylight saving time
 * @param {*} date current date
 * @returns true if the date is in daylight saving time
 */
export function isDaylightSavingTime(date = new Date()) {
    // First step: get the offset in this area
    const january = new Date(date.getFullYear(), 0, 1); // 1er janvier (heure standard)
    const july = new Date(date.getFullYear(), 6, 1);    // 1er juillet (potentielle heure d'été)
    const standardOffset = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());

    // Now return if current date offset is less than standard offset
    return date.getTimezoneOffset() < standardOffset;
}

/**
 * Convert a date (number) to a string "AAAA-MM-JJ HH:mm:ss"
 * @param {Date} TS element like new Date()
 * @returns String
 */
export function TimeStamp2Date(TS = new Date()) {
    return TS.toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

/**
 * Get a specific hour depending of sun position (sunrise, sunset, night)
 * @param {*} positionString position needed (by default "night")
 * @param {*} forcedOffsetMinut offset to adjust an event (ex. closing blind 5 minuts before night)
 * @returns Calculated time for the event
 */
export function getSunHour(positionString="dusk", forcedOffsetMinut=0) {
    let rawHour
    let iconText="🌆"
        
    switch(positionString.toLowerCase()) {
        case "night":
            rawHour = SunCalc.getTimes(new Date(), appProfile.locationX, appProfile.locationY).night;
            iconText="🌃"
            break;
        case "sunset":
            rawHour = SunCalc.getTimes(new Date(), appProfile.locationX, appProfile.locationY).sunset;
            iconText = "🌙"
            break;
        case "dusk":
            rawHour = SunCalc.getTimes(new Date(), appProfile.locationX, appProfile.locationY).dusk;
            iconText = "🌆";
            break;
        case "sunrise":
            rawHour = SunCalc.getTimes(new Date(), appProfile.locationX, appProfile.locationY).sunrise;
            iconText = "☀️"
            break;
        default:
            rawHour = SunCalc.getTimes(new Date(), appProfile.locationX, appProfile.locationY).dusk;
    }

    console.log("⌚️", TimeStamp2Date(new Date(Date.now())), iconText+" "+TimeStamp2Date(rawHour), "OffsetMinut:", forcedOffsetMinut)
    

    return new Date(rawHour.getTime() + forcedOffsetMinut*60*1000);
}
