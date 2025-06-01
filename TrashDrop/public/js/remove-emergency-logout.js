/**
 * Remove all emergency logout buttons and functionality
 * This script runs immediately to ensure a clean UI
 */
(function() {
    // Create and append CSS to hide emergency logout elements
    const style = document.createElement('style');
    style.textContent = `
        /* Hide all emergency logout buttons */
        #emergency-logout-fixed,
        #emergency-logout,
        #emergency-logout-mobile,
        #confirm-emergency-logout,
        #confirmEmergencyLogout,
        [data-action="emergency-logout"],
        button:has(i.bi-power),
        .btn:has(i.bi-shield-exclamation) {
            display: none !important;
        }

        /* Hide emergency logout modals */
        #emergencyLogoutModal {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Remove any existing emergency logout buttons
    function removeEmergencyLogoutElements() {
        // Find and remove any emergency logout buttons
        const elements = [
            document.getElementById('emergency-logout-fixed'),
            ...document.querySelectorAll('#emergency-logout, #emergency-logout-mobile, [data-action="emergency-logout"]')
        ];
        
        elements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
    
    // Run immediately
    removeEmergencyLogoutElements();
    
    // Also run when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeEmergencyLogoutElements);
    }
    
    // And set up a MutationObserver to catch dynamically added buttons
    if (window.MutationObserver) {
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    removeEmergencyLogoutElements();
                    break;
                }
            }
        });
        
        // Start observing once DOM is ready
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }
    }
    
    // Override window.createFixedEmergencyLogoutButton if it gets loaded
    window.createFixedEmergencyLogoutButton = function() {
        console.log('Emergency logout button creation prevented');
        return null;
    };
})();
