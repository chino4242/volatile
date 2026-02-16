// server/services/playerService.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require('fs');
const path = require('path');

// DynamoDB Configuration
const TABLE_NAME = process.env.PLAYER_VALUES_TABLE_NAME || 'PlayerValues';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-2' });
const docClient = DynamoDBDocumentClient.from(client);

// In-memory cache
let playerMap = new Map();
let isLoaded = false;
let cacheTimestamp = Date.now();

/**
 * Load player data from local JSON file (fallback for local dev)
 */
function loadPlayerDataFromLocalFile() {
    console.log('--- PLAYER SERVICE: Loading from local JSON file... ---');
    const filePath = path.join(__dirname, '../data/enriched_players_master.json');
    
    try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        const players = JSON.parse(rawData);
        
        for (const player of players) {
            if (player && player.sleeper_id) {
                playerMap.set(String(player.sleeper_id), player);
            }
        }
        
        isLoaded = true;
        console.log(`--- PLAYER SERVICE: Loaded ${playerMap.size} players from local file ---`);
        return playerMap;
    } catch (error) {
        console.error('!!! ERROR loading from local file !!!', error.message);
        throw error;
    }
}

/**
 * Load player data from DynamoDB
 */
async function loadPlayerDataFromDynamoDB() {
    if (isLoaded) {
        console.log('--- PLAYER SERVICE: Data already loaded, using cache ---');
        return playerMap;
    }

    console.log('--- PLAYER SERVICE: Loading player data from DynamoDB... ---');
    console.log('--- PLAYER SERVICE: Environment check:', {
        TABLE_NAME,
        env_var: process.env.PLAYER_VALUES_TABLE_NAME,
        region: process.env.AWS_REGION
    });

    try {
        const params = {
            TableName: TABLE_NAME
        };

        // Initial Scan
        const command = new ScanCommand(params);
        let response = await docClient.send(command);
        let items = response.Items || [];

        // Handle Pagination (Scan limit is 1MB)
        while (response.LastEvaluatedKey) {
            console.log('--- PLAYER SERVICE: Scanning next page... ---');
            const nextParams = {
                TableName: TABLE_NAME,
                ExclusiveStartKey: response.LastEvaluatedKey
            };
            response = await docClient.send(new ScanCommand(nextParams));
            if (response.Items) {
                items = items.concat(response.Items);
            }
        }

        console.log(`--- PLAYER SERVICE: Loaded ${items.length} players from DynamoDB ---`);

        // Populate the map
        for (const player of items) {
            if (player && player.sleeper_id) {
                // CRITICAL: Add 'full_name' alias for frontend adapter compatibility
                // Frontend expects 'full_name' but DynamoDB has 'player_name_original'
                if (player.player_name_original && !player.full_name) {
                    player.full_name = player.player_name_original;
                }
                playerMap.set(String(player.sleeper_id), player);
            }
        }

        isLoaded = true;
        console.log(`--- PLAYER SERVICE: Cached ${playerMap.size} players in memory ---`);

        return playerMap;
    } catch (error) {
        console.error('!!! ERROR loading player data from DynamoDB !!!');
        console.error('Error Message:', error.message);
        console.error('Falling back to local JSON file...');
        
        // Fallback to local file for development
        return loadPlayerDataFromLocalFile();
    }
}

/**
 * Returns the player map, loading from DynamoDB if needed
 * @returns {Promise<Map<string, object>>} The map of all player data.
 */
async function getAllPlayers() {
    return await loadPlayerDataFromDynamoDB();
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
