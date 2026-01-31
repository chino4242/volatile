// client/src/pages/FleaflickerRosterDisplay.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import './RosterDisplay.css'; // Import the shared CSS
import PlayerTable from '../components/PlayerTable';
import { usePlayerAnalysis } from '../hooks/usePlayerAnalysis';

function cleanseName(name) {
  if (typeof name !== 'string') return '';
  return name.replace(/[^\w\s']+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function FleaflickerRosterDisplay() {
  const { leagueId, rosterId } = useParams();

  const [basePlayers, setBasePlayers] = useState([]);
  const [ownerName, setOwnerName] = useState('');

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: 'fantasy_calc_value', direction: 'descending' });
  const [hoveredRow, setHoveredRow] = useState(null);

  // Hook for Python analysis
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
      // Step 1: Fetch the league data and FantasyCalc values concurrently
      const [leagueData, calcValuesResponse] = await Promise.all([
        get(`/api/fleaflicker/league/${currentLeagueId}/data`),
        get(`/api/values/fantasycalc?isDynasty=true&numQbs=1&ppr=0.5`)
      ]);

      const specificRosterFromServer = leagueData.rosters?.find(r => String(r.roster_id) === String(currentRosterId));

      if (!specificRosterFromServer) {
        throw new Error("Roster not found in this league.");
      }

      setOwnerName(specificRosterFromServer.owner_name || 'Unknown Owner');
      const playersOnRoster = specificRosterFromServer.players || [];

      // Step 2: Create a reliable lookup map from the complete master list.
      const masterPlayerMapByName = new Map();
      if (leagueData.master_player_list) {
        leagueData.master_player_list.forEach(player => {
          masterPlayerMapByName.set(cleanseName(player.full_name), player);
        });
      }

      // Step 3: Map FC values
      const fantasyCalcMap = new Map();
      if (calcValuesResponse && typeof calcValuesResponse === 'object') {
        Object.entries(calcValuesResponse).forEach(([cleansedNameKey, playerData]) => {
          if (playerData && typeof playerData.value !== 'undefined') {
            fantasyCalcMap.set(cleansedNameKey, playerData.value);
          }
        });
      }

      // Step 4: Prepare base roster with Sleeper IDs and FC Values
      const initialRoster = playersOnRoster.map(player => {
        const masterPlayer = masterPlayerMapByName.get(cleanseName(player.full_name));
        // If we find master player, we get sleeper_id
        const sleeperId = masterPlayer ? masterPlayer.sleeper_id : null;
        const tradeValue = fantasyCalcMap.get(cleanseName(player.full_name)) || 0;

        return {
          ...player,
          sleeper_id: sleeperId, // Critical for hook
          fantasy_calc_value: tradeValue
        };
      });

      setBasePlayers(initialRoster);

    } catch (e) {
      console.error("Failed to fetch page data:", e);
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
    { header: 'Position', accessor: 'position', classNameKey: 'Full Name' },
    { header: 'Team', accessor: 'team' },
    { header: 'Age', accessor: 'age' },
    { header: 'Trade Value', accessor: 'fantasy_calc_value', sortKey: 'fantasy_calc_value', isValueCell: true, classNameKey: 'Trade Value' },
    { header: 'Overall Rank', accessor: 'overall_rank', sortKey: 'overall_rank', classNameKey: 'Overall Rank' },
    { header: 'Pos. Rank', accessor: 'positional_rank', sortKey: 'positional_rank', classNameKey: 'Pos Rk' },
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
        Team: {ownerName} (Roster ID: {rosterId})
      </h2>
      <p>
        Players sorted by FantasyCalc Dynasty 1-QB Value.
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

export default FleaflickerRosterDisplay;
