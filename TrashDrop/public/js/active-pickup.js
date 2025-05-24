/**
 * TrashDrop Active Pickup Request Manager
 * Handles tracking, displaying, and managing active pickup requests
 */

// Global debug flag for the active pickup feature
window.debugActivePickup = true;

const ActivePickupManager = (() => {
    // Private variables
    let activePickupRequests = [];
    let activePickupMap = null;
    let userMarker = null;
    let collectorMarker = null;
    let updateInterval = null;
    let supabaseSubscription = null;
    
    // DOM element selectors
    const domSelectors = {
        activePickupContainer: '#active-pickup-container',
        collectorName: '#collector-name',
        collectorDistance: '#collector-distance',
        estimatedArrival: '#estimated-arrival',
        wasteTypeQuantity: '#waste-type-quantity',
        pickupLocation: '#pickup-location',
        earnedPoints: '#earned-points',
        cancelButton: '#cancel-pickup-btn',
        activePickupMap: '#active-pickup-map',
        trackingStatus: '#tracking-status'
    };
    
    /**
     * Initialize the Active Pickup Manager
     */
    function init() {
        // Add initialization debug info
        console.log('ActivePickupManager: Initializing...');
        localStorage.setItem('active_pickup_init', new Date().toISOString());
        
        // Check if we have a newRequest parameter in the URL (came from request form)
        const urlParams = new URLSearchParams(window.location.search);
        const hasNewRequest = urlParams.has('newRequest');
        
        // Check if we have an active pickup in localStorage (for refresh persistence)
        const storedActivePickup = localStorage.getItem('active_pickup_data');
        const hasStoredPickup = !!storedActivePickup;
        
        console.log('ActivePickupManager: Initialization check', { 
            hasNewRequest, 
            hasStoredPickup,
            fullUrl: window.location.href,
            lastRequestTime: localStorage.getItem('pickup_requested_at')
        });
        
        // Immediately check if we should show the container based on localStorage
        // This prevents the flash of content during page refresh
        if (hasStoredPickup) {
            try {
                // Parse the stored pickup data
                const pickupData = JSON.parse(storedActivePickup);
                
                // Only show if we have valid data and it's not cancelled
                if (pickupData && pickupData.status !== 'cancelled') {
                    console.log('ActivePickupManager: Found valid stored pickup, showing container');
                    const container = document.querySelector(domSelectors.activePickupContainer);
                    if (container) {
                        container.style.display = 'block';
                        container.setAttribute('aria-hidden', 'false');
                    }
                }
            } catch (e) {
                console.error('Error parsing stored pickup data:', e);
            }
        }
        
        // Set up event listeners
        document.addEventListener('DOMContentLoaded', () => {
            console.log('ActivePickupManager: DOM loaded, setting up...');
            setupEventListeners();
            
            // If we have a new request, prioritize loading it with a slight delay
            // to ensure backend has processed it
            if (hasNewRequest) {
                console.log('ActivePickupManager: New request detected, preparing UI');
                // Clear the URL parameter without refreshing the page
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
                
                // Show loading indicator in the pickup container
                console.log('ActivePickupManager: Showing loading indicator');
                showLoadingIndicator();
                
                // Force the container to be visible for debugging
                const container = document.querySelector(domSelectors.activePickupContainer);
                if (container) {
                    console.log('ActivePickupManager: Container found, setting display style');
                    // Force the element to display by setting inline style with !important
                    container.setAttribute('style', 'display: block !important');
                    container.setAttribute('aria-hidden', 'false');
                    
                    // Ensure the HTML matches what we expect
                    container.innerHTML = `
                        <div class="card border-0 shadow-sm rounded-3">
                            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
                                <h5 class="mb-0 fs-6 fw-bold">Active Pickup Request</h5>
                                <span id="tracking-status" class="badge bg-warning text-dark">Loading Request...</span>
                            </div>
                            <div class="card-body p-3">
                                <div class="text-center mb-4">
                                    <div class="spinner-border text-primary my-3" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p>Preparing your pickup request information...</p>
                                </div>
                                
                                <!-- Empty map container with fixed height -->
                                <div id="active-pickup-map" style="height: 200px; width: 100%; margin-top: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;"></div>
                                
                                <!-- Cancel button -->
                                <div class="d-grid gap-2 mt-3">
                                    <button type="button" class="btn btn-outline-danger" id="cancel-pickup-btn" onclick="ActivePickupManager.cancelActivePickup()">
                                        <i class="bi bi-x-circle me-1"></i> Cancel Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    console.error('ActivePickupManager: Container NOT FOUND! Selector:', domSelectors.activePickupContainer);
                    // Try creating the element if it doesn't exist
                    createActivePickupContainer();
                }
                
                // Load with a slight delay to ensure backend processing is complete
                setTimeout(() => {
                    loadActivePickupRequests(true); // true = force refresh
                }, 1000);
            } else {
                // Regular load
                loadActivePickupRequests();
            }
        });
        
        // Update active pickup status every minute
        updateInterval = setInterval(updateActivePickupStatus, 60000);
    }
    
    /**
     * Show loading indicator in the active pickup container
     */
    function showLoadingIndicator() {
        console.log('ActivePickupManager: showLoadingIndicator called');
        
        const container = document.querySelector(domSelectors.activePickupContainer);
        if (!container) {
            console.error('ActivePickupManager: Container element not found for loading indicator');
            // Create a debug dump of all IDs in the document
            const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
            console.log('ActivePickupManager: All IDs in document:', allIds);
            return;
        }
        
        console.log('ActivePickupManager: Container found, showing loading indicator');
        
        // Display the container with loading state
        container.style.display = 'block';
        container.setAttribute('aria-hidden', 'false');
        
        // Create loading content
        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
                    <h5 class="mb-0 fs-6 fw-bold">Active Pickup Request</h5>
                    <span class="badge bg-warning text-dark">Loading</span>
                </div>
                <div class="card-body p-3 text-center">
                    <div class="my-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Loading your pickup request...</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        const cancelButton = document.querySelector(domSelectors.cancelButton);
        if (cancelButton) {
            cancelButton.addEventListener('click', cancelActivePickup);
        }
    }
    
    /**
     * Load active pickup requests for the current user
     * @param {boolean} forceRefresh - If true, bypass cache and force a fresh load
     */
    async function loadActivePickupRequests(forceRefresh = false) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }
            
            // Check first for localStorage persistence (fastest method for page refreshes)
            if (!forceRefresh && window.ActivePickupPersistence && ActivePickupPersistence.hasActivePickup()) {
                try {
                    const persistedPickup = ActivePickupPersistence.getActivePickup();
                    console.log('ActivePickupManager: Using persisted pickup data from localStorage');
                    
                    if (persistedPickup && persistedPickup.status !== 'cancelled') {
                        activePickupRequests = [persistedPickup];
                        updateActivePickupUI();
                        return;
                    }
                } catch (error) {
                    console.error('Error retrieving persisted pickup data:', error);
                }
            }
            
            // Fall back to IndexedDB for offline mode if localStorage didn't have data
            if (!forceRefresh && !navigator.onLine && typeof window.indexedDB !== 'undefined') {
                try {
                    const offlineRequests = await getActivePickupsFromIndexedDB();
                    if (offlineRequests && offlineRequests.length > 0) {
                        activePickupRequests = offlineRequests;
                        updateActivePickupUI();
                        
                        // Also save to localStorage for quicker access on refresh
                        if (window.ActivePickupPersistence && activePickupRequests[0]) {
                            ActivePickupPersistence.saveActivePickup(activePickupRequests[0]);
                        }
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching offline active pickups:', error);
                }
            }
            
            // Check if we're in development mode and have a new request
            if (forceRefresh && window.isDev && window.isDev()) {
                console.log('Development mode: Creating mock active pickup request');
                
                // Create a mock pickup request for development testing
                activePickupRequests = [{
                    id: 'dev-pickup-' + Date.now(),
                    status: 'pending',
                    location: '123 Main Street, New York, NY',
                    coordinates: 'POINT(-74.0060 40.7128)',
                    waste_type: 'recycling',
                    bags_count: 2,
                    points: 5,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }];
                
                // Store mock request in IndexedDB for persistence
                if (typeof window.indexedDB !== 'undefined') {
                    await storeActivePickupsInIndexedDB(activePickupRequests);
                }
                
                // Skip server request
                console.log('Mock active pickup created:', activePickupRequests[0]);
            } else {
                // Regular server request
                try {
                    const response = await fetch('/api/pickups/active', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch active pickup requests');
                    }
                    
                    const data = await response.json();
                    activePickupRequests = data.pickups || [];
                } catch (fetchError) {
                    console.error('Error fetching active pickups, trying fallback:', fetchError);
                    
                    // Fallback for development mode
                    if (window.isDev && window.isDev()) {
                        console.log('Development mode: Using fallback mock active pickup');
                        activePickupRequests = [{
                            id: 'dev-pickup-fallback',
                            status: 'pending',
                            location: '123 Main Street, New York, NY',
                            coordinates: 'POINT(-74.0060 40.7128)',
                            waste_type: 'recycling',
                            bags_count: 2,
                            points: 5,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }];
                    }
                }
            }
            
            // Store in IndexedDB for offline access
            if (activePickupRequests.length > 0 && typeof window.indexedDB !== 'undefined') {
                await storeActivePickupsInIndexedDB(activePickupRequests);
            }
            
            // Update the UI with active pickup requests
            updateActivePickupUI();
            
            // Set up real-time updates for active pickups
            setupRealtimeUpdates();
            
            // Ensure map and buttons are initialized correctly
            setTimeout(() => {
                fixMapAndButtons();
            }, 500); // Slight delay to ensure DOM is ready
            
        } catch (error) {
            console.error('Error loading active pickup requests:', error);
        }
    }
    
    /**
     * Update the UI with active pickup request information
     */
    function updateActivePickupUI() {
        console.log('ActivePickupManager: updateActivePickupUI called', { 
            numRequests: activePickupRequests.length,
            requests: activePickupRequests
        });
        
        const container = document.querySelector(domSelectors.activePickupContainer);
        
        if (!container) {
        
// Check if we're in development mode and have a new request
if (forceRefresh && window.isDev && window.isDev()) {
console.log('Development mode: Creating mock active pickup request');
        
// Create a mock pickup request for development testing
activePickupRequests = [{
id: 'dev-pickup-' + Date.now(),
status: 'pending',
location: '123 Main Street, New York, NY',
coordinates: 'POINT(-74.0060 40.7128)',
waste_type: 'recycling',
bags_count: 2,
points: 5,
created_at: new Date().toISOString(),
updated_at: new Date().toISOString()
}];
        
// Store mock request in IndexedDB for persistence
if (typeof window.indexedDB !== 'undefined') {
    // Call the function directly
    storeActivePickupsInIndexedDB(activePickupRequests);
}

/**
 * Store active pickups in IndexedDB for offline persistence
 * @param {Array} pickups - Array of pickup requests to store
 */
function storeActivePickupsInIndexedDB(pickups) {
    if (!pickups || !pickups.length) return;
    
    const DB_NAME = 'trashdropDB';
    const STORE_NAME = 'activePickups';
    const DB_VERSION = 1;
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = function(event) {
        console.error('IndexedDB error:', event.target.error);
    };
    
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            console.log('Created activePickups object store');
        }
    };
    
    request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Clear existing records first
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = function() {
            // Add all pickups
            pickups.forEach(pickup => {
                try {
                    store.add(pickup);
                } catch (e) {
                    console.error('Error adding pickup to IndexedDB:', e);
                }
            });
        };
        
        transaction.oncomplete = function() {
            console.log('Successfully stored active pickups in IndexedDB');
            db.close();
        };
        
        transaction.onerror = function(event) {
            console.error('Transaction error:', event.target.error);
        };
    };
}
        
// Skip server request
console.log('Mock active pickup created:', activePickupRequests[0]);
} else {
// Regular server request
try {
const response = await fetch('/api/pickups/active', {
headers: {
'Authorization': `Bearer ${token}`
}
});
        container.style.display = 'block';
        container.setAttribute('aria-hidden', 'false');
        
        // Get the most recent active pickup request
        const activePickup = activePickupRequests[0];
        
        // Update collector information
        const collectorNameEl = document.querySelector(domSelectors.collectorName);
        if (collectorNameEl) {
            collectorNameEl.textContent = activePickup.collector_name || 'Pending Assignment';
        }
        
        // Update waste type and quantity
        const wasteTypeQuantityEl = document.querySelector(domSelectors.wasteTypeQuantity);
        if (wasteTypeQuantityEl) {
            const wasteType = activePickup.waste_type.charAt(0).toUpperCase() + activePickup.waste_type.slice(1);
            wasteTypeQuantityEl.textContent = `${wasteType} (${activePickup.bags_count} bag${activePickup.bags_count !== 1 ? 's' : ''})`;
        }
        
        // Update pickup location
        const pickupLocationEl = document.querySelector(domSelectors.pickupLocation);
        if (pickupLocationEl) {
            pickupLocationEl.textContent = activePickup.location || 'Unknown Location';
        }
        
        // Update earned points
        const earnedPointsEl = document.querySelector(domSelectors.earnedPoints);
        if (earnedPointsEl) {
            earnedPointsEl.textContent = activePickup.points || '0';
        }
        
        // Update collector distance and ETA if collector coordinates are available
        updateLocationAndDistanceInfo(activePickup);
        
        // Initialize or update the map
        initializeActivePickupMap(activePickup);
    }
    
    /**
     * Update location, distance, and ETA information
     */
    function updateLocationAndDistanceInfo(activePickup) {
        // Set default values
        let distanceText = 'Distance unavailable';
        let etaText = 'ETA unavailable';
        
        // Update tracking status
        const trackingStatusEl = document.querySelector(domSelectors.trackingStatus);
        if (trackingStatusEl) {
            if (activePickup.status === 'pending') {
                trackingStatusEl.textContent = 'Waiting for collector assignment';
                trackingStatusEl.className = 'badge bg-warning text-dark';
            } else if (activePickup.status === 'accepted') {
                trackingStatusEl.textContent = 'Collector on the way';
                trackingStatusEl.className = 'badge bg-primary';
            } else if (activePickup.status === 'arrived') {
                trackingStatusEl.textContent = 'Collector has arrived';
                trackingStatusEl.className = 'badge bg-success';
            }
        }
        
        // Only calculate distance if collector coordinates and user coordinates are available
        if (activePickup.collector_coordinates && activePickup.coordinates) {
            try {
                // Parse coordinates
                const userCoords = window.DistanceCalculator.parseCoordinates(activePickup.coordinates);
                const collectorCoords = window.DistanceCalculator.parseCoordinates(activePickup.collector_coordinates);
                
                if (userCoords && collectorCoords) {
                    // Calculate distance in miles
                    const distance = window.DistanceCalculator.calculateDistance(
                        userCoords.latitude, userCoords.longitude,
                        collectorCoords.latitude, collectorCoords.longitude
                    );
                    
                    // Format distance text
                    distanceText = window.DistanceCalculator.formatDistance(distance);
                    
                    // Estimate arrival time
                    const etaMinutes = window.DistanceCalculator.estimateArrivalTime(distance);
                    etaText = window.DistanceCalculator.formatTime(etaMinutes);
                    
                    // Check if collector has arrived
                    if (window.DistanceCalculator.hasCollectorArrived(distance) && activePickup.status !== 'arrived') {
                        updatePickupStatus(activePickup.id, 'arrived');
                    }
                }
            } catch (error) {
                console.error('Error calculating distance:', error);
            }
        }
        
        // Update UI elements
        const distanceEl = document.querySelector(domSelectors.collectorDistance);
        if (distanceEl) {
            distanceEl.textContent = distanceText;
        }
        
        const estimatedArrivalEl = document.querySelector(domSelectors.estimatedArrival);
        if (estimatedArrivalEl) {
            estimatedArrivalEl.textContent = etaText;
        }
    }
    
    /**
     * Initialize or update the active pickup map
     */
    function initializeActivePickupMap(activePickup) {
        console.log('ActivePickupManager: Initializing map');
        const mapContainer = document.querySelector(domSelectors.activePickupMap);
        
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        // Make sure the map container has proper dimensions and is visible
        mapContainer.style.height = '200px';
        mapContainer.style.width = '100%';
        mapContainer.style.display = 'block';
        
        // Force layout recalculation
        setTimeout(() => {
            // Force a DOM reflow to ensure container is rendered properly
            void mapContainer.offsetHeight;
            
            // Continue with map initialization after the container is properly rendered
            initMapAfterRender(activePickup, mapContainer);
        }, 100); // Short delay to ensure the DOM has updated
    }
    
    /**
     * Continue map initialization after container rendering
     */
    function initMapAfterRender(activePickup, mapContainer) {
        // Parse user coordinates
        let userCoords;
        try {
            // Use the DistanceCalculator if available, otherwise use local function
            if (window.DistanceCalculator && window.DistanceCalculator.parseCoordinates) {
                userCoords = window.DistanceCalculator.parseCoordinates(activePickup.coordinates);
            } else {
                userCoords = parseCoordinatesLocal(activePickup.coordinates);
            }
            
            if (!userCoords) {
                throw new Error('Invalid coordinates format');
            }
        } catch (error) {
            console.warn('Unable to parse user coordinates, using default location:', error);
            // Default to New York if coordinates are invalid
            userCoords = { latitude: 40.7128, longitude: -74.0060 };
        }
        
        // Local function to parse coordinates when DistanceCalculator is not available
        function parseCoordinatesLocal(coordString) {
            if (!coordString) return null;
            
            try {
                // Handle POINT format: 'POINT(longitude latitude)'
                if (coordString.startsWith('POINT')) {
                    const match = coordString.match(/POINT\(([\-0-9.]+)\s+([\-0-9.]+)\)/);
                    if (match && match.length === 3) {
                        return {
                            longitude: parseFloat(match[1]),
                            latitude: parseFloat(match[2])
                        };
                    }
                }
                
                // Handle array format: '[latitude, longitude]'
                if (coordString.startsWith('[')) {
                    const coords = JSON.parse(coordString);
                    if (Array.isArray(coords) && coords.length === 2) {
                        return {
                            latitude: parseFloat(coords[0]),
                            longitude: parseFloat(coords[1])
                        };
                    }
                }
                
                // Handle object format: '{"latitude": x, "longitude": y}'
                if (coordString.startsWith('{')) {
                    const coords = JSON.parse(coordString);
                    if (coords.latitude !== undefined && coords.longitude !== undefined) {
                        return {
                            latitude: parseFloat(coords.latitude),
                            longitude: parseFloat(coords.longitude)
                        };
                    }
                }
                
                // Handle comma-separated format: 'latitude,longitude'
                const parts = coordString.split(',');
                if (parts.length === 2) {
                    return {
                        latitude: parseFloat(parts[0]),
                        longitude: parseFloat(parts[1])
                    };
                }
                
                return null;
            } catch (e) {
                console.error('Error parsing coordinates:', e);
                return null;
            }
        }
        
        // Initialize map if it doesn't exist
        try {
            if (!activePickupMap) {
                console.log('Creating new map with coordinates:', userCoords);
                
                // Add offline status indicator
                const offlineIndicator = document.createElement('div');
                offlineIndicator.id = 'map-offline-indicator';
                offlineIndicator.className = 'map-offline-indicator' + (navigator.onLine ? ' d-none' : '');
                offlineIndicator.innerHTML = '<span class="badge bg-warning text-dark"><i class="bi bi-wifi-off me-1"></i> Offline Mode</span>';
                
                // Add the indicator before the map container
                if (mapContainer.parentNode) {
                    mapContainer.parentNode.insertBefore(offlineIndicator, mapContainer);
                }
                
                // Use the OfflineMap module if available
                if (window.OfflineMap) {
                    console.log('Using OfflineMap module for offline support');
    
                    // If container doesn't have an ID, assign one
                    if (!mapContainer.id) {
                        mapContainer.id = 'active-pickup-map-' + Date.now();
                    }
    
                    activePickupMap = window.OfflineMap.createMap(
                        mapContainer.id,
                        [userCoords.latitude, userCoords.longitude],
                        13
                    );
    
                    // If we're online, pre-cache the area around the user's location
                    if (navigator.onLine && window.OfflineMap.preCacheArea) {
                        window.OfflineMap.preCacheArea(
                            [userCoords.latitude, userCoords.longitude],
                            13, // zoom level
                            5   // cache radius in tiles
                        );
                    }
                } else {
                    // Fallback to standard Leaflet
                    console.log('OfflineMap module not available, using standard Leaflet');
    
                    activePickupMap = L.map(mapContainer).setView([userCoords.latitude, userCoords.longitude], 13);
    
                    // Add OpenStreetMap tile layer
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 19
                    }).addTo(activePickupMap);
                }
                
                // Setup event listeners for online/offline status
                const updateOfflineIndicator = function() {
                    const indicator = document.getElementById('map-offline-indicator');
                    if (indicator) {
                        if (navigator.onLine) {
                            indicator.classList.add('d-none');
                        } else {
                            indicator.classList.remove('d-none');
                        }
                    }
                };
                
                window.addEventListener('online', updateOfflineIndicator);
                window.addEventListener('offline', updateOfflineIndicator);
                
                console.log('Map initialization successful');
            }
        } catch (error) {
            console.error('Error initializing map:', error);
            // Try direct initialization as a last resort
            try {
                activePickupMap = L.map(mapContainer).setView([userCoords.latitude, userCoords.longitude], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(activePickupMap);
            } catch (e) {
                console.error('Fallback map initialization also failed:', e);
            }
        }
        
        // Add user marker
        const userIcon = L.divIcon({
                className: 'user-marker',
                html: '<i class="bi bi-house-fill text-primary fs-4"></i>',
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            });
            
            userMarker = L.marker([userCoords.latitude, userCoords.longitude], { icon: userIcon })
                .addTo(activePickupMap)
                .bindPopup('Your Location');
            
            // Add collector marker if coordinates are available
            if (activePickup.collector_coordinates) {
                const collectorCoords = window.DistanceCalculator.parseCoordinates(activePickup.collector_coordinates);
                
                if (collectorCoords) {
                    const collectorIcon = L.divIcon({
                        className: 'collector-marker',
                        html: '<i class="bi bi-truck text-success fs-4"></i>',
                        iconSize: [25, 25],
                        iconAnchor: [12, 12]
                    });
                    
                    collectorMarker = L.marker([collectorCoords.latitude, collectorCoords.longitude], { icon: collectorIcon })
                        .addTo(activePickupMap)
                        .bindPopup('Collector Location');
                    
                    // Fit bounds to include both markers
                    const bounds = L.latLngBounds(
                        [userCoords.latitude, userCoords.longitude],
                        [collectorCoords.latitude, collectorCoords.longitude]
                    );
                    activePickupMap.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        } else {
            // Update existing map
            
            // Update user marker position
            if (userMarker) {
                userMarker.setLatLng([userCoords.latitude, userCoords.longitude]);
            }
            
            // Update collector marker position if coordinates are available
            if (activePickup.collector_coordinates) {
                const collectorCoords = window.DistanceCalculator.parseCoordinates(activePickup.collector_coordinates);
                
                if (collectorCoords) {
                    if (collectorMarker) {
                        // Update existing marker
                        collectorMarker.setLatLng([collectorCoords.latitude, collectorCoords.longitude]);
                    } else {
                        // Create new marker
                        const collectorIcon = L.divIcon({
                            className: 'collector-marker',
                            html: '<i class="bi bi-truck text-success fs-4"></i>',
                            iconSize: [25, 25],
                            iconAnchor: [12, 12]
                        });
                        
                        collectorMarker = L.marker([collectorCoords.latitude, collectorCoords.longitude], { icon: collectorIcon })
                            .addTo(activePickupMap)
                            .bindPopup('Collector Location');
                    }
                    
                    // Fit bounds to include both markers
                    const bounds = L.latLngBounds(
                        [userCoords.latitude, userCoords.longitude],
                        [collectorCoords.latitude, collectorCoords.longitude]
                    );
                    activePickupMap.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }
        
        // Force map resize to ensure it renders correctly
        setTimeout(() => {
            if (activePickupMap) {
                activePickupMap.invalidateSize();
            }
        }, 100);
    }
    
    /**
     * Set up real-time updates for active pickups using Supabase
     */
    function setupRealtimeUpdates() {
        // Clean up existing subscription if it exists
        if (supabaseSubscription) {
            supabaseSubscription.unsubscribe();
        }
        
        // Only setup real-time updates if we have active pickup requests
        if (activePickupRequests.length === 0) {
            return;
        }
        
        // Get the active pickup ID
        const activePickupId = activePickupRequests[0].id;
        
        // In a real implementation, this would use Supabase client.
        // For development mode, we'll simulate real-time updates
        if (window.isDev && window.isDev()) {
            console.log('Development mode: Simulating real-time updates for active pickup');
            
            // Simulate collector updates by moving the collector closer every 30 seconds
            simulateCollectorMovement();
        } else if (window.supabase) {
            // Set up Supabase subscription for real-time updates
            supabaseSubscription = window.supabase
                .from('pickup_requests')
                .on('UPDATE', payload => {
                    if (payload.new.id === activePickupId) {
                        // Update the active pickup request
                        activePickupRequests[0] = { ...activePickupRequests[0], ...payload.new };
                        
                        // Update the UI
                        updateActivePickupUI();
                        
                        // Check if the pickup is completed
                        if (payload.new.status === 'completed') {
                            handlePickupCompletion(payload.new);
                        }
                    }
                })
                .subscribe();
        }
    }
    
    /**
     * Simulate collector movement for development testing
     */
    function simulateCollectorMovement() {
        // Only simulate if we have an active pickup
        if (activePickupRequests.length === 0) {
            return;
        }
        
        const activePickup = activePickupRequests[0];
        
        // If no collector is assigned yet, simulate assignment after a delay
        if (activePickup.status === 'pending') {
            setTimeout(() => {
                // Assign a collector
                activePickup.collector_id = 'dev-collector-123';
                activePickup.collector_name = 'John Collector';
                activePickup.status = 'accepted';
                
                // Create collector coordinates - start 3 miles away
                const userCoords = window.DistanceCalculator.parseCoordinates(activePickup.coordinates);
                if (userCoords) {
                    // Create a point ~3 miles north of the user
                    // Approximate: 1 degree latitude = 69 miles
                    const collectorLat = userCoords.latitude + (3 / 69);
                    activePickup.collector_coordinates = `POINT(${userCoords.longitude} ${collectorLat})`;
                    
                    // Update UI
                    updateActivePickupUI();
                    
                    // Start movement simulation
                    startCollectorMovementSimulation();
                }
            }, 5000); // 5 second delay
        } else if (activePickup.status === 'accepted' && !activePickup.movementSimulationStarted) {
            startCollectorMovementSimulation();
        }
    }
    
    /**
     * Start simulating collector movement at regular intervals
     */
    function startCollectorMovementSimulation() {
        if (activePickupRequests.length === 0) {
            return;
        }
        
        const activePickup = activePickupRequests[0];
        
        // Mark that we've started simulation to avoid duplicate timers
        activePickup.movementSimulationStarted = true;
        
        // Move collector every 10 seconds
        const movementInterval = setInterval(() => {
            // Stop if no active pickups or if completed
            if (activePickupRequests.length === 0 || activePickup.status === 'completed') {
                clearInterval(movementInterval);
                return;
            }
            
            const userCoords = window.DistanceCalculator.parseCoordinates(activePickup.coordinates);
            const collectorCoords = window.DistanceCalculator.parseCoordinates(activePickup.collector_coordinates);
            
            if (userCoords && collectorCoords) {
                // Calculate current distance
                const currentDistance = window.DistanceCalculator.calculateDistance(
                    userCoords.latitude, userCoords.longitude,
                    collectorCoords.latitude, collectorCoords.longitude
                );
                
                // If collector has arrived, update status
                if (window.DistanceCalculator.hasCollectorArrived(currentDistance)) {
                    activePickup.status = 'arrived';
                    updateActivePickupUI();
                    
                    // Simulate completion after 2 minutes
                    setTimeout(() => {
                        handlePickupCompletion(activePickup);
                    }, 120000); // 2 minutes
                    
                    clearInterval(movementInterval);
                    return;
                }
                
                // Move collector closer to user (approximately 0.5 miles closer)
                // Rough approximation: 1 degree latitude = 69 miles
                const moveFactor = 0.5 / 69;
                const latDiff = userCoords.latitude - collectorCoords.latitude;
                const lonDiff = userCoords.longitude - collectorCoords.longitude;
                const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
                
                const newLat = collectorCoords.latitude + (latDiff / distance) * moveFactor;
                const newLon = collectorCoords.longitude + (lonDiff / distance) * moveFactor;
                
                // Update collector coordinates
                activePickup.collector_coordinates = `POINT(${newLon} ${newLat})`;
                
                // Update UI
                updateActivePickupUI();
            }
        }, 10000); // Every 10 seconds
    }
    
    /**
     * Update pickup status on the server
     */
    async function updatePickupStatus(pickupId, status) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }
            
            // Update locally first for immediate feedback
            if (activePickupRequests.length > 0 && activePickupRequests[0].id === pickupId) {
                activePickupRequests[0].status = status;
                updateActivePickupUI();
            }
            
            // Skip server update in offline mode
            if (!navigator.onLine) {
                console.log('Offline: Status update will be synced when online');
                return;
            }
            
            // Send status update to server
            const response = await fetch(`/api/pickups/${pickupId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update pickup status');
            }
            
        } catch (error) {
            console.error('Error updating pickup status:', error);
        }
    }
    
    /**
     * Cancel active pickup request
     * This function is exposed in the public API and can be called directly
     */
    async function cancelActivePickup() {
        console.log('cancelActivePickup function called');
        try {
            if (activePickupRequests.length === 0) {
                console.log('No active pickup requests to cancel');
                // Ensure all persistence is cleared
                clearAllPersistenceData();
                hideActivePickupContainer();
                return;
            }
            
            // Get the active pickup ID
            const pickupId = activePickupRequests[0].id;
            console.log('Cancelling pickup request:', pickupId);
            
            // Use the dashboard's centralized cancelPickupRequest if available
            // This avoids showing duplicate confirmation prompts
            if (typeof window.cancelPickupRequest === 'function') {
                console.log('Using dashboard.js cancelPickupRequest for centralized handling');
                // We'll skip our own confirmation as the dashboard function will handle it
                return window.cancelPickupRequest(pickupId);
            }
            
            // If we get here, the dashboard function isn't available, so we handle it ourselves
            // Check for existing confirmation in progress to prevent duplicates
            if (window.cancelConfirmationInProgress) {
                console.log('Cancellation already in progress, skipping duplicate prompt');
                return;
            }
            
            // Set flag to prevent duplicate prompts
            window.cancelConfirmationInProgress = true;
            
            // Ask for confirmation
            if (!confirm('Are you sure you want to cancel this pickup request? This action cannot be undone.')) {
                console.log('User cancelled the cancellation');
                window.cancelConfirmationInProgress = false;
                return;
            }
            
            // Reset the flag after a delay
            setTimeout(() => {
                window.cancelConfirmationInProgress = false;
            }, 500);
            
            // Check if we're in development mode
            const isDevMode = window.isDev && window.isDev();
            
            console.log('User confirmed cancellation, proceeding...');
            
            // In development mode, just simulate success
            if (isDevMode) {
                console.log('Development mode: simulating successful cancellation');
                // Remove from active pickups
                activePickupRequests = [];
                
                // Hide the container
                hideActivePickupContainer();
                
                // Show success message
                alert('Pickup request canceled successfully.');
                return;
            }
            
            // Update status to 'canceled'
            try {
                await updatePickupStatus(activePickupId, 'canceled');
                console.log('Pickup status updated to canceled');
            } catch (statusError) {
                console.error('Failed to update pickup status, but continuing with UI updates:', statusError);
            }
            
            // Remove from active pickups
            activePickupRequests = [];
            
            // Hide the container
            hideActivePickupContainer();
            
            // Show success message
            alert('Pickup request canceled successfully.');
            
        } catch (error) {
            console.error('Error canceling pickup request:', error);
        }

        // Move collector closer to user (approximately 0.5 miles closer)
        // Rough approximation: 1 degree latitude = 69 miles
        const moveFactor = 0.5 / 69;
        const latDiff = userCoords.latitude - collectorCoords.latitude;
        const lonDiff = userCoords.longitude - collectorCoords.longitude;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);

        const newLat = collectorCoords.latitude + (latDiff / distance) * moveFactor;
        const newLon = collectorCoords.longitude + (lonDiff / distance) * moveFactor;

        // Update collector coordinates
        activePickup.collector_coordinates = `POINT(${newLon} ${newLat})`;

        // Update UI
        updateActivePickupUI();
    }
}, 10000); // Every 10 seconds
}

/**
 * Update pickup status on the server
 */
async function updatePickupStatus(pickupId, status) {
try {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No authentication token found');
        return;
            try {
                console.log('Removing map');
                activePickupMap.remove();
                activePickupMap = null;
                userMarker = null;
                collectorMarker = null;
            } catch (mapError) {
                console.warn('Error removing map:', mapError);
            }
        }
        
        // Clean up subscription
        if (supabaseSubscription) {
            try {
                console.log('Unsubscribing from Supabase');
                supabaseSubscription.unsubscribe();
                supabaseSubscription = null;
            } catch (subError) {
                console.warn('Error unsubscribing:', subError);
            }
        }
        
        // Store the empty pickup requests in IndexedDB
        storeActivePickupsInIndexedDB([]);
    }
    
    /**
     * Handle pickup completion
     */
    async function handlePickupCompletion(pickup) {
        try {
            // Add points to user's account
            if (pickup.points > 0) {
                await addPointsToUserAccount(pickup.points);
            }
            
            // Show success message
            alert(`Pickup completed! You earned ${pickup.points} points.`);
            
            // Remove from active pickups
            activePickupRequests = [];
            
            // Update UI
            const container = document.querySelector(domSelectors.activePickupContainer);
            if (container) {
                container.style.display = 'none';
                container.setAttribute('aria-hidden', 'true');
            }
            
            // Clean up map
            if (activePickupMap) {
                activePickupMap.remove();
                activePickupMap = null;
                userMarker = null;
                collectorMarker = null;
            }
            
            // Clean up subscription
            if (supabaseSubscription) {
                supabaseSubscription.unsubscribe();
                supabaseSubscription = null;
            }
            
            // Refresh the page to update dashboard stats
            window.location.reload();
            
        } catch (error) {
            console.error('Error handling pickup completion:', error);
        }
    }
    
    /**
     * Add points to user's account
     */
    async function addPointsToUserAccount(points) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }
            
            // Skip server update in offline mode
            if (!navigator.onLine) {
                console.log('Offline: Points will be added when online');
                return;
            }
            
            // Send points update to server
            const response = await fetch('/api/user/points', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ points })
            });
            
            if (!response.ok) {
                throw new Error('Failed to add points to user account');
            }
            
        } catch (error) {
            console.error('Error adding points to user account:', error);
        }
    }
    
    /**
     * Update active pickup status (called by interval)
     */
    function updateActivePickupStatus() {
        if (activePickupRequests.length > 0) {
            updateLocationAndDistanceInfo(activePickupRequests[0]);
        }
    }
    
    /**
     * Store active pickups in IndexedDB for offline access
     */
    async function storeActivePickupsInIndexedDB(pickups) {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return resolve(false);
            }
            
            const request = window.indexedDB.open('TrashDropDB', 1);
            
            request.onerror = function(event) {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = function(event) {
                const db = event.target.result;
                
                try {
                    const transaction = db.transaction(['activePickups'], 'readwrite');
                    const store = transaction.objectStore('activePickups');
                    
                    // Clear existing data
                    store.clear();
                    
                    // Store new data
                    pickups.forEach(pickup => {
                        store.put(pickup);
                    });
                    
                    transaction.oncomplete = function() {
                        db.close();
                        resolve(true);
                    };
                    
                    transaction.onerror = function(event) {
                        console.error('Transaction error:', event.target.error);
                        db.close();
                        reject(event.target.error);
                    };
                } catch (error) {
                    db.close();
                    reject(error);
                }
            };
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // Create object store for active pickups if it doesn't exist
                if (!db.objectStoreNames.contains('activePickups')) {
                    db.createObjectStore('activePickups', { keyPath: 'id' });
                }
            };
        });
    }
    
    /**
     * Get active pickups from IndexedDB
     */
    async function getActivePickupsFromIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return resolve([]);
            }
            
            const request = window.indexedDB.open('TrashDropDB', 1);
            
            request.onerror = function(event) {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = function(event) {
                const db = event.target.result;
                
                try {
                    const transaction = db.transaction(['activePickups'], 'readonly');
                    const store = transaction.objectStore('activePickups');
                    const getAllRequest = store.getAll();
                    
                    getAllRequest.onsuccess = function() {
                        db.close();
                        resolve(getAllRequest.result);
                    };
                    
                    getAllRequest.onerror = function(event) {
                        console.error('GetAll error:', event.target.error);
                        db.close();
                        reject(event.target.error);
                    };
                } catch (error) {
                    db.close();
                    reject(error);
                }
            };
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                
                // Create object store for active pickups if it doesn't exist
                if (!db.objectStoreNames.contains('activePickups')) {
                    db.createObjectStore('activePickups', { keyPath: 'id' });
                }
            };
        });
    }
    
    /**
     * Fix any broken map elements and re-initialize
     */
    function fixMapAndButtons() {
        console.log('ActivePickupManager: Fixing map and buttons');
        
        // First, try to move the container after Recent Activity if needed
        moveContainerAfterRecentActivity();
        
        // Fix map container if needed
        const mapContainer = document.querySelector(domSelectors.activePickupMap);
        if (mapContainer) {
            mapContainer.style.height = '200px';
            mapContainer.style.width = '100%';
            mapContainer.style.borderRadius = '0.5rem';
            mapContainer.style.marginTop = '1rem';
            mapContainer.style.marginBottom = '1rem';
            
            // Re-initialize map if we have active pickups
            if (activePickupRequests.length > 0) {
                // If map already exists, remove it first to avoid duplicate issues
                if (activePickupMap) {
                    try {
                        activePickupMap.remove();
                        activePickupMap = null;
                    } catch (e) {
                        console.warn('Error removing existing map:', e);
                    }
                }
                
                // Initialize map after a slight delay
                setTimeout(() => {
                    initializeActivePickupMap(activePickupRequests[0]);
                }, 200);
            }
        }
        
        // Fix cancel button
        const cancelButton = document.querySelector(domSelectors.cancelButton);
        if (cancelButton) {
            console.log('ActivePickupManager: Setting up cancel button');
            
            // First, remove the existing onclick attribute to avoid conflicts
            cancelButton.removeAttribute('onclick');
            
            // Then clear all existing event listeners by cloning the node
            const newButton = cancelButton.cloneNode(true);
            cancelButton.parentNode.replaceChild(newButton, cancelButton);
            
            // Add direct event listener
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked via event listener');
                cancelActivePickup();
            });
            
            // Also add direct onclick attribute as a fallback
            newButton.setAttribute('onclick', 'console.log("Cancel button clicked via onclick"); ActivePickupManager.cancelActivePickup(); return false;');
            
            // For debugging - log when someone hovers over the button
            newButton.addEventListener('mouseover', function() {
                console.log('Cancel button hovered');
            });
        } else {
            console.error('ActivePickupManager: Cancel button not found with selector:', domSelectors.cancelButton);
            
            // Try to find it with any method possible
            const possibleButtons = Array.from(document.querySelectorAll('button'))
                .filter(btn => btn.textContent.includes('Cancel') || btn.id.includes('cancel'));
            
            if (possibleButtons.length > 0) {
                console.log('ActivePickupManager: Found potential cancel buttons:', possibleButtons.length);
                possibleButtons.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        console.log('Potential cancel button clicked');
                        cancelActivePickup();
                    });
                });
            }
        }
    }
    
    /**
     * Move the Active Pickup container after the Recent Activity card
     */
    function moveContainerAfterRecentActivity() {
        console.log('ActivePickupManager: Attempting to move container after Recent Activity');
        
        // Get the active pickup container
        const activePickupContainer = document.querySelector(domSelectors.activePickupContainer);
        if (!activePickupContainer) {
            console.error('ActivePickupManager: Container not found for repositioning');
            return;
        }
        
        // Based on dashboard.html structure - find the Recent Activity card containing the activity-list
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            // Find the card container by traversing up to col-12
            let activityCardContainer = activityList.closest('.col-12');
            if (activityCardContainer) {
                console.log('ActivePickupManager: Found Recent Activity by activity-list ID, moving pickup card after it');
                
                // Create a new row for the Active Pickup container if needed
                if (!activePickupContainer.classList.contains('col-12')) {
                    const existingRow = document.createElement('div');
                    existingRow.className = 'row g-3';
                    existingRow.appendChild(activePickupContainer);
                    
                    // Insert after the Recent Activity container
                    activityCardContainer.parentNode.insertBefore(existingRow, activityCardContainer.nextSibling);
                } else {
                    // Insert directly after Recent Activity container
                    activityCardContainer.parentNode.insertBefore(activePickupContainer, activityCardContainer.nextSibling);
                }
                return true;
            }
        }
        
        // Find Recent Activity by its card header
        const recentActivityHeader = Array.from(document.querySelectorAll('.card-header'))
            .find(header => {
                const headingElement = header.querySelector('h5') || header.querySelector('.mb-0');
                return headingElement && headingElement.textContent && headingElement.textContent.trim() === 'Recent Activity';
            });
            
        if (recentActivityHeader) {
            // Navigate up to containing card and col-12
            const card = recentActivityHeader.closest('.card');
            if (card) {
                const cardContainer = card.closest('.col-12');
                if (cardContainer) {
                    console.log('ActivePickupManager: Found Recent Activity by card header, moving pickup card after it');
                    
                    // Insert active pickup container after the Recent Activity card container
                    cardContainer.parentNode.insertBefore(activePickupContainer, cardContainer.nextSibling);
                    return true;
                }
            }
        }
        
        // Try the most specific approach based on dashboard structure
        const recentActivityByText = Array.from(document.querySelectorAll('.card-header'))
            .find(el => el.textContent && el.textContent.includes('Recent Activity'));
        
        if (recentActivityByText) {
            const card = recentActivityByText.closest('.card');
            if (card) {
                const col12 = card.closest('.col-12');
                if (col12) {
                    console.log('ActivePickupManager: Found Recent Activity by text content, moving pickup card after it');
                    col12.parentNode.insertBefore(activePickupContainer, col12.nextSibling);
                    return true;
                }
            }
        }
        
        // One more attempt - check for other known dashboard elements and position relative to them
        const fallbackElements = [
            document.querySelector('.card-header.bg-info.text-white'), // Recent Activity has this header
            // Find activity link and get its parent card footer
            document.querySelector('a[href="/activity"]')?.closest('.card-footer'),
            // Find activity link and get its parent card
            document.querySelector('a[href="/activity"]')?.closest('.card'),
            document.querySelector('#activity-list'),
            // Get the card that contains the activity list (without using :has selector)
            (function() {
                const activityList = document.querySelector('#activity-list');
                return activityList ? activityList.closest('.card') : null;
            })()
        ];
        
        for (const element of fallbackElements) {
            if (element) {
                let container = element.closest('.col-12') || element.closest('.card') || element;
                if (container.closest('.col-12')) {
                    container = container.closest('.col-12');
                }
                
                console.log('ActivePickupManager: Found element related to Recent Activity, moving pickup card after it');
                container.parentNode.insertBefore(activePickupContainer, container.nextSibling);
                return true;
            }
        }
        
        // If all else fails, try inserting into the last row of the main content
        const rows = Array.from(document.querySelectorAll('main .row'));
        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            console.log('ActivePickupManager: Inserting into the last row as fallback');
            lastRow.appendChild(activePickupContainer);
            return true;
        }
        
        console.log('ActivePickupManager: Could not find Recent Activity section, using default approach');
        return false;
    }
    
    // Create a direct reference to the cancelActivePickup function for the global scope
    // This ensures it's directly callable from button events
    window.cancelPickupRequest = function() {
        console.log('Global cancelPickupRequest called');
        cancelActivePickup();
    };
    
    /**
     * Get active pickup requests (for external access)
     */
    function getActivePickupRequests() {
        return activePickupRequests;
    }
    
    // Public API
    return {
        init,
        loadActivePickupRequests,
        cancelActivePickup, // This is the function we need to access
        fixMapAndButtons,
        getActivePickupRequests // Expose active pickup requests
    };
})();

