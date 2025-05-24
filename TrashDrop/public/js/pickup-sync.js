/**
 * TrashDrop Pickup Request Sync Module
 * Handles offline storage and synchronization of pickup requests
 */

class PickupRequestSync {
  constructor() {
    this.dbName = 'trashdrop_offline_db';
    this.storeName = 'pickup_requests';
    this.syncQueueName = 'sync_queue';
    this.syncInProgress = false;
    
    // Initialize the database connection
    this.initDb();
    
    // Set up event listeners for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Listen for messages from the service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_ATTEMPTED' && event.data.tag === 'sync-pickups') {
          this.syncPickupRequests();
        }
      });
    }
  }
  
  /**
   * Initialize the IndexedDB database
   */
  async initDb() {
    try {
      // Reusing the existing database structure from offline-sync.js
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName);
        
        request.onerror = (event) => {
          console.error('Error opening IndexedDB:', event.target.error);
          reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
      });
      
      console.log('PickupRequestSync: IndexedDB initialized');
    } catch (error) {
      console.error('PickupRequestSync: Error initializing IndexedDB', error);
    }
  }
  
  /**
   * Handle online event
   */
  handleOnline() {
    console.log('PickupRequestSync: Device is online. Attempting to sync...');
    this.syncPickupRequests();
    
    // Register for background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('sync-pickups')
          .then(() => console.log('Background sync registered for pickup requests'))
          .catch(err => console.error('Background sync registration failed:', err));
      });
    }
  }
  
  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('PickupRequestSync: Device is offline. Data will be stored locally.');
    this.updateOfflineIndicator();
  }
  
  /**
   * Save a pickup request for offline storage
   * @param {Object} pickupRequest - The pickup request data
   * @returns {Promise<string>} - ID of the saved request
   */
  async savePickupRequest(pickupRequest) {
    try {
      const db = await this.openDatabase();
      
      // Generate a unique ID if none provided (for new requests)
      if (!pickupRequest.id) {
        pickupRequest.id = 'offline-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      }
      
      // Set sync status and timestamps
      pickupRequest.synced = false;
      pickupRequest.created_at = pickupRequest.created_at || new Date().toISOString();
      pickupRequest.updated_at = new Date().toISOString();
      
      // Save to IndexedDB
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise((resolve, reject) => {
        const request = store.put(pickupRequest);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
      
      // Add to sync queue if we're offline
      if (!navigator.onLine) {
        await this.addToSyncQueue('pickup_request', 'create', pickupRequest);
      }
      
      // Update offline indicator
      this.updateOfflineIndicator();
      
      return pickupRequest.id;
    } catch (error) {
      console.error('PickupRequestSync: Error saving pickup request:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing pickup request
   * @param {string} id - ID of the pickup request to update
   * @param {Object} updates - The properties to update
   * @returns {Promise<boolean>} - Success status
   */
  async updatePickupRequest(id, updates) {
    try {
      const db = await this.openDatabase();
      
      // Get the existing request
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const existingRequest = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
      });
      
      if (!existingRequest) {
        throw new Error(`Pickup request with ID ${id} not found`);
      }
      
      // Update the request with new values
      const updatedRequest = {
        ...existingRequest,
        ...updates,
        synced: false,
        updated_at: new Date().toISOString()
      };
      
      // Save the updated request
      await new Promise((resolve, reject) => {
        const request = store.put(updatedRequest);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
      
      // Add to sync queue if we're offline
      if (!navigator.onLine) {
        await this.addToSyncQueue('pickup_request', 'update', updatedRequest);
      }
      
      // Update offline indicator
      this.updateOfflineIndicator();
      
      return true;
    } catch (error) {
      console.error('PickupRequestSync: Error updating pickup request:', error);
      return false;
    }
  }
  
  /**
   * Get all pickup requests
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Array of pickup requests
   */
  async getPickupRequests(filters = {}) {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const requests = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
      });
      
      // Apply filters if provided
      let filteredRequests = requests;
      
      if (filters.status) {
        filteredRequests = filteredRequests.filter(req => req.status === filters.status);
      }
      
      if (filters.userId) {
        filteredRequests = filteredRequests.filter(req => req.user_id === filters.userId);
      }
      
      // Sort by created_at descending (newest first)
      filteredRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return filteredRequests;
    } catch (error) {
      console.error('PickupRequestSync: Error getting pickup requests:', error);
      return [];
    }
  }
  
  /**
   * Get a single pickup request by ID
   * @param {string} id - ID of the pickup request
   * @returns {Promise<Object|null>} - The pickup request or null if not found
   */
  async getPickupRequest(id) {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error(`PickupRequestSync: Error getting pickup request ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Synchronize offline pickup requests with the server
   * @returns {Promise<Object>} - Sync results
   */
  async syncPickupRequests() {
    if (this.syncInProgress) {
      console.log('PickupRequestSync: Sync already in progress');
      return { synced: 0, failed: 0, pending: 0 };
    }
    
    this.syncInProgress = true;
    
    try {
      if (!navigator.onLine) {
        console.log('PickupRequestSync: Cannot sync while offline');
        this.syncInProgress = false;
        return { synced: 0, failed: 0, pending: 0 };
      }
      
      // Get unsynced pickup requests
      const db = await this.openDatabase();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const unsyncedRequests = await new Promise((resolve, reject) => {
        const request = store.index('synced').getAll(false);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
      });
      
      if (unsyncedRequests.length === 0) {
        console.log('PickupRequestSync: No unsynced pickup requests');
        this.syncInProgress = false;
        return { synced: 0, failed: 0, pending: 0 };
      }
      
      console.log(`PickupRequestSync: Syncing ${unsyncedRequests.length} pickup requests`);
      
      // Get the auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('PickupRequestSync: No authentication token found');
        this.syncInProgress = false;
        return { synced: 0, failed: 0, pending: unsyncedRequests.length };
      }
      
      let syncedCount = 0;
      let failedCount = 0;
      
      // Process each unsynced request
      for (const request of unsyncedRequests) {
        try {
          // Determine if this is a new request or an update
          const isNewRequest = request.id.startsWith('offline-');
          const apiEndpoint = isNewRequest ? '/api/pickup-requests' : `/api/pickup-requests/${request.id}`;
          const method = isNewRequest ? 'POST' : 'PUT';
          
          // Prepare the request data
          const requestData = { ...request };
          
          // Remove offline-specific properties
          delete requestData.synced;
          delete requestData.syncAttempts;
          
          // If it's a new request, remove the offline ID
          if (isNewRequest) {
            delete requestData.id;
          }
          
          // Send to server
          const response = await fetch(apiEndpoint, {
            method: method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
          });
          
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          
          const responseData = await response.json();
          
          // Update the local record as synced
          const updateTx = db.transaction([this.storeName], 'readwrite');
          const updateStore = updateTx.objectStore(this.storeName);
          
          // If it was a new request, we need to update the ID
          if (isNewRequest) {
            // Delete the record with the offline ID
            await new Promise((resolve, reject) => {
              const deleteRequest = updateStore.delete(request.id);
              deleteRequest.onsuccess = () => resolve();
              deleteRequest.onerror = (e) => reject(e.target.error);
            });
            
            // Add the record with the new server-generated ID
            await new Promise((resolve, reject) => {
              const newRecord = {
                ...requestData,
                id: responseData.id,
                synced: true,
                syncedAt: new Date().toISOString()
              };
              
              const addRequest = updateStore.add(newRecord);
              addRequest.onsuccess = () => resolve();
              addRequest.onerror = (e) => reject(e.target.error);
            });
          } else {
            // Just update the existing record
            await new Promise((resolve, reject) => {
              const updatedRecord = {
                ...request,
                synced: true,
                syncedAt: new Date().toISOString()
              };
              
              const updateRequest = updateStore.put(updatedRecord);
              updateRequest.onsuccess = () => resolve();
              updateRequest.onerror = (e) => reject(e.target.error);
            });
          }
          
          syncedCount++;
        } catch (error) {
          console.error(`PickupRequestSync: Error syncing request ${request.id}:`, error);
          
          // Update sync attempt count
          const updateTx = db.transaction([this.storeName], 'readwrite');
          const updateStore = updateTx.objectStore(this.storeName);
          
          request.syncAttempts = (request.syncAttempts || 0) + 1;
          request.lastSyncError = error.message;
          request.lastSyncAttempt = new Date().toISOString();
          
          await new Promise((resolve) => {
            const updateRequest = updateStore.put(request);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => resolve(); // Continue even if this update fails
          });
          
          failedCount++;
        }
      }
      
      console.log(`PickupRequestSync: Synced ${syncedCount}/${unsyncedRequests.length} pickup requests`);
      
      // Update the UI indicators
      this.updateOfflineIndicator();
      
      // Notify service worker to update API cache
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_API_CACHE'
        });
      }
      
      this.syncInProgress = false;
      return {
        synced: syncedCount,
        failed: failedCount,
        pending: unsyncedRequests.length - syncedCount - failedCount
      };
    } catch (error) {
      console.error('PickupRequestSync: Error during sync:', error);
      this.syncInProgress = false;
      return { synced: 0, failed: 0, pending: 0, error: error.message };
    }
  }
  
  /**
   * Add an item to the sync queue
   * @param {string} entityType - Type of entity (e.g., 'pickup_request')
   * @param {string} action - Action type (e.g., 'create', 'update')
   * @param {Object} data - The data to sync
   * @returns {Promise<number>} - ID of the sync queue item
   */
  async addToSyncQueue(entityType, action, data) {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([this.syncQueueName], 'readwrite');
      const store = transaction.objectStore(this.syncQueueName);
      
      const syncItem = {
        entity_type: entityType,
        action: action,
        data: data,
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      return new Promise((resolve, reject) => {
        const request = store.add(syncItem);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error('PickupRequestSync: Error adding to sync queue:', error);
      return null;
    }
  }
  
  /**
   * Get the count of unsynced pickup requests
   * @returns {Promise<number>} - Count of unsynced requests
   */
  async getUnsyncedCount() {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('synced');
      
      return new Promise((resolve, reject) => {
        const request = index.count(false);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error('PickupRequestSync: Error getting unsynced count:', error);
      return 0;
    }
  }
  
  /**
   * Update the offline indicator in the UI
   */
  async updateOfflineIndicator() {
    try {
      const count = await this.getUnsyncedCount();
      
      // Update the UI indicator
      const offlineIndicator = document.getElementById('pickup-offline-indicator');
      if (offlineIndicator) {
        if (count > 0) {
          offlineIndicator.textContent = count;
          offlineIndicator.classList.remove('d-none');
        } else {
          offlineIndicator.classList.add('d-none');
        }
      }
      
      // Update any global offline indicator
      const globalIndicator = document.getElementById('offline-indicator');
      if (globalIndicator) {
        // Get counts from other sync modules if they exist
        let totalCount = count;
        
        if (window.OfflineManager && typeof window.OfflineManager.getUnsyncedBags === 'function') {
          const bagsCount = await window.OfflineManager.getUnsyncedBags().then(bags => bags.length).catch(() => 0);
          totalCount += bagsCount;
        }
        
        if (totalCount > 0) {
          globalIndicator.textContent = totalCount;
          globalIndicator.classList.remove('d-none');
        } else if (count === 0) { // Only hide if our count is 0 (other modules might still have pending items)
          globalIndicator.classList.add('d-none');
        }
      }
      
      return count;
    } catch (error) {
      console.error('PickupRequestSync: Error updating offline indicator:', error);
      return 0;
    }
  }
  
  /**
   * Open the database
   * @returns {Promise<IDBDatabase>} - IndexedDB database instance
   */
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }
}

// Create a global instance
const pickupRequestSync = new PickupRequestSync();

// Make it available globally
window.PickupRequestSync = pickupRequestSync;
