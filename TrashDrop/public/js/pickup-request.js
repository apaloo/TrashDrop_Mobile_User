/**
 * TrashDrop Pickup Request System
 * Handles one-time pickup requests
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let map;
    let marker;
    const defaultLocation = [40.7128, -74.0060]; // Default to NYC
    
    // Check for offline capability
    const isOfflineCapable = 'serviceWorker' in navigator && 'caches' in window;
    
    // Initialize map with offline capability
    initMap();
    
    // Set up event listeners
    document.getElementById('bags-count').addEventListener('change', updateFee);
    document.getElementById('request-pickup-btn').addEventListener('click', submitPickupRequest);
    document.getElementById('saved-location').addEventListener('change', handleLocationSelect);
    
    // Set up waste type radio buttons to update points
    const wasteTypeRadios = document.querySelectorAll('input[name="waste-type"]');
    wasteTypeRadios.forEach(radio => {
        radio.addEventListener('change', updatePointsReward);
    });
    
    // Set up offline mode indicator
    window.addEventListener('online', updateOfflineIndicator);
    window.addEventListener('offline', updateOfflineIndicator);
    updateOfflineIndicator();
    
    // Set up reconnect button
    const reconnectBtn = document.getElementById('try-reconnect');
    if (reconnectBtn) {
        reconnectBtn.addEventListener('click', () => {
            updateOfflineIndicator();
            if (navigator.onLine) {
                window.location.reload();
            }
        });
    }
    
    // Load saved locations for dropdown
    loadSavedLocations();
    
    /**
     * Initialize the map with offline capability
     */
    function initMap() {
        // Use the OfflineMap module if available, otherwise fall back to standard Leaflet
        if (typeof OfflineMap !== 'undefined') {
            // Create map with offline capability
            map = OfflineMap.createMap('pickup-map', {
                center: defaultLocation,
                zoom: 13,
                cacheRadius: 2, // Cache 2km radius around center
                cacheOnMovement: true
            });
            
            // Add a marker at the default location
            marker = OfflineMap.addMarker('pickup-map', defaultLocation, {draggable: true});
        } else {
            // Fall back to standard Leaflet initialization
            map = L.map('pickup-map').setView(defaultLocation, 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            // Add a marker at the default location
            marker = L.marker(defaultLocation, {draggable: true}).addTo(map);
        }
        
        // Update coordinates when marker is dragged
        marker.on('dragend', function(event) {
            const position = marker.getLatLng();
            updateCoordinateInputs(position.lat, position.lng);
        });
        
        // Update marker when map is clicked
        map.on('click', function(e) {
            const position = e.latlng;
            marker.setLatLng(position);
            updateCoordinateInputs(position.lat, position.lng);
        });
        
        // Set initial coordinate values
        updateCoordinateInputs(defaultLocation[0], defaultLocation[1]);
    }
    
    /**
     * Update the offline mode indicator
     */
    function updateOfflineIndicator() {
        const offlineAlert = document.getElementById('offline-alert');
        const connectionStatus = document.getElementById('connection-status');
        
        if (navigator.onLine) {
            if (offlineAlert) offlineAlert.classList.add('d-none');
            if (connectionStatus) {
                connectionStatus.textContent = 'Online';
                connectionStatus.classList.remove('text-bg-danger');
                connectionStatus.classList.add('text-bg-success');
            }
        } else {
            if (offlineAlert) offlineAlert.classList.remove('d-none');
            if (connectionStatus) {
                connectionStatus.textContent = 'Offline';
                connectionStatus.classList.remove('text-bg-success');
                connectionStatus.classList.add('text-bg-danger');
            }
        }
        
        // Update badge counter if we have pending pickup requests
        if (window.PickupRequestSync) {
            window.PickupRequestSync.updateOfflineIndicator();
        }
    
    /**
     * Handle the selection of a saved location
     */
    function handleLocationSelect(e) {
        const locationId = e.target.value;
        if (!locationId) return;
        
        const selectedLocation = savedLocations.find(loc => loc.id === locationId);
        if (!selectedLocation) return;
        
        // Update map with the selected location's coordinates
        const coordinates = parseCoordinates(selectedLocation.coordinates);
        if (coordinates) {
            map.setView([coordinates.latitude, coordinates.longitude], 15);
            marker.setLatLng([coordinates.latitude, coordinates.longitude]);
            updateCoordinateInputs(coordinates.latitude, coordinates.longitude);
        }
    }
    
    /**
     * Update the coordinate input fields
     */
    function updateCoordinateInputs(lat, lng) {
        document.getElementById('latitude').value = lat.toFixed(6);
        document.getElementById('longitude').value = lng.toFixed(6);
    }
    
    /**
     * Update the fee based on number of bags
     */
    function updateFee() {
        const bagsCount = parseInt(document.getElementById('bags-count').value);
        const baseFee = 5;
        const fee = baseFee + (bagsCount - 1); // $1 extra per additional bag
        
        document.getElementById('fee-amount').textContent = fee;
        
        // Also update points display when fee changes
        updatePointsReward();
    }
    
    /**
     * Update the points reward based on waste type
     */
    function updatePointsReward() {
        const wasteType = document.querySelector('input[name="waste-type"]:checked').value;
        const pointsRewardElement = document.getElementById('points-reward');
        const pointsAmountElement = document.getElementById('points-amount');
        
        let points = 0;
        
        // Assign points based on waste type
        if (wasteType === 'recycling') {
            points = 5;
        } else if (wasteType === 'plastic') {
            points = 10;
        }
        
        // Update the UI
        if (points > 0) {
            pointsAmountElement.textContent = points;
            pointsRewardElement.style.display = 'block';
        } else {
            pointsRewardElement.style.display = 'none';
        }
    }
    
    /**
     * Load saved locations from API and populate the dropdown
     */
    async function loadSavedLocations() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                return;
            }
            
            // Try to get locations from IndexedDB first when offline
            if (!navigator.onLine && typeof getLocationsFromIndexedDB === 'function') {
                const offlineLocations = await getLocationsFromIndexedDB();
                if (offlineLocations && offlineLocations.length > 0) {
                    savedLocations = offlineLocations;
                    populateSavedLocationsDropdown();
                    return;
                }
            }
            
            const response = await fetch('/api/locations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch locations');
            }
            
            const data = await response.json();
            savedLocations = data.locations || [];
            
            // Populate the saved locations dropdown
            populateSavedLocationsDropdown();
            
            // If no saved locations, show a message and disable the form
            if (savedLocations.length === 0) {
                alert('You need to add saved locations before requesting a pickup. Redirecting to locations page...');
                setTimeout(() => {
                    window.location.href = '/locations';
                }, 1500);
            }
        } catch (error) {
            console.error('Error loading saved locations:', error);
            savedLocations = [];
        }
    }
    
    /**
     * Populate the saved locations dropdown
     */
    function populateSavedLocationsDropdown() {
        const dropdown = document.getElementById('saved-location');
        
        // Clear any existing options (except the first placeholder)
        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }
        
        // Add the saved locations to the dropdown
        if (savedLocations && savedLocations.length > 0) {
            savedLocations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.id;
                option.textContent = `${loc.name}: ${loc.address}`;
                dropdown.appendChild(option);
            });
            
            // If there's at least one location, select it and update the map
            if (savedLocations.length > 0) {
                dropdown.selectedIndex = 1; // Select the first location after the placeholder
                
                // Trigger the change event to update the map
                const event = new Event('change');
                dropdown.dispatchEvent(event);
            }
        }
    }
    

    
    /**
     * Parse coordinates from Supabase geography format
     */
    function parseCoordinates(coordinatesString) {
        try {
            // Handle POINT format: 'POINT(longitude latitude)'
            const match = coordinatesString.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
            if (match) {
                return {
                    longitude: parseFloat(match[1]),
                    latitude: parseFloat(match[2])
                };
            }
            return null;
        } catch (error) {
            console.error('Error parsing coordinates:', error);
            return null;
        }
    }
    
    /**
     * Fetch address from coordinates using OpenStreetMap Nominatim
     */
    async function fetchAddressFromCoordinates(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (!response.ok) {
                throw new Error('Failed to fetch address');
            }
            
            const data = await response.json();
            if (data && data.display_name) {
                return data.display_name;
            }
            return null;
        } catch (error) {
            console.error('Error in reverse geocoding:', error);
            return null;
        }
    }
    
    /**
     * Submit the pickup request
     */
    async function submitPickupRequest() {
        // Get the submit button reference
        const submitButton = document.getElementById('request-pickup-btn');
        
        try {
            // Basic validation - get form values and validate
            const locationSelect = document.getElementById('saved-location');
            if (!locationSelect || !locationSelect.value) {
                alert('Please select a pickup location');
                return;
            }
            
            const locationId = locationSelect.value;
            const locationText = locationSelect.options[locationSelect.selectedIndex].text;
            
            // Get coordinates
            const latitude = parseFloat(document.getElementById('latitude').value);
            const longitude = parseFloat(document.getElementById('longitude').value);
            if (isNaN(latitude) || isNaN(longitude)) {
                alert('Invalid coordinates. Please select a location on the map.');
                return;
            }
            
            // Get other form values
            const bagsCount = parseInt(document.getElementById('bags-count').value) || 1;
            const wasteTypeEl = document.querySelector('input[name="waste-type"]:checked');
            if (!wasteTypeEl) {
                alert('Please select a waste type');
                return;
            }
            const wasteType = wasteTypeEl.value;
            const notes = document.getElementById('notes')?.value || '';
            
            // Disable submit button to prevent multiple submissions
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            }
            
            // Calculate points based on waste type
            let points = 0;
            if (wasteType === 'recycling') {
                points = 5;
            } else if (wasteType === 'plastic') {
                points = 10;
            }
            
            // Create a mock pickup request for the dashboard
            const mockPickupData = {
                id: 'pickup-' + Date.now(),
                status: 'pending',
                location: locationText,
                coordinates: `POINT(${longitude} ${latitude})`,
                waste_type: wasteType,
                bags_count: bagsCount,
                points: points,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Store in localStorage for persistence (for dashboard display)
            localStorage.setItem('active_pickup_data', JSON.stringify(mockPickupData));
            localStorage.setItem('pickup_requested_at', new Date().toISOString());
            localStorage.setItem('force_show_active_pickup', 'true');
            
            // Add a small delay to simulate server communication
            console.log('Processing pickup request...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Show success message
            alert('Pickup request submitted successfully! You will be notified when a collector accepts your request.');
            
            // Redirect to dashboard
            window.location.href = '/dashboard?newRequest=true';
            
        } catch (error) {
            // Handle errors
            console.error('Error submitting pickup request:', error);
            alert('Error: ' + (error.message || 'Failed to submit pickup request. Please try again.'));
            
            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Request Pickup';
            }
        }
    }
    
    // Global variable to store saved locations
    let savedLocations = [];
});
