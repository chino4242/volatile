import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles'; // Import the centralized styles object

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

function RosterDisplay() {
    const { leagueId, rosterId } = useParams();
    
    const [enrichedRoster, setEnrichedRoster] = useState([]);
    const [mismatchedPlayers, setMismatchedPlayers] = useState([]);
    const [managerName, setManagerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null); // Add state for hover effect

    const fetchData = useCallback(async (currentLeagueId, currentRosterId) => {
        if (!currentLeagueId || !currentRosterId) {
            setError("League ID and Roster ID are required.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Step 1: Fetch the basic roster data. This gives us the list of player IDs.
            const rosterData = await get(`/api/sleeper/league/${currentLeagueId}/roster/${currentRosterId}`);
            setManagerName(rosterData.manager_display_name || 'Unknown Owner');
            const playerIds = rosterData.players.map(p => p.player_id);

            if (playerIds.length === 0) {
                setEnrichedRoster([]);
                setLoading(false);
                return;
            }

            // Step 2: Fetch both supplemental data sources concurrently.
            const [fantasyCalcDataById, analysisPlayersResponse] = await Promise.all([
                get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`),
                fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sleeper_ids: playerIds })
                }).then(res => {
                    if (!res.ok) throw new Error(`Python API responded with status: ${res.status}`);
                    return res.json();
                })
            ]);
            
            // Step 3: Create efficient lookup maps for each data source using the Sleeper ID.
            const fantasyCalcMap = new Map(Object.entries(fantasyCalcDataById));
            
            const analysisDataMap = new Map();
            analysisPlayersResponse.forEach(player => {
                if (player && player.sleeper_id && !player.error) {
                    analysisDataMap.set(String(player.sleeper_id), player);
                }
            });

            // Step 4: Enrich the player list by merging all data sources.
            const finalRoster = [];
            const mismatches = [];

            for (const player of rosterData.players) {
                const playerId = String(player.player_id);
                const analysisData = analysisDataMap.get(playerId);
                const fantasyCalcData = fantasyCalcMap.get(playerId);
                
                const enrichedPlayer = {
                    ...player,
                    ...analysisData,
                    ...fantasyCalcData,
                    trade_value: fantasyCalcData?.value || 0,
                    age: fantasyCalcData?.player?.maybeAge || analysisData?.age || player.age,
                    tier: fantasyCalcData?.maybeTier || analysisData?.tier || 'N/A',
                };
                finalRoster.push(enrichedPlayer);
                
                if (!analysisData || !fantasyCalcData) {
                    mismatches.push({
                        name: player.full_name,
                        sleeperId: playerId,
                        foundInAnalysis: !!analysisData,
                        foundInValues: !!fantasyCalcData,
                    });
                }
            }

            // Step 5: Sort the final roster and set state.
            finalRoster.sort((a, b) => (b.trade_value || 0) - (a.trade_value || 0));
            setEnrichedRoster(finalRoster);
            setMismatchedPlayers(mismatches);

        } catch (e) {
            console.error("Failed to fetch page data:", e);
            setError(e.message || "An unknown error occurred while fetching data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(leagueId, rosterId);
    }, [leagueId, rosterId, fetchData]);


    if (loading) {
        return <div style={styles.pageContainer}>Loading roster and analysis...</div>;
    }

    if (error) {
        return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>;
    }

    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.h1}>
                Manager: {managerName} (Roster ID: {rosterId})
            </h1>
            <p style={styles.p}>Players sorted by FantasyCalc Dynasty Superflex Value (0.5 PPR).</p>
            
            {enrichedRoster.length > 0 ? (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Full Name</th>
                                <th style={styles.th}>Position</th>
                                <th style={styles.th}>Team</th>
                                <th style={styles.th}>Age</th>
                                <th style={styles.th}>Trade Value</th>
                                <th style={styles.th}>Overall Rank</th>
                                <th style={styles.th}>Pos. Rank</th>
                                <th style={styles.th}>Tier</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedRoster.map((player) => (
                                <tr 
                                    key={player.player_id}
                                    onMouseEnter={() => setHoveredRow(player.player_id)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    style={hoveredRow === player.player_id ? styles.trHover : {}}
                                >
                                    <td style={styles.td}>{player.full_name || 'N/A'}</td>
                                    <td style={styles.td}>{player.position || 'N/A'}</td>
                                    <td style={styles.td}>{player.team || 'N/A'}</td>
                                    <td style={styles.td}>{Math.floor(player.age) || 'N/A'}</td>
                                    <td style={{...styles.td, ...styles.valueCell}}><strong>{player.trade_value}</strong></td>
                                    <td style={styles.td}>{player.overallRank || player.overall_rank || 'N/A'}</td>
                                    <td style={styles.td}>{player.positionRank || player.positional_rank || 'N/A'}</td>
                                    <td style={styles.td}>{player.tier || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={styles.p}>No players found on this roster.</p>
            )}

            {mismatchedPlayers.length > 0 && (
                <div style={{marginTop: '40px'}}>
                    <h2 style={styles.h1}>Mismatch Report</h2>
                    <p style={styles.p}>These players were found on the roster but were missing from a supplemental data source.</p>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Roster Name</th>
                                <th style={styles.th}>Sleeper ID</th>
                                <th style={styles.th}>Found Analysis?</th>
                                <th style={styles.th}>Found Trade Value?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mismatchedPlayers.map((p) => (
                                <tr key={p.sleeperId}>
                                    <td style={styles.td}>{p.name}</td>
                                    <td style={styles.td}>{p.sleeperId}</td>
                                    <td style={styles.td}>{p.foundInAnalysis ? '✅' : '❌'}</td>
                                    <td style={styles.td}>{p.foundInValues ? '✅' : '❌'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{marginTop: '40px'}}>
                <h2 style={styles.h1}>Raw Enriched Roster Data (X-Ray View)</h2>
                <pre style={styles.pre}>
                    {JSON.stringify(enrichedRoster, null, 2)}
                </pre>
            </div>
        </div>
    );
}

export default RosterDisplay;