/**
 * Create the active pickup container if it doesn't exist
 */
function createActivePickupContainer() {
    console.log('ActivePickupManager: Attempting to create container element');
    // Find Recent Activity section to position after it
    const recentActivitySection = document.querySelector('.card-header:has(h5:contains("Recent Activity"))');
    let insertionPoint;
    
    if (recentActivitySection) {
        // Find the parent card of the Recent Activity section
        let currentElement = recentActivitySection;
        while (currentElement && !currentElement.classList.contains('card')) {
            currentElement = currentElement.parentElement;
        }
        
        // Go up one more level to the column
        if (currentElement) {
            currentElement = currentElement.parentElement;
        }
        
        // If we found the column, use it as insertion point
        if (currentElement) {
            insertionPoint = currentElement;
            console.log('ActivePickupManager: Found Recent Activity section, positioning after it');
        }
    }
    
    // Fallback to looking for any section if Recent Activity not found
    if (!insertionPoint) {
        // Try different ways to find a good insertion point
        const possiblePoints = [
            document.querySelector('.row:has(.card-header:contains("Recent Activity"))'),
            document.querySelector('#activity-list'),
            document.querySelector('.row.g-3:last-of-type'),
            document.querySelector('.row.g-3.mb-3'),
            document.querySelector('main > .row:last-child')
        ];
        
        for (const point of possiblePoints) {
            if (point) {
                insertionPoint = point;
                console.log('ActivePickupManager: Found fallback insertion point');
                break;
            }
        }
    }
    
    if (insertionPoint) {
        // Create container element
        const container = document.createElement('div');
        container.id = 'active-pickup-container';
        container.className = 'col-12 mb-3';
        container.setAttribute('style', 'display: block !important; margin-top: 1rem;');
        container.setAttribute('aria-hidden', 'false');
        
        // Set initial content with improved map container and cancel button
        container.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
                    <h5 class="mb-0 fs-6 fw-bold">Active Pickup Request</h5>
                    <span id="tracking-status" class="badge bg-warning text-dark">Loading Request...</span>
                </div>
                <div class="card-body p-3">
                    <div class="text-center mb-4">
                        <div class="spinner-border text-primary my-3" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p>Preparing your pickup request information...</p>
                    </div>
                    
                    <!-- Empty map container with fixed height -->
                    <div id="active-pickup-map" style="height: 200px; width: 100%; margin-top: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;"></div>
                    
                    <!-- Cancel button with direct call to dashboard's cancelPickupRequest function -->
                    <div class="d-grid gap-2 mt-3">
                        <button type="button" class="btn btn-outline-danger" id="cancel-pickup-btn" data-pickup-id="dev-pickup-id">
                            <i class="bi bi-x-circle me-1"></i> Cancel Request
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after insertion point
        if (insertionPoint.nextSibling) {
            insertionPoint.parentNode.insertBefore(container, insertionPoint.nextSibling);
        } else {
            insertionPoint.parentNode.appendChild(container);
        }
        console.log('ActivePickupManager: Created and inserted container');
        return container;
    } else {
        // Last resort: insert at the beginning of the page
        const mainContent = document.querySelector('main') || document.body;
        const firstChild = mainContent.firstChild;
        mainContent.insertBefore(container, firstChild);
        console.log('ActivePickupManager: Created and inserted container at beginning');
        return container;
    }
}

