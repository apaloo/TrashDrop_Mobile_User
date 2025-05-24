/**
 * TrashDrop Pickup Refresh Fix
 * Solves the issue where the active pickup card disappears after page refresh
 * and ensures proper cancellation functionality
 */

// Run immediately during page load before other scripts
(function() {
  // Check for active pickup data in localStorage
  const storedPickupData = localStorage.getItem('active_pickup_data');
  const forceShowActivePickup = localStorage.getItem('force_show_active_pickup') === 'true';
  const newRequestParam = new URLSearchParams(window.location.search).has('newRequest');
  
  // Log debug information
  console.log('PickupRefreshFix: Initial check', {
    hasStoredData: !!storedPickupData,
    forceShow: forceShowActivePickup,
    newRequest: newRequestParam,
    url: window.location.href,
    lastRequest: localStorage.getItem('pickup_requested_at')
  });
  
  if (storedPickupData) {
    try {
      // Parse the stored pickup data
      const pickupData = JSON.parse(storedPickupData);
      
      // Only proceed if we have valid data and it's not cancelled
      if (pickupData && pickupData.status !== 'cancelled') {
        console.log('PickupRefreshFix: Found stored pickup data, ensuring container visibility');
        
        // Function to make the pickup container visible
        const makePickupVisible = function() {
          const container = document.getElementById('active-pickup-container');
          if (container) {
            // Force display with !important to override any CSS
            container.setAttribute('style', 'display: block !important');
            container.setAttribute('aria-hidden', 'false');
            console.log('PickupRefreshFix: Container visibility restored');
            
            // Update content if we have the elements
            updateCardContent(pickupData);
            return true;
          }
          return false;
        };
        
        // Helper function to update card content
        const updateCardContent = function(data) {
          // Only update basic content - dashboard.js will handle the rest
          const elements = {
            'collector-name': data.collector_name || 'Pending Assignment',
            'pickup-location': data.location || 'Location unavailable',
            'waste-type-quantity': data.waste_type ? 
              `${data.waste_type.charAt(0).toUpperCase() + data.waste_type.slice(1)} (${data.bags_count || 1} bag${data.bags_count !== 1 ? 's' : ''})` : 
              'Not specified',
            'earned-points': data.points || '0'
          };
          
          // Update each element if it exists
          Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = elements[id];
          });
        };
        
        // Try immediately
        if (!makePickupVisible()) {
          // If container not found yet, try again when DOM is loaded
          document.addEventListener('DOMContentLoaded', function() {
            // Try again
            if (!makePickupVisible()) {
              // Final attempt with a delay
              setTimeout(makePickupVisible, 500);
            }
          });
        }
      } else if (pickupData && pickupData.status === 'cancelled') {
        // Cleanup cancelled pickup data
        console.log('PickupRefreshFix: Found cancelled pickup, cleaning up storage');
        localStorage.removeItem('active_pickup_data');
      }
    } catch (e) {
      console.error('PickupRefreshFix: Error parsing pickup data', e);
    }
  }
  
  // Enhance the cancellation process - run when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Find the cancel button
    const setupCancelButton = function() {
      const cancelBtn = document.getElementById('cancel-pickup-btn');
      if (cancelBtn) {
        console.log('PickupRefreshFix: Setting up unified cancel button handling');
        
        // Use a single event handler that goes through the dashboard.js function
        cancelBtn.addEventListener('click', function(event) {
          // Prevent default to avoid form submission
          event.preventDefault();
          event.stopPropagation();
          
          console.log('PickupRefreshFix: Cancel button clicked, using centralized handler');
          
          // Use the centralized cancelPickupRequest function from dashboard.js
          if (typeof cancelPickupRequest === 'function') {
            // This will show only one confirmation dialog
            cancelPickupRequest('dev-pickup-id-' + Date.now());
          } else {
            console.warn('PickupRefreshFix: cancelPickupRequest function not found, using fallback');
            // Prevent duplicates even in fallback
            if (window.cancelConfirmationInProgress) return;
            window.cancelConfirmationInProgress = true;
            
            // Simple fallback with single prompt
            if (confirm('Are you sure you want to cancel this pickup request?')) {
              console.log('PickupRefreshFix: Cancellation confirmed, cleaning up data');
              localStorage.removeItem('active_pickup_data');
              
              // Hide the container
              const container = document.getElementById('active-pickup-container');
              if (container) {
                container.style.display = 'none';
                container.setAttribute('aria-hidden', 'true');
              }
              
              // Show success message
              alert('Pickup request cancelled successfully.');
            }
            
            // Reset flag after short delay
            setTimeout(() => { window.cancelConfirmationInProgress = false; }, 500);
          }
        }, { once: true }); // Use once:true to ensure it only fires once per click
        
        // Remove any existing onclick handler to prevent duplicates
        cancelBtn.onclick = null;
      }
    };
    
    // Run only once with a delay to let other scripts initialize first
    setTimeout(setupCancelButton, 500);
  });
})();
