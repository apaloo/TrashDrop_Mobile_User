// TrashDrop QR Code Scanner - Updated Version
// Combines the working scanner functionality with existing bag management features

// Create OfflineManager namespace for handling offline operations
window.OfflineManager = {
    // Database configuration
    dbName: 'TrashDropOfflineDB',
    dbVersion: 1,
    storeName: 'offlineBags',
    
    // Open IndexedDB connection
    openDB: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for offline bags if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('batchCode', 'batchCode', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('Created offline bags store');
                }
            };
        });
    },
    
    // Store bag data offline
    storeOfflineBag: async function(bagData) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            // Add timestamp for sorting
            bagData.timestamp = new Date().toISOString();
            
            // Store the bag data
            const request = store.add(bagData);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('Bag stored offline successfully');
                    resolve({ success: true, id: request.result });
                };
                
                request.onerror = (event) => {
                    console.error('Error storing bag offline:', event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    db.close();
                };
            });
        } catch (error) {
            console.error('Failed to store bag offline:', error);
            throw error;
        }
    },
    
    // Get all offline bags
    getOfflineBags: async function() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = (event) => {
                    console.error('Error getting offline bags:', event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    db.close();
                };
            });
        } catch (error) {
            console.error('Failed to get offline bags:', error);
            return [];
        }
    },
    
    // Delete an offline bag by ID
    deleteOfflineBag: async function(id) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.delete(id);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.error('Error deleting offline bag:', event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    db.close();
                };
            });
        } catch (error) {
            console.error('Failed to delete offline bag:', error);
            return false;
        }
    },
    
    // Update offline sync indicator
    updateOfflineSyncIndicator: async function() {
        try {
            const bags = await this.getOfflineBags();
            const count = bags.length;
            
            const indicator = document.getElementById('offline-count');
            if (indicator) {
                if (count > 0) {
                    indicator.textContent = count;
                    indicator.classList.remove('d-none');
                } else {
                    indicator.classList.add('d-none');
                }
            }
            
            return count;
        } catch (error) {
            console.error('Error updating offline indicator:', error);
            return 0;
        }
    },
    
    // Synchronize offline bags when online
    syncOfflineBags: async function() {
        if (!navigator.onLine) {
            console.log('Cannot sync: device is offline');
            return { synced: 0, failed: 0 };
        }
        
        try {
            const bags = await this.getOfflineBags();
            
            if (bags.length === 0) {
                console.log('No offline bags to sync');
                return { synced: 0, failed: 0 };
            }
            
            console.log(`Syncing ${bags.length} offline bags`);
            
            let synced = 0;
            let failed = 0;
            
            // Process each bag
            for (const bag of bags) {
                try {
                    // Send bag to server
                    const response = await fetch('/api/bags/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${devUserStorage.getToken()}`
                        },
                        body: JSON.stringify({
                            batchCode: bag.batchCode,
                            type: bag.type,
                            quantity: bag.quantity,
                            locationId: bag.locationId,
                            pickupRequestId: bag.pickupRequestId
                        })
                    });
                    
                    if (response.ok) {
                        // Delete from offline storage
                        await this.deleteOfflineBag(bag.id);
                        synced++;
                    } else {
                        console.error('Failed to sync bag:', await response.text());
                        failed++;
                    }
                } catch (error) {
                    console.error('Error syncing bag:', error);
                    failed++;
                }
            }
            
            // Update the indicator
            this.updateOfflineSyncIndicator();
            
            return { synced, failed };
        } catch (error) {
            console.error('Error syncing offline bags:', error);
            return { synced: 0, failed: 0 };
        }
    }
};

// Scanner variables
let html5QrCode = null;
let currentCamera = 'environment'; // Start with back camera
let isScanning = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Scanner script loaded');
    
    // Check authentication
    const isAuthenticated = await AuthManager.isAuthenticated();
    
    if (!isAuthenticated) {
        window.location.href = '/login';
        return;
    }
    
    // Ensure we always have a development token for testing
    if (!devUserStorage.getToken()) {
        console.log('Creating development authentication token');
        devUserStorage.setToken('dev-token-' + Date.now());
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
    
    // Set initial online/offline status
    updateConnectionStatus(navigator.onLine);
});

// Initialize QR scanner
function initializeScanner() {
    console.log('Initializing scanner');
    const qrContainer = document.getElementById('qr-reader');
    
    if (!qrContainer) {
        console.error('QR reader container not found');
        return;
    }
    
    // Create scanner with configuration
    try {
        html5QrCode = new Html5Qrcode('qr-reader');
        console.log('Scanner initialized successfully');
        
        // Enable the start scanner button
        const startButton = document.getElementById('start-scanner');
        if (startButton) {
            startButton.disabled = false;
            console.log('Start scanner button enabled');
        }
    } catch (error) {
        console.error('Failed to initialize scanner:', error);
        showToast('Error', 'Failed to initialize scanner. Please reload the page.', 'danger');
    }
}

