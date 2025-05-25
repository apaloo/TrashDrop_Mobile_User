/**
 * Protocol Interceptor
 * This script must be loaded first before any other scripts
 * It ensures that localhost and 127.0.0.1 connections always use HTTP, not HTTPS
 * And provides special handling for Safari browsers
 */

(function() {
  // Detect if the browser is Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Early check for HTTPS on localhost
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isHttps = window.location.protocol === 'https:';
  
  // Store the fact that we're on Safari in localStorage for other scripts
  if (isSafari) {
    localStorage.setItem('safari_browser_detected', 'true');
    console.log('[Protocol Interceptor] Safari browser detected');
  }
  
  // For Safari, if we're trying to access the login page directly, we need special handling
  if (isSafari && isLocalhost && window.location.pathname.includes('/login')) {
    console.log('[Protocol Interceptor] Safari detected accessing login page directly');
    window.location.replace('http://127.0.0.1:3000/account-access');
    return;
  }
  
  // For Safari accessing the dashboard page, force 127.0.0.1 instead of localhost
  if (isSafari && window.location.hostname === 'localhost' && window.location.pathname.includes('/dashboard')) {
    console.log('[Protocol Interceptor] Safari detected accessing dashboard via localhost, switching to IP address');
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`http://127.0.0.1:${window.location.port || '3000'}${currentPath}`);
    return;
  }
  
  // If we're on HTTPS and localhost, immediately redirect to HTTP
  if (isLocalhost && isHttps) {
    console.log('[Protocol Interceptor] HTTPS detected on localhost, redirecting to HTTP');
    
    // For Safari, always use the IP address instead of 'localhost'
    const hostname = isSafari ? '127.0.0.1' : window.location.hostname;
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    const httpUrl = `http://${hostname}:${window.location.port || '3000'}${currentPath}`;
    
    console.log(`[Protocol Interceptor] Redirecting from HTTPS to HTTP: ${httpUrl}`);
    
    // Use a synchronous approach to guarantee this runs before any other scripts
    window.location.replace(httpUrl);
  }
})();
