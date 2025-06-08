// server/js - FINAL DEPLOYMENT VERSION

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
const rosterRoutes = require('./routes/rosterRoutes'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Enable your API routes ---
app.use('/api', rosterRoutes);

// Simple test route
app.get('/api/hello', (req, res) => {
    res.json({ message: 'API is alive!' });
});

// --- THE STATIC FILE SERVING BLOCK IS PERMANENTLY REMOVED ---

// Start the server
const serverInstance = app.listen(PORT, () => {
    // Add a unique message so we can identify this specific deployment
    console.log(`FINAL DEPLOYMENT v1: Server is running and listening on http://localhost:${PORT}`);
});

// Error handling for the server instance
serverInstance.on('error', (error) => {
    // ... (your existing serverInstance.on('error', ...) code)
});