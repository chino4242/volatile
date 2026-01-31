// client/src/pages/FreeAgentsPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles';
import './FleaflickerFreeAgentsPage.css'; // Shared CSS
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

function FreeAgentsPage() {
  const { leagueId } = useParams();

  const [enrichedFreeAgents, setEnrichedFreeAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fantasy_calc_value', direction: 'descending' });

  const fetchData = useCallback(async (currentLeagueId) => {
    if (!currentLeagueId) {
      setError("A League ID is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const freeAgentsData = await get(`/api/sleeper/league/${currentLeagueId}/free-agents`);

      const playerIds = freeAgentsData.map(p => p.player_id);
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

      const finalFreeAgents = freeAgentsData.map(player => {
        const analysis = analysisDataMap.get(String(player.player_id));
        return { ...player, ...analysis };
      });

      const skillPositions = ['QB', 'WR', 'RB', 'TE'];
      const filtered = finalFreeAgents
        .filter(p => skillPositions.includes(p.position) && p.fantasy_calc_value > 0);

      setEnrichedFreeAgents(filtered);

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

  // Sorting Logic (Standardized)
  const sortedFreeAgents = useMemo(() => {
    let sortableItems = [...enrichedFreeAgents];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

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
      direction = ['rank', 'overall_rank', 'positional_rank', 'rsp_pos_rank'].includes(key)
        ? 'ascending'
        : 'descending';
    }
    setSortConfig({ key, direction });
  };


  const wrappingCellStyle = {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: '250px',
    minWidth: '120px'
  };

  const columns = [
    { header: 'Full Name', accessor: 'full_name', classNameKey: 'Full Name' },
    { header: 'Pos', accessor: 'position' },
    { header: 'Team', accessor: 'team' },
    { header: 'Age', accessor: 'age' },
    { header: 'Trade Value', accessor: 'fantasy_calc_value', sortKey: 'fantasy_calc_value', isValueCell: true, classNameKey: 'Trade Value' },
    { header: 'Overall Rk', accessor: 'overall_rank', sortKey: 'overall_rank' },
    { header: 'Pos Rk', accessor: 'positional_rank', sortKey: 'positional_rank', classNameKey: 'Pos Rk' },
    { header: 'Tier', accessor: 'tier', sortKey: 'tier' },
    { header: 'ZAP', accessor: 'zap_score', sortKey: 'zap_score', classNameKey: 'ZAP' },
    { header: 'Depth Score', accessor: 'depth_of_talent_score', sortKey: 'depth_of_talent_score', classNameKey: 'Depth Score' },
    { header: 'Comp Spectrum', accessor: 'comparison_spectrum', style: wrappingCellStyle },
    { header: 'Category', accessor: 'category', classNameKey: 'Category', style: wrappingCellStyle },
    { header: 'Draft Delta', accessor: 'draft_capital_delta', style: wrappingCellStyle },
    { header: 'RSP Pos Rk', accessor: 'rsp_pos_rank', sortKey: 'rsp_pos_rank' },
    { header: 'RSP 23-25', accessor: 'rsp_2023_2025_rank' },
    { header: 'RP 21-25', accessor: 'rp_2021_2025_rank' },
    {
      header: 'Notes',
      render: (player) => (
        (player.notes_lrqb || player.notes_rsp || player.depth_of_talent_desc) && (
          <button
            onClick={() => setModalContent({
              title: `${player.full_name} - Analysis Notes`,
              body: `LRQB Notes:\n${player.notes_lrqb || 'N/A'}\n\n---\n\nRSP Notes:\n${player.notes_rsp || 'N/A'}\n\n---\n\nDepth of Talent Description:\n${player.depth_of_talent_desc || 'N/A'}`
            })}
            style={styles.notesButton}
          >
            View
          </button>
        )
      )
    },
    {
      header: 'AI Analysis',
      render: (player) => (
        player.gemini_analysis && (
          <button
            onClick={() => setModalContent({
              title: `${player.full_name} - AI Analysis`,
              body: player.gemini_analysis
            })}
            style={styles.notesButton}
          >
            View
          </button>
        )
      )
    }
  ];

  if (loading) return <div style={styles.pageContainer}>Loading free agents and analysis...</div>;
  if (error) return <div style={{ ...styles.pageContainer, ...styles.errorText }}>Error: {error}</div>;

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.h1}>Top Sleeper Free Agents</h1>
      <p style={styles.p}>Found {enrichedFreeAgents.length} relevant players for league {leagueId}, sorted by trade value.</p>

      <PlayerTable
        players={sortedFreeAgents}
        columns={columns}
        sortConfig={sortConfig}
        onSort={requestSort}
        onRowHover={setHoveredRow}
        hoveredRowId={hoveredRow}
      />

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

export default FreeAgentsPage;
