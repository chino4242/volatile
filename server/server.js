// server/server.js

// Keep these error handlers at the top. Empty commit
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

// Update the request logging middleware
app.use((req, res, next) => {
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query,
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      'user-agent': req.headers['user-agent']
    }
  };
  
  console.log('Incoming Request:', JSON.stringify(requestLog, null, 2));
  next();
});

// Update your CORS options to be more permissive during debugging
const corsOptions = {
  origin: '*', // Warning: Change this back to your specific domains after debugging
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions)); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// --- 2. Use all imported routes with platform-specific prefixes ---
// =================================================================
// --- THIS IS THE FIX ---
// Combine all sleeper-related routers into a single `app.use` call.
// This tells Express to try each router in order for any request
// that matches the '/api/sleeper' prefix.
app.use('/api/sleeper', [sleeperRosterRoutes, sleeperFreeAgentRoutes, sleeperLeagueRoutes]);
// =================================================================

app.use('/api/fleaflicker', fleaflickerRoutes); 
app.use('/api', fantasyCalcRoutes); 

// Simple test route
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Welcome to the brains behind Volatile Creative - API Speaking!' });
});

// Add this near your other routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add a test route specifically for the managers endpoint
app.get('/api/test/managers', (req, res) => {
  res.json({ status: 'Managers endpoint reachable' });
});

// Add this before your other routes
app.get('/api/debug/routes', (req, res) => {
  const routes = app._router.stack
    .filter(r => r.route || (r.name === 'router' && r.handle.stack))
    .map(r => {
      if (r.route) {
        return { path: r.route.path, method: Object.keys(r.route.methods)[0] };
      }
      return {
        name: r.name,
        regexp: r.regexp.toString(),
        path: r.handle.stack
          .filter(s => s.route)
          .map(s => s.route.path)
      };
    });
    
  res.json({ routes });
});

// Update the 404 handler to show more routing information
app.use((req, res) => {
  const routes = app._router.stack
    .filter(r => r.route || (r.name === 'router' && r.handle.stack))
    .map(r => {
      if (r.route) {
        return { path: r.route.path, method: Object.keys(r.route.methods)[0] };
      }
      return {
        name: r.name,
        regexp: r.regexp.toString(),
        path: r.handle.stack
          .filter(s => s.route)
          .map(s => s.route.path)
      };
    });

  const error = {
    status: 404,
    message: 'Route not found',
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      params: req.params
    },
    registeredRoutes: routes
  };
  
  console.log('404 Error Details:', JSON.stringify(error, null, 2));
  res.status(404).json(error);
});

// Update the error handler with more detail
app.use((err, req, res, next) => {
  const errorResponse = {
    status: err.status || 500,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    path: req.path,
    method: req.method
  };
  
  console.error('Error Details:', {
    ...errorResponse,
    stack: err.stack
  });
  
  res.status(errorResponse.status).json(errorResponse);
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
