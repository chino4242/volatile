// server/routes/rosterRoutes.js
const express = require('express');
const axios = require('axios');
const { loadAllPlayersData, createManagerRosterList } = require('../services/playerService');

const router = express.Router();

// GET specific roster details for a league
router.get('/league/:leagueId/roster/:rosterId', async (req, res) => {
    const { leagueId, rosterId } = req.params;
    const userUrlTemplate = "https://api.sleeper.app/v1/user/{user_id}";

    try {
        console.log(`API Route: Fetching details for League ID: ${leagueId}, Roster ID: ${rosterId}`);

        // 1. Load all NFL player master data from your local file
        const allPlayersData = await loadAllPlayersData();

        // 2. Fetch all rosters for the league from the Sleeper API
        const leagueRostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
        const rostersResponse = await axios.get(leagueRostersUrl);
        const allLeagueRosters = rostersResponse.data;

        if (!allLeagueRosters || !Array.isArray(allLeagueRosters)) {
            return res.status(404).json({ error: "No Rosters found for this league or invalid format." });
        }

        // 3. Find the specific roster that matches the request
        const targetRoster = allLeagueRosters.find(r => String(r.roster_id) === String(rosterId));

        if (!targetRoster) {
            return res.status(404).json({ error: `Roster ID ${rosterId} not found in league ${leagueId}` });
        }

        // 4. Use your service function to create a detailed player list for that roster
        const playerIdsOnRoster = targetRoster.players || [];
        const detailedPlayerList = createManagerRosterList(playerIdsOnRoster, allPlayersData);

        // 5. Fetch manager/owner details from the Sleeper API
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
        } else if (targetRoster.user_id) { // Fallback for some edge cases
            const leagueUsersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;
            const usersResponse = await axios.get(leagueUsersUrl);
            const leagueUsers = usersResponse.data;
            const owner = leagueUsers.find(u => u.user_id === targetRoster.user_id);
            if (owner && owner.display_name) {
                managerDisplayName = owner.display_name;
                ownerUserId = owner.user_id;
            }
        }

        // 6. Construct the final JSON response to send to the frontend
        const responseData = {
            manager_display_name: managerDisplayName,
            owner_id: ownerUserId || null,
            roster_id: rosterId,
            league_id: leagueId,
            players: detailedPlayerList,
            starters: targetRoster.starters || [],
        };
        
        console.log(`Successfully prepared data for manager: ${managerDisplayName}`);
        res.json(responseData);

    } catch (error) {
        console.error(`ERROR in /league/${leagueId}/roster/${rosterId} endpoint:`, error.message);
        console.error(error.stack); // Log the full stack trace for better debugging

        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({
                error: `Failed to fetch data from Sleeper API: ${error.response.statusText}`,
                details: error.config.url
            });
        } else if (error.message.startsWith("Failed to load player master data")) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: "An internal server error occurred while processing your request." });
        }
    }
});

// Don't forget to export the router
module.exports = router;
