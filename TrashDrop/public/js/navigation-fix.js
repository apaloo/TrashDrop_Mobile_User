/**
 * TrashDrop Navigation Fixer
 * This script intercepts and corrects problematic navigation attempts,
 * particularly fixing the "/views/login.html" error on logout
 */

(function() {
    console.log('Navigation fix initialized');
    
    // Track the last time we handled a navigation to avoid loops
    let lastHandledNavigation = 0;
    
    // Fix navigation path when needed
    function fixNavigationPath(url) {
        if (!url) return url;
        
        // Check if we're on ngrok
        const isNgrok = window.location.hostname.includes('ngrok-free.app');
        
        // Check if the URL is already a corrected URL with parameters
        if (url.includes('/login?') && 
            (url.includes('redirected=true') || url.includes('corrected=true'))) {
            console.log('URL is already corrected, not modifying:', url);
            return url;
        }
        
        // Handle specific problematic paths
        if (url.includes('/views/login.html')) {
            console.log('Correcting /views/login.html path to /login');
            // Add timestamp to prevent caching and loop detection parameters
            const timestamp = Date.now();
            return `/login?corrected=true&t=${timestamp}`;
        }
        
        if (url.includes('/views/dashboard.html')) {
            console.log('Correcting /views/dashboard.html path to /dashboard');
            return '/dashboard';
        }
        
        if (url.includes('/views/')) {
            // Generic fix for any views/* path
            const pageName = url.split('/views/')[1].split('.html')[0];
            console.log(`Correcting /views/${pageName}.html path to /${pageName}`);
            return `/${pageName}`;
        }
        
        return url;
    }
    
    // Intercept navigation attempts
    function setupNavigationInterceptor() {
        // Save original methods
        const originalAssign = window.location.assign;
        const originalReplace = window.location.replace;
        
        // Intercept window.location.href assignments
        let locationHrefDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href');
        if (locationHrefDescriptor && locationHrefDescriptor.configurable) {
            Object.defineProperty(window.location, 'href', {
                set: function(url) {
                    const now = Date.now();
                    // Prevent multiple redirects in short time period
                    if (now - lastHandledNavigation < 500) {
                        console.log('Ignoring rapid navigation request');
                        return;
                    }
                    
                    const fixedUrl = fixNavigationPath(url);
                    console.log(`Navigation intercepted: ${url} → ${fixedUrl}`);
                    lastHandledNavigation = now;
                    
                    // Use original descriptor setter with fixed URL
                    locationHrefDescriptor.set.call(this, fixedUrl);
                },
                get: locationHrefDescriptor.get
            });
        }
        
        // Intercept window.location.assign
        window.location.assign = function(url) {
            const fixedUrl = fixNavigationPath(url);
            console.log(`assign intercepted: ${url} → ${fixedUrl}`);
            originalAssign.call(window.location, fixedUrl);
        };
        
        // Intercept window.location.replace
        window.location.replace = function(url) {
            const fixedUrl = fixNavigationPath(url);
            console.log(`replace intercepted: ${url} → ${fixedUrl}`);
            originalReplace.call(window.location, fixedUrl);
        };
        
        // Intercept form submissions
        document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.action && form.action.includes('/views/')) {
                e.preventDefault();
                const fixedAction = fixNavigationPath(form.action);
                console.log(`Form submission intercepted: ${form.action} → ${fixedAction}`);
                form.action = fixedAction;
                form.submit();
            }
        }, true);
        
        // Listen for the special 404 navigation error
        window.addEventListener('error', function(e) {
            if (e.message && (
                e.message.includes('Failed to load') || 
                e.message.includes('cannot GET') || 
                e.message.includes('404')
            ) && e.message.includes('/views/')) {
                console.log('Detected navigation error to /views/, redirecting to proper path');
                // Extract the page name and redirect
                const message = e.message;
                const match = message.match(/\/views\/([^.]+)\.html/);
                if (match && match[1]) {
                    const pageName = match[1];
                    window.location.replace(`/${pageName}`);
                } else {
                    // Fallback to dashboard
                    window.location.replace('/dashboard');
                }
            }
        }, true);
    }
    
    // Add HTTP error interceptor using service worker if possible
    function setupHttpErrorInterceptor() {
        // Detect unsupported browsers (mainly for older browsers)
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker not supported in this browser');
            return;
        }
        
        // Listen for unhandled errors that might be related to navigation
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason && 
                typeof event.reason.message === 'string' && 
                event.reason.message.includes('/views/')) {
                console.log('Intercepted unhandled promise rejection related to views navigation');
                
                // Try to extract the page name
                const match = event.reason.message.match(/\/views\/([^.]+)\.html/);
                if (match && match[1]) {
                    const pageName = match[1];
                    console.log(`Redirecting from failed views request to /${pageName}`);
                    window.location.replace(`/${pageName}`);
                }
            }
        });
    }
    
    // Run initialization
    setupNavigationInterceptor();
    setupHttpErrorInterceptor();
    
    // Export for debugging
    window.NavigationFixer = {
        fixNavigationPath: fixNavigationPath
    };
})();
