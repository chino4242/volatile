// server/routes/sleeperRosterRoutes.js
const express = require('express');
const axios = require('axios');
const { loadAllPlayersData, createManagerRosterList } = require('../services/playerService');

const router = express.Router();

// NOTE: The path is '/league/:leagueId/roster/:rosterId'
// The '/api/sleeper' prefix is added in server.js
router.get('/league/:leagueId/roster/:rosterId', async (req, res) => {
    const { leagueId, rosterId } = req.params;
    const userUrlTemplate = "https://api.sleeper.app/v1/user/{user_id}";

    if (typeof loadAllPlayersData !== 'function' || typeof createManagerRosterList !== 'function') {
        console.error("Route cannot execute: Critical service functions are not loaded.");
        return res.status(500).json({ error: "Server configuration error: Core services not available." });
    }

    try {
        console.log(`Fetching details for League ID: ${leagueId}, Roster ID: ${rosterId}`);
        // Add User-Agent to avoid blocking
        const axiosConfig = {
            headers: { 'User-Agent': 'Volatile/1.0 (FantasyFootballAnalysis)' }
        };

        const [rosterData, allPlayersData] = await Promise.all([
            axios.get(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, axiosConfig).then(r => r.data),
            loadAllPlayersData()
        ]);

        const allLeagueRosters = rosterData;
        const targetRoster = allLeagueRosters.find(r => String(r.roster_id) === String(rosterId));

        if (!targetRoster) {
            return res.status(404).json({ error: `Roster ID ${rosterId} not found in league ${leagueId}` });
        }

        const playerIdsOnRoster = targetRoster.players || [];
        const detailedPlayerList = createManagerRosterList(playerIdsOnRoster, allPlayersData);

        let managerDisplayName = "Unknown Owner";
        let ownerUserId = targetRoster.owner_id;

        if (ownerUserId) {
            try {
                const userResponse = await axios.get(userUrlTemplate.replace("{user_id}", ownerUserId), axiosConfig);
                if (userResponse.data && userResponse.data.display_name) {
                    managerDisplayName = userResponse.data.display_name;
                }
            } catch (userError) {
                console.warn(`Could not fetch user details for owner_id ${ownerUserId}: ${userError.message}`);
            }
        }

        const responseData = {
            manager_display_name: managerDisplayName,
            owner_id: ownerUserId || null,
            roster_id: rosterId,
            league_id: leagueId,
            players: detailedPlayerList,
            starters: targetRoster.starters || [],
        };
        res.json(responseData);

    } catch (error) {
        console.error(`Error in /sleeper/league/${leagueId}/roster/${rosterId} endpoint:`, error.message);
        console.error(error.stack);
        res.status(500).json({ error: "An internal server error occurred processing your request." });
    }
});

module.exports = router;
