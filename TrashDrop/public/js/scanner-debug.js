// TrashDrop QR Code Scanner - Debug Version
console.log('SCANNER-DEBUG: Script loaded');

// Initialize global variables
let html5QrCode = null;
let isScanning = false;
let currentCamera = 'environment';

// Function to initialize QR scanner
function initScanner() {
  console.log('SCANNER-DEBUG: Initializing scanner');
  
  try {
    // Create a new instance of the Html5Qrcode scanner
    html5QrCode = new Html5Qrcode("qr-reader");
    console.log('SCANNER-DEBUG: Scanner instance created successfully');
    
    // Add alert to confirm initialization
    alert('Scanner initialized successfully. Click OK to continue.');
  } catch (error) {
    console.error('SCANNER-DEBUG: Error initializing scanner:', error);
    alert('Error initializing scanner: ' + error.message);
  }
}

// Handle starting the scanner
function handleStartScanner() {
  console.log('SCANNER-DEBUG: Start button clicked');
  alert('Start Scanner button clicked');
  
  if (isScanning) {
    stopScanner();
    return;
  }
  
  startScanner();
}

// Handle switching camera
function handleSwitchCamera() {
  console.log('SCANNER-DEBUG: Switch camera button clicked');
  alert('Switch Camera button clicked');
  
  // Toggle camera
  currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
  
  // If currently scanning, restart with new camera
  if (isScanning) {
    stopScanner().then(() => {
      startScanner();
    });
  }
}

// Start the scanner
async function startScanner() {
  console.log('SCANNER-DEBUG: Starting scanner with camera:', currentCamera);
  
  try {
    const startButton = document.getElementById('start-scanner');
    if (startButton) {
      startButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Starting...';
      startButton.disabled = true;
    }
    
    // Define scan configuration
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    };
    
    // Success callback when QR code is scanned
    const successCallback = (decodedText, decodedResult) => {
      console.log('SCANNER-DEBUG: QR code scanned:', decodedText);
      alert('Scanned QR code: ' + decodedText);
    };
    
    // Error callback
    const errorCallback = (error) => {
      console.log('SCANNER-DEBUG: Scan error:', error);
    };
    
    // Start scanner with camera
    await html5QrCode.start(
      { facingMode: currentCamera },
      config,
      successCallback,
      errorCallback
    );
    
    isScanning = true;
    
    // Update button
    if (startButton) {
      startButton.innerHTML = '<i class="bi bi-stop-circle"></i> Stop Scanner';
      startButton.disabled = false;
      startButton.classList.remove('btn-primary');
      startButton.classList.add('btn-danger');
    }
    
    console.log('SCANNER-DEBUG: Scanner started successfully');
  } catch (error) {
    console.error('SCANNER-DEBUG: Error starting scanner:', error);
    alert('Error starting scanner: ' + error.message);
    
    // Reset button
    const startButton = document.getElementById('start-scanner');
    if (startButton) {
      startButton.innerHTML = '<i class="bi bi-qr-code-scan"></i> Start Scanner';
      startButton.disabled = false;
    }
  }
}

// Stop the scanner
async function stopScanner() {
  console.log('SCANNER-DEBUG: Stopping scanner');
  
  try {
    if (html5QrCode && html5QrCode.isScanning) {
      await html5QrCode.stop();
      console.log('SCANNER-DEBUG: Scanner stopped successfully');
    }
    
    isScanning = false;
    
    // Update button
    const startButton = document.getElementById('start-scanner');
    if (startButton) {
      startButton.innerHTML = '<i class="bi bi-qr-code-scan"></i> Start Scanner';
      startButton.classList.remove('btn-danger');
      startButton.classList.add('btn-primary');
      startButton.disabled = false;
    }
  } catch (error) {
    console.error('SCANNER-DEBUG: Error stopping scanner:', error);
    alert('Error stopping scanner: ' + error.message);
  }
}

// Initialize scanner when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('SCANNER-DEBUG: DOM content loaded');
  
  // Initialize scanner
  initScanner();
  
  // Add event listeners to buttons
  const startButton = document.getElementById('start-scanner');
  const switchButton = document.getElementById('switch-camera');
  
  if (startButton) {
    console.log('SCANNER-DEBUG: Found start button, adding listener');
    startButton.addEventListener('click', handleStartScanner);
  } else {
    console.error('SCANNER-DEBUG: Start button not found');
  }
  
  if (switchButton) {
    console.log('SCANNER-DEBUG: Found switch button, adding listener');
    switchButton.addEventListener('click', handleSwitchCamera);
  } else {
    console.error('SCANNER-DEBUG: Switch button not found');
  }
});

// Make functions available globally
window.handleStartScanner = handleStartScanner;
window.handleSwitchCamera = handleSwitchCamera;
