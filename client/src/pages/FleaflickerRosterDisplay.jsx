// client/src/pages/FleaflickerRosterDisplay.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles'; // Import the new shared styles
import './DraftTrackerPage.css'; // Assuming you have this CSS file for styling

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// A reusable Modal component for popups, now using shared styles
const Modal = ({ content, onClose }) => {
    const handleContentClick = (e) => e.stopPropagation();

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={handleContentClick}>
                <button style={styles.closeButton} onClick={onClose}>&times;</button>
                {content}
            </div>
        </div>
    );
};

function cleanseName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}


function FleaflickerRosterDisplay() {
  const { leagueId, rosterId } = useParams();
  
  const [enrichedRoster, setEnrichedRoster] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalContent, setModalContent] = useState(null);
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
        // Step 1: Fetch all data sources concurrently
        const [leagueData, fantasyCalcValues, pythonAnalysisData] = await Promise.all([
            get(`/api/fleaflicker/league/${currentLeagueId}/data`),
            get(`/api/values/fantasycalc?isDynasty=true&numQbs=1&ppr=0.5`),
            fetch(`${PYTHON_API_BASE_URL}/api/enriched-players?format=1qb`).then(res => {
                if (!res.ok) throw new Error(`Python API error: ${res.status}`);
                return res.json();
            })
        ]);
        
        // Step 2: Create efficient lookup maps for analysis and values
        const pythonAnalysisMap = new Map();
        if (Array.isArray(pythonAnalysisData)) {
            pythonAnalysisData.forEach(player => {
                // Use the cleansed original name from your source file as the key
                pythonAnalysisMap.set(cleanseName(player.player_name_original), player);
            });
        }

        const fantasyCalcValuesMap = new Map();
        if (fantasyCalcValues && typeof fantasyCalcValues === 'object') {
            Object.entries(fantasyCalcValues).forEach(([name, data]) => {
                fantasyCalcValuesMap.set(name, data.value); // The key is already cleansed
            });
        }

        // Step 3: Find the specific roster and its players from the live data
        const specificRosterFromServer = leagueData.rosters?.find(r => String(r.roster_id) === String(currentRosterId));
        if (!specificRosterFromServer) {
            throw new Error("Roster not found in this league.");
        }
        
        setOwnerName(specificRosterFromServer.owner_name || 'Unknown Owner');
        const playersOnRoster = specificRosterFromServer.players || [];

        // --- THIS IS THE FIX ---
        // Step 4: Enrich the players from the specific roster using the maps
        const finalRoster = playersOnRoster.map(player => {
            const cleansedName = cleanseName(player.full_name);
            
            // Find the full analysis object by matching the cleansed name
            const analysisData = pythonAnalysisMap.get(cleansedName) || {};
            
            // Find the trade value by matching the cleansed name
            const tradeValue = fantasyCalcValuesMap.get(cleansedName) || 0;
            
            return {
                ...player,      // Base info from Fleaflicker (full_name, position, etc.)
                ...analysisData,  // All rich analysis data from Python, matched by name
                fantasy_calc_value: tradeValue, // The matched trade value
            };
        });

        finalRoster.sort((a, b) => (b.fantasy_calc_value || 0) - (a.fantasy_calc_value || 0));
        setEnrichedRoster(finalRoster);

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

  if (loading) return <div style={styles.pageContainer}>Loading roster and analysis...</div>;
  if (error) return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>;

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
                            <th style={styles.th}>1QB Redraft Rank</th>
                            <th style={styles.th}>1QB Dynasty Rank</th>
                            <th style={styles.th}>SF Redraft Rank</th>
                            <th style={styles.th}>SF Dynasty Rank</th>
                            <th style={styles.th}>RSP Pos Rank</th>
                            <th style={styles.th}>Category</th>
                            <th style={{...styles.th, minWidth: '300px', whiteSpace: 'normal'}}>Comp Spectrum</th>
                            <th style={styles.th}>Notes</th>
                            <th style={styles.th}>AI Analysis</th>
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
                                <td style={styles.td}>{player.position}</td>
                                <td style={styles.td}>{player.team || 'FA'}</td>
                                <td style={styles.td}>{player.age || 'N/A'}</td>
                                <td style={{...styles.td, ...styles.valueCell}}>{player.fantasy_calc_value || 0}</td>
                                <td style={styles.td}>{player.sf_dynasty_overall_rank || 'N/A'}</td>
                                <td style={styles.td}>{player.qb_dynasty_overall_rank || 'N/A'}</td>
                                <td style={styles.td}>{player.sf_redraft_overall_rank || 'N/A'}</td>
                                <td style={styles.td}>{player.qb_redraft_overall_rank || 'N/A'}</td>
                                <td style={styles.td}>{player.rsp_pos_rank || 'N/A'}</td>
                                <td style={styles.td}>{player.category || 'N/A'}</td>
                                <td style={{...styles.td, minWidth: '300px', whiteSpace: 'normal'}}>
                                    {player.comparison_spectrum || 'N/A'}
                                </td>
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
                                <td style={styles.td}>
                                    {player.gemini_analysis ? (
                                        <button 
                                            onClick={() => setModalContent({
                                                title: `${player.full_name} - AI Analysis`,
                                                body: player.gemini_analysis
                                            })}
                                            style={styles.notesButton}
                                        >
                                            View
                                        </button>
                                    ) : (
                                      <span style={{color: '#999'}}>N/A</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <p>No players found on this roster.</p>
        )}
        {modalContent && (
            <Modal 
                content={
                    <>
                        <h2 style={styles.h2}>{modalContent.title}</h2>
                        <div style={styles.modalBody}>{modalContent.body}</div>
                    </>
                } 
                onClose={() => setModalContent(null)} 
            />
        )}
    </div>
  );
}

export default FleaflickerRosterDisplay;
