/**
 * TrashDrop Loop Breaker
 * Highest priority script to detect and stop refresh loops
 * This runs before any other scripts to ensure loops are broken
 */

(function() {
    console.log('⚠️ Loop breaker activated');
    
    // Critical: Check if we're in a refresh loop by analyzing timestamps
    const now = Date.now();
    const timestamps = JSON.parse(sessionStorage.getItem('page_timestamps') || '[]');
    
    // Add current timestamp
    timestamps.push(now);
    
    // Only keep the last 5 timestamps
    if (timestamps.length > 5) {
        timestamps.shift();
    }
    
    // Save updated timestamps
    sessionStorage.setItem('page_timestamps', JSON.stringify(timestamps));
    
    // Check for loop pattern (multiple page loads in short succession)
    let isInLoop = false;
    if (timestamps.length >= 3) {
        // Calculate time differences between consecutive timestamps
        const timeDiffs = [];
        for (let i = 1; i < timestamps.length; i++) {
            timeDiffs.push(timestamps[i] - timestamps[i-1]);
        }
        
        // Check if we have multiple rapid reloads (less than 1.5 seconds apart)
        const rapidReloads = timeDiffs.filter(diff => diff < 1500).length;
        isInLoop = rapidReloads >= 2; // At least 2 rapid reloads
    }
    
    // Record URLs to detect redirects between the same pages
    const currentUrl = window.location.href;
    const urlHistory = JSON.parse(sessionStorage.getItem('url_history') || '[]');
    urlHistory.push(currentUrl);
    if (urlHistory.length > 5) urlHistory.shift();
    sessionStorage.setItem('url_history', JSON.stringify(urlHistory));
    
    // Check for alternating pattern between the same URLs
    let hasUrlLoop = false;
    if (urlHistory.length >= 3) {
        // Count occurrences of each URL
        const urlCounts = {};
        urlHistory.forEach(url => {
            urlCounts[url] = (urlCounts[url] || 0) + 1;
        });
        
        // If any URL appears 3 or more times, consider it a loop
        hasUrlLoop = Object.values(urlCounts).some(count => count >= 3);
    }
    
    // TAKE ACTION if loop detected
    if (isInLoop || hasUrlLoop) {
        console.error('🚨 REFRESH LOOP DETECTED! Breaking the loop...');
        
        // Set emergency flag
        sessionStorage.setItem('emergency_loop_break', 'true');
        
        // Stop all scripts from redirecting
        window.stopAllRedirects = true;
        
        // Display a helpful message to the user
        const isErrorPage = document.body.textContent.includes('cannot GET');
        
        if (isErrorPage) {
            // We're on an error page, show a helpful message
            document.body.innerHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                    <h2 style="color: #4CAF50;">TrashDrop</h2>
                    <p>We detected a navigation issue and stopped automatic redirects.</p>
                    <p>Please use one of these options to continue:</p>
                    <div style="display: flex; justify-content: space-around; margin-top: 20px;">
                        <a href="/login" style="text-decoration: none; padding: 10px 20px; background-color: #4CAF50; color: white; border-radius: 4px; font-weight: bold;">Go to Login</a>
                        <a href="/dashboard" style="text-decoration: none; padding: 10px 20px; background-color: #2196F3; color: white; border-radius: 4px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                    <p style="margin-top: 20px; font-size: 0.8em; color: #666;">If you continue experiencing issues, please clear your browser cache and try again.</p>
                </div>
            `;
        } else if (window.location.pathname === '/login') {
            // We're already on login page, just make sure it doesn't redirect
            console.log('Already on login page, stabilizing...');
            
            // Stop any form submissions or redirects by adding a block
            document.addEventListener('submit', function(e) {
                if (sessionStorage.getItem('emergency_loop_break') === 'true') {
                    e.preventDefault();
                    console.log('Blocked form submission during emergency mode');
                }
            }, true);
            
            // Show a small notification that we've stopped redirects
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.bottom = '10px';
            notification.style.right = '10px';
            notification.style.backgroundColor = '#FFC107';
            notification.style.color = '#333';
            notification.style.padding = '8px 12px';
            notification.style.borderRadius = '4px';
            notification.style.fontSize = '14px';
            notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            notification.style.zIndex = '9999';
            notification.textContent = 'Refresh loop detected and stopped';
            
            // Add notification after a slight delay
            setTimeout(() => {
                document.body.appendChild(notification);
                // Remove after 5 seconds
                setTimeout(() => notification.remove(), 5000);
            }, 1000);
        }
        
        // Clear stored tokens that might be causing the loop
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('token');
        sessionStorage.removeItem('redirect_count');
        sessionStorage.removeItem('login_redirect_handled');
        sessionStorage.removeItem('error_redirect_count');
        
        // Block history API methods
        if (window.history.pushState) {
            const originalPushState = window.history.pushState;
            window.history.pushState = function() {
                if (sessionStorage.getItem('emergency_loop_break') === 'true') {
                    console.log('Blocked history.pushState during emergency mode');
                    return;
                }
                return originalPushState.apply(this, arguments);
            };
        }
        
        if (window.history.replaceState) {
            const originalReplaceState = window.history.replaceState;
            window.history.replaceState = function() {
                if (sessionStorage.getItem('emergency_loop_break') === 'true') {
                    console.log('Blocked history.replaceState during emergency mode');
                    return;
                }
                return originalReplaceState.apply(this, arguments);
            };
        }
    }
})();
