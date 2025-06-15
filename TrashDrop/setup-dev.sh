#!/bin/bash

# TrashDrop Development Setup Script
# This script sets up the development environment for TrashDrop

echo "🚀 Starting TrashDrop development environment setup..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher and try again."
    echo "🔗 Download Node.js: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    echo "🔗 Please update Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Using Node.js $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ Using npm $(npm -v)"

# Firebase CLI installation removed - now using Supabase exclusively
echo "✅ TrashDrop now uses Supabase exclusively for backend services"

# Install project dependencies
echo "🔧 Installing project dependencies..."
npm ci
if [ $? -ne 0 ]; then
    echo "❌ Failed to install project dependencies"
    exit 1
fi

# Install functions dependencies
if [ -d "functions" ]; then
    echo "🔧 Installing functions dependencies..."
    cd functions && npm ci && cd ..
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install functions dependencies"
        exit 1
    fi
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file..."
    cat > .env <<EOL
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
APP_NAME=TrashDrop
APP_ENV=development
APP_VERSION=1.0.0
APP_URL=http://localhost:3000
SERVER_PORT=3000

# Security Configuration
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
SESSION_DURATION=86400000

# External APIs
SMS_API_ENDPOINT=your_sms_api_endpoint
MAPS_API_KEY=your_maps_api_key

# CORS Configuration
CORS_ALLOWED_DOMAINS=http://localhost:3000,http://127.0.0.1:3000
EOL
    echo "✅ Created .env file template. Please update it with your Supabase configuration."
else
    echo "✅ .env file already exists"
fi

# Firebase initialization removed - now using Supabase exclusively
# No need for firebase.json as we've migrated to Supabase

# Set execute permissions on scripts
chmod +x scripts/*.sh 2>/dev/null

# Final instructions
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the .env file with your Firebase configuration"
echo "2. Start the development server with: npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For more information, see FIREBASE_DEPLOYMENT.md"
echo ""

exit 0
