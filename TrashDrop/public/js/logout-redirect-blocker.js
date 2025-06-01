/**
 * TrashDrop Logout Redirect Blocker
 * This script completely prevents any redirects to /views/login.html
 * and blocks automatic refresh loops.
 */

(function() {
    // Run this script with highest priority
    console.log('Logout redirect blocker initialized - NO REDIRECTS VERSION');
    
    // EMERGENCY LOOP BREAKER: Check if we've reloaded too many times recently
    const now = Date.now();
    const lastVisit = parseInt(sessionStorage.getItem('last_page_visit') || '0');
    const visitCount = parseInt(sessionStorage.getItem('page_visit_count') || '0');
    
    // Record this visit
    sessionStorage.setItem('last_page_visit', now.toString());
    
    // If we've visited within the last 2 seconds, this might be a refresh loop
    if (now - lastVisit < 2000) {
        sessionStorage.setItem('page_visit_count', (visitCount + 1).toString());
        
        // After 3 rapid visits, take emergency measures
        if (visitCount >= 3) {
            console.log('EMERGENCY: Possible refresh loop detected, taking emergency measures');
            // Clear all redirection mechanisms
            sessionStorage.setItem('emergency_loop_break', 'true');
            sessionStorage.removeItem('page_visit_count');
            
            // Block all future automatic redirects
            if (window.location.pathname === '/login') {
                console.log('On login page during emergency, stabilizing page');
                // If we're already on login, just stop all further redirects
                return;
            }
            
            // Only redirect once more to a safe page if needed
            if (document.body.textContent.includes('cannot GET')) {
                window.location.replace('/login?emergency=true');
                return;
            }
        }
    } else {
        // Reset count if not a rapid succession
        sessionStorage.setItem('page_visit_count', '1');
    }
    
    // If we're in emergency mode, disable all redirection logic
    if (sessionStorage.getItem('emergency_loop_break') === 'true') {
        console.log('Running in emergency mode - all automatic redirects disabled');
        return;
    }
    
    // Track the page state
    const pageState = {
        isLoginPage: window.location.pathname === '/login',
        preventRedirects: false,
        lastNavigationTime: 0
    };
    
    // Detect mobile browsers
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isNgrok = window.location.hostname.includes('ngrok-free.app');
    
    // Function to check if the current page is the login page and determine if we should block redirects
    function checkIsLoginPage() {
        pageState.isLoginPage = window.location.pathname === '/login';
        
        // If we're on the login page, check for special flags to prevent redirect loops
        if (pageState.isLoginPage) {
            // Get URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const hasRedirectedParam = urlParams.has('redirected');
            const hasLogoutParam = urlParams.has('logout');
            const hasTimestampParam = urlParams.has('t') || urlParams.has('_t');
            
            // Skip redirect blocking if we already have parameters indicating we've been redirected
            if (hasRedirectedParam || (hasLogoutParam && hasTimestampParam)) {
                console.log('Login page with redirect parameters, skipping redirect blocking');
                // Set a flag in sessionStorage to indicate we've already handled this redirect
                sessionStorage.setItem('login_redirect_handled', 'true');
                return;
            }
            
            // Check if we've already handled a redirect in this session to prevent loops
            if (sessionStorage.getItem('login_redirect_handled')) {
                console.log('Login redirect already handled in this session, skipping');
                return;
            }
            
            console.log('On login page, blocking redirects for 5 seconds');
            pageState.preventRedirects = true;
            pageState.lastNavigationTime = Date.now();
            
            // After 5 seconds, allow redirects again
            setTimeout(function() {
                pageState.preventRedirects = false;
                console.log('Redirect blocking period ended');
            }, 5000);
        }
    }
    
    // Check immediately
    checkIsLoginPage();
    
    // Intercept pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
        // Block problematic URLs
        if (arguments[2] && typeof arguments[2] === 'string' && 
            (arguments[2].includes('/views/login.html') || 
             (pageState.isLoginPage && pageState.preventRedirects && 
              Date.now() - pageState.lastNavigationTime < 5000))) {
            
            console.log('Blocked pushState navigation to:', arguments[2]);
            return;
        }
        return originalPushState.apply(this, arguments);
    };
    
    history.replaceState = function() {
        // Block problematic URLs
        if (arguments[2] && typeof arguments[2] === 'string' && 
            (arguments[2].includes('/views/login.html') || 
             (pageState.isLoginPage && pageState.preventRedirects && 
              Date.now() - pageState.lastNavigationTime < 5000))) {
            
            console.log('Blocked replaceState navigation to:', arguments[2]);
            return;
        }
        return originalReplaceState.apply(this, arguments);
    };
    
    // Completely override window.location for mobile devices
    if (isMobile) {
        // Save original setters and getters
        const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
        
        // Create a proxy for location that filters problematic navigations
        Object.defineProperty(window, 'location', {
            get: function() {
                return originalLocationDescriptor.get.call(this);
            },
            set: function(url) {
                // Block problematic URLs
                if (typeof url === 'string' && 
                    (url.includes('/views/login.html') || 
                     (pageState.isLoginPage && pageState.preventRedirects && 
                      Date.now() - pageState.lastNavigationTime < 5000))) {
                    
                    console.log('Blocked window.location navigation to:', url);
                    return;
                }
                return originalLocationDescriptor.set.call(this, url);
            },
            configurable: true
        });
        
        // Also block location.href, location.replace, and location.assign
        const originalDescriptor = Object.getOwnPropertyDescriptor(window.location, 'href');
        
        // Override href setter
        Object.defineProperty(window.location, 'href', {
            get: function() {
                return originalDescriptor.get.call(this);
            },
            set: function(url) {
                // Block problematic URLs
                if (typeof url === 'string' && 
                    (url.includes('/views/login.html') || 
                     (pageState.isLoginPage && pageState.preventRedirects && 
                      Date.now() - pageState.lastNavigationTime < 5000))) {
                    
                    console.log('Blocked location.href navigation to:', url);
                    return;
                }
                return originalDescriptor.set.call(this, url);
            },
            configurable: true
        });
        
        // Override location.replace
        const originalReplace = window.location.replace;
        window.location.replace = function(url) {
            // Block problematic URLs
            if (typeof url === 'string' && 
                (url.includes('/views/login.html') || 
                 (pageState.isLoginPage && pageState.preventRedirects && 
                  Date.now() - pageState.lastNavigationTime < 5000))) {
                
                console.log('Blocked location.replace navigation to:', url);
                return;
            }
            return originalReplace.call(this, url);
        };
        
        // Override location.assign
        const originalAssign = window.location.assign;
        window.location.assign = function(url) {
            // Block problematic URLs
            if (typeof url === 'string' && 
                (url.includes('/views/login.html') || 
                 (pageState.isLoginPage && pageState.preventRedirects && 
                  Date.now() - pageState.lastNavigationTime < 5000))) {
                
                console.log('Blocked location.assign navigation to:', url);
                return;
            }
            return originalAssign.call(this, url);
        };
    }
    
    // Fix all the logout buttons to use our enhanced navigation
    function fixLogoutButtons() {
        if (!isMobile) return;
        
        // Wait for DOM to be ready
        const enhanceButtons = function() {
            // Find all logout buttons
            const logoutButtons = document.querySelectorAll('#logout, #logout-mobile, [data-action="logout"]');
            
            logoutButtons.forEach(button => {
                if (button.dataset.logoutFixed) return;
                button.dataset.logoutFixed = 'true';
                
                // Add a special class and styles for visibility
                button.classList.add('enhanced-logout-btn');
                
                // Make sure it's visible and clickable
                button.style.pointerEvents = 'auto';
                button.style.cursor = 'pointer';
                button.style.opacity = '1';
                
                // Create a style tag with pulse animation for logout buttons
                if (!document.getElementById('logout-button-styles')) {
                    const style = document.createElement('style');
                    style.id = 'logout-button-styles';
                    style.textContent = `
                        .enhanced-logout-btn {
                            position: relative;
                            z-index: 9999 !important;
                            pointer-events: auto !important;
                            cursor: pointer !important;
                            opacity: 1 !important;
                        }
                        .enhanced-logout-btn:after {
                            content: '';
                            position: absolute;
                            top: -5px;
                            right: -5px;
                            bottom: -5px;
                            left: -5px;
                            z-index: -1;
                            border-radius: 4px;
                            animation: logout-pulse 2s infinite;
                            opacity: 0;
                        }
                        @keyframes logout-pulse {
                            0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); opacity: 1; }
                            70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); opacity: 0; }
                            100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Replace click handler with direct form submission
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('Enhanced logout button clicked');
                    
                    // Clear tokens and storage
                    localStorage.removeItem('jwt_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('dev_user');
                    localStorage.removeItem('userData');
                    localStorage.removeItem('supabase.auth.token');
                    sessionStorage.clear();
                    
                    // Show a visual spinner
                    const spinner = document.createElement('div');
                    spinner.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75';
                    spinner.style.zIndex = '99999';
                    spinner.innerHTML = `
                        <div class="d-flex flex-column align-items-center">
                            <div class="spinner-border text-light mb-3" role="status"></div>
                            <div class="text-light fs-5">Logging out...</div>
                        </div>
                    `;
                    document.body.appendChild(spinner);
                    
                    // Use form-based navigation
                    setTimeout(function() {
                        const form = document.createElement('form');
                        form.method = 'GET';
                        form.action = '/login';
                        form.style.display = 'none';
                        
                        // Add a logout parameter
                        const logoutParam = document.createElement('input');
                        logoutParam.type = 'hidden';
                        logoutParam.name = 'logout';
                        logoutParam.value = 'true';
                        form.appendChild(logoutParam);
                        
                        // Add a timestamp to prevent caching
                        const timestampParam = document.createElement('input');
                        timestampParam.type = 'hidden';
                        timestampParam.name = '_t';
                        timestampParam.value = Date.now().toString();
                        form.appendChild(timestampParam);
                        
                        // Append the form to the body
                        document.body.appendChild(form);
                        
                        // Submit the form after a small delay
                        setTimeout(function() {
                            form.submit();
                        }, 100);
                    }, 500);
                }, true);
            });
        };
        
        // Run when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enhanceButtons);
        } else {
            enhanceButtons();
        }
        
        // Also run periodically to catch dynamically added buttons
        setInterval(enhanceButtons, 1000);
    }
    
    // Initialize button fixing
    fixLogoutButtons();
    
    // Block any immediate attempts to redirect
    if (pageState.isLoginPage) {
        console.log('On login page at script load, blocking initial redirects');
        
        // After the page loads, monitor for redirects
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Login page loaded, monitoring for problematic redirects');
            
            // Find any scripts that might be redirecting and disable them
            const scripts = document.querySelectorAll('script:not([src])');
            for (let i = 0; i < scripts.length; i++) {
                const scriptContent = scripts[i].textContent || '';
                if (scriptContent.includes('/views/login.html') || 
                    scriptContent.includes('window.location') ||
                    scriptContent.includes('location.href')) {
                    
                    console.log('Found potentially problematic script:', scriptContent.substring(0, 100) + '...');
                    // Don't disable the script as it might break functionality,
                    // but we've already blocked the problematic navigation methods
                }
            }
        });
    }
    
    // Handle errors and refresh the page if we detect the specific error
    window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('/views/login.html')) {
            console.log('Caught error related to login.html, redirecting to /login');
            
            // Use form-based navigation to /login
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = '/login';
            form.style.display = 'none';
            
            // Add a timestamp to prevent caching
            const timestampParam = document.createElement('input');
            timestampParam.type = 'hidden';
            timestampParam.name = '_t';
            timestampParam.value = Date.now().toString();
            form.appendChild(timestampParam);
            
            // Append the form to the body
            document.body.appendChild(form);
            
            // Submit the form after a small delay
            setTimeout(function() {
                form.submit();
            }, 100);
        }
    });
    
    // Function to detect if we're on an error page
    function isErrorPage() {
        // Safely check if document.body exists
        if (!document || !document.body) {
            return false;
        }
        
        const bodyText = document.body.textContent || '';
        return bodyText.includes('cannot GET') || 
               bodyText.includes('Error: Not Found') || 
               bodyText.includes('Cannot GET /views/login.html') ||
               (document.title && document.title.includes('Error'));
    }
    
    // Check for error page on load and immediately redirect if needed
    function checkForErrorAndRedirect() {
    if (isErrorPage()) {
        console.log('Detected error page, performing immediate clean redirect');
        
        // Clear ALL storage immediately
        try {
            // Remove all problematic tokens
            ['jwt_token', 'token', 'dev_user', 'userData', 'supabase.auth.token'].forEach(key => {
                try { localStorage.removeItem(key); } catch(e) {}
            });
            
            // Clear session storage to prevent redirect loops
            sessionStorage.clear();
            
            // Clear cookies that might be causing issues
            document.cookie.split(';').forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                if (name && name !== '') {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
            });
        } catch(e) {
            console.error('Error clearing storage:', e);
        }
        
        // Use the most direct approach - replace current location immediately
        window.location.replace('/login?clean=true&auto=true&t=' + Date.now());
        return true;
    }
    return false;
}

    // Run error check immediately
    if (checkForErrorAndRedirect()) {
        // If we're redirecting, don't continue executing the rest of the script
        throw new Error('Redirecting from error page');
    }

    // Handle errors and refresh the page if we detect the specific error
    window.addEventListener('error', function(e) {
        if (e.message && (e.message.includes('/views/login.html') || e.message.includes('cannot GET'))) {
            console.log('Caught error related to navigation, redirecting to login');
            
            // Clear storage and redirect immediately
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('dev_user');
            sessionStorage.clear();
            
            window.location.replace('/login?error=true&t=' + Date.now());
        }
    });
    
    // Also check periodically for error pages (in case they appear after initial load)
    setTimeout(checkForErrorAndRedirect, 500);
})(); // Properly close the IIFE
