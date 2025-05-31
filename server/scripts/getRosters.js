const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const PLAYER_DATA_FILE = "nfl_players_data.json";
const PLAYER_DATA_PATH = path.join(__dirname, PLAYER_DATA_FILE);

async function loadAllPlayersData(filePath){
    console.log('Attempting to load NFL players data from ${filePath}...');
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        console.log('')
        return data;
    } catch(error){
        if (error.code === 'ENOENT') {
            console.error(`File ${filePath} not found. Please ensure the file exists.`);
        } else if (error instanceof SyntaxError) { // JSON.parse error
            console.error(`Error decoding JSON from ${filePath}. Please check the file format.`);
        } else {
            console.error(`An unexpected error occurred while loading ${filePath}: ${error.message}`);
        }
        process.exit(1); // Exit if player data can't be loaded
    }
}

function createManagerRosterList(managerPlayerIds, allPlayersData){
    const rosterDetailsList = [];
    if (!managerPlayerIds || managerPlayerIds.length == 0){
        return rosterDetailsList; // Return empty list if no players
    }

    for (const playerIdOnRoster of managerPlayerIds) {
        const playerIdStr = String(playerIdOnRoster)
        const playerInfo = allPlayersData[playerIdStr]; //Direct Object lookup
    

    if (playerInfo) {
        rosterDetailsList.push({
            player_id: playerIdStr,
            full_name: playerInfo.full_name || 'N/A',
            position: playerInfo.position || 'N/A',
            team: playerInfo.team || 'FA'
        });
    } else {
        if (playerIdStr.length <= 3 && /^[A-Z]+$/.test(playerIdStr)){
            rosterDetailsList.push({
            player_id: playerIdStr,
            full_name: `${playerIdStr} Defense`,
            position: 'DEF',
            team: playerIdStr
        });
        }
    }
}
    return rosterDetailsList;
}

async function main() {
    const allPlayersData = await loadAllPlayersData(PLAYER_DATA_PATH);

    const leagueId = "1200992049558454272";
    const rosterUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`
    const managersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;
    const userUrlTemplate = "https://api.sleeper.app/v1/user/{user_id}";

    try {
        console.log("\nFetching league rosters and managers...");
        const [rostersResponse, managersResponse] = await Promise.all([
            axios.get(rosterUrl),
            axios.get(managersUrl)
        ]);

        const rosterData = rostersResponse.data;
        const managersData = managersResponse.data;

        if (!rosterData || !managersData) {
            console.error("Failed to fetch roster or manager data properly.");
            process.exit(1)
        }

        console.log("\n--- Processing Individual Rosters ---");
        for (const roster of rosterData) {
            const playerIds = roster.players || []; //Ensure players is an array
            const playersDetailsList = createManagerRosterList(playerIds, allPlayersData);

            let ownerDisplayName = "Unknown Owner";
            if (roster.owner_id) {
                try {
                    const userDetailUrl = userUrlTemplate.replace("{user_id}", roster.owner_id);
                    const userResponse = await axios.get(userDetailUrl);
                    if (userResponse.data && userResponse.data.display_name) {
                        ownerDisplayName = userResponse.data.display_name;
                    }
                } catch(userError) {
                    console.error(`Could not fetch user details for owner_id ${roster.owner_id}: ${userError.message}`);
                }
            } else {
                // Find owner from managersData if owner_id is null but coOwners might exist or if roster has user_id directly
                const owner = managersData.find(m => m.user_id === roster.user_id); // roster.user_id might be the manager's id for that roster
                if (owner) {
                    ownerDisplayName = owner.display_name;
                }
            }
            console.log(`\nManager: ${ownerDisplayName} (Roster ID: ${roster.roster_id})`);
            if (playersDetailsList.length > 0) {
                console.table(playersDetailsList);
            } else {
                console.log(" No players found on this roster.");
            }
            console.log("-------------------------");
        }
    } catch(error){
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error(`HTTP error: ${error.response.status} - ${error.response.statusText}. URL: ${error.config.url}`);
            } else if (error.request) {
                console.error(`Network error: No response received. URL: ${error.config.url}`);
            } else {
                console.error(`Axios error: ${error.message}. URL: ${error.config.url}`);
            }
        } else {
            console.error(`An unexpected error occurred in main execution: ${error.message}`);
            console.error(error.stack); // Print stack for unexpected errors
        }
    }
}

main();