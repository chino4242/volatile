// server.js

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
const path = require('path');

// vvvv KEEP THIS COMMENTED OUT vvvv
// const rosterRoutes = require('./routes/rosterRoutes'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// vvvv KEEP THIS COMMENTED OUT vvvv
// app.use('/api', rosterRoutes);


 app.get('/api/hello', (req, res) => {
     res.json({ message: 'Welcome to the brains behind Volatile Creative - Main Server Speaking!' });
 });


if (process.env.NODE_ENV === 'production') {
     app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
    app.get('*', (req, res) => {
         res.sendFile(path.resolve(__dirname, '..', 'client', 'build', 'index.html'));
     });
}


// Start the server - THIS IS THE ONLY PART LEFT THAT USES THE 'app'
const serverInstance = app.listen(PORT, () => {
    console.log(`Minimal server test: Running and listening on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server.');
});

// Keep this error handler for the listen call
serverInstance.on('error', (error) => {
    // ... (your existing serverInstance.on('error', ...) code)
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