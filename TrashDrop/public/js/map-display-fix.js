/**
 * Map Display Fix
 * This script ensures the map displays properly in the active pickup card
 * regardless of authentication status or page state
 */

console.log('Map display fix: Script loaded');

// Initialize immediately when script loads
initializeMap();

// Then initialize again after DOM is fully loaded for better reliability
document.addEventListener('DOMContentLoaded', function() {
    console.log('Map display fix: DOM fully loaded');
    // Wait for a short delay to ensure all other scripts have run
    setTimeout(initializeMap, 1000);
    
    // Also set up a demo pickup for testing in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setupDemoPickup();
    }
});

/**
 * Force map initialization after page load
 */
function initializeMap() {
    console.log('Map display fix: Initializing map');
    const mapContainer = document.getElementById('active-pickup-map');
    
    if (!mapContainer) {
        console.log('Map display fix: Map container not found, creating it');
        
        // If the map container doesn't exist, find the active pickup card and add it
        const activePickupCard = document.querySelector('.active-pickup-card');
        if (activePickupCard) {
            console.log('Map display fix: Creating map container in active pickup card');
            const mapDiv = document.createElement('div');
            mapDiv.id = 'active-pickup-map';
            mapDiv.style.height = '200px';
            mapDiv.style.width = '100%';
            mapDiv.style.display = 'block';
            
            // Add it to the card
            activePickupCard.insertBefore(mapDiv, activePickupCard.firstChild);
        }
    } else {
        console.log('Map display fix: Map container found, ensuring proper display');
        // Ensure the container is visible and has dimensions
        mapContainer.style.height = '200px';
        mapContainer.style.width = '100%';
        mapContainer.style.display = 'block';
    }
    
    // Force a layout recalculation
    if (mapContainer) {
        void mapContainer.offsetHeight;
    }
    
    // Check if we have active pickup data and it hasn't been cancelled
    const activePickupData = localStorage.getItem('active_pickup_data');
    const cancellationFlag = localStorage.getItem('pickup_cancelled');
    
    // Only proceed if we have active pickup data and it hasn't been cancelled
    if (activePickupData && !cancellationFlag && mapContainer) {
        console.log('Map display fix: Active pickup data found, initializing map');
        
        try {
            const pickup = JSON.parse(activePickupData);
            
            // Parse coordinates
            let coords = { latitude: 40.7128, longitude: -74.0060 }; // Default to NYC
            
            if (pickup.coordinates) {
                try {
                    // Try to parse the coordinates
                    if (typeof pickup.coordinates === 'string') {
                        if (pickup.coordinates.startsWith('[')) {
                            // Array format: [lat, lng]
                            const parsed = JSON.parse(pickup.coordinates);
                            coords = { latitude: parsed[0], longitude: parsed[1] };
                        } else if (pickup.coordinates.includes(',')) {
                            // Comma-separated format: lat,lng
                            const parts = pickup.coordinates.split(',');
                            coords = { latitude: parseFloat(parts[0]), longitude: parseFloat(parts[1]) };
                        }
                    } else if (typeof pickup.coordinates === 'object') {
                        coords = pickup.coordinates;
                    }
                } catch (e) {
                    console.error('Map display fix: Error parsing coordinates', e);
                }
            }
            
            console.log('Map display fix: Using coordinates', coords);
            
            // Create the map if it doesn't exist
            if (!window.activePickupMap && L) {
                console.log('Map display fix: Creating new map');
                window.activePickupMap = L.map(mapContainer).setView([coords.latitude, coords.longitude], 13);
                
                // Add the tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(window.activePickupMap);
                
                // Add a marker for the user's location
                const userIcon = L.divIcon({
                    className: 'user-marker',
                    html: '<i class="bi bi-house-fill text-primary fs-4"></i>',
                    iconSize: [25, 25],
                    iconAnchor: [12, 12]
                });
                
                L.marker([coords.latitude, coords.longitude], { icon: userIcon })
                    .addTo(window.activePickupMap)
                    .bindPopup('Your location');
                
                console.log('Map display fix: Map created successfully');
            } else {
                console.log('Map display fix: Map already exists or Leaflet not loaded');
            }
        } catch (error) {
            console.error('Map display fix: Error initializing map', error);
        }
    } else {
        console.log('Map display fix: No active pickup data found');
    }
}

// Also initialize when the active pickup becomes visible
document.addEventListener('click', function(event) {
    // Check if the user clicked something related to showing the active pickup
    const target = event.target;
    if (target && (
        target.id === 'active-pickup-btn' || 
        target.closest('#active-pickup-btn') ||
        target.id === 'view-active-pickup' ||
        target.closest('#view-active-pickup')
    )) {
        console.log('Map display fix: Active pickup view requested, initializing map');
        setTimeout(initializeMap, 300);
    }
});

/**
 * Set up a demo pickup for testing in development environments
 */
function setupDemoPickup() {
    console.log('Map display fix: Setting up demo pickup');
    
    // Create a mock pickup for demonstration
    const demoPickup = {
        id: 'demo-' + Date.now(),
        status: 'active',
        waste_type: 'Mixed Recyclables',
        quantity: '2 bags',
        bags_count: 2,
        pickup_location: '123 Main St, Anytown',
        coordinates: 'POINT(-122.419416 37.774929)',  // San Francisco
        collector_name: 'John (Demo)',
        collector_coordinates: 'POINT(-122.415 37.772)', // Nearby location
        points_earned: 50,
        created_at: new Date().toISOString()
    };
    
    // Save to localStorage for persistence
    localStorage.setItem('active_pickup_data', JSON.stringify(demoPickup));
    localStorage.removeItem('pickup_cancelled');
    
    // Make the active pickup container visible
    const container = document.getElementById('active-pickup-container');
    if (container) {
        container.style.display = 'block';
        container.setAttribute('aria-hidden', 'false');
    }
    
    // Update the UI with demo data
    updatePickupUI(demoPickup);
    
    // Initialize the map
    setTimeout(initializeMap, 500);
}

/**
 * Update the pickup UI with data
 */
function updatePickupUI(pickup) {
    // Update the collector name
    const collectorEl = document.getElementById('collector-name');
    if (collectorEl) {
        collectorEl.textContent = pickup.collector_name || 'Pending Assignment';
    }
    
    // Update waste type and quantity
    const wasteEl = document.getElementById('waste-type-quantity');
    if (wasteEl) {
        wasteEl.textContent = `${pickup.waste_type} (${pickup.bags_count || 0} bags)`;
    }
    
    // Update pickup location
    const locationEl = document.getElementById('pickup-location');
    if (locationEl) {
        locationEl.textContent = pickup.pickup_location || 'Not specified';
    }
    
    // Update earned points
    const pointsEl = document.getElementById('earned-points');
    if (pointsEl) {
        pointsEl.textContent = pickup.points_earned || '0';
    }
    
    // Update tracking status
    const statusEl = document.getElementById('tracking-status');
    if (statusEl) {
        statusEl.textContent = 'Collector en route';
        statusEl.className = 'badge bg-warning text-dark';
    }
}

// Listen for changes to the active pickup container's visibility
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' &&
            mutation.target.id === 'active-pickup-container') {
            
            const displayStyle = window.getComputedStyle(mutation.target).display;
            if (displayStyle !== 'none') {
                console.log('Map display fix: Active pickup container became visible');
                setTimeout(initializeMap, 300);
            }
        }
    });
});

// Start observing once the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('active-pickup-container');
    if (container) {
        observer.observe(container, { attributes: true });
    }
});
