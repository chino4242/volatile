import { getSleeperRoster, getSleeperLeague } from './sleeper';
import { getFleaflickerLeagueData, getFleaflickerLeagueSettings } from './fleaflicker';

/**
 * Normalizes roster data from specific platforms (Sleeper, Fleaflicker) into a generic format.
 * 
 * @param {string} platform 'sleeper' | 'fleaflicker'
 * @param {string} leagueId 
 * @param {string} rosterId 
 * @returns {Promise<Object>} normalizedData
 */
export async function fetchRosterData(platform, leagueId, rosterId) {
    if (platform === 'sleeper') {
        const [leagueInfo, rosterData] = await Promise.all([
            getSleeperLeague(leagueId),
            getSleeperRoster(leagueId, rosterId)
        ]);

        // Determine format
        const rosterPositions = leagueInfo.roster_positions || [];
        const qbCount = rosterPositions.filter(p => p === 'QB').length;
        const sfCount = rosterPositions.filter(p => p === 'SUPER_FLEX').length;

        const is1QB = (qbCount === 1 && sfCount === 0);
        const isRedraft = (leagueInfo.settings?.type === 0);

        return {
            managerName: rosterData.manager_display_name || 'Unknown Owner',
            rosterId: String(rosterData.roster_id),
            players: (rosterData.players || []).map(p => ({
                ...p,
                // Ensure name is clean? Component usually handles cleansing or hook does.
                // But hook needs sleeper_id or player_id. Sleeper players have it.
            })),
            leagueFormat: isRedraft ? 'Redraft' : (is1QB ? '1QB' : 'SF'),
            fcSettings: {
                isDynasty: !isRedraft,
                numQbs: is1QB ? 1 : 2
            }
        };

    } else if (platform === 'fleaflicker') {
        // Fetch Data (Rosters) + Rules (Settings)
        const [leagueData, rulesData] = await Promise.all([
            getFleaflickerLeagueData(leagueId), // returns { rosters: [], master_player_list: [] }
            getFleaflickerLeagueSettings(leagueId) // returns { qbCount, sfCount, settings: { type: 2 } }
        ]);

        const specificRoster = leagueData.rosters?.find(r => String(r.roster_id) === String(rosterId));
        if (!specificRoster) throw new Error("Roster not found.");

        // Normalize Players
        // We need to map Fleaflicker players to Sleeper IDs using master_player_list if possible
        // The master_player_list is returned by getFleaflickerLeagueData
        const masterMap = new Map();
        if (leagueData.master_player_list) {
            leagueData.master_player_list.forEach(p => {
                // cleanse name for matching
                const clean = p.full_name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
                masterMap.set(clean, p);
            });
        }
        console.log(`[Adapter] Master Map Size: ${masterMap.size}`);

        const normalizedPlayers = (specificRoster.players || []).map(p => {
            const clean = (p.full_name || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
            const master = masterMap.get(clean);
            if (!master) console.log(`[Adapter] No match for: ${clean} (Orig: ${p.full_name})`);
            return {
                ...p, // keeps full_name, position, etc
                sleeper_id: master ? master.sleeper_id : null,
                // Component expects 'full_name'
            };
        });

        const is1QB = (rulesData.qbCount === 1 && rulesData.sfCount === 0);
        const isRedraft = (rulesData.settings?.type === 0);

        return {
            managerName: specificRoster.owner_name || 'Unknown Team',
            rosterId: String(specificRoster.roster_id),
            players: normalizedPlayers,
            leagueFormat: isRedraft ? 'Redraft' : (is1QB ? '1QB' : 'SF'),
            fcSettings: {
                isDynasty: !isRedraft,
                numQbs: is1QB ? 1 : 2
            }
        };

    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }
}
