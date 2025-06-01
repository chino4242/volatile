// server/routes/rosterRoutes.js
const express = require('express');
const axios = require('axios');

// ---- START DIAGNOSTIC LOGS FOR playerService IMPORT ----
console.log("--- rosterRoutes.js: Top of file, before attempting to require playerService ---");
let loadAllPlayersData, createManagerRosterList; // Declare to ensure they are in scope for the entire module

try {
    // Ensure the path '../services/playerService' is correct relative to this file's location.
    // If rosterRoutes.js is in 'server/routes/' and playerService.js is in 'server/services/', this path is correct.
    const playerServiceModule = require('../services/playerService');
    
    console.log("--- rosterRoutes.js: playerServiceModule has been required ---");
    console.log("Type of playerServiceModule:", typeof playerServiceModule);
    console.log("Content of playerServiceModule (what was imported):", playerServiceModule);

    if (playerServiceModule && typeof playerServiceModule === 'object') {
        loadAllPlayersData = playerServiceModule.loadAllPlayersData;
        createManagerRosterList = playerServiceModule.createManagerRosterList;

        console.log("Type of assigned loadAllPlayersData:", typeof loadAllPlayersData);
        console.log("Type of assigned createManagerRosterList:", typeof createManagerRosterList);
    } else {
        console.error("CRITICAL in rosterRoutes.js: playerServiceModule is not a valid object after require, or it's null/undefined.");
    }

    if (typeof loadAllPlayersData !== 'function') {
        console.error("CRITICAL DEBUG in rosterRoutes.js: loadAllPlayersData is NOT a function after import attempts.");
    }
    if (typeof createManagerRosterList !== 'function') {
        console.error("CRITICAL DEBUG in rosterRoutes.js: createManagerRosterList is NOT a function after import attempts.");
    }

} catch (e) {
    console.error("CRITICAL ERROR in rosterRoutes.js during require('../services/playerService'):", e);
    // Define them as functions that throw errors if the import fails,
    // so the server doesn't crash later in a less obvious place if these are called.
    loadAllPlayersData = () => Promise.reject(new Error("FATAL: playerService.loadAllPlayersData failed to import properly. Server misconfiguration."));
    createManagerRosterList = () => { throw new Error("FATAL: playerService.createManagerRosterList failed to import properly. Server misconfiguration."); };
}
console.log("--- rosterRoutes.js: Finished playerService import attempt ---");
// ---- END DIAGNOSTIC LOGS ----


const router = express.Router();

// GET specific roster details for a league
router.get('/league/:leagueId/roster/:rosterId', async (req, res) => {
    const { leagueId, rosterId } = req.params;
    const userUrlTemplate = "https://api.sleeper.app/v1/user/{user_id}"; // Corrected: added slash

    // Check if critical service functions are loaded before proceeding
    if (typeof loadAllPlayersData !== 'function' || typeof createManagerRosterList !== 'function') {
        console.error("Route /league/:leagueId/roster/:rosterId cannot execute: Critical service functions (loadAllPlayersData or createManagerRosterList) are not loaded.");
        return res.status(500).json({ error: "Server configuration error: Core services not available." });
    }
    
    try {
        console.log(`Fetching details for League ID: ${leagueId}, Roster ID: ${rosterId}`);

        // 1. Load all NFL player master data
        const allPlayersData = await loadAllPlayersData();
        // playerService.loadAllPlayersData now throws an error on failure, which will be caught by the main try/catch block.

        // 2. Fetch all rosters for the league
        const leagueRostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;
        const rostersResponse = await axios.get(leagueRostersUrl);
        const allLeagueRosters = rostersResponse.data;

        if (!allLeagueRosters || !Array.isArray(allLeagueRosters)) {
            return res.status(404).json({ error: "No Rosters found for this league or invalid format." });
        }

        // 3. Find the specific roster - Assuming Sleeper API uses roster_id (snake_case)
        const targetRoster = allLeagueRosters.find(r => String(r.roster_id) === String(rosterId));

        if (!targetRoster) {
            return res.status(404).json({ error: `Roster ID ${rosterId} not found in league ${leagueId}` }); // Corrected "leage"
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
                // Keep "Unknown Owner" or some default
            }
        } else {
            // Fallback if owner_id is null but user_id might be present on the roster object directly
            if (targetRoster.user_id) { 
                const leagueUsersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;
                const usersResponse = await axios.get(leagueUsersUrl);
                const leagueUsers = usersResponse.data;
                const owner = leagueUsers.find(u => u.user_id === targetRoster.user_id);
                if (owner && owner.display_name) {
                    managerDisplayName = owner.display_name;
                    ownerUserId = owner.user_id;
                }
            }
        }

        // 6. Construct the JSON response
        const responseData = {
            manager_display_name: managerDisplayName,
            owner_id: ownerUserId || null,
            roster_id: rosterId,
            league_id: leagueId,
            players: detailedPlayerList,
            starters: targetRoster.starters || [], // Include starters for the frontend
            // reserve: targetRoster.reserve || [], // Optional: add if needed
            // taxi: targetRoster.taxi || [],   // Optional: add if needed
        };
        res.json(responseData);

    } catch (error) {
        // Corrected console.error (removed HTML span)
        console.error(`Error in /league/${leagueId}/roster/${rosterId} endpoint:`, error.message);
        console.error(error.stack); // Log the full stack trace for better debugging

        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({
                error: `Failed to fetch data from Sleeper API: ${error.response.statusText}`,
                details: error.config.url,
                sleeper_error_data: error.response.data // Include Sleeper's error response if available
            });
        } else if (error.message && error.message.startsWith("Failed to load player master data")) {
            // This condition is now handled by loadAllPlayersData throwing an error,
            // so it will likely fall into the generic 'else' block unless we specifically check error.message
            res.status(500).json({ error: error.message });
        } else if (error.message && error.message.includes("failed to import properly")) {
            // Error from our fallback functions if import failed
            res.status(500).json({ error: "Server misconfiguration: A critical service failed to load." });
        }
        else {
            res.status(500).json({ error: "An internal server error occurred processing your request." });
        }
    }
});

module.exports = router;