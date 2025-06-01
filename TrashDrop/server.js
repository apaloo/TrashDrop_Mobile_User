const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 80;

// Check environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log startup mode
console.log(`Starting server in ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);

// Middleware
// Enhanced CORS configuration to handle ngrok domains
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Always allow ngrok domains for testing
    if (origin.includes('ngrok-free.app')) {
      console.log(`Allowing CORS for ngrok domain: ${origin}`);
      return callback(null, true);
    }
    
    // Allow same origin and localhost variations
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Default allow all in development
    if (isDevelopment) {
      return callback(null, true);
    }
    
    callback(null, true);
  },
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(cookieParser()); // Initialize cookie parser for authentication tokens

// Special route for Digital Asset Links (TWA support)
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'public', '.well-known', 'assetlinks.json'));
});

// Health check endpoint for container monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Redirect loop detection middleware
const redirectLoopDetection = (req, res, next) => {
  const redirectCount = parseInt(req.cookies.redirect_count || '0');
  
  // Check if URL contains redirect parameters
  const hasRedirectParams = req.query.redirected || req.query.corrected;
  
  if (redirectCount > 3) {
    // Too many redirects - automatically redirect to login with no user interaction needed
    console.log('⚠️ Too many redirects detected, auto-redirecting to clean login page');
    
    // Clear the redirect count cookie
    res.cookie('redirect_count', '0', { path: '/' });
    
    // Set a special flag to indicate this is an emergency redirect
    res.cookie('emergency_redirect', 'true', { path: '/', maxAge: 5000 });
    
    // Redirect to login with special parameters to prevent further loops
    return res.redirect('/login?reset=true&clean=true&t=' + Date.now());
  }
  
  // Increment redirect count if this appears to be a redirect
  if (hasRedirectParams) {
    res.cookie('redirect_count', redirectCount + 1, { path: '/' });
  }
  
  // Reset redirect count when user explicitly navigates
  if (req.query.reset) {
    res.cookie('redirect_count', '0', { path: '/' });
  }
  
  next();
};

// Apply redirect loop detection to all routes
app.use(redirectLoopDetection);

// Special handling for the problematic /views/login.html path
app.get('/views/login.html', (req, res) => {
  console.log('Caught attempt to access /views/login.html, redirecting to /login');
  res.redirect('/login?redirected=true');
});

// Special handling for any /views/* paths that should be served from the root
app.get('/views/:page', (req, res) => {
  const page = req.params.page;
  const pageName = page.replace('.html', '');
  console.log(`Caught attempt to access /views/${page}, redirecting to /${pageName}`);
  res.redirect(`/${pageName}`);
});

// Add an endpoint to clear all problematic storage and cookies
app.get('/clear-session', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clearing Session</title>
      <script>
        // Clear everything
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect after clearing
        setTimeout(function() {
          window.location.href = '/login?reset=true';
        }, 1000);
      </script>
    </head>
    <body>
      <h1>Clearing session data...</h1>
      <p>You will be redirected to the login page shortly.</p>
    </body>
    </html>
  `);
});

// Add a dedicated logout endpoint that ensures a clean logout experience
app.get('/api/logout', (req, res) => {
  // Clear any server-side session data
  if (req.session) {
    req.session.destroy();
  }
  
  // Clear cookies
  res.clearCookie('token');
  res.clearCookie('jwt_token');
  res.clearCookie('redirect_count');
  
  // Detect mobile clients
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  if (isMobile) {
    // For mobile devices, return a special page with client-side cleanup
    const logoutHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logging Out</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding-top: 50px; }
    .spinner { margin: 20px auto; width: 50px; height: 50px; border: 3px solid rgba(0,0,0,0.1); 
             border-radius: 50%; border-top-color: #4CAF50; animation: spin 1s ease-in-out infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .message { margin-top: 20px; font-size: 18px; }
  </style>
  <script>
    // Clear all local storage and session data
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(';').forEach(function(cookie) {
      var name = cookie.split('=')[0].trim();
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    });
    
    // Redirect to login page after a short delay
    setTimeout(function() {
      window.location.href = '/login?logout=true&clean=true&t=' + Date.now();
    }, 1000);
  </script>
</head>
<body>
  <h2>Logging Out</h2>
  <div class="spinner"></div>
  <div class="message">Please wait...</div>
</body>
</html>
`;
    res.send(logoutHtml);
  } else {
    // For desktop devices, perform a standard redirect
    res.redirect('/login?logout=true&t=' + Date.now());
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes and middleware
const authRoutes = require('./src/routes/authRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const pickupRoutes = require('./src/routes/pickupRoutes');
const bagRoutes = require('./src/routes/bagRoutes');
const pointsRoutes = require('./src/routes/pointsRoutes');
const userRoutes = require('./src/routes/userRoutes');

// Import the ngrok authentication middleware
const { handleNgrokAuth } = require('./src/middleware/ngrokAuthMiddleware');

// Apply ngrok authentication middleware to all API routes
app.use('/api', handleNgrokAuth);

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

// PWA launch route - this is the PWA entry point
app.get('/pwa-launch', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'pwa-launch.html'));
});

app.get('/dashboard', (req, res) => {
  // Check if this is a PWA request (from our launch page or direct install)
  const isPwa = req.query.pwa === 'true' || req.query.mode === 'pwa';
  const isFullscreen = req.query.fullscreen === '1';
  
  // For now, always send the dashboard.html file
  // The JS in this file will handle fullscreen mode based on URL params
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

app.get('/activity', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'activity.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reports.html'));
});

// Handle Order Bags route to redirect to dashboard with modal trigger
app.get('/order-bags', (req, res) => {
  res.redirect('/dashboard?openModal=orderBags');
});

app.get('/scanner-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'scanner-test.html'));
});

// Health check endpoint for Docker/container orchestration
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
// Start server with optional HTTPS support
if (process.env.HTTPS_ENABLED === 'true' && process.env.SSL_KEY && process.env.SSL_CERT) {
  const fs = require('fs');
  const https = require('https');
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT)
  };
  
  https.createServer(options, app).listen(process.env.HTTPS_PORT || 443, () => {
    console.log(`HTTPS Server running on port ${process.env.HTTPS_PORT || 443}`);
  });
}

// Always start HTTP server for local development and as fallback
app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
});
