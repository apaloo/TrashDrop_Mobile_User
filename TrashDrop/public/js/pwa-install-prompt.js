/**
 * TrashDrop PWA Installation Prompt
 * Handles the display of a custom install prompt when users visit the app
 */

// Store the deferred prompt event
let deferredPrompt = null;

// Check if running as installed PWA
const isRunningAsInstalledPwa = window.matchMedia('(display-mode: fullscreen)').matches || 
                                window.matchMedia('(display-mode: standalone)').matches || 
                                window.navigator.standalone === true;

// Constants for local storage keys
const KEYS = {
  FIRST_VISIT: 'trashdrop_first_visit',
  INSTALL_PROMPTED: 'trashdrop_install_prompted',
  LAST_PROMPT_TIME: 'trashdrop_last_prompt_time'
};

// Modal HTML
const modalHtml = `
<div class="modal fade" id="pwa-install-modal" tabindex="-1" aria-labelledby="pwaInstallModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-success text-white">
        <h5 class="modal-title" id="pwaInstallModalLabel">Install TrashDrop App</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body text-center">
        <img src="/images/icon-192.png" alt="TrashDrop App" class="my-3" style="width: 96px; height: 96px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
        <h4 class="mb-3">Get the full app experience!</h4>
        <p>Install TrashDrop on your device to:</p>
        <ul class="text-start" style="list-style-type: none;">
          <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i>Use in fullscreen without browser controls</li>
          <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i>Access offline when not connected</li>
          <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i>Faster loading with improved performance</li>
          <li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i>Home screen icon for quick access</li>
        </ul>
      </div>
      <div class="modal-footer justify-content-center">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="modal-install-later">Later</button>
        <button type="button" class="btn btn-success" id="modal-install-now">Install Now</button>
      </div>
    </div>
  </div>
</div>
`;

// Banner HTML (fallback for when modal might not work)
const bannerHtml = `
<div class="pwa-install-banner alert alert-success alert-dismissible fade show" role="alert">
  <div class="d-flex align-items-center">
    <img src="/images/icon-192.png" alt="TrashDrop App" class="me-3" style="width: 48px; height: 48px; border-radius: 8px;">
    <div>
      <strong>Install TrashDrop</strong>
      <p class="mb-0">Add to your home screen for the best experience</p>
    </div>
    <button type="button" id="banner-install-now" class="btn btn-sm btn-success ms-auto me-2">Install</button>
  </div>
  <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>
`;

/**
 * Check if the user is eligible to see the install prompt
 * @returns {boolean} True if the user should see the prompt
 */
function shouldShowInstallPrompt() {
  // Don't show if already running as PWA
  if (isRunningAsInstalledPwa) {
    return false;
  }
  
  // Check if this is first visit
  const isFirstVisit = !localStorage.getItem(KEYS.FIRST_VISIT);
  if (isFirstVisit) {
    localStorage.setItem(KEYS.FIRST_VISIT, 'true');
    return true;
  }
  
  // Check if we've prompted recently
  const lastPromptTime = localStorage.getItem(KEYS.LAST_PROMPT_TIME);
  if (lastPromptTime) {
    const now = Date.now();
    const dayInMs = 86400000; // 24 hours in milliseconds
    const timeSinceLastPrompt = now - parseInt(lastPromptTime);
    
    // Only show again if it's been at least 2 days
    return timeSinceLastPrompt > (dayInMs * 2);
  }
  
  return true;
}

/**
 * Show the install modal
 */
function showInstallModal() {
  // Check if we should show install prompt
  if (!shouldShowInstallPrompt()) {
    return;
  }
  
  // Record that we showed the prompt
  localStorage.setItem(KEYS.LAST_PROMPT_TIME, Date.now().toString());
  
  // Add modal to the DOM
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer);
  
  // Show the modal using Bootstrap
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const modal = document.getElementById('pwa-install-modal');
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Set up event listeners
    setupModalListeners(bsModal);
  } else {
    // Fallback if Bootstrap is not available
    showInstallBanner();
  }
}

/**
 * Set up event listeners for the modal
 */
