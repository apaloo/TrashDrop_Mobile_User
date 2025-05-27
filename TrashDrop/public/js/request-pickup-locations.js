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
    const defaultLocation = [40.7128, -74.0060]; // Default location (NYC)
    
    // Load saved locations on page load
    loadSavedLocations();
    initializeMap();
    
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
     * Initialize the map
     */
    function initializeMap() {
        // Create map
        pickupMap = L.map('pickup-map').setView(defaultLocation, 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(pickupMap);
        
        // Add marker
        pickupMarker = L.marker(defaultLocation).addTo(pickupMap);
        
        // Ensure map is correctly sized
        setTimeout(() => {
            pickupMap.invalidateSize();
        }, 300);
    }
    
    /**
     * Load saved locations from localStorage
     */
    function loadSavedLocations() {
        if (!savedLocationSelect) return;
        
        // Clear existing options except the placeholder
        while (savedLocationSelect.options.length > 1) {
            savedLocationSelect.remove(1);
        }
        
        // Get locations from localStorage
        const savedLocations = getSavedLocations();
        
        if (savedLocations.length === 0) {
            // Add a message if no locations are saved
            const noLocationsOption = document.createElement('option');
            noLocationsOption.value = "";
            noLocationsOption.disabled = true;
            noLocationsOption.textContent = "No saved locations - add in Profile";
            savedLocationSelect.appendChild(noLocationsOption);
        } else {
            // Sort locations: default first, then alphabetically
            savedLocations.sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                return a.name.localeCompare(b.name);
            });
            
            // Add options for each location
            savedLocations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name + (location.isDefault ? ' (Default)' : '');
                savedLocationSelect.appendChild(option);
                
                // Select default location if available
                if (location.isDefault) {
                    savedLocationSelect.value = location.id;
                    setLocationOnMap(location.id);
                }
            });
            
            // If no default location, select the first one
            if (!savedLocations.some(loc => loc.isDefault) && savedLocations.length > 0) {
                savedLocationSelect.value = savedLocations[0].id;
                setLocationOnMap(savedLocations[0].id);
            }
        }
    }
    
    /**
     * Set the selected location on the map
     * @param {string} locationId - The ID of the location to display
     */
    function setLocationOnMap(locationId) {
        if (!pickupMap || !pickupMarker) return;
        
        const savedLocations = getSavedLocations();
        const location = savedLocations.find(loc => loc.id === locationId);
        
        if (location && location.lat && location.lng) {
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lng);
            
            // Update map view
            pickupMap.setView([lat, lng], 15);
            pickupMarker.setLatLng([lat, lng]);
            
            // Update hidden inputs
            if (latitudeInput) latitudeInput.value = lat;
            if (longitudeInput) longitudeInput.value = lng;
        }
    }
    
    /**
     * Get saved locations from localStorage
     * @return {Array} - Array of saved locations
     */
    function getSavedLocations() {
        try {
            const locationsData = localStorage.getItem('trash_drop_locations');
            return locationsData ? JSON.parse(locationsData) : [];
        } catch (error) {
            console.error('Error getting saved locations:', error);
            return [];
        }
    }
});
