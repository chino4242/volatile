import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles';
import './FleaflickerFreeAgentsPage.css'; // Make sure this CSS file exists in the same folder

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// A reusable Modal component for popups
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

function FleaflickerFreeAgentsPage() {
    const { leagueId } = useParams();
  
    const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [selectedPlayers, setSelectedPlayers] = useState(new Set());

    // --- HELPER FUNCTION FOR CONDITIONAL FORMATTING ---
    function getCellClassName(player, columnName) {
        let dynamicClass = '';
        switch (columnName) {
            case 'Full Name':
                const position = player.position?.toLowerCase();
                if (['qb', 'rb', 'wr', 'te'].includes(position)) {
                    dynamicClass = position;
                }
                break;
            case 'Pos Rk':
                const rank = player.positional_rank;
                if (!rank) break;
                if (rank <= 5) dynamicClass = 'top-five';
                else if (rank <= 10) dynamicClass = 'top-ten';
                else if (rank <= 20) dynamicClass = 'positive';
                break;
            case 'Trade Value':
                const value = player.fantasy_calc_value;
                if (!value) break;
                if (value >= 7000) dynamicClass = 'top-five';
                else if (value >= 4000) dynamicClass = 'elite';
                else if (value >= 3000) dynamicClass = 'positive';
                else if (value >= 1000) dynamicClass = 'neutral';
                break;
        }
        return dynamicClass;
    }

    const fetchData = useCallback(async (currentLeagueId) => {
        if (!currentLeagueId) {
            setError("A Fleaflicker League ID is required.");
            setLoading(false);
            return;
        }
    
        setLoading(true);
        setError(null);
        setSelectedPlayers(new Set());
        try {    
            const [fleaflickerData, fantasyCalcValues] = await Promise.all([
                get(`/api/fleaflicker/league/${currentLeagueId}/data`),
                get(`/api/values/fantasycalc?isDynasty=true&numQbs=1&ppr=0.5`)
            ]);
            
            const masterPlayerList = fleaflickerData.master_player_list || [];
            const rosteredPlayerNames = new Set();
            fleaflickerData.rosters.forEach(roster => {
                roster.players.forEach(player => rosteredPlayerNames.add(cleanseName(player.full_name)))
            });
            
            const actualFreeAgents = masterPlayerList.filter(p => !rosteredPlayerNames.has(cleanseName(p.full_name)));
    
            const playerIds = actualFreeAgents.map(p => p.sleeper_id);
            let analysisDataMap = new Map();
    
            if (playerIds.length > 0) {
                const analysisResponse = await fetch(`${PYTHON_API_BASE_URL}/api/enriched-players/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sleeper_ids: playerIds })
                });
                if (!analysisResponse.ok) throw new Error(`Python API error: ${analysisResponse.status}`);
                
                const analysisPlayers = await analysisResponse.json();
                analysisPlayers.forEach(player => {
                    if (player?.sleeper_id && !player.error) {
                        analysisDataMap.set(String(player.sleeper_id), player);
                    }
                });
            }
    
            const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));

            const finalFreeAgents = actualFreeAgents.map(player => {
                const analysis = analysisDataMap.get(String(player.sleeper_id));
                const calcValueData = fantasyCalcValuesMap.get(cleanseName(player.full_name));

                return { 
                    ...player, 
                    ...analysis,
                    fantasy_calc_value: calcValueData?.value || 0 
                };
            });
    
            const skillPositions = ['QB', 'WR', 'RB', 'TE'];
            const rankedFreeAgents = finalFreeAgents
                .filter(p => skillPositions.includes(p.position) && p.fantasy_calc_value > 0)
                .sort((a, b) => (b.fantasy_calc_value || 0) - (a.fantasy_calc_value || 0))
                .map((player, index) => ({
                    ...player,
                    rank: index + 1
                }));
            
            setEnrichedFreeAgents(rankedFreeAgents);
    
        } catch (e) {
            console.error("Failed to fetch Fleaflicker page data:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(leagueId);
    }, [leagueId, fetchData]);

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const allPlayerIds = new Set(enrichedFreeAgents.map(p => p.sleeper_id));
            setSelectedPlayers(allPlayerIds);
        } else {
            setSelectedPlayers(new Set());
        }
    };

    const handleSelectPlayer = (playerId) => {
        setSelectedPlayers(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(playerId)) {
                newSelected.delete(playerId);
            } else {
                newSelected.add(playerId);
            }
            return newSelected;
        });
    };

    // --- NEW STYLE OBJECT FOR THE WRAPPING COLUMN ---
    const compSpectrumStyle = {
        whiteSpace: 'normal',   // Allows text to wrap
        wordBreak: 'break-word',  // Breaks long words if necessary
        maxWidth: '250px',        // Limits the maximum width of the column
        minWidth: '150px',        // Ensures the column doesn't get too narrow
    };

    if (loading) return <div style={styles.pageContainer}>Loading free agents and analysis...</div>;
    if (error) return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>;

    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.h1}>Top Fleaflicker Free Agents</h1>
            <p style={styles.p}>Found {enrichedFreeAgents.length} relevant players for league {leagueId}, sorted by trade value.</p>
        
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>
                                <input 
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={enrichedFreeAgents.length > 0 && selectedPlayers.size === enrichedFreeAgents.length}
                                    aria-label="Select all players"
                                />
                            </th>
                            <th style={styles.th}>Rank</th>
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
                            {/* --- STYLE APPLIED TO HEADER --- */}
                            <th style={{...styles.th, ...compSpectrumStyle}}>Comp Spectrum</th>
                            <th style={{...styles.th, minWidth: '150px'}}>Category</th>
                            <th style={{...styles.th, minWidth: '150px'}}>Draft Delta</th>
                            <th style={styles.th}>RSP Pos Rk</th>
                            <th style={styles.th}>RSP 23-25</th>
                            <th style={styles.th}>RP 21-25</th>
                            <th style={styles.th}>Notes</th>
                            <th style={styles.th}>AI Analysis</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrichedFreeAgents.map((player) => {
                            const isChecked = selectedPlayers.has(player.sleeper_id);
                            const isHovered = hoveredRow === player.sleeper_id;
                            const rowStyle = isChecked ? {} : (isHovered ? styles.trHover : {});

                            return (
                                <tr 
                                    key={player.sleeper_id}
                                    onMouseEnter={() => setHoveredRow(player.sleeper_id)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    style={rowStyle}
                                    className={isChecked ? 'selected' : ''} 
                                >
                                    <td style={styles.td}>
                                        <input 
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleSelectPlayer(player.sleeper_id)}
                                            aria-label={`Select ${player.full_name}`}
                                        />
                                    </td>
                                    <td style={{...styles.td, ...styles.valueCell}}>{player.rank}</td>
                                    <td style={styles.td} className={getCellClassName(player, 'Full Name')}>{player.full_name || 'N/A'}</td>
                                    <td style={styles.td}>{player.position}</td>
                                    <td style={styles.td}>{player.team || 'FA'}</td>
                                    <td style={styles.td}>{player.age || 'N/A'}</td>
                                    <td style={{...styles.td, ...styles.valueCell}} className={getCellClassName(player, 'Trade Value')}>{player.fantasy_calc_value}</td>
                                    <td style={styles.td}>{player.overall_rank}</td>
                                    <td style={styles.td} className={getCellClassName(player, 'Pos Rk')}>{player.positional_rank}</td>
                                    <td style={styles.td}>{player.tier}</td>
                                    <td style={styles.td}>{player.zap_score}</td>
                                    <td style={styles.td}>{player.depth_of_talent_score}</td>
                                    {/* --- STYLE APPLIED TO CELL --- */}
                                    <td style={{...styles.td, ...compSpectrumStyle}}>{player.comparison_spectrum}</td>
                                    <td style={styles.td}>{player.category}</td>
                                    <td style={styles.td}>{player.draft_capital_delta}</td>
                                    <td style={styles.td}>{player.rsp_pos_rank}</td>
                                    <td style={styles.td}>{player.rsp_2023_2025_rank}</td>
                                    <td style={styles.td}>{player.rp_2021_2025_rank}</td>
                                    <td style={styles.td}>
                                        {(player.notes_lrqb || player.notes_rsp || player.depth_of_talent_desc) && (
                                            <button 
                                                onClick={() => setModalContent({
                                                    title: `${player.full_name} - Analysis Notes`,
                                                    body: `LRQB Notes:\n${player.notes_lrqb || 'N/A'}\n\n---\n\nRSP Notes:\n${player.notes_rsp || 'N/A'}\n\n---\n\nDepth of Talent Description:\n${player.depth_of_talent_desc || 'N/A'}`
                                                })}
                                                style={styles.notesButton}
                                            >
                                                View
                                            </button>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {player.gemini_analysis && (
                                            <button 
                                                onClick={() => setModalContent({
                                                    title: `${player.full_name} - AI Analysis`,
                                                    body: player.gemini_analysis
                                                })}
                                                style={styles.notesButton}
                                            >
                                                View
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

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

export default FleaflickerFreeAgentsPage;