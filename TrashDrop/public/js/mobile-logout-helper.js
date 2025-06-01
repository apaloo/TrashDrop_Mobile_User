/**
 * TrashDrop Mobile Logout Helper
 * This script runs on the login page to ensure proper handling of logout redirects
 * and prevent any refresh loops from occurring
 */

(function() {
    console.log('Mobile logout helper initialized');
    
    // Check if this page was loaded as part of a logout process
    const urlParams = new URLSearchParams(window.location.search);
    const isLogout = urlParams.has('logout');
    const isDirectRedirect = urlParams.has('direct');
    
    if (isLogout) {
        console.log('Login page loaded after logout');
        
        // Immediately prevent any further redirects
        window.stopAllRedirects = true;
        
        // Store a flag in session storage to indicate this logout was handled
        sessionStorage.setItem('logout_handled', 'true');
        sessionStorage.setItem('last_logout_time', Date.now().toString());
        
        // Clear any redirection cookies
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (name.includes('redirect') || name.includes('count')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });
        
        // Ensure clean state by removing any tokens or userData
        ['jwt_token', 'token', 'dev_user', 'userData', 'supabase.auth.token'].forEach(key => {
            try { 
                localStorage.removeItem(key); 
            } catch (e) { 
                console.log('Error removing', key, e); 
            }
        });
        
        // Create a notification to indicate successful logout
        const createNotification = () => {
            // Check if the notification already exists
            if (document.querySelector('.logout-notification')) return;
            
            const notification = document.createElement('div');
            notification.className = 'logout-notification';
            notification.style.position = 'fixed';
            notification.style.top = '10px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = '#4CAF50';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            notification.style.zIndex = '9999';
            notification.style.textAlign = 'center';
            notification.style.maxWidth = '80%';
            notification.style.fontSize = '14px';
            notification.style.animation = 'fadeInOut 3s forwards';
            
            // Add animation style
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
            
            notification.textContent = 'Successfully logged out';
            
            document.body.appendChild(notification);
            
            // Remove notification after animation
            setTimeout(() => {
                notification.remove();
            }, 3000);
        };
        
        // Wait for DOM to be ready before showing notification
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createNotification);
        } else {
            createNotification();
        }
    }
    
    // Detect rapid refreshes that might indicate a loop
    const checkForRefreshLoop = () => {
        const lastLogoutTime = parseInt(sessionStorage.getItem('last_logout_time') || '0');
        const now = Date.now();
        
        // If we've loaded this page within 1 second of the last logout
        // AND we're not on a direct redirect, this might be a refresh loop
        if (now - lastLogoutTime < 1000 && !isDirectRedirect) {
            console.warn('Possible refresh loop detected');
            
            // Store a flag to prevent further refreshes
            sessionStorage.setItem('refresh_loop_detected', 'true');
            
            // Show a notification that we've stopped a refresh loop
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
            notification.textContent = 'Refresh loop prevented';
            
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => notification.remove(), 3000);
        }
        
        // Update the last time we checked
        sessionStorage.setItem('last_logout_time', now.toString());
    };
    
    // Run the refresh loop check
    checkForRefreshLoop();
    
    // Ensure the login form focuses on the first input when shown
    const focusLoginForm = () => {
        const phoneInput = document.querySelector('input[type="tel"]');
        if (phoneInput) {
            setTimeout(() => phoneInput.focus(), 500);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', focusLoginForm);
    } else {
        focusLoginForm();
    }
    
    // Fix any navigation attempts to views/login.html
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    
    window.location.assign = function(url) {
        if (url && url.includes('/views/login.html')) {
            console.log('Blocking navigation to', url);
            return;
        }
        return originalAssign.apply(this, arguments);
    };
    
    window.location.replace = function(url) {
        if (url && url.includes('/views/login.html')) {
            console.log('Blocking replace to', url);
            return;
        }
        return originalReplace.apply(this, arguments);
    };
})();
