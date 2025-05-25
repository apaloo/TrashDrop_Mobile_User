/**
 * TrashDrop Active Pickup Request Manager
 * Handles tracking, displaying, and managing active pickup requests
 */

// Set development mode detection
window.isDevelopment = function() {
    // Check if we're on localhost or a development URL
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.port === '3000' ||
           window.location.href.includes('development') ||
           window.location.search.includes('dev=true');
};

// Ensure we don't initialize multiple times
if (window.ActivePickupManager) {
    console.log('Active Pickup Manager already initialized');
} else {
    // Create a namespace for our functions
    window.ActivePickupManager = (function() {
        // DOM selectors for active pickup elements
        const domSelectors = {
            activePickupContainer: '#active-pickup-container',
            collectorName: '#collector-name',
            wasteTypeQuantity: '#waste-type-quantity',
            pickupLocation: '#pickup-location',
            trackingStatus: '#tracking-status',
            earnedPoints: '#earned-points',
            pickupMap: '#active-pickup-map',
            etaText: '#estimated-arrival',
            distanceText: '#collector-distance',
            cancelButton: '#cancel-pickup-btn'
        };
        
        // Store active pickup requests
        let activePickupRequests = [];
        
        // Map related variables
        let activePickupMap = null;
        let userMarker = null;
        let collectorMarker = null;
        
        /**
         * Initialize the Active Pickup Manager
         */
        function init() {
            console.log('Initializing Active Pickup Manager');
            
            // Create demo data for development
            createDemoData();
            
            // Update the UI with the active pickup data
            updateActivePickupUI();
            
            // Set up event listeners
            setupEventListeners();
        }
        
        /**
         * Create demo data for testing
         */
        function createDemoData() {
            console.log('Creating demo pickup data');
            activePickupRequests = [{
                id: 'demo-pickup-123',
                status: 'in_progress',
                waste_type: 'Mixed Recyclables',
                quantity: '2 bags',
                bags_count: 2,
                pickup_location: '123 Main St, Anytown',
                coordinates: 'POINT(-122.419416 37.774929)',
                collector_name: 'John (Demo)',
                collector_coordinates: 'POINT(-122.422 37.776)',
                points_earned: 50
            }];
            
            // Save to localStorage for persistence
            localStorage.setItem('active_pickup_data', JSON.stringify(activePickupRequests[0]));
        }
        
        /**
         * Set up event listeners for active pickup
         */
        function setupEventListeners() {
            // Cancel button event listener
            const cancelButton = document.querySelector(domSelectors.cancelButton);
            if (cancelButton) {
                cancelButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    cancelActivePickup();
                });
            }
        }
        
        /**
         * Cancel an active pickup
         */
        function cancelActivePickup() {
            console.log('Cancelling active pickup');
            
            // In a real implementation, we would make an API call here
            // For demo purposes, just hide the container
            const container = document.querySelector(domSelectors.activePickupContainer);
            if (container) {
                container.style.display = 'none';
            }
            
            // Clear the active pickup data
            activePickupRequests = [];
            localStorage.removeItem('active_pickup_data');
            localStorage.setItem('pickup_cancelled', 'true');
            
            alert('Pickup request cancelled successfully');
        }
        
        /**
         * Update the UI with active pickup request information
         */
        function updateActivePickupUI() {
            console.log('Updating active pickup UI');
            
            const container = document.querySelector(domSelectors.activePickupContainer);
            
            // If no container or no active pickups, hide the container
            if (!container || activePickupRequests.length === 0) {
                if (container) {
                    container.style.display = 'none';
                }
                return;
            }
            
            // Show the container
            container.style.display = 'block';
            container.setAttribute('aria-hidden', 'false');
            
            // Get the most recent active pickup request
            const activePickup = activePickupRequests[0];
            
            // Update UI elements with pickup information
            updatePickupInfoUI(activePickup);
            
            // Add a delay before initializing the map to ensure the container is visible
            setTimeout(() => {
                initializeActivePickupMap(activePickup);
            }, 500);
        }
        
        /**
         * Update pickup information in the UI
         */
        function updatePickupInfoUI(activePickup) {
            // Update collector information
            const collectorNameEl = document.querySelector(domSelectors.collectorName);
            if (collectorNameEl) {
                collectorNameEl.textContent = activePickup.collector_name || 'Pending Assignment';
            }
            
            // Update waste type and quantity
            const wasteTypeQuantityEl = document.querySelector(domSelectors.wasteTypeQuantity);
            if (wasteTypeQuantityEl) {
                wasteTypeQuantityEl.textContent = `${activePickup.waste_type} (${activePickup.bags_count} bags)`;
            }
            
            // Update pickup location
            const pickupLocationEl = document.querySelector(domSelectors.pickupLocation);
            if (pickupLocationEl) {
                pickupLocationEl.textContent = activePickup.pickup_location || 'Not specified';
            }
            
            // Update tracking status
            const trackingStatusEl = document.querySelector(domSelectors.trackingStatus);
            if (trackingStatusEl) {
                trackingStatusEl.textContent = 'Collector en route';
                trackingStatusEl.className = 'badge bg-warning text-dark';
            }
            
            // Update earned points
            const earnedPointsEl = document.querySelector(domSelectors.earnedPoints);
            if (earnedPointsEl) {
                earnedPointsEl.textContent = activePickup.points_earned || '0';
            }
        }
        
        /**
         * Initialize or update the map with pickup and collector locations
         */
        function initializeActivePickupMap(activePickup) {
            console.log('Initializing active pickup map');
            
            // Get the map container
            const mapContainer = document.getElementById('active-pickup-map');
            
            if (!mapContainer) {
                console.error('Map container not found');
                return;
            }
            
            // Make sure the map container has appropriate dimensions
            mapContainer.style.height = '200px';
            mapContainer.style.width = '100%';
            mapContainer.style.borderRadius = '0.5rem';
            mapContainer.style.marginTop = '1rem';
            mapContainer.style.marginBottom = '1rem';
            
            // Make sure Leaflet is available
            if (typeof L === 'undefined') {
                console.error('Leaflet library not loaded');
                return;
            }
            
            // Parse user coordinates
            const userCoords = parseCoordinates(activePickup.coordinates);
            
            if (!userCoords) {
                console.error('Invalid user coordinates');
                return;
            }
            
            // Initialize map if it doesn't exist
            if (!activePickupMap) {
                try {
                    console.log('Creating new map instance');
                    activePickupMap = L.map(mapContainer).setView([userCoords.latitude, userCoords.longitude], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(activePickupMap);
                    
                    // Add user marker
                    userMarker = L.marker([userCoords.latitude, userCoords.longitude])
                        .addTo(activePickupMap)
                        .bindPopup('Your location')
                        .openPopup();
                    
                    // If collector coordinates exist, add collector marker
                    if (activePickup.collector_coordinates) {
                        const collectorCoords = parseCoordinates(activePickup.collector_coordinates);
                        if (collectorCoords) {
                            collectorMarker = L.marker([collectorCoords.latitude, collectorCoords.longitude])
                                .addTo(activePickupMap)
                                .bindPopup('Collector location');
                                
                            // Fit bounds to include both markers
                            const bounds = L.latLngBounds(
                                [userCoords.latitude, userCoords.longitude],
                                [collectorCoords.latitude, collectorCoords.longitude]
                            );
                            activePickupMap.fitBounds(bounds, { padding: [50, 50] });
                            
                            // Update distance and ETA
                            updateDistanceAndETA(userCoords, collectorCoords);
                        }
                    }
                    
                    // Force a resize after initialization
                    setTimeout(() => {
                        activePickupMap.invalidateSize();
                    }, 100);
                    
                } catch (error) {
                    console.error('Error initializing map:', error);
                }
            }
        }
        
        /**
         * Parse coordinates string to latitude/longitude object
         */
        function parseCoordinates(coordString) {
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
                
                return null;
            } catch (e) {
                console.error('Error parsing coordinates:', e);
                return null;
            }
        }
        
        /**
         * Update distance and ETA information
         */
        function updateDistanceAndETA(userCoords, collectorCoords) {
            // Calculate distance between user and collector (simple approximation)
            const latDiff = userCoords.latitude - collectorCoords.latitude;
            const lonDiff = userCoords.longitude - collectorCoords.longitude;
            const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
            
            // Convert to kilometers (very rough approximation)
            const distanceKm = distance * 111; // 1 degree is approximately 111km
            
            // Update distance text
            const distanceEl = document.querySelector(domSelectors.distanceText);
            if (distanceEl) {
                distanceEl.textContent = distanceKm < 1 ? 
                    `${Math.round(distanceKm * 1000)} meters away` : 
                    `${distanceKm.toFixed(1)} km away`;
            }
            
            // Calculate ETA (assuming 30 km/h average speed)
            const etaMinutes = Math.round((distanceKm / 30) * 60);
            
            // Update ETA text
            const etaEl = document.querySelector(domSelectors.etaText);
            if (etaEl) {
                etaEl.textContent = etaMinutes < 1 ? 
                    'Less than a minute' : 
                    `${etaMinutes} ${etaMinutes === 1 ? 'minute' : 'minutes'}`;
            }
        }
        
        // Public API
        return {
            init: init
        };
    })();
    
    // Initialize the manager when the document is ready
    document.addEventListener('DOMContentLoaded', function() {
        window.ActivePickupManager.init();
    });
}
