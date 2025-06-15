/**
 * TrashDrop Enhanced Service Worker
 * Provides comprehensive offline functionality for the TrashDrop PWA
 */

const CACHE_NAME = 'trashdrop-v3';
const DYNAMIC_CACHE = 'trashdrop-dynamic-v2';
const API_CACHE = 'trashdrop-api-v2';
const OFFLINE_PAGE = '/offline.html';
const SPLASH_PAGE = '/splash.html';

// Version tracking for cache updates
const SW_VERSION = '1.0.1';

// Configurable external resources - will be populated via messaging
let externalResources = [];

// Base assets to cache on install - static app files
const BASE_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard',
  '/scan',
  '/request-pickup',
  '/report-dumping',
  '/profile',
  '/activity',
  '/reports',
  '/offline.html',
  '/splash.html',
  '/css/styles.css',
  '/css/accessibility.css',
  '/css/navbar-fix.css',
  '/css/offline-map.css',
  '/css/pwa-install-prompt.css',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/scanner-updated.js',
  '/js/pickup-request.js',
  '/js/report-dumping.js',
  '/js/profile.js',
  '/js/navbar.js',
  '/js/mobile-nav.js',
  '/js/protocol-interceptor.js',
  '/js/base-url.js',
  '/js/offline-sync.js',
  '/js/offline-bag-sync.js',
  '/js/offline-points-sync.js',
  '/js/offline-sync-enhanced.js',
  '/js/pickup-sync.js',
  '/js/map-offline.js',
  '/js/emergency-logout.js',
  '/js/register-sw.js',
  '/js/sw-config.js',
  '/js/pwa-install-prompt.js',
  '/js/active-pickup-persistence.js',
  '/js/distanceCalculator.js',
  '/js/active-pickup.js',
  '/images/logo.svg',
  '/images/default-avatar.png',
  '/images/icon-152.png',
  '/images/icon-167.png',
  '/images/icon-180.png',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

// Default external resources (CDN URLs) to use if configuration is not received
const DEFAULT_EXTERNAL_RESOURCES = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.2.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js'
];

// Message handling for control and lifecycle management
self.addEventListener('message', (event) => {
  // Handle skip waiting message to activate immediately
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting and activate immediately');
    self.skipWaiting();
  }
  
  // Handle configuration message from the client
  if (event.data && event.data.type === 'CONFIG') {
    console.log('[Service Worker] Received configuration from client');
    
    // Update external resources with values from client config
    if (event.data.data && Array.isArray(event.data.data.cdnResources) && event.data.data.cdnResources.length > 0) {
      externalResources = event.data.data.cdnResources;
      console.log('[Service Worker] Updated external resources:', externalResources);
      
      // If already installed and activated, update the cache with the new resources
      if (self.registration && self.registration.active) {
        cacheExternalResources();
      }
    } else {
      console.log('[Service Worker] No valid CDN resources in config, using defaults');
      externalResources = DEFAULT_EXTERNAL_RESOURCES;
    }
  }
});

// Function to cache external resources
async function cacheExternalResources() {
  try {
    const cache = await caches.open(CACHE_NAME);
    console.log('[Service Worker] Caching external resources');
    return cache.addAll(externalResources);
  } catch (error) {
    console.error('[Service Worker] Failed to cache external resources:', error);
  }
}

// Function to get complete list of assets to cache
function getAssetsToCache() {
  // If we have configured external resources, use those
  if (externalResources && externalResources.length > 0) {
    return [...BASE_ASSETS_TO_CACHE, ...externalResources];
  }
  
  // Otherwise fall back to default external resources
  return [...BASE_ASSETS_TO_CACHE, ...DEFAULT_EXTERNAL_RESOURCES];
}

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell assets');
        return cache.addAll(getAssetsToCache());
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE, API_CACHE];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper function to determine if request is an API request
function isApiRequest(url) {
  return url.includes('/api/');
}

// Helper function to determine if request is a bags or pickup_requests API
function isTrackableApiRequest(url) {
  return url.includes('/api/bags') || 
         url.includes('/api/pickup-requests') || 
         url.includes('/api/pickup_requests');
}

