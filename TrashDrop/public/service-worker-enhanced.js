/**
 * TrashDrop Enhanced Service Worker
 * Provides comprehensive offline functionality for the TrashDrop PWA
 */

const CACHE_NAME = 'trashdrop-v2';
const DYNAMIC_CACHE = 'trashdrop-dynamic-v1';
const API_CACHE = 'trashdrop-api-v1';

// Static assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard',
  '/scan',
  '/request-pickup',
  '/report-dumping',
  '/profile',
  '/css/styles.css',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/scanner-updated.js',
  '/js/pickup-request.js',
  '/js/report-dumping.js',
  '/js/profile.js',
  '/js/offline-sync.js',
  '/js/offline-bag-sync.js',
  '/js/offline-points-sync.js',
  '/js/offline-sync-enhanced.js',
  '/js/pickup-sync.js',
  '/js/map-offline.js',
  '/js/emergency-logout.js',
  '/js/register-sw.js',
  '/images/logo.svg',
  '/images/default-avatar.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(ASSETS_TO_CACHE);
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
      return cache.match('/offline.html') || new Response('You are offline');
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
  if (event.tag === 'sync-pickups') {
    event.waitUntil(syncPickupRequests());
  } else if (event.tag === 'sync-bags') {
    event.waitUntil(syncBags());
  }
});

// Placeholder function for syncing pickup requests
// The actual implementation will use IndexedDB data
async function syncPickupRequests() {
  console.log('Background syncing pickup requests...');
  
  // This will be implemented by the client-side code
  // using the indexed DB data
  
  // We'll notify all clients that sync has been attempted
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_ATTEMPTED',
      tag: 'sync-pickups',
      timestamp: Date.now()
    });
  });
}

// Placeholder function for syncing bags
async function syncBags() {
  console.log('Background syncing bags...');
  
  // This will be implemented by the client-side code
  // using the indexed DB data
  
  // We'll notify all clients that sync has been attempted
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_ATTEMPTED',
      tag: 'sync-bags',
      timestamp: Date.now()
    });
  });
}
