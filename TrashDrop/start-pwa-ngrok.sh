#!/bin/bash
# TrashDrop PWA Deployment Script with Ngrok
# This script starts the TrashDrop server and exposes it via Ngrok for PWA testing

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set port for the application
PORT=${PORT:-3000}
APP_NAME="TrashDrop PWA"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if ngrok is installed
if ! command_exists ngrok; then
  echo "❌ Ngrok is not installed. Please install it first:"
  echo "    brew install ngrok/ngrok/ngrok"
  echo "    or download from https://ngrok.com/download"
  exit 1
fi

# Function to start the application
start_app() {
  echo "🚀 Starting $APP_NAME on port $PORT..."
  
  # Check if running with Node directly or with npm
  if [ -f package.json ]; then
    # Use npm if a start script exists
    if grep -q "\"start\":" package.json; then
      npm start &
    else
      node server.js &
    fi
  else
    node server.js &
  fi
  
  # Store the process ID
  APP_PID=$!
  echo "✅ $APP_NAME started with PID: $APP_PID"
}

# Function to start ngrok tunnel
start_ngrok() {
  echo "🔄 Starting Ngrok tunnel to port $PORT..."
  
  # Start ngrok and capture the public URL
  NGROK_OUTPUT=$(ngrok http $PORT --log=stdout)
  
  # Extract the public URL
  NGROK_URL=$(echo "$NGROK_OUTPUT" | grep -o 'https://[^ ]*\.ngrok\.io' | head -n 1)
  
  if [ -z "$NGROK_URL" ]; then
    # If we couldn't extract it from the output, try the API
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | sed 's/"public_url":"//g' | head -n 1)
  fi
  
  # Display the URL
  if [ -n "$NGROK_URL" ]; then
    echo "✅ Ngrok tunnel established!"
    echo "📱 Access your PWA at: $NGROK_URL"
    echo "📝 Add this URL to your Android device using Chrome and select 'Add to Home Screen'"
    echo "   This will install TrashDrop as a PWA on your device"
  else
    echo "❌ Failed to retrieve Ngrok URL"
  fi
}

# Function to cleanup on exit
cleanup() {
  echo "🛑 Stopping $APP_NAME..."
  if [ -n "$APP_PID" ]; then
    kill $APP_PID
    echo "✅ $APP_NAME stopped"
  fi
  
  echo "🛑 Stopping Ngrok..."
  pkill -f ngrok
  echo "✅ Ngrok stopped"
  
  exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT

# Main execution
echo "🌟 Starting $APP_NAME PWA Deployment"
echo "-----------------------------------"

# Start the application
start_app

# Wait for app to start
sleep 3

# Start ngrok tunnel
start_ngrok

# Keep script running until interrupted
echo "-----------------------------------"
echo "🔍 Press Ctrl+C to stop the server and tunnel"
while true; do
  sleep 1
done