// Cache API responses for offline use
async function cacheApiResponse(request, response) {
  const cache = await caches.open(API_CACHE);
  const clonedResponse = response.clone();
  
  // Only cache successful responses
  if (response.status === 200) {
    // Get the response data
    const data = await clonedResponse.json();
    
    // Store response with timestamp
    const cachedResponse = new Response(JSON.stringify({
      data: data,
      timestamp: Date.now()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=86400' // 24 hours
      }
    });
    
    await cache.put(request, cachedResponse);
    console.log('Cached API response:', request.url);
  }
  
  return response;
}

// Network first strategy for API requests
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache the response if it's a trackable API
    if (isTrackableApiRequest(request.url)) {
      await cacheApiResponse(request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Fetching from network failed, falling back to cache', error);
    
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache either, return a custom offline response
    return new Response(JSON.stringify({
      error: 'You are offline and this data is not cached',
      offline: true,
      timestamp: Date.now()
    }), {
      headers: {'Content-Type': 'application/json'}
    });
  }
}

// Cache first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache dynamic resources
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // For navigation requests, return the offline page
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_PAGE) || new Response('You are offline');
    }
    
    return new Response('Resource not available offline');
  }
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin && !event.request.url.includes('unpkg.com') && !event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  // Apply different strategies based on request type
  if (isApiRequest(event.request.url)) {
    event.respondWith(networkFirstStrategy(event.request));
  } else {
    event.respondWith(cacheFirstStrategy(event.request));
  }
});

// Listen for messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_API_DATA') {
    const { url, data } = event.data;
    if (url && data) {
      caches.open(API_CACHE).then(cache => {
        const response = new Response(JSON.stringify({
          data: data,
          timestamp: Date.now()
        }), {
          headers: {'Content-Type': 'application/json'}
        });
        cache.put(new Request(url), response);
        console.log('Explicitly cached data for URL:', url);
      });
    }
  }
  
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    caches.open(API_CACHE).then(cache => {
      cache.keys().then(keys => {
        keys.forEach(request => {
          if (isTrackableApiRequest(request.url)) {
            cache.delete(request);
          }
        });
      });
    });
    console.log('Cleared API cache for trackable endpoints');
  }
});

// Background sync for offline operations
self.addEventListener('sync', event => {
  console.log(`[Service Worker] Background sync triggered for: ${event.tag}`);
  
  if (event.tag === 'sync-pickups') {
    event.waitUntil(
      syncPickupRequests()
        .then(() => notifyClients('SYNC_COMPLETE', event.tag))
        .catch(error => {
          console.error(`[Service Worker] Sync failed for ${event.tag}:`, error);
          notifyClients('SYNC_FAILED', event.tag, { error: error.message });
          // Re-throw to indicate sync failed and should be retried
          throw error;
        })
    );
  } else if (event.tag === 'sync-bags') {
    event.waitUntil(
      syncBags()
        .then(() => notifyClients('SYNC_COMPLETE', event.tag))
        .catch(error => {
          console.error(`[Service Worker] Sync failed for ${event.tag}:`, error);
          notifyClients('SYNC_FAILED', event.tag, { error: error.message });
          // Re-throw to indicate sync failed and should be retried
          throw error;
        })
    );
  }
});

// Helper function to notify all clients
async function notifyClients(type, tag, data = {}) {
  const clients = await self.clients.matchAll();
  const message = {
    type: type,
    tag: tag,
    timestamp: Date.now(),
    ...data
  };
  
  console.log(`[Service Worker] Notifying clients: ${type} for ${tag}`);
  clients.forEach(client => client.postMessage(message));
}

