// TrashDrop QR Code Scanner

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const isAuthenticated = await AuthManager.isAuthenticated();
  
  if (!isAuthenticated) {
    window.location.href = '/login';
    return;
  }
  
  // Initialize the scanner
  initializeScanner();
  
  // Load user profile data
  loadUserData();
  
  // Load recently scanned bags
  loadRecentBags();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize dark mode
  initializeDarkMode();
});

// Scanner variables
let html5QrCode;
let currentCamera = 'environment'; // Start with back camera

// Initialize QR scanner
function initializeScanner() {
  const qrContainer = document.getElementById('qr-reader');
  
  if (!qrContainer) return;
  
  // Create scanner with configuration
  html5QrCode = new Html5Qrcode('qr-reader', { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] });
  
  // Start scanner if available
  document.getElementById('start-scanner').addEventListener('click', startScanner);
  
  // Detect camera permissions
  checkCameraPermission();
}

// Check if camera permission is granted
async function checkCameraPermission() {
  try {
    const devices = await Html5Qrcode.getCameras();
    
    if (devices && devices.length > 0) {
      // Enable the start scanner button
      document.getElementById('start-scanner').disabled = false;
      
      // If only one camera, disable switch button
      if (devices.length === 1) {
        document.getElementById('switch-camera').disabled = true;
      }
    } else {
      // No cameras found
      showToast('Camera Error', 'No cameras found on your device.', 'warning');
      document.getElementById('start-scanner').disabled = true;
      document.getElementById('switch-camera').disabled = true;
    }
  } catch (error) {
    console.error('Error checking camera permission:', error);
    showToast('Camera Error', 'Failed to access camera. Please grant camera permission.', 'danger');
    document.getElementById('start-scanner').disabled = true;
  }
}

// Start the QR scanner
async function startScanner() {
  try {
    const startButton = document.getElementById('start-scanner');
    
    // Change button text to show loading
    startButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
    startButton.disabled = true;
    
    // Stop scanner if already running
    if (html5QrCode.isScanning) {
      await html5QrCode.stop();
    }
    
    // Configure scan settings
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false
    };
    
    // Success callback
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      handleQrCodeScan(decodedText);
    };
    
    // Start scanner with selected camera
    await html5QrCode.start(
      { facingMode: currentCamera },
      config,
      qrCodeSuccessCallback,
      (errorMessage) => {
        // Handle scan errors silently to avoid too many alerts
        console.log(errorMessage);
      }
    );
    
    // Update button text
    startButton.innerHTML = '<i class="bi bi-stop-circle me-1"></i> Stop Scanner';
    startButton.disabled = false;
    startButton.classList.remove('btn-primary');
    startButton.classList.add('btn-danger');
    
    // Update event listener
    startButton.removeEventListener('click', startScanner);
    startButton.addEventListener('click', stopScanner);
    
  } catch (error) {
    console.error('Error starting scanner:', error);
    document.getElementById('start-scanner').innerHTML = '<i class="bi bi-qr-code-scan me-1"></i> Start Scanner';
    document.getElementById('start-scanner').disabled = false;
    showToast('Scanner Error', 'Failed to start the QR scanner. Please check camera permissions.', 'danger');
  }
}

// Stop the QR scanner
async function stopScanner() {
  try {
    // Stop the scanner
    if (html5QrCode.isScanning) {
      await html5QrCode.stop();
    }
    
    // Update button
    const startButton = document.getElementById('start-scanner');
    startButton.innerHTML = '<i class="bi bi-qr-code-scan me-1"></i> Start Scanner';
    startButton.classList.remove('btn-danger');
    startButton.classList.add('btn-primary');
    
    // Update event listener
    startButton.removeEventListener('click', stopScanner);
    startButton.addEventListener('click', startScanner);
    
  } catch (error) {
    console.error('Error stopping scanner:', error);
    showToast('Error', 'Failed to stop the scanner.', 'danger');
  }
}

