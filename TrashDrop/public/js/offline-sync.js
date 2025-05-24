/**
 * Offline Sync Functionality for TrashDrop
 * Handles data persistence and synchronization between online and offline states
 */

// IndexedDB database configuration
const DB_NAME = 'trashdrop_offline_db';
const DB_VERSION = 3; // Incremented to add profiles store
const STORES = {
    LOCATIONS: 'locations',
    PICKUP_REQUESTS: 'pickup_requests',
    BAGS: 'bags',
    PROFILES: 'profiles',
    PREFERENCES: 'preferences',
    SYNC_QUEUE: 'sync_queue'
};

// Initialize the database
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject('Could not open offline database');
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            
            // Create object stores
            if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
                const locationsStore = db.createObjectStore(STORES.LOCATIONS, { keyPath: 'id' });
                locationsStore.createIndex('user_id', 'user_id', { unique: false });
                locationsStore.createIndex('is_default', 'is_default', { unique: false });
                locationsStore.createIndex('location_type', 'location_type', { unique: false });
            }
            
            // Add pickup requests store (new in version 2)
            if (oldVersion < 2 && !db.objectStoreNames.contains(STORES.PICKUP_REQUESTS)) {
                const pickupRequestsStore = db.createObjectStore(STORES.PICKUP_REQUESTS, { keyPath: 'id' });
                pickupRequestsStore.createIndex('status', 'status', { unique: false });
                pickupRequestsStore.createIndex('created_at', 'created_at', { unique: false });
                pickupRequestsStore.createIndex('synced', 'synced', { unique: false });
            }
            
            // Add bags store (new in version 2)
            if (oldVersion < 2 && !db.objectStoreNames.contains(STORES.BAGS)) {
                const bagsStore = db.createObjectStore(STORES.BAGS, { keyPath: 'id' });
                bagsStore.createIndex('request_id', 'request_id', { unique: false });
                bagsStore.createIndex('type', 'type', { unique: false });
                bagsStore.createIndex('synced', 'synced', { unique: false });
            }
            
            // Add profiles store (new in version 3)
            if (oldVersion < 3 && !db.objectStoreNames.contains(STORES.PROFILES)) {
                const profilesStore = db.createObjectStore(STORES.PROFILES, { keyPath: 'id' });
                profilesStore.createIndex('synced', 'synced', { unique: false });
                profilesStore.createIndex('updated_at', 'updated_at', { unique: false });
            }
            
            // Add preferences store (new in version 3)
            if (oldVersion < 3 && !db.objectStoreNames.contains(STORES.PREFERENCES)) {
                const preferencesStore = db.createObjectStore(STORES.PREFERENCES, { keyPath: 'id' });
                preferencesStore.createIndex('user_id', 'user_id', { unique: false });
                preferencesStore.createIndex('synced', 'synced', { unique: false });
                preferencesStore.createIndex('updated_at', 'updated_at', { unique: false });
            }
            
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
                syncQueueStore.createIndex('entity_type', 'entity_type', { unique: false });
                syncQueueStore.createIndex('action', 'action', { unique: false });
                syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Open a database transaction
function openTransaction(storeName, mode = 'readonly') {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDatabase();
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            
            resolve({ transaction, store });
        } catch (error) {
            console.error('Error opening transaction:', error);
            reject(error);
        }
    });
}

// Save locations to IndexedDB
async function saveLocationsToIndexedDB(locations) {
    try {
        const { store, transaction } = await openTransaction(STORES.LOCATIONS, 'readwrite');
        
        // Create a promise that resolves when the transaction completes
        const complete = new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        
        // Add or update each location
        locations.forEach(location => {
            store.put(location);
        });
        
        // Wait for the transaction to complete
        await complete;
        return true;
    } catch (error) {
        console.error('Error saving locations to IndexedDB:', error);
        return false;
    }
}

// Get all locations from IndexedDB
async function getLocationsFromIndexedDB() {
    try {
        const { store } = await openTransaction(STORES.LOCATIONS, 'readonly');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error getting locations from IndexedDB:', error);
        return [];
    }
}

