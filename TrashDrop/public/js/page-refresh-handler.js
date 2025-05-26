/**
 * TrashDrop Page Refresh Handler
 * Improves user experience during page refreshes by maintaining UI consistency
 * and providing visual feedback during reload operations
 */

(function() {
  // Track page refresh/reload state
  let isRefreshing = false;
  let originalPageContent = null;
  let refreshStartTime = 0;
  
  // Create and append the refresh overlay to the body
  function createRefreshOverlay() {
    // Check if overlay already exists
    if (document.getElementById('refresh-overlay')) {
      return document.getElementById('refresh-overlay');
    }
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'refresh-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      pointer-events: none;
    `;
    
    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'refresh-spinner';
    spinner.style.cssText = `
      width: 50px;
      height: 50px;
      border: 5px solid rgba(76, 175, 80, 0.2);
      border-radius: 50%;
      border-top-color: #4CAF50;
      animation: spin 1s ease-in-out infinite;
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        #refresh-overlay {
          background-color: rgba(33, 37, 41, 0.7);
        }
      }
      
      /* Add fade-in/out animations */
      .refresh-overlay-visible {
        opacity: 1 !important;
      }
    `;
    
    document.head.appendChild(style);
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
    
    return overlay;
  }
  
  // Show the refresh overlay
  function showRefreshOverlay() {
    const overlay = createRefreshOverlay();
    // Force reflow before adding the visible class
    overlay.offsetHeight;
    overlay.classList.add('refresh-overlay-visible');
  }
  
  // Hide the refresh overlay
  function hideRefreshOverlay() {
    const overlay = document.getElementById('refresh-overlay');
    if (overlay) {
      overlay.classList.remove('refresh-overlay-visible');
    }
  }
  
  // Save the current page state
  function savePageState() {
    const mainContent = document.querySelector('main') || document.getElementById('main-content');
    if (mainContent) {
      originalPageContent = mainContent.innerHTML;
    }
  }
  
  // Handle before unload event (when page is about to reload/refresh)
  function handleBeforeUnload(event) {
    // Only handle actual refreshes, not navigations to other pages
    if (event.currentTarget.location.href === window.location.href) {
      isRefreshing = true;
      refreshStartTime = Date.now();
      
      // Save current page state
      savePageState();
      
      // Show refresh overlay
      showRefreshOverlay();
      
      // Store refresh state in sessionStorage
      sessionStorage.setItem('isRefreshing', 'true');
      sessionStorage.setItem('refreshStartTime', refreshStartTime.toString());
    }
  }
  
  // Handle page load event
  function handlePageLoad() {
    // Check if we're coming back from a refresh
    const wasRefreshing = sessionStorage.getItem('isRefreshing') === 'true';
    
    if (wasRefreshing) {
      // Calculate refresh duration
      const refreshStartTime = parseInt(sessionStorage.getItem('refreshStartTime') || '0');
      const refreshDuration = Date.now() - refreshStartTime;
      
      // Clear refresh state
      sessionStorage.removeItem('isRefreshing');
      sessionStorage.removeItem('refreshStartTime');
      
      // Determine minimum display time for loading indicator
      const minimumDisplayTime = 500; // 500ms minimum to avoid flickering
      
      if (refreshDuration < minimumDisplayTime) {
        // Keep overlay visible for the remaining time
        const remainingTime = minimumDisplayTime - refreshDuration;
        setTimeout(hideRefreshOverlay, remainingTime);
      } else {
        // Hide overlay immediately
        hideRefreshOverlay();
      }
      
      // Update active elements
      updateActiveElements();
    }
  }
  
  // Update active elements after a refresh
  function updateActiveElements() {
    // Ensure map elements are properly sized
    const mapElements = document.querySelectorAll('.map-container, [id$="-map"]');
    mapElements.forEach(map => {
      // Re-trigger any map resize events
      if (map && map._leaflet_id) {
        const leafletMap = map._leaflet_map;
        if (leafletMap && typeof leafletMap.invalidateSize === 'function') {
          setTimeout(() => leafletMap.invalidateSize(), 100);
        }
      }
    });
    
    // Re-apply responsive styling
    if (window.TrashDropResponsive && typeof window.TrashDropResponsive.refreshUI === 'function') {
      window.TrashDropResponsive.refreshUI();
    }
  }
  
  // Handle manual refresh button clicks
  function handleRefreshButtonClick() {
    showRefreshOverlay();
    
    // Set refresh state
    isRefreshing = true;
    refreshStartTime = Date.now();
    sessionStorage.setItem('isRefreshing', 'true');
    sessionStorage.setItem('refreshStartTime', refreshStartTime.toString());
    
    // Let the browser's default refresh behavior continue
    return true;
  }
  
  // Initialize refresh handler
  function initRefreshHandler() {
    // Check if coming back from a refresh
    handlePageLoad();
    
    // Add event listeners for future refreshes
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Find and handle refresh buttons
    const refreshButtons = document.querySelectorAll('button[aria-label="Refresh"], button.refresh-btn, a.refresh-link');
    refreshButtons.forEach(button => {
      button.addEventListener('click', handleRefreshButtonClick);
    });
    
    // Handle browser's refresh button
    document.addEventListener('keydown', function(event) {
      // F5 key or Ctrl+R
      if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        handleRefreshButtonClick();
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRefreshHandler);
  } else {
    initRefreshHandler();
  }
})();
