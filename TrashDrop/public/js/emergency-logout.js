/**
 * TrashDrop Emergency Logout System
 * This standalone script provides a reliable emergency logout functionality
 * that works independently of the main application code.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize emergency logout functionality
    initEmergencyLogout();
    
    // Setup keyboard shortcut (Ctrl+Alt+L)
    setupKeyboardShortcut();
});

/**
 * Initialize the emergency logout functionality
 */
function initEmergencyLogout() {
    // Get all emergency logout buttons
    const emergencyLogoutButtons = document.querySelectorAll('#emergency-logout, #emergency-logout-fixed, [data-action="emergency-logout"]');
    
    // Add click event listener to each button
    emergencyLogoutButtons.forEach(button => {
        button.addEventListener('click', performEmergencyLogout);
    });
    
    // Create fixed emergency logout button if it doesn't exist
    if (!document.getElementById('emergency-logout-fixed')) {
        createFixedEmergencyLogoutButton();
    }
}

/**
 * Create a fixed position emergency logout button
 */
function createFixedEmergencyLogoutButton() {
    const button = document.createElement('button');
    button.id = 'emergency-logout-fixed';
    button.className = 'btn btn-danger btn-sm';
    button.innerHTML = '<i class="bi bi-power"></i> Emergency Logout';
    button.addEventListener('click', performEmergencyLogout);
    
    document.body.appendChild(button);
}

/**
 * Perform the emergency logout
 */
function performEmergencyLogout() {
    console.log('Emergency logout initiated');
    
    // Show loading spinner
    showLoadingSpinner('Logging out...');
    
    // Set a flag to prevent redirect loops
    sessionStorage.setItem('logging_out', 'true');
    sessionStorage.setItem('emergency_logout', 'true');
    
    // Clear all session data
    clearAllSessionData()
        .then(() => {
            // Add a visual feedback that logout is in progress
            document.body.classList.add('emergency-logout-in-progress');
            
            console.log('Emergency logout: All data cleared, redirecting to login');
            
            // Use replace instead of href to prevent history issues
            try {
                // Primary approach - replace current history entry
                window.location.replace('/login?emergency=true');
                
                // Fallback approaches with delays
                setTimeout(() => {
                    if (window.location.pathname !== '/login') {
                        console.log('Emergency fallback: still not on login page, trying alternate method');
                        document.location.href = '/login?emergency=true';
                    }
                }, 300);
                
                // Final fallback
                setTimeout(() => {
                    if (window.location.pathname !== '/login') {
                        console.log('Emergency final fallback: forced redirect');
                        window.location = '/login?emergency=true&forced=true';
                    }
                }, 500);
            } catch (e) {
                console.error('Emergency logout navigation error:', e);
                // If all else fails, try a simple assignment
                window.location = '/login?emergency=true&error=true';
            }
        });
}

/**
 * Clear all session data
 */
async function clearAllSessionData() {
    try {
        console.log('Emergency logout: Clearing all session data');
        
        // Explicitly remove auth tokens
        localStorage.removeItem('token');
        localStorage.removeItem('dev_user');
        localStorage.removeItem('supabase.auth.token');
        
        // Keep the logging_out flag in sessionStorage
        const loggingOutFlag = sessionStorage.getItem('logging_out');
        const emergencyFlag = sessionStorage.getItem('emergency_logout');
        
        // Clear localStorage
        localStorage.clear();
        
        // Clear sessionStorage but preserve our logout flags
        sessionStorage.clear();
        sessionStorage.setItem('logging_out', loggingOutFlag);
        sessionStorage.setItem('emergency_logout', emergencyFlag);
        
        // Expire all cookies
        document.cookie.split(';').forEach(cookie => {
            document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
        });
        
        // Call server-side logout - add timeout
        try {
            const logoutPromiseTimeout = new Promise(resolve => setTimeout(resolve, 1000));
            
            const serverLogoutPromise = fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('Server logout response status:', response.status);
                return true;
            })
            .catch(error => {
                console.warn('Server logout failed, continuing anyway:', error);
                return true;
            });
            
            // Race between server response and timeout
            await Promise.race([serverLogoutPromise, logoutPromiseTimeout]);
            console.log('Logout request completed or timed out');
        } catch (logoutError) {
            console.error('Error during server logout:', logoutError);
        }
            
    } catch (e) {
        console.error('Error during emergency logout:', e);
    }
    
    // Return true to indicate completion regardless of errors
    return true;
}

/**
 * Show loading spinner
 */
function showLoadingSpinner(message) {
    // Create spinner overlay if it doesn't exist
    if (!document.querySelector('.spinner-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'spinner-overlay';
        overlay.innerHTML = `
            <div class="spinner-container">
                <div class="spinner-border text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-white mt-2">${message || 'Loading...'}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

/**
 * Setup keyboard shortcut for emergency logout (Ctrl+Alt+L)
 */
function setupKeyboardShortcut() {
    document.addEventListener('keydown', function(event) {
        // Check for Ctrl+Alt+L
        if (event.ctrlKey && event.altKey && event.key === 'l') {
            event.preventDefault();
            performEmergencyLogout();
        }
    });
}