// Switch camera between front and back
async function switchCamera() {
  try {
    // Get available cameras
    const devices = await Html5Qrcode.getCameras();
    
    if (devices.length <= 1) {
      showToast('Camera Error', 'No additional cameras found on your device.', 'warning');
      return;
    }
    
    // Stop scanner if running
    if (html5QrCode.isScanning) {
      await html5QrCode.stop();
      
      // Toggle camera facing mode
      currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
      
      // Restart scanner with new camera
      startScanner();
      
      showToast('Camera Switched', 'Camera has been switched.', 'success');
    } else {
      // Toggle camera facing mode for next scan
      currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
      showToast('Camera Switched', 'Camera will be switched when you start scanning.', 'info');
    }
  } catch (error) {
    console.error('Error switching camera:', error);
    showToast('Camera Error', 'Failed to switch camera.', 'danger');
  }
}

// Handle successful QR code scan
async function handleQrCodeScan(decodedText) {
  try {
    // Stop the scanner
    if (html5QrCode.isScanning) {
      await html5QrCode.stop();
      
      // Update button
      const startButton = document.getElementById('start-scanner');
      startButton.innerHTML = '<i class="bi bi-qr-code-scan me-1"></i> Start Scanner';
      startButton.classList.remove('btn-danger');
      startButton.classList.add('btn-primary');
      
      // Update event listener
      startButton.removeEventListener('click', stopScanner);
      startButton.addEventListener('click', startScanner);
    }
    
    // Parse QR code data
    let bagData;
    
    try {
      bagData = JSON.parse(decodedText);
    } catch (error) {
      // If not valid JSON, try to parse as simple batch code
      bagData = {
        batchCode: decodedText,
        type: 'Recyclables', // Default type
        quantity: 1 // Default quantity
      };
    }
    
    // Validate bag data
    if (!bagData.batchCode) {
      throw new Error('Invalid QR code format. Missing batch code.');
    }
    
    // Add a vibration feedback if supported by the device
    if (navigator.vibrate) {
      navigator.vibrate(200); // 200ms vibration
    }

    // Play a success sound
    const successSound = new Audio('/sounds/scan-success.mp3');
    successSound.play().catch(e => console.log('Could not play sound', e));
    
    // Register bags in the database
    const result = await registerBags(bagData.batchCode, bagData.type, bagData.quantity);
    
    // Display scan result
    showScanResult(bagData.batchCode, bagData.type, bagData.quantity, result?.offline);
    
    // If we're offline, show the offline modal
    if (result?.offline && !sessionStorage.getItem('offline_modal_shown')) {
      const offlineModal = new bootstrap.Modal(document.getElementById('offlineModal'));
      offlineModal.show();
      sessionStorage.setItem('offline_modal_shown', 'true');
    }
    
  } catch (error) {
    console.error('Error handling QR scan:', error);
    showToast('Scan Error', error.message || 'Failed to process QR code. Please try again.', 'danger');
  }
}

