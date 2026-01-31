// client/src/api/fantasyCalc.js
import { get } from './apiService';

/**
 * Fetch FantasyCalc player values.
 * @param {Object} options
 * @param {boolean} [options.isDynasty=true]
 * @param {number} [options.numQbs=2] - Usually 1 or 2
 * @param {number} [options.ppr=0.5]
 * @returns {Promise<Object>} Map of player values
 */
export const getFantasyCalcValues = ({ isDynasty = true, numQbs = 2, ppr = 0.5 } = {}) => {
    const query = new URLSearchParams({
        isDynasty: isDynasty.toString(),
        numQbs: numQbs.toString(),
        ppr: ppr.toString()
    });
    return get(`/api/values/fantasycalc?${query.toString()}`);
};
