# TrashDrop TWA Quick Start Guide

This guide will help you package your TrashDrop web app as a native Android app using Trusted Web Activities (TWA).

## Prerequisites

- Node.js and npm installed
- Java Development Kit (JDK) 8 or newer
- Android Studio (for testing the app)

## Step 1: Install Bubblewrap CLI

Bubblewrap is Google's official tool for creating TWAs:

```bash
npm install -g @bubblewrap/cli
```

## Step 2: Verify Your Setup

```bash
bubblewrap doctor
```

This will check if you have all the required dependencies and guide you through installing any missing ones.

## Step 3: Initialize Your TWA Project

### Option A: For your production site with a valid HTTPS domain:

```bash
bubblewrap init --manifest=https://your-domain.com/manifest.json
```

### Option B: For local development with Ngrok:

```bash
bubblewrap init --manifest=https://your-ngrok-id.ngrok-free.app/manifest.json
```

Answer the interactive prompts:
- Package name: `com.trashdrop.app`
- App name: `TrashDrop`
- Short app name: `TrashDrop`
- Host domain: `your-domain.com` or `your-ngrok-id.ngrok-free.app`
- Icon URL: `https://your-domain.com/images/icon-512.png`

## Step 4: Customize Your TWA

Edit the `twa-manifest.json` file that was created:

```json
{
  "packageId": "com.trashdrop.app",
  "host": "your-domain.com",
  "name": "TrashDrop",
  "launcherName": "TrashDrop",
  "display": "standalone",
  "themeColor": "#4CAF50",
  "navigationColor": "#000000",
  "navigationColorDark": "#000000",
  "navigationDividerColor": "#000000",
  "navigationDividerColorDark": "#000000",
  "backgroundColor": "#FFFFFF",
  "enableNotifications": true,
  "shortcuts": [...],
  "generatorApp": "bubblewrap-cli",
  "webManifestUrl": "https://your-domain.com/manifest.json",
  "fallbackType": "customtabs",
  "features": {
    "locationDelegation": {
      "enabled": true
    },
    "playBilling": {
      "enabled": false
    }
  },
  "alphaDependencies": {
    "enabled": false
  },
  "enableSiteSettingsShortcut": true,
  "isChromeOSOnly": false,
  "isMetaQuest": false,
  "fullScopeUrl": "https://your-domain.com/",
  "minSdkVersion": 19,
  "orientation": "portrait",
  "fingerprints": []
}
```

## Step 5: Build Your App

```bash
bubblewrap build
```

This will create your APK file in the `app/build/outputs/apk/` directory.

## Step 6: Test Your App

1. Install the APK on your Android device:
   ```bash
   adb install app/build/outputs/apk/release/app-release-signed.apk
   ```

2. Or open the project in Android Studio:
   ```bash
   bubblewrap updateAndroidProject
   ```
   Then open the `android` directory in Android Studio and run the app.

## Step 7: Create Digital Asset Links (for Production)

For a production app, you need to create a Digital Asset Links file at `/.well-known/assetlinks.json` on your web server:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.trashdrop.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

You can get your fingerprint from the output of the build process or by using:

```bash
bubblewrap fingerprint
```

## Step 8: Release Your App

1. Sign your app with a production keystore
2. Submit to Google Play Store

## Testing Without Digital Asset Links

For testing with Ngrok or before setting up Digital Asset Links:

1. Open your app in Android Studio
2. Edit `app/src/main/AndroidManifest.xml`
3. Add `android:launchMode="singleTask"` to the main activity
4. Use Custom Tabs as fallback by setting `"fallbackType": "customtabs"` in `twa-manifest.json`

## Troubleshooting

- If you see Chrome browser UI: Make sure Digital Asset Links are correctly set up
- If app crashes: Check the SHA-256 fingerprint matches between your app and assetlinks.json
- If you're using Ngrok: Remember Ngrok URLs are temporary; you'll need to update your configuration when they change
