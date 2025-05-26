# Building TrashDrop TWA: Complete Step-by-Step Guide

This guide walks you through the exact process of creating a Trusted Web Activity (TWA) for TrashDrop, which will launch in true fullscreen mode without browser UI.

## Step 1: Prepare your project directory

```bash
# Create a new directory for your TWA project
mkdir -p ~/TrashDrop-TWA
cd ~/TrashDrop-TWA
```

## Step 2: Initialize the TWA project

```bash
# Replace YOUR_NGROK_URL with your actual Ngrok URL
bubblewrap init --manifest=https://271d-154-161-136-76.ngrok-free.app/manifest.json
```

When prompted:
- Package name: `com.trashdrop.app`
- App name: `TrashDrop`
- Short app name: `TrashDrop`
- Start URL: `/dashboard`
- Icon URL: Use the URL to your 512x512 icon

## Step 3: Manually modify the twa-manifest.json

After initialization completes, you'll have a `twa-manifest.json` file. Edit it to match our optimized settings:

```bash
# Open the file for editing
nano twa-manifest.json
```

Replace the content with this optimized configuration (update the host and URLs with your Ngrok domain):

```json
{
  "packageId": "com.trashdrop.app",
  "host": "271d-154-161-136-76.ngrok-free.app",
  "name": "TrashDrop",
  "launcherName": "TrashDrop",
  "display": "standalone",
  "themeColor": "#4CAF50",
  "navigationColor": "#000000",
  "backgroundColor": "#FFFFFF",
  "enableNotifications": true,
  "shortcuts": [
    {
      "name": "Dashboard",
      "shortName": "Home",
      "url": "/dashboard"
    },
    {
      "name": "Scan QR",
      "shortName": "Scan",
      "url": "/scan"
    },
    {
      "name": "Request Pickup",
      "shortName": "Pickup",
      "url": "/request-pickup"
    }
  ],
  "fallbackType": "customtabs",
  "features": {
    "locationDelegation": {
      "enabled": true
    }
  },
  "webManifestUrl": "https://271d-154-161-136-76.ngrok-free.app/manifest.json",
  "startUrl": "/dashboard",
  "fullScopeUrl": "https://271d-154-161-136-76.ngrok-free.app",
  "minSdkVersion": 19,
  "orientation": "portrait",
  "permissions": [
    "INTERNET",
    "ACCESS_NETWORK_STATE",
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION",
    "CAMERA"
  ]
}
```

## Step 4: Build the TWA

```bash
bubblewrap build
```

This will:
1. Generate an Android Studio project
2. Download dependencies
3. Build the APK
4. Sign it with a debug key

## Step 5: Get the fingerprint for Digital Asset Links

```bash
bubblewrap fingerprint
```

You'll see output like:
```
The fingerprints for the keystore are:
SHA-1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
SHA-256: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB
```

## Step 6: Update your Digital Asset Links file

Go back to your TrashDrop project and update the Digital Asset Links file:

```bash
cd /Users/otisa.apaloo/CascadeProjects/TrashDrop_Mobile_User/TrashDrop
```

Edit the `.well-known/assetlinks.json` file to include your SHA-256 fingerprint (remove the colons):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.trashdrop.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT_WITHOUT_COLONS"]
  }
}]
```

## Step 7: Install and test the APK

The APK will be at:
```
~/TrashDrop-TWA/app/build/outputs/apk/release/app-release-signed.apk
```

Transfer this file to your Android device and install it.

## Troubleshooting

If your app still shows browser UI:

1. **Check Digital Asset Links**: Make sure your assetlinks.json file is accessible at:
   ```
   https://YOUR_NGROK_URL.ngrok-free.app/.well-known/assetlinks.json
   ```

2. **Verify fingerprint**: The SHA-256 fingerprint in assetlinks.json must exactly match your app's signature.

3. **Force verification**: In Chrome on your device, go to:
   ```
   chrome://flags/#digital-asset-links-testing
   ```
   Enable "Enable Digital Asset Links testing through local intents."

4. **Test manually**: Verify Digital Asset Links with:
   ```
   https://developers.google.com/digital-asset-links/tools/generator
   ```

## Production Release

For a production release:

1. Create a proper signing key:
   ```bash
   keytool -genkey -v -keystore release-key.keystore -alias trashdrop -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Update twa-manifest.json with the key path:
   ```json
   "signingKey": {
     "path": "./release-key.keystore",
     "alias": "trashdrop"
   }
   ```

3. Build a release version:
   ```bash
   bubblewrap build
   ```

4. Update your production server's assetlinks.json with the new fingerprint.

5. Upload to Google Play Store.
