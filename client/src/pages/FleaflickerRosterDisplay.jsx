// client/src/pages/FleaflickerRosterDisplay.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles'; 

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function FleaflickerRosterDisplay() {
    const { leagueId, rosterId } = useParams();
  
    const [enrichedRoster, setEnrichedRoster] = useState([]);
    const [mismatchedPlayers, setMismatchedPlayers] = useState([]); // For the mismatch report
    const [ownerName, setOwnerName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);
  
    const fetchData = useCallback(async (currentLeagueId, currentRosterId) => {
        if (!currentLeagueId || !currentRosterId) {
            setError("League ID and Roster ID are required.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Step 1: Fetch all data sources concurrently.
            // Note that the fantasycalc endpoint now returns a map keyed by sleeper_id from our service.
            const [leagueData, fantasyCalcDataById, pythonAnalysisData] = await Promise.all([
                get(`/api/fleaflicker/league/${currentLeagueId}/data`),
                get(`/api/values/fantasycalc?isDynasty=true&numQbs=1&ppr=0.5`),
                fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch?format=1qb`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sleeper_ids: [] }) // Fetch all 1QB analysis data
                }).then(res => {
                    if (!res.ok) throw new Error(`Python API responded with status: ${res.status}`);
                    return res.json();
                })
            ]);
             console.log("Sample analysis data for one player:", pythonAnalysisData[0]);
            // Step 2: Create efficient lookup maps using sleeper_id as the key.
            const analysisDataMap = new Map();
            if (Array.isArray(pythonAnalysisData)) {
                pythonAnalysisData.forEach(player => {
                    if (player && player.sleeper_id) {
                        analysisDataMap.set(String(player.sleeper_id), player);
                    }
                });
            }

            // The data from our service is already an object keyed by ID, so we convert it to a Map.
            const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcDataById));

            // Step 3: Find the specific roster and owner from the Fleaflicker data.
            const specificRosterFromServer = leagueData.rosters?.find(r => String(r.roster_id) === String(currentRosterId));
            if (!specificRosterFromServer) {
                throw new Error("Roster not found in this league.");
            }
            
            setOwnerName(specificRosterFromServer.owner_name || 'Unknown Owner');
            const playersOnRoster = specificRosterFromServer.players || [];

            // We still need the master player list to create the "bridge" from a player's name to their sleeper_id.
            const masterPlayerMapByName = new Map();
            if (leagueData.master_player_list) {
                leagueData.master_player_list.forEach(player => {
                    if (player && player.full_name) {
                        masterPlayerMapByName.set(cleanseName(player.full_name), player);
                    }
                });
            }

            // Step 4: Enrich the players from the specific roster using ID-based matching.
            const finalRoster = [];
            const mismatches = [];
            let hasLoggedOnePlayer = false;

            for (const player of playersOnRoster) {
                const cleansedName = cleanseName(player.full_name);
                
                // Get the master player record to find the crucial sleeper_id
                const masterPlayer = masterPlayerMapByName.get(cleansedName);
                const sleeperId = masterPlayer ? String(masterPlayer.sleeper_id) : null;

                // Look up data in both sources using the SAME sleeper_id
                const analysisData = sleeperId ? analysisDataMap.get(sleeperId) : null;
                const fantasyCalcData = sleeperId ? fantasyCalcValuesMap.get(sleeperId) : null;
                
                // Merge data from all three sources
                const enrichedPlayer = {
                    ...player,                                  // Base Fleaflicker data (full_name)
                    ...analysisData,                            // Python analysis data
                    trade_value: fantasyCalcData?.value || 0,    // Value from FantasyCalc
                    age: fantasyCalcData?.player?.maybeAge || analysisData?.age || player.age || 'N/A',
                    team: fantasyCalcData?.player?.maybeTeam || player.team || 'N/A',
                    tier: fantasyCalcData?.maybeTier || 'N/A',
                };
                finalRoster.push(enrichedPlayer);

                if (!hasLoggedOnePlayer) {
                  console.log("Complete data for the first enriched player:", enrichedPlayer);
                  hasLoggedOnePlayer = true;
                }

                // Check for and log mismatches for the report
                if (!masterPlayer || !analysisData || !fantasyCalcData) {
                    mismatches.push({
                        name: player.full_name,
                        cleansedName: cleansedName,
                        foundInMasterList: !!masterPlayer,
                        sleeperId: sleeperId || 'N/A',
                        foundInAnalysis: !!analysisData,
                        foundInValues: !!fantasyCalcData,
                    });
                }
            }
            
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
                Team: {ownerName} (Roster ID: {rosterId})
            </h1>
            <p style={styles.p}>Players sorted by FantasyCalc Dynasty 1-QB Value (0.5 PPR).</p>
            
            {enrichedRoster.length > 0 ? (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Full Name</th>
                                <th style={styles.th}>Pos</th>
                                <th style={styles.th}>Team</th>
                                <th style={styles.th}>Age</th>
                                <th style={styles.th}>Trade Value</th>
                                <th style={styles.th}>Overall Rk</th>
                                <th style={styles.th}>Pos Rk</th>
                                <th style={styles.th}>Tier</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedRoster.map((player) => (
                                <tr 
                                    key={player.fleaflicker_id || player.full_name}
                                    onMouseEnter={() => setHoveredRow(player.fleaflicker_id)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    style={hoveredRow === player.fleaflicker_id ? styles.trHover : {}}
                                >
                                    <td style={styles.td}>{player.full_name || 'N/A'}</td>
                                    <td style={styles.td}>{player.position || 'N/A'}</td>
                                    <td style={styles.td}>{player.team || 'N/A'}</td>
                                    <td style={styles.td}>{Math.floor(player.age) || 'N/A'}</td>
                                    <td style={{...styles.td, ...styles.valueCell}}>{player.trade_value}</td>
                                    <td style={styles.td}>{player.overall_rank || 'N/A'}</td>
                                    <td style={styles.td}>{player.positional_rank || 'N/A'}</td>
                                    <td style={styles.td}>{player.tier || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No players found on this roster.</p>
            )}

            {mismatchedPlayers.length > 0 && (
                <div style={{marginTop: '40px'}}>
                    <h2 style={{...styles.h1, fontSize: '24px'}}>Mismatch Report</h2>
                    <p style={styles.p}>These players may be missing data because their names or IDs could not be matched across all sources.</p>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Roster Name</th>
                                <th style={styles.th}>Cleansed Name</th>
                                <th style={styles.th}>Found in Master List?</th>
                                <th style={styles.th}>Sleeper ID</th>
                                <th style={styles.th}>Found Analysis?</th>
                                <th style={styles.th}>Found Trade Value?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mismatchedPlayers.map((p, index) => (
                                <tr key={index}>
                                    <td style={styles.td}>{p.name}</td>
                                    <td style={styles.td}>'{p.cleansedName}'</td>
                                    <td style={styles.td}>{p.foundInMasterList ? '✅' : '❌'}</td>
                                    <td style={styles.td}>{p.sleeperId}</td>
                                    <td style={styles.td}>{p.foundInAnalysis ? '✅' : '❌'}</td>
                                    <td style={styles.td}>{p.foundInValues ? '✅' : '❌'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default FleaflickerRosterDisplay;