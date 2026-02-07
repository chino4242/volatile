// server/services/fantasyCalcService.js
const axios = require('axios');

/**
 * A helper to cleanse player names for easier matching.
 * @param {string} name The player's name.
 * @returns {string} The cleansed name.
 */
function cleanseNameJs(name) {
    if (typeof name !== 'string') return '';
    // Removes suffixes, non-alphanumeric characters, then trims/lowercases.
    return name
        .replace(/\b(jr|sr|ii|iii|iv|v)\b/gi, '') // Remove suffixes
        .replace(/[^\w\s']+/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
        .toLowerCase();
}

/**
 * Fetches player values from FantasyCalc and returns them as a map for easy lookup.
 * @param {boolean} isDynasty - True for dynasty values, false for redraft.
 * @param {number} numQbs - 1 for 1QB leagues, 2 for Superflex.
 * @param {number} ppr - The points-per-reception setting (e.g., 1 for full, 0.5 for half).
 * @returns {Promise<Map<string, object>>} A promise that resolves to a Map where the key is the cleansed player name and the value is the player's value object.
 */
async function getFantasyCalcValues(isDynasty = true, numQbs = 2, ppr = 1, numTeams = 12) {
    // The API URL is now dynamic based on the ppr parameter.
    const url = `https://api.fantasycalc.com/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&ppr=${ppr}&numTeams=${numTeams}`;
    console.log(`Fetching player values from FantasyCalc: ${url}`);
    // require('fs').appendFileSync('fantasycalc_url_log.txt', new Date().toISOString() + " " + url + "\n");

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Volatile/1.0 (FantasyFootballAnalysis)' }
        });
        const players = response.data;

        if (!Array.isArray(players)) {
            throw new Error("FantasyCalc API did not return a valid array of players.");
        }

        // Convert the array into a Map for O(1) lookups by cleansed name.
        const playerValueMap = new Map();
        players.forEach(playerData => {
            const playerName = playerData?.player?.name;
            const sleeperId = playerData?.player?.sleeperId; // Get the Sleeper ID
            if (playerName) {
                const cleansedName = cleanseNameJs(playerName);
                // The value object now includes the sleeperId
                playerValueMap.set(cleansedName, {
                    value: playerData.value,
                    overallRank: playerData.overallRank,
                    positionRank: playerData.positionRank,
                    sleeperId: sleeperId, // Add the sleeperId to the map value
                    trend30Day: playerData.trend30Day,
                    redraftValue: playerData.redraftValue
                });
            }
        });

        console.log(`Successfully mapped ${playerValueMap.size} players from FantasyCalc.`);
        return playerValueMap;

    } catch (error) {
        console.error(`Error fetching or processing FantasyCalc values:`, error.message);
        if (axios.isAxiosError(error) && error.response) {
            throw { status: error.response.status, message: `FantasyCalc API error: ${error.response.statusText}`, data: error.response.data };
        }
        throw { status: 500, message: error.message || "An unexpected error occurred while fetching FantasyCalc values." };
    }
}

module.exports = { getFantasyCalcValues, cleanseNameJs };
