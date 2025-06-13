// server/routes/fleaflickerRoutes.js
const express = require('express');
const { getFleaflickerLeagueRosters, cleanseNameJs } = require('../services/fleaflickerService');
const { loadAllPlayersData } = require('../services/playerService'); // Re-use Sleeper's master list for FA calculation

const router = express.Router();

// This single endpoint can provide all data needed for a Fleaflicker league view
router.get('/league/:leagueId/data', async (req, res) => {
    const { leagueId } = req.params;
    try {
        // 1. Get the current league rosters from the Fleaflicker service
        const allRosters = await getFleaflickerLeagueRosters(leagueId);

        // 2. Determine who is on a roster to calculate free agents
        const rosteredPlayerNames = new Set();
        allRosters.forEach(roster => {
            roster.players.forEach(player => {
                rosteredPlayerNames.add(cleanseNameJs(player.full_name));
            });
        });

        // 3. Compare against the master player list to find free agents
        // NOTE: This uses your Sleeper-based player master list for a consistent player pool
        const allPlayersMasterList = await loadAllPlayersData();
        const freeAgents = [];
        for (const sleeperId in allPlayersMasterList) {
            const playerInfo = allPlayersMasterList[sleeperId];
            const cleansedName = cleanseNameJs(playerInfo.full_name);
            // If the player's name is NOT in the set of rostered players, they are a free agent
            if (!rosteredPlayerNames.has(cleansedName)) {
                playerInfo.player_id = sleeperId; // Ensure a consistent player_id field
                freeAgents.push(playerInfo);
            }
        }

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
