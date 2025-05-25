const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 80;

// Check environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log startup mode
console.log(`Starting server in ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);

// Middleware
app.use(cors());

// Redirect middleware for handling requests without port specified and protocol issues
app.use((req, res, next) => {
  const host = req.get('host');
  const isSafari = /^((?!chrome|android).)*safari/i.test(req.headers['user-agent'] || '');
  
  // For Safari browsers, detect if they're trying to access via HTTPS on localhost
  // and redirect them to the special Safari entry page
  if (isSafari && req.protocol === 'https' && 
      (host.includes('localhost') || host.includes('127.0.0.1'))) {
    // Instead of just redirecting to HTTP, send them to our special Safari entry page
    if (req.path !== '/safari-entry.html') {
      console.log(`Safari detected trying to use HTTPS. Redirecting to Safari entry page`);
      return res.redirect('/safari-entry.html');
    }
  }
  
  // Force HTTP for localhost and 127.0.0.1 to avoid HTTPS issues in Safari
  if ((host === '127.0.0.1' || host === 'localhost' || host === '127.0.0.1:80' || host === 'localhost:80') && 
      req.protocol === 'https') {
    const newUrl = `http://${host.split(':')[0]}:${PORT}${req.originalUrl}`;
    console.log(`Redirecting from ${req.protocol}://${host}${req.originalUrl} to ${newUrl} (HTTPS→HTTP)`);
    return res.redirect(newUrl);
  }
  
  // If accessed via 127.0.0.1 or localhost without port, redirect to include port 3000
  if (host === '127.0.0.1' || host === 'localhost' || host === '127.0.0.1:80' || host === 'localhost:80') {
    const newUrl = `http://${host.split(':')[0]}:${PORT}${req.originalUrl}`;
    console.log(`Redirecting from ${req.protocol}://${host}${req.originalUrl} to ${newUrl} (adding port)`);
    return res.redirect(newUrl);
  }
  
  next();
});

// Configure Helmet with relaxed CSP for local development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net", "cdn.tailwindcss.com", "unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdn.tailwindcss.com", "unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:", "*.openstreetmap.org", "*.tile.openstreetmap.org", "*.osm.org", "https://*"],
      connectSrc: ["'self'", process.env.SUPABASE_URL, "*.openstreetmap.org", "*.tile.openstreetmap.org", "*.osm.org", "https://*"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      baseUri: ["'self'"]
    }
  },
  // Disable HSTS to prevent HTTPS enforcement for localhost
  hsts: false
}));
console.log('Content Security Policy configured with unsafe-inline for development and HSTS disabled for localhost');
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // Force secure:false for localhost/development to avoid HTTPS requirements
    secure: process.env.NODE_ENV === 'production' && !['localhost', '127.0.0.1'].includes(process.env.HOST || ''),
    maxAge: parseInt(process.env.SESSION_DURATION || 86400000) // Default: 24 hours
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const pickupRoutes = require('./src/routes/pickupRoutes');
const bagRoutes = require('./src/routes/bagRoutes');
const pointsRoutes = require('./src/routes/pointsRoutes');
const userRoutes = require('./src/routes/userRoutes');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/bags', bagRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/user', userRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Alternative route to the same login page to bypass Safari security restrictions
app.get('/account-access', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Login processing page specifically for Safari browser
app.get('/login-process', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login-process.html'));
});

// Special Safari entry point to help with Safari's security restrictions
app.get('/safari', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'safari-entry.html'));
});

app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'scan.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reset-password.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'scan.html'));
});

app.get('/request-pickup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'request-pickup.html'));
});

app.get('/schedule-pickup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'schedule-pickup.html'));
});

app.get('/report-dumping', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'report-dumping.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/locations', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'locations.html'));
});

app.get('/rewards', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'rewards.html'));
});

app.get('/scanner-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'scanner-test.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
