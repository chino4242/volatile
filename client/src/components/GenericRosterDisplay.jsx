import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchRosterData } from '../api/rosterAdapter';
import { getFantasyCalcValues } from '../api/fantasyCalc';
import PlayerTable from './PlayerTable';
import { usePlayerAnalysis } from '../hooks/usePlayerAnalysis';
import '../pages/RosterDisplay.css'; // Reuse existing CSS

// Helper to cleanse names for FantasyCalc matching (defined outside component to be stable)
const cleanseName = (name) => (typeof name === 'string' ? name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase() : '');

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
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // Hook handles Python analysis enrichment
    const { enrichedPlayers, loading: analysisLoading } = usePlayerAnalysis(basePlayers);



    // Derived sorted list
    const sortedRoster = useMemo(() => {
        let sortableItems = [...enrichedPlayers];
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
    }, [enrichedPlayers, sortConfig]);

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

            // 2. Fetch FantasyCalc Values with Effective Settings
            const calcValuesResponse = await getFantasyCalcValues({
                isDynasty: rosterData.fcSettings.isDynasty,
                numQbs: effectiveIsSuperflex ? 2 : 1,
                ppr: effectivePpr,
                numTeams: effectiveNumTeams
            });

            // 3. Merge FC Values
            const fantasyCalcMap = new Map();
            if (calcValuesResponse && typeof calcValuesResponse === 'object') {
                Object.entries(calcValuesResponse).forEach(([cleansedNameKey, playerData]) => {
                    if (playerData && typeof playerData.value !== 'undefined') {
                        fantasyCalcMap.set(cleansedNameKey, playerData.value);
                    }
                });
            }

            const mergedPlayers = (rosterData.players || []).map(player => {
                const tradeValue = fantasyCalcMap.get(cleanseName(player.full_name)) || 0;
                return {
                    ...player,
                    fantasy_calc_value: tradeValue,
                    trade_value: tradeValue
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
            { header: rankHeader, accessor: rankAccessor, sortKey: rankAccessor, classNameKey: 'Overall Rank' },
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
                />
            ) : (
                <p>No players found on this roster.</p>
            )}
        </div>
    );
}

export default GenericRosterDisplay;