// Register bags in the database
async function registerBags(batchCode, bagType, quantity) {
  try {
    showSpinner('Registering bags...');
    
    // Check if we're offline
    if (!navigator.onLine) {
      // Store in IndexedDB for later sync
      await storeOfflineBagRegistration(batchCode, bagType, quantity);
      hideSpinner();
      showToast('Offline Mode', `${quantity} ${bagType} bags saved for later synchronization.`, 'warning');
      return { success: true, offline: true };
    }
    
    // Get current user and token
    const user = await AuthManager.getCurrentUser();
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
      hideSpinner();
      throw new Error('User not authenticated.');
    }
    
    // Map UI bag types to database types
    const typeMapping = {
      'Recyclables': 'recycling',
      'Organic Waste': 'organic',
      'General Waste': 'general',
      'Hazardous Waste': 'hazardous',
      'Plastic': 'plastic'
    };
    
    // Get active pickup requests for the user (either the most recent or allow user to select)
    const { data: pickupRequests, error: pickupError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('collector_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (pickupError) {
      console.error('Error fetching pickup requests:', pickupError);
      hideSpinner();
      throw new Error('Could not find any pickup requests to associate bags with.');
    }
    
    if (!pickupRequests || pickupRequests.length === 0) {
      hideSpinner();
      throw new Error('Please create a pickup request before scanning bags.');
    }
    
    // Use the most recent request or let user choose if multiple options are available
    let requestId;
    
    if (pickupRequests.length === 1) {
      requestId = pickupRequests[0].id;
    } else {
      // If we have a previously selected request in this session, use that
      const sessionRequestId = sessionStorage.getItem('selected_request_id');
      if (sessionRequestId) {
        const requestExists = pickupRequests.some(req => req.id === sessionRequestId);
        if (requestExists) {
          requestId = sessionRequestId;
        }
      }
      
      // If no valid request ID is set, prompt user to select one
      if (!requestId) {
        hideSpinner();
        requestId = await promptUserToSelectRequest(pickupRequests);
        
        // Save for future use in this session
        if (requestId) {
          sessionStorage.setItem('selected_request_id', requestId);
        } else {
          throw new Error('No pickup request selected. Please select a pickup request to continue.');
        }
      }
    }
    
    const wasteType = typeMapping[bagType] || 'general';
    
    // Register bags via API
    let pointsEarned = 0;
    
    // Create an array of promises for bag registration
    const registerPromises = [];
    const timestamp = new Date().toISOString();
    
    for (let i = 0; i < quantity; i++) {
      // Create a unique bag ID using UUID and batch code
      const bagId = `${batchCode}-${uuidv4().substring(0, 8)}-${i+1}`;
      
      const registerPromise = fetch('/api/bags/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bagId,
          requestId,
          type: wasteType,
          scanned_at: timestamp
        })
      }).then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Failed to register bag');
          });
        }
        return response.json();
      }).then(data => {
        if (data.pointsAwarded) {
          pointsEarned += data.pointsAwarded;
        }
        return data;
      });
      
      registerPromises.push(registerPromise);
    }
    
    // Wait for all bag registrations to complete
    const results = await Promise.all(registerPromises);
    hideSpinner();
    
    // Create a nice message about points earned
    let pointsMessage = '';
    if (pointsEarned > 0) {
      pointsMessage = ` and earned ${pointsEarned} points`;
      
      // Update the points display in the navbar
      const userPointsElement = document.getElementById('user-points');
      if (userPointsElement) {
        const currentPoints = parseInt(userPointsElement.textContent) || 0;
        userPointsElement.textContent = currentPoints + pointsEarned;
      }
    }
    
    // Show additional success message
    showToast('Success', `${quantity} ${bagType} bags registered successfully${pointsMessage}!`, 'success');
    
    // Refresh recently scanned bags
    loadRecentBags();
    
    return { 
      success: true, 
      offline: false,
      pointsEarned,
      results
    };
    
  } catch (error) {
    console.error('Error registering bags:', error);
    hideSpinner();
    showToast('Error', error.message || 'Failed to register bags in your account.', 'danger');
    throw error;
  }
}

// Show scan result in the UI
function showScanResult(batchCode, bagType, quantity, isOffline = false) {
  // Hide scanner container
  document.getElementById('scanner-container').style.display = 'none';
  document.getElementById('manual-entry-form').closest('.card').style.display = 'none';
  
  // Show scan result
  const scanResult = document.getElementById('scan-result');
  scanResult.classList.remove('d-none');
  
  // Update result details
  document.getElementById('result-batch-code').textContent = batchCode;
  document.getElementById('result-bag-type').textContent = bagType || 'Recyclables';
  document.getElementById('result-quantity').textContent = quantity || 1;
  
  // Update success message
  const bagText = quantity > 1 ? 'bags' : 'bag';
  
  // Different message for offline mode
  if (isOffline) {
    document.getElementById('result-message').innerHTML = 
      `${quantity || 1} ${bagType || 'Recyclables'} ${bagText} have been stored locally. <span class="badge bg-warning text-dark"><i class="bi bi-wifi-off me-1"></i>Offline Mode</span>`;
  } else {
    document.getElementById('result-message').textContent = 
      `${quantity || 1} ${bagType || 'Recyclables'} ${bagText} have been added to your account.`;
  }
  
  // Set up scan again button
  document.getElementById('scan-again').addEventListener('click', resetScanner);
}

