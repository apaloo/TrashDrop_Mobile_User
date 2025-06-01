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
