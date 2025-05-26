// TrashDrop - Order Bags Functionality

// Global variables to track modal and fullscreen state
let orderBagsModal;
let wasInFullscreen = false;

// Store the original active pickup container display state
let originalActivePickupDisplayState = null;

// Function to check if we're in fullscreen mode
function isInFullscreenMode() {
  return !!(document.fullscreenElement || 
           document.webkitFullscreenElement || 
           document.mozFullScreenElement || 
           document.msFullscreenElement);
}

// Function to exit fullscreen mode
function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    return document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    return document.msExitFullscreen();
  }
  return Promise.resolve();
}

// Function to request fullscreen mode
function requestFullscreen(element) {
  const docEl = element || document.documentElement;
  
  if (docEl.requestFullscreen) {
    return docEl.requestFullscreen();
  } else if (docEl.webkitRequestFullscreen) {
    return docEl.webkitRequestFullscreen();
  } else if (docEl.mozRequestFullScreen) {
    return docEl.mozRequestFullScreen();
  } else if (docEl.msRequestFullscreen) {
    return docEl.msRequestFullscreen();
  }
  return Promise.resolve();
}

// Function to open the order bags modal
window.openOrderBagsModal = function() {
  // Get modal element
  const modalElement = document.getElementById('order-bags-modal');
  if (!modalElement) {
    console.error('Order bags modal element not found');
    return;
  }
  
  // Check and store current fullscreen state
  wasInFullscreen = isInFullscreenMode();
  console.log('Opening modal, fullscreen state:', wasInFullscreen);
  
  // Exit fullscreen mode if active to prevent backdrop issues
  if (wasInFullscreen) {
    exitFullscreen().catch(err => {
      console.warn('Error exiting fullscreen:', err);
      wasInFullscreen = false; // Reset if we couldn't exit
    });
  }
  
  // Ensure we don't initialize multiple instances of the same modal
  if (orderBagsModal) {
    // Dispose of the existing modal instance to prevent memory leaks
    orderBagsModal.dispose();
    orderBagsModal = null;
  }
  
  // Create a fresh modal instance
  orderBagsModal = new bootstrap.Modal(modalElement, {
    backdrop: true,  // Use a backdrop that dismisses the modal on click
    keyboard: true,  // Close the modal when escape key is pressed
    focus: true      // Place focus on the modal when initialized
  });
  
  // Save the current state of the active pickup container before modifying it
  const activePickupContainer = document.getElementById('active-pickup-container');
  if (activePickupContainer) {
    originalActivePickupDisplayState = activePickupContainer.style.display;
    console.log('Saved original active pickup state:', originalActivePickupDisplayState);
  }
  
  // Add event listeners for modal events - using once: true to prevent duplicate listeners
  modalElement.addEventListener('shown.bs.modal', function() {
    console.log('Order bags modal opened');
    document.body.classList.add('modal-open'); // Ensure body has proper modal class
  }, { once: true });
  
  modalElement.addEventListener('hidden.bs.modal', function handleModalHidden() {
    console.log('Order bags modal closed, restoring original state');
    
    // Ensure the body is interactive after modal closes
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Force remove any lingering backdrop with more thorough cleanup
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      backdrop.classList.remove('show');
      backdrop.remove();
    });
    
    // Extra cleanup to ensure modal artifacts are removed
    document.documentElement.classList.remove('modal-open');
    
    // If any backdrop is still in the DOM, remove it completely
    setTimeout(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    }, 50);
    
    // Reset the modal instance to prevent issues on next open
    if (orderBagsModal) {
      try {
        orderBagsModal.dispose();
      } catch (e) {
        console.warn('Error disposing modal:', e);
      }
      orderBagsModal = null;
    }
    
    // Restore the active pickup container to its original state
    const activePickupContainer = document.getElementById('active-pickup-container');
    if (activePickupContainer && originalActivePickupDisplayState) {
      console.log('Restoring active pickup to original state:', originalActivePickupDisplayState);
      activePickupContainer.style.display = originalActivePickupDisplayState;
      
      if (originalActivePickupDisplayState !== 'none' && originalActivePickupDisplayState !== '') {
        activePickupContainer.setAttribute('aria-hidden', 'false');
      } else {
        activePickupContainer.setAttribute('aria-hidden', 'true');
      }
    }
    
    // Restore fullscreen mode if we were in it before opening the modal
    if (wasInFullscreen && isRunningAsPwa()) {
      console.log('Restoring fullscreen mode after modal close');
      // Small delay to ensure modal is fully closed before entering fullscreen
      setTimeout(() => {
        requestFullscreen().catch(err => {
          console.warn('Error restoring fullscreen:', err);
        });
      }, 300);
    }
  });
  
  // Additional cleanup on hide.bs.modal (before hidden event)
  modalElement.addEventListener('hide.bs.modal', function() {
    // Start backdrop cleanup early
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.classList.remove('show');
    });
  });
  
  // Helper function to detect if running as PWA
  function isRunningAsPwa() {
    return window.matchMedia('(display-mode: fullscreen)').matches || 
           window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  }
  
  // Reset the form before showing
  resetOrderBagsForm();
  
  // Load saved addresses
  loadUserAddresses();
  
  // Show the modal
  orderBagsModal.show();
};

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Attach click event to Order Bags button
  const orderBagsButton = document.getElementById('order-bags-btn');
  if (orderBagsButton) {
    orderBagsButton.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent default navigation
      window.openOrderBagsModal();
    });
  }
  
  setupOrderBagsEventListeners();
});

