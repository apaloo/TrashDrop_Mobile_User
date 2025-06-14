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

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "🔧 Firebase CLI not found. Installing firebase-tools globally..."
    npm install -g firebase-tools
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install firebase-tools. Please try installing manually with: npm install -g firebase-tools"
        exit 1
    fi
    echo "✅ Firebase CLI installed successfully"
else
    echo "✅ Firebase CLI is already installed"
fi

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
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id

# App Configuration
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# Optional: Google Maps API Key (if using maps)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
EOL
    echo "✅ Created .env file. Please update it with your Firebase configuration."
else
    echo "✅ .env file already exists"
fi

# Check for firebase.json
if [ ! -f "firebase.json" ]; then
    echo "🔧 Creating firebase.json..."
    firebase init
    if [ $? -ne 0 ]; then
        echo "❌ Failed to initialize Firebase. Please run 'firebase init' manually."
    fi
else
    echo "✅ firebase.json already exists"
fi

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
