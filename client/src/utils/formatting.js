// client/src/utils/formatting.js

/**
 * Returns a CSS class name based on the player and the specific column being rendered.
 * This logic is shared across the application to ensure consistent coloring conventions.
 * 
 * @param {Object} player - The enriched player object
 * @param {string} columnName - The name of the column (e.g., 'Trade Value', 'Pos Rk')
 * @returns {string} - The CSS class name to apply (e.g., 'elite', 'top-five')
 */
export function getCellClassName(player, columnName) {
    let dynamicClass = '';
    switch (columnName) {
        case 'Full Name':
            const position = player.position?.toLowerCase();
            if (['qb', 'rb', 'wr', 'te'].includes(position)) dynamicClass = position;
            break;
        case 'Pos Rk':
            const rank = player.positional_rank;
            if (!rank) break;
            if (rank <= 5) dynamicClass = 'top-five';
            else if (rank <= 10) dynamicClass = 'top-ten';
            else if (rank <= 20) dynamicClass = 'positive';
            break;
        case 'Trade Value':
            const value = player.fantasy_calc_value;
            if (!value) break;
            if (value >= 7000) dynamicClass = 'super-elite';
            else if (value >= 4000) dynamicClass = 'elite';
            else if (value >= 3000) dynamicClass = 'positive';
            else if (value >= 2000) dynamicClass = 'value-contributor';
            else if (value >= 1000) dynamicClass = 'neutral';
            break;
        case 'ZAP':
            const zap = player.zap_score;
            if (zap === null || zap === undefined) break;
            if (zap >= 95) dynamicClass = 'zap-elite';
            else if (zap >= 85) dynamicClass = 'zap-great';
            else if (zap >= 75) dynamicClass = 'zap-good';
            else if (zap >= 60) dynamicClass = 'zap-average';
            break;
        case 'Depth Score':
            const depth = player.depth_of_talent_score;
            if (depth === null || depth === undefined) break;
            if (depth >= 95) dynamicClass = 'depth-elite';
            else if (depth >= 88) dynamicClass = 'depth-starter';
            else if (depth >= 80) dynamicClass = 'depth-rotational';
            else if (depth >= 75) dynamicClass = 'depth-bench';
            else if (depth < 75) dynamicClass = 'depth-practice-squad';
            break;
        case 'Category':
            const category = player.category?.trim().toLowerCase();
            if (!category) break;
            if (category === 'elite producer') dynamicClass = 'category-elite';
            else if (category === 'weekly starter') dynamicClass = 'category-starter';
            else if (category === 'flex play') dynamicClass = 'category-flex';
            else if (category === 'benchwarmer') dynamicClass = 'category-bench';
            break;

        // Fleaflicker Specific Columns (Safe to keep here, valid for all if data present)
        case 'Redraft Rank':
            const redraftRank = player.redraft_overall_rank;
            if (!redraftRank) break;
            if (redraftRank <= 24) dynamicClass = 'redraft-top-tier';
            else if (redraftRank <= 60) dynamicClass = 'redraft-strong-starter';
            break;
        case 'Redraft Pos Rank':
            const redraftPosRank = player.redraft_pos_rank;
            if (!redraftPosRank) break;
            if (redraftPosRank <= 12) dynamicClass = 'redraft-top-tier';
            else if (redraftPosRank <= 24) dynamicClass = 'redraft-strong-starter';
            break;
        case 'Redraft Auction $':
            // Note: Ensure caller parses value if string
            // We can handle string parsing generically here if needed, 
            // but for now relying on pre-parsed or loose check.
            // (Original code used a helper parseAuctionValue).
            // Since we don't have that helper imported here, we assume numeric value or let it fail gently.
            // Or we add parsing logic:
            let auctionValue = player.redraft_auction_value;
            if (typeof auctionValue === 'string') auctionValue = Number(auctionValue.replace(/[^0-9.-]+/g, ""));

            if (!auctionValue) break;
            if (auctionValue >= 40) dynamicClass = 'auction-elite';
            else if (auctionValue >= 20) dynamicClass = 'auction-premium';
            else if (auctionValue >= 10) dynamicClass = 'auction-starter';
            else if (auctionValue >= 1) dynamicClass = 'auction-bargain';
            break;
        default:
            break;
    }
    return dynamicClass;
}
