/**
 * TrashDrop Mobile Logout Fix
 * This script specifically addresses the "cannot GET /views/login.html" error 
 * that occurs on mobile devices after logout.
 */

(function() {
    console.log('Mobile logout fix initialized');
    
    // Detect if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) {
        console.log('Not a mobile device, mobile logout fix not needed');
        return;
    }
    
    // Detect if we're currently on an error page
    function isErrorPage() {
        // Check if the page contains error text
        const bodyText = document.body.textContent || '';
        return bodyText.includes('cannot GET /views/login.html') || 
               bodyText.includes('Error: Not Found') ||
               bodyText.includes('cannot GET');
    }
    
    // Check if we need to redirect (we're on an error page)
    function checkAndRedirect() {
        // Immediately redirect to login without showing any error pages
        if (isErrorPage()) {
            console.log('Detected error page, immediately redirecting to login');
            
            // Clear ALL problematic storage
            try {
                const storageKeys = ['jwt_token', 'token', 'dev_user', 'userData', 'supabase.auth.token'];
                storageKeys.forEach(key => {
                    localStorage.removeItem(key);
                });
                sessionStorage.clear();
                
                // Clear cookies that might be causing issues
                document.cookie.split(';').forEach(cookie => {
                    const name = cookie.split('=')[0].trim();
                    if (name && name !== '') {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    }
                });
            } catch (e) {
                console.error('Error clearing storage:', e);
            }
            
            // Most direct approach - immediately redirect
            const timestamp = Date.now();
            window.location.replace(`/login?clean=true&t=${timestamp}`);
        }
    }
    
    // Monitor for navigation errors
    function setupErrorMonitoring() {
        // Check immediately
        checkAndRedirect();
        
        // Also set up periodic checks for a short time
        let checkCount = 0;
        const maxChecks = 5;
        const checkInterval = setInterval(function() {
            checkCount++;
            checkAndRedirect();
            
            if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
            }
        }, 500);
        
        // Also listen for any error events
        window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('/views/login.html')) {
                console.log('Caught error event for login.html, redirecting');
                checkAndRedirect();
            }
        });
    }
    
    // Function to patch all logout buttons to use form submission
    function patchLogoutButtons() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', findAndPatchButtons);
        } else {
            findAndPatchButtons();
        }
        
        // Also set up a MutationObserver to catch dynamically added buttons
        const observer = new MutationObserver(function(mutations) {
            findAndPatchButtons();
        });
        
        // Start observing once DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
    
    // Find and patch logout buttons
    function findAndPatchButtons() {
        // Find all logout buttons
        const logoutButtons = [
            ...document.querySelectorAll('a#logout, a#logout-mobile, [data-action="logout"]'),
            ...document.querySelectorAll('a[href*="logout"], button[id*="logout"]')
        ];
        
        logoutButtons.forEach(button => {
            // Skip if already patched
            if (button.dataset.logoutPatched === 'true') return;
            
            // Mark as patched
            button.dataset.logoutPatched = 'true';
            
            // Replace the click handler
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Patched logout button clicked');
                
                // Clear auth data
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('token');
                localStorage.removeItem('dev_user');
                localStorage.removeItem('userData');
                localStorage.removeItem('supabase.auth.token');
                sessionStorage.clear();
                
                // Use form navigation
                const form = document.createElement('form');
                form.method = 'GET';
                form.action = '/login';
                
                // Add logout parameter
                const logoutParam = document.createElement('input');
                logoutParam.type = 'hidden';
                logoutParam.name = 'logout';
                logoutParam.value = 'true';
                form.appendChild(logoutParam);
                
                // Add timestamp
                const timestampParam = document.createElement('input');
                timestampParam.type = 'hidden';
                timestampParam.name = 't';
                timestampParam.value = new Date().getTime();
                form.appendChild(timestampParam);
                
                // Submit the form
                document.body.appendChild(form);
                form.submit();
            }, true);
        });
    }
    
    // Initialize the fixes
    setupErrorMonitoring();
    patchLogoutButtons();
    
    // Export for debugging
    window.MobileLogoutFix = {
        checkAndRedirect: checkAndRedirect,
        patchLogoutButtons: patchLogoutButtons
    };
})();
