/**
 * Active Pickup Persistence Helper
 * Ensures active pickup requests remain visible after page refresh
 */

// Check if ActivePickupPersistence already exists to prevent redeclaration
if (!window.ActivePickupPersistence) {

// Use an IIFE to avoid global namespace pollution
(function() {

const ActivePickupPersistence = {
    // Key used for localStorage
    STORAGE_KEY: 'active_pickup_data',
    
    /**
     * Save active pickup data to localStorage
     * @param {Object} pickupData - The pickup data to save
     */
    saveActivePickup: function(pickupData) {
        if (!pickupData) return;
        
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pickupData));
            console.log('ActivePickupPersistence: Saved pickup data to localStorage');
        } catch (err) {
            console.error('ActivePickupPersistence: Error saving to localStorage', err);
        }
    },
    
    /**
     * Get active pickup data from localStorage
     * @returns {Object|null} The pickup data or null if none exists
     */
    getActivePickup: function() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) return null;
            
            return JSON.parse(data);
        } catch (err) {
            console.error('ActivePickupPersistence: Error retrieving from localStorage', err);
            return null;
        }
    },
    
    /**
     * Clear active pickup data from localStorage
     */
    clearActivePickup: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('ActivePickupPersistence: Cleared pickup data from localStorage');
    },
    
    /**
     * Check if there is active pickup data in localStorage
     * @returns {boolean} True if active pickup data exists
     */
    hasActivePickup: function() {
        return !!localStorage.getItem(this.STORAGE_KEY);
    },
    
    /**
     * Handle page refresh - called early in the page load process
     * Shows the active pickup container immediately if data exists
     */
    handlePageRefresh: function() {
        if (this.hasActivePickup()) {
            const pickupData = this.getActivePickup();
            
            // Only proceed if we have valid data and it's not cancelled
            if (pickupData && pickupData.status !== 'cancelled') {
                console.log('ActivePickupPersistence: Found stored pickup on refresh, showing container');
                
                // Look for the container with a small delay to ensure DOM is ready
                setTimeout(() => {
                    const container = document.getElementById('active-pickup-container');
                    if (container) {
                        // Force display with !important to override any CSS
                        container.setAttribute('style', 'display: block !important');
                        container.setAttribute('aria-hidden', 'false');
                        
                        console.log('ActivePickupPersistence: Container visibility restored after refresh');
                    } else {
                        console.log('ActivePickupPersistence: Container not found yet, will try again');
                        // Try again with a longer delay
                        setTimeout(this.handlePageRefresh.bind(this), 500);
                    }
                }, 50);
            }
        }
    }
};

// Apply persistence handling immediately during page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('ActivePickupPersistence: DOM ready, checking for stored pickup data');
    ActivePickupPersistence.handlePageRefresh();
});

// Also handle when returning to the page from history (back button)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('ActivePickupPersistence: Page restored from cache, re-applying persistence');
        ActivePickupPersistence.handlePageRefresh();
    }
});

// Make it globally available
window.ActivePickupPersistence = ActivePickupPersistence;

})(); // End of IIFE

} // End of if (!window.ActivePickupPersistence) check
