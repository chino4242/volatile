/**
 * Standardizes player names for consistent matching across the application.
 * 
 * Rules:
 * - Converts to lowercase
 * - Removes suffixes (Jr, Sr, II, III, IV, V)
 * - Removes periods, quotes, apostrophes, and commas
 * - Normalizes whitespace
 * - Trims leading/trailing spaces
 * 
 * @param {string} name - The player name to cleanse
 * @returns {string} The cleansed name
 * 
 * @example
 * cleanseName("Patrick Mahomes II") // "patrick mahomes"
 * cleanseName("D'Andre Swift") // "dandre swift"
 * cleanseName("T.J. Hockenson") // "tj hockenson"
 */
function cleanseName(name) {
    if (typeof name !== 'string') return '';
    
    return name
        .toLowerCase()
        .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/gi, '') // Remove suffixes with optional period
        .replace(/[.'",]/g, '') // Remove periods, apostrophes, quotes, and commas
        .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
        .trim();
}

module.exports = { cleanseName };
