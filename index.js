const express = require('express');
const http = require('http');
const app = require('./src/app');
const { initWebSocket } = require('./src/models/index');

const PORT = process.env.PORT || 4000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize WebSocket server
const wss = initWebSocket(server);

// Handle HTTP server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Try one of these solutions:`);
        console.error(`   1. Stop the process using port ${PORT}`);
        console.error(`   2. Use a different port: PORT=3001 node index.js`);
        console.error(`   3. Find and kill the process: netstat -ano | findstr :${PORT}\n`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});

// Handle WebSocket server errors
wss.on('error', (err) => {
    console.error('WebSocket server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`✅ WebSocket server ready at ws://localhost:${PORT}`);
});