// Reset scanner for another scan
function resetScanner() {
  // Show scanner container
  document.getElementById('scanner-container').style.display = 'block';
  document.getElementById('manual-entry-form').closest('.card').style.display = 'block';
  
  // Hide scan result
  document.getElementById('scan-result').classList.add('d-none');
}

// Load user profile data
async function loadUserData() {
  try {
    // Get user profile
    const userProfile = await AuthManager.getUserProfile();
    
    if (!userProfile) {
      throw new Error('Failed to load user profile');
    }
    
    // Update username in the header
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = userProfile.first_name;
    }
    
    // Update points in the header
    const userPointsElement = document.getElementById('user-points');
    if (userPointsElement) {
      userPointsElement.textContent = userProfile.points || 0;
    }
    
  } catch (error) {
    console.error('Error loading user data:', error);
    showToast('Error', 'Failed to load user profile data.', 'danger');
  }
  
  // If no valid request ID is set, prompt user to select one
  if (!requestId) {
    hideSpinner();
    requestId = await promptUserToSelectRequest(pickupRequests);
    
    // Save for future use in this session
    if (requestId) {
      sessionStorage.setItem('selected_request_id', requestId);
    } else {
      throw new Error('No pickup request selected. Please select a pickup request to continue.');
    }
  }
}

const wasteType = typeMapping[bagType] || 'general';

// Register bags via API
let pointsEarned = 0;

// Create an array of promises for bag registration
const registerPromises = [];
const timestamp = new Date().toISOString();

for (let i = 0; i < quantity; i++) {
  // Create a unique bag ID using UUID and batch code
  const bagId = `${batchCode}-${uuidv4().substring(0, 8)}-${i+1}`;
  
  const registerPromise = fetch('/api/bags/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      bagId,
      requestId,
      type: wasteType,
      scanned_at: timestamp
    })
  }).then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.error || 'Failed to register bag');
      });
    }
    return response.json();
  }).then(data => {
    if (data.pointsAwarded) {
      pointsEarned += data.pointsAwarded;
    }
    return data;
  });
  
  registerPromises.push(registerPromise);
}

// Wait for all bag registrations to complete
const results = await Promise.all(registerPromises);
hideSpinner();

// Create a nice message about points earned
let pointsMessage = '';
if (pointsEarned > 0) {
  pointsMessage = ` and earned ${pointsEarned} points`;
  
  // Update the points display in the navbar
  const userPointsElement = document.getElementById('user-points');
  if (userPointsElement) {
    const currentPoints = parseInt(userPointsElement.textContent) || 0;
    userPointsElement.textContent = currentPoints + pointsEarned;
  }
}

// Show additional success message
showToast('Success', `${quantity} ${bagType} bags registered successfully${pointsMessage}!`, 'success');

// Refresh recently scanned bags
loadRecentBags();

return { 
  success: true, 
  offline: false,
  pointsEarned,
  results
};

} catch (error) {
  console.error('Error registering bags:', error);
  hideSpinner();
  showToast('Error', error.message || 'Failed to register bags in your account.', 'danger');
  throw error;
}