// Setup all event listeners for the order bags functionality
function setupOrderBagsEventListeners() {
  // Checkbox event listeners for bag types
  document.getElementById('general-bags').addEventListener('change', toggleQuantityInput);
  document.getElementById('recycling-bags').addEventListener('change', toggleQuantityInput);
  document.getElementById('organic-bags').addEventListener('change', toggleQuantityInput);
  document.getElementById('hazardous-bags').addEventListener('change', toggleQuantityInput);
  
  // Terms checkbox
  document.getElementById('agree-terms').addEventListener('change', validateOrderForm);
  
  // Quantity inputs
  document.getElementById('general-bags-qty').addEventListener('change', validateOrderForm);
  document.getElementById('recycling-bags-qty').addEventListener('change', validateOrderForm);
  document.getElementById('organic-bags-qty').addEventListener('change', validateOrderForm);
  document.getElementById('hazardous-bags-qty').addEventListener('change', validateOrderForm);
  
  // Address selection
  document.getElementById('delivery-address').addEventListener('change', validateOrderForm);
  
  // Submit button
  document.getElementById('submit-order-bags').addEventListener('click', submitOrderBags);
}

// Toggle quantity input based on checkbox state
function toggleQuantityInput(event) {
  const bagType = event.target.value;
  const quantityInput = document.getElementById(`${bagType}-bags-qty`);
  
  if (event.target.checked) {
    quantityInput.disabled = false;
  } else {
    quantityInput.disabled = true;
  }
  
  validateOrderForm();
}

// Validate the order form to enable/disable submit button
function validateOrderForm() {
  // Check if at least one bag type is selected
  const hasBagType = 
    (document.getElementById('general-bags').checked) ||
    (document.getElementById('recycling-bags').checked) ||
    (document.getElementById('organic-bags').checked) ||
    (document.getElementById('hazardous-bags').checked);
  
  // Check if address is selected
  const hasAddress = document.getElementById('delivery-address').value !== '';
  
  // Check if terms are agreed to
  const agreedToTerms = document.getElementById('agree-terms').checked;
  
  // Enable/disable submit button
  document.getElementById('submit-order-bags').disabled = !(hasBagType && hasAddress && agreedToTerms);
}

// Reset the order bags form
function resetOrderBagsForm() {
  // Reset bag type checkboxes and quantities
  document.getElementById('general-bags').checked = true;
  document.getElementById('recycling-bags').checked = false;
  document.getElementById('organic-bags').checked = false;
  document.getElementById('hazardous-bags').checked = false;
  
  // Reset quantities
  document.getElementById('general-bags-qty').value = 1;
  document.getElementById('recycling-bags-qty').value = 1;
  document.getElementById('organic-bags-qty').value = 1;
  document.getElementById('hazardous-bags-qty').value = 1;
  
  // Enable/disable inputs
  document.getElementById('general-bags-qty').disabled = false;
  document.getElementById('recycling-bags-qty').disabled = true;
  document.getElementById('organic-bags-qty').disabled = true;
  document.getElementById('hazardous-bags-qty').disabled = true;
  
  // Reset terms checkbox
  document.getElementById('agree-terms').checked = false;
  
  // Reset notes
  document.getElementById('delivery-notes').value = '';
  
  // Reset alert
  const alertElement = document.getElementById('order-bags-alert');
  alertElement.classList.add('d-none');
  alertElement.classList.remove('alert-success', 'alert-danger', 'alert-warning');
  alertElement.textContent = '';
  
  // Show form, hide success and processing views
  document.getElementById('order-bags-form').classList.remove('d-none');
  document.getElementById('order-bags-success').classList.add('d-none');
  document.getElementById('order-bags-processing').classList.add('d-none');
  
  // Show correct footer
  document.getElementById('order-bags-footer').classList.remove('d-none');
  document.getElementById('order-bags-success-footer').classList.add('d-none');
  
  // Disable submit button until form is valid
  document.getElementById('submit-order-bags').disabled = true;
}

