// client/src/pages/RosterDisplay.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import './RosterDisplay.css';
import PlayerTable from '../components/PlayerTable';
import { usePlayerAnalysis } from '../hooks/usePlayerAnalysis';

function RosterDisplay() {
  const { leagueId, rosterId } = useParams();

  // Base state: Roster players + their basic Sleeper data + FantasyCalc value
  const [basePlayers, setBasePlayers] = useState([]);
  const [managerName, setManagerName] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fantasy_calc_value', direction: 'descending' });
  const [hoveredRow, setHoveredRow] = useState(null);

  // Hook handles Python analysis enrichment
  const { enrichedPlayers, loading: analysisLoading } = usePlayerAnalysis(basePlayers);

  // Helper to cleanse names for FantasyCalc matching
  const cleanseName = (name) => (typeof name === 'string' ? name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase() : '');

  const fetchData = useCallback(async (currentLeagueId, currentRosterId) => {
    if (!currentLeagueId || !currentRosterId) {
      setFetchError("League ID and Roster ID are required.");
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);
    setFetchError(null);
    try {
      // Parallel fetch: Sleeper Roster + FantasyCalc Values
      const [rosterData, calcValuesResponse] = await Promise.all([
        get(`/api/sleeper/league/${currentLeagueId}/roster/${currentRosterId}`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=2&ppr=0.5`)
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
          trade_value: tradeValue // Keeping alias just in case, but favoring fantasy_calc_value
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

  const columns = [
    { header: 'Full Name', accessor: 'full_name', classNameKey: 'Full Name' },
    { header: 'Position', accessor: 'position', classNameKey: 'Full Name' }, // Reusing Full Name logic for pos color? Logic checks 'position' prop, so giving it classNameKey 'Full Name' triggers the check on player.position. Correct.
    { header: 'Team', accessor: 'team' },
    { header: 'Age', accessor: 'age' },
    { header: 'Trade Value', accessor: 'fantasy_calc_value', sortKey: 'fantasy_calc_value', isValueCell: true, classNameKey: 'Trade Value' },
    { header: 'Overall Rank', accessor: 'overall_rank', sortKey: 'overall_rank', classNameKey: 'Overall Rank' },
    { header: 'Pos. Rank', accessor: 'positional_rank', sortKey: 'positional_rank', classNameKey: 'Pos Rk' }, // Using 'Pos Rk' key from formatting.js
    { header: 'Tier', accessor: 'tier', sortKey: 'tier', classNameKey: 'Tier' },
  ];

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
        Players sorted by FantasyCalc Dynasty Superflex Value.
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