// Removed the global cancelPickupRequest function to prevent duplicate confirmation prompts
// Now the button will directly call dashboard.js's cancelPickupRequest function

// Initialize the Active Pickup Manager
// Both on DOMContentLoaded and window load to ensure it runs
document.addEventListener('DOMContentLoaded', function() {
    console.log('ActivePickupManager: DOM ready, initializing...');
    ActivePickupManager.init();
    
    // Add a small delay to ensure proper positioning after the page has fully rendered
    setTimeout(() => {
        console.log('ActivePickupManager: Running delayed positioning and map initialization');
        ActivePickupManager.fixMapAndButtons();
        
        // Set up cancel button correctly
        setupCancelButton();
    }, 1000);
    
    // Make it globally available
    window.ActivePickupManager = ActivePickupManager;
    
    // Set up cancel button to call dashboard's cancelPickupRequest directly
    function setupCancelButton() {
        console.log('Setting up cancel button with direct dashboard function call');
        
        // Find all cancel buttons throughout the page
        const cancelButtons = document.querySelectorAll('#cancel-pickup-btn, button:contains("Cancel Request"), button.btn-outline-danger:contains("Cancel")'); 
        
        cancelButtons.forEach(button => {
            console.log('Found cancel button, setting up handler');
            
            // Remove any existing click handlers to avoid duplicates
            const newButton = button.cloneNode(true);
            if (button.parentNode) {
                button.parentNode.replaceChild(newButton, button);
            }
            
            // Add direct event listener to call dashboard's function
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked');
                
                // Generate a unique ID for this pickup in development mode
                const pickupId = 'dev-pickup-id-' + Date.now();
                
                // Check if dashboard's cancelPickupRequest is available
                if (typeof cancelPickupRequest === 'function') {
                    // Call it directly - this will show only one confirmation dialog
                    console.log('Calling dashboard cancelPickupRequest with ID:', pickupId);
                    cancelPickupRequest(pickupId);
                } else {
                    console.log('Dashboard cancelPickupRequest not available, using fallback');
                    // Fallback - just hide the container
                    if (confirm('Are you sure you want to cancel this pickup request?')) {
                        const container = document.getElementById('active-pickup-container');
                        if (container) {
                            container.style.display = 'none';
                            container.setAttribute('aria-hidden', 'true');
                            console.log('Active pickup container hidden');
                        }
                    }
                }
            });
            
            // Remove any onclick attribute to prevent duplicate dialogs
            newButton.removeAttribute('onclick');
        });
    }
});

// Also handle when returning to the page (for single-page app behavior)
window.addEventListener('pageshow', function(event) {
    // Check if this is a back-forward navigation
    if (event.persisted) {
        console.log('ActivePickupManager: Page restored from cache, re-initializing');
        setTimeout(() => {
            ActivePickupManager.fixMapAndButtons();
        }, 500);
    }
});

// Also initialize on window load as a fallback
window.addEventListener('load', function() {
    console.log('ActivePickupManager: window.load fired');
    // Check if we were initialized by DOMContentLoaded
    if (!localStorage.getItem('active_pickup_init')) {
        console.log('ActivePickupManager: Not initialized yet, initializing now');
        ActivePickupManager.init();
    } else {
        // Check URL parameters again in case we missed them
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('newRequest')) {
            console.log('ActivePickupManager: newRequest parameter found on window.load');
            // Force display of container
            const container = document.querySelector('#active-pickup-container');
            if (container) {
                container.setAttribute('style', 'display: block !important');
                container.setAttribute('aria-hidden', 'false');
            }
        }
    }
});
