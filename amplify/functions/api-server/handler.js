const serverlessExpress = require('@vendia/serverless-express');

// Import server code directly - will be in same directory after bundling
const express = require('express');
const cors = require('cors');

// Import route files
const sleeperRosterRoutes = require('./routes/sleeperRosterRoutes');
const sleeperFreeAgentRoutes = require('./routes/sleeperFreeAgentRoutes');
const sleeperLeagueRoutes = require('./routes/sleeperLeagueRoutes');
const fantasyCalcRoutes = require('./routes/fantasyCalcRoutes');
const fleaflickerRoutes = require('./routes/fleaflickerRosterRoutes');
const adminRoutes = require('./routes/adminRoutes');
const enrichedPlayerRoutes = require('./routes/enrichedPlayerRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is healthy and ready to serve requests.' });
});

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/sleeper', [sleeperRosterRoutes, sleeperFreeAgentRoutes, sleeperLeagueRoutes]);
app.use('/api/fleaflicker', fleaflickerRoutes);
app.use('/api', fantasyCalcRoutes);
app.use('/api/enriched-players', enrichedPlayerRoutes);

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Welcome to the brains behind Volatile Creative - API Speaking!' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: 'Route not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        status: err.status || 500,
        message: process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message
    });
});

let cachedServer;

const handler = async (event, context) => {
  if (!cachedServer) {
    cachedServer = serverlessExpress({ app });
  }
  return cachedServer(event, context);
};

module.exports = { handler };
