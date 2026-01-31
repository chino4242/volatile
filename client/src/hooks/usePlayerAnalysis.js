// client/src/hooks/usePlayerAnalysis.js
import { useState, useEffect } from 'react';
import { postToPythonApi } from '../api/apiService';

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

                // Use the centralized API helper
                const analysisData = await postToPythonApi('/api/enriched-players/batch', {
                    sleeper_ids: playerIds
                });

                const analysisMap = new Map();

                // Helper handles JSON parsing and error throwing, so analysisData is the array
                if (Array.isArray(analysisData)) {
                    analysisData.forEach(p => {
                        if (p.sleeper_id && !p.error) {
                            analysisMap.set(String(p.sleeper_id), p);
                        }
                    });
                }

                // Merge analysis back into original player objects
                const merged = players.map(player => {
                    const id = String(player.sleeper_id || player.player_id);
                    const analysis = analysisMap.get(id) || {};

                    // Preserve fantasy_calc_value and trade_value from FantasyCalc API
                    // Don't let Python analysis overwrite these fields
                    const { fantasy_calc_value: _, trade_value: __, ...analysisWithoutValues } = analysis;

                    return {
                        ...player,
                        ...analysisWithoutValues,
                        // Explicitly keep the FantasyCalc values if they exist
                        ...(player.fantasy_calc_value !== undefined && { fantasy_calc_value: player.fantasy_calc_value }),
                        ...(player.trade_value !== undefined && { trade_value: player.trade_value })
                    };
                })

                setEnrichedPlayers(merged);

                // Debug: Check what fields we're getting from Python
                if (merged.length > 0) {
                    const samplePlayer = merged.find(p => p.full_name && p.full_name.toLowerCase().includes('herbert'));
                    if (samplePlayer) {
                        console.log('🐍 Python enrichment sample (Herbert):', {
                            full_name: samplePlayer.full_name,
                            positional_rank: samplePlayer.positional_rank,
                            overall_rank: samplePlayer.overall_rank,
                            one_qb_rank: samplePlayer.one_qb_rank,
                            tier: samplePlayer.tier,
                            one_qb_tier: samplePlayer.one_qb_tier
                        });
                    }
                }

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
    }, [players]);

    return { enrichedPlayers, loading, error };
}
