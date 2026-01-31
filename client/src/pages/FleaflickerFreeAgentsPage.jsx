// client/src/pages/FleaflickerFreeAgentsPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles';
import './FleaflickerFreeAgentsPage.css';
import PlayerTable from '../components/PlayerTable';

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

// Helper function to parse auction values like "$63" into numbers
function parseAuctionValue(value) {
    if (typeof value === 'string') {
        return Number(value.replace(/[^0-9.-]+/g, ""));
    }
    return value;
}

function FleaflickerFreeAgentsPage() {
    const { leagueId } = useParams();

    const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [selectedPlayers, setSelectedPlayers] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'ascending' });

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

    const sortedFreeAgents = useMemo(() => {
        let sortableItems = [...enrichedFreeAgents];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'redraft_auction_value') {
                    aValue = parseAuctionValue(aValue);
                    bValue = parseAuctionValue(bValue);
                }

                const aIsNull = aValue === null || aValue === undefined;
                const bIsNull = bValue === null || bValue === undefined;

                if (aIsNull) return 1;
                if (bIsNull) return -1;

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [enrichedFreeAgents, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key) {
            direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
        } else {
            direction = ['rank', 'overall_rank', 'redraft_overall_rank', 'redraft_pos_rank', 'redraft_tier'].includes(key)
                ? 'ascending'
                : 'descending';
        }
        setSortConfig({ key, direction });
    };

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
            if (newSelected.has(playerId)) newSelected.delete(playerId);
            else newSelected.add(playerId);
            return newSelected;
        });
    };

    const compSpectrumStyle = {
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        maxWidth: '250px',
        minWidth: '150px',
    };

    const columns = [
        { header: 'Dynasty Rk', accessor: 'rank', sortKey: 'rank', isValueCell: true },
        { header: 'Full Name', accessor: 'full_name', classNameKey: 'Full Name' },
        { header: 'Pos', accessor: 'position' },
        { header: 'Age', accessor: 'age' },
        { header: 'Dynasty Val', accessor: 'fantasy_calc_value', sortKey: 'fantasy_calc_value', isValueCell: true, classNameKey: 'Trade Value' },
        { header: 'Redraft Rk', accessor: 'redraft_overall_rank', sortKey: 'redraft_overall_rank', classNameKey: 'Redraft Rank' },
        { header: 'Redraft Pos Rk', accessor: 'redraft_pos_rank', sortKey: 'redraft_pos_rank', classNameKey: 'Redraft Pos Rank' },
        { header: 'Redraft Tier', accessor: 'redraft_tier', sortKey: 'redraft_tier' },
        { header: 'Redraft Auction $', accessor: 'redraft_auction_value', sortKey: 'redraft_auction_value', classNameKey: 'Redraft Auction $' },
        { header: 'ZAP', accessor: 'zap_score', sortKey: 'zap_score', classNameKey: 'ZAP' },
        { header: 'Depth Score', accessor: 'depth_of_talent_score', sortKey: 'depth_of_talent_score', classNameKey: 'Depth Score' },
        { header: 'Category', accessor: 'category', classNameKey: 'Category', style: { minWidth: '150px' } },
        { header: 'Comp Spectrum', accessor: 'comparison_spectrum', style: compSpectrumStyle },
        {
            header: 'Notes',
            render: (player) => (
                (player.notes_lrqb || player.notes_rsp || player.depth_of_talent_desc) && (
                    <button onClick={() => setModalContent({
                        title: `${player.full_name} - Analysis Notes`,
                        body: `LRQB Notes:\n${player.notes_lrqb || 'N/A'}\n\n---\n\nRSP Notes:\n${player.notes_rsp || 'N/A'}\n\n---\n\nDepth of Talent Description:\n${player.depth_of_talent_desc || 'N/A'}`
                    })} style={styles.notesButton}>View</button>
                )
            )
        },
        {
            header: 'AI Analysis',
            render: (player) => (
                player.gemini_analysis && (
                    <button onClick={() => setModalContent({ title: `${player.full_name} - AI Analysis`, body: player.gemini_analysis })} style={styles.notesButton}>View</button>
                )
            )
        }
    ];

    if (loading) return <div style={styles.pageContainer}>Loading free agents and analysis...</div>;
    if (error) return <div style={{ ...styles.pageContainer, ...styles.errorText }}>Error: {error}</div>;

    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.h1}>Top Fleaflicker Free Agents</h1>
            <p style={styles.p}>Found {enrichedFreeAgents.length} relevant players for league {leagueId}.</p>

            <PlayerTable
                players={sortedFreeAgents}
                columns={columns}
                sortConfig={sortConfig}
                onSort={requestSort}
                onRowHover={setHoveredRow}
                hoveredRowId={hoveredRow}
                selection={{
                    selectedIds: selectedPlayers,
                    onSelect: handleSelectPlayer,
                    onSelectAll: handleSelectAll
                }}
            />

            {modalContent && (
                <Modal
                    content={<><h2 style={styles.h2}>{modalContent.title}</h2><div style={styles.modalBody}>{modalContent.body}</div></>}
                    onClose={() => setModalContent(null)}
                />
            )}
        </div>
    );
}

export default FleaflickerFreeAgentsPage;