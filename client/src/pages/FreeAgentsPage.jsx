// client/src/pages/FreeAgentsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';

// Define the base URL for your Python Analysis API from environment variables
const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// --- A reusable Modal component for popups ---
const Modal = ({ content, onClose }) => {
    // Stop the click from bubbling up and closing the modal when the content is clicked
    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={handleContentClick}>
                <button style={styles.closeButton} onClick={onClose}>&times;</button>
                <div style={styles.modalBody}>
                    {content}
                </div>
            </div>
        </div>
    );
};

function FreeAgentsPage() {
    const { leagueId } = useParams();
    
    const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalContent, setModalContent] = useState(null);

    const fetchData = useCallback(async (currentLeagueId) => {
        if (!currentLeagueId) {
            setError("A League ID is required.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Step 1: Fetch the basic list of free agents first.
            console.log("--- Fetching free agents list from Node.js API... ---");
            const freeAgentsData = await get(`/api/league/${currentLeagueId}/free-agents`);
            console.log("Raw Free Agents Data (from Node.js):", freeAgentsData);

            // Step 2: Now that we have the list, fetch supplemental data concurrently.
            const playerIds = freeAgentsData.map(p => p.player_id);
            let analysisDataMap = new Map();
            let fantasyCalcValues = {};

            if (playerIds.length > 0) {
                console.log("--- Fetching supplemental data (FantasyCalc and Python API)... ---");
                // <<< FIX: Reverted to the correct batch fetch logic >>>
                const [calcValuesResponse, analysisPlayersResponse] = await Promise.all([
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
                
                console.log("FantasyCalc values response:", calcValuesResponse);
                console.log("Python API analysis response:", analysisPlayersResponse);
                
                fantasyCalcValues = calcValuesResponse;
                analysisPlayersResponse.forEach(player => {
                    if (player && player.sleeper_player_id && !player.error) {
                        analysisDataMap.set(String(player.sleeper_player_id), player);
                    }
                });
                console.log("Built Analysis Data Map:", analysisDataMap);
            }

            const cleanseName = (name) => (typeof name === 'string' ? name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase() : '');
            const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));

            console.log("--- Processing and enriching data... ---");
            // Step 3: Enrich the free agent list
            const finalFreeAgents = freeAgentsData.map((player, index) => {
                const analysis = analysisDataMap.get(String(player.player_id));
                const calcValueData = fantasyCalcValuesMap.get(cleanseName(player.full_name));
                
                if (index < 5) { // Debug log for the first few players
                  console.log(`Merging for: ${player.full_name}, ID: ${player.player_id}`);
                  console.log("  -> Analysis found:", analysis);
                }

                return {
                    ...player,
                    age: player.age || analysis?.age || 'N/A',
                    trade_value: calcValueData?.value || 0,
                    overall_rank: analysis?.overall_rank || 'N/A',
                    positional_rank: analysis?.positional_rank || 'N/A',
                    tier: analysis?.tier || 'N/A',
                    zap_score: analysis?.zap_score || 'N/A',
                    category: analysis?.category || 'N/A',
                    comparables: analysis?.comparables || 'N/A',
                    draft_capital_delta: analysis?.draft_capital_delta || 'N/A',
                    notes_lrqb: analysis?.notes_lrqb || '',
                    rsp_pos_rank: analysis?.rsp_pos_rank || 'N/A',
                    rsp_2023_2025_rank: analysis?.rsp_2023_2025_rank || 'N/A',
                    rp_2021_2025_rank: analysis?.rp_2021_2025_rank || 'N/A',
                    comparison_spectrum: analysis?.comparison_spectrum || 'N/A',
                    depth_of_talent_score: analysis?.depth_of_talent_score || 'N/A',
                    depth_of_talent_desc: analysis?.depth_of_talent_desc || 'N/A',
                    notes_rsp: analysis?.notes_rsp || '',
                };
            });

            // Step 4: Filter and Sort
            const skillPositions = ['QB', 'WR', 'RB', 'TE'];
            const filteredAndSorted = finalFreeAgents
                .filter(p => skillPositions.includes(p.position) && (p.team || p.trade_value > 0))
                .sort((a, b) => b.trade_value - a.trade_value);
            
            setEnrichedFreeAgents(filteredAndSorted);
        } catch (e) {
            console.error("Failed to fetch page data:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(leagueId);
    }, [leagueId, fetchData]);

    if (loading) return <div style={{ padding: '20px' }}>Loading free agents and analysis...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>Top Free Agents by Value for League {leagueId}</h2>
            <p>Found {enrichedFreeAgents.length} relevant players, sorted by trade value.</p>
            
            {enrichedFreeAgents.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f0f0f0' }}>
                                <th style={styles.th}>Full Name</th>
                                <th style={styles.th}>Pos</th>
                                <th style={styles.th}>Team</th>
                                <th style={styles.th}>Age</th>
                                <th style={styles.th}>Trade Value</th>
                                <th style={styles.th}>Overall Rk</th>
                                <th style={styles.th}>Pos Rk</th>
                                <th style={styles.th}>Tier</th>
                                <th style={styles.th}>ZAP</th>
                                <th style={styles.th}>Depth Score</th>
                                <th style={{...styles.th, minWidth: '150px'}}>Comp Spectrum</th>
                                <th style={styles.th}>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedFreeAgents.map((player) => (
                                <tr key={player.player_id}>
                                    <td style={styles.td}>{player.full_name || 'N/A'}</td>
                                    <td style={styles.td}>{player.position}</td>
                                    <td style={styles.td}>{player.team}</td>
                                    <td style={styles.td}>{player.age}</td>
                                    <td style={styles.td}><strong>{player.trade_value}</strong></td>
                                    <td style={styles.td}>{player.overall_rank}</td>
                                    <td style={styles.td}>{player.positional_rank}</td>
                                    <td style={styles.td}>{player.tier}</td>
                                    <td style={styles.td}>{player.zap_score}</td>
                                    <td style={styles.td}>{player.depth_of_talent_score}</td>
                                    <td style={{...styles.td, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{player.comparison_spectrum}</td>
                                    <td style={styles.td}>
                                        {(player.notes_lrqb || player.notes_rsp) && (
                                            <button 
                                                onClick={() => setModalContent({
                                                    title: `${player.full_name} - Analysis Notes`,
                                                    body: `LRQB Notes:\n${player.notes_lrqb || 'N/A'}\n\n---\n\nRSP Notes:\n${player.notes_rsp || 'N/A'}`
                                                })}
                                                style={styles.notesButton}
                                            >
                                                View
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No free agents found at the specified positions.</p>
            )}

            {modalContent && (
                <Modal 
                    content={
                        <>
                            <h3>{modalContent.title}</h3>
                            <div style={styles.modalBody}>{modalContent.body}</div>
                        </>
                    } 
                    onClose={() => setModalContent(null)} 
                />
            )}
        </div>
    );
}

const styles = {
    th: { border: '1px solid #ddd', padding: '8px', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px' },
    notesButton: { padding: '5px 10px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '20px 40px', borderRadius: '8px', maxWidth: '600px', maxHeight: '80%', overflowY: 'auto', position: 'relative' },
    modalBody: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '14px', lineHeight: 1.6 },
    closeButton: { position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer' }
};

export default FreeAgentsPage;
