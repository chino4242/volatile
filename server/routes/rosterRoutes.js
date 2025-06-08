// server/routes/rosterRoutes.js
const express = require('express');
const axios = require('axios');
const { loadAllPlayersData, createManagerRosterList } = require('../services/playerService');

const router = express.Router();

// GET specific roster details for a league
router.get('/league/:leagueId([^/]+)/roster/:rosterId([^/]+)', async (req, res) => {
    const { leagueId, rosterId } = req.params;
    const userUrlTemplate = "https://api.sleeper.app/v1/user/{user_id}";

    // Check if critical service functions are loaded before proceeding
    if (typeof loadAllPlayersData !== 'function' || typeof createManagerRosterList !== 'function') {
        console.error("Route cannot execute: Critical service functions are not loaded.");
        return res.status(500).json({ error: "Server configuration error: Core services not available." });
    }
    
    try {
        console.log(`Fetching details for League ID: ${leagueId}, Roster ID: ${rosterId}`);
        //Adding more comments for this commit
        // 1. Load all NFL player master data
        const allPlayersData = await loadAllPlayersData();

        // 2. Fetch all rosters for the league
        const leagueRostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
        const rostersResponse = await axios.get(leagueRostersUrl);
        const allLeagueRosters = rostersResponse.data;

        if (!allLeagueRosters || !Array.isArray(allLeagueRosters)) {
            return res.status(404).json({ error: "No Rosters found for this league or invalid format." });
        }

        // 3. Find the specific roster
        const targetRoster = allLeagueRosters.find(r => String(r.roster_id) === String(rosterId));

        if (!targetRoster) {
            return res.status(404).json({ error: `Roster ID ${rosterId} not found in league ${leagueId}` });
        }

        // 4. Get player list for this roster
        const playerIdsOnRoster = targetRoster.players || [];
        const detailedPlayerList = createManagerRosterList(playerIdsOnRoster, allPlayersData);

        // 5. Fetch manager/owner details
        let managerDisplayName = "Unknown Owner";
        let ownerUserId = targetRoster.owner_id;

        if (ownerUserId) {
            try {
                const userDetailUrl = userUrlTemplate.replace("{user_id}", ownerUserId);
                const userResponse = await axios.get(userDetailUrl);
                if (userResponse.data && userResponse.data.display_name) {
                    managerDisplayName = userResponse.data.display_name;
                }
            } catch (userError) {
                console.warn(`Could not fetch user details for owner_id ${ownerUserId}: ${userError.message}`);
            }
        } else if (targetRoster.user_id) { 
            const leagueUsersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;
            const usersResponse = await axios.get(leagueUsersUrl);
            const leagueUsers = usersResponse.data;
            const owner = leagueUsers.find(u => u.user_id === targetRoster.user_id);
            if (owner && owner.display_name) {
                managerDisplayName = owner.display_name;
                ownerUserId = owner.user_id;
            }
        }

        // 6. Construct the JSON response
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
        console.error(`Error in /league/${leagueId}/roster/${rosterId} endpoint:`, error.message);
        console.error(error.stack); // Log the full stack trace for better debugging

        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({
                error: `Failed to fetch data from Sleeper API: ${error.response.statusText}`,
                details: error.config.url
            });
        } else if (error.message && error.message.startsWith("Failed to load player master data")) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: "An internal server error occurred processing your request." });
        }
    }
});

module.exports = router;
