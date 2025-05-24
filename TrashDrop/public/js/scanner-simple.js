// TrashDrop QR Code Scanner - Simplified Version with Direct Handlers

// Scanner variables
let html5QrCode = null;
let currentCamera = 'environment'; // Start with back camera
let isScanning = false;

// Global handler functions for direct button access
window.startScannerHandler = function() {
  console.log('Start scanner button clicked via inline handler');
  startScanner();
};

window.switchCameraHandler = function() {
  console.log('Switch camera button clicked via inline handler');
  switchCamera();
};

// Log when the script is loaded
console.log('Scanner script loaded and global handlers defined');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - initializing scanner components');
  
  // Initialize the scanner on page load
  initializeScanner();
  
  // Set initial online/offline status
  updateConnectionStatus(navigator.onLine);
});

// Initialize QR scanner
function initializeScanner() {
  console.log("Initializing scanner");
  const qrContainer = document.getElementById('qr-reader');
  
  if (!qrContainer) {
    console.error("QR reader container not found");
    return;
  }
  
  // Create scanner with configuration
  try {
    html5QrCode = new Html5Qrcode('qr-reader');
    console.log("Scanner object created");
    
    // Enable the start scanner button
    const startButton = document.getElementById('start-scanner');
    if (startButton) {
      startButton.disabled = false;
      console.log("Start scanner button enabled");
    }
  } catch (error) {
    console.error("Failed to create scanner object:", error);
    showToast('Error', 'Failed to initialize scanner. Please reload the page.', 'danger');
  }
}

// Start the QR scanner
async function startScanner() {
  console.log("Starting scanner");
  try {
    const startButton = document.getElementById('start-scanner');
    if (!startButton) {
      console.error("Start button not found");
      return;
    }
    
    // If already scanning, stop it
    if (isScanning) {
      await stopScanner();
      return;
    }
    
    // Change button text to show loading
    startButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
    startButton.disabled = true;
    
    // Configure scan settings
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    };
    
    // Success callback
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      console.log("QR code scanned:", decodedText);
      // Play a success sound if available
      try {
        const audio = new Audio('/sounds/scan-success.mp3');
        audio.play().catch(e => console.log('Could not play sound', e));
      } catch (error) {
        console.log("Sound playback not supported", error);
      }
      
      // Create a simple alert with the scanned content
      alert("Scanned QR Code: " + decodedText);
    };
    
    // Start scanner with selected camera
    await html5QrCode.start(
      { facingMode: currentCamera },
      config,
      qrCodeSuccessCallback,
      (errorMessage) => {
        // Handle scan errors silently to avoid too many alerts
        console.log("Scanning error:", errorMessage);
      }
    );
    
    isScanning = true;
    
    // Update button text
    startButton.innerHTML = '<i class="bi bi-stop-circle me-1"></i> Stop Scanner';
    startButton.disabled = false;
    startButton.classList.remove('btn-primary');
    startButton.classList.add('btn-danger');
    
    console.log("Scanner started successfully");
  } catch (error) {
    console.error("Error starting scanner:", error);
    const startButton = document.getElementById('start-scanner');
    if (startButton) {
      startButton.innerHTML = '<i class="bi bi-qr-code-scan me-1"></i> Start Scanner';
      startButton.disabled = false;
    }
    
    showToast('Scanner Error', 'Failed to start the scanner. Please check camera permissions.', 'danger');
  }
}

// Stop the QR scanner
async function stopScanner() {
  console.log("Stopping scanner");
  try {
    if (!html5QrCode) {
      console.error("Scanner object not available");
      return;
    }
    
    // Stop the scanner
    if (html5QrCode.isScanning) {
      await html5QrCode.stop();
      console.log("Scanner stopped");
    }
    
    isScanning = false;
    
    // Update button
    const startButton = document.getElementById('start-scanner');
    if (startButton) {
      startButton.innerHTML = '<i class="bi bi-qr-code-scan me-1"></i> Start Scanner';
      startButton.classList.remove('btn-danger');
      startButton.classList.add('btn-primary');
    }
  } catch (error) {
    console.error("Error stopping scanner:", error);
    showToast('Error', 'Failed to stop the scanner.', 'danger');
  }
}

// Switch camera between front and back
async function switchCamera() {
  console.log("Switching camera");
  try {
    // Toggle camera facing mode
    currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
    console.log("Switched to camera:", currentCamera);
    
    // If currently scanning, restart with new camera
    if (isScanning) {
      await stopScanner();
      await startScanner();
      showToast('Camera Switched', 'Camera has been switched.', 'success');
    } else {
      showToast('Camera Switched', 'Camera will be switched when you start scanning.', 'info');
    }
  } catch (error) {
    console.error("Error switching camera:", error);
    showToast('Camera Error', 'Failed to switch camera.', 'danger');
  }
}

// No longer using the event listener setup function since we're using inline handlers
// Just keeping the online/offline handlers
function setupOnlineOfflineListeners() {
  console.log('Setting up online/offline listeners');
  
  // Online/Offline event listeners
  window.addEventListener('online', () => {
    updateConnectionStatus(true);
    showToast('Connection Restored', 'You are now online.', 'info');
  });
  
  window.addEventListener('offline', () => {
    updateConnectionStatus(false);
    showToast('Offline Mode', 'You are now offline.', 'warning');
  });
}

// Update connection status indicators
function updateConnectionStatus(isOnline) {
  console.log("Connection status:", isOnline ? "online" : "offline");
  const onlineStatus = document.getElementById('online-status');
  const offlineStatus = document.getElementById('offline-status');
  
  if (onlineStatus && offlineStatus) {
    if (isOnline) {
      onlineStatus.classList.remove('d-none');
      offlineStatus.classList.add('d-none');
    } else {
      onlineStatus.classList.add('d-none');
      offlineStatus.classList.remove('d-none');
    }
  }
}

// Show toast notification
function showToast(title, message, type = 'success') {
  console.log(`Toast (${type}):`, title, message);
  
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  
  // Create toast content
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}</strong>: ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add to container
  toastContainer.appendChild(toastEl);
  
  // Initialize and show the toast
  const toast = new bootstrap.Toast(toastEl, {
    animation: true,
    autohide: true,
    delay: 5000
  });
  
  toast.show();
  
  // Remove from DOM after hiding
  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}
