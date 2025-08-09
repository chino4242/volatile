// client/src/pages/FleaflickerFreeAgentsPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { styles } from '../styles';
import './DraftTrackerPage.css';

// --- Import TanStack Table hooks ---
import { 
    useReactTable, 
    getCoreRowModel, 
    getSortedRowModel,
    flexRender 
} from '@tanstack/react-table';

// Reusable Modal component
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

// Create a dedicated component for the indeterminate checkbox
function IndeterminateCheckbox({ indeterminate, ...rest }) {
    const ref = useRef(null);
  
    useEffect(() => {
      if (typeof indeterminate === 'boolean' && ref.current) {
        ref.current.indeterminate = indeterminate;
      }
    }, [ref, indeterminate]);
  
    return <input type="checkbox" ref={ref} {...rest} />;
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

    // --- Simplified data fetching logic ---
    const fetchData = useCallback(async (currentLeagueId) => {
        if (!currentLeagueId) {
            setError("A Fleaflicker League ID is required.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try { 
            // Use fetch() directly to avoid issues with the underlying apiService.
            const apiUrl = `http://localhost:5000/api/fleaflicker/league/${currentLeagueId}/data`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            
            const leagueData = await response.json();
            // --- RE-ADDED DEBUG LOGGING ---
            console.log('[DEBUG] Received leagueData from server:', leagueData);
            
            // Step 2: Determine who is rostered using their unique Fleaflicker ID
            const rosteredPlayerIds = new Set();
            if (leagueData && Array.isArray(leagueData.rosters)) {
                leagueData.rosters.forEach(roster => {
                    if (roster && Array.isArray(roster.players)) {
                        roster.players.forEach(player => {
                            if (player && player.proPlayer && player.proPlayer.id) {
                                rosteredPlayerIds.add(player.proPlayer.id);
                            }
                        });
                    }
                });
            }
            // --- RE-ADDED DEBUG LOGGING ---
            console.log(`[DEBUG] Found ${rosteredPlayerIds.size} rostered players. Sample IDs:`, Array.from(rosteredPlayerIds).slice(0, 10));


            // Step 3: Filter the enriched master list to find free agents using the correct ID
            const masterList = leagueData.enriched_master_list || [];
            const actualFreeAgents = masterList.filter(player => 
                player && !rosteredPlayerIds.has(player.fleaflicker_id)
            );
            // --- RE-ADDED DEBUG LOGGING ---
            console.log(`[DEBUG] Found ${actualFreeAgents.length} players in master list who are not on a roster.`);

            
            // Step 4: Apply final client-side filter for relevance
            const finalFreeAgents = actualFreeAgents.filter(p => {
                const skillPositions = ['QB', 'WR', 'RB', 'TE'];
                const isSkillPlayer = p && skillPositions.includes(p.position);
                return isSkillPlayer && p.fantasy_calc_value > 0;
            });
            // --- RE-ADDED DEBUG LOGGING ---
            console.log(`[DEBUG] Found ${finalFreeAgents.length} relevant free agents after final filtering.`);

            
            setEnrichedFreeAgents(finalFreeAgents);
      
          } catch (e) {
            console.error("Failed to fetch Fleaflicker page data:", e);
            setError(e.message);
          } finally {
            setLoading(false);
          }
    }, []);

    useEffect(() => {
        const currentLeagueId = leagueId || '197269'; 
        fetchData(currentLeagueId);
    }, [leagueId, fetchData]);

    // --- Define columns for TanStack Table ---
    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <IndeterminateCheckbox
                    checked={table.getIsAllRowsSelected()}
                    indeterminate={table.getIsSomeRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row }) => (
                <div style={{textAlign: 'center'}}>
                    <IndeterminateCheckbox
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        indeterminate={row.getIsSomeSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                </div>
            ),
        },
        { accessorKey: 'full_name', header: 'Full Name' },
        { accessorKey: 'position', header: 'Pos' },
        { accessorKey: 'team', header: 'Team' },
        { accessorKey: 'age', header: 'Age' },
        { accessorKey: 'fantasy_calc_value', header: 'Trade Value', cell: info => <strong>{info.getValue()}</strong> },
        { accessorKey: 'overall_rank', header: 'Dynasty Rk' },
        { accessorKey: 'sf_redraft_rank', header: 'SF Redraft Rk' },
        { accessorKey: 'redraft_rank', header: '1QB Redraft Rk' },
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
        { accessorKey: 'rsp_pos_rank', header: 'RSP Pos Rk' },
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

    const table = useReactTable({
        data: enrichedFreeAgents,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: true,
        getRowId: row => row.fleaflicker_id,
    });

    if (loading) return <div style={styles.pageContainer}>Loading free agents and analysis...</div>;
    if (error) return <div style={{...styles.pageContainer, ...styles.errorText}}>Error: {error}</div>;

    return (
        <div style={styles.pageContainer}>
            <h1 style={styles.h1}>Fleaflicker Free Agents</h1>
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
