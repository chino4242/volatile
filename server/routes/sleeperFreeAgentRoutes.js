const express = require('express');
const axios = require('axios');
//Get master list of all players

const {loadAllPlayersData} = require('../services/playerService');

const router = express.Router();

//Get all free agents for a specific league
router.get('/league/:leagueId/free-agents', async (req, res) => {
    const { leagueId } = req.params;

    if (typeof loadAllPlayersData !== 'function') {
        console.error("Route cannot execute: Player data service is not loaded correctly.");
        return res.status(500).json({ error: "Server configuration error: Core services not available." });
    }

    try {
        console.log(`Fetching free agents for Sleeper League ID: ${leagueId}`);
        //1. Fetch all rosters for the league to see who is taken
        const leagueRostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
        const rostersResponse = await axios.get(leagueRostersUrl);
        const allLeaguesRosters = rostersResponse.data;

        //2. Compile a single Set of all player IDs that are not currently on a roster
        const rosteredPlayerIds = new Set();
        if (allLeaguesRosters && Array.isArray(allLeaguesRosters)) {
            allLeaguesRosters.forEach(roster => {
                if (roster.players && Array.isArray(roster.players)) {
                    roster.players.forEach(playerId => {
                        rosteredPlayerIds.add(String(playerId));
                    });
                }
            });
        }
        console.log(`Found ${rosteredPlayerIds.size} players on rosters.`);

        //3. Load the master list of all NFL 
        const allPlayersMasterList = await loadAllPlayersData();

        //4. Filter the master list to find the free agents. 
        const freeAgents = [];
        for (const playerId in allPlayersMasterList) {
            //Check if the player's ID is NOT in our set of rostered players.
            if (!rosteredPlayerIds.has(String(playerId))) {
                const playerInfo = allPlayersMasterList[playerId];
                playerInfo.player_id = playerId;
                freeAgents.push(playerInfo);
            }
        }
        console.log(`Found ${freeAgents.length} free agents`);
        //5. Send the list of free agents as the response.
        res.json(freeAgents);
    } catch (error) {
        console.error(`Error in /league/${leagueId}/free-agents endpoint:`, error.message);
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({
                error: `Failed to fetch data from Sleeper API: ${error.response.statusText}`
            });
        } else {
            res.status(500).json({error: "An internal server error occurred while fetching free agents."});
        }

    }
});

module.exports = router;