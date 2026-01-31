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
            else if (value >= 1000) dynamicClass = 'trade-neutral'; // Changed from 'neutral' to avoid global collision
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

        case 'Tier':
        case 'one_qb_tier':
            // Tier Logic: 1 (Gold), 2 (Silver), 3 (Bronze), 4+ (Neutral)
            const tier = player[columnName === 'Tier' ? 'tier' : 'one_qb_tier'];
            if (!tier) break;
            if (tier === 1) dynamicClass = 'tier-gold';
            else if (tier === 2) dynamicClass = 'tier-silver';
            else if (tier === 3) dynamicClass = 'tier-bronze';
            else dynamicClass = 'tier-neutral';
            break;

        case 'Overall Rank':
        case '1QB Rank': // Handle both standard and 1QB rank headers
            // Rank Logic: Top 12 (Elite/Green), Top 24 (Good/Light Green), Top 50 (Decent)
            // Need to determine which rank field to use based on the header or context
            // Ideally the caller passes the correct value, but getCellClassName takes (player, columnName)
            // In GenericRosterDisplay, classNameKey is passed.

            // We'll trust the caller to pass the right key or we derive it.
            // Actually, GenericRosterDisplay passes 'Overall Rank' as key for both depending on toggle?
            // Let's check GenericRosterDisplay again.
            // It sends classNameKey: 'Overall Rank' even if it is 1QB.
            // But we need the actual VALUE to judge. 
            // In PlayerTable, it passes `player[column.accessor]` as the value to render, 
            // BUT getCellClassName receives the WHOLE `player` object.

            // To be safe, we should assume the player object has the relevant rank fields.
            // We will check both or prefer one if available.

            let rankVal = player.overall_rank;
            // If the column is explicitly 1QB Rank, we might want that. 
            // However, typically the 'current' rank is what matters.
            // Let's try to be smart: if one_qb_rank is low and overall is high, maybe we are in 1QB mode?
            // Actually, formatting.js shouldn't guess mode.
            // Simplest approach: Highlight if ANY major rank is top tier?
            // Or look for specific props.

            // Let's just check the value passed in via the column accessor? 
            // PlayerTable calls: `getCellClassName(player, column.classNameKey)`
            // It doesn't pass the specific value. This is a limitation of getCellClassName signature.

            // Fix: We'll check the most likely rank properties.
            const r1 = player.overall_rank;
            const r2 = player.one_qb_rank;

            // If it's a small number (better rank), treat it as relevant.
            const bestRank = (r1 && r2) ? Math.min(r1, r2) : (r1 || r2);

            if (!bestRank) break;

            if (bestRank <= 12) dynamicClass = 'rank-starter-elite';       // Top 12 (Bold Dark Green)
            else if (bestRank <= 24) dynamicClass = 'rank-starter-strong'; // Top 24 (Bold Medium Green)
            else if (bestRank <= 36) dynamicClass = 'rank-starter';        // Top 36 (Green)
            else if (bestRank <= 50) dynamicClass = 'rank-flex';           // Top 50 (Light Green)
            else if (bestRank <= 75) dynamicClass = 'rank-depth';          // Top 75 (Pale Green)
            else if (bestRank <= 100) dynamicClass = 'rank-roster';        // Top 100 (Yellow-Green)
            else if (bestRank <= 125) dynamicClass = 'rank-fringe';        // Top 125 (Pale Yellow)
            else if (bestRank <= 150) dynamicClass = 'rank-deep';          // Top 150 (Pale Orange/Beige)
            else if (bestRank <= 200) dynamicClass = 'rank-sub';           // Top 200 (Off-white/Gray)
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
