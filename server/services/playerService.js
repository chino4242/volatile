// server/services/playerService.js


// --- Point to the correct, enriched data file ---



// This will hold our player data in memory for the lifetime of the server.
const playerMap = new Map();

/**
 * A self-invoking function to load player data synchronously on server startup.
 * This is a robust pattern for loading essential configuration or data.
 */
(function loadDataOnStartup() {
    console.log("--- PLAYER SERVICE: Initializing and loading master player data on startup... ---");
    try {
        // Use require to load the JSON data. This forces the bundler (esbuild/webpack) to include the file
        // in the build output, resolving the "File not found" error in Lambda.
        // The path is relative to THIS file (server/services/playerService.js).
        // data is in server/data/enriched_players_master.json, so we go up one level (..) then into data.
        const playersArray = require('../data/enriched_players_master.json');

        console.log(`--- PLAYER SERVICE: Successfully loaded JSON. Found ${playersArray.length} items in array.`);

        // Convert the array to a Map for O(1) lookups by sleeper_id
        for (const player of playersArray) {
            if (player && player.sleeper_id) {
                playerMap.set(String(player.sleeper_id), player);
            }
        }

        if (playerMap.size === 0) {
            throw new Error("Data loaded, but no valid players with sleeper_id found to map.");
        }

        console.log(`--- PLAYER SERVICE: Successfully loaded and cached ${playerMap.size} players. Service is ready.`);

    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! FATAL ERROR IN PLAYER SERVICE !!!");
        console.error("!!! The server cannot start without the master player data. !!!");
        console.error(`!!! Error: ${error.message}`);
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        // Exit the process with an error code to prevent the server from running in a broken state.
        process.exit(1);
    }
})();

/**
 * Returns the pre-loaded map of all player data.
 * @returns {Map<string, object>} The map of all player data.
 */
function getAllPlayers() {
    return playerMap;
}

/**
 * Builds a list of detailed player information for a given roster.
 * @param {string[]} managerPlayerIds - An array of player IDs on a manager's roster.
 * @param {Map<string, object>} allPlayersMap - The Map of all player data.
 * @returns {object[]} An array of player detail objects for the roster.
 */
function createManagerRosterList(managerPlayerIds, allPlayersMap) {
    const rosterDetailsList = [];
    if (!(allPlayersMap instanceof Map)) {
        console.error("Error: allPlayersMap is not a valid Map in createManagerRosterList");
        return []; // Return empty array on error
    }
    if (!managerPlayerIds || managerPlayerIds.length === 0) {
        return [];
    }

    for (const playerIdOnRoster of managerPlayerIds) {
        const playerIdStr = String(playerIdOnRoster);
        const playerInfo = allPlayersMap.get(playerIdStr);

        if (playerInfo) {
            rosterDetailsList.push({
                player_id: playerIdStr,
                full_name: playerInfo.full_name || 'N/A',
                position: playerInfo.position || 'N/A',
                team: playerInfo.team || 'FA',
                fantasy_calc_value: playerInfo.fantasy_calc_value || null
            });
        } else {
            // Handle DEF or other non-player entities
            if (playerIdStr.length <= 3 && /^[A-Z]+$/.test(playerIdStr)) {
                rosterDetailsList.push({
                    player_id: playerIdStr,
                    full_name: `${playerIdStr} Defense`,
                    position: 'DEF',
                    team: playerIdStr
                });
            } else {
                // To keep the logs clean, we won't log every unknown player unless needed for deep debugging.
            }
        }
    }
    return rosterDetailsList;
}


// Export the functions that will be used by other parts of the application.
module.exports = {
    getAllPlayers,
    createManagerRosterList,
    // Add an alias for backward compatibility with other services that might still use the old function name.
    loadAllPlayersData: getAllPlayers,
};
