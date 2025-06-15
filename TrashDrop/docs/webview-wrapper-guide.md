# TrashDrop Android WebView Wrapper App

This guide provides a simple solution to create a native Android app that wraps your TrashDrop web app in a WebView with truly fullscreen UI (no browser chrome).

## Why a WebView Wrapper?

While PWAs are powerful, Chrome on Android intentionally shows some browser UI elements for security reasons, even in fullscreen mode. A WebView wrapper gives you complete control over the UI, ensuring a true native app experience.

## Basic WebView App Structure

Here's a minimal Android Studio project to create a WebView wrapper:

### 1. Create a new Android Project

1. Open Android Studio
2. Create a new project with an Empty Activity
3. Name it "TrashDrop" and use package name "com.trashdrop.app"

### 2. Configure the AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.trashdrop.app">

    <!-- Required permissions -->
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

### 3. Create a No Action Bar Theme in styles.xml

```xml
<!-- res/values/themes.xml -->
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

### 4. Define colors.xml

```xml
<!-- res/values/colors.xml -->
<resources>
    <color name="green">#4CAF50</color>
    <color name="dark_green">#388E3C</color>
    <color name="accent">#FF5722</color>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
</resources>
```

### 5. Create the Layout in activity_main.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
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
        android:layout_centerInParent="true" />

</RelativeLayout>
```

### 6. MainActivity.java Code

```java
package com.trashdrop.app;

import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ProgressBar;
import android.webkit.GeolocationPermissions;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private static final int PERMISSION_REQUEST_CODE = 100;
    private static final String[] REQUIRED_PERMISSIONS = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA
    };
    
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
        
        // Configure WebView settings
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
        webView.loadUrl("https://your-trashdrop-url.com");
        // For testing with ngrok: webView.loadUrl("https://[your-ngrok-id].ngrok-free.app");
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

## Building and Testing

1. Build the app in Android Studio
2. Install it on your Android device
3. The app will load your TrashDrop web app in a fullscreen WebView without any browser UI

## Offline Support

For offline capabilities, you can implement a cache solution:

```java
// Add this to your setupWebView() method
webSettings.setAppCacheEnabled(true);
webSettings.setAppCachePath(getApplicationContext().getCacheDir().getAbsolutePath());
webSettings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
```

## Push Notifications

To enable push notifications in your WebView app:

1. Add Supabase Push Notifications to your Android project
2. Implement a message handler that communicates with your web app
3. Use a JavaScript bridge to connect your web app with the native notification system

## App Icons and Splash Screen

Don't forget to replace the default launcher icons with your TrashDrop logo:

1. Right-click on the `res` folder in Android Studio
2. Select New > Image Asset
3. Choose your TrashDrop icon and configure it as needed

## Distribution

When ready to distribute:

1. Generate a signed APK or App Bundle in Android Studio
2. Upload to Google Play Store for distribution
3. Provide the APK directly to users for sideloading

This Android WebView wrapper gives you complete control over the appearance and behavior of your app, ensuring a true fullscreen experience without any browser UI.
