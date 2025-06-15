const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Import configuration manager
const configManager = require('../src/config/config-manager');
const config = configManager.getConfig();

// Import the main server file
const { app: serverApp } = require('../server');

// Create a new Express app
const app = express();

// Initialize Supabase client
const supabaseUrl = config.get('supabase.url');
const supabaseKey = config.get('supabase.serviceRoleKey');
const supabase = createClient(supabaseUrl, supabaseKey);

// Make supabase available to the app
app.locals.supabase = supabase;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Use the main server app as middleware
app.use(serverApp);

// Handle all other routes with SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server when this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for testing or importing
module.exports = app;
