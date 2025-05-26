#!/bin/bash

# Configuration variables - edit these as needed
NGROK_CONFIG_FILE="ngrok.yml"
DEFAULT_PORT=3000

# Check if .env file exists and source environment variables from it
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "Loaded environment variables from .env"
else
  echo "Warning: No .env file found. Using default or system environment variables."
fi

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
  echo "Error: ngrok is not installed. Please install it first."
  echo "Visit https://ngrok.com/download for installation instructions."
  exit 1
fi

# Check if authtoken is set
if [ -z "$NGROK_AUTHTOKEN" ]; then
  echo "Warning: NGROK_AUTHTOKEN environment variable is not set."
  echo "You may need to run: ngrok config add-authtoken YOUR_TOKEN"
  echo "Get your token from https://dashboard.ngrok.com/get-started/your-authtoken"
fi

# Kill any existing ngrok processes
echo "Stopping any existing ngrok processes..."
pkill -f ngrok || true
sleep 1

# Start ngrok
echo "Starting ngrok tunnel to localhost:$DEFAULT_PORT..."
if [ -f "$NGROK_CONFIG_FILE" ]; then
  echo "Using configuration from $NGROK_CONFIG_FILE"
  ngrok start --config=$NGROK_CONFIG_FILE trashdrop
else
  echo "No config file found, using default configuration"
  ngrok http $DEFAULT_PORT
fi
