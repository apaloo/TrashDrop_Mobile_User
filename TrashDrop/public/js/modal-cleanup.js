/**
 * TrashDrop Modal Cleanup Utility
 * Prevents backdrop issues and ensures proper modal behavior across the application
 */

(function() {
  // Track modal states to handle cleanup
  const modalStates = {};
  
  // Function to clean up modal backdrops
  function cleanupModalBackdrops() {
    // Remove all modal backdrops from DOM
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.classList.remove('show');
      backdrop.classList.add('removing');
      setTimeout(() => backdrop.remove(), 150);
    });
    
    // Reset body classes and styles
    document.body.classList.remove('modal-open');
    document.body.removeAttribute('style');
    document.body.setAttribute('data-modal-closed', 'true');
    
    // Clean up html element too
    document.documentElement.classList.remove('modal-open');
  }
  
  // Add a manual backdrop cleanup method to Bootstrap's Modal prototype
  if (window.bootstrap && window.bootstrap.Modal) {
    const originalHide = window.bootstrap.Modal.prototype.hide;
    
    window.bootstrap.Modal.prototype.hide = function() {
      const modalEl = this._element;
      
      // Mark backdrop for removal
      document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.classList.add('removing');
      });
      
      // Call original hide method
      const result = originalHide.apply(this, arguments);
      
      // Add additional cleanup
      setTimeout(cleanupModalBackdrops, 300);
      
      return result;
    };
  }
  
  // Global escape key handler to force close stuck modals
  document.addEventListener('keydown', function(e) {
    // Ctrl+Escape combo as emergency modal closer
    if (e.key === 'Escape' && e.ctrlKey) {
      console.log('Emergency modal cleanup triggered');
      cleanupModalBackdrops();
      
      // Reset any potential stuck fullscreen state
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  });
  
  // Detect stuck backdrops and fix them
  function checkForStuckBackdrops() {
    const openModals = document.querySelectorAll('.modal.show');
    const backdrops = document.querySelectorAll('.modal-backdrop');
    
    // If we have backdrops but no open modals, clean up
    if (backdrops.length > 0 && openModals.length === 0) {
      console.log('Detected stuck backdrop, cleaning up');
      cleanupModalBackdrops();
      document.body.classList.add('backdrop-issue');
      
      // Reset body class after a delay
      setTimeout(() => {
        document.body.classList.remove('backdrop-issue');
      }, 1000);
    }
  }
  
  // Check periodically for stuck backdrops
  setInterval(checkForStuckBackdrops, 2000);
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers to all close buttons in modals for extra safety
    document.querySelectorAll('.modal .btn-close, .modal [data-bs-dismiss="modal"]').forEach(button => {
      button.addEventListener('click', function() {
        // Extra safety timeout to clean up
        setTimeout(cleanupModalBackdrops, 350);
      });
    });
    
    // Ensure page refresh cleans up any lingering backdrops
    window.addEventListener('beforeunload', cleanupModalBackdrops);
  });
  
  // Expose cleanup method globally
  window.cleanupModalBackdrops = cleanupModalBackdrops;
})();
