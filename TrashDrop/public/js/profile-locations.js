/**
 * TrashDrop Profile Locations Management
 * Handles saved locations management functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize map for location selection
    let locationMap = null;
    let locationMarker = null;
    const defaultLocation = [40.7128, -74.0060]; // Default location (NYC)
    
    // Initialize the saved locations
    initLocations();
    
    // Initialize modals
    const addLocationModal = new bootstrap.Modal(document.getElementById('addLocationModal'));
    const deleteLocationModal = new bootstrap.Modal(document.getElementById('deleteLocationModal'));
    
    // Set up event listeners
    document.getElementById('save-location').addEventListener('click', saveLocation);
    document.getElementById('use-my-location').addEventListener('click', useCurrentLocation);
    document.getElementById('confirm-delete-location').addEventListener('click', deleteLocation);
    
    // Listen for add location button
    document.querySelector('[data-bs-target="#addLocationModal"]').addEventListener('click', function() {
        resetLocationForm();
        document.getElementById('addLocationModalLabel').textContent = 'Add New Location';
        
        // Initialize map if not already done
        setTimeout(() => {
            initializeLocationMap();
        }, 300);
    });

    /**
     * Initialize the locations tab functionality
     */
    function initLocations() {
        loadSavedLocations();
        
        // Initialize location form
        const locationForm = document.getElementById('location-form');
        if (locationForm) {
            locationForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveLocation();
            });
        }
    }
    
    /**
     * Load saved locations from storage
     */
    function loadSavedLocations() {
        const locationsList = document.getElementById('saved-locations-list');
        const noLocationsMessage = document.getElementById('no-locations-message');
        
        // Clear existing locations
        locationsList.innerHTML = '';
        
        // Get locations from localStorage
        let savedLocations = [];
        try {
            const locationsData = localStorage.getItem('trash_drop_locations');
            if (locationsData) {
                savedLocations = JSON.parse(locationsData);
            }
        } catch (error) {
            console.error('Error loading saved locations:', error);
        }
        
        // Show/hide no locations message
        if (savedLocations.length === 0) {
            noLocationsMessage.style.display = 'block';
        } else {
            noLocationsMessage.style.display = 'none';
            
            // Render each location
            savedLocations.forEach(location => {
                const locationItem = createLocationItem(location);
                locationsList.appendChild(locationItem);
            });
        }
    }
    
    /**
     * Create a location list item
     * @param {Object} location - The location data
     * @return {HTMLElement} - The location list item
     */
    function createLocationItem(location) {
        const item = document.createElement('div');
        item.className = 'list-group-item list-group-item-action';
        item.dataset.locationId = location.id;
        
        // Determine if this is the default location
        if (location.isDefault) {
            item.classList.add('border-success');
        }
        
        const html = `
            <div class="d-flex w-100 justify-content-between align-items-start">
                <div>
                    <h5 class="mb-1">
                        ${location.name}
                        ${location.isDefault ? '<span class="badge bg-success ms-2">Default</span>' : ''}
                    </h5>
                    <p class="mb-1">${location.address}</p>
                    ${location.notes ? `<small class="text-muted">${location.notes}</small>` : ''}
                </div>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-primary edit-location" data-location-id="${location.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger delete-location" data-location-id="${location.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        item.innerHTML = html;
        
        // Add event listeners to buttons
        item.querySelector('.edit-location').addEventListener('click', function(e) {
            e.stopPropagation();
            editLocation(location.id);
        });
        
        item.querySelector('.delete-location').addEventListener('click', function(e) {
            e.stopPropagation();
            confirmDeleteLocation(location.id);
        });
        
        return item;
    }
    
    /**
     * Initialize the location map
     */
    function initializeLocationMap() {
        // If map already initialized, just reset the view
        if (locationMap) {
            locationMap.setView(defaultLocation, 13);
            if (locationMarker) {
                locationMarker.setLatLng(defaultLocation);
            }
            locationMap.invalidateSize();
            return;
        }
        
        // Create map
        locationMap = L.map('location-map').setView(defaultLocation, 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(locationMap);
        
        // Add marker
        locationMarker = L.marker(defaultLocation, {draggable: true}).addTo(locationMap);
        
        // Update coordinates when marker is dragged
        locationMarker.on('dragend', function(e) {
            const position = locationMarker.getLatLng();
            updateCoordinatesDisplay(position.lat, position.lng);
        });
        
        // Allow clicking on map to set marker
        locationMap.on('click', function(e) {
            locationMarker.setLatLng(e.latlng);
            updateCoordinatesDisplay(e.latlng.lat, e.latlng.lng);
        });
        
        // Ensure map is correctly sized
        setTimeout(() => {
            locationMap.invalidateSize();
        }, 300);
    }
    
    /**
     * Update the coordinates display
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     */
    function updateCoordinatesDisplay(lat, lng) {
        document.getElementById('location-lat').textContent = lat.toFixed(6);
        document.getElementById('location-lng').textContent = lng.toFixed(6);
    }
    
    /**
     * Use current location on the map
     */
    function useCurrentLocation() {
        if (!locationMap) return;
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    locationMap.setView([lat, lng], 15);
                    locationMarker.setLatLng([lat, lng]);
                    updateCoordinatesDisplay(lat, lng);
                    
                    // Try to get address from coordinates using reverse geocoding
                    // This would ideally use a geocoding service, but for this example we'll just use coordinates
                    document.getElementById('location-address').value = `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                },
                function(error) {
                    showToast('Could not get your location: ' + error.message, 'error');
                }
            );
        } else {
            showToast('Geolocation is not supported by your browser', 'error');
        }
    }
    
    /**
     * Reset the location form
     */
    function resetLocationForm() {
        document.getElementById('location-id').value = '';
        document.getElementById('location-name').value = '';
        document.getElementById('location-address').value = '';
        document.getElementById('location-notes').value = '';
        document.getElementById('location-default').checked = false;
        
        // Reset coordinates
        updateCoordinatesDisplay(defaultLocation[0], defaultLocation[1]);
    }
    
    /**
     * Edit an existing location
     * @param {string} locationId - The ID of the location to edit
     */
    function editLocation(locationId) {
        const savedLocations = getSavedLocations();
        const location = savedLocations.find(loc => loc.id === locationId);
        
        if (!location) {
            showToast('Location not found', 'error');
            return;
        }
        
        // Fill the form with location data
        document.getElementById('location-id').value = location.id;
        document.getElementById('location-name').value = location.name;
        document.getElementById('location-address').value = location.address;
        document.getElementById('location-notes').value = location.notes || '';
        document.getElementById('location-default').checked = location.isDefault;
        
        // Update map marker
        setTimeout(() => {
            initializeLocationMap();
            
            if (location.lat && location.lng) {
                const lat = parseFloat(location.lat);
                const lng = parseFloat(location.lng);
                locationMap.setView([lat, lng], 15);
                locationMarker.setLatLng([lat, lng]);
                updateCoordinatesDisplay(lat, lng);
            }
        }, 300);
        
        // Update modal title
        document.getElementById('addLocationModalLabel').textContent = 'Edit Location';
        
        // Show modal
        addLocationModal.show();
    }
    
    /**
     * Save a location
     */
    function saveLocation() {
        // Get form values
        const locationId = document.getElementById('location-id').value;
        const name = document.getElementById('location-name').value.trim();
        const address = document.getElementById('location-address').value.trim();
        const notes = document.getElementById('location-notes').value.trim();
        const isDefault = document.getElementById('location-default').checked;
        
        // Get coordinates
        const lat = document.getElementById('location-lat').textContent;
        const lng = document.getElementById('location-lng').textContent;
        
        // Validate
        if (!name) {
            showToast('Please enter a location name', 'error');
            return;
        }
        
        if (!address) {
            showToast('Please enter an address', 'error');
            return;
        }
        
        // Get saved locations
        let savedLocations = getSavedLocations();
        
        // If default is checked, unset default on all other locations
        if (isDefault) {
            savedLocations = savedLocations.map(loc => ({
                ...loc,
                isDefault: false
            }));
        }
        
        // Create location object
        const location = {
            id: locationId || generateId(),
            name,
            address,
            notes,
            lat,
            lng,
            isDefault,
            createdAt: locationId ? (savedLocations.find(loc => loc.id === locationId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add or update location
        if (locationId) {
            // Update existing location
            savedLocations = savedLocations.map(loc => 
                loc.id === locationId ? location : loc
            );
        } else {
            // Add new location
            savedLocations.push(location);
        }
        
        // Save to localStorage
        localStorage.setItem('trash_drop_locations', JSON.stringify(savedLocations));
        
        // Reload locations
        loadSavedLocations();
        
        // Hide modal
        addLocationModal.hide();
        
        // Show success message
        showToast(locationId ? 'Location updated successfully' : 'Location added successfully', 'success');
    }
    
    /**
     * Confirm deletion of a location
     * @param {string} locationId - The ID of the location to delete
     */
    function confirmDeleteLocation(locationId) {
        const savedLocations = getSavedLocations();
        const location = savedLocations.find(loc => loc.id === locationId);
        
        if (!location) {
            showToast('Location not found', 'error');
            return;
        }
        
        // Set location name in confirmation modal
        document.getElementById('delete-location-name').textContent = location.name;
        
        // Store location ID for deletion
        document.getElementById('confirm-delete-location').dataset.locationId = locationId;
        
        // Show modal
        deleteLocationModal.show();
    }
    
    /**
     * Delete a location
     */
    function deleteLocation() {
        const locationId = document.getElementById('confirm-delete-location').dataset.locationId;
        
        if (!locationId) {
            showToast('No location selected for deletion', 'error');
            return;
        }
        
        // Get saved locations
        let savedLocations = getSavedLocations();
        
        // Filter out the location to delete
        savedLocations = savedLocations.filter(loc => loc.id !== locationId);
        
        // Save to localStorage
        localStorage.setItem('trash_drop_locations', JSON.stringify(savedLocations));
        
        // Reload locations
        loadSavedLocations();
        
        // Hide modal
        deleteLocationModal.hide();
        
        // Show success message
        showToast('Location deleted successfully', 'success');
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
    
    /**
     * Generate a unique ID
     * @return {string} - A unique ID
     */
    function generateId() {
        return 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Show a toast notification
     * @param {string} message - The message to show
     * @param {string} type - The type of toast (success, error, info)
     */
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        
        const toastElement = document.createElement('div');
        toastElement.className = `toast align-items-center border-0 ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info'} text-white`;
        toastElement.setAttribute('role', 'alert');
        toastElement.setAttribute('aria-live', 'assertive');
        toastElement.setAttribute('aria-atomic', 'true');
        
        const toastBody = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastElement.innerHTML = toastBody;
        toastContainer.appendChild(toastElement);
        
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 3000
        });
        
        toast.show();
        
        // Remove toast after it's hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            toastElement.remove();
        });
    }
});
