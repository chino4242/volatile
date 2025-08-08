// server/server.js

// Keep these process-level error handlers at the top
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
const fleaflickerRoutes = require('./routes/fleaflickerRosterRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---

// Request logging
app.use((req, res, next) => {
    const requestLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        headers: {
            origin: req.headers.origin,
            host: req.headers.host,
            'user-agent': req.headers['user-agent']
        }
    };
    console.log('Incoming Request:', JSON.stringify(requestLog, null, 2));
    next();
});

// CORS configuration
const corsOptions = {
    origin: '*', // Be sure to restrict this in production
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// --- API Routes ---

// Health check route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is healthy.' });
});

// Use all imported routes with platform-specific prefixes
app.use('/api/sleeper', [sleeperRosterRoutes, sleeperFreeAgentRoutes, sleeperLeagueRoutes]);
app.use('/api/fleaflicker', fleaflickerRoutes);
app.use('/api', fantasyCalcRoutes);

// --- Error Handling ---

// **FIXED**: More robust 404 handler that won't crash
app.use((req, res, next) => {
    const registeredRoutes = app._router.stack
        .map(layer => {
            if (layer.route) {
                return {
                    path: layer.route.path,
                    method: Object.keys(layer.route.methods)[0].toUpperCase()
                };
            } else if (layer.name === 'router' && layer.handle.stack) {
                // This handles nested routers used with app.use()
                return layer.handle.stack
                    .filter(subLayer => subLayer.route) // Ensure the sub-layer has a route object
                    .map(subLayer => ({
                        // Construct the full path for the nested route
                        path: layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^\\', '') + subLayer.route.path,
                        method: Object.keys(subLayer.route.methods)[0].toUpperCase()
                    }));
            }
        })
        .flat() // Flatten the array of nested routes
        .filter(Boolean); // Remove any undefined/null entries

    const error = {
        status: 404,
        message: 'Route not found. The requested URL did not match any routes.',
        request: {
            method: req.method,
            url: req.originalUrl
        },
        registeredRoutes: registeredRoutes
    };

    console.error('404 Error Details:', JSON.stringify(error, null, 2));
    res.status(404).json(error);
});


// **FIXED**: Robust final error handler
app.use((err, req, res, next) => {
    const status = typeof err.status === 'number' ? err.status : 500;

    const errorResponse = {
        status: status,
        message: err.message || 'An internal server error occurred.',
        path: req.originalUrl,
        method: req.method,
        // Only include stack in non-production environments
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    };

    console.error('Final Error Handler Caught:', JSON.stringify(errorResponse, null, 2));

    res.status(status).json(errorResponse);
});


// --- Server Startup ---
const serverInstance = app.listen(PORT, () => {
    console.log(`Server is running and listening on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server.');
});

serverInstance.on('error', (error) => {
    if (error.syscall !== 'listen') throw error;
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
            throw error;
    }
});
