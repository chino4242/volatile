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
    // --- Start of High-Detail Frontend Logging ---

    console.log("--- FRONTEND LOG 1: Starting fetchData function...");

    if (!currentLeagueId || !currentRosterId) {
        console.error("--- FRONTEND LOG: Exiting because leagueId or rosterId is missing.");
        setError("League ID and Roster ID are required.");
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    try {
        console.log(`--- FRONTEND LOG 2: Calling get() for roster data for league ${currentLeagueId}, roster ${currentRosterId}...`);
        const rosterData = await get(`/api/sleeper/league/${currentLeagueId}/roster/${currentRosterId}`);
        
        console.log("--- FRONTEND LOG 3: Roster data received:", rosterData);

        if (!rosterData || !Array.isArray(rosterData.players)) {
            throw new Error("Roster data is invalid or does not contain a players array.");
        }

        setManagerName(rosterData.manager_display_name || 'Unknown Owner');
        const playerIds = rosterData.players.map(p => p.player_id);

        console.log(`--- FRONTEND LOG 4: Extracted ${playerIds.length} playerIds. Sample:`, playerIds.slice(0, 5));

        if (playerIds.length === 0) {
            console.warn("--- FRONTEND LOG: No players found on roster. Exiting before Promise.all.");
            setEnrichedRoster([]);
            setLoading(false);
            return;
        }

        console.log("--- FRONTEND LOG 5: About to execute Promise.all to fetch supplemental data...");
        
        const [fantasyCalcDataById, analysisPlayersResponse] = await Promise.all([
            get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`),
            fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sleeper_ids: playerIds })
            }).then(res => res.json())
        ]);
        
        console.log("--- FRONTEND LOG 6: Promise.all completed successfully.");

        // ... rest of your logic to process and set state ...
        const fantasyCalcMap = new Map(Object.entries(fantasyCalcDataById));
        const analysisDataMap = new Map();
        analysisPlayersResponse.forEach(player => {
            if (player && player.sleeper_id && !player.error) {
                analysisDataMap.set(String(player.sleeper_id), player);
            }
        });

        const finalRoster = rosterData.players.map(player => {
             const playerId = String(player.player_id);
             const analysisData = analysisDataMap.get(playerId);
             const fantasyCalcData = fantasyCalcMap.get(playerId);
             return { ...player, ...analysisData, ...fantasyCalcData, trade_value: fantasyCalcData?.value || 0 };
        });

        finalRoster.sort((a, b) => (b.trade_value || 0) - (a.trade_value || 0));
        setEnrichedRoster(finalRoster);
        // We removed the mismatch report logic for this test to simplify

    } catch (e) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! CRITICAL FRONTEND ERROR in fetchData try...catch block !!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error(e);
        setError(e.message || "An unknown error occurred while fetching data.");
    } finally {
        console.log("--- FRONTEND LOG 7: fetchData function finished.");
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