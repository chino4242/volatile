import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchRosterData } from '../api/rosterAdapter';
import { getFantasyCalcValues } from '../api/fantasyCalc';
import PlayerTable from './PlayerTable';
import { usePlayerAnalysis } from '../hooks/usePlayerAnalysis';
import { getCellClassName, cleanseName } from '../utils/formatting';
import '../pages/RosterDisplay.css'; // Reuse existing CSS



function GenericRosterDisplay({ platform }) {
    const { leagueId, rosterId } = useParams();

    const [basePlayers, setBasePlayers] = useState([]);
    const [managerName, setManagerName] = useState('');
    const [leagueFormat, setLeagueFormat] = useState('SF'); // 'SF', '1QB', 'Redraft'

    const [initialLoading, setInitialLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const [sortConfig, setSortConfig] = useState({ key: 'fantasy_calc_value', direction: 'descending' });
    const [hoveredRow, setHoveredRow] = useState(null);

    // Manual Settings State
    const [manualSettings, setManualSettings] = useState({
        numTeams: 12,
        ppr: 1.0,
        isSuperflex: true
    });
    const [keeperCount, setKeeperCount] = useState(10); // Default to 10 keepers
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // Hook handles Python analysis enrichment
    const { enrichedPlayers, loading: analysisLoading } = usePlayerAnalysis(basePlayers);



    // Derived sorted list
    const sortedRoster = useMemo(() => {
        if (!enrichedPlayers) return [];

        // Inject Value Gap here (because ranks are added by usePlayerAnalysis)
        let sortableItems = enrichedPlayers.map(p => {
            const mkt = p.fc_rank;
            const lg = manualSettings.isSuperflex ? p.overall_rank : p.one_qb_rank;
            const gap = (mkt && lg) ? mkt - lg : null;
            return { ...p, value_gap: gap };
        });

        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                const aIsNull = aValue === null || aValue === undefined || aValue === 'N/A';
                const bIsNull = bValue === null || bValue === undefined || bValue === 'N/A';

                if (aIsNull) return 1;
                if (bIsNull) return -1;

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [enrichedPlayers, sortConfig, manualSettings.isSuperflex]);

    const fetchData = useCallback(async (currPlatform, currLeagueId, currRosterId) => {
        if (!currLeagueId || !currRosterId) return;

        setInitialLoading(true);
        setFetchError(null);
        try {
            // 1. Fetch Basic Roster Data + League Settings via Adapter
            const rosterData = await fetchRosterData(currPlatform, currLeagueId, currRosterId);

            setManagerName(rosterData.managerName);

            // Determine the effective settings to use for this request
            let effectiveIsSuperflex = manualSettings.isSuperflex;
            let effectivePpr = manualSettings.ppr;
            let effectiveNumTeams = manualSettings.numTeams;

            // Initial setup of manual settings based on league detection
            if (!settingsLoaded) {
                setLeagueFormat(rosterData.leagueFormat);
                effectiveIsSuperflex = rosterData.fcSettings.numQbs === 2;
                setManualSettings(prev => ({
                    ...prev,
                    isSuperflex: effectiveIsSuperflex
                }));
                setSettingsLoaded(true);
            }

            // 2. Fetch FantasyCalc Values (This now calls your /batch endpoint)
            const calcValuesResponse = await getFantasyCalcValues({
                isDynasty: rosterData.fcSettings.isDynasty,
                numQbs: effectiveIsSuperflex ? 2 : 1,
                ppr: effectivePpr,
                numTeams: effectiveNumTeams
            });

            // 3. Merge FC Values (FIXED: Handles Array + Matches by ID)
            const fantasyCalcMap = new Map();

            // Check if response is an Array (New Backend) or Object (Fallback)
            if (Array.isArray(calcValuesResponse)) {
                calcValuesResponse.forEach(playerData => {
                    // Index by Sleeper ID for perfect matching
                    if (playerData && playerData.sleeper_id) {
                        fantasyCalcMap.set(String(playerData.sleeper_id), playerData);
                    }
                });
            } else if (calcValuesResponse && typeof calcValuesResponse === 'object') {
                // Legacy fallback: Index by Name if ID is missing (unlikely now)
                Object.values(calcValuesResponse).forEach(playerData => {
                    if (playerData && playerData.sleeper_id) {
                        fantasyCalcMap.set(String(playerData.sleeper_id), playerData);
                    }
                });
            }

            const mergedPlayers = (rosterData.players || []).map(player => {
                // MATCH BY ID (Robust)
                // We try sleeper_id, then player_id, then id
                const lookUpId = String(player.sleeper_id || player.player_id || player.id);
                const fcData = fantasyCalcMap.get(lookUpId) || {};

                // Fallback: Name Match (Only if ID failed)
                // const fcData = idMatch || fantasyCalcMap.get(cleanseName(player.full_name)) || {};

                const tradeValue = fcData.fantasy_calc_value || 0;

                return {
                    ...player,
                    // Merge fields from Database
                    team: fcData.team || player.team || 'FA',     // Fixes "FA" issue
                    position: fcData.position || player.position, // Ensures Position is set
                    fantasy_calc_value: tradeValue,
                    trade_value: tradeValue,
                    trend_30_day: fcData.trend_30_day,
                    redraft_value: fcData.redraft_value,
                    fc_rank: fcData.fc_rank,
                    // Gap calculated later
                };
            });

            setBasePlayers(mergedPlayers);

        } catch (e) {
            console.error("Failed to fetch roster data:", e);
            setFetchError(e.message || "An unknown error occurred.");
        } finally {
            setInitialLoading(false);
        }
    }, [manualSettings, settingsLoaded]);

    useEffect(() => {
        if (leagueId && rosterId) {
            fetchData(platform, leagueId, rosterId);
        }
    }, [platform, leagueId, rosterId, fetchData]); // Re-fetch when dependencies change (including manualSettings via fetchData)

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key) {
            direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
        } else {
            direction = ['overall_rank', 'one_qb_rank', 'positional_rank', 'tier', 'one_qb_tier'].includes(key)
                ? 'ascending'
                : 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Determine effective league format for columns based on toggle
    const effectiveFormat = manualSettings.isSuperflex ? 'SF' : '1QB';
    // Note: If Redraft, we might want to stick to Redraft, but ignoring for now unless explicitly needed. 

    const columns = useMemo(() => {
        let rankAccessor = 'overall_rank';
        let rankHeader = 'Overall Rank';
        let tierAccessor = 'tier';
        let posRankAccessor = 'positional_rank';

        // Override using the manual toggle
        if (effectiveFormat === '1QB') {
            rankAccessor = 'one_qb_rank';
            rankHeader = '1QB Rank';
            tierAccessor = 'one_qb_tier';
            posRankAccessor = 'one_qb_pos_rank';
        } else {
            // Default / SF
            rankAccessor = 'overall_rank';
            rankHeader = 'Overall Rank';
            tierAccessor = 'tier';
            posRankAccessor = 'positional_rank';
        }

        // Use Redraft specific columns if that was the original detected format? 
        // For now, let's trust the toggle primarily for Dynasty views.
        if (leagueFormat === 'Redraft') {
            rankAccessor = 'redraft_overall_rank';
            rankHeader = 'Redraft Rank';
            tierAccessor = 'redraft_tier';
        }

        return [
            { header: 'Full Name', accessor: 'full_name', classNameKey: 'Full Name' },
            { header: 'Position', accessor: 'position', classNameKey: 'Full Name' },
            { header: 'Team', accessor: 'team' },
            {
                header: 'Age',
                accessor: 'age',
                render: (player) => {
                    const age = player.age;
                    if (!age) return '-';
                    let className = 'age-neutral'; // Default (25-28)
                    if (age <= 24) className = 'age-youth';  // Green
                    else if (age >= 29) className = 'age-veteran'; // Red/Warning

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
                header: 'Trade Value',
                accessor: 'fantasy_calc_value',
                sortKey: 'fantasy_calc_value',
                isValueCell: true,
                classNameKey: 'Trade Value',
                render: (player) => {
                    const value = player.fantasy_calc_value || 0;
                    // Max value anchor: 9000 (Justin Jefferson tier)
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
            {
                header: 'Redraft Value',
                accessor: 'redraft_value',
                sortKey: 'redraft_value',
                render: (player) => {
                    return player.redraft_value || '-';
                }
            },
            { header: rankHeader, accessor: rankAccessor, sortKey: rankAccessor, classNameKey: 'Overall Rank' },
            {
                header: 'Market Rank',
                accessor: 'fc_rank',
                sortKey: 'fc_rank',
                classNameKey: 'Market Rank'
            },
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
            { header: 'Pos. Rank', accessor: posRankAccessor, sortKey: posRankAccessor, classNameKey: 'Pos Rk' },
            { header: 'Tier', accessor: tierAccessor, sortKey: tierAccessor, classNameKey: 'Tier' },
        ];
    }, [effectiveFormat, leagueFormat]);

    if (initialLoading && !settingsLoaded) {
        return <div className="roster-container">Loading roster...</div>;
    }

    if (fetchError) {
        return <div className="roster-container" style={{ color: 'red' }}>Error: {fetchError}</div>;
    }

    return (
        <div className="roster-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>
                    {platform === 'sleeper' ? 'Manager' : 'Team'}: {managerName}
                </h2>

                {/* Manual Settings Controls */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '8px' }}>

                    {/* NEW: Keeper Limit Control */}
                    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #ddd', paddingRight: '20px' }}>
                        <label style={{ fontSize: '12px', color: '#444', marginBottom: '4px', fontWeight: 'bold' }}>Keepers</label>
                        <input
                            type="number"
                            min="0"
                            max="50"
                            value={keeperCount}
                            onChange={(e) => setKeeperCount(parseInt(e.target.value) || 0)}
                            style={{
                                padding: '4px',
                                borderRadius: '4px',
                                border: '1px solid #aaa',
                                width: '60px',
                                textAlign: 'center',
                                fontWeight: 'bold'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>League Size</label>
                        <select
                            value={manualSettings.numTeams}
                            onChange={(e) => setManualSettings(prev => ({ ...prev, numTeams: parseInt(e.target.value) }))}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            {[8, 10, 12, 14, 16].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>PPR</label>
                        <select
                            value={manualSettings.ppr}
                            onChange={(e) => setManualSettings(prev => ({ ...prev, ppr: parseFloat(e.target.value) }))}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value={0}>0 (Standard)</option>
                            <option value={0.5}>0.5 (Half)</option>
                            <option value={1.0}>1.0 (Full)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Superflex</label>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={manualSettings.isSuperflex}
                                onChange={(e) => setManualSettings(prev => ({ ...prev, isSuperflex: e.target.checked }))}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <p style={{ marginBottom: '10px' }}>
                Sorted by FantasyCalc {leagueFormat === 'Redraft' ? 'Redraft' : 'Dynasty'} {effectiveFormat} Value ({manualSettings.numTeams} Teams, {manualSettings.ppr} PPR).
                {analysisLoading && " (Enhancing...)"}
            </p>

            {sortedRoster.length > 0 ? (
                <PlayerTable
                    players={sortedRoster}
                    columns={columns}
                    sortConfig={sortConfig}
                    onSort={requestSort}
                    onRowHover={setHoveredRow}
                    hoveredRowId={hoveredRow}
                    keeperCount={keeperCount}
                />
            ) : (
                <p>No players found on this roster.</p>
            )}
        </div>
    );
}

export default GenericRosterDisplay;
