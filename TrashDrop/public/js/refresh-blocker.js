/**
 * TrashDrop Refresh Loop Blocker
 * This script is designed to be THE solution for refresh loops.
 * It takes a minimalist, direct approach with no dependencies.
 */

(function() {
    console.log('🛑 TrashDrop Refresh Loop Blocker active');
    
    // 1. STEP ONE: DETECT IF WE'RE IN A LOOP
    
    // Track page loads within short timeframes
    const now = Date.now();
    let recentLoads = [];
    let loopDetected = false;
    
    try {
        // Get stored timestamps from sessionStorage
        recentLoads = JSON.parse(sessionStorage.getItem('__pageLoadTimes') || '[]');
        
        // Add current timestamp
        recentLoads.push(now);
        
        // Keep only recent timestamps (last 5 seconds)
        recentLoads = recentLoads.filter(time => now - time < 5000);
        
        // Save back to sessionStorage
        sessionStorage.setItem('__pageLoadTimes', JSON.stringify(recentLoads));
        
        // If we have 3+ page loads in 5 seconds, we're in a loop
        loopDetected = recentLoads.length >= 3;
        
        if (loopDetected) {
            console.error('🔄 REFRESH LOOP DETECTED - Breaking the cycle');
            sessionStorage.setItem('__loopDetected', 'true');
        }
    } catch (e) {
        console.error('Error in refresh detection:', e);
    }
    
    // 2. STEP TWO: CHECK IF WE'RE ON AN ERROR PAGE
    
    // Function to detect error pages - safely check for document.body
    function isErrorPage() {
        // Check if document.body exists - it might not be available when script runs
        if (!document || !document.body) {
            return false;
        }
        
        const bodyText = document.body.textContent || '';
        return bodyText.includes('cannot GET') || 
               bodyText.includes('Error: Not Found') || 
               bodyText.includes('Cannot GET /views/login.html');
    }
    
    // 3. STEP THREE: AGGRESSIVELY BLOCK REFRESH LOOPS
    
    // If we're in a loop OR on an error page OR already detected a loop, take action
    if (loopDetected || isErrorPage() || sessionStorage.getItem('__loopDetected') === 'true') {
        console.log('🚫 Blocking all automatic redirects');
        
        // Clear problematic storage that could be causing redirects
        try {
            // List of items that could be causing auth/redirect issues
            const problematicItems = [
                'jwt_token', 
                'token', 
                'dev_user', 
                'userData', 
                'supabase.auth.token'
            ];
            
            // Remove from localStorage
            problematicItems.forEach(item => {
                try { localStorage.removeItem(item); } catch(e) {}
            });
            
            // Clear redirect-related items from sessionStorage
            // but preserve our loop detection data
            const loopData = sessionStorage.getItem('__pageLoadTimes');
            const loopDetected = sessionStorage.getItem('__loopDetected');
            sessionStorage.clear();
            sessionStorage.setItem('__pageLoadTimes', loopData);
            if (loopDetected) {
                sessionStorage.setItem('__loopDetected', loopDetected);
            }
            
            // Clear cookies related to auth or redirects
            document.cookie.split(';').forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                if (name && (name.includes('token') || name.includes('redirect') || name.includes('count'))) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                }
            });
        } catch (e) {
            console.error('Error clearing storage:', e);
        }
        
        // 4. STEP FOUR: BLOCK ALL NAVIGATION METHODS
        
        // Block window.location redirects
        try {
            // Save original methods
            const originalAssign = window.location.assign;
            const originalReplace = window.location.replace;
            const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
            
            // Override assign and replace to do nothing for problematic URLs
            window.location.assign = function(url) {
                if (typeof url === 'string' && (
                    url.includes('/views/login.html') || 
                    url.includes('cannot GET')
                )) {
                    console.log('🚫 Blocked redirect to:', url);
                    return;
                }
                return originalAssign.apply(this, arguments);
            };
            
            window.location.replace = function(url) {
                if (typeof url === 'string' && (
                    url.includes('/views/login.html') || 
                    url.includes('cannot GET')
                )) {
                    console.log('🚫 Blocked replace to:', url);
                    return;
                }
                return originalReplace.apply(this, arguments);
            };
            
            // Block setting location.href for problematic URLs
            if (originalHref && originalHref.configurable) {
                Object.defineProperty(window.location, 'href', {
                    get: function() {
                        return originalHref.get.call(this);
                    },
                    set: function(url) {
                        if (typeof url === 'string' && (
                            url.includes('/views/login.html') || 
                            url.includes('cannot GET')
                        )) {
                            console.log('🚫 Blocked setting href to:', url);
                            return;
                        }
                        return originalHref.set.call(this, url);
                    },
                    configurable: true
                });
            }
        } catch (e) {
            console.error('Error blocking navigation:', e);
        }
        
        // Block history API redirects
        try {
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function() {
                if (arguments[2] && typeof arguments[2] === 'string' && (
                    arguments[2].includes('/views/login.html') ||
                    arguments[2].includes('cannot GET')
                )) {
                    console.log('🚫 Blocked pushState to:', arguments[2]);
                    return;
                }
                return originalPushState.apply(this, arguments);
            };
            
            history.replaceState = function() {
                if (arguments[2] && typeof arguments[2] === 'string' && (
                    arguments[2].includes('/views/login.html') ||
                    arguments[2].includes('cannot GET')
                )) {
                    console.log('🚫 Blocked replaceState to:', arguments[2]);
                    return;
                }
                return originalReplaceState.apply(this, arguments);
            };
        } catch (e) {
            console.error('Error blocking history:', e);
        }
        
        // 5. STEP FIVE: RECOVER FROM ERROR PAGES
        
        // If we're on an error page, provide recovery
        if (isErrorPage()) {
            console.log('📄 Error page detected, providing recovery options');
            
            // Replace the page content with a recovery UI
            setTimeout(() => {
                document.body.innerHTML = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
                        <h2 style="color: #4CAF50;">TrashDrop</h2>
                        <p>The page you were looking for couldn't be found.</p>
                        <div style="margin: 20px 0;">
                            <a href="/login" onclick="localStorage.clear(); sessionStorage.clear();" 
                               style="display: inline-block; background: #4CAF50; color: white; 
                                      padding: 10px 20px; text-decoration: none; margin: 5px; 
                                      border-radius: 4px;">Go to Login</a>
                        </div>
                    </div>
                `;
            }, 100);
        }
    }
})();
