// server/routes/rosterRoutes.js - MINIMAL TEST VERSION

const express = require('express');
const router = express.Router();

// A single, simple, guaranteed-correct route.
router.get('/test', (req, res) => {
    res.json({ message: 'Roster routes file is working!' });
});

module.exports = router;