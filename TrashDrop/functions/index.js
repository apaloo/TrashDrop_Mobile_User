const functions = require('firebase-functions');
const express = require('express');
const path = require('path');

// Import the main server file
const { app: serverApp } = require('../server');

// Create a new Express app for Firebase Functions
const app = express();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Use the main server app as middleware
app.use(serverApp);

// Handle all other routes with SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export the Express app as a Firebase Function
exports.app = functions
  .runWith({
    // Ensure we have enough memory and time for our app
    memory: '1GB',
    timeoutSeconds: 60,
  })
  .https
  .onRequest((req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    
    // Process the request
    return app(req, res);
  });
