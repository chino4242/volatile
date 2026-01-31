// server/routes/sleeperLeagueRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// This route will match /api/sleeper/league/:leagueId
// Returns full league object (settings, roster_positions, etc.)
router.get('/league/:leagueId', async (req, res) => {
    const { leagueId } = req.params;
    try {
        console.log(`Fetching Sleeper league info for ${leagueId}`);
        const response = await axios.get(`https://api.sleeper.app/v1/league/${leagueId}`);
        res.json(response.data);
    } catch (error) {
        console.error(`Error fetching Sleeper league info for ${leagueId}:`, error.message);
        res.status(500).json({ error: "Failed to fetch league info." });
    }
});

// This route will match /api/sleeper/league/:leagueId/managers
router.get('/league/:leagueId/managers', async (req, res) => {
    const { leagueId } = req.params;
    try {
        const usersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;
        const rostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;

        console.log(`Fetching Sleeper users and rosters for league ${leagueId}`);

        // Fetch both users and rosters concurrently for speed
        const [usersResponse, rostersResponse] = await Promise.all([
            axios.get(usersUrl),
            axios.get(rostersUrl)
        ]);

        const users = usersResponse.data;
        const rosters = rostersResponse.data;

        // Create a quick lookup map for user details by user_id
        const userMap = new Map();
        if (users && Array.isArray(users)) {
            users.forEach(user => {
                userMap.set(user.user_id, {
                    display_name: user.display_name,
                    avatar: user.avatar
                });
            });
        }

        // Combine the data to create a clean list of managers
        const managersWithRosters = rosters.map(roster => {
            const ownerId = roster.owner_id;
            const managerInfo = userMap.get(ownerId);

            return {
                user_id: ownerId,
                roster_id: String(roster.roster_id),
                display_name: managerInfo ? managerInfo.display_name : 'Unknown Owner',
                avatar_url: managerInfo?.avatar ? `https://sleepercdn.com/avatars/${managerInfo.avatar}` : null
            };
        }).filter(manager => manager.user_id);

        res.json(managersWithRosters);

    } catch (error) {
        console.error(`Error fetching Sleeper managers for league ${leagueId}:`, error.message);
        res.status(500).json({ error: "An internal server error occurred while fetching league managers." });
    }
});

module.exports = router;
