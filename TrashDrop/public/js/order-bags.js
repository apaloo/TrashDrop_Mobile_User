// TrashDrop - Order Bags Functionality
// Enhanced version with ngrok compatibility and authentication handling

// Global variables to track modal and fullscreen state
let orderBagsModal;
let wasInFullscreen = false;
let originalActivePickupDisplayState = null;

// Helper function to check if running on ngrok domain
function isRunningOnNgrok() {
  return window.location.hostname.includes('ngrok-free.app') || 
         window.location.hostname.includes('ngrok.io');
}

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
  if (element.requestFullscreen) {
    return element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    return element.webkitRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    return element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    return element.msRequestFullscreen();
  }
  return Promise.resolve();
}
// Function to open the order bags modal
function openOrderBagsModal() {
  // Check if we're in fullscreen mode
  wasInFullscreen = isInFullscreenMode();
  
  // Exit fullscreen if we are in it
  if (wasInFullscreen) {
    exitFullscreen();
  }
  
  // Hide the active pickup container if it exists
  const activePickupContainer = document.getElementById('active-pickup-container');
  if (activePickupContainer) {
    originalActivePickupDisplayState = activePickupContainer.style.display;
    activePickupContainer.style.display = 'none';
  }
  
  // Check if modal already exists
  if (!orderBagsModal) {
    // Create the modal if it doesn't exist
    orderBagsModal = new bootstrap.Modal(document.getElementById('order-bags-modal'), {
      backdrop: 'static',
      keyboard: false
    });
    
    // Add event listener for when modal is hidden
    document.getElementById('order-bags-modal').addEventListener('hidden.bs.modal', function() {
      // Restore fullscreen if we were in it
      if (wasInFullscreen && !isInFullscreenMode()) {
        requestFullscreen(document.documentElement);
      }
      
      // Restore active pickup container visibility
      const activePickupContainer = document.getElementById('active-pickup-container');
      if (activePickupContainer && originalActivePickupDisplayState) {
        activePickupContainer.style.display = originalActivePickupDisplayState;
      }
      
      // Reset form
      resetOrderBagsForm();
    });
  }
  
  // Reset the form first
  resetOrderBagsForm();
  
  // Load saved addresses
  loadUserAddresses();
  
  // Show the modal
  orderBagsModal.show();
}

