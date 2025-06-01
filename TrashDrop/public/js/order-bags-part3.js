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
