# TrashDrop Mobile Application

A mobile-optimized Progressive Web Application (PWA) for managing waste pickup requests, scanning recycling bags, and reporting illegal dumping.

## Features

- **User Authentication**: Secure phone-based signup and login with OTP verification
- **Profile Management**: Personal information, preferences, and security settings
- **Pickup Requests**: Schedule and track waste pickup requests
- **QR Scanner**: Scan and register recycling bags with points system
- **Offline Support**: Full functionality even without an internet connection
- **Map Integration**: Location-based services with offline map capabilities
- **Points & Rewards**: Earn points for recycling activities
- **Dark Mode**: Customizable UI theme

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)

## Secure Configuration

TrashDrop uses a centralized configuration manager to securely handle environment variables and sensitive information.

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# App Configuration
APP_NAME=TrashDrop
APP_ENV=development
APP_VERSION=1.0.0
APP_URL=http://localhost:3000
SERVER_PORT=3000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security Configuration
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
SESSION_DURATION=86400000

# External APIs
SMS_API_ENDPOINT=your_sms_api_endpoint
MAPS_API_KEY=your_maps_api_key

### Configuration Validation

TrashDrop includes a configuration validation tool that helps verify all required configuration values are properly loaded. This ensures your application is correctly configured before deployment.

#### Running the Validator

**For Server-Side Configuration:**

Run the following npm script to validate all environment variables and server-side configuration:

```bash
npm run config:test
```

**For Client-Side Configuration:**

Open the following HTML file in your browser to validate client-side configuration:

```
/tests/config-validator.html
```

#### What it Validates

- **Environment Variables**: Verifies all required environment variables are defined
- **Server Configuration**: Tests that the config manager initializes and can access nested configuration values
- **Supabase Authentication**: Validates authentication configuration and client initialization
- **Browser Compatibility**: Tests configuration in different browser environments

#### Fixing Configuration Issues

If the validator reports any missing configuration:

1. Check your `.env` file for missing variables
2. Verify Supabase credentials are valid
3. Ensure configuration paths match the expected nested structure (e.g., `app.name` not `APP_NAME`)
4. Confirm the config manager is initialized before accessing values

# CORS Configuration
CORS_ALLOWED_DOMAINS=http://localhost:3000,https://trashdrop.example.com

# CDN Resources (used by client-side code)
CDN_BOOTSTRAP_CSS=https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css
CDN_BOOTSTRAP_JS=https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js
CDN_BOOTSTRAP_ICONS=https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css
CDN_LEAFLET_CSS=https://unpkg.com/leaflet@1.9.3/dist/leaflet.css
CDN_LEAFLET_JS=https://unpkg.com/leaflet@1.9.3/dist/leaflet.js
CDN_LEAFLET_GEOCODER=https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js
CDN_SUPABASE_JS=https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js
CDN_FONTAWESOME_CSS=https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css

# SMS Service Configuration
SMS_API_ENDPOINT=https://api.sms-service.com/send
SMS_API_KEY=your-sms-api-key
```

### Service Account Files

Place any service account JSON files in the `config/` directory. These files are automatically ignored by Git.

```
config/service-account.json
```

### Configuration Manager

The application uses a centralized configuration manager (`src/config/config-manager.js`) to access all environment variables securely. To access configuration values:

```javascript
// Server-side (Node.js)
const configManager = require('./src/config/config-manager');
const config = configManager.getConfig();
const supabaseUrl = config.get('supabase.url');

// Client-side (browser)
window.AppConfig.get('cdnResources.bootstrap.css');
```

### Running in Development Mode

For local development without setting up all environment variables, use:

```bash
npm run dev
```

This will use sensible defaults while still allowing you to override specific values in your `.env` file.
- **Authentication**: JWT, Supabase Auth
- **Storage**: IndexedDB for offline data
- **Maps**: Leaflet.js
- **QR Scanning**: HTML5 QR Scanner

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Supabase account and project

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd TrashDrop
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Application Settings
   PORT=3000
   NODE_ENV=production
   
   # Security
   SESSION_SECRET=your-session-secret
   JWT_SECRET=your-jwt-secret
   SESSION_DURATION=86400000  # 24 hours in milliseconds
   
   # Supabase Configuration
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   
   # Service API Keys
   SMS_API_KEY=your-sms-service-api-key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Deployment

### Option 1: Deploy to Heroku

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI and log in:
   ```
   npm install -g heroku
   heroku login
   ```

3. Create a new Heroku app:
   ```
   heroku create trashdrop-app
   ```

4. Set up environment variables in Heroku:
   ```
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your-session-secret
   heroku config:set JWT_SECRET=your-jwt-secret
   heroku config:set SUPABASE_URL=your-supabase-url
   heroku config:set SUPABASE_KEY=your-supabase-key
   heroku config:set SUPABASE_ANON_KEY=your-supabase-anon-key
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   heroku config:set SMS_API_KEY=your-sms-service-api-key
   ```

5. Deploy the application:
   ```
   git push heroku main
   ```

### Option 2: Deploy to a VPS or Cloud Provider

1. SSH into your server:
   ```
   ssh user@your-server-ip
   ```

2. Clone the repository:
   ```
   git clone <repository-url>
   cd TrashDrop
   ```

3. Install dependencies:
   ```
   npm install --production
   ```

4. Create a `.env` file with the required environment variables

5. Set up a process manager like PM2:
   ```
   npm install -g pm2
   pm2 start server.js --name trashdrop
   pm2 save
   pm2 startup
   ```

6. Configure Nginx as a reverse proxy (optional):
   ```
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 3: Deploy using Docker

1. Create a Dockerfile in the root directory:
   ```
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. Build and run the Docker image:
   ```
   docker build -t trashdrop .
   docker run -p 3000:3000 --env-file .env trashdrop
   ```

## Development Mode

To run the application in development mode with hot reloading:

```
npm run dev
```

## License

This project is licensed under the ISC License.

## Acknowledgements

- Supabase for the backend infrastructure
- Bootstrap for the UI components
- HTML5 QR Scanner for QR code scanning capabilities
