/**
 * TrashDrop Mobile Login Page Stabilizer
 * Specifically designed to prevent refresh loops on login/signup pages on mobile devices
 * Must be included as the FIRST script on login-related pages
 */

(function() {
    // Execute only once per page load
    if (window._mobileLoginStabilized) return;
    window._mobileLoginStabilized = true;
    
    console.log('🔒 Mobile Login Stabilizer activated');
    
    // PART 1: IMMEDIATE ACTIONS - Stop any ongoing redirects
    
    // Detect if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Force clear any authentication data that might be causing loops
    function clearAllAuthData() {
        try {
            // Clear local storage items related to auth
            const authKeys = [
                'jwt_token', 'token', 'dev_user', 'userData', 
                'supabase.auth.token', 'authRedirect', 'redirectAfterLogin',
                'loginRedirectUrl'
            ];
            
            authKeys.forEach(key => {
                try { localStorage.removeItem(key); } catch(e) {}
            });
            
            // Clear session storage except for our loop detection
            const loopDetection = sessionStorage.getItem('_mobileLoopDetection');
            sessionStorage.clear();
            if (loopDetection) {
                sessionStorage.setItem('_mobileLoopDetection', loopDetection);
            }
            
            // Clear cookies related to auth and redirection
            document.cookie.split(';').forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                if (name.includes('auth') || name.includes('redirect') || 
                    name.includes('count') || name.includes('token')) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
            });
            
            console.log('🧹 Auth data cleared to prevent refresh loops');
        } catch(e) {
            console.error('Error clearing auth data:', e);
        }
    }
    
    // PART 2: LOOP DETECTION - Track page loads to detect refresh loops
    
    // Initialize loop detection
    function initLoopDetection() {
        const now = Date.now();
        let pageLoads = [];
        
        try {
            // Get stored page loads
            pageLoads = JSON.parse(sessionStorage.getItem('_mobileLoopDetection') || '[]');
            
            // Add current load
            pageLoads.push(now);
            
            // Keep only recent loads (last 15 seconds)
            pageLoads = pageLoads.filter(time => now - time < 15000);
            
            // Save back to storage
            sessionStorage.setItem('_mobileLoopDetection', JSON.stringify(pageLoads));
            
            // Check for rapid page loads (within 5 seconds)
            const rapidLoads = pageLoads.filter(time => now - time < 5000).length;
            
            // If we have 3+ rapid loads, this is likely a refresh loop
            if (rapidLoads >= 3) {
                console.error('⚠️ Mobile refresh loop detected! Taking emergency action');
                
                // Take emergency action
                handleRefreshLoop();
                
                return true; // Loop detected
            }
        } catch(e) {
            console.error('Error in loop detection:', e);
        }
        
        return false; // No loop detected
    }
    
    // PART 3: LOOP HANDLING - Take action when a loop is detected
    
    // Handle refresh loop
    function handleRefreshLoop() {
        // Clear all auth data
        clearAllAuthData();
        
        // Mark that we've handled a loop
        sessionStorage.setItem('_loopHandled', 'true');
        
        // Show user feedback if we're on mobile
        if (isMobile) {
            showLoopHandledMessage();
        }
        
        // Block navigation attempts
        blockNavigation();
    }
    
    // Block navigation attempts that might cause loops
    function blockNavigation() {
        // Save original methods
        const originalAssign = window.location.assign;
        const originalReplace = window.location.replace;
        const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
        
        // Block location.assign
        window.location.assign = function(url) {
            if (shouldBlockUrl(url)) {
                console.log('🛑 Blocked navigation to:', url);
                return;
            }
            return originalAssign.apply(this, arguments);
        };
        
        // Block location.replace
        window.location.replace = function(url) {
            if (shouldBlockUrl(url)) {
                console.log('🛑 Blocked replace to:', url);
                return;
            }
            return originalReplace.apply(this, arguments);
        };
        
        // Block location.href setting
        if (originalHref && originalHref.set) {
            Object.defineProperty(window.location, 'href', {
                get: originalHref.get,
                set: function(url) {
                    if (shouldBlockUrl(url)) {
                        console.log('🛑 Blocked href setting to:', url);
                        return;
                    }
                    return originalHref.set.apply(this, arguments);
                },
                configurable: true
            });
        }
        
        // Check if we should block a URL
        function shouldBlockUrl(url) {
            // If we've handled a loop, block problematic redirects
            if (sessionStorage.getItem('_loopHandled')) {
                return url.includes('/views/') || 
                       url.includes('?redirect=') || 
                       url.includes('error=');
            }
            return false;
        }
    }
    
    // Show a message to the user that we've handled the loop
    function showLoopHandledMessage() {
        // Wait for DOM to be ready
        function createMessage() {
            // Don't create multiple messages
            if (document.querySelector('.loop-handled-message')) return;
            
            // Create message element
            const message = document.createElement('div');
            message.className = 'loop-handled-message alert alert-info';
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
            
            message.innerHTML = `
                <p style="margin:0"><strong>Page refreshing stopped</strong></p>
                <p style="margin:5px 0 0;font-size:14px">Login stabilized for mobile access</p>
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
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createMessage);
        } else {
            createMessage();
        }
    }
    
    // PART 4: INITIALIZATION - Run our protection

    // Run initial loop detection
    const loopDetected = initLoopDetection();
    
    // If we're on a mobile device, always clear problematic auth data
    if (isMobile) {
        // These specific keys have been causing issues on mobile
        ['redirectCount', 'lastRedirectTime'].forEach(key => {
            try { sessionStorage.removeItem(key); } catch(e) {}
        });
    }
    
    // If loop detected or we've previously handled a loop, preemptively block navigation
    if (loopDetected || sessionStorage.getItem('_loopHandled')) {
        blockNavigation();
    }
    
    // For signup page: fix form submission issues by preventing double-redirects
    document.addEventListener('DOMContentLoaded', function() {
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            console.log('📝 Stabilizing signup form submission');
            signupForm.addEventListener('submit', function(e) {
                // Check if we've already submitted this form
                if (this.dataset.submitted === 'true') {
                    console.log('🛑 Preventing duplicate form submission');
                    e.preventDefault();
                    return false;
                }
                this.dataset.submitted = 'true';
            });
        }
    });
})();
