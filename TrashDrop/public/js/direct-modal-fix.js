/**
 * Direct Modal Fix for TrashDrop
 * Completely replaces the standard Bootstrap modal behavior
 * with custom code to ensure proper functionality
 */

(function() {
  // Wait for the DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Directly target the Order Bags modal
    const orderBagsModal = document.getElementById('order-bags-modal');
    if (!orderBagsModal) return;
    
    // Remove Bootstrap's data attributes to prevent automatic initialization
    orderBagsModal.removeAttribute('data-bs-backdrop');
    orderBagsModal.removeAttribute('data-bs-keyboard');
    
    // Get relevant buttons
    const orderBagsBtn = document.getElementById('order-bags-btn');
    const orderBagsMobileBtn = document.getElementById('order-bags-mobile-btn');
    const closeButtons = orderBagsModal.querySelectorAll('[data-bs-dismiss="modal"], .btn-close, .close-modal, button.btn-secondary');
    const submitButton = orderBagsModal.querySelector('#submit-order-bags');
    
    // Custom open function that doesn't use Bootstrap's modal
    function openOrderBagsModal() {
      // First, remove any lingering backdrops
      removeAllBackdrops();
      
      // Create our own backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'custom-modal-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1040;
      `;
      document.body.appendChild(backdrop);
      
      // Show the modal
      orderBagsModal.style.display = 'block';
      orderBagsModal.classList.add('show');
      orderBagsModal.style.zIndex = '1050';
      document.body.classList.add('modal-open');
      
      // Add click handler to backdrop for dismissal
      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) {
          closeOrderBagsModal();
        }
      });
      
      // Initialize form if needed
      if (typeof resetOrderBagsForm === 'function') {
        resetOrderBagsForm();
      }
      
      if (typeof loadUserAddresses === 'function') {
        loadUserAddresses();
      }
    }
    
    // Custom close function
    function closeOrderBagsModal() {
      orderBagsModal.style.display = 'none';
      orderBagsModal.classList.remove('show');
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Remove our custom backdrop
      removeAllBackdrops();
      
      // Also remove any Bootstrap backdrops that might have been created
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    }
    
    // Helper to remove all backdrops
    function removeAllBackdrops() {
      document.querySelectorAll('.custom-modal-backdrop, .modal-backdrop').forEach(el => el.remove());
    }
    
    // Attach click handlers to open buttons
    if (orderBagsBtn) {
      orderBagsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openOrderBagsModal();
      });
    }
    
    if (orderBagsMobileBtn) {
      orderBagsMobileBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openOrderBagsModal();
      });
    }
    
    // Handle direct menu items that might open the modal
    document.querySelectorAll('[data-target="#order-bags-modal"], [href="#order-bags-modal"]').forEach(el => {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        openOrderBagsModal();
      });
    });
    
    // Attach click handlers to close buttons
    closeButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        closeOrderBagsModal();
      });
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && orderBagsModal.classList.contains('show')) {
        closeOrderBagsModal();
      }
    });
    
    // Handle form submission
    if (submitButton) {
      submitButton.addEventListener('click', function(e) {
        // Handle form submission
        // After successful submission:
        setTimeout(closeOrderBagsModal, 500);
      });
    }
    
    // Override the global openOrderBagsModal function
    window.openOrderBagsModal = openOrderBagsModal;
    
    // Emergency cleanup - periodically check if the modal is closed but backdrop remains
    setInterval(function() {
      if (!orderBagsModal.classList.contains('show') && 
          (document.querySelector('.custom-modal-backdrop') || 
           document.querySelector('.modal-backdrop'))) {
        console.log('Emergency backdrop cleanup');
        removeAllBackdrops();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    }, 1000);
    
    // Add direct CSS fix
    const style = document.createElement('style');
    style.textContent = `
      .custom-modal-backdrop {
        opacity: 1;
        transition: opacity 0.15s linear;
      }
      .modal-open {
        overflow: hidden;
      }
      #order-bags-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
        z-index: 1050;
        outline: 0;
        display: none;
      }
      #order-bags-modal.show {
        display: block;
      }
      #order-bags-modal .modal-dialog {
        transform: none;
        margin: 1.75rem auto;
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);
  });
})();
