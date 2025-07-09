// server/services/fantasyCalcService.js
const axios = require('axios');

/**
 * A helper to cleanse player names for easier matching.
 * @param {string} name The player's name.
 * @returns {string} The cleansed name.
 */
function cleanseNameJs(name) {
    if (typeof name !== 'string') return '';
    // Removes non-alphanumeric characters except spaces and apostrophes, then trims whitespace and converts to lower case.
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Fetches player values from FantasyCalc and returns them as a map for easy lookup.
 * @param {boolean} isDynasty - True for dynasty values, false for redraft.
 * @param {number} numQbs - 1 for 1QB leagues, 2 for Superflex.
 * @param {number} ppr - The points-per-reception setting (e.g., 1 for full, 0.5 for half).
 * @returns {Promise<Map<string, object>>} A promise that resolves to a Map where the key is the cleansed player name and the value is the player's value object.
 */
async function getFantasyCalcValues(isDynasty = true, numQbs = 2, ppr = 1) {
    // The API URL is now dynamic based on the ppr parameter.
    const url = `https://api.fantasycalc.com/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&ppr=${ppr}&numTeams=12`;
    console.log(`Fetching player values from FantasyCalc: ${url}`);

    try {
        const response = await axios.get(url);
        const players = response.data;

        if (!Array.isArray(players)) {
            throw new Error("FantasyCalc API did not return a valid array of players.");
        }

        // Convert the array into a Map for O(1) lookups by cleansed name.
        const playerValueMap = new Map();
        players.forEach(playerData => {
            const sleeperId = playerData?.player?.sleeperId; // Get the Sleeper ID
            if (sleeperId) {
                playerValueMap.set(String(sleeperId), playerData);
            }
        });

        console.log(`Successfully mapped ${playerValueMap.size} players from FantasyCalc.`);
        const finalObject = Object.fromEntries(playerValueMap);
        
        const firstKey = Object.keys(finalObject)[0];
        console.log(`Service is returning an object. Sample key: ${firstKey}, Sample Value:`, finalObject[firstKey]);

        return finalObject

    } catch (error) {
        console.error(`Error fetching or processing FantasyCalc values:`, error.message);
        if (axios.isAxiosError(error) && error.response) {
            throw { status: error.response.status, message: `FantasyCalc API error: ${error.response.statusText}`, data: error.response.data };
        }
        throw { status: 500, message: error.message || "An unexpected error occurred while fetching FantasyCalc values." };
    }
}

module.exports = { getFantasyCalcValues, cleanseNameJs };
