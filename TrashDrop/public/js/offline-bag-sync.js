// TrashDrop Offline Bag Synchronization Module

// Initialize the IndexedDB database for offline storage
const dbName = 'trashDropOfflineDB';
const dbVersion = 1;
let db;

// Initialize the database when the script loads
function initializeOfflineDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.error('IndexedDB is not supported in this browser.');
      reject(new Error('IndexedDB not supported'));
      return;
    }
    
    const request = indexedDB.open(dbName, dbVersion);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('IndexedDB connection established successfully.');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores for offline data
      if (!db.objectStoreNames.contains('bags')) {
        const bagStore = db.createObjectStore('bags', { keyPath: 'id', autoIncrement: true });
        bagStore.createIndex('batchCode', 'batchCode', { unique: false });
        bagStore.createIndex('requestId', 'requestId', { unique: false });
        bagStore.createIndex('synced', 'synced', { unique: false });
        console.log('Bags object store created.');
      }
      
      if (!db.objectStoreNames.contains('pickupRequests')) {
        const requestStore = db.createObjectStore('pickupRequests', { keyPath: 'id' });
        requestStore.createIndex('status', 'status', { unique: false });
        requestStore.createIndex('synced', 'synced', { unique: false });
        console.log('Pickup Requests object store created.');
      }
    };
  });
}