// Get a specific location from IndexedDB
async function getLocationFromIndexedDB(locationId) {
    try {
        if (!locationId) {
            console.error('Error getting location: Location ID is required');
            throw new Error('Location ID is required');
        }
        
        console.log(`Retrieving location with ID: ${locationId} from IndexedDB`);
        const { store } = await openTransaction(STORES.LOCATIONS, 'readonly');
        
        return new Promise((resolve, reject) => {
            const request = store.get(locationId);
            
            request.onsuccess = () => {
                if (request.result) {
                    console.log(`Successfully retrieved location with ID: ${locationId}`);
                    resolve(request.result);
                } else {
                    console.warn(`Location with ID: ${locationId} not found in IndexedDB`);
                    resolve(null); // Location not found, but not an error
                }
            };
            
            request.onerror = () => {
                const errorMsg = request.error ? request.error.message : 'Unknown IndexedDB error';
                console.error(`Error retrieving location with ID: ${locationId}:`, errorMsg);
                reject(new Error(`Failed to retrieve location: ${errorMsg}`));
            };
        });
    } catch (error) {
        const errorMsg = error.message || 'Unknown error getting location';
        console.error('Error getting location from IndexedDB:', errorMsg, error);
        throw error; // Re-throw to allow proper error handling by the caller
    }
}

// Delete a location from IndexedDB
async function deleteLocationFromIndexedDB(locationId) {
    try {
        const { store, transaction } = await openTransaction(STORES.LOCATIONS, 'readwrite');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(locationId);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error deleting location from IndexedDB:', error);
        return false;
    }
}

// Helper function to remove an item from the sync queue
async function removeFromSyncQueue(id) {
    try {
        const { store } = await openTransaction(STORES.SYNC_QUEUE, 'readwrite');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error removing item from sync queue:', error);
        return false;
    }
}

