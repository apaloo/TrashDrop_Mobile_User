/**
 * TrashDrop Request Pickup Location Handler
 * Manages saved locations selection for request pickup
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const savedLocationSelect = document.getElementById('saved-location');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    
    // Initialize map
    let pickupMap = null;
    let pickupMarker = null;
    let mapInitialized = false; // Flag to track initialization state
    const defaultLocation = [40.7128, -74.0060]; // Default location (NYC)
    
    // Load saved locations on page load
    loadSavedLocations();
    
    // Only initialize the map if we're on the right page with the map container
    const mapContainer = document.getElementById('pickup-map');
    if (mapContainer) {
        // Small delay to ensure DOM is fully ready
        setTimeout(() => {
            initializeMap();
        }, 100);
    }
    
    // Listen for location selection change
    if (savedLocationSelect) {
        savedLocationSelect.addEventListener('change', function() {
            const locationId = this.value;
            if (locationId) {
                setLocationOnMap(locationId);
            }
        });
    }
    
    /**
     * Initialize the map - with comprehensive safeguards against re-initialization
     */
    function initializeMap() {
        // Check if map container exists
        const mapContainer = document.getElementById('pickup-map');
        if (!mapContainer) {
            console.log('Map container not found, skipping map initialization');
            return;
        }

        // If map is already initialized, just refresh the view
        if (mapInitialized || pickupMap) {
            console.log('Map already initialized, refreshing view');
            if (pickupMap) {
                try {
                    pickupMap.invalidateSize();
                } catch (e) {
                    console.log('Error refreshing map size:', e);
                }
            }
            return;
        }
        
        // Check if container already has a map instance attached
        // This happens if Leaflet created a map but our pickupMap variable is null
        if (mapContainer._leaflet_id) {
            console.log('Container already has a Leaflet map instance attached');
            try {
                // Try to find and use the existing map
                if (L && L.DomUtil && L.DomUtil.get) {
                    const existingMap = L.DomUtil.get('pickup-map');
                    if (existingMap && existingMap._leaflet_id) {
                        // Remove the existing map completely
                        if (existingMap._leaflet) {
                            existingMap._leaflet.remove();
                        }
                        // Also try direct removal of the id
                        delete mapContainer._leaflet_id;
                    }
                }
            } catch (e) {
                console.error('Error cleaning up existing map:', e);
            }
        }
        
        // Set flag to prevent multiple initializations
        mapInitialized = true;
        
        try {
            // Create a clean container if needed
            while (mapContainer.firstChild) {
                mapContainer.removeChild(mapContainer.firstChild);
            }
            
            // Wait a tiny bit to ensure DOM updates
            setTimeout(() => {
                try {
                    // Create map with options to prevent zoom animation issues
                    pickupMap = L.map('pickup-map', {
                        fadeAnimation: false,
                        zoomAnimation: false,
                        markerZoomAnimation: false
                    }).setView(defaultLocation, 13);
                    
                    // Add tile layer
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(pickupMap);
                    
                    // Add marker
                    pickupMarker = L.marker(defaultLocation).addTo(pickupMap);
                    
                    // Ensure map is correctly sized after a short delay
                    setTimeout(() => {
                        if (pickupMap) {
                            pickupMap.invalidateSize();
                        }
                    }, 300);
                    
                    console.log('Map initialized successfully');
                } catch (innerError) {
                    console.error('Error during map creation:', innerError);
                    // Reset initialization flag on error
                    mapInitialized = false;
                }
            }, 50);
        } catch (error) {
            console.error('Error initializing map:', error);
            // Reset initialization flag on error
            mapInitialized = false;
        }
    }
    
    /**
     * Load saved locations into select dropdown
     */
    function loadSavedLocations() {
        if (!savedLocationSelect) return;
        
        // Clear existing options except the default one
        while (savedLocationSelect.options.length > 1) {
            savedLocationSelect.remove(1);
        }
        
        // Get saved locations
        const locations = getSavedLocations();
        
        // Add locations to select
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            savedLocationSelect.appendChild(option);
        });
    }
    
    /**
     * Set the selected location on the map
     * @param {string} locationId - The ID of the location to display
     */
    function setLocationOnMap(locationId) {
        const locations = getSavedLocations();
        const location = locations.find(loc => loc.id === locationId);
        
        if (location && pickupMap) {
            const { latitude, longitude } = location;
            const coordinates = [parseFloat(latitude), parseFloat(longitude)];
            
            // Update marker position
            if (pickupMarker) {
                pickupMarker.setLatLng(coordinates);
            } else {
                pickupMarker = L.marker(coordinates).addTo(pickupMap);
            }
            
            // Center map on marker
            pickupMap.setView(coordinates, 15);
            
            // Update form inputs
            if (latitudeInput) latitudeInput.value = latitude;
            if (longitudeInput) longitudeInput.value = longitude;
            
            console.log(`Location set to: ${location.name} (${latitude}, ${longitude})`);
        }
    }
    
    /**
     * Get saved locations from localStorage
     * @return {Array} - Array of saved locations
     */
    function getSavedLocations() {
        try {
            const locationsJSON = localStorage.getItem('savedLocations');
            return locationsJSON ? JSON.parse(locationsJSON) : [];
        } catch (error) {
            console.error('Error retrieving saved locations:', error);
            return [];
        }
    }
    
    // Handle browser resize events to ensure map renders correctly
    window.addEventListener('resize', function() {
        if (pickupMap) {
            setTimeout(() => pickupMap.invalidateSize(), 100);
        }
    });
    
    // Reinitialize map if any tab is shown that contains the map
    document.addEventListener('shown.bs.tab', function(e) {
        if (e.target && 
            e.target.getAttribute('href') && 
            document.querySelector(e.target.getAttribute('href') + ' #pickup-map')) {
            setTimeout(() => {
                if (pickupMap) {
                    pickupMap.invalidateSize();
                } else {
                    initializeMap();
                }
            }, 100);
        }
    });
});
