# Creating a TWA (Trusted Web Activity) for TrashDrop

This guide explains how to package TrashDrop as a native Android app using Trusted Web Activities (TWA). Unlike PWAs, TWAs run in a Chrome Custom Tab without any browser UI, giving users a true fullscreen native app experience.

## Prerequisites

- Android Studio
- A verified domain with HTTPS (for production)
- Basic knowledge of Android development

## Step 1: Set up the Digital Asset Links

First, we need to establish a connection between your website and your Android app through Digital Asset Links.

1. Generate a key hash for your app:
   ```bash
   keytool -genkey -v -keystore trashdrop-key.keystore -alias trashdrop -keyalg RSA -keysize 2048 -validity 10000
   keytool -list -v -keystore trashdrop-key.keystore
   ```

2. Convert the SHA-256 fingerprint to a web-compatible format:
   ```bash
   # Example: The SHA-256 fingerprint looks like this:
   # 14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5
   # Remove the colons to get:
   # 146DE983C5730650D8EEB9952F34FC6416A08342E61DBEA88A0496B23FCF44E5
   ```

3. Create a Digital Asset Links JSON file (/.well-known/assetlinks.json) on your web server:
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

## Step 2: Create a TWA project

The easiest way to create a TWA is to use the PWA Builder:

1. Visit https://www.pwabuilder.com/
2. Enter your website URL (the Ngrok URL or your production URL)
3. Click "Build My PWA"
4. Select "Android" as the platform
5. Download the Android package

Alternatively, you can use Android Studio:

1. Create a new Android project
2. Add the TWA dependencies to your app's build.gradle:
   ```gradle
   dependencies {
       implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
   }
   ```

3. Configure your TWA in the AndroidManifest.xml:
   ```xml
   <application>
       <meta-data
           android:name="asset_statements"
           android:resource="@string/asset_statements" />
       <activity
           android:name="com.google.androidbrowserhelper.trusted.LauncherActivity">
           <meta-data
               android:name="android.support.customtabs.trusted.DEFAULT_URL"
               android:value="https://your-domain.com" />
           <meta-data
               android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
               android:resource="@color/colorPrimary" />
           <meta-data
               android:name="android.support.customtabs.trusted.NAVIGATION_BAR_COLOR"
               android:resource="@color/navigationColor" />
           <meta-data
               android:name="android.support.customtabs.trusted.SPLASH_SCREEN_COLOR"
               android:resource="@color/backgroundColor" />
           <meta-data
               android:name="android.support.customtabs.trusted.SPLASH_SCREEN_FADE_OUT_DURATION"
               android:value="300" />
           <meta-data
               android:name="android.support.customtabs.trusted.FILE_PROVIDER_AUTHORITY"
               android:value="${applicationId}.fileprovider" />
           <meta-data
               android:name="android.support.customtabs.trusted.FALLBACK_STRATEGY"
               android:value="customtabs" />
           <intent-filter>
               <action android:name="android.intent.action.MAIN" />
               <category android:name="android.intent.category.LAUNCHER" />
           </intent-filter>
           <intent-filter>
               <action android:name="android.intent.action.VIEW" />
               <category android:name="android.intent.category.DEFAULT" />
               <category android:name="android.intent.category.BROWSABLE" />
               <data android:scheme="https" android:host="your-domain.com" />
           </intent-filter>
       </activity>
   </application>
   ```

## Step 3: Build and Deploy

1. Build your APK:
   ```bash
   ./gradlew assembleRelease
   ```

2. Sign your APK with the same key used for the Digital Asset Links:
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore trashdrop-key.keystore app-release-unsigned.apk trashdrop
   ```

3. Optimize the APK:
   ```bash
   zipalign -v 4 app-release-unsigned.apk trashdrop.apk
   ```

## Testing

For testing purposes with an Ngrok URL, you'll need a slightly different approach since Ngrok URLs change:

1. Create a development version of your app with WebView fallback enabled
2. Set up Android App Links verification (optional for testing)
3. Test on a physical device or emulator

## Alternative: Use Bubblewrap CLI

Google's Bubblewrap CLI makes the process much easier:

1. Install Bubblewrap:
   ```bash
   npm i -g @bubblewrap/cli
   ```

2. Initialize your TWA:
   ```bash
   bubblewrap init --manifest=https://your-domain.com/manifest.json
   ```

3. Build your APK:
   ```bash
   bubblewrap build
   ```

## Additional Resources

- [Trusted Web Activities](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
