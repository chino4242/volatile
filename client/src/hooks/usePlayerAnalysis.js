// client/src/hooks/usePlayerAnalysis.js
import { useState, useEffect } from 'react';

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

/**
 * Custom hook to enrich a list of players with AI analysis and advanced stats from the Python API.
 * 
 * @param {Array} players - Array of player objects. Must have 'sleeper_id' or 'player_id'.
 * @returns {Object} { enrichedPlayers, loading, error }
 */
export function usePlayerAnalysis(players) {
    const [enrichedPlayers, setEnrichedPlayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalysis = async () => {
            if (!players || players.length === 0) {
                setEnrichedPlayers([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // value-agnostic ID extraction (sleeper_id or player_id)
                const playerIds = players.map(p => p.sleeper_id || p.player_id).filter(id => id);

                if (playerIds.length === 0) {
                    setEnrichedPlayers(players);
                    setLoading(false);
                    return;
                }

                const response = await fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sleeper_ids: playerIds })
                });

                if (!response.ok) {
                    throw new Error(`Python API error: ${response.status}`);
                }

                const analysisData = await response.json();
                const analysisMap = new Map();

                analysisData.forEach(p => {
                    if (p.sleeper_id && !p.error) {
                        analysisMap.set(String(p.sleeper_id), p);
                    }
                });

                // Merge analysis back into original player objects
                const merged = players.map(player => {
                    const id = String(player.sleeper_id || player.player_id);
                    const analysis = analysisMap.get(id) || {};
                    return { ...player, ...analysis };
                });

                setEnrichedPlayers(merged);

            } catch (err) {
                console.error("Failed to fetch player analysis:", err);
                setError(err.message);
                // Return original players on error so UI doesn't crash, just missing data
                setEnrichedPlayers(players);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [players]); // Re-run if input array changes. Caller must modify array only when needed.

    return { enrichedPlayers, loading, error };
}
