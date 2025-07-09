import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService'; // Only used for your own backend now
import { styles } from '../styles';

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';
// Define the FantasyCalc API URL directly in the frontend
const FANTASYCALC_API_URL = 'https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&ppr=0.5&numTeams=12';

function RosterDisplay() {
    const { leagueId, rosterId } = useParams();
    // ... (all your state variables remain the same) ...
    const [enrichedRoster, setEnrichedRoster] = useState([]);
    const [managerName, setManagerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);

    const fetchData = useCallback(async (currentLeagueId, currentRosterId) => {
        // ... (guard clauses are the same) ...
        if (!currentLeagueId || !currentRosterId) {
            setError("League ID and Roster ID are required.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Step 1: Fetch roster data (no change here)
            const rosterData = await get(`/api/sleeper/league/${currentLeagueId}/roster/${currentRosterId}`);
            setManagerName(rosterData.manager_display_name || 'Unknown Owner');
            const playerIds = rosterData.players.map(p => p.player_id);

            if (playerIds.length === 0) {
                // ... (handle empty roster) ...
                return;
            }

            // --- THIS IS THE FINAL ARCHITECTURAL FIX ---
            // Step 2: Fetch both EXTERNAL data sources concurrently from the client
            const [fantasyCalcPlayers, analysisPlayers] = await Promise.all([
                // Call FantasyCalc DIRECTLY from the browser
                fetch(FANTASYCALC_API_URL).then(res => res.json()),
                
                // Call your Python API (no change here)
                fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sleeper_ids: playerIds })
                }).then(res => res.json())
            ]);

            // Step 3: Create lookup maps
            const fantasyCalcMap = new Map();
            fantasyCalcPlayers.forEach(playerData => {
                const sleeperId = playerData?.player?.sleeperId;
                if (sleeperId) {
                    fantasyCalcMap.set(String(sleeperId), playerData);
                }
            });

            const analysisDataMap = new Map();
            analysisPlayers.forEach(player => {
                if (player && player.sleeper_id) {
                    analysisDataMap.set(String(player.sleeper_id), player);
                }
            });

            // Step 4: Enrich and set state (no change here)
            const finalRoster = rosterData.players.map(player => {
                const playerId = String(player.player_id);
                const analysisData = analysisDataMap.get(playerId);
                const fantasyCalcData = fantasyCalcMap.get(playerId);
                return { ...player, ...analysisData, ...fantasyCalcData, trade_value: fantasyCalcData?.value || 0 };
            });

            finalRoster.sort((a, b) => (b.trade_value || 0) - (a.trade_value || 0));
            setEnrichedRoster(finalRoster);

        } catch (e) {
            console.error("A critical error occurred during data fetching:", e);
            setError(e.message || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    }, []);

    // ... (useEffect and the rest of the component's return/JSX are the same) ...
    useEffect(() => {
        fetchData(leagueId, rosterId);
    }, [leagueId, rosterId, fetchData]);

    if (loading) { return <div style={styles.pageContainer}>Loading...</div>; }
    if (error) { return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>; }

    return (
        <div style={styles.pageContainer}>
            {/* All your table rendering JSX remains exactly the same */}
        </div>
    );
}

export default RosterDisplay;