// Store bag registration data when offline
async function storeOfflineBagRegistration(batchCode, bagType, quantity) {
  try {
    if (!db) {
      await initializeOfflineDB();
    }
    
    // Map UI bag types to database types
    const typeMapping = {
      'Recyclables': 'recycling',
      'Plastic': 'plastic',
      'Organic Waste': 'organic',
      'General Waste': 'general',
      'Hazardous Waste': 'hazardous'
    };
    
    const wasteType = typeMapping[bagType] || 'general';
    const timestamp = new Date().toISOString();
    const transaction = db.transaction(['bags'], 'readwrite');
    const objectStore = transaction.objectStore('bags');
    
    // Create one entry for each bag in the quantity
    const promises = [];
    
    for (let i = 0; i < quantity; i++) {
      const bagId = `offline-${batchCode}-${Date.now()}-${i+1}`;
      
      const bag = {
        id: bagId,
        batchCode: batchCode,
        type: wasteType,
        scanned_at: timestamp,
        created_at: timestamp,
        synced: false,
        syncAttempts: 0
      };
      
      const promise = new Promise((resolve, reject) => {
        const request = objectStore.add(bag);
        
        request.onsuccess = () => resolve(bag);
        request.onerror = (e) => reject(e.target.error);
      });
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    
    // Update the UI to show pending offline items
    updateOfflineSyncIndicator();
    
    return results;
  } catch (error) {
    console.error('Error storing offline bag registration:', error);
    throw error;
  }
}

// Get unsynchronized bags from IndexedDB
async function getUnsyncedBags() {
  try {
    if (!db) {
      await initializeOfflineDB();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bags'], 'readonly');
      const objectStore = transaction.objectStore('bags');
      // Use a cursor to filter by 'synced' status rather than direct index query
      // This avoids the 'parameter is not a valid key' error
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        // Filter the results manually to find unsynced items
        const allBags = request.result;
        const unsyncedBags = allBags.filter(bag => bag.synced === false);
        resolve(unsyncedBags);
      };
      
      request.onerror = (event) => {
        console.error('Error getting unsynced bags:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error retrieving unsynced bags:', error);
    throw error;
  }
}

// Synchronize offline bags when back online
async function syncOfflineBags() {
  try {
    if (!navigator.onLine) {
      console.log('Device is still offline. Sync aborted.');
      return { synced: 0, failed: 0, pending: 0 };
    }
    
    if (!db) {
      await initializeOfflineDB();
    }
    
    // Get the user's authentication token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found. Cannot sync offline bags.');
      return { synced: 0, failed: 0, pending: 0 };
    }
    
    // Get all unsynced bags
    const unsyncedBags = await getUnsyncedBags();
    
    if (unsyncedBags.length === 0) {
      console.log('No unsynced bags to synchronize.');
      return { synced: 0, failed: 0, pending: 0 };
    }
    
    console.log(`Attempting to sync ${unsyncedBags.length} offline bags...`);
    
    // Get the most recent pickup request for the user
    const user = await AuthManager.getCurrentUser();
    
    if (!user) {
      console.error('User not authenticated. Cannot sync offline bags.');
      return { synced: 0, failed: 0, pending: 0 };
    }
    
    const { data: pickupRequests, error: pickupError } = await supabase
      .from('pickup_requests')
      .select('*')
      .eq('collector_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (pickupError || !pickupRequests || pickupRequests.length === 0) {
      console.error('No pickup requests found to associate with offline bags.');
      return { synced: 0, failed: 0, pending: unsyncedBags.length };
    }
    
    const requestId = pickupRequests[0].id;
    let syncedCount = 0;
    let failedCount = 0;
    
    // Process each unsynced bag
    for (const bag of unsyncedBags) {
      try {
        // Increment sync attempt counter
        bag.syncAttempts += 1;
        
        // Create a new bag ID that will work with the server
        const bagId = `${bag.batchCode}-${uuidv4().substring(0, 8)}`;
        
        // Register the bag via API
        const response = await fetch('/api/bags/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bagId: bagId,
            requestId: requestId,
            type: bag.type,
            scanned_at: bag.scanned_at
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to register bag');
        }
        
        // Mark as synced in IndexedDB
        const transaction = db.transaction(['bags'], 'readwrite');
        const objectStore = transaction.objectStore('bags');
        
        bag.synced = true;
        bag.syncedAt = new Date().toISOString();
        
        await new Promise((resolve, reject) => {
          const updateRequest = objectStore.put(bag);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = (e) => reject(e.target.error);
        });
        
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing bag ${bag.id}:`, error);
        
        // Update the bag with error information
        const transaction = db.transaction(['bags'], 'readwrite');
        const objectStore = transaction.objectStore('bags');
        
        bag.lastError = error.message;
        bag.lastAttempt = new Date().toISOString();
        
        // If we've tried too many times, mark as failed
        if (bag.syncAttempts >= 5) {
          bag.syncFailed = true;
        }
        
        await new Promise((resolve) => {
          const updateRequest = objectStore.put(bag);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => resolve(); // Continue even if this update fails
        });
        
        failedCount++;
      }
    }
    
    // Update the offline sync indicator
    updateOfflineSyncIndicator();
    
    return {
      synced: syncedCount,
      failed: failedCount,
      pending: unsyncedBags.length - syncedCount - failedCount
    };
  } catch (error) {
    console.error('Error during offline bag synchronization:', error);
    return { synced: 0, failed: 0, pending: 0, error: error.message };
  }
}

// Update the offline sync indicator in the UI
async function updateOfflineSyncIndicator() {
  try {
    if (!db) {
      await initializeOfflineDB();
    }
    
    // Get counts of unsynced bags
    const unsyncedBags = await getUnsyncedBags();
    const pendingCount = unsyncedBags.length;
    
    // Update the UI indicator
    const offlineIndicator = document.getElementById('offline-indicator');
    
    if (offlineIndicator) {
      if (pendingCount > 0) {
        offlineIndicator.textContent = pendingCount;
        offlineIndicator.classList.remove('d-none');
      } else {
        offlineIndicator.classList.add('d-none');
      }
    }
    
    // Update connection status indicators
    const onlineStatus = document.getElementById('online-status');
    const offlineStatus = document.getElementById('offline-status');
    
    if (onlineStatus && offlineStatus) {
      if (navigator.onLine) {
        onlineStatus.classList.remove('d-none');
        offlineStatus.classList.add('d-none');
      } else {
        onlineStatus.classList.add('d-none');
        offlineStatus.classList.remove('d-none');
      }
    }
    
    return pendingCount;
  } catch (error) {
    console.error('Error updating offline sync indicator:', error);
    return 0;
  }
}

// Setup event listeners for online/offline status
function setupOfflineListeners() {
  // Listen for online events
  window.addEventListener('online', async () => {
    console.log('Device is now online. Attempting to sync offline data...');
    showToast('Connection Restored', 'You are now online. Syncing offline data...', 'info');
    
    try {
      const result = await syncOfflineBags();
      
      if (result.synced > 0) {
        showToast('Sync Complete', `Successfully synchronized ${result.synced} bags.`, 'success');
        
        // Refresh the bags list
        if (typeof loadRecentBags === 'function') {
          loadRecentBags();
        }
      }
      
      if (result.failed > 0) {
        showToast('Sync Warning', `Failed to sync ${result.failed} bags. Will retry later.`, 'warning');
      }
      
      // Update connection status display
      updateOfflineSyncIndicator();
    } catch (error) {
      console.error('Error during online sync:', error);
      showToast('Sync Error', 'Failed to synchronize some offline data. Will retry later.', 'danger');
    }
  });
  
  // Listen for offline events
  window.addEventListener('offline', () => {
    console.log('Device is now offline. Data will be stored locally.');
    showToast('Offline Mode', 'You are now offline. Changes will be saved locally and synchronized when you reconnect.', 'warning');
    
    // Update connection status display
    updateOfflineSyncIndicator();
  });
  
  // Initial connection status check
  updateOfflineSyncIndicator();
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Initialize IndexedDB
  initializeOfflineDB().then(() => {
    console.log('Offline database initialized successfully');
    
    // Set up online/offline listeners
    setupOfflineListeners();
    
    // Check for unsynced items on page load
    updateOfflineSyncIndicator().then(pendingCount => {
      if (pendingCount > 0 && navigator.onLine) {
        console.log(`Found ${pendingCount} unsynced items. Attempting to sync...`);
        syncOfflineBags();
      }
    });
  }).catch(error => {
    console.error('Failed to initialize offline database:', error);
  });
});

// Export functions for use in other modules
window.OfflineManager = {
  storeOfflineBagRegistration,
  syncOfflineBags,
  getUnsyncedBags,
  updateOfflineSyncIndicator
};