function setupModalListeners(bsModal) {
  // Install now button
  const installButton = document.getElementById('modal-install-now');
  if (installButton) {
    installButton.addEventListener('click', () => {
      triggerInstall(bsModal);
    });
  }
  
  // Later button
  const laterButton = document.getElementById('modal-install-later');
  if (laterButton) {
    laterButton.addEventListener('click', () => {
      // We already recorded the time when showing the prompt
    });
  }
}

/**
 * Show a simpler banner if modal isn't available
 */
function showInstallBanner() {
  const bannerContainer = document.createElement('div');
  bannerContainer.innerHTML = bannerHtml;
  document.body.insertBefore(bannerContainer, document.body.firstChild);
  
  // Set up banner install button
  const installButton = document.getElementById('banner-install-now');
  if (installButton) {
    installButton.addEventListener('click', () => {
      triggerInstall();
    });
  }
}

/**
 * Trigger the install prompt
 */
function triggerInstall(modal) {
  if (deferredPrompt) {
    // Hide the modal if it exists
    if (modal) {
      modal.hide();
    }
    
    // Show the browser's install prompt
    deferredPrompt.prompt();
    
    // Wait for the user's choice
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the deferred prompt
      deferredPrompt = null;
    });
  } else {
    // If no deferred prompt is available, show manual instructions
    showManualInstallInstructions(modal);
  }
}

/**
 * Show instructions for manual installation
 */
function showManualInstallInstructions(modal) {
  // If we had a modal, replace its content with instructions
  if (modal && document.getElementById('pwa-install-modal')) {
    const modalBody = document.querySelector('#pwa-install-modal .modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <h4 class="mb-3">Install TrashDrop App</h4>
        <p>To install the app manually:</p>
        <ol class="text-start">
          <li class="mb-2">Tap the browser menu (⋮) in Chrome</li>
          <li class="mb-2">Select "Add to Home Screen"</li>
          <li class="mb-2">Follow the on-screen instructions</li>
        </ol>
        <img src="/images/add-to-homescreen.png" alt="Add to Home Screen" style="max-width: 100%; height: auto; margin-top: 15px;">
      `;
      
      // Change the footer button
      const footer = document.querySelector('#pwa-install-modal .modal-footer');
      if (footer) {
        footer.innerHTML = `<button type="button" class="btn btn-success" data-bs-dismiss="modal">Got it</button>`;
      }
    }
  } else {
    // Create a new modal with instructions
    const instructionsContainer = document.createElement('div');
    instructionsContainer.innerHTML = `
      <div class="modal fade" id="manual-install-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">Install TrashDrop App</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
              <p>To install the app manually:</p>
              <ol class="text-start">
                <li class="mb-2">Tap the browser menu (⋮) in Chrome</li>
                <li class="mb-2">Select "Add to Home Screen"</li>
                <li class="mb-2">Follow the on-screen instructions</li>
              </ol>
              <img src="/images/add-to-homescreen.png" alt="Add to Home Screen" style="max-width: 100%; height: auto; margin-top: 15px;">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" data-bs-dismiss="modal">Got it</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(instructionsContainer);
    
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const instructionsModal = document.getElementById('manual-install-modal');
      const bsModal = new bootstrap.Modal(instructionsModal);
      bsModal.show();
    }
  }
}

// Initialize everything
function init() {
  // Skip if already running as installed PWA
  if (isRunningAsInstalledPwa) {
    return;
  }
  
  // Always create a screenshot for the add-to-homescreen instructions
  createAddToHomescreenImage();
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 76+ from automatically showing the prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
  });
  
  // Listen for appinstalled event
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    // Clear any stored data
    localStorage.removeItem(KEYS.INSTALL_PROMPTED);
  });
  
  // After a short delay, show the installation prompt
  // The delay allows the page to load and be interactive first
  setTimeout(() => {
    showInstallModal();
  }, 1500);
}

// Create a simple image to show how to add to homescreen
function createAddToHomescreenImage() {
  // Only create if it doesn't exist
  if (!document.querySelector('img[src="/images/add-to-homescreen.png"]')) {
    const img = document.createElement('img');
    img.src = '/images/add-to-homescreen.png';
    img.style.display = 'none';
    img.alt = 'Add to Home Screen';
    document.body.appendChild(img);
  }
}

// Run initialization when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
