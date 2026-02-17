// server/services/playerService.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

// DynamoDB Configuration
const TABLE_NAME = process.env.PLAYER_VALUES_TABLE_NAME || 'PlayerValue';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// In-memory cache
let playerMap = new Map();
let isLoaded = false;

/**
 * Load player data from DynamoDB
 */
async function loadPlayerDataFromDynamoDB() {
    if (isLoaded) {
        console.log('--- PLAYER SERVICE: Data already loaded, using cache ---');
        return playerMap;
    }

    console.log('--- PLAYER SERVICE: Loading player data from DynamoDB... ---');
    console.log('--- PLAYER SERVICE: Table:', TABLE_NAME);

    try {
        const params = {
            TableName: TABLE_NAME
        };

        const command = new ScanCommand(params);
        let response = await docClient.send(command);
        let items = response.Items || [];

        // Handle pagination
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
                // Ensure full_name exists
                if (!player.full_name && player.player_name_original) {
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
        console.error('Error:', error.message);
        console.error('Table:', TABLE_NAME);
        throw error;
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

module.exports = {
    getAllPlayers,
    createManagerRosterList,
    loadAllPlayersData: getAllPlayers, // Alias for backward compatibility
};
