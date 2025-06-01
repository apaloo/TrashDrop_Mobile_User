/**
 * Immersive Mode for PWA
 * Aggressive fullscreen technique that works on Android Chrome
 */

(function() {
  // Flag to track if immersive mode is active
  let immersiveModeActive = false;
  
  // Functions to detect PWA environment
  const isPwa = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.matchMedia('(display-mode: fullscreen)').matches || 
           window.navigator.standalone === true ||
           localStorage.getItem('isPWA') === 'true' ||
           document.URL.includes('mode=pwa') ||
           document.URL.includes('fullscreen=1');
  };
  
  // The key to our approach: create a full viewport overlay
  // that acts as a container for our entire app
  function createImmersiveContainer() {
    if (document.getElementById('immersive-container')) return;
    
    // Create our immersive container
    const container = document.createElement('div');
    container.id = 'immersive-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height */
      z-index: 2147483646; /* Almost maximum z-index */
      background-color: #FFFFFF;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;
    
    // Create the status bar area (for consistent spacing)
    const statusBar = document.createElement('div');
    statusBar.id = 'pwa-status-bar';
    statusBar.style.cssText = `
      width: 100%;
      height: env(safe-area-inset-top, 0px);
      background-color: #4CAF50;
      position: relative;
      z-index: 10;
    `;
    
    // Create our content frame that will hold the cloned body content
    const contentFrame = document.createElement('div');
    contentFrame.id = 'immersive-content';
    contentFrame.style.cssText = `
      flex: 1;
      position: relative;
      width: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    `;
    
    // Build our container structure
    container.appendChild(statusBar);
    container.appendChild(contentFrame);
    
    // Add to the document
    document.body.appendChild(container);
    
    // Prevent scrolling on the main body
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return { container, contentFrame };
  }
  
  // Function to move all body content into our immersive container
  function moveContentToImmersiveContainer() {
    const { contentFrame } = createImmersiveContainer();
    
    // Create a wrapper for all the original body content
    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'original-content-wrapper';
    contentWrapper.style.cssText = `
      min-height: 100%;
      display: flex;
      flex-direction: column;
    `;
    
    // Move all children of body (except our container) into the wrapper
    Array.from(document.body.children).forEach(child => {
      if (child.id !== 'immersive-container') {
        // Clone navigation bar elements, hide originals
        if (child.classList.contains('navbar') || 
            child.classList.contains('nav') || 
            child.classList.contains('navigation') ||
            child.classList.contains('mobile-bottom-nav')) {
          const clone = child.cloneNode(true);
          contentWrapper.appendChild(clone);
          child.style.display = 'none'; // Hide original
        } else if (child.id !== 'immersive-content-wrapper') {
          contentWrapper.appendChild(child);
        }
      }
    });
    
    // Add the content wrapper to our frame
    contentFrame.appendChild(contentWrapper);
    
    // After moving content, copy all body classes to content wrapper
    contentWrapper.className = document.body.className;
    
    // Force any fixed position elements to be relative to our container
    const fixedElements = document.querySelectorAll('.modal, .toast, .popover, [style*="position: fixed"]');
    fixedElements.forEach(el => {
      if (el.id !== 'immersive-container' && !el.closest('#immersive-container')) {
        el.style.position = 'absolute';
      }
    });
    
    // Fix event handling for moved elements
    reattachEventListeners();
    
    return contentWrapper;
  }
  
  // Function to reattach event listeners to cloned elements
  function reattachEventListeners() {
    // Find all buttons, links, and interactive elements in the immersive container
    const interactiveElements = document.querySelectorAll('#immersive-container a, #immersive-container button, #immersive-container [role="button"], #immersive-container input, #immersive-container select, #immersive-container textarea');
    
    interactiveElements.forEach(element => {
      // For each element, check if it has event handlers in the original DOM
      const originalId = element.id;
      if (originalId) {
        const originalElement = document.querySelector(`body > #${originalId}`);
        if (originalElement) {
          // Clone event listeners by adding a proxy
          element.addEventListener('click', function(e) {
            originalElement.click();
          });
        }
      }
    });
  }
  
  // Function to activate immersive mode
  function activateImmersiveMode(fromUserGesture = false) {
    if (immersiveModeActive) return;
    
    // Create the container and move content
    moveContentToImmersiveContainer();
    
    // Try to request fullscreen via Fullscreen API - only on user gesture
    if (fromUserGesture && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen({
        navigationUI: 'hide' // Hide navigation UI if supported
      }).then(() => {
        console.log('Immersive mode fullscreen enabled successfully');
      }).catch(err => {
        // Just log and continue - we'll still have our container-based approach
        if (err.name === 'NotAllowedError' || err.toString().includes('Permission')) {
          console.log('Fullscreen API requires user interaction - using container-only mode');
          // Setup event listeners for user interaction
          setupFullscreenOnUserInteraction();
        } else {
          console.warn('Fullscreen request failed:', err);
        }
      });
    } else if (!fromUserGesture) {
      // Set up handlers for user interaction if not from user gesture
      setupFullscreenOnUserInteraction();
    }
    
    // Mark immersive mode as active
    immersiveModeActive = true;
    localStorage.setItem('immersiveModeActive', 'true');
    
    // Ensure our container stays full height
    function adjustHeight() {
      const container = document.getElementById('immersive-container');
      if (container) {
        container.style.height = `${window.innerHeight}px`;
      }
    }
    
    // Adjust on orientation change and resize
    window.addEventListener('resize', adjustHeight);
    window.addEventListener('orientationchange', adjustHeight);
    
    // Initial adjustment
    adjustHeight();
  }
  
  // Set up handlers to enable fullscreen on user interaction
  function setupFullscreenOnUserInteraction() {
    // Use a variety of events that indicate user interaction
    const interactionEvents = ['click', 'touchstart', 'keydown'];
    
    const userInteractionHandler = function(e) {
      // Only react to interactions with the body or buttons
      if (e.target && 
          (e.target === document.body || 
           e.target.tagName === 'BUTTON' || 
           e.target.getAttribute('role') === 'button')) {
        
        // Try to request fullscreen on this user interaction
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen({
            navigationUI: 'hide'
          }).then(() => {
            // Remove the handlers if successful
            interactionEvents.forEach(eventType => {
              document.removeEventListener(eventType, userInteractionHandler);
            });
          }).catch(err => {
            console.warn('Fullscreen still failed with user interaction:', err);
            // If it fails even with user interaction, we'll stop trying
            interactionEvents.forEach(eventType => {
              document.removeEventListener(eventType, userInteractionHandler);
            });
          });
        }
      }
    };
    
    // Add the handlers for each interaction event
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, userInteractionHandler);
    });
  }
  
  // Initialize immersive mode if we're in a PWA context
  function initImmersiveMode() {
    if (isPwa()) {
      // Small delay to let the page load completely
      setTimeout(() => {
        // Start with container-based approach (no fullscreen request yet)
        activateImmersiveMode(false);
        
        // Add a subtle fullscreen button for better UX
        addFullscreenButton();
        
        // Also listen for any user interaction as a backup approach
        document.addEventListener('click', function enableFullscreenOnInteraction(e) {
          // Only try fullscreen on specific interactive elements
          if (e.target && (
              e.target.tagName === 'BUTTON' || 
              e.target.getAttribute('role') === 'button' ||
              e.target.classList.contains('fullscreen-trigger')
          )) {
            activateImmersiveMode(true); // Pass true to indicate user gesture
          }
          // Remove this one-time handler
          document.removeEventListener('click', enableFullscreenOnInteraction);
        }, { once: true });
      }, 300);
    }
  }
  
  // Add a subtle fullscreen button that users can click
  function addFullscreenButton() {
    // Only add if not already present
    if (document.getElementById('fullscreen-button')) return;
    
    const button = document.createElement('button');
    button.id = 'fullscreen-button';
    button.className = 'fullscreen-trigger';
    button.setAttribute('aria-label', 'Enter fullscreen mode');
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
    
    // Style the button
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      background-color: rgba(76, 175, 80, 0.8);
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      opacity: 0.7;
    `;
    
    // Add hover effects
    button.addEventListener('mouseover', () => {
      button.style.opacity = '1';
      button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.opacity = '0.7';
      button.style.transform = 'scale(1)';
    });
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      activateImmersiveMode(true); // Pass true to indicate user gesture
      
      // Hide button after use
      setTimeout(() => {
        button.style.opacity = '0';
        setTimeout(() => button.remove(), 300);
      }, 1000);
    });
    
    // Add to body
    document.body.appendChild(button);
    
    // Auto-hide after 5 seconds if not used
    setTimeout(() => {
      if (document.getElementById('fullscreen-button')) {
        button.style.opacity = '0';
        setTimeout(() => {
          if (document.getElementById('fullscreen-button')) {
            button.remove();
          }
        }, 300);
      }
    }, 5000);
  }
  
  // Run on page load
  if (document.readyState === 'complete') {
    initImmersiveMode();
  } else {
    window.addEventListener('load', initImmersiveMode);
  }
  
  // Also handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isPwa() && !immersiveModeActive) {
      activateImmersiveMode();
    }
  });
})();
