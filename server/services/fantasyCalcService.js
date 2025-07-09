// server/services/fantasyCalcService.js
const axios = require('axios');

/**
 * Fetches player values from FantasyCalc and returns them as a map for easy lookup.
 * @param {boolean} isDynasty - True for dynasty values, false for redraft.
 * @param {number} numQbs - 1 for 1QB leagues, 2 for Superflex.
 * @param {number} ppr - The points-per-reception setting (e.g., 1 for full, 0.5 for half).
 * @returns {Promise<object>} A promise that resolves to a plain object where the key is the player's Sleeper ID.
 */
async function getFantasyCalcValues(isDynasty = true, numQbs = 2, ppr = 1) {
    try {
        const url = `https://api.fantasycalc.com/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&ppr=${ppr}&numTeams=12`;
        console.log(`Fetching player values from FantasyCalc: ${url}`);

        // This is the external call that is likely failing in the deployed environment
        const response = await axios.get(url, { timeout: 10000 }); // 10-second timeout

        const players = response.data;
        if (!Array.isArray(players)) {
            throw new Error("FantasyCalc API did not return a valid array of players.");
        }

        const playerValueMap = new Map();
        players.forEach(playerData => {
            const sleeperId = playerData?.player?.sleeperId;
            if (sleeperId) {
                playerValueMap.set(String(sleeperId), playerData);
            }
        });

        console.log(`Successfully mapped ${playerValueMap.size} players from FantasyCalc.`);
        return Object.fromEntries(playerValueMap);

    } catch (error) {
        // This block will now execute on a timeout or other network error.
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! AXIOS/SERVICE-LEVEL ERROR in fantasyCalcService.js !!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("Full Axios Error:", error.isAxiosError ? error.toJSON() : error);
        
        // IMPORTANT: Re-throw the error so the route handler's catch block is triggered.
        throw new Error(`Failed to fetch from external FantasyCalc API: ${error.message}`);
    }
}


// We keep cleanseNameJs in case other files in your project use it.
function cleanseNameJs(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

module.exports = { getFantasyCalcValues, cleanseNameJs };