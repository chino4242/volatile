// server/services/playerService.js

// "Bulletproof" Fix: Import the JSON directly at the top level.
// This forces the bundler (esbuild) to include the data inside the code bundle.
// No file system paths, no runtime reads.
let masterPlayerData = [];
try {
    masterPlayerData = require('../data/enriched_players_master.json');
    console.log(`--- PLAYER SERVICE: Bundled JSON loaded. Found ${masterPlayerData.length} items. ---`);
} catch (e) {
    console.error("CRITICAL: Failed to load bundled JSON data:", e.message);
    // Initialize empty to prevent crash, but log critical error
    masterPlayerData = [];
}

// Initialize map immediately
const playerMap = new Map();
if (Array.isArray(masterPlayerData)) {
    for (const player of masterPlayerData) {
        if (player && player.sleeper_id) {
            playerMap.set(String(player.sleeper_id), player);
        }
    }
}
console.log(`--- PLAYER SERVICE: Initialized map with ${playerMap.size} players. ---`);

/**
 * Returns the pre-loaded map of all player data.
 * @returns {Map<string, object>} The map of all player data.
 */
function getAllPlayers() {
    return playerMap;
}

// Kept for compatibility, though no longer needed for lazy loading
function loadDataSafe() {
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
