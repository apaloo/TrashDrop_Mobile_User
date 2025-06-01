/**
 * PWA Fullscreen Handler
 * Enhanced version with better permission handling
 * For TrashDrop Mobile Application
 */

(function() {
  // Flag to avoid repeated permission errors
  let fullscreenAttempted = false;
  let fullscreenPermissionDenied = false;
  
  // Try to detect if running as installed PWA
  const isRunningAsPwa = () => {
    return window.matchMedia('(display-mode: fullscreen)').matches || 
           window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true ||
           localStorage.getItem('isPWA') === 'true' ||
           document.URL.includes('mode=pwa');
  };

  // Force fullscreen when possible, with better error handling
  const attemptFullscreen = (fromUserGesture = false) => {
    // Skip if we've already determined permissions are denied
    if (fullscreenPermissionDenied) return;
    
    // Skip repeated attempts if not from user gesture
    if (fullscreenAttempted && !fromUserGesture) return;
    
    // Mark that we've attempted fullscreen
    fullscreenAttempted = true;
    
    // Only proceed if not already in fullscreen
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      // Apply fullscreen with promise handling
      document.documentElement.requestFullscreen({
        // Some browsers support navigation UI options
        navigationUI: 'hide'
      }).then(() => {
        console.log('Fullscreen enabled successfully');
      }).catch(err => {
        // Handle permission errors differently
        if (err.name === 'NotAllowedError' || 
            err.toString().includes('Permission') ||
            err.toString().includes('permission')) {
          console.log('Fullscreen permission denied, will require user interaction');
          fullscreenPermissionDenied = true;
          setupUserInteractionHandlers();
        } else {
          console.warn('Error attempting to enable fullscreen:', err);
        }
      });
    }
  };
  
  // Set up handlers to capture user interaction for fullscreen
  const setupUserInteractionHandlers = () => {
    // These events are likely to represent user interaction
    const interactionEvents = ['click', 'touchstart', 'keydown'];
    
    const userInteractionHandler = function(e) {
      // Only act on direct user interaction with the document body or buttons
      if (e.target && 
          (e.target === document.body || 
           e.target.tagName === 'BUTTON' ||
           e.target.role === 'button')) {
        attemptFullscreen(true);
        
        // If successful, remove the handlers
        if (document.fullscreenElement) {
          interactionEvents.forEach(eventType => {
            document.removeEventListener(eventType, userInteractionHandler);
          });
        }
      }
    };
    
    // Add the handlers for each event type
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, userInteractionHandler);
    });
  };

  // Handle PWA launch
  const handlePwaLaunch = () => {
    if (isRunningAsPwa()) {
      // Add special classes to enable CSS fullscreen tweaks
      document.documentElement.classList.add('pwa-mode');
      document.body.classList.add('pwa-mode');
      
      // Add viewport padding for notches and rounded corners
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover';
      }
      
      // Add a special meta theme-color for PWA mode
      let themeColor = document.querySelector('meta[name="theme-color"]');
      if (!themeColor) {
        themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        document.head.appendChild(themeColor);
      }
      themeColor.content = '#4CAF50'; // TrashDrop green
      
      // Try to request fullscreen after a slight delay
      setTimeout(() => {
        attemptFullscreen();
        
        // Always set up interaction handlers as fallback
        setupUserInteractionHandlers();
      }, 1000);
    }
  };

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePwaLaunch);
  } else {
    handlePwaLaunch();
  }
  
  // Also run when page becomes visible (PWA might be switched to from another app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunningAsPwa()) {
      // Reset attempt flag when becoming visible
      fullscreenAttempted = false;
      attemptFullscreen();
    }
  });
  
  // Handle fullscreen change events
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      console.log('Entered fullscreen mode');
    } else {
      console.log('Exited fullscreen mode');
      // Reset our flags when user exits fullscreen
      fullscreenAttempted = false;
      fullscreenPermissionDenied = false;
    }
  });
})();
