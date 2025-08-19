// server/routes/fleaflickerRosterRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// A more robust helper to cleanse names for consistent matching.
function cleanseName(name) {
    if (typeof name!== 'string') return '';
    return name
       .toLowerCase()
       .replace(/\s+(jr|sr|ii|iii|iv|v)\.?$/g, '') // Remove suffixes
       .replace(/[.'"]/g, '') // Remove periods, apostrophes, and quotes
       .replace(/\s+/g, ' ') // Collapse whitespace
       .trim();
}


// Path to your consolidated analysis data
const ENRICHED_DATA_PATH = path.join(__dirname, '..', 'data', 'enriched_players_master.json');

// Helper to load your master analysis data
async function loadEnrichedPlayerData() {
    try {
        const fileContent = await fs.readFile(ENRICHED_DATA_PATH, 'utf8');
        const players = JSON.parse(fileContent);
        // Create a map for fast lookups by cleansed name
        const playerMap = new Map();
        players.forEach(player => {
            // Use the cleansed original name from your source file as the key
            playerMap.set(cleanseName(player.player_name_original), player);
        });
        return playerMap;
    } catch (error) {
        console.error("Error loading enriched player master data:", error);
        throw new Error("Could not load player analysis data on the server.");
    }
}

// This route fetches and enriches data for ALL rosters in a given league.
router.get('/league/:leagueId/data', async (req, res, next) => {
    const { leagueId } = req.params;
    const season = new Date().getFullYear();

    try {
        console.log(`[API] Fetching all league data for Fleaflicker league ${leagueId}`);

        // Step 1: Fetch all data sources concurrently
        const = await Promise.all();
        
        const fleaflickerRosters = fleaflickerResponse.data.rosters;
        console.log(fleaflickerRosters)
        const fantasyCalcValues = fantasyCalcResponse.data;

        // Create the FantasyCalc map from the array of player objects.
        const fantasyCalcMap = new Map(fantasyCalcValues.map(player => [cleanseName(player.player.name), player.value]));

        // Step 2: Iterate over each roster and enrich its players
        const allEnrichedRosters = fleaflickerRosters.map(roster => {
            const playersOnRoster = roster.players ||;
            
            const finalRosterPlayers = playersOnRoster.map((playerData, index) => {
                const fleaflickerPlayer = playerData.proPlayer;
                if (!fleaflickerPlayer ||!fleaflickerPlayer.nameFull) return null;

                const cleansedPlayerName = cleanseName(fleaflickerPlayer.nameFull);
                const analysisData = enrichedPlayerMap.get(cleansedPlayerName);
                const tradeValue = fantasyCalcMap.get(cleansedPlayerName) |

| 0;

                return {
                    roster_rank: index + 1, // Added sequential rank
                    fleaflicker_id: fleaflickerPlayer.id,
                    full_name: fleaflickerPlayer.nameFull,
                    position: fleaflickerPlayer.position,
                    team: fleaflickerPlayer.proTeamAbbreviation,
                   ...(analysisData |

| {}), // Safely spread the data or an empty object
                    fantasy_calc_value: tradeValue,
                };
            }).filter(Boolean); // Filter out any null players

            return {
                owner_name: roster.team?.name |

| 'Unknown Owner',
                roster_id: roster.team?.id,
                players: finalRosterPlayers
            };
        });

        // Step 3: Send the complete, merged data to the frontend
        res.json({
            league_id: leagueId,
            rosters: allEnrichedRosters
        });

    } catch (error) {
        console.error(`Error fetching data for Fleaflicker league ${leagueId}:`, error.message);
        next(error);
    }
});


// This single endpoint will fetch, merge, and return a specific roster
router.get('/league/:leagueId/roster/:rosterId', async (req, res, next) => {
    const { leagueId, rosterId } = req.params;
    const season = new Date().getFullYear();
    try {
        console.log(`[API] Fetching and enriching Fleaflicker roster ${rosterId} for league ${leagueId}`);

        const = await Promise.all();

        const fleaflickerRosters = fleaflickerResponse.rosters;
        const fantasyCalcValues = fantasyCalcResponse;

        const targetRoster = fleaflickerRosters.find(r => String(r.team.id) === String(rosterId));
        if (!targetRoster) {
            return res.status(404).json({ error: "Roster not found in this league." });
        }

        const playersOnRoster = targetRoster.players ||;
        const ownerName = targetRoster.team?.name |

| 'Unknown Owner';

        const fantasyCalcMap = new Map(fantasyCalcValues.map(player => [cleanseName(player.player.name), player.value]));

        const finalRosterPlayers = playersOnRoster.map((playerData, index) => {
            const fleaflickerPlayer = playerData.proPlayer;
            if (!fleaflickerPlayer ||!fleaflickerPlayer.nameFull) return null;

            const cleansedName = cleanseName(fleaflickerPlayer.nameFull);
            const analysisData = enrichedPlayerMap.get(cleansedName) |

| {};
            const tradeValue = fantasyCalcMap.get(cleansedName) |

| 0;

            return {
                roster_rank: index + 1, // Added sequential rank
                fleaflicker_id: fleaflickerPlayer.id,
                full_name: fleaflickerPlayer.nameFull,
                position: fleaflickerPlayer.position,
                team: fleaflickerPlayer.proTeamAbbreviation,
               ...analysisData,
                fantasy_calc_value: tradeValue,
            };
        }).filter(Boolean);

        res.json({
            owner_name: ownerName,
            roster_id: rosterId,
            players: finalRosterPlayers
        });

    } catch (error) {
        console.error(`Error fetching Fleaflicker roster ${rosterId}:`, error.message);
        next(error);
    }
});

module.exports = router;