// Load recently scanned bags
async function loadRecentBags() {
  try {
    // Check for offline bags first
    let offlineBags = [];
    if (window.OfflineManager) {
      offlineBags = await window.OfflineManager.getUnsyncedBags();
    }
    
    // Get current user and token
    const user = await AuthManager.getCurrentUser();
    const token = localStorage.getItem('token');
    
    // Array to hold all bags (both online and offline)
    let allBags = [];
    
    // Get online bags if authenticated
    if (user && token) {
      try {
        // Fetch recently scanned bags from the server
        const response = await fetch('/api/bags/user', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          allBags = data.bags || [];
        } else {
          const data = await response.json();
          console.error('Error fetching bags:', data.error);
        }
      } catch (error) {
        console.error('Network error fetching bags:', error);
      }
    }
    
    // Add offline bags to the list with special marking
    if (offlineBags.length > 0) {
      // Create mock pickup request for offline bags
      const offlineRequest = {
        id: 'offline-request',
        location: 'Pending Synchronization',
        status: 'offline'
      };
      
      // Format offline bags to match online bag format
      const formattedOfflineBags = offlineBags.map(bag => ({
        ...bag,
        request_id: 'offline-request',
        pickup_requests: offlineRequest,
        offline: true
      }));
      
      // Add to the beginning of the list
      allBags = [...formattedOfflineBags, ...allBags];
    }
    
    // Update the total count
    const totalBagsCount = document.getElementById('total-bags-count');
    if (totalBagsCount) {
      totalBagsCount.textContent = allBags.length;
    }
    
    // Get the list container
    const recentBagsList = document.getElementById('recent-bags-list');
    if (!recentBagsList) return;
    
    // Clear the list
    recentBagsList.innerHTML = '';
    
    if (allBags.length === 0) {
      recentBagsList.innerHTML = `
        <li class="list-group-item px-4 py-3 text-center text-muted">
          No bags scanned yet
        </li>
      `;
      return;
    }
    
    // Group bags by request
    const bagsByRequest = {};
    
    allBags.forEach(bag => {
      const requestId = bag.request_id;
      
      if (!bagsByRequest[requestId]) {
        bagsByRequest[requestId] = [];
      }
      
      bagsByRequest[requestId].push(bag);
    });
    
    // Create list items for each request group
    Object.keys(bagsByRequest).forEach(requestId => {
      const requestBags = bagsByRequest[requestId];
      const firstBag = requestBags[0];
      const isOffline = firstBag.offline === true;
      const request = firstBag.pickup_requests || {
        location: 'Unknown location',
        status: 'unknown'
      };
      
      // Count bags by type
      const bagCounts = {};
      requestBags.forEach(bag => {
        const type = bag.type;
        bagCounts[type] = (bagCounts[type] || 0) + 1;
      });
      
      // Format the date
      const date = new Date(firstBag.created_at || firstBag.scanned_at || new Date());
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Create a list item
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item px-4 py-3';
      
      // Add offline indicator if needed
      let offlineIndicator = '';
      if (isOffline) {
        offlineIndicator = `<span class="badge bg-warning text-dark ms-2"><i class="bi bi-wifi-off me-1"></i>Offline</span>`;
        listItem.classList.add('bg-light');
      }
      
      // Prepare the badges for each bag type
      const typeBadges = Object.keys(bagCounts).map(type => {
        const badgeClass = getBadgeClassForBagType(type);
        return `<span class="badge ${badgeClass} me-1">${capitalizeFirstLetter(type)}: ${bagCounts[type]}</span>`;
      }).join('');
      
      // Create the HTML content
      listItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1">${request.location || 'No location specified'}${offlineIndicator}</h6>
            <p class="mb-1">${typeBadges}</p>
            <small class="text-muted">Scanned on ${formattedDate} at ${formattedTime}</small>
          </div>
          <button class="btn btn-sm btn-outline-primary view-bags-btn" data-request-id="${requestId}">
            <i class="bi bi-eye me-1"></i> View
          </button>
        </div>
      `;
      
      // Add to the list
      recentBagsList.appendChild(listItem);
      
      // Add click event to view button
      const viewBtn = listItem.querySelector('.view-bags-btn');
      viewBtn.addEventListener('click', () => {
        showBagDetails(requestId, requestBags, request);
      });
    });
  } catch (error) {
    console.error('Error loading recent bags:', error);
    showToast('Error', 'Failed to load recently scanned bags.', 'danger');
  }
}

// Set up event listeners
function setupEventListeners() {
  // Switch camera button
  const switchCameraBtn = document.getElementById('switch-camera');
  if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', switchCamera);
  }
  
  // Manual entry form
  const manualEntryForm = document.getElementById('manual-entry-form');
  if (manualEntryForm) {
    manualEntryForm.addEventListener('submit', handleManualEntry);
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Online/Offline status listeners
  window.addEventListener('online', () => {
    updateConnectionStatus(true);
    
    // Check if there are offline items to sync
    if (window.OfflineManager) {
      window.OfflineManager.updateOfflineSyncIndicator().then(count => {
        if (count > 0) {
          showToast('Connection Restored', `You are back online. ${count} items will be synchronized.`, 'info');
          window.OfflineManager.syncOfflineBags().then(result => {
            if (result.synced > 0) {
              showToast('Sync Complete', `Successfully synchronized ${result.synced} bags.`, 'success');
              loadRecentBags(); // Refresh the bags list
            }
          });
        }
      });
    }
  });
  
  window.addEventListener('offline', () => {
    updateConnectionStatus(false);
    showToast('Offline Mode', 'You are now offline. Scanned bags will be saved locally and synchronized later.', 'warning');
  });
  
  // Initial connection status check
  updateConnectionStatus(navigator.onLine);
}

// Update connection status indicators
function updateConnectionStatus(isOnline) {
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

// Show bag details in a modal
function showBagDetails(requestId, bags, request) {
  // Create a modal dynamically
  const modalId = 'bagDetailsModal';
  let modal = document.getElementById(modalId);
  
  // Remove existing modal if it exists
  if (modal) {
    modal.remove();
  }
  
  // Create new modal
  modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = modalId;
  modal.tabIndex = '-1';
  modal.setAttribute('aria-labelledby', `${modalId}Label`);
  modal.setAttribute('aria-hidden', 'true');
  
  // Set the status badge
  let statusBadge = '';
  if (request.status === 'pending') {
    statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
  } else if (request.status === 'accepted') {
    statusBadge = '<span class="badge bg-success">Accepted</span>';
  } else if (request.status === 'completed') {
    statusBadge = '<span class="badge bg-primary">Completed</span>';
  } else if (request.status === 'offline') {
    statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-wifi-off me-1"></i>Offline</span>';
  } else {
    statusBadge = `<span class="badge bg-secondary">${capitalizeFirstLetter(request.status)}</span>`;
  }
  
  // Create bag list
  const bagsList = bags.map(bag => {
    const date = new Date(bag.scanned_at || bag.created_at);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const badgeClass = getBadgeClassForBagType(bag.type);
    
    let offlineIndicator = '';
    if (bag.offline) {
      offlineIndicator = '<span class="badge bg-warning text-dark ms-2"><i class="bi bi-wifi-off me-1"></i>Pending Sync</span>';
    }
    
    return `
      <div class="card mb-2">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-0">${bag.id}</h6>
              <span class="badge ${badgeClass}">${capitalizeFirstLetter(bag.type)}</span> ${offlineIndicator}
            </div>
            <small class="text-muted">${formattedDate} ${formattedTime}</small>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Calculate points earned
  let pointsEarned = 0;
  bags.forEach(bag => {
    if (bag.type === 'recycling') pointsEarned += 5;
    if (bag.type === 'plastic') pointsEarned += 10;
  });
  
  const pointsSection = pointsEarned > 0 ? 
    `<div class="alert alert-success mt-3">
       <i class="bi bi-award-fill me-2"></i>
       <strong>${pointsEarned} points</strong> earned from these bags
     </div>` : '';
  
  // Create modal content
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-success text-white">
          <h5 class="modal-title" id="${modalId}Label">Bag Details</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <h5>Pickup Request Information</h5>
            <div class="d-flex justify-content-between align-items-center">
              <p class="mb-1"><strong>Location:</strong> ${request.location || 'No location specified'}</p>
              <div>${statusBadge}</div>
            </div>
            <p class="mb-0"><strong>Total Bags:</strong> ${bags.length}</p>
          </div>
          
          <hr>
          
          <h5>Scanned Bags (${bags.length})</h5>
          <div class="bag-list mt-3">
            ${bagsList}
          </div>
          
          ${pointsSection}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(modal);
  
  // Initialize and show the modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

// Helper function to get badge class for bag type
function getBadgeClassForBagType(type) {
  const typeMap = {
    'recycling': 'bg-success',
    'plastic': 'bg-info',
    'organic': 'bg-success bg-opacity-75',
    'general': 'bg-secondary',
    'hazardous': 'bg-danger'
  };
  
  return typeMap[type] || 'bg-secondary';
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}
// Toggle dark mode
async function toggleDarkMode(e) {
  e.preventDefault();
  
  try {
    // Toggle dark mode class on body
    const isDarkMode = document.body.classList.toggle('dark-mode');
    
    // Update button text
    const darkModeToggle = document.getElementById('toggle-theme');
    if (darkModeToggle) {
      if (isDarkMode) {
        darkModeToggle.innerHTML = '<i class="bi bi-sun me-2"></i>Light Mode';
      } else {
        darkModeToggle.innerHTML = '<i class="bi bi-moon me-2"></i>Dark Mode';
      }
    }
    
    // Get user data
    const user = await AuthManager.getCurrentUser();
    
    // Update user preference in database
    const { error } = await supabase
      .from('profiles')
      .update({ 
        dark_mode: isDarkMode,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (error) throw error;
    
  } catch (error) {
    console.error('Error toggling dark mode:', error);
    showToast('Error', 'Failed to update theme preference.', 'danger');
  }
}

// Show loading spinner
function showSpinner(message = 'Loading...') {
  // Remove existing spinner if any
  const existingSpinner = document.querySelector('.spinner-overlay');
  if (existingSpinner) {
    existingSpinner.remove();
  }
  
  // Create spinner element
  const spinnerHtml = `
    <div class="spinner-overlay">
      <div class="spinner-container">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">${message}</p>
      </div>
    </div>
  `;
  
  // Append to body
  document.body.insertAdjacentHTML('beforeend', spinnerHtml);
}

// Hide loading spinner
function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.classList.add('d-none');
  }
}

// Show a modal for the user to select which pickup request to use
async function promptUserToSelectRequest(pickupRequests) {
  return new Promise((resolve, reject) => {
    try {
      // Get the modal element
      const modal = new bootstrap.Modal(document.getElementById('pickupRequestModal'));
      const requestListEl = document.getElementById('pickup-request-list');
      
      // Clear the list
      requestListEl.innerHTML = '';
      
      // Add each pickup request as an option
      pickupRequests.forEach(request => {
        const date = new Date(request.created_at).toLocaleDateString();
        const time = new Date(request.created_at).toLocaleTimeString();
        const address = request.location || 'No address specified';
        
        const listItem = document.createElement('button');
        listItem.classList.add('list-group-item', 'list-group-item-action');
        listItem.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${address}</h6>
            <small>${date}</small>
          </div>
          <p class="mb-1">Status: <span class="badge bg-${request.status === 'pending' ? 'warning' : 'success'} text-${request.status === 'pending' ? 'dark' : 'white'}">${request.status}</span></p>
          <small>Created: ${time}</small>
        `;
        
        // Add click event to select this request
        listItem.addEventListener('click', () => {
          // Close the modal
          modal.hide();
          
          // Resolve the promise with the selected request ID
          resolve(request.id);
        });
        
        requestListEl.appendChild(listItem);
      });
      
      // Handle modal cancel
      document.querySelector('#pickupRequestModal .btn-secondary').addEventListener('click', () => {
        resolve(null); // Resolve with null if user cancels
      });
      
      // Show the modal
      modal.show();
      
    } catch (error) {
      console.error('Error showing pickup request selection modal:', error);
      reject(error);
    }
  });
}

// Show toast notification
function showToast(title, message, type = 'success') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
      <div class="toast-header bg-${type} text-white">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  // Add toast to container
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  
  // Initialize and show toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  
  // Remove toast when hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}
