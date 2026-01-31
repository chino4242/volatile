// client/src/api/fleaflicker.js
import { get } from './apiService';

/**
 * Fetch all league data (rosters, master player list) for a Fleaflicker league.
 * @param {string} leagueId 
 * @returns {Promise<Object>} League data object including 'rosters' and 'master_player_list'
 */
export const getFleaflickerLeagueData = (leagueId) => {
    return get(`/api/fleaflicker/league/${leagueId}/data`);
};
