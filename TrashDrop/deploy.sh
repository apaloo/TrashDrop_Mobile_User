#!/bin/bash

# Build your application (if needed)
# npm run build

# Deploy to Firebase
firebase deploy --only hosting

echo "Deployment complete! Check your app at: https://trashdrop-app.web.app"
