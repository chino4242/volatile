// client/src/pages/FleaflickerFreeAgentsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/apiService';
import { styles } from '../styles';
import './DraftTrackerPage.css';

// --- NEW: Import TanStack Table hooks ---
import { 
    useReactTable, 
    getCoreRowModel, 
    getSortedRowModel,
    flexRender 
} from '@tanstack/react-table';

const PYTHON_API_BASE_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:5002';

// Reusable Modal component remains the same
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
    
    // --- State for TanStack Table ---
    const [sorting, setSorting] = useState([{ id: 'fantasy_calc_value', desc: true }]);
    const [rowSelection, setRowSelection] = useState({});

    // Data fetching logic remains mostly the same
    const fetchData = useCallback(async (currentLeagueId) => {
        if (!currentLeagueId) {
            setError("A Fleaflicker League ID is required.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try { 
            const [fleaflickerData, fantasyCalcValues, pythonAnalysisData] = await Promise.all([
              get(`/api/fleaflicker/league/${currentLeagueId}/data`),
              get(`/api/values/fantasycalc?isDynasty=true&numQbs=1&ppr=0.5`),
              fetch(`${PYTHON_API_BASE_URL}/api/enriched-players`).then(res => {
                if (!res.ok) throw new Error(`Python API error: ${res.status}`);
                return res.json();
              })
            ]);
            
            // Step 1: Determine the actual free agents from live league data
            const rosteredPlayerNames = new Set();
            if (fleaflickerData && fleaflickerData.rosters) {
                fleaflickerData.rosters.forEach(roster => {
                    roster.players.forEach(player => rosteredPlayerNames.add(cleanseName(player.full_name)))
                });
            }
            const masterPlayerList = fleaflickerData.master_player_list || [];
            const actualFreeAgents = masterPlayerList.filter(p => !rosteredPlayerNames.has(cleanseName(p.full_name)));
            
            // Step 2: Create lookup maps for your analysis data
            const pythonAnalysisMap = new Map();
            if (Array.isArray(pythonAnalysisData)) {
                pythonAnalysisData.forEach(player => {
                    pythonAnalysisMap.set(cleanseName(player.player_name_original), player);
                });
            }

            const fantasyCalcValuesMap = new Map();
            if (fantasyCalcValues && typeof fantasyCalcValues === 'object') {
                Object.entries(fantasyCalcValues).forEach(([name, data]) => {
                    fantasyCalcValuesMap.set(name, data.value);
                });
            }

            // --- THIS IS THE FIX ---
            // Step 3: Iterate over the CORRECT list (actualFreeAgents) and enrich them.
            const finalFreeAgents = actualFreeAgents
                .map(player => {
                    const cleansedName = cleanseName(player.full_name);
                    const analysisData = pythonAnalysisMap.get(cleansedName) || {};
                    const tradeValue = fantasyCalcValuesMap.get(cleansedName) || 0;
                    
                    return { 
                        ...player,        // Start with base info from Fleaflicker (name, fleaflicker_id, etc.)
                        ...analysisData,  // Add all the rich analysis from Python
                        fantasy_calc_value: tradeValue, // Add the correct trade value
                        full_name: player.full_name // Ensure original name isn't overwritten
                    };
                })
                .filter(p => {
                    const skillPositions = ['QB', 'WR', 'RB', 'TE'];
                    const isSkillPlayer = skillPositions.includes(p.position);
                    // Filter for players who have a trade value, so the list is more relevant
                    return isSkillPlayer && p.fantasy_calc_value > 0;
                });
            
            setEnrichedFreeAgents(finalFreeAgents);
      
          } catch (e) {
            console.error("Failed to fetch Fleaflicker page data:", e);
            setError(e.message);
          } finally {
            setLoading(false);
          }
    }, []);

    useEffect(() => {
        // Use a default league ID for easier testing if none is in the URL
        const currentLeagueId = leagueId || '197269'; 
        fetchData(currentLeagueId);
    }, [leagueId, fetchData]);

    // --- Define columns for TanStack Table ---
    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    {...{
                        checked: table.getIsAllRowsSelected(),
                        indeterminate: table.getIsSomeRowsSelected(),
                        onChange: table.getToggleAllRowsSelectedHandler(),
                    }}
                />
            ),
            cell: ({ row }) => (
                <div style={{textAlign: 'center'}}>
                    <input
                        type="checkbox"
                        {...{
                            checked: row.getIsSelected(),
                            disabled: !row.getCanSelect(),
                            indeterminate: row.getIsSomeSelected(),
                            onChange: row.getToggleSelectedHandler(),
                        }}
                    />
                </div>
            ),
        },
        { accessorKey: 'full_name', header: 'Full Name' },
        { accessorKey: 'position', header: 'Pos' },
        { accessorKey: 'team', header: 'Team' },
        { accessorKey: 'age', header: 'Age' },
        { accessorKey: 'fantasy_calc_value', header: 'Trade Value', cell: info => <strong>{info.getValue()}</strong> },
        { accessorKey: 'overall_rank', header: 'Overall Rk' },
        { accessorKey: 'positional_rank', header: 'Pos Rk' },
        { accessorKey: 'tier', header: 'Tier' },
        { accessorKey: 'zap_score', header: 'ZAP' },
        { accessorKey: 'depth_of_talent_score', header: 'Depth Score' },
        {
            accessorKey: 'comparison_spectrum',
            header: 'Comp Spectrum',
            cell: info => <div style={{ minWidth: '300px', whiteSpace: 'normal' }}>{info.getValue() || 'N/A'}</div>
        },
        { accessorKey: 'category', header: 'Category' },
        { accessorKey: 'draft_capital_delta', header: 'Draft Delta' },
        { accessorKey: 'rsp_pos_rank', header: 'RSP Pos Rk' },
        { accessorKey: 'rsp_2023_2025_rank', header: 'RSP 23-25' },
        { accessorKey: 'rp_2021_2025_rank', header: 'RP 21-25' },
        {
            id: 'notes',
            header: 'Notes',
            cell: ({ row }) => {
                const { original: player } = row;
                return (player.notes_lrqb || player.notes_rsp || player.depth_of_talent_desc) && (
                    <button style={styles.notesButton} onClick={() => setModalContent({
                        title: `${player.full_name} - Analysis Notes`,
                        body: `LRQB Notes:\n${player.notes_lrqb || 'N/A'}\n\n---\n\nRSP Notes:\n${player.notes_rsp || 'N/A'}\n\n---\n\nDepth of Talent Description:\n${player.depth_of_talent_desc || 'N/A'}`
                    })}>View</button>
                );
            }
        },
        {
            id: 'aiAnalysis',
            header: 'AI Analysis',
            cell: ({ row }) => {
                const { original: player } = row;
                return player.gemini_analysis ? (
                    <button style={styles.notesButton} onClick={() => setModalContent({
                        title: `${player.full_name} - AI Analysis`,
                        body: player.gemini_analysis
                    })}>View</button>
                ) : <span style={{color: '#999'}}>N/A</span>;
            }
        }
    ], []);

    // --- Create the table instance with the hook ---
    const table = useReactTable({
        data: enrichedFreeAgents,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: true,
        getRowId: row => row.fleaflicker_id || row.player_name_original, // Use a unique ID for selection
    });

    if (loading) return <div style={styles.pageContainer}>Loading free agents and analysis...</div>;
    if (error) return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>;

    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.h1}>Fleaflicker Draft Tracker</h1>
            <p style={styles.p}>Found {table.getRowModel().rows.length} relevant free agents for league {leagueId || 'default'}.</p>
      
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} colSpan={header.colSpan} style={{...styles.th, cursor: header.column.getCanSort() ? 'pointer' : 'default'}}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <div>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {{ asc: ' ▲', desc: ' ▼'}[header.column.getIsSorted()] ?? null}
                                            </div>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className={row.getIsSelected() ? 'selected-row' : ''}
                                onMouseEnter={() => setHoveredRow(row.id)}
                                onMouseLeave={() => setHoveredRow(null)}
                                style={hoveredRow === row.id ? styles.trHover : {}}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} style={{...styles.td, ...(cell.column.id === 'comparison_spectrum' ? {minWidth: '300px', whiteSpace: 'normal'} : {})}}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {modalContent && (
                <Modal 
                    content={<>
                        <h2 style={styles.h2}>{modalContent.title}</h2>
                        <div style={styles.modalBody}>{modalContent.body}</div>
                    </>} 
                    onClose={() => setModalContent(null)} 
                />
            )}
        </div>
    );
}

export default FleaflickerFreeAgentsPage;
