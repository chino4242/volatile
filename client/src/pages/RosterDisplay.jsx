// client/src/pages/RosterDisplay.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getSleeperRoster, getSleeperLeague } from '../api/sleeper';
import { getFantasyCalcValues } from '../api/fantasyCalc';
import './RosterDisplay.css';
import PlayerTable from '../components/PlayerTable';
import { usePlayerAnalysis } from '../hooks/usePlayerAnalysis';

// Helper to cleanse names for FantasyCalc matching (defined outside component to be stable)
const cleanseName = (name) => (typeof name === 'string' ? name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase() : '');

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();

  // State for league settings
  const [leagueSettings, setLeagueSettings] = useState(null);
  const [is1QB, setIs1QB] = useState(false);
  const [isRedraft, setIsRedraft] = useState(false);

  // Base state: Roster players + their basic Sleeper data + FantasyCalc value
  const [basePlayers, setBasePlayers] = useState([]);
  const [managerName, setManagerName] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fantasy_calc_value', direction: 'descending' });
  const [hoveredRow, setHoveredRow] = useState(null);

  // Hook handles Python analysis enrichment
  const { enrichedPlayers, loading: analysisLoading } = usePlayerAnalysis(basePlayers);

  const fetchData = useCallback(async (currentLeagueId, currentRosterId) => {
    if (!currentLeagueId || !currentRosterId) {
      setFetchError("League ID and Roster ID are required.");
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch League Info first to determine params
      // We need getSleeperLeague imported!
      // Dynamically import or assume it's available in props? No, we need to import it.
      // Wait, I can't add imports with replace_file_content mid-file cleanly if I don't target top.
      // I'll fix imports in next step. For now, assume getSleeperLeague is passed or imported.

      // We need to fetch league info to know numQbs
      const leagueInfo = await getSleeperLeague(currentLeagueId);
      setLeagueSettings(leagueInfo);

      // Determine format
      // Sleeper: roster_positions contains 'QB', 'SUPER_FLEX'. 
      // If 'SUPER_FLEX' exists, it's SF. If multiple 'QB', it's 2QB (SF logic).
      // If only 1 'QB' and no 'SUPER_FLEX', it's 1QB.
      const rosterPositions = leagueInfo.roster_positions || [];
      const qbCount = rosterPositions.filter(p => p === 'QB').length;
      const sfCount = rosterPositions.filter(p => p === 'SUPER_FLEX').length;

      const isLeague1QB = (qbCount === 1 && sfCount === 0);
      const isLeagueRedraft = (leagueInfo.settings?.type === 0); // 0=Redraft, 1=Keeper, 2=Dynasty

      setIs1QB(isLeague1QB);
      setIsRedraft(isLeagueRedraft);

      const fcNumQbs = isLeague1QB ? 1 : 2;
      const fcIsDynasty = !isLeagueRedraft;

      // 2. Fetch Roster + FC Values with CORRECT params
      const [rosterData, calcValuesResponse] = await Promise.all([
        getSleeperRoster(currentLeagueId, currentRosterId),
        getFantasyCalcValues({ isDynasty: fcIsDynasty, numQbs: fcNumQbs, ppr: 0.5 })
      ]);

      setManagerName(rosterData.manager_display_name || 'Unknown Owner');

      const fantasyCalcMap = new Map();
      if (calcValuesResponse && typeof calcValuesResponse === 'object') {
        Object.entries(calcValuesResponse).forEach(([cleansedNameKey, playerData]) => {
          if (playerData && typeof playerData.value !== 'undefined') {
            fantasyCalcMap.set(cleansedNameKey, playerData.value);
          }
        });
      }

      // Merge FC values into base players immediately
      const initialRoster = (rosterData.players || []).map(player => {
        const tradeValue = fantasyCalcMap.get(cleanseName(player.full_name)) || 0;
        return {
          ...player,
          fantasy_calc_value: tradeValue, // Standardized key
          trade_value: tradeValue
        };
      });

      setBasePlayers(initialRoster);

    } catch (e) {
      console.error("Failed to fetch roster data:", e);
      setFetchError(e.message || "An unknown error occurred while fetching data.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(leagueId, rosterId);
  }, [leagueId, rosterId, fetchData]);

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

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    } else {
      direction = ['overall_rank', 'positional_rank', 'tier'].includes(key)
        ? 'ascending'
        : 'descending';
    }
    setSortConfig({ key, direction });
  };

  const columns = useMemo(() => {
    // Determine accessors based on format
    let rankAccessor = 'overall_rank';
    let rankHeader = 'Overall Rank';
    let tierAccessor = 'tier';

    if (isRedraft) {
      rankAccessor = 'redraft_overall_rank';
      rankHeader = 'Redraft Rank';
      tierAccessor = 'redraft_tier';
    } else if (is1QB) {
      rankAccessor = 'one_qb_rank';
      rankHeader = '1QB Rank';
      tierAccessor = 'one_qb_tier';
    }

    return [
      { header: 'Full Name', accessor: 'full_name', classNameKey: 'Full Name' },
      { header: 'Position', accessor: 'position', classNameKey: 'Full Name' },
      { header: 'Team', accessor: 'team' },
      { header: 'Age', accessor: 'age' },
      { header: 'Trade Value', accessor: 'fantasy_calc_value', sortKey: 'fantasy_calc_value', isValueCell: true, classNameKey: 'Trade Value' },
      { header: rankHeader, accessor: rankAccessor, sortKey: rankAccessor, classNameKey: 'Overall Rank' },
      { header: 'Pos. Rank', accessor: 'positional_rank', sortKey: 'positional_rank', classNameKey: 'Pos Rk' },
      { header: 'Tier', accessor: tierAccessor, sortKey: tierAccessor, classNameKey: 'Tier' },
    ];
  }, [is1QB, isRedraft]);

  if (initialLoading) {
    return <div className="roster-container">Loading roster...</div>;
  }

  if (fetchError) {
    return <div className="roster-container" style={{ color: 'red' }}>Error: {fetchError}</div>;
  }

  return (
    <div className="roster-container">
      <h2>
        Manager: {managerName} (Roster ID: {rosterId})
      </h2>
      <p>
        Players sorted by FantasyCalc {isRedraft ? 'Redraft' : 'Dynasty'} {is1QB ? '1-QB' : 'Superflex'} Value.
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

export default RosterDisplay;