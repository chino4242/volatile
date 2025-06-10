// server/routes/leagueRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET all managers in a league with their associated roster IDs
router.get('/league/:leagueId/managers', async (req, res) => {
    const { leagueId } = req.params;
    try {
        const usersUrl = `https://api.sleeper.app/v1/league/${leagueId}/users`;
        const rostersUrl = `https://api.sleeper.app/v1/league/${leagueId}/rosters`;

        console.log(`Fetching users and rosters for league ${leagueId}`);

        // Fetch both users and rosters concurrently for speed
        const [usersResponse, rostersResponse] = await Promise.all([
            axios.get(usersUrl),
            axios.get(rostersUrl)
        ]);

        const users = usersResponse.data;
        const rosters = rostersResponse.data;

        // <<< THE FIX IS HERE: Create a lookup map for user details >>>
        // This is a more efficient way to find user info.
        const userMap = new Map();
        if (users && Array.isArray(users)) {
            users.forEach(user => {
                // Store the entire user object, or just the parts you need
                userMap.set(user.user_id, {
                    display_name: user.display_name,
                    avatar: user.avatar
                });
            });
        }
        
        // Combine the data to create a clean list of managers
        const managersWithRosters = rosters.map(roster => {
            const ownerId = roster.owner_id;
            // Find the manager's info in the map using their owner_id
            const managerInfo = userMap.get(ownerId);
            
            return {
                user_id: ownerId,
                roster_id: String(roster.roster_id),
                // Use the display_name from the map, with a fallback
                display_name: managerInfo ? managerInfo.display_name : 'Unknown Owner',
                // Construct the full avatar URL
                avatar_url: managerInfo?.avatar ? `https://sleepercdn.com/avatars/${managerInfo.avatar}` : null
            };
        }).filter(manager => manager.user_id); // Only include rosters that have an owner

        res.json(managersWithRosters);

    } catch (error) {
        console.error(`Error fetching managers for league ${leagueId}:`, error.message);
        res.status(500).json({ error: "An internal server error occurred while fetching league managers." });
    }
});

module.exports = router;
