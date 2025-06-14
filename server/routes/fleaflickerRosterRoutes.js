// server/routes/fleaflickerRoutes.js
const express = require('express');
const { getFleaflickerLeagueRosters } = require('../services/fleaflickerService');
const { getAllPlayers } = require('../services/playerService'); 
const { cleanseNameJs } = require('../services/fantasyCalcService'); // Re-use the name cleanser

const router = express.Router();

router.get('/league/:leagueId/data', async (req, res) => {
    const { leagueId } = req.params;
    try {
        // 1. Get the current league rosters from the Fleaflicker service
        const allRosters = await getFleaflickerLeagueRosters(leagueId);

        // 2. Determine who is on a roster by creating a set of cleansed names
        const rosteredPlayerNames = new Set();
        allRosters.forEach(roster => {
            roster.players.forEach(player => {
                rosteredPlayerNames.add(cleanseNameJs(player.full_name));
            });
        });
        console.log(`Found ${rosteredPlayerNames.size} unique player names on Fleaflicker rosters.`);

        // 3. Compare against the master player list to find free agents
        const allPlayersMap = getAllPlayers();
        const freeAgents = [];

        // Iterate over the master player list
        for (const [sleeperId, playerInfo] of allPlayersMap.entries()) {
            const cleansedName = cleanseNameJs(playerInfo.full_name);
            
            // If the player's name is NOT in the set of rostered players, they are a free agent
            if (!rosteredPlayerNames.has(cleansedName)) {
                freeAgents.push(playerInfo);
            }
        }
        console.log(`Calculated ${freeAgents.length} free agents.`);

        // 4. Return a single JSON object with all the necessary data
        res.json({
            rosters: allRosters,
            free_agents: freeAgents
        });

    } catch (error) {
        console.error(`Error in Fleaflicker route /league/${leagueId}/data:`, error.message);
        res.status(500).json({ error: "Failed to fetch Fleaflicker league data." });
    }
});

module.exports = router;
