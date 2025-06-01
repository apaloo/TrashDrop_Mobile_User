/**
 * EMERGENCY REFRESH LOOP STOPPER
 * This script's only purpose is to detect and break refresh loops
 * It must be the FIRST script loaded on every page
 */

(function() {
    // Don't run this script if it's already been executed in this page
    if (window._refreshLoopChecked) return;
    window._refreshLoopChecked = true;
    
    // Track page loads to detect refresh loops
    const now = Date.now();
    let recentLoads = [];
    
    try {
        // Get stored timestamps from sessionStorage
        recentLoads = JSON.parse(sessionStorage.getItem('_pageLoadTimes') || '[]');
        
        // Add current timestamp
        recentLoads.push(now);
        
        // Keep only recent timestamps (last 10 seconds)
        recentLoads = recentLoads.filter(time => now - time < 10000);
        
        // Save back to sessionStorage
        sessionStorage.setItem('_pageLoadTimes', JSON.stringify(recentLoads));
        
        // Count rapid page loads (within 3 seconds)
        const rapidLoads = recentLoads.filter(time => now - time < 3000).length;
        
        // If we've had 3+ rapid page loads, this is likely a refresh loop
        if (rapidLoads >= 3) {
            console.error('❌ EMERGENCY: Refresh loop detected! Breaking the loop');
            
            // Clear all storage that might be causing the loop
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('token');
            localStorage.removeItem('dev_user');
            localStorage.removeItem('userData');
            localStorage.removeItem('supabase.auth.token');
            
            // Only keep this flag in sessionStorage
            const tempValue = sessionStorage.getItem('_pageLoadTimes');
            sessionStorage.clear();
            sessionStorage.setItem('_pageLoadTimes', tempValue);
            sessionStorage.setItem('_loopBroken', 'true');
            
            // Prevent any automatic navigation
            const preventNavigation = function() {
                // Save original methods before replacing
                const originalPushState = history.pushState;
                const originalReplaceState = history.replaceState;
                const originalAssign = window.location.assign;
                const originalReplace = window.location.replace;
                
                // Block history API methods
                history.pushState = function() {
                    console.log('⛔ Blocked pushState to prevent refresh loop');
                    return;
                };
                
                history.replaceState = function() {
                    console.log('⛔ Blocked replaceState to prevent refresh loop');
                    return;
                };
                
                // Block location methods
                window.location.assign = function() {
                    console.log('⛔ Blocked location.assign to prevent refresh loop');
                    return;
                };
                
                window.location.replace = function() {
                    console.log('⛔ Blocked location.replace to prevent refresh loop');
                    return;
                };
                
                // Block setting location.href
                try {
                    Object.defineProperty(window.location, 'href', {
                        get: function() {
                            return window.location.toString();
                        },
                        set: function() {
                            console.log('⛔ Blocked setting location.href to prevent refresh loop');
                            return;
                        }
                    });
                } catch (e) {
                    console.error('Could not override location.href:', e);
                }
                
                // Clear any existing redirect timers
                for (let i = 1; i < 10000; i++) {
                    clearTimeout(i);
                }
                
                // If we're on a problematic error page, show a recovery message
                setTimeout(function() {
                    if (document.body && document.body.textContent.includes('cannot GET')) {
                        document.body.innerHTML = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
                                <h2 style="color: #4CAF50;">TrashDrop</h2>
                                <p>A navigation issue was detected and has been resolved.</p>
                                <p>Use these links to continue:</p>
                                <div style="margin: 20px 0;">
                                    <a href="/login" style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; border-radius: 4px;">Login Page</a>
                                    <a href="/dashboard" style="display: inline-block; background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; border-radius: 4px;">Dashboard</a>
                                </div>
                                <p style="color: #666; font-size: 14px;">Click one of the links above to continue.</p>
                            </div>
                        `;
                    }
                }, 100);
            };
            
            // Prevent navigation immediately
            preventNavigation();
            
            // Prevent form submissions
            document.addEventListener('submit', function(e) {
                console.log('⛔ Blocked form submission to prevent refresh loop');
                e.preventDefault();
                return false;
            }, true);
        }
    } catch (e) {
        console.error('Error in refresh loop detection:', e);
    }
})();