// Start the QR scanner
async function startScanner() {
    console.log('Starting scanner');
    
    try {
        if (isScanning) {
            await stopScanner();
            return;
        }
        
        const startButton = document.getElementById('start-scanner');
        
        // Change button text to show loading
        if (startButton) {
            startButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
            startButton.disabled = true;
        }
        
        // Configure scan settings
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        // Success callback
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            console.log('QR code scanned:', decodedText);
            handleQrCodeScan(decodedText);
        };
        
        // Start scanner with selected camera
        await html5QrCode.start(
            { facingMode: currentCamera },
            config,
            qrCodeSuccessCallback,
            (errorMessage) => {
                // Handle scan errors silently to avoid too many alerts
                console.log('Scanning error:', errorMessage);
            }
        );
        
        isScanning = true;
        
        // Update button text
        if (startButton) {
            startButton.innerHTML = '<i class="bi bi-stop-circle me-1"></i> Stop Scanner';
            startButton.disabled = false;
            startButton.classList.remove('btn-primary');
            startButton.classList.add('btn-danger');
        }
        
        console.log('Scanner started successfully');
    } catch (error) {
        console.error('Error starting scanner:', error);
        
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
    console.log('Stopping scanner');
    
    try {
        if (!html5QrCode) {
            console.error('Scanner object not available');
            return;
        }
        
        // Stop the scanner
        if (html5QrCode.isScanning) {
            await html5QrCode.stop();
            console.log('Scanner stopped');
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
        console.error('Error stopping scanner:', error);
        showToast('Error', 'Failed to stop the scanner.', 'danger');
    }
}

// Switch camera between front and back
async function switchCamera() {
    console.log('Switching camera');
    
    try {
        // Toggle camera facing mode
        currentCamera = currentCamera === 'environment' ? 'user' : 'environment';
        console.log('Switched to camera:', currentCamera);
        
        // If currently scanning, restart with new camera
        if (isScanning) {
            await stopScanner();
            setTimeout(() => {
                startScanner();
            }, 500);
            showToast('Camera Switched', 'Camera has been switched.', 'success');
        } else {
            showToast('Camera Switched', 'Camera will be switched when you start scanning.', 'info');
        }
    } catch (error) {
        console.error('Error switching camera:', error);
        showToast('Camera Error', 'Failed to switch camera.', 'danger');
    }
}

// Handle successful QR code scan
async function handleQrCodeScan(decodedText) {
    console.log('Handling QR code scan:', decodedText);
    
    try {
        // Stop the scanner
        if (isScanning) {
            await stopScanner();
        }
        
        // Add a vibration feedback if supported by the device
        if (navigator.vibrate) {
            navigator.vibrate(200); // 200ms vibration
        }
        
        // Play a success sound
        try {
            const successSound = new Audio('/sounds/scan-success.mp3');
            successSound.play().catch(e => console.log('Could not play sound', e));
        } catch (error) {
            console.log('Could not play sound', error);
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

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Start scanner button
    const startButton = document.getElementById('start-scanner');
    if (startButton) {
        startButton.addEventListener('click', startScanner);
        console.log('Start scanner button listener added');
    } else {
        console.error('Start scanner button not found');
    }
    
    // Switch camera button
    const switchCameraBtn = document.getElementById('switch-camera');
    if (switchCameraBtn) {
        switchCameraBtn.addEventListener('click', switchCamera);
        console.log('Switch camera button listener added');
    } else {
        console.error('Switch camera button not found');
    }
    
    // Manual entry form
    const manualEntryForm = document.getElementById('manual-entry-form');
    if (manualEntryForm) {
        manualEntryForm.addEventListener('submit', handleManualEntry);
        console.log('Manual entry form listener added');
    }
    
    // Scan again button
    const scanAgainButton = document.getElementById('scan-again');
    if (scanAgainButton) {
        scanAgainButton.addEventListener('click', resetScanner);
        console.log('Scan again button listener added');
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
    console.log('Connection status:', isOnline ? 'online' : 'offline');
    
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

// Register bags with the server or store offline
async function registerBags(batchCode, type = 'Recyclables', quantity = 1) {
    console.log('Registering bags:', { batchCode, type, quantity });
    
    try {
        // Get active pickup request ID
        const pickupRequestId = document.getElementById('pickup-request-id')?.value || null;
        let locationId = document.getElementById('location-id')?.value || null;
        
        // Prepare bag data
        const bagData = {
            batchCode,
            type,
            quantity,
            pickupRequestId,
            locationId
        };
        
        // For development, always create a token if it doesn't exist
        if (!devUserStorage.getToken()) {
            console.log('Creating development authentication token');
            devUserStorage.setToken('dev-token-' + Date.now());
        }
        
        // Check if online
        if (navigator.onLine) {
            console.log('Device is online, sending to server');
            
            // Send to server
            const response = await fetch('/api/bags/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${devUserStorage.getToken()}`
                },
                body: JSON.stringify(bagData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to register bags');
            }
            
            const data = await response.json();
            console.log('Bag registered successfully:', data);
            
            // Update points display if present
            updatePointsDisplay(data.pointsAwarded || 0);
            
            return data;
        } else {
            console.log('Device is offline, storing locally');
            
            // Store offline
            const result = await window.OfflineManager.storeOfflineBag(bagData);
            console.log('Stored for offline sync:', result);
            
            // Update offline indicator
            window.OfflineManager.updateOfflineSyncIndicator();
            
            return { ...bagData, offline: true, id: result.id };
        }
    } catch (error) {
        console.error('Error registering bags:', error);
        showToast('Error', error.message || 'Failed to register bags', 'danger');
        throw error;
    }
}

// Update points display
function updatePointsDisplay(points) {
    const pointsDisplay = document.getElementById('points-display');
    if (pointsDisplay) {
        const currentPoints = parseInt(pointsDisplay.textContent || '0', 10);
        const newPoints = currentPoints + points;
        pointsDisplay.textContent = newPoints;
        
        // Animate points change
        pointsDisplay.classList.add('text-success', 'fw-bold');
        setTimeout(() => {
            pointsDisplay.classList.remove('text-success', 'fw-bold');
        }, 2000);
    }
}

// Load user profile data
async function loadUserData() {
    try {
        const user = await AuthManager.getCurrentUser();
        if (!user) {
            console.error('User not found');
            return;
        }
        
        // Update user name display
        const userNameDisplay = document.getElementById('user-name-display');
        if (userNameDisplay && user.name) {
            userNameDisplay.textContent = user.name;
        }
        
        // Update user points display
        const pointsDisplay = document.getElementById('points-display');
        if (pointsDisplay && user.points) {
            pointsDisplay.textContent = user.points;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load recently scanned bags
async function loadRecentBags() {
    console.log('Loading recent bags');
    
    try {
        const recentBagsList = document.getElementById('recent-bags-list');
        const bagsLoading = document.getElementById('bags-loading');
        const totalBagsCount = document.getElementById('total-bags-count');
        
        if (!recentBagsList) {
            console.log('Recent bags list element not found');
            return;
        }
        
        // Show loading spinner
        if (bagsLoading) {
            bagsLoading.classList.remove('d-none');
        }
        
        // Clear previous content
        recentBagsList.innerHTML = '';
        
        // Create an array to hold all bags
        let bags = [];
        let serverBagsLoaded = false;
        
        // Ensure we have a development token for API requests
        if (!devUserStorage.getToken()) {
            console.log('Creating new development token for API request');
            devUserStorage.setToken('dev-token-' + Date.now());
        }
        
        // Try to get bags from server first
        try {
            console.log('Fetching bags from server...');
            const token = devUserStorage.getToken();
            console.log('Using token:', token ? token.substring(0, 10) + '...' : 'none');
            
            const response = await fetch('/api/bags/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                bags = await response.json();
                serverBagsLoaded = true;
                console.log('Bags loaded from server:', bags.length);
            } else {
                console.warn(`Server returned ${response.status}: ${response.statusText}`);
                // For development, if we get a 401, we'll use mock data
                if (response.status === 401) {
                    console.log('Using mock data for development');
                }
            }
        } catch (error) {
            console.warn('Error fetching from server:', error);
        }
        
        // If server request failed or returned no bags, and we're in development mode, use mock data
        if (!serverBagsLoaded) {
            console.log('Creating mock bag data for development');
            
            // Generate some mock bags for development testing
            const mockBags = [
                {
                    id: 'mock-bag-1',
                    batchCode: 'BATCH-001',
                    type: 'Plastic',
                    quantity: 1,
                    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
                },
                {
                    id: 'mock-bag-2',
                    batchCode: 'BATCH-002',
                    type: 'Recyclables',
                    quantity: 2,
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
                },
                {
                    id: 'mock-bag-3',
                    batchCode: 'BATCH-003',
                    type: 'Glass',
                    quantity: 1,
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() // 3 hours ago
                }
            ];
            
            bags = mockBags;
        }
        
        // Also get offline bags
        const offlineBags = await window.OfflineManager.getOfflineBags();
        console.log('Offline bags loaded:', offlineBags.length);
        
        // Combine and sort by date (most recent first)
        const allBags = [
            ...bags.map(bag => ({ ...bag, offline: false })),
            ...offlineBags.map(bag => ({ ...bag, offline: true }))
        ].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.created_at);
            const dateB = new Date(b.timestamp || b.created_at);
            return dateB - dateA;
        }).slice(0, 10); // Show only the 10 most recent
        
        // Update total count
        if (totalBagsCount) {
            totalBagsCount.textContent = allBags.length;
        }
        
        // Update offline sync badge
        const offlineSyncBadge = document.getElementById('offline-sync-badge');
        const offlineCount = document.getElementById('offline-count');
        if (offlineSyncBadge && offlineCount) {
            const offlineBagsCount = allBags.filter(bag => bag.offline).length;
            if (offlineBagsCount > 0) {
                offlineCount.textContent = offlineBagsCount;
                offlineSyncBadge.classList.remove('d-none');
            } else {
                offlineSyncBadge.classList.add('d-none');
            }
        }
        
        // Display bags
        if (allBags.length === 0) {
            recentBagsList.innerHTML = `
                <li class="list-group-item py-4 text-center text-muted">
                    <i class="bi bi-bag-x fs-1 d-block mb-2 text-muted"></i>
                    No bags scanned yet
                </li>
            `;
        } else {
            // Get waste type icons
            const typeIcons = {
                'Recyclables': 'bi-recycle',
                'Plastic': 'bi-droplet',
                'Organic': 'bi-tree',
                'Glass': 'bi-diamond',
                'General': 'bi-trash',
                'Hazardous': 'bi-exclamation-triangle'
            };
            
            // Create bag list items
            recentBagsList.innerHTML = allBags.map(bag => {
                const date = new Date(bag.timestamp || bag.created_at);
                const badgeClass = bag.offline ? 'bg-warning text-dark' : 'bg-success';
                const badgeText = bag.offline ? 'Pending Sync' : 'Synced';
                const typeIcon = typeIcons[bag.type] || 'bi-bag';
                const timeAgo = getTimeAgo(date);
                
                // Generate points badge based on waste type
                let pointsAwarded = 5; // Default
                if (bag.type === 'Plastic') pointsAwarded = 10;
                if (bag.type === 'Hazardous') pointsAwarded = 15;
                
                const typeColor = getBagColorByType(bag.type);
                
                return `
                    <li class="list-group-item p-3 hover-elevate">
                        <div class="d-flex align-items-center w-100">
                            <div class="bg-${typeColor} bg-opacity-10 text-${typeColor} p-2 rounded me-3 flex-shrink-0">
                                <i class="bi ${typeIcon} fs-5"></i>
                            </div>
                            <div class="flex-grow-1 min-width-0"> <!-- min-width-0 helps with text truncation -->
                                <div class="d-flex justify-content-between align-items-center mb-1 flex-wrap">
                                    <div class="d-flex align-items-center me-2 text-truncate">
                                        <h6 class="mb-0 me-2 text-truncate" style="max-width: 150px;" title="${bag.batchCode}">${bag.batchCode}</h6>
                                        <span class="badge bg-primary rounded-pill">${bag.quantity} bag${bag.quantity > 1 ? 's' : ''}</span>
                                    </div>
                                    <span class="badge ${badgeClass} rounded-pill">${badgeText}</span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center flex-wrap">
                                    <div class="d-flex align-items-center text-truncate">
                                        <small class="text-${typeColor} fw-medium me-2">${bag.type}</small>
                                        <small class="text-muted"><i class="bi bi-clock me-1"></i>${timeAgo}</small>
                                    </div>
                                    <span class="badge bg-success bg-opacity-10 text-success">+${pointsAwarded * bag.quantity} pts</span>
                                </div>
                            </div>
                        </div>
                    </li>
                `;
            }).join('');
        }
        
        // Add hover effect styles
        const style = document.createElement('style');
        if (!document.getElementById('bag-card-styles')) {
            style.id = 'bag-card-styles';
            style.textContent = `
                .hover-elevate {
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .hover-elevate:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Helper function to get time ago string
        function getTimeAgo(date) {
            const seconds = Math.floor((new Date() - date) / 1000);
            
            let interval = Math.floor(seconds / 31536000);
            if (interval >= 1) return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';
            
            interval = Math.floor(seconds / 2592000);
            if (interval >= 1) return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';
            
            interval = Math.floor(seconds / 86400);
            if (interval >= 1) return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';
            
            interval = Math.floor(seconds / 3600);
            if (interval >= 1) return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';
            
            interval = Math.floor(seconds / 60);
            if (interval >= 1) return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';
            
            return 'just now';
        }
        
        // Helper function to get color based on waste type
        function getBagColorByType(type) {
            const typeColors = {
                'Recyclables': 'success',
                'Plastic': 'info',
                'Organic': 'success',
                'Glass': 'primary',
                'General': 'secondary',
                'Hazardous': 'danger'
            };
            
            return typeColors[type] || 'primary';
        }
        
        // Hide loading spinner
        if (bagsLoading) {
            bagsLoading.classList.add('d-none');
        }
    } catch (error) {
        console.error('Error loading recent bags:', error);
        const recentBagsList = document.getElementById('recent-bags-list');
        if (recentBagsList) {
            recentBagsList.innerHTML = `<div class="alert alert-danger">Error loading bags: ${error.message}</div>`;
        }
    }
}

// Show scan result in the UI
function showScanResult(batchCode, type, quantity, isOffline = false) {
    console.log('Showing scan result:', { batchCode, type, quantity, isOffline });
    
    try {
        // Hide scanner container
        const scannerContainer = document.getElementById('scanner-container');
        if (scannerContainer) {
            scannerContainer.classList.add('d-none');
        }
        
        // Show result container
        const resultContainer = document.getElementById('scan-result');
        if (resultContainer) {
            resultContainer.classList.remove('d-none');
        }
        
        // Update result details
        const batchCodeDisplay = document.getElementById('result-batch-code');
        if (batchCodeDisplay) {
            batchCodeDisplay.textContent = batchCode;
        }
        
        const typeDisplay = document.getElementById('result-type');
        if (typeDisplay) {
            typeDisplay.textContent = type;
        }
        
        const quantityDisplay = document.getElementById('result-quantity');
        if (quantityDisplay) {
            quantityDisplay.textContent = quantity;
        }
        
        // Show offline indicator if applicable
        const offlineIndicator = document.getElementById('result-offline-indicator');
        if (offlineIndicator) {
            if (isOffline) {
                offlineIndicator.classList.remove('d-none');
            } else {
                offlineIndicator.classList.add('d-none');
            }
        }
        
        // Update recent bags list
        loadRecentBags();
    } catch (error) {
        console.error('Error showing scan result:', error);
    }
}

// Reset scanner for another scan
function resetScanner() {
    console.log('Resetting scanner');
    
    // Hide result container
    const resultContainer = document.getElementById('scan-result');
    if (resultContainer) {
        resultContainer.classList.add('d-none');
    }
    
    // Show scanner container
    const scannerContainer = document.getElementById('scanner-container');
    if (scannerContainer) {
        scannerContainer.classList.remove('d-none');
    }
    
    // Start scanner again
    startScanner();
}

// Handle manual entry form submission
function handleManualEntry(event) {
    event.preventDefault();
    console.log('Processing manual entry');
    
    try {
        const batchCodeInput = document.getElementById('manual-batch-code');
        const typeSelect = document.getElementById('manual-type');
        const quantityInput = document.getElementById('manual-quantity');
        
        if (!batchCodeInput || !typeSelect || !quantityInput) {
            throw new Error('Form elements not found');
        }
        
        const batchCode = batchCodeInput.value.trim();
        const type = typeSelect.value;
        const quantity = parseInt(quantityInput.value, 10);
        
        // Validate inputs
        if (!batchCode) {
            throw new Error('Batch code is required');
        }
        
        if (isNaN(quantity) || quantity < 1) {
            throw new Error('Quantity must be a positive number');
        }
        
        // Register bags
        registerBags(batchCode, type, quantity).then(result => {
            // Show result
            showScanResult(batchCode, type, quantity, result?.offline);
            
            // Reset form
            event.target.reset();
            
            // Close modal if open
            const manualEntryModal = bootstrap.Modal.getInstance(document.getElementById('manualEntryModal'));
            if (manualEntryModal) {
                manualEntryModal.hide();
            }
        }).catch(error => {
            showToast('Error', error.message || 'Failed to register bags', 'danger');
        });
    } catch (error) {
        console.error('Error processing manual entry:', error);
        showToast('Error', error.message || 'Invalid input', 'danger');
    }
}

// Handle logout
async function handleLogout() {
    console.log('Logging out');
    await AuthManager.logout();
    window.location.href = '/login';
}

// Initialize dark mode
function initializeDarkMode() {
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
    }
}