// Load user addresses from the profile
async function loadUserAddresses() {
  try {
    // Clear existing options, keeping only the default
    const addressSelect = document.getElementById('delivery-address');
    while (addressSelect.options.length > 1) {
      addressSelect.remove(1);
    }
    
    // Get user profile which should contain saved locations
    const userProfile = await AuthManager.getUserProfile();
    
    if (userProfile && userProfile.saved_locations && userProfile.saved_locations.length > 0) {
      // Add each location to the dropdown
      userProfile.saved_locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = `${location.name}: ${location.address}`;
        
        // Mark default location
        if (location.is_default) {
          option.selected = true;
        }
        
        addressSelect.appendChild(option);
      });
    } else {
      // No saved locations, add a fallback option for current address
      const option = document.createElement('option');
      option.value = 'current';
      option.textContent = 'Current Address';
      addressSelect.appendChild(option);
    }
    
    // Validate form after loading addresses
    validateOrderForm();
  } catch (error) {
    console.error('Error loading user addresses:', error);
    showOrderBagsAlert('Unable to load your saved addresses. Please try again later.', 'warning');
  }
}

// Submit the order bags request
async function submitOrderBags() {
  try {
    // Show processing state
    document.getElementById('order-bags-form').classList.add('d-none');
    document.getElementById('order-bags-processing').classList.remove('d-none');
    document.getElementById('order-bags-footer').classList.add('d-none');
    
    // Collect data from form
    const orderData = {
      address_id: document.getElementById('delivery-address').value,
      notes: document.getElementById('delivery-notes').value,
      bags: []
    };
    
    // Add selected bag types and quantities
    if (document.getElementById('general-bags').checked) {
      orderData.bags.push({
        type: 'general',
        quantity: parseInt(document.getElementById('general-bags-qty').value)
      });
    }
    
    if (document.getElementById('recycling-bags').checked) {
      orderData.bags.push({
        type: 'recycling',
        quantity: parseInt(document.getElementById('recycling-bags-qty').value)
      });
    }
    
    if (document.getElementById('organic-bags').checked) {
      orderData.bags.push({
        type: 'organic',
        quantity: parseInt(document.getElementById('organic-bags-qty').value)
      });
    }
    
    if (document.getElementById('hazardous-bags').checked) {
      orderData.bags.push({
        type: 'hazardous',
        quantity: parseInt(document.getElementById('hazardous-bags-qty').value)
      });
    }
    
    // Send the order request to the server
    const response = await fetch('/api/bags/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AuthManager.getToken()}`
      },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit order');
    }
    
    // Update UI with success
    document.getElementById('order-bags-processing').classList.add('d-none');
    document.getElementById('order-bags-success').classList.remove('d-none');
    document.getElementById('order-bags-footer').classList.add('d-none');
    document.getElementById('order-bags-success-footer').classList.remove('d-none');
    
    // Set tracking ID
    if (result.trackingId) {
      document.getElementById('order-bags-tracking-id').textContent = `Tracking ID: ${result.trackingId}`;
    }
    
    // Update bag count in dashboard
    await updateBagCount();
    
    // Show success toast
    showToast('Order Placed', 'Your bag order has been successfully placed.', 'success');
  } catch (error) {
    console.error('Error submitting bag order:', error);
    
    // Reset UI to form view
    document.getElementById('order-bags-processing').classList.add('d-none');
    document.getElementById('order-bags-form').classList.remove('d-none');
    document.getElementById('order-bags-footer').classList.remove('d-none');
    
    // Show error message
    showOrderBagsAlert(error.message || 'Failed to submit order. Please try again later.', 'danger');
  }
}

// Update the bag count in the dashboard
async function updateBagCount() {
  try {
    // Fetch current bag count from server
    const response = await fetch('/api/bags/count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${await AuthManager.getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch bag count');
    }
    
    const result = await response.json();
    
    // Update UI
    document.getElementById('available-bags-count').textContent = result.count || 0;
  } catch (error) {
    console.error('Error updating bag count:', error);
    // Silently fail as this is not critical
  }
}

// Show alert in the order bags modal
function showOrderBagsAlert(message, type = 'danger') {
  const alertElement = document.getElementById('order-bags-alert');
  alertElement.textContent = message;
  alertElement.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-warning');
  alertElement.classList.add(`alert-${type}`);
}