// Process profile sync items
async function processSyncProfileItem(item) {
    try {
        if (item.action === 'update') {
            const profileData = item.data;
            
            // For development mode, just update local storage
            if (AuthManager.isDev && AuthManager.isDev()) {
                const currentUser = AuthManager.devUserStorage.getUser();
                if (currentUser && currentUser.id === profileData.user_id) {
                    const updatedUser = { ...currentUser, ...profileData };
                    AuthManager.devUserStorage.setUser(updatedUser);
                }
                return true;
            }
            
            // For production, update in Supabase
            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: profileData.first_name,
                    last_name: profileData.last_name,
                    phone: profileData.phone,
                    address: profileData.address,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profileData.user_id);
            
            if (error) throw error;
            
            // Mark as synced in IndexedDB
            const localProfile = await getProfileFromIndexedDB(profileData.user_id);
            if (localProfile) {
                await saveProfileToIndexedDB({
                    ...localProfile,
                    synced: true
                });
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error processing profile sync item:', error);
        throw error;
    }
}

// Process preferences sync items
async function processSyncPreferencesItem(item) {
    try {
        if (item.action === 'update') {
            const preferencesData = item.data;
            
            // For development mode, just update local storage
            if (AuthManager.isDev && AuthManager.isDev()) {
                const currentUser = AuthManager.devUserStorage.getUser();
                if (currentUser && currentUser.id === preferencesData.user_id) {
                    const updatedUser = { ...currentUser, ...preferencesData };
                    AuthManager.devUserStorage.setUser(updatedUser);
                }
                return true;
            }
            
            // For production, update in Supabase
            const { error } = await supabase
                .from('profiles')
                .update({
                    dark_mode: preferencesData.dark_mode,
                    language: preferencesData.language,
                    updated_at: new Date().toISOString()
                })
                .eq('id', preferencesData.user_id);
            
            if (error) throw error;
            
            // Mark as synced in IndexedDB
            const localPreferences = await getPreferencesFromIndexedDB(preferencesData.user_id);
            if (localPreferences) {
                await savePreferencesToIndexedDB({
                    ...localPreferences,
                    synced: true
                });
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error processing preferences sync item:', error);
        throw error;
    }
}

// Add an operation to the sync queue
async function addToSyncQueue(entityType, action, data) {
    try {
        const { store } = await openTransaction(STORES.SYNC_QUEUE, 'readwrite');
        
        const syncItem = {
            entity_type: entityType,
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(syncItem);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error adding to sync queue:', error);
        return null;
    }
}

// Process the sync queue
async function processSyncQueue() {
    try {
        // Check if online first
        if (!navigator.onLine) {
            console.log('Offline - synchronization deferred');
            return false;
        }
        
        console.log('Processing sync queue...');
        const { store } = await openTransaction(STORES.SYNC_QUEUE, 'readonly');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = async () => {
                const items = request.result;
                console.log(`Found ${items.length} items in sync queue`);
                
                if (items.length === 0) {
                    resolve(true);
                    return;
                }
                
                try {
                    // Process each item
                    for (const item of items) {
                        try {
                            console.log(`Processing sync item: ${item.entity_type}, ${item.action}`);
                            let success = false;
                            
                            // Process based on entity type
                            if (item.entity_type === 'location') {
                                // Process location item
                                // This would connect to your real database in production
                                console.log('Syncing location data');
                                // Just a stub for demonstration
                                success = true;
                            } else if (item.entity_type === 'pickup_request') {
                                // Process pickup request
                                console.log('Syncing pickup request');
                                // Simulate success for demonstration
                                success = true;
                            } else if (item.entity_type === 'bag') {
                                // Process bag scan
                                console.log('Syncing bag scan');
                                // Simulate success for demonstration
                                success = true;
                            } else if (item.entity_type === 'profile') {
                                // Process profile update
                                console.log('Syncing profile data');
                                success = await processSyncProfileItem(item);
                            } else if (item.entity_type === 'preferences') {
                                // Process preferences update
                                console.log('Syncing preferences data');
                                success = await processSyncPreferencesItem(item);
                            }
                            
                            if (success) {
                                // Remove from queue on success
                                await removeFromSyncQueue(item.id);
                                console.log(`Successfully processed item ${item.id}`);
                            } else {
                                console.warn(`Failed to process item ${item.id}`);
                                // Could implement retry logic here
                            }
                        } catch (itemError) {
                            console.error(`Error processing sync item ${item.id}:`, itemError);
                            // Continue to next item on error
                            continue;
                        }
                    }
                    
                    resolve(true);
                } catch (processError) {
                    console.error('Error processing sync queue:', processError);
                    reject(processError);
                }
            };
            
            request.onerror = () => {
                console.error('Error getting items from sync queue:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error in processSyncQueue:', error);
        return false;
    }
}

// Check if online and try to sync
async function trySync() {
    if (navigator.onLine) {
        console.log('Online - attempting to process sync queue');
        try {
            const success = await processSyncQueue();
            if (success) {
                console.log('Sync completed successfully');
                // Dispatch event to notify that sync is complete
                window.dispatchEvent(new CustomEvent('trashdrop-sync-complete'));
            } else {
                console.warn('Sync processing did not complete successfully');
            }
        } catch (error) {
            console.error('Error during sync attempt:', error);
        }
    } else {
        console.log('Offline - sync attempt skipped');
    }
}

// Add location handling for online/offline modes
async function addLocation(locationData, userId) {
    // Generate a temporary ID for new locations
    const tempId = 'temp_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
    
    // Prepare the location data
    const location = {
        id: tempId,
        user_id: userId,
        location_name: locationData.location_name,
        address: locationData.address,
        coordinates: locationData.coordinates,
        location_type: locationData.location_type || 'home',
        is_default: locationData.is_default || false,
        notes: locationData.notes || null,
        pickup_instructions: locationData.pickup_instructions || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: false
    };
    
    // Save to IndexedDB
    await saveLocationsToIndexedDB([location]);
    
    // Add to sync queue
    await addToSyncQueue('location', 'create', location);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
        trySync();
    }
    
    return { success: true, data: location };
}

// Update location handling for online/offline modes
async function updateLocation(locationId, locationData, userId) {
    // Get the existing location from IndexedDB
    const existingLocation = await getLocationFromIndexedDB(locationId);
    
    if (!existingLocation) {
        return { success: false, error: 'Location not found in local database' };
    }
    
    // Prepare the updated location
    const updatedLocation = {
        ...existingLocation,
        ...locationData,
        updated_at: new Date().toISOString(),
        synced: false
    };
    
    // Save to IndexedDB
    await saveLocationsToIndexedDB([updatedLocation]);
    
    // Add to sync queue
    await addToSyncQueue('location', 'update', updatedLocation);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
        trySync();
    }
    
    return { success: true, data: updatedLocation };
}

// Delete location handling for online/offline modes
async function deleteLocation(locationId, userId) {
    // Get the existing location from IndexedDB
    const existingLocation = await getLocationFromIndexedDB(locationId);
    
    if (!existingLocation) {
        return { success: false, error: 'Location not found in local database' };
    }
    
    // Mark the location as deleted in IndexedDB but don't actually delete it yet
    const deletedLocation = {
        ...existingLocation,
        _isDeleted: true,
        updated_at: new Date().toISOString(),
        synced: false
    };
    
    // Save the marked location
    await saveLocationsToIndexedDB([deletedLocation]);
    
    // Add to sync queue
    await addToSyncQueue('location', 'delete', { id: locationId, user_id: userId });
    
    // Try to sync immediately if online
    if (navigator.onLine) {
        trySync();
    }
    
    return { success: true };
}

// Set default location handling for online/offline modes
async function setDefaultLocation(locationId, userId) {
    // Get all locations from IndexedDB
    const allLocations = await getLocationsFromIndexedDB();
    
    if (!allLocations || allLocations.length === 0) {
        return { success: false, error: 'No locations found in local database' };
    }
    
    // Get the location to set as default
    const locationToSetDefault = allLocations.find(loc => loc.id === locationId);
    
    if (!locationToSetDefault) {
        return { success: false, error: 'Location not found in local database' };
    }
    
    // Update all locations to set is_default to false
    const updatedLocations = allLocations.map(loc => ({
        ...loc,
        is_default: loc.id === locationId,
        updated_at: new Date().toISOString(),
        synced: false
    }));
    
    // Save all updated locations to IndexedDB
    await saveLocationsToIndexedDB(updatedLocations);
    
    // Add to sync queue
    await addToSyncQueue('location', 'set_default', { locationId, userId });
    
    // Try to sync immediately if online
    if (navigator.onLine) {
        trySync();
    }
    
    return { success: true };
}

// Load locations from IndexedDB
async function loadLocations(userId) {
    try {
        // Get locations from IndexedDB
        const locations = await getLocationsFromIndexedDB();
        
        // Filter locations by user ID and exclude deleted ones
        const userLocations = locations.filter(loc => 
            loc.user_id === userId && !loc._isDeleted
        );
        
        return { success: true, data: userLocations };
    } catch (error) {
        console.error('Error loading locations:', error);
        return { success: false, error: error.message };
    }
}

// Save profile data to IndexedDB
async function saveProfileToIndexedDB(profileData) {
    try {
        const { store, transaction } = await openTransaction(STORES.PROFILES, 'readwrite');
        
        // Create a promise that resolves when the transaction completes
        const complete = new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        
        // Add or update profile
        store.put(profileData);
        
        // Wait for the transaction to complete
        await complete;
        return true;
    } catch (error) {
        console.error('Error saving profile to IndexedDB:', error);
        return false;
    }
}

// Get profile data from IndexedDB
async function getProfileFromIndexedDB(userId) {
    try {
        const { store } = await openTransaction(STORES.PROFILES, 'readonly');
        
        return new Promise((resolve, reject) => {
            const request = store.get(userId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error getting profile from IndexedDB:', error);
        return null;
    }
}

// Save preferences to IndexedDB
async function savePreferencesToIndexedDB(preferencesData) {
    try {
        const { store, transaction } = await openTransaction(STORES.PREFERENCES, 'readwrite');
        
        // Create a promise that resolves when the transaction completes
        const complete = new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        
        // Add or update preferences
        store.put(preferencesData);
        
        // Wait for the transaction to complete
        await complete;
        return true;
    } catch (error) {
        console.error('Error saving preferences to IndexedDB:', error);
        return false;
    }
}

// Get preferences from IndexedDB
async function getPreferencesFromIndexedDB(userId) {
    try {
        const { store } = await openTransaction(STORES.PREFERENCES, 'readonly');
        
        return new Promise((resolve, reject) => {
            const request = store.get(userId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error getting preferences from IndexedDB:', error);
        return null;
    }
}

// Update profile with offline support
async function updateProfile(profileData, userId) {
    try {
        // Add user ID to the data
        profileData.id = userId;
        profileData.synced = false;
        profileData.updated_at = new Date().toISOString();
        
        // Save locally first
        await saveProfileToIndexedDB(profileData);
        
        // Add to sync queue for online synchronization
        await addToSyncQueue('profile', 'update', profileData);
        
        // Try to sync immediately if online
        if (navigator.onLine) {
            trySync();
        }
        
        return { success: true, data: profileData };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
    }
}

// Update preferences with offline support
async function updatePreferences(preferencesData, userId) {
    try {
        // Add user ID to the data
        preferencesData.id = userId;
        preferencesData.synced = false;
        preferencesData.updated_at = new Date().toISOString();
        
        // Save locally first
        await savePreferencesToIndexedDB(preferencesData);
        
        // Add to sync queue for online synchronization
        await addToSyncQueue('preferences', 'update', preferencesData);
        
        // Try to sync immediately if online
        if (navigator.onLine) {
            trySync();
        }
        
        return { success: true, data: preferencesData };
    } catch (error) {
        console.error('Error updating preferences:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add a pickup request to IndexedDB for offline storage
 * @param {Object} requestData - The pickup request data
 * @returns {Promise<boolean>} - Success status
 */
async function savePickupRequestToIndexedDB(requestData) {
    try {
        const { store, transaction } = await openTransaction(STORES.PICKUP_REQUESTS, 'readwrite');
        
        // Create a promise that resolves when the transaction completes
        const complete = new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
        
        // Make sure the request has a synced flag
        if (requestData.synced === undefined) {
            requestData.synced = false;
        }
        
        // Add or update the request
        store.put(requestData);
        
        // Wait for the transaction to complete
        await complete;
        return true;
    } catch (error) {
        console.error('Error saving pickup request to IndexedDB:', error);
        return false;
    }
}

/**
 * Get all pickup requests from IndexedDB
 * @returns {Promise<Array>} - Array of pickup requests
 */
async function getPickupRequestsFromIndexedDB() {
    try {
        const { store } = await openTransaction(STORES.PICKUP_REQUESTS, 'readonly');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error getting pickup requests from IndexedDB:', error);
        return [];
    }
}

/**
 * Create a new pickup request with offline support
 * @param {Object} requestData - The pickup request data
 * @returns {Promise<Object>} - The created request or error
 */
async function createPickupRequest(requestData) {
    try {
        // Generate a temporary ID for offline mode
        if (!requestData.id) {
            requestData.id = 'pickup_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
        }
        
        // Add timestamp if not present
        if (!requestData.created_at) {
            requestData.created_at = new Date().toISOString();
        }
        
        // Mark as not synced yet
        requestData.synced = false;
        
        // Save locally first
        await savePickupRequestToIndexedDB(requestData);
        
        // Add to sync queue
        await addToSyncQueue('pickup_request', 'create', requestData);
        
        // Try to sync immediately if online
        if (navigator.onLine) {
            trySync();
        }
        
        return { success: true, data: requestData };
    } catch (error) {
        console.error('Error creating pickup request:', error);
        return { success: false, error: error.message };
    }
}

// Export the functions
window.TrashDropOfflineSync = {
    initDatabase,
    saveLocationsToIndexedDB,
    getLocationsFromIndexedDB,
    getLocationFromIndexedDB,
    deleteLocationFromIndexedDB,
    addToSyncQueue,
    processSyncQueue,
    addLocation,
    updateLocation,
    deleteLocation,
    setDefaultLocation,
    loadLocations,
    savePickupRequestToIndexedDB,
    getPickupRequestsFromIndexedDB,
    createPickupRequest,
    saveProfileToIndexedDB,
    getProfileFromIndexedDB,
    savePreferencesToIndexedDB,
    getPreferencesFromIndexedDB,
    updateProfile,
    updatePreferences,
    addRequest: addToSyncQueue,
    processQueue: processSyncQueue,
    trySync: trySync
};

// Create a more convenient global sync queue object
window.OfflineSync = {
    addRequest: addToSyncQueue,
    processQueue: processSyncQueue,
    trySync: trySync,
    storeProfileUpdate: function(profileData) {
        const user = AuthManager.devUserStorage.getUser();
        if (user) {
            updateProfile(profileData, user.id);
        }
    },
    storePreferencesUpdate: function(preferencesData) {
        const user = AuthManager.devUserStorage.getUser();
        if (user) {
            updatePreferences(preferencesData, user.id);
        }
    }
};
