const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Check environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log startup mode
console.log(`Starting server in ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);

// Middleware
app.use(cors());

// Configure Helmet differently based on environment
if (isDevelopment) {
  // In development, disable the content security policy
  app.use(helmet({
    contentSecurityPolicy: false
  }));
  console.log('Content Security Policy disabled for development');
} else {
  // In production, use stricter security settings
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net", "cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdn.tailwindcss.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", process.env.SUPABASE_URL],
      }
    }
  }));
}
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'trashdrop-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
