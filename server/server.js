// server.js - CANARY TEST v3

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

// All routes are commented out
// const rosterRoutes = require('./routes/rosterRoutes'); 

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// app.use('/api', rosterRoutes);

const serverInstance = app.listen(PORT, () => {
    // === THIS IS THE CANARY MESSAGE ===
    console.log(`CANARY TEST v3: Server startup successful on port ${PORT}. If you see this, the deploy worked.`);
    // ================================
});

serverInstance.on('error', (error) => {
    if (error.syscall !== 'listen') { throw error; }
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