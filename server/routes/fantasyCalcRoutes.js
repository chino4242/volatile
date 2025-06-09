// server/routes/fantasyCalcRoutes.js
const express = require('express');
const { getFantasyCalcValues } = require('../services/fantasyCalcService');
const router = express.Router();

// GET player trade values from FantasyCalc
// This will be accessible at /api/values/fantasycalc
router.get('/values/fantasycalc', async (req, res) => {
    try {
        // Parse query params from the URL, with defaults
        const isDynasty = req.query.isDynasty !== 'false'; // Defaults to true
        const numQbs = req.query.numQbs === '1' ? 1 : 2;     // Defaults to 2 (Superflex)
        const ppr = parseFloat(req.query.ppr) || 1;         // Defaults to 1 (Full PPR)

        console.log(`FantasyCalc route hit with params: isDynasty=${isDynasty}, numQbs=${numQbs}, ppr=${ppr}`);

        const playerValueMap = await getFantasyCalcValues(isDynasty, numQbs, ppr);
        
        // Convert the Map to a plain object because JSON doesn't have a Map type.
        const playerValueObject = Object.fromEntries(playerValueMap);

        res.json(playerValueObject);
    } catch (error) {
        console.error(`Route error for /values/fantasycalc:`, error);
        const status = error.status || 500;
        res.status(status).json({ error: error.message || "Failed to fetch FantasyCalc values." , data: error.data });
    }
});

// This line is essential. It exports the router so server.js can use it.
module.exports = router;
