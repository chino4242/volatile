const express = require('express');
const router = express.Router();
const { getFantasyCalcValues } = require('../services/fantasyCalcService');

router.get('/values/fantasycalc', async (req, res) => {
  // --- Start of High-Detail Logging ---
  console.log("--- ROUTE LOG: Entering /api/values/fantasycalc route...");

  try {
    const isDynasty = req.query.isDynasty;
    const numQbs = req.query.numQbs;
    const ppr = req.query.ppr;

    console.log(`--- ROUTE LOG: Params received: isDynasty=${isDynasty}, numQbs=${numQbs}, ppr=${ppr}`);
    console.log("--- ROUTE LOG: Calling getFantasyCalcValues service...");

    // The call to the service which makes the external API call
    const valuesObject = await getFantasyCalcValues(isDynasty, numQbs, ppr);

    console.log(`--- ROUTE LOG: Service returned successfully. Object has ${Object.keys(valuesObject).length} keys.`);
    
    // If we get here, everything worked. Send the response.
    res.json(valuesObject);

  } catch (error) {
    // If ANY of the above steps fail, this block will execute.
    // This is the most important log we need to see.
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! CRITICAL ERROR in /values/fantasycalc route !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("Error Message:", error.message);
    console.error("Error Type:", error.name);
    console.error("Full Error Object:", error); // Log the entire error object
    
    res.status(500).json({ 
        error: 'An internal server error occurred while fetching FantasyCalc values.',
        errorMessage: error.message 
    });
  }
});

module.exports = router;