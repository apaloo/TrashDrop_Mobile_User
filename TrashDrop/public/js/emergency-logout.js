/**
 * TrashDrop Logout System - Simplified Version
 * The emergency logout functionality has been removed as it was redundant with the regular logout.
 * This empty implementation maintains compatibility with existing code references.
 */

// Create empty implementations of all functions to maintain compatibility
function initEmergencyLogout() {
    // Do nothing - emergency logout button disabled
    console.log('Emergency logout disabled - using regular logout instead');
    
    // Find and remove any existing emergency logout buttons
    const elementsToRemove = document.querySelectorAll('#emergency-logout-fixed, #emergency-logout, #emergency-logout-mobile, [data-action="emergency-logout"]');
    elementsToRemove.forEach(element => {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
}

function createFixedEmergencyLogoutButton() {
    // Do nothing - we don't want to create the button
    console.log('Emergency logout button creation prevented');
    return null;
}

function setupKeyboardShortcut() {
    // Do nothing - emergency logout button disabled
}

function performEmergencyLogout() {
    // Use regular logout instead
    if (window.AuthManager && typeof window.AuthManager.signOut === 'function') {
        console.log('Using AuthManager for emergency logout');
        window.AuthManager.signOut()
            .then(() => {
                console.log('Logout successful, redirecting to login page');
                // Use the base URL if available
                if (window.BaseUrlHandler && typeof window.BaseUrlHandler.getBaseUrl === 'function') {
                    const baseUrl = window.BaseUrlHandler.getBaseUrl();
                    window.location.href = baseUrl + '/login?logout=true';
                } else {
                    // Use absolute path from root to avoid /views/ path issues
                    window.location.href = '/login?logout=true';
                }
            })
            .catch(err => {
                console.error('Error during emergency logout:', err);
                // Still redirect to login page even if there's an error
                window.location.href = '/login?logout=true';
            });
    } else {
        console.log('AuthManager not available, using direct navigation for logout');
        // Use absolute path from root to avoid /views/ path issues
        window.location.href = '/login?logout=true';
    }
}

function clearAllSessionData() {
    // Return a resolved promise for compatibility
    return Promise.resolve();
}

function showLoadingSpinner() {
    // Do nothing
}

// Add CSS to hide any emergency logout buttons
document.addEventListener('DOMContentLoaded', function() {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
        /* Hide fixed position emergency logout button */
        #emergency-logout-fixed,
        button[id^="emergency-logout"],
        button[id*="emergency-logout"],
        a[id^="emergency-logout"],
        a[id*="emergency-logout"],
        button:has(i.bi-power),
        .btn:has(i.bi-shield-exclamation),
        .btn:has(i.bi-exclamation-triangle),
        body > .btn-danger {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            position: absolute !important;
            left: -9999px !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
        }

        /* Hide emergency logout modals */
        #emergencyLogoutModal,
        .modal[id*="emergency"],
        div[id*="emergency-logout"] {
            display: none !important;
            visibility: hidden !important;
        }

        /* Hide any emergency-related buttons at the bottom of the screen */
        body > .btn-danger,
        body > button.btn:last-child,
        body > .btn-danger:last-child {
            display: none !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(style);
    
    // Run the cleanup once immediately
    initEmergencyLogout();
    
    // Set an interval to repeatedly check and remove any emergency logout buttons
    setInterval(function() {
        const fixedButton = document.getElementById('emergency-logout-fixed');
        if (fixedButton && fixedButton.parentNode) {
            fixedButton.parentNode.removeChild(fixedButton);
        }
    }, 500);
});
