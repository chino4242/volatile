// client/src/components/PlayerTable.jsx
import React, { useState } from 'react';
import { styles } from '../styles';
import { getCellClassName } from '../utils/formatting';

const SortableHeader = ({ children, columnKey, sortConfig, onSort }) => {
    const isSorted = sortConfig && sortConfig.key === columnKey;
    const sortIcon = isSorted ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : '';
    const handleClick = () => onSort && onSort(columnKey);

    // Only add pointer cursor and click handler if onSort is provided
    const style = onSort ? { ...styles.th, cursor: 'pointer' } : styles.th;
    // Add hover effect via class if needed, but styles.th handles basic

    return (
        <th style={style} onClick={handleClick} className={onSort ? "sortable-header" : ""}>
            {children}{sortIcon}
        </th>
    );
};

/**
 * Reusable Player Table Component
 * @param {Object} props
 * @param {Array} props.players - List of player objects
 * @param {Array} props.columns - Column definitions
 * @param {Object} props.sortConfig - { key, direction }
 * @param {Function} props.onSort - keys => void
 * @param {Object} props.selection - { selectedIds: Set, onSelect: id=>void, onSelectAll: e=>void } (optional)
 * @param {Function} props.onRowHover - id => void (optional)
 * @param {string|number} props.hoveredRowId - currently hovered row id (optional)
 */
const PlayerTable = ({
    players,
    columns,
    sortConfig,
    onSort,
    selection,
    onRowHover,
    hoveredRowId
}) => {

    return (
        <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        {selection && (
                            <th style={styles.th}>
                                <input
                                    type="checkbox"
                                    onChange={selection.onSelectAll}
                                    checked={players.length > 0 && selection.selectedIds.size === players.length}
                                    aria-label="Select all players"
                                />
                            </th>
                        )}
                        {columns.map((col, index) => {
                            if (col.sortKey) {
                                return (
                                    <SortableHeader
                                        key={index}
                                        columnKey={col.sortKey}
                                        sortConfig={sortConfig}
                                        onSort={onSort}
                                    >
                                        {col.header}
                                    </SortableHeader>
                                );
                            }
                            return (
                                <th key={index} style={{ ...styles.th, ...(col.style || {}) }}>
                                    {col.header}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {players.map((player) => {
                        // Use player_id or sleeper_id or id as key
                        const playerId = player.sleeper_id || player.player_id || player.id;

                        const isChecked = selection ? selection.selectedIds.has(playerId) : false;
                        const isHovered = hoveredRowId === playerId;

                        // Row styling
                        const rowStyle = isChecked ? {} : (isHovered ? styles.trHover : {});
                        const rowClass = isChecked ? 'selected' : '';

                        return (
                            <tr
                                key={playerId}
                                onMouseEnter={() => onRowHover && onRowHover(playerId)}
                                onMouseLeave={() => onRowHover && onRowHover(null)}
                                style={rowStyle}
                                className={rowClass}
                            >
                                {selection && (
                                    <td style={styles.td}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => selection.onSelect(playerId)}
                                            aria-label={`Select ${player.full_name}`}
                                        />
                                    </td>
                                )}
                                {columns.map((col, index) => {
                                    // Determine cell content
                                    let content = null;
                                    if (col.render) {
                                        content = col.render(player);
                                    } else if (typeof col.accessor === 'function') {
                                        content = col.accessor(player);
                                    } else {
                                        content = player[col.accessor];
                                    }

                                    // Handle missing values gracefully
                                    if (content === undefined || content === null) {
                                        // Show "Unranked" for ranking/tier fields
                                        const rankingFields = ['overall_rank', 'one_qb_rank', 'positional_rank', 'tier', 'one_qb_tier', 'redraft_overall_rank', 'redraft_tier'];
                                        if (rankingFields.includes(col.accessor)) {
                                            content = 'Unranked';
                                        } else {
                                            content = (col.defaultValue !== undefined) ? col.defaultValue : 'N/A';
                                        }
                                        if (content === 'N/A' && col.accessor === 'position') content = ''; // e.g.
                                    }

                                    // Determine styling
                                    // Merge base style, col style, and valueCell style
                                    let cellStyle = { ...styles.td, ...(col.style || {}) };
                                    if (col.isValueCell) {
                                        cellStyle = { ...cellStyle, ...styles.valueCell };
                                    }

                                    // Determine CSS class
                                    const className = col.classNameKey ? getCellClassName(player, col.classNameKey) : '';

                                    return (
                                        <td key={index} style={cellStyle} className={className}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default PlayerTable;
