/**
 * TrashDrop Authentication Stabilizer
 * A consolidated solution to prevent refresh loops and authentication issues
 * This script must be included as the FIRST script on login-related pages
 */

// Prevent multiple initializations
if (window.authStabilizerInitialized) {
  console.log('Auth stabilizer already initialized, skipping...');
  // If authStabilized is already set, don't run the script again
  if (window.authStabilized) {
    console.log('Auth already stabilized, exiting...');
    // Exit the script without executing the rest
    throw new Error('Auth stabilizer already initialized and stabilized');
  }
} else {
  window.authStabilizerInitialized = true;
}

// Use IIFE to avoid polluting global scope
(function() {
  // Only initialize once per page load
  if (window._authStabilizerInitialized) return;
  window._authStabilizerInitialized = true;
  
  console.log('🔒 TrashDrop Auth Stabilizer v1.0 activated');
  
  // ===== CONFIGURATION =====
  const AUTH_KEYS = [
    'jwt_token', 'token', 'dev_user', 'userData', 
    'supabase.auth.token', 'authRedirect', 'redirectAfterLogin',
    'loginRedirectUrl', 'redirectCount', 'lastRedirectTime'
  ];
  
  const REDIRECT_LIMIT = 5; // Increased from 3 to 5
  const REDIRECT_TIMEFRAME_MS = 15000; // Increased from 10 to 15 seconds
  const LOOP_DETECTION_TIMEFRAME_MS = 10000; // Increased from 5 to 10 seconds
  const RAPID_PAGE_LOADS_THRESHOLD = 5; // Increased from 3 to 5
  
  // ===== UTILITIES =====
  
  // Detect if we're on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Detect if we're using Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Detect if we're on localhost
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  
  // Detect if we're on the login or signup page
  const isLoginPage = window.location.pathname.includes('login');
  const isSignupPage = window.location.pathname.includes('signup');
  const isAuthPage = isLoginPage || isSignupPage;
  
  // ===== LOOP DETECTION =====
  
  // Track page loads to detect refresh loops
  function detectRefreshLoop() {
    // Skip loop detection in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🔧 Development mode: Loop detection is less strict');
      return false;
    }
    
    const now = Date.now();
    let pageLoads = [];
    
    try {
      // Get stored page loads with a unique key to prevent conflicts
      pageLoads = JSON.parse(sessionStorage.getItem('_authStabilizer_pageLoads') || '[]');
      
      // Add current load
      pageLoads.push(now);
      
      // Keep only recent loads
      pageLoads = pageLoads.filter(time => now - time < LOOP_DETECTION_TIMEFRAME_MS);
      
      // Save back to storage
      sessionStorage.setItem('_authStabilizer_pageLoads', JSON.stringify(pageLoads));
      
      // Check for rapid page loads
      const rapidLoads = pageLoads.length;
      
      // Log the current state for debugging
      console.log(`📊 Page load tracking: ${rapidLoads} loads in last ${LOOP_DETECTION_TIMEFRAME_MS/1000}s (threshold: ${RAPID_PAGE_LOADS_THRESHOLD})`);
      
      // Only trigger if significantly above threshold to reduce false positives
      if (rapidLoads > RAPID_PAGE_LOADS_THRESHOLD + 2) {
        console.error(`⚠️ Refresh loop detected! ${rapidLoads} page loads in ${LOOP_DETECTION_TIMEFRAME_MS/1000}s`);
        return true;
      }
    } catch(e) {
      console.error('Error in loop detection:', e);
    }
    
    return false;
  }
  
  // ===== REDIRECT TRACKING =====
  
  // Track redirects to prevent loops
  function trackRedirect() {
    const now = Date.now();
    let redirects = [];
    
    try {
      // Get stored redirects
      redirects = JSON.parse(sessionStorage.getItem('_authStabilizer_redirects') || '[]');
      
      // Add current redirect
      redirects.push(now);
      
      // Keep only recent redirects
      redirects = redirects.filter(time => now - time < REDIRECT_TIMEFRAME_MS);
      
      // Save back to storage
      sessionStorage.setItem('_authStabilizer_redirects', JSON.stringify(redirects));
      
      // Check if we've exceeded the redirect limit
      return redirects.length > REDIRECT_LIMIT;
    } catch(e) {
      console.error('Error tracking redirects:', e);
      return false;
    }
  }
  
  // ===== AUTHENTICATION STATE CLEANUP =====
  
  // Clear authentication data to break loops
  function clearAuthData(complete = false) {
    try {
      // Clear localStorage items related to auth
      AUTH_KEYS.forEach(key => {
        try { localStorage.removeItem(key); } catch(e) {}
      });
      
      // Optionally clear all sessionStorage except our tracking data
      if (complete) {
        const pageLoads = sessionStorage.getItem('_authStabilizer_pageLoads');
        const redirects = sessionStorage.getItem('_authStabilizer_redirects');
        const loopHandled = sessionStorage.getItem('_authStabilizer_loopHandled');
        
        sessionStorage.clear();
        
        if (pageLoads) sessionStorage.setItem('_authStabilizer_pageLoads', pageLoads);
        if (redirects) sessionStorage.setItem('_authStabilizer_redirects', redirects);
        if (loopHandled) sessionStorage.setItem('_authStabilizer_loopHandled', loopHandled);
      } else {
        // Clear only authentication-related sessionStorage items
        AUTH_KEYS.forEach(key => {
          try { sessionStorage.removeItem(key); } catch(e) {}
        });
      }
      
      // Clear cookies related to auth and redirection
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (name.includes('auth') || name.includes('redirect') || 
            name.includes('token') || name.includes('session')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      console.log(`🧹 Auth data ${complete ? 'completely' : 'partially'} cleared`);
      return true;
    } catch(e) {
      console.error('Error clearing auth data:', e);
      return false;
    }
  }
  
  // ===== NAVIGATION BLOCKING =====
  
  // Block problematic navigation to prevent loops
  function blockProblematicNavigation() {
    // Save original methods
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    // Function to check if a URL should be blocked
    function shouldBlockUrl(url) {
      if (!url || typeof url !== 'string') return false;
      
      // If we've handled a loop, block problematic redirects
      if (sessionStorage.getItem('_authStabilizer_loopHandled')) {
        return url.includes('/views/') || 
               url.includes('login') || 
               url.includes('signup') || 
               url.includes('?redirect=') || 
               url.includes('error=');
      }
      
      // Always block redirects if we've exceeded the limit
      if (sessionStorage.getItem('_authStabilizer_redirectLimitExceeded') === 'true') {
        return true;
      }
      
      return false;
    }
    
    // Override location.assign
    window.location.assign = function(url) {
      if (shouldBlockUrl(url)) {
        console.log('🛑 Blocked navigation to:', url);
        return;
      }
      
      // Track this redirect
      if (trackRedirect()) {
        console.error('⚠️ Redirect limit exceeded, blocking further redirects');
        sessionStorage.setItem('_authStabilizer_redirectLimitExceeded', 'true');
        return;
      }
      
      return originalAssign.apply(this, arguments);
    };
    
    // Override location.replace
    window.location.replace = function(url) {
      if (shouldBlockUrl(url)) {
        console.log('🛑 Blocked replace to:', url);
        return;
      }
      
      // Track this redirect
      if (trackRedirect()) {
        console.error('⚠️ Redirect limit exceeded, blocking further redirects');
        sessionStorage.setItem('_authStabilizer_redirectLimitExceeded', 'true');
        return;
      }
      
      return originalReplace.apply(this, arguments);
    };
    
    // Override location.href
    if (originalHref && originalHref.set) {
      // Only redefine if not already defined by us
      const hrefDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href');
      if (!hrefDescriptor || hrefDescriptor.configurable) {
        try {
          Object.defineProperty(window.location, 'href', {
            get: originalHref.get,
            set: function(url) {
              if (shouldBlockUrl(url)) {
                console.log('🛑 Blocked href setting to:', url);
                return;
              }
              
              // Track this redirect
              if (trackRedirect()) {
                console.error('⚠️ Redirect limit exceeded, blocking further redirects');
                sessionStorage.setItem('_authStabilizer_redirectLimitExceeded', 'true');
                return;
              }
              
              return originalHref.set.apply(this, arguments);
            },
            configurable: false, // Make it non-configurable to prevent further changes
            enumerable: true
          });
        } catch (error) {
          console.warn('Could not redefine location.href, it may be non-configurable:', error);
        }
      } else {
        console.log('location.href is already non-configurable, skipping redefinition');
      }
    }
    
    // Override history.pushState
    history.pushState = function() {
      if (arguments[2] && shouldBlockUrl(arguments[2])) {
        console.log('🛑 Blocked pushState to:', arguments[2]);
        return;
      }
      return originalPushState.apply(this, arguments);
    };
    
    // Override history.replaceState
    history.replaceState = function() {
      if (arguments[2] && shouldBlockUrl(arguments[2])) {
        console.log('🛑 Blocked replaceState to:', arguments[2]);
        return;
      }
      return originalReplaceState.apply(this, arguments);
    };
    
    console.log('🔒 Navigation protection enabled');
  }
  
  // ===== FORM SUBMISSION HANDLING =====
  
  // Fix form submission to prevent double submits
  function fixFormSubmissions() {
    document.addEventListener('DOMContentLoaded', function() {
      // Find all forms on auth pages
      const forms = document.querySelectorAll('form');
      
      forms.forEach(form => {
        form.addEventListener('submit', function(e) {
          // Check if we've already submitted this form
          if (this.dataset.submitted === 'true') {
            console.log('🛑 Preventing duplicate form submission');
            e.preventDefault();
            return false;
          }
          
          // Mark as submitted
          this.dataset.submitted = 'true';
          
          // Reset the submitted state after 5 seconds (in case the submission fails)
          setTimeout(() => {
            this.dataset.submitted = 'false';
          }, 5000);
        });
      });
      
      console.log('📝 Form submission handlers installed');
    });
  }
  
  // ===== SAFARI-SPECIFIC FIXES =====
  
  // Apply Safari-specific fixes
  function applySafariSpecificFixes() {
    if (!isSafari) return;
    
    // Special handling for Safari authentication
    if (isAuthPage) {
      // Ensure we're using HTTP for local development on Safari
      if (isLocalhost && window.location.protocol === 'https:') {
        const httpUrl = window.location.href.replace('https:', 'http:');
        console.log('🔄 Redirecting to HTTP for Safari on localhost');
        window.location.replace(httpUrl);
        return;
      }
      
      // Prevent special redirect handling on Safari if it's causing loops
      if (sessionStorage.getItem('_authStabilizer_safariRedirectAttempted')) {
        // We've already attempted a Safari-specific redirect, don't try again
        window.disableSafariSpecialHandling = true;
        console.log('🛑 Disabled Safari special handling after previous attempt');
      } else if (isLoginPage) {
        // Mark that we're attempting a Safari-specific login approach
        sessionStorage.setItem('_authStabilizer_safariRedirectAttempted', 'true');
      }
    }
    
    console.log('🧭 Safari-specific fixes applied');
  }
  
  // ===== USER FEEDBACK =====
  
  // Show feedback when we've broken a loop
  function showLoopBrokenMessage() {
    // Wait for DOM to be ready
    function createMessage() {
      // Don't create multiple messages
      if (document.querySelector('.loop-broken-message')) return;
      
      // Create message element
      const message = document.createElement('div');
      message.className = 'loop-broken-message alert alert-info';
      message.style.position = 'fixed';
      message.style.top = '10px';
      message.style.left = '50%';
      message.style.transform = 'translateX(-50%)';
      message.style.zIndex = '9999';
      message.style.width = '90%';
      message.style.maxWidth = '400px';
      message.style.padding = '10px 15px';
      message.style.borderRadius = '5px';
      message.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      message.style.textAlign = 'center';
      message.style.backgroundColor = '#d1ecf1';
      message.style.color = '#0c5460';
      message.style.border = '1px solid #bee5eb';
      
      message.innerHTML = `
        <p style="margin:0"><strong>Login stabilized</strong></p>
        <p style="margin:5px 0 0;font-size:14px">Refresh loop detected and stopped</p>
      `;
      
      // Add to DOM
      document.body.appendChild(message);
      
      // Remove after 5 seconds
      setTimeout(() => {
        if (message && message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 5000);
    }
    
    // Try to create message now if DOM is ready
    if (document.body) {
      createMessage();
    } else {
      // Otherwise wait for DOM to be ready
      document.addEventListener('DOMContentLoaded', createMessage);
      // Also try again after a short delay
      setTimeout(createMessage, 500);
    }
  }
  
  // ===== MAIN LOOP HANDLING =====
  
  // Handle a detected refresh loop
  function handleRefreshLoop() {
    // Mark that we've handled a loop
    sessionStorage.setItem('_authStabilizer_loopHandled', 'true');
    
    // Clear all authentication data to break the loop
    clearAuthData(true);
    
    // Block navigation attempts that might cause loops
    blockProblematicNavigation();
    
    // Show feedback to the user
    showLoopBrokenMessage();
    
    // Block all redirects for 10 seconds
    sessionStorage.setItem('_authStabilizer_redirectLimitExceeded', 'true');
    setTimeout(() => {
      sessionStorage.removeItem('_authStabilizer_redirectLimitExceeded');
    }, 10000);
    
    // If we're on an error page, redirect to login
    if (document.body && document.body.textContent.includes('cannot GET')) {
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    
    console.log('🔄 Refresh loop broken successfully');
  }
  
  // ===== INITIALIZATION =====
  
  // Detect if we're in a refresh loop
  const loopDetected = detectRefreshLoop();
  
  // Apply Safari-specific fixes regardless of loop detection
  applySafariSpecificFixes();
  
  // Always fix form submissions
  fixFormSubmissions();
  
  // If we've detected a loop, handle it
  if (loopDetected) {
    handleRefreshLoop();
  } 
  // If we're on a mobile device or Safari, take preventative measures
  else if (isMobile || isSafari) {
    console.log('📱 Applying preventative measures for mobile/Safari');
    
    // Clear only the problematic auth data
    ['redirectCount', 'lastRedirectTime', 'authRedirect'].forEach(key => {
      try { sessionStorage.removeItem(key); } catch(e) {}
    });
    
    // Always block problematic navigation to be safe
    blockProblematicNavigation();
  }
  
  // Add a flag to window indicating if authentication is stabilized
  window.authStabilized = true;
  
  console.log('✅ Auth stabilizer initialization complete');
})();
