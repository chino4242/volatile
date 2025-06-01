console.log("--- playerService.js: Top of file execution started ---"); // <<< ADD THIS
const fs = require('fs').promises;
const path = require('path');
console.log("--- playerService.js: fs and path modules required ---"); // <<< ADD THIS

const PLAYER_DATA_FILE = "nfl_players_data.json"; // Or a more central path like ../data/
const PLAYER_DATA_PATH = path.join(__dirname, '..', 'data', PLAYER_DATA_FILE); // Example: if data is in server/data/
console.log(`--- playerService.js: PLAYER_DATA_PATH set to: ${PLAYER_DATA_PATH} ---`); // <<< ADD THIS

async function loadAllPlayersData() {
    console.log(`Attempting to load NFL players data from ${PLAYER_DATA_PATH}...`);
    try {
        const fileContent = await fs.readFile(PLAYER_DATA_PATH, 'utf8');
        const data = JSON.parse(fileContent);
        console.log(`Successfully loaded NFL players data from ${PLAYER_DATA_PATH}`);
        return data;
    } catch (error) {
        console.error(`Error in loadAllPlayersData for path ${PLAYER_DATA_PATH}:`, error.message);
        // In an API context, we should throw the error to be caught by the route handler
        throw new Error(`Failed to load player master data: ${error.message}`);
    }
}

function createManagerRosterList(managerPlayerIds, allPlayersData) {
    const rosterDetailsList = [];
    if (!allPlayersData || typeof allPlayersData !== 'object') {
        console.error("allPlayersData is not a valid object in createManagerRosterList");
        return rosterDetailsList; // or throw error
    }
    if (!managerPlayerIds || managerPlayerIds.length === 0) {
        return rosterDetailsList;
    }

    for (const playerIdOnRoster of managerPlayerIds) {
        const playerIdStr = String(playerIdOnRoster);
        const playerInfo = allPlayersData[playerIdStr];

        if (playerInfo) {
            rosterDetailsList.push({
                player_id: playerIdStr,
                full_name: playerInfo.full_name || 'N/A',
                position: playerInfo.position || 'N/A',
                team: playerInfo.team || 'FA'
            });
        } else {
            if (playerIdStr.length <= 3 && /^[A-Z]+$/.test(playerIdStr)) {
                rosterDetailsList.push({
                    player_id: playerIdStr,
                    full_name: `${playerIdStr} Defense`, // Your script produces this
                    position: 'DEF',
                    team: playerIdStr
                });
            } else {
                rosterDetailsList.push({
                    player_id: playerIdStr,
                    full_name: 'Unknown Player/Entity',
                    position: 'N/A',
                    team: 'N/A'
                });
            }
        }
    }
    return rosterDetailsList;
}
console.log("--- playerService.js: Functions defined, about to assign module.exports ---"); // <<< ADD THIS
module.exports = {
    loadAllPlayersData,
    createManagerRosterList
};
console.log("--- playerService.js: module.exports has been assigned ---"); // <<< ADD THIS