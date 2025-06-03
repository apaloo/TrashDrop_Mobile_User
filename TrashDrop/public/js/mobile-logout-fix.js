/**
 * TrashDrop Mobile Logout Fix
 * This script ensures logout buttons work consistently on mobile devices
 * and handles any authentication-related issues during logout.
 */

// Handle logout click with proper cleanup and redirection
function handleLogoutClick(e) {
    console.log('[MobileLogout] Handling logout click');
    
    // Prevent default action
    if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    } else {
        // If no event object, try to get the button from window.event
        e = window.event;
        if (e) {
            e.returnValue = false;
            e.cancelBubble = true;
        }
    }
    
    // Clear storage and redirect
    clearAuthData();
    redirectToLogin();
}

// Clear authentication data from all storage locations
function clearAuthData() {
    const storageKeys = [
        'jwt_token', 'token', 'dev_user', 'userData', 
        'supabase.auth.token', 'sb-auth-token', 'sb-refresh-token'
    ];
    
    // Clear localStorage
    storageKeys.forEach(key => {
        try {
            localStorage.removeItem(key);
            console.log(`[MobileLogout] Removed ${key} from localStorage`);
        } catch (e) {
            console.error(`[MobileLogout] Error removing ${key} from localStorage:`, e);
        }
    });
    
    // Clear sessionStorage
    try {
        sessionStorage.clear();
        console.log('[MobileLogout] Cleared sessionStorage');
    } catch (e) {
        console.error('[MobileLogout] Error clearing sessionStorage:', e);
    }
    
    // Clear cookies
    try {
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            if (name) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });
        console.log('[MobileLogout] Cleared cookies');
    } catch (e) {
        console.error('[MobileLogout] Error clearing cookies:', e);
    }
}

// Function to find and patch logout buttons
function findAndPatchButtons() {
    // First, handle standard selectors
    const standardSelectors = [
        '#logout',
        '#logout-mobile',
        '.logout-button',
        '[data-logout]'
    ];
    
    // Process standard selectors
    standardSelectors.forEach(selector => {
        try {
            document.querySelectorAll(selector).forEach(button => {
                if (!button.hasAttribute('data-logout-patched')) {
                    button.addEventListener('click', handleLogoutClick);
                    button.setAttribute('data-logout-patched', 'true');
                    console.log(`[MobileLogout] Patched logout button:`, button);
                }
            });
        } catch (e) {
            console.error(`[MobileLogout] Error patching selector ${selector}:`, e);
        }
    });
    
    // Handle text content matching for buttons and links
    const textMatches = ['Logout', 'Sign Out', 'Log out', 'Sign Out'];
    const elementsToCheck = [
        ...document.querySelectorAll('button, a, [role="button"]')
    ];
    
    elementsToCheck.forEach(element => {
        if (element.hasAttribute('data-logout-patched')) return;
        
        const text = (element.textContent || '').trim();
        const matches = textMatches.some(match => 
            text.toLowerCase().includes(match.toLowerCase())
        );
        
        if (matches) {
            try {
                element.addEventListener('click', handleLogoutClick);
                element.setAttribute('data-logout-patched', 'true');
                console.log('[MobileLogout] Patched logout button by text:', element);
            } catch (e) {
                console.error('[MobileLogout] Error patching button by text:', e);
            }
        }
    });
}

// Initialize the mobile logout fix
function initializeMobileLogoutFix() {
    console.log('[MobileLogout] Initializing mobile logout fix');
    
    // Initial button patching
    patchLogoutButtons();
    
    // Set up mutation observer to handle dynamically added buttons
    const observer = new MutationObserver(function(mutations) {
        let shouldCheck = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                shouldCheck = true;
            }
        });
        
        if (shouldCheck) {
            patchLogoutButtons();
        }
    });
    
    // Start observing for dynamically added buttons
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Set up error monitoring
    setupErrorMonitoring();
}

// Function to patch all logout buttons to use form submission
function patchLogoutButtons() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', findAndPatchButtons);
    } else {
        findAndPatchButtons();
    }
}

// Redirect to login page with cache-busting
function redirectToLogin() {
    const timestamp = Date.now();
    window.location.href = `/login?clean=true&t=${timestamp}`;
}

// Check if we need to redirect (we're on an error page)
function checkAndRedirect() {
    // Check if we're on an error page
    const isErrorPage = () => {
        return document.title.includes('Error') || 
               document.body.innerText.includes('Error') ||
               document.body.innerText.includes('Not Found');
    };
    
    if (isErrorPage()) {
        console.log('[MobileLogout] Detected error page, immediately redirecting to login');
        clearAuthData();
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
            console.log('[MobileLogout] Caught error event for login.html, redirecting');
            checkAndRedirect();
        }
    });
}

// Run the initialization after a short delay to ensure other scripts have loaded
function initializeAfterOtherScripts() {
    console.log('[MobileLogout] Initializing after other scripts');
    
    // Wait for a short delay to ensure other scripts have run
    setTimeout(() => {
        initializeMobileLogoutFix();
        
        // Also patch buttons again after a longer delay to catch any dynamic content
        setTimeout(patchLogoutButtons, 2000);
    }, 500);
}

// Run the initialization when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAfterOtherScripts);
} else {
    // DOMContentLoaded has already fired
    setTimeout(initializeAfterOtherScripts, 0);
}

// Export functions to global scope for debugging
window.TrashDropLogout = {
    handleLogoutClick,
    patchLogoutButtons,
    initializeMobileLogoutFix
};
