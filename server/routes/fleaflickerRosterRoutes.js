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

const { getFleaflickerLeagueRules } = require('../services/fleaflickerService');

// New route: Get standardized league info (format)
router.get('/league/:leagueId', async (req, res) => {
    const { leagueId } = req.params;
    try {
        const rulesData = await getFleaflickerLeagueRules(leagueId);
        // Determine 1QB/SF
        // rulesData.rosterPositions is array
        // item: { group: "START", label: "QB", start: 1, eligibility: ["QB"] } 

        let qbCount = 0;
        let sfCount = 0;

        const reqs = rulesData.rosterPositions || [];
        reqs.forEach(req => {
            if (req.group !== 'START') return; // Only count starting positions

            // Check for explicit QB slot
            if (req.label === 'QB' || (req.eligibility && req.eligibility.length === 1 && req.eligibility[0] === 'QB')) {
                qbCount += req.start || 0;
            }

            // Check for Superflex (Flex that allows QB)
            // Usually label "Superflex" or eligibility includes QB but also others
            if (req.eligibility && req.eligibility.includes('QB') && req.eligibility.length > 1) {
                sfCount += req.start || 0;
            }
        });

        // Fleaflicker API might be slightly different, but let's return the raw rules + our guess
        // We'll trust the frontend adapter to do fine-grained logic if needed, but returning it here is good.

        res.json({
            settings: {
                type: 2, // Assume Dynasty for now unless we find Redraft flag
            },
            roster_positions: [], // Placeholder
            qbCount,
            sfCount,
            rawRules: reqs
        });

    } catch (error) {
        console.error(`Error fetching Fleaflicker rules:`, error.message);
        res.status(500).json({ error: "Failed to fetch rules" });
    }
});

module.exports = router;
