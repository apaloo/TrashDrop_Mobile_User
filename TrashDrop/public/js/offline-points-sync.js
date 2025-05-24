// TrashDrop Offline Points & Rewards Sync

/**
 * OfflinePointsSync Class
 * Manages offline storage and synchronization of points data
 */
class OfflinePointsSync {
  constructor() {
    this.dbName = 'trashdrop_offline';
    this.pointsStoreName = 'points_queue';
    this.rewardsStoreName = 'rewards_redemptions';
    this.db = null;
    this.initialized = false;
    
    // Initialize IndexedDB
    this.init();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }
  
  /**
   * Initialize the IndexedDB database
   */
  async init() {
    if (this.initialized) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event.target.error);
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.initialized = true;
        console.log('OfflinePointsSync: IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create points queue store if it doesn't exist
        if (!db.objectStoreNames.contains(this.pointsStoreName)) {
          const pointsStore = db.createObjectStore(this.pointsStoreName, { keyPath: 'id', autoIncrement: true });
          pointsStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('OfflinePointsSync: Points queue store created');
        }
        
        // Create rewards redemptions store if it doesn't exist
        if (!db.objectStoreNames.contains(this.rewardsStoreName)) {
          const rewardsStore = db.createObjectStore(this.rewardsStoreName, { keyPath: 'id', autoIncrement: true });
          rewardsStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('OfflinePointsSync: Rewards redemptions store created');
        }
      };
    });
  }
  
  /**
   * Handle online event
   * Attempt to sync pending points and redemptions
   */
  async handleOnline() {
    console.log('OfflinePointsSync: Device is online. Attempting to sync...');
    try {
      // Try to sync points
      const pointsSynced = await this.syncPoints();
      
      // Try to sync redemptions
      const redemptionsSynced = await this.syncRedemptions();
      
      // Notify user if anything was synced
      if (pointsSynced > 0 || redemptionsSynced > 0) {
        this.showSyncNotification(pointsSynced, redemptionsSynced);
      }
    } catch (error) {
      console.error('OfflinePointsSync: Error syncing data:', error);
    }
  }
  
  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('OfflinePointsSync: Device is offline. Data will be stored locally.');
    // Show offline indicator if needed
  }
  
  /**
   * Queue points to be awarded when back online
   * @param {Object} pointsData - Points data to be synced
   */
  async queuePoints(pointsData) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pointsStoreName], 'readwrite');
      const store = transaction.objectStore(this.pointsStoreName);
      
      // Add timestamp to track when it was added
      const dataToStore = {
        ...pointsData,
        timestamp: new Date().getTime()
      };
      
      const request = store.add(dataToStore);
      
      request.onsuccess = () => {
        console.log('OfflinePointsSync: Points queued successfully');
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('OfflinePointsSync: Error queuing points:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Queue reward redemption to be processed when back online
   * @param {Object} redemptionData - Redemption data to be synced
   */
  async queueRedemption(redemptionData) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.rewardsStoreName], 'readwrite');
      const store = transaction.objectStore(this.rewardsStoreName);
      
      // Add timestamp to track when it was added
      const dataToStore = {
        ...redemptionData,
        timestamp: new Date().getTime()
      };
      
      const request = store.add(dataToStore);
      
      request.onsuccess = () => {
        console.log('OfflinePointsSync: Redemption queued successfully');
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('OfflinePointsSync: Error queuing redemption:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Sync queued points with the server
   * @returns {Promise<number>} Number of points synced
   */
  async syncPoints() {
    if (!navigator.onLine) {
      console.log('OfflinePointsSync: Cannot sync points while offline');
      return 0;
    }
    
    await this.init();
    
    // Get all queued points
    const queuedPoints = await this.getQueuedPoints();
    
    if (queuedPoints.length === 0) {
      console.log('OfflinePointsSync: No points to sync');
      return 0;
    }
    
    console.log(`OfflinePointsSync: Syncing ${queuedPoints.length} points...`);
    
    let syncedCount = 0;
    
    // Process each queued point
    for (const pointData of queuedPoints) {
      try {
        // Send to server
        const response = await fetch('/api/points/award', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AuthManager.getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requestId: pointData.requestId,
            points: pointData.points,
            reason: pointData.reason
          })
        });
        
        if (response.ok) {
          // Remove from queue if successful
          await this.removeQueuedPoint(pointData.id);
          syncedCount++;
        } else {
          console.error('OfflinePointsSync: Error syncing point:', await response.json());
        }
      } catch (error) {
        console.error('OfflinePointsSync: Error syncing point:', error);
      }
    }
    
    console.log(`OfflinePointsSync: Synced ${syncedCount}/${queuedPoints.length} points`);
    return syncedCount;
  }
  
  /**
   * Sync queued redemptions with the server
   * @returns {Promise<number>} Number of redemptions synced
   */
  async syncRedemptions() {
    if (!navigator.onLine) {
      console.log('OfflinePointsSync: Cannot sync redemptions while offline');
      return 0;
    }
    
    await this.init();
    
    // Get all queued redemptions
    const queuedRedemptions = await this.getQueuedRedemptions();
    
    if (queuedRedemptions.length === 0) {
      console.log('OfflinePointsSync: No redemptions to sync');
      return 0;
    }
    
    console.log(`OfflinePointsSync: Syncing ${queuedRedemptions.length} redemptions...`);
    
    let syncedCount = 0;
    
    // Process each queued redemption
    for (const redemptionData of queuedRedemptions) {
      try {
        // Send to server
        const response = await fetch('/api/points/redeem', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AuthManager.getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rewardId: redemptionData.rewardId
          })
        });
        
        if (response.ok) {
          // Remove from queue if successful
          await this.removeQueuedRedemption(redemptionData.id);
          syncedCount++;
        } else {
          console.error('OfflinePointsSync: Error syncing redemption:', await response.json());
        }
      } catch (error) {
        console.error('OfflinePointsSync: Error syncing redemption:', error);
      }
    }
    
    console.log(`OfflinePointsSync: Synced ${syncedCount}/${queuedRedemptions.length} redemptions`);
    return syncedCount;
  }
  
  /**
   * Get all queued points
   * @returns {Promise<Array>} Array of queued points
   */
  async getQueuedPoints() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pointsStoreName], 'readonly');
      const store = transaction.objectStore(this.pointsStoreName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('OfflinePointsSync: Error getting queued points:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Get all queued redemptions
   * @returns {Promise<Array>} Array of queued redemptions
   */
  async getQueuedRedemptions() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.rewardsStoreName], 'readonly');
      const store = transaction.objectStore(this.rewardsStoreName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('OfflinePointsSync: Error getting queued redemptions:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Remove a queued point by ID
   * @param {number} id - ID of the queued point to remove
   */
  async removeQueuedPoint(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pointsStoreName], 'readwrite');
      const store = transaction.objectStore(this.pointsStoreName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('OfflinePointsSync: Error removing queued point:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Remove a queued redemption by ID
   * @param {number} id - ID of the queued redemption to remove
   */
  async removeQueuedRedemption(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.rewardsStoreName], 'readwrite');
      const store = transaction.objectStore(this.rewardsStoreName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('OfflinePointsSync: Error removing queued redemption:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Show a notification that data has been synced
   * @param {number} pointsCount - Number of points synced
   * @param {number} redemptionsCount - Number of redemptions synced
   */
  showSyncNotification(pointsCount, redemptionsCount) {
    // Check if we have a toast function available
    if (typeof showToast === 'function') {
      let message = '';
      
      if (pointsCount > 0) {
        message += `${pointsCount} points transactions synced. `;
      }
      
      if (redemptionsCount > 0) {
        message += `${redemptionsCount} reward redemptions synced.`;
      }
      
      showToast('Sync Complete', message, 'success');
    } else {
      console.log(`OfflinePointsSync: Synced ${pointsCount} points and ${redemptionsCount} redemptions`);
    }
  }
}

// Create a global instance
const offlinePointsSync = new OfflinePointsSync();

// Helper function to award points with offline support
async function awardPointsWithOfflineSupport(requestId, points, reason) {
  const pointsData = {
    requestId,
    points,
    reason,
    timestamp: new Date().toISOString()
  };
  
  if (navigator.onLine) {
    try {
      const response = await fetch('/api/points/award', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AuthManager.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pointsData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to award points');
      }
      
      return await response.json();
    } catch (error) {
      console.log('Error awarding points, queuing for offline sync:', error);
      await offlinePointsSync.queuePoints(pointsData);
      
      // Return mock response for offline mode
      return {
        message: 'Points queued for sync',
        pointsId: 'offline-' + Date.now(),
        points: points,
        offlineQueued: true
      };
    }
  } else {
    // Queue for later when online
    await offlinePointsSync.queuePoints(pointsData);
    
    // Return mock response for offline mode
    return {
      message: 'Points queued for sync',
      pointsId: 'offline-' + Date.now(),
      points: points,
      offlineQueued: true
    };
  }
}

// Helper function to redeem reward with offline support
async function redeemRewardWithOfflineSupport(rewardId) {
  const redemptionData = {
    rewardId,
    timestamp: new Date().toISOString()
  };
  
  if (navigator.onLine) {
    try {
      const response = await fetch('/api/points/redeem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AuthManager.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(redemptionData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to redeem reward');
      }
      
      return await response.json();
    } catch (error) {
      console.log('Error redeeming reward, queuing for offline sync:', error);
      await offlinePointsSync.queueRedemption(redemptionData);
      
      // Return mock response for offline mode
      return {
        message: 'Redemption queued for sync',
        offlineQueued: true
      };
    }
  } else {
    // Queue for later when online
    await offlinePointsSync.queueRedemption(redemptionData);
    
    // Return mock response for offline mode
    return {
      message: 'Redemption queued for sync',
      offlineQueued: true
    };
  }
}
