// server/services/playerService.js

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 Configuration
const BUCKET_NAME = process.env.DATA_BUCKET_NAME || 'amplify-dszsd313h38f-main-provinggrounddatabucket4-qkwdydh8trfc';
const JSON_KEY = 'player-data/enriched_players_master.json';

// Initialize S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });

// In-memory cache
let playerMap = new Map();
let isLoaded = false;
let cacheTimestamp = Date.now();

/**
 * Load player data from S3
 */
async function loadPlayerDataFromS3() {
    if (isLoaded) {
        console.log('--- PLAYER SERVICE: Data already loaded, using cache ---');
        return playerMap;
    }

    console.log('--- PLAYER SERVICE: Loading player data from S3... ---');
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: JSON_KEY
        });

        const response = await s3Client.send(command);
        const bodyContents = await streamToString(response.Body);
        const playersArray = JSON.parse(bodyContents);

        console.log(`--- PLAYER SERVICE: Loaded ${playersArray.length} players from S3 ---`);

        // Populate the map
        for (const player of playersArray) {
            if (player && player.sleeper_id) {
                playerMap.set(String(player.sleeper_id), player);
            }
        }

        isLoaded = true;
        console.log(`--- PLAYER SERVICE: Cached ${playerMap.size} players in memory ---`);

        return playerMap;
    } catch (error) {
        console.error('!!! ERROR loading player data from S3 !!!');
        console.error('Error:', error.message);
        console.error('Bucket:', BUCKET_NAME);
        console.error('Key:', JSON_KEY);
        throw error;
    }
}

/**
 * Helper function to convert stream to string
 */
async function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
}

/**
 * Returns the player map, loading from S3 if needed
 * @returns {Promise<Map<string, object>>} The map of all player data.
 */
async function getAllPlayers() {
    return await loadPlayerDataFromS3();
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
        return [];
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
            }
        }
    }
    return rosterDetailsList;
}


// Export the functions that will be used by other parts of the application.
module.exports = {
    getAllPlayers,
    createManagerRosterList,
    loadAllPlayersData: getAllPlayers, // Alias for backward compatibility
};
