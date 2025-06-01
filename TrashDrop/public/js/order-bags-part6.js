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
