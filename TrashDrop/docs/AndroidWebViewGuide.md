# TrashDrop Android WebView App Guide

This guide shows you how to create a simple Android app that wraps your TrashDrop web app in a WebView with truly fullscreen UI (no browser chrome).

## Prerequisites

1. [Android Studio](https://developer.android.com/studio) installed
2. Basic familiarity with Android development

## Step 1: Create a new Android project

1. Open Android Studio
2. Click "New Project"
3. Select "Empty Activity"
4. Fill in the details:
   - Name: TrashDrop
   - Package name: com.trashdrop.app
   - Language: Java
   - Minimum SDK: API 21 (Android 5.0)
5. Click "Finish"

## Step 2: Configure the AndroidManifest.xml

Replace the content of `app/src/main/AndroidManifest.xml` with:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.trashdrop.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.TrashDrop">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize"
            android:theme="@style/Theme.TrashDrop.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>

</manifest>
```

## Step 3: Create styles for fullscreen mode

Edit `app/src/main/res/values/themes.xml` to add:

```xml
<resources>
    <style name="Theme.TrashDrop" parent="Theme.MaterialComponents.DayNight.DarkActionBar">
        <item name="colorPrimary">@color/green</item>
        <item name="colorPrimaryDark">@color/dark_green</item>
        <item name="colorAccent">@color/accent</item>
    </style>
    
    <style name="Theme.TrashDrop.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>
</resources>
```

## Step 4: Define colors

Create or edit `app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="green">#4CAF50</color>
    <color name="dark_green">#388E3C</color>
    <color name="accent">#FF5722</color>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
</resources>
```

## Step 5: Create layout

Edit `app/src/main/res/layout/activity_main.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_centerInParent="true"
        android:visibility="visible" />

</RelativeLayout>
```

## Step 6: Write the MainActivity code

Replace the content of `app/src/main/java/com/trashdrop/app/MainActivity.java` with:

```java
package com.trashdrop.app;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final String[] REQUIRED_PERMISSIONS = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA
    };
    
    // Change this to your actual TrashDrop URL
    private static final String TRASHDROP_URL = "https://271d-154-161-136-76.ngrok-free.app";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Make the activity fullscreen
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        
        // Request permissions
        requestPermissions();
        
        // Configure WebView
        setupWebView();
    }
    
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        
        // Enable DOM storage
        webSettings.setDomStorageEnabled(true);
        
        // Enable geolocation
        webSettings.setGeolocationEnabled(true);
        
        // Enable zooming
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        
        // Enable local storage and databases
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        
        // Set cache mode
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Offline support
        webSettings.setAppCacheEnabled(true);
        webSettings.setAppCachePath(getApplicationContext().getCacheDir().getAbsolutePath());
        
        // Hide the progress bar when the page finishes loading
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                super.onPageFinished(view, url);
            }
        });
        
        // Handle geolocation permissions
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });
        
        // Load your TrashDrop URL
        webView.loadUrl(TRASHDROP_URL);
    }
    
    private void requestPermissions() {
        if (!hasPermissions()) {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE);
        }
    }
    
    private boolean hasPermissions() {
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }
    
    @Override
    public void onBackPressed() {
        // Navigate back in WebView history if possible
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
```

## Step 7: Update icon resources with TrashDrop logo

1. Replace the default Android Studio launcher icons in `app/src/main/res` with your TrashDrop logo
2. Right-click on the `res` folder
3. Select "New > Image Asset"
4. Choose your TrashDrop logo as the source
5. Configure and generate the icon set

## Step 8: Build and test the app

1. Click the "Run" button in Android Studio
2. Select your Android device or emulator
3. The app will install and launch, showing your TrashDrop website in fullscreen mode

## Step 9: Release the app

To create a release version:

1. In Android Studio, select "Build > Generate Signed Bundle / APK"
2. Follow the wizard to create a signed APK
3. Share this APK with your users

## Benefits of this approach

- **True fullscreen experience:** No browser UI whatsoever
- **Native feel:** Launches instantly from the home screen
- **Full control:** You can customize every aspect of the appearance
- **Offline support:** Can be configured to work offline with proper caching
- **Access to device features:** Location, camera, etc. work seamlessly

## Customization options

- **Splash screen:** Add a custom splash screen while the web app loads
- **Push notifications:** Implement Supabase Push Notifications
- **Deep linking:** Add support for custom URL schemes
- **Offline mode:** Enhance with a custom offline page
