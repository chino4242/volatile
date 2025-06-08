// server.js - Test #2: Re-enabling the /api/hello route

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

// Keep rosterRoutes commented out for now
// const rosterRoutes = require('./routes/rosterRoutes'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Keep this commented out
// app.use('/api', rosterRoutes);

// vvvv RE-ENABLE THIS ROUTE vvvv
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Welcome to the brains behind Volatile Creative - Main Server Speaking!' });
});


// Start the server
const serverInstance = app.listen(PORT, () => {
    console.log(`Server test with /api/hello: Running and listening on http://localhost:${PORT}`);
});

serverInstance.on('error', (error) => {
    if (error.syscall !== 'listen') { throw error; }
    // ... (rest of your error handling)
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