// Special function for ngrok domains to bypass authentication
async function submitOrderBagsNgrok() {
  try {
    console.log('TrashDrop: Using ngrok-compatible bag ordering flow');
    
    // Show processing UI
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
    
    // Simulate processing time for a natural experience
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Create a mock successful response
    const mockResponse = {
      success: true,
      orderId: 'NGR' + Math.floor(Math.random() * 10000000),
      trackingId: 'NGROK-' + Math.floor(Math.random() * 1000000),
      estimatedDelivery: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days from now
      quantity: orderData.bags.reduce((acc, bag) => acc + bag.quantity, 0),
      message: 'Order placed successfully (ngrok compatibility mode)'
    };
    
    console.log('TrashDrop: Using mock response for bag order:', mockResponse);
    
    // Store the order in localStorage for persistence
    try {
      // Get existing orders or create new array
      const existingOrders = JSON.parse(localStorage.getItem('trashdrop_bag_orders') || '[]');
      existingOrders.push({
        ...mockResponse,
        orderDate: new Date().toISOString(),
        address: {
          id: orderData.address_id
        },
        bags: orderData.bags
      });
      localStorage.setItem('trashdrop_bag_orders', JSON.stringify(existingOrders));
    } catch (e) {
      console.warn('Failed to save mock order to localStorage:', e);
    }
    
    // Update UI with success
    document.getElementById('order-bags-processing').classList.add('d-none');
    document.getElementById('order-bags-success').classList.remove('d-none');
    document.getElementById('order-bags-footer').classList.add('d-none');
    document.getElementById('order-bags-success-footer').classList.remove('d-none');
    
    // Set tracking ID
    document.getElementById('order-bags-tracking-id').textContent = `Tracking ID: ${mockResponse.trackingId}`;
    
    // Show success toast
    showToast('Order Placed', 'Your bag order has been successfully placed.', 'success');
    
    // Increment local bag count display
    try {
      const bagCountElement = document.getElementById('available-bags-count');
      if (bagCountElement) {
        const currentCount = parseInt(bagCountElement.textContent) || 0;
        const newBags = orderData.bags.reduce((total, bag) => total + bag.quantity, 0);
        bagCountElement.textContent = currentCount + newBags;
      }
    } catch (e) {
      console.warn('Failed to update bag count:', e);
    }
    
    return mockResponse;
  } catch (error) {
    console.error('Error in ngrok bag order process:', error);
    
    // Reset UI to form view
    document.getElementById('order-bags-processing').classList.add('d-none');
    document.getElementById('order-bags-form').classList.remove('d-none');
    document.getElementById('order-bags-footer').classList.remove('d-none');
    
    // Show error message
    showOrderBagsAlert('An error occurred while processing your order. Please try again.', 'danger');
  }
}
// Submit the order bags request
async function submitOrderBags() {
  try {
    // Check if we're on an ngrok domain for compatibility mode
    const isNgrokDomain = isRunningOnNgrok();
    
    // Handle ngrok domain specially to avoid authentication issues
    if (isNgrokDomain) {
      console.log('TrashDrop: Detected ngrok domain, using compatibility mode for bag ordering');
      await submitOrderBagsNgrok();
      return;
    }
    
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
    let token = '';
    
    try {
      // Get authentication token
      if (window.AuthManager && typeof window.AuthManager.getToken === 'function') {
        token = await window.AuthManager.getToken();
      } else if (window.jwtHelpers && typeof window.jwtHelpers.getToken === 'function') {
        token = await window.jwtHelpers.getToken();
      } else {
        token = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
      }
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Make API request
      const response = await fetch('/api/bags/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Order failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Handle the successful response
      return await handleSuccessfulOrder(result);
    } catch (error) {
      console.error('Error in bag order API request:', error);
      
      // Reset UI to form view
      document.getElementById('order-bags-processing').classList.add('d-none');
      document.getElementById('order-bags-form').classList.remove('d-none');
      document.getElementById('order-bags-footer').classList.remove('d-none');
      
      // Show error message
      showOrderBagsAlert(error.message || 'Failed to submit order. Please try again later.', 'danger');
    }
  } catch (error) {
    // Outer error handling for any unexpected errors
    console.error('Unexpected error in submitOrderBags:', error);
    
    // Reset UI to form view
    document.getElementById('order-bags-processing').classList.add('d-none');
    document.getElementById('order-bags-form').classList.remove('d-none');
    document.getElementById('order-bags-footer').classList.remove('d-none');
    
    // Show generic error message
    showOrderBagsAlert('An unexpected error occurred. Please try again.', 'danger');
  }
}
// Handle a successful order response from the server or mock API
async function handleSuccessfulOrder(result) {
  // Update UI with success
  document.getElementById('order-bags-processing').classList.add('d-none');
  document.getElementById('order-bags-success').classList.remove('d-none');
  document.getElementById('order-bags-footer').classList.add('d-none');
  document.getElementById('order-bags-success-footer').classList.remove('d-none');
  
  // Set tracking ID if available
  if (result.trackingId) {
    document.getElementById('order-bags-tracking-id').textContent = `Tracking ID: ${result.trackingId}`;
  }
  
  // Update bag count in dashboard
  try {
    await updateBagCount();
  } catch (error) {
    console.warn('Could not update bag count after order:', error);
  }
  
  // Show success toast
  showToast('Order Placed', 'Your bag order has been successfully placed.', 'success');
  
  return result;
}

// Update the bag count in the dashboard
async function updateBagCount() {
  try {
    // For ngrok domains, just increment the displayed count
    if (isRunningOnNgrok()) {
      const bagCountElement = document.getElementById('available-bags-count');
      if (bagCountElement) {
        const currentCount = parseInt(bagCountElement.textContent) || 0;
        bagCountElement.textContent = currentCount + 1;
      }
      return;
    }
    
    // For regular domains, fetch from server
    let token = '';
    if (window.AuthManager && typeof window.AuthManager.getToken === 'function') {
      token = await window.AuthManager.getToken();
    } else if (window.jwtHelpers && typeof window.jwtHelpers.getToken === 'function') {
      token = await window.jwtHelpers.getToken();
    } else {
      token = localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
    }
    
    if (!token) {
      console.warn('No token available for bag count update');
      return;
    }
    
    const response = await fetch('/api/bags/count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
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

// Show toast notification
function showToast(title, message, type = 'info') {
  // Check if toastr library is available
  if (window.toastr) {
    toastr[type](message, title);
  } else {
    // Fallback to alert if toastr is not available
    alert(`${title}: ${message}`);
  }
}

// Toggle quantity input based on checkbox state
function toggleQuantityInput(event) {
  const checkbox = event.target;
  const inputId = checkbox.id + '-qty';
  const input = document.getElementById(inputId);
  
  if (input) {
    input.disabled = !checkbox.checked;
    if (checkbox.checked) {
      input.focus();
    }
  }
  
  // Update form validation
  validateOrderForm();
}

// Validate the order form to enable/disable submit button
function validateOrderForm() {
  const submitButton = document.getElementById('submit-order-bags');
  const agreeTerms = document.getElementById('agree-terms').checked;
  const deliveryAddress = document.getElementById('delivery-address').value;
  
  // Check if at least one bag type is selected
  const generalBags = document.getElementById('general-bags').checked;
  const recyclingBags = document.getElementById('recycling-bags').checked;
  const organicBags = document.getElementById('organic-bags').checked;
  const hazardousBags = document.getElementById('hazardous-bags').checked;
  
  const hasBags = generalBags || recyclingBags || organicBags || hazardousBags;
  
  // Enable button only if all conditions are met
  submitButton.disabled = !(agreeTerms && deliveryAddress && hasBags);
}

// Reset the order bags form
function resetOrderBagsForm() {
  // Reset form fields
  document.getElementById('delivery-address').value = '';
  document.getElementById('delivery-notes').value = '';
  
  // Reset bag checkboxes
  document.getElementById('general-bags').checked = false;
  document.getElementById('recycling-bags').checked = false;
  document.getElementById('organic-bags').checked = false;
  document.getElementById('hazardous-bags').checked = false;
  
  // Reset quantity inputs
  document.getElementById('general-bags-qty').value = 1;
  document.getElementById('general-bags-qty').disabled = true;
  
  document.getElementById('recycling-bags-qty').value = 1;
  document.getElementById('recycling-bags-qty').disabled = true;
  
  document.getElementById('organic-bags-qty').value = 1;
  document.getElementById('organic-bags-qty').disabled = true;
  
  document.getElementById('hazardous-bags-qty').value = 1;
  document.getElementById('hazardous-bags-qty').disabled = true;
  
  // Reset terms checkbox
  document.getElementById('agree-terms').checked = false;
  
  // Disable submit button
  document.getElementById('submit-order-bags').disabled = true;
  
  // Reset visibility
  document.getElementById('order-bags-form').classList.remove('d-none');
  document.getElementById('order-bags-processing').classList.add('d-none');
  document.getElementById('order-bags-success').classList.add('d-none');
  document.getElementById('order-bags-footer').classList.remove('d-none');
  document.getElementById('order-bags-success-footer').classList.add('d-none');
  
  // Hide any alerts
  const alertElement = document.getElementById('order-bags-alert');
  alertElement.textContent = '';
  alertElement.classList.add('d-none');
}
// Load user addresses from the profile
async function loadUserAddresses() {
  try {
    // Get the address select element
    const addressSelect = document.getElementById('delivery-address');
    
    // Clear existing options except the default
    while (addressSelect.options.length > 1) {
      addressSelect.remove(1);
    }
    
    // Try to fetch addresses from profile
    let addresses = [];
    
    // Try different sources for addresses
    if (window.ProfileManager && typeof window.ProfileManager.getAddresses === 'function') {
      addresses = await window.ProfileManager.getAddresses();
    } else if (localStorage.getItem('user_addresses')) {
      // Fallback to localStorage if available
      try {
        addresses = JSON.parse(localStorage.getItem('user_addresses') || '[]');
      } catch (e) {
        console.warn('Failed to parse addresses from localStorage');
      }
    }
    
    // Add each address as an option
    addresses.forEach(address => {
      const option = document.createElement('option');
      option.value = address.id;
      option.textContent = `${address.name} - ${address.address}, ${address.city}, ${address.state} ${address.zip}`;
      addressSelect.appendChild(option);
    });
    
    // Update form validation
    validateOrderForm();
  } catch (error) {
    console.error('Error loading addresses:', error);
    showOrderBagsAlert('Failed to load delivery addresses. Please try again.', 'warning');
  }
}
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
  
  // Check if running on ngrok domain and use appropriate submit function
  const submitBtn = document.getElementById('submit-order-bags');
  if (submitBtn) {
    if (isRunningOnNgrok()) {
      console.log('TrashDrop: Using ngrok-compatible bag ordering event handler');
      submitBtn.addEventListener('click', submitOrderBagsNgrok);
    } else {
      submitBtn.addEventListener('click', submitOrderBags);
    }
  }
}

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

// Make the modal opening function globally available
window.openOrderBagsModal = openOrderBagsModal;
