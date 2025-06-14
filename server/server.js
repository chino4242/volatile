// server/server.js

// Keep these error handlers at the top
process.on('unhandledRejection', (reason, promise) => {
    console.error('SERVER CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('SERVER CRITICAL ERROR: Uncaught Exception:', error);
    process.exit(1);
});

const express = require('express');
const cors = require('cors');

// --- 1. Import all your route files ---
const sleeperRosterRoutes = require('./routes/sleeperRosterRoutes');
const sleeperFreeAgentRoutes = require('./routes/sleeperFreeAgentRoutes');
const sleeperLeagueRoutes = require('./routes/sleeperLeagueRoutes');
const fantasyCalcRoutes = require('./routes/fantasyCalcRoutes');
const fleaflickerRoutes = require('./routes/fleaflickerRosterRoutes'); // <<< ADD THIS IMPORT

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// --- 2. Use all imported routes with platform-specific prefixes ---
app.use('/api/sleeper', sleeperRosterRoutes);
app.use('/api/sleeper', sleeperFreeAgentRoutes);
app.use('/api/sleeper', sleeperLeagueRoutes);
app.use('/api/fleaflicker', fleaflickerRoutes); // <<< ADD THIS LINE TO USE THE NEW ROUTES
app.use('/api', fantasyCalcRoutes); 

// Simple test route
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Welcome to the brains behind Volatile Creative - API Speaking!' });
});

// Add this near your other routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
const serverInstance = app.listen(PORT, () => {
    console.log(`Server is running and listening on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server.');
});

// Error handling for the server instance
serverInstance.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
    switch (error.code) {
        case 'EACCES':
            console.error(`SERVER STARTUP ERROR: ${bind} requires elevated privileges.`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`SERVER STARTUP ERROR: ${bind} is already in use.`);
            process.exit(1);
            break;
        default:
            console.error(`An error occurred with the server: ${error.message}`);
            throw error;
    }
});
