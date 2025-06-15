#!/bin/bash

# TrashDrop Supabase Deployment Script
echo "Starting TrashDrop deployment process..."

# Build the application
echo "🔧 Building application..."
npm run build

# Server deployment options
# Option 1: Deploy to your Node.js server
echo "ℹ️  To deploy to your Node.js server, use a tool like pm2:"
echo "   pm2 restart trashdrop"

# Option 2: Deploy static assets
echo "ℹ️  To deploy static assets to your web server, copy the 'public' directory"

# Option 3: Deploy to a hosting service
echo "ℹ️  Deployment options for hosting services:"
echo "   - Vercel:    'vercel --prod'"
echo "   - Netlify:   'netlify deploy --prod'"
echo "   - Render:    'git push render main'"
echo "   - Digital Ocean: Push to the configured repository"

echo "✅ Deployment instructions complete"
