// client/src/pages/FleaflickerFreeAgentsPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getFleaflickerLeagueData } from '../api/fleaflicker';
import { getFantasyCalcValues } from '../api/fantasyCalc';
import { styles } from '../styles';
import './FleaflickerFreeAgentsPage.css';
import PlayerTable from '../components/PlayerTable';
import { usePlayerAnalysis } from '../hooks/usePlayerAnalysis';

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

// Helper function to cleanse player names for matching
// MUST match backend implementation in server/utils/nameUtils.js
function cleanseName(name) {
    if (typeof name !== 'string') return '';

    return name
        .toLowerCase()
        .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/gi, '') // Remove suffixes with optional period
        .replace(/[.'\",]/g, '') // Remove periods, apostrophes, quotes, and commas
        .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
        .trim();
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

    // Base players with just Fleaflicker Data + FantasyCalc Value
    const [basePlayers, setBasePlayers] = useState([]);

    // UI State
    const [initialLoading, setInitialLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [modalContent, setModalContent] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [selectedPlayers, setSelectedPlayers] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'ascending' });

    // Use hook to enrich with Python analysis
    const { enrichedPlayers: fullEnrichedList, loading: analysisLoading } = usePlayerAnalysis(basePlayers);

    const fetchData = useCallback(async (currentLeagueId) => {
        if (!currentLeagueId) {
            setFetchError("A Fleaflicker League ID is required.");
            setInitialLoading(false);
            return;
        }
        setInitialLoading(true);
        setFetchError(null);
        setSelectedPlayers(new Set());
        try {
            // Use dedicated API functions
            const [fleaflickerData, fantasyCalcValues] = await Promise.all([
                getFleaflickerLeagueData(currentLeagueId),
                getFantasyCalcValues({ isDynasty: true, numQbs: 1, ppr: 0.5 })
            ]);

            const masterPlayerList = fleaflickerData.master_player_list || [];
            const rosteredPlayerNames = new Set();
            fleaflickerData.rosters.forEach(roster => {
                roster.players.forEach(player => rosteredPlayerNames.add(cleanseName(player.full_name)))
            });

            console.log(`[Free Agents Debug] Total players in master list: ${masterPlayerList.length}`);
            console.log(`[Free Agents Debug] Rostered players: ${rosteredPlayerNames.size}`);

            const actualFreeAgents = masterPlayerList.filter(p => !rosteredPlayerNames.has(cleanseName(p.full_name)));
            console.log(`[Free Agents Debug] Free agents after roster filter: ${actualFreeAgents.length}`);

            const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));
            console.log(`[Free Agents Debug] FantasyCalc players available: ${fantasyCalcValuesMap.size}`);

            // Debug: Show sample cleansed names from both datasets
            if (actualFreeAgents.length > 0) {
                const sampleFA = actualFreeAgents.slice(0, 3).map(p => `${p.full_name} -> ${cleanseName(p.full_name)}`);
                console.log(`[Free Agents Debug] Sample FA cleansed names:`, sampleFA);
            }
            if (fantasyCalcValuesMap.size > 0) {
                const sampleFC = Array.from(fantasyCalcValuesMap.keys()).slice(0, 3);
                console.log(`[Free Agents Debug] Sample FC cleansed names:`, sampleFC);
            }

            // Prepare base list with FantasyCalc values merged
            const playersWithValue = actualFreeAgents.map(player => {
                const fcData = fantasyCalcValuesMap.get(cleanseName(player.full_name)) || {};
                return {
                    ...player,
                    position: fcData.position,              // Add position from FantasyCalc
                    fantasy_calc_value: fcData.fantasy_calc_value || 0,
                    trend_30_day: fcData.trend30Day,
                    redraft_value: fcData.redraftValue,
                    fc_rank: fcData.fc_rank
                };
            });

            const playersWithValues = playersWithValue.filter(p => p.fantasy_calc_value > 0);
            console.log(`[Free Agents Debug] Players with FC values > 0: ${playersWithValues.length} / ${playersWithValue.length}`);

            // Show sample matched and unmatched players
            const matched = playersWithValue.filter(p => p.fantasy_calc_value > 0).slice(0, 3);
            const unmatched = playersWithValue.filter(p => p.fantasy_calc_value === 0).slice(0, 3);
            if (matched.length > 0) {
                console.log(`[Free Agents Debug] Sample matched:`, matched.map(p => `${p.full_name} (${p.fantasy_calc_value})`));
            }
            if (unmatched.length > 0) {
                console.log(`[Free Agents Debug] Sample unmatched:`, unmatched.map(p => `${p.full_name} -> ${cleanseName(p.full_name)}`));
            }

            setBasePlayers(playersWithValue);

        } catch (e) {
            console.error("Failed to fetch Fleaflicker page data:", e);
            setFetchError(e.message);
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(leagueId);
    }, [leagueId, fetchData]);

    // Derived State: Rank and Filter
    const enrichedAndRanked = useMemo(() => {
        console.log(`[Free Agents Debug] fullEnrichedList length: ${fullEnrichedList.length}`);

        // Debug: Check position values
        if (fullEnrichedList.length > 0) {
            const positionCounts = {};
            fullEnrichedList.forEach(p => {
                const pos = p.position || 'UNDEFINED';
                positionCounts[pos] = (positionCounts[pos] || 0) + 1;
            });
            console.log(`[Free Agents Debug] Position distribution:`, positionCounts);
        }

        const skillPositions = ['QB', 'WR', 'RB', 'TE'];

        // Filter valid players
        const filtered = fullEnrichedList
            .filter(p => skillPositions.includes(p.position) && p.fantasy_calc_value > 0);

        console.log(`[Free Agents Debug] After position + value filter: ${filtered.length}`);
        if (filtered.length === 0 && fullEnrichedList.length > 0) {
            console.log(`[Free Agents Debug] Sample player from fullEnrichedList:`, fullEnrichedList[0]);
        }

        // Sort by value desc to assign Rank
        const ranked = filtered
            .sort((a, b) => (b.fantasy_calc_value || 0) - (a.fantasy_calc_value || 0))
            .map((player, index) => ({
                ...player,
                rank: index + 1
            }));

        return ranked;
    }, [fullEnrichedList]);

    const sortedFreeAgents = useMemo(() => {
        let sortableItems = [...enrichedAndRanked];
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

        // Inject Value Gap (Calculated here to ensure enriched data is present)
        return sortableItems.map(p => {
            const mkt = p.fc_rank;
            // For free agents, we assume 1QB Rank is the primary league rank metric if available, else overall
            const lg = p.one_qb_rank || p.overall_rank;
            const gap = (mkt && lg) ? mkt - lg : null;
            return { ...p, value_gap: gap };
        });
    }, [enrichedAndRanked, sortConfig]);

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
            const allPlayerIds = new Set(enrichedAndRanked.map(p => p.sleeper_id));
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
        {
            header: 'Age',
            accessor: 'age',
            render: (player) => {
                const age = player.age;
                if (!age) return '-';
                let className = 'age-neutral';
                if (age <= 24) className = 'age-youth';
                else if (age >= 29) className = 'age-veteran';
                return <span className={`age-badge ${className}`}>{age}</span>;
            }
        },
        {
            header: 'Trend',
            accessor: 'trend_30_day',
            sortKey: 'trend_30_day',
            render: (player) => {
                const trend = player.trend_30_day;
                if (trend === undefined || trend === null) return '-';
                const isPositive = trend > 0;
                const isNegative = trend < 0;
                const trendClass = isPositive ? 'trend-up' : (isNegative ? 'trend-down' : 'trend-flat');
                const arrow = isPositive ? '▲' : (isNegative ? '▼' : '▬');
                return (
                    <span className={`trend-indicator ${trendClass}`}>
                        <span className="trend-arrow">{arrow}</span>
                        {Math.abs(trend)}
                    </span>
                );
            }
        },
        {
            header: 'Dynasty Val',
            accessor: 'fantasy_calc_value',
            sortKey: 'fantasy_calc_value',
            isValueCell: true,
            classNameKey: 'Trade Value',
            render: (player) => {
                const value = player.fantasy_calc_value || 0;
                const percent = Math.min((value / 9000) * 100, 100);
                return (
                    <div className="value-bar-container">
                        <div
                            className="value-bar-fill"
                            style={{ width: `${percent}%` }}
                        />
                        <span className="value-text">{value}</span>
                    </div>
                );
            }
        },
        { header: 'Redraft Val', accessor: 'redraft_value', sortKey: 'redraft_value', render: (p) => p.redraft_value || '-' },
        { header: '1QB Rank', accessor: 'one_qb_rank', sortKey: 'one_qb_rank', classNameKey: '1QB Rank' },
        { header: 'Market Rank', accessor: 'fc_rank', sortKey: 'fc_rank', classNameKey: 'Market Rank' },
        {
            header: 'Value Gap',
            accessor: 'value_gap',
            sortKey: 'value_gap',
            render: (player) => {
                const gap = player.value_gap;
                if (gap === null || gap === undefined) return '-';

                let className = 'gap-neutral';
                if (gap >= 40) className = 'gap-buy-huge';
                else if (gap >= 20) className = 'gap-buy-big';
                else if (gap >= 5) className = 'gap-buy';
                else if (gap <= -40) className = 'gap-sell-huge';
                else if (gap <= -20) className = 'gap-sell-big';
                else if (gap <= -5) className = 'gap-sell';

                const sign = gap > 0 ? '+' : '';
                return <span className={className}>{sign}{gap}</span>;
            }
        },
        { header: 'Redraft Rk', accessor: 'redraft_overall_rank', sortKey: 'redraft_overall_rank', classNameKey: 'Redraft Rank' },
        { header: 'Redraft Pos Rk', accessor: 'redraft_pos_rank', sortKey: 'redraft_pos_rank', classNameKey: 'Redraft Pos Rank' },
        { header: 'Redraft Tier', accessor: 'redraft_tier', sortKey: 'redraft_tier' },
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

    if (initialLoading) return <div style={styles.pageContainer}>Loading free agents...</div>;
    if (fetchError) return <div style={{ ...styles.pageContainer, ...styles.errorText }}>Error: {fetchError}</div>;

    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.h1}>Top Fleaflicker Free Agents</h1>
            <p style={styles.p}>
                Found {enrichedAndRanked.length} relevant players for league {leagueId}.
                {analysisLoading && " (Enhancing...)"}
            </p>

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