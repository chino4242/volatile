// client/src/api/sleeper.js
import { get } from './apiService';

/**
 * Fetch free agents for a Sleeper league.
 * @param {string} leagueId 
 * @returns {Promise<Array>} List of players
 */
export const getSleeperFreeAgents = (leagueId) => {
    return get(`/api/sleeper/league/${leagueId}/free-agents`);
};

/**
 * Fetch a specific roster from a Sleeper league.
 * @param {string} leagueId 
 * @param {string} rosterId 
 * @returns {Promise<Object>} Roster object
 */
export const getSleeperRoster = (leagueId, rosterId) => {
    return get(`/api/sleeper/league/${leagueId}/roster/${rosterId}`);
};
