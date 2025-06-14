// server/services/fleaflickerService.js
const axios = require('axios');

/**
 * A helper to cleanse player names for easier matching.
 * @param {string} name The player's name.
 * @returns {string} The cleansed name.
 */
function cleanseNameJs(name) {
    if (typeof name !== 'string') return '';
    // Removes non-alphanumeric characters except spaces and apostrophes, then trims whitespace and converts to lower case.
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Fetches and transforms Fleaflicker league rosters into a standardized format.
 * @param {string} leagueId The ID of the Fleaflicker league.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of teams.
 */
async function getFleaflickerLeagueRosters(leagueId) {
    const url = 'https://www.fleaflicker.com/api/FetchLeagueRosters';
    console.log(`Fetching Fleaflicker rosters for league ${leagueId}...`);
    try {
        const response = await axios.get(url, { params: { sport: "NFL", league_id: leagueId } });
        const jResponse = response.data;

        if (!jResponse || !jResponse.rosters) {
            throw new Error("Invalid or empty response from Fleaflicker.");
        }

        // Transform the data into a standard format the frontend can use
        const standardizedRosters = jResponse.rosters.map(teamData => {
            const players = teamData.players ? teamData.players.map(playerData => ({
                player_id: playerData.proPlayer?.id?.toString(), // Use the unique Fleaflicker ID
                full_name: playerData.proPlayer?.nameFull || 'Unknown Player',
                position: playerData.proPlayer?.position || 'N/A',
                team: playerData.proPlayer?.proTeamAbbreviation || 'N/A',
                age: playerData.proPlayer?.age,
            })) : [];

            return {
                roster_id: teamData.team?.id?.toString(),
                owner_name: teamData.team?.name || 'Unknown Team', // Fleaflicker uses team name as owner name
                players: players,
            };
        });

        return standardizedRosters;

    } catch (error) {
        console.error(`Error in getFleaflickerLeagueRosters:`, error.message);
        throw error; // Re-throw for the route handler to catch
    }
}

// This allows the file to be used by other parts of your app (like your routes)
module.exports = { getFleaflickerLeagueRosters, cleanseNameJs };


// --- NEW: Test block to make the script runnable from the command line ---
// This checks if the file is being run directly by Node.
if (require.main === module) {
    const testLeagueId = '197269'; // Using a test league ID

    (async () => {
        console.log(`--- Running test for league ID: ${testLeagueId} ---`);
        try {
            const rosters = await getFleaflickerLeagueRosters(testLeagueId);
            console.log("--- Successfully fetched and processed rosters ---");
            // Use console.dir for better object inspection in the terminal
            console.dir(rosters, { depth: null }); 
        } catch (e) {
            console.error("--- Test run failed ---", e);
        }
    })();
}
