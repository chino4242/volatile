// server/routes/fleaflickerRoutes.js
const express = require('express');
const { getFleaflickerLeagueRosters } = require('../services/fleaflickerService');
const { getAllPlayers } = require('../services/playerService'); 

const router = express.Router();

router.get('/league/:leagueId/data', async (req, res) => {
    const { leagueId } = req.params;
    try {
        // 1. Get the current league rosters from the Fleaflicker service
        const allRosters = await getFleaflickerLeagueRosters(leagueId);

        // 2. Get the full master player list from our service
        const allPlayersMap = getAllPlayers();
        // Convert the Map to an array for JSON serialization
        const masterPlayerList = Array.from(allPlayersMap.values());

        // 3. Return both the rosters and the complete master list
        res.json({
            rosters: allRosters,
            master_player_list: masterPlayerList 
        });

    } catch (error) {
        console.error(`Error in Fleaflicker route /league/${leagueId}/data:`, error.message);
        res.status(500).json({ error: "Failed to fetch Fleaflicker league data." });
    }
});

module.exports = router;
