# Firebase Deployment Guide for TrashDrop

This guide provides instructions for setting up and managing Firebase deployments for the TrashDrop application.

## Prerequisites

- Node.js 18 or higher
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project set up in the [Firebase Console](https://console.firebase.google.com/)
- GitHub repository with proper secrets configured

## Setup Instructions

### 1. Firebase Project Setup

1. Create a new Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - Firebase Authentication
   - Firestore Database
   - Firebase Hosting
   - Cloud Functions

### 2. Local Development Setup

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Log in to Firebase:
   ```bash
   firebase login
   ```

3. Link your local project to Firebase:
   ```bash
   firebase init
   ```
   - Select the services you want to set up (Hosting, Functions)
   - Choose your Firebase project or create a new one
   - Follow the prompts to configure each service

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### 4. Deployment

#### Local Testing

1. Start the local development server:
   ```bash
   npm run dev
   ```

2. Test Firebase Emulators (optional):
   ```bash
   firebase emulators:start
   ```

#### Staging Deployment

Deploy to the staging environment:

```bash
firebase use staging  # Switch to staging project
npm run build:staging
firebase deploy --only hosting:staging,functions
```

#### Production Deployment

Deploy to production:

```bash
firebase use production  # Switch to production project
npm run build
firebase deploy --only hosting:production,functions
```

### 5. GitHub Actions

The project includes GitHub Actions workflows for automated deployments:

- **Main Branch**: Pushing to `main` will trigger a production deployment
- **Staging Branch**: Pushing to `staging` will trigger a staging deployment
- **Pull Requests**: Opening a PR will create a preview deployment

### 6. Environment Configuration

#### Production
- **Project ID**: `trashdrop-app`
- **URL**: https://trashdrop-app.web.app
- **Hosting Target**: `production`

#### Staging
- **Project ID**: `trashdrop-app-staging`
- **URL**: https://staging-trashdrop-app.web.app
- **Hosting Target**: `staging`

### 7. Monitoring

- **Firebase Console**: https://console.firebase.google.com/
- **Hosting Dashboard**: Monitor traffic and performance
- **Functions Logs**: View Cloud Function execution logs
- **Authentication**: Manage users and authentication methods

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check GitHub Actions logs for specific error messages
   - Verify Firebase service account permissions
   - Ensure all required environment variables are set

2. **Authentication Errors**
   - Verify Firebase Authentication is enabled in the Firebase Console
   - Check API keys and configuration

3. **CORS Issues**
   - Ensure CORS is properly configured in Firebase Functions
   - Check the `Access-Control-Allow-Origin` headers

### Getting Help

For additional support, please contact the development team or open an issue in the repository.

## License

This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.
