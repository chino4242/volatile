const express = require('express');
const axios = require('axios');
// --- FIX: Import the correct function from the player service ---
const { getAllPlayers } = require('../services/playerService');

const router = express.Router();

// Get all free agents for a specific league
router.get('/league/:leagueId/free-agents', async (req, res) => {
    const { leagueId } = req.params;

    try {
        console.log(`Fetching free agents for Sleeper League ID: ${leagueId}`);
        // 1. Fetch all rosters for the league to see who is taken
        const leagueRostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
        const rostersResponse = await axios.get(leagueRostersUrl);
        const allLeaguesRosters = rostersResponse.data;

        // 2. Compile a single Set of all player IDs that are currently on a roster
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

        // 3. Load the master list of all NFL players from our pre-loaded service
        const allPlayersMap = await getAllPlayers();

        // 4. Filter the master list to find the free agents.
        const freeAgents = [];
        // --- FIX: Correctly iterate over the Map using for...of ---
        for (const [playerId, playerInfo] of allPlayersMap.entries()) {
            // Check if the player's ID is NOT in our set of rostered players.
            if (!rosteredPlayerIds.has(String(playerId))) {
                // The playerInfo object from the map is already what we need.
                freeAgents.push(playerInfo);
            }
        }
        console.log(`Found ${freeAgents.length} free agents`);

        // 5. Send the list of free agents as the response.
        res.json(freeAgents);
    } catch (error) {
        console.error(`Error in /league/${leagueId}/free-agents endpoint:`, error.message);
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({
                error: `Failed to fetch data from Sleeper API: ${error.response.statusText}`
            });
        } else {
            res.status(500).json({ error: "An internal server error occurred while fetching free agents." });
        }
    }
});

module.exports = router;