// Function for syncing pickup requests using IndexedDB
async function syncPickupRequests() {
  console.log('[Service Worker] Background syncing pickup requests...');
  
  try {
    // Open the IndexedDB database
    const db = await openDatabase('trashdrop-offline', 1);
    
    // Get unsynchronized pickup requests
    const unsyncedPickups = await getUnsyncedItems(db, 'pickupRequests');
    
    if (unsyncedPickups.length === 0) {
      console.log('[Service Worker] No unsynced pickup requests found');
      return;
    }
    
    console.log(`[Service Worker] Found ${unsyncedPickups.length} unsynced pickup requests`);
    
    // Process each unsynced pickup request
    for (const pickup of unsyncedPickups) {
      try {
        // Attempt to sync with the server
        const response = await fetch('/api/pickup_requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Get token from IndexedDB auth store if available
            ...(pickup.token ? { 'Authorization': `Bearer ${pickup.token}` } : {})
          },
          body: JSON.stringify(pickup.data)
        });
        
        if (response.ok) {
          // Mark as synced in IndexedDB
          await markAsSynced(db, 'pickupRequests', pickup.id);
          console.log(`[Service Worker] Successfully synced pickup request ID: ${pickup.id}`);
        } else {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
      } catch (itemError) {
        console.error(`[Service Worker] Failed to sync pickup request ID: ${pickup.id}`, itemError);
        // We'll continue with other items even if one fails
      }
    }
    
    // Close the database connection
    db.close();
    return true;
  } catch (error) {
    console.error('[Service Worker] Error syncing pickup requests:', error);
    throw error; // Rethrow for sync event handler
  }
}

// Function for syncing bags using IndexedDB
async function syncBags() {
  console.log('[Service Worker] Background syncing bags...');
  
  try {
    // Open the IndexedDB database
    const db = await openDatabase('trashdrop-offline', 1);
    
    // Get unsynchronized bags
    const unsyncedBags = await getUnsyncedItems(db, 'bags');
    
    if (unsyncedBags.length === 0) {
      console.log('[Service Worker] No unsynced bags found');
      return;
    }
    
    console.log(`[Service Worker] Found ${unsyncedBags.length} unsynced bags`);
    
    // Process each unsynced bag
    for (const bag of unsyncedBags) {
      try {
        // Attempt to sync with the server
        const response = await fetch('/api/bags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(bag.token ? { 'Authorization': `Bearer ${bag.token}` } : {})
          },
          body: JSON.stringify(bag.data)
        });
        
        if (response.ok) {
          // Mark as synced in IndexedDB
          await markAsSynced(db, 'bags', bag.id);
          console.log(`[Service Worker] Successfully synced bag ID: ${bag.id}`);
        } else {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
      } catch (itemError) {
        console.error(`[Service Worker] Failed to sync bag ID: ${bag.id}`, itemError);
        // We'll continue with other items even if one fails
      }
    }
    
    // Close the database connection
    db.close();
    return true;
  } catch (error) {
    console.error('[Service Worker] Error syncing bags:', error);
    throw error; // Rethrow for sync event handler
  }
}

// Helper function to open IndexedDB
function openDatabase(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onerror = event => reject(new Error('Failed to open database'));
    request.onsuccess = event => resolve(event.target.result);
    
    // If this is the first time, create object stores
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('pickupRequests')) {
        db.createObjectStore('pickupRequests', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('bags')) {
        db.createObjectStore('bags', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth', { keyPath: 'id' });
      }
    };
  });
}

// Helper function to get unsynced items from IndexedDB
function getUnsyncedItems(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = event => reject(new Error(`Failed to get items from ${storeName}`));
    request.onsuccess = event => {
      // Filter to only get unsynced items
      const items = event.target.result.filter(item => !item.synced);
      resolve(items);
    };
  });
}

// Helper function to mark an item as synced
function markAsSynced(db, storeName, itemId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.get(itemId);
    
    request.onerror = event => reject(new Error(`Failed to get item ${itemId} from ${storeName}`));
    request.onsuccess = event => {
      const item = event.target.result;
      if (item) {
        item.synced = true;
        item.syncedAt = Date.now();
        
        const updateRequest = store.put(item);
        updateRequest.onerror = event => reject(new Error(`Failed to update item ${itemId}`));
        updateRequest.onsuccess = event => resolve(true);
      } else {
        reject(new Error(`Item ${itemId} not found in ${storeName}`));
      }
    };
  });
}
