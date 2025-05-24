/**
 * Location Management System
 * Handles the frontend functionality for managing user locations and displaying disposal centers
 * Integrated with offline capabilities
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize offline sync functionality
    window.TrashDropOfflineSync.initOfflineSyncListeners();
    // Initialize variables
    let mainMap;
    let addLocationMap;
    let editLocationMap;
    let userMarker;
    let addLocationMarker;
    let editLocationMarker;
    let userLocations = [];
    let disposalCenters = [];
    let markers = [];
    
    // DOM elements
    const locationsList = document.getElementById('locations-list');
    const disposalCentersList = document.getElementById('disposal-centers-list');
    const noLocations = document.getElementById('no-locations');
    const noDisposalCenters = document.getElementById('no-disposal-centers');
    const savedLocationsCount = document.getElementById('saved-locations-count');
    const disposalCentersCount = document.getElementById('disposal-centers-count');
    
    // Check if user is authenticated
    checkAuthentication().then(() => {
        // Initialize maps
        initializeMainMap();
        initializeAddLocationMap();
        initializeEditLocationMap();
        
        // Load data
        loadUserLocations();
        loadDisposalCenters();
        
        // Set up event listeners
        setupEventListeners();
    });
    
    /**
     * Initialize the main map display
     */
    function initializeMainMap() {
        mainMap = L.map('location-map').setView([40.7128, -74.0060], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mainMap);
        
        // Add user's current location marker if available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                
                if (!userMarker) {
                    userMarker = L.marker(userLocation, {
                        icon: L.divIcon({
                            className: 'current-location-marker',
                            html: '<div class="pulse"></div>',
                            iconSize: [20, 20]
                        })
                    }).addTo(mainMap);
                    userMarker.bindPopup('Your current location').openPopup();
                } else {
                    userMarker.setLatLng(userLocation);
                }
                
                mainMap.setView(userLocation, 12);
            });
        }
    }
    
    /**
     * Initialize the map for adding a new location
     */
    function initializeAddLocationMap() {
        addLocationMap = L.map('add-location-map').setView([40.7128, -74.0060], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(addLocationMap);
        
        // Set up geocoder
        const geocoder = L.Control.geocoder({
            defaultMarkGeocode: false
        }).on('markgeocode', function(event) {
            const { center, name } = event.geocode;
            
            if (addLocationMarker) {
                addLocationMarker.setLatLng(center);
            } else {
                addLocationMarker = L.marker(center).addTo(addLocationMap);
            }
            
            document.getElementById('location-address').value = name;
            document.getElementById('location-coordinates').value = JSON.stringify({
                lat: center.lat,
                lng: center.lng
            });
            
            addLocationMap.setView(center, 16);
        }).addTo(addLocationMap);
        
        // Allow clicking on map to set location
        addLocationMap.on('click', function(event) {
            const { lat, lng } = event.latlng;
            
            if (addLocationMarker) {
                addLocationMarker.setLatLng([lat, lng]);
            } else {
                addLocationMarker = L.marker([lat, lng]).addTo(addLocationMap);
            }
            
            document.getElementById('location-coordinates').value = JSON.stringify({
                lat: lat,
                lng: lng
            });
            
            // Try to get address from coordinates
            reverseGeocode(lat, lng, (address) => {
                if (address) {
                    document.getElementById('location-address').value = address;
                }
            });
        });
        
        // Initialize with user's current location if available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                addLocationMap.setView(userLocation, 14);
                
                // Set initial marker
                addLocationMarker = L.marker(userLocation).addTo(addLocationMap);
                
                // Set initial coordinates
                document.getElementById('location-coordinates').value = JSON.stringify({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                
                // Try to get address from coordinates
                reverseGeocode(position.coords.latitude, position.coords.longitude, (address) => {
                    if (address) {
                        document.getElementById('location-address').value = address;
                    }
                });
            });
        }
    }
    
    /**
     * Initialize the map for editing a location
     */
    function initializeEditLocationMap() {
        editLocationMap = L.map('edit-location-map').setView([40.7128, -74.0060], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(editLocationMap);
        
        // Set up geocoder
        const geocoder = L.Control.geocoder({
            defaultMarkGeocode: false
        }).on('markgeocode', function(event) {
            const { center, name } = event.geocode;
            
            if (editLocationMarker) {
                editLocationMarker.setLatLng(center);
            } else {
                editLocationMarker = L.marker(center).addTo(editLocationMap);
            }
            
            document.getElementById('edit-location-address').value = name;
            document.getElementById('edit-location-coordinates').value = JSON.stringify({
                lat: center.lat,
                lng: center.lng
            });
            
            editLocationMap.setView(center, 16);
        }).addTo(editLocationMap);
        
        // Allow clicking on map to set location
        editLocationMap.on('click', function(event) {
            const { lat, lng } = event.latlng;
            
            if (editLocationMarker) {
                editLocationMarker.setLatLng([lat, lng]);
            } else {
                editLocationMarker = L.marker([lat, lng]).addTo(editLocationMap);
            }
            
            document.getElementById('edit-location-coordinates').value = JSON.stringify({
                lat: lat,
                lng: lng
            });
            
            // Try to get address from coordinates
            reverseGeocode(lat, lng, (address) => {
                if (address) {
                    document.getElementById('edit-location-address').value = address;
                }
            });
        });
    }
    
    /**
     * Set up all event listeners for the page
     */
    function setupEventListeners() {
        // Set up photo upload buttons
        document.getElementById('location-photo-upload').addEventListener('change', handlePhotoUpload);
        document.getElementById('edit-location-photo-upload').addEventListener('change', handlePhotoUpload);
        
        // Set up sync button
        document.getElementById('sync-offline-data').addEventListener('click', syncOfflineData);
        // Save location button
        document.getElementById('save-location-btn').addEventListener('click', saveLocation);
        
        // Update location button
        document.getElementById('update-location-btn').addEventListener('click', updateLocation);
        
        // Delete location button
        document.getElementById('delete-location-btn').addEventListener('click', function() {
            const locationId = document.getElementById('edit-location-id').value;
            const locationName = document.getElementById('edit-location-name').value;
            
            // Set the values in the delete confirmation modal
            document.getElementById('delete-location-id').value = locationId;
            document.getElementById('delete-location-name').textContent = locationName;
            
            // Close the edit modal and open the delete confirmation modal
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editLocationModal'));
            editModal.hide();
            
            const deleteModal = new bootstrap.Modal(document.getElementById('deleteLocationModal'));
            deleteModal.show();
        });
        
        // Confirm delete button
        document.getElementById('confirm-delete-location-btn').addEventListener('click', deleteLocation);
        
        // Reset add location form when modal is opened
        document.getElementById('addLocationModal').addEventListener('show.bs.modal', function() {
            document.getElementById('add-location-form').reset();
            
            // Reset the map if we have a marker
            if (addLocationMarker) {
                addLocationMap.removeLayer(addLocationMarker);
                addLocationMarker = null;
            }
            
            // Reset validation classes
            const form = document.getElementById('add-location-form');
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.classList.remove('is-invalid');
            });
            
            // Center map on user's location if available
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const userLocation = [position.coords.latitude, position.coords.longitude];
                    addLocationMap.setView(userLocation, 14);
                });
            }
        });
        
        // Invalidate maps when modals are shown (fix Leaflet display issue)
        document.getElementById('addLocationModal').addEventListener('shown.bs.modal', function() {
            addLocationMap.invalidateSize();
        });
        
        document.getElementById('editLocationModal').addEventListener('shown.bs.modal', function() {
            editLocationMap.invalidateSize();
        });
    }
    
    /**
     * Load user's saved locations using offline sync capabilities
     */
    async function loadUserLocations() {
        try {
            // Show loading indicator
            document.getElementById('loading-locations').style.display = 'block';
            locationsList.style.display = 'none';
            noLocations.style.display = 'none';
            
            // Get user ID from the authentication system
            let userId;
            try {
                // Try to get user from auth system first
                const user = await AuthManager.getCurrentUser();
                userId = user?.id;
                
                // If no user found, try legacy storage as fallback
                if (!userId) {
                    userId = localStorage.getItem('user_id');
                }
                
                // Still no user ID? Create a default one for development
                if (!userId && AuthManager.isDev()) {
                    console.log('Creating default development user ID');
                    userId = 'dev-user-' + Date.now();
                }
                
                if (!userId) {
                    throw new Error('No user ID available');
                }
            } catch (error) {
                console.error('Error getting user ID:', error);
                // Default to a dev user ID as last resort
                userId = 'dev-user-' + Date.now();
            }
            
            // Load locations using offline sync (combines server and local data)
            const result = await window.TrashDropOfflineSync.loadLocations(userId);
            
            // Hide loading indicator
            document.getElementById('loading-locations').style.display = 'none';
            
            if (result.success) {
                userLocations = result.data;
                
                // Update locations count
                savedLocationsCount.textContent = userLocations.length;
                
                // Show/hide the no locations message
                if (userLocations.length === 0) {
                    noLocations.style.display = 'block';
                    locationsList.style.display = 'none';
                } else {
                    noLocations.style.display = 'none';
                    locationsList.style.display = 'block';
                    
                    // Render the locations
                    renderUserLocations();
                    
                    // Add locations to main map
                    addLocationsToMap();
                }
                
                // Update pending sync count if offline
                if (result.offline) {
                    updatePendingSyncCount();
                }
            } else {
                console.error('Failed to load locations:', result.error);
                showToast('Error', 'Failed to load your saved locations. Please try again.', 'danger');
                
                // Show no locations message if there was an error
                noLocations.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading user locations:', error);
            showToast('Error', 'An error occurred while loading your locations.', 'danger');
            
            // Hide loading indicator
            document.getElementById('loading-locations').style.display = 'none';
            
            // Show no locations message if there was an error
            noLocations.style.display = 'block';
        }
    }
    
    /**
     * Update the pending sync count badge
     */
    async function updatePendingSyncCount() {
        try {
            const pendingSyncItems = await window.TrashDropOfflineSync.getPendingSyncCount();
            const pendingSyncCountElement = document.getElementById('pending-sync-count');
            
            if (pendingSyncItems > 0) {
                pendingSyncCountElement.textContent = pendingSyncItems;
                pendingSyncCountElement.style.display = 'inline-block';
            } else {
                pendingSyncCountElement.style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating pending sync count:', error);
        }
    }
    
    /**
     * Load disposal centers from the API
     */
    async function loadDisposalCenters() {
        try {
            const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
            const response = await fetch(`${baseUrl}/api/locations/disposal-centers`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                disposalCenters = data.data;
                
                // Update disposal centers count
                disposalCentersCount.textContent = disposalCenters.length;
                
                // Show/hide the no disposal centers message
                if (disposalCenters.length === 0) {
                    noDisposalCenters.style.display = 'block';
                    disposalCentersList.style.display = 'none';
                } else {
                    noDisposalCenters.style.display = 'none';
                    disposalCentersList.style.display = 'block';
                    
                    // Render the disposal centers
                    renderDisposalCenters();
                    
                    // Add disposal centers to main map
                    addDisposalCentersToMap();
                }
            } else {
                console.error('Failed to load disposal centers:', data.message);
                showToast('Error', 'Failed to load disposal centers. Please try again.', 'danger');
            }
        } catch (error) {
            console.error('Error loading disposal centers:', error);
            showToast('Error', 'An error occurred while loading disposal centers.', 'danger');
        }
    }
    
    /**
     * Render user locations in the locations list
     */
    function renderUserLocations() {
        // Clear the existing locations
        locationsList.innerHTML = '';
        
        // Sort locations: default first, then alphabetically
        userLocations.sort((a, b) => {
            if (a.is_default && !b.is_default) return -1;
            if (!a.is_default && b.is_default) return 1;
            return a.location_name.localeCompare(b.location_name);
        });
        
        // Add each location to the list
        userLocations.forEach(location => {
            // Create the location card
            const locationCard = document.createElement('div');
            locationCard.className = 'card mb-3 location-card';
            if (location.is_default) {
                locationCard.classList.add('default-location');
            }
            
            // Check if location is pending sync (stored locally)
            if (location.pending_sync) {
                locationCard.classList.add('pending-sync');
            }
            
            // Format the coordinates for display
            const coordinates = parseCoordinates(location.coordinates);
            
            // Create the card body
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            
            // Create the location header with name and type
            const locationHeader = document.createElement('div');
            locationHeader.className = 'd-flex justify-content-between align-items-center mb-2';
            
            const locationName = document.createElement('h5');
            locationName.className = 'card-title mb-0';
            locationName.textContent = location.location_name;
            
            const locationType = document.createElement('span');
            locationType.className = 'badge bg-secondary';
            locationType.textContent = location.location_type.charAt(0).toUpperCase() + location.location_type.slice(1);
            
            locationHeader.appendChild(locationName);
            locationHeader.appendChild(locationType);
            
            // Create the address display
            const addressDiv = document.createElement('div');
            addressDiv.className = 'mb-2';
            
            const addressIcon = document.createElement('i');
            addressIcon.className = 'fas fa-map-marker-alt me-2 text-primary';
            
            const addressText = document.createElement('span');
            addressText.textContent = location.address;
            
            addressDiv.appendChild(addressIcon);
            addressDiv.appendChild(addressText);
            
            // Create the coordinates display
            const coordinatesDiv = document.createElement('div');
            coordinatesDiv.className = 'small text-muted mb-3';
            coordinatesDiv.textContent = `Coordinates: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
            
            // Add all elements to the card body
            cardBody.appendChild(locationHeader);
            cardBody.appendChild(addressDiv);
            cardBody.appendChild(coordinatesDiv);
            
            // Create the default location badge if applicable
            if (location.is_default) {
                const defaultBadge = document.createElement('div');
                defaultBadge.className = 'mb-3';
                
                const badge = document.createElement('span');
                badge.className = 'badge bg-success';
                badge.innerHTML = '<i class="fas fa-star me-1"></i> Default Location';
                
                defaultBadge.appendChild(badge);
                cardBody.appendChild(defaultBadge);
            }
            
            // Add notes if available
            if (location.notes) {
                const notesDiv = document.createElement('div');
                notesDiv.className = 'mb-2';
                
                const notesLabel = document.createElement('strong');
                notesLabel.className = 'me-2';
                notesLabel.textContent = 'Notes:';
                
                const notesText = document.createElement('span');
                notesText.textContent = location.notes;
                
                notesDiv.appendChild(notesLabel);
                notesDiv.appendChild(notesText);
                
                cardBody.appendChild(notesDiv);
            }
            
            // Add pickup instructions if available
            if (location.pickup_instructions) {
                const instructionsDiv = document.createElement('div');
                instructionsDiv.className = 'mb-2';
                
                const instructionsLabel = document.createElement('strong');
                instructionsLabel.className = 'me-2';
                instructionsLabel.textContent = 'Pickup Instructions:';
                
                const instructionsText = document.createElement('span');
                instructionsText.textContent = location.pickup_instructions;
                
                instructionsDiv.appendChild(instructionsLabel);
                instructionsDiv.appendChild(instructionsText);
                
                cardBody.appendChild(instructionsDiv);
            }
            
            // Add last pickup date if available
            if (location.last_pickup_date) {
                const pickupDateDiv = document.createElement('div');
                pickupDateDiv.className = 'mb-2';
                
                const pickupDateLabel = document.createElement('strong');
                pickupDateLabel.className = 'me-2';
                pickupDateLabel.textContent = 'Last Pickup:';
                
                const pickupDateText = document.createElement('span');
                pickupDateText.textContent = new Date(location.last_pickup_date).toLocaleDateString();
                
                pickupDateDiv.appendChild(pickupDateLabel);
                pickupDateDiv.appendChild(pickupDateText);
                
                cardBody.appendChild(pickupDateDiv);
            }
            
            // Add photo if available
            if (location.photo_url) {
                const photoDiv = document.createElement('div');
                photoDiv.className = 'mb-3 mt-2';
                
                const photo = document.createElement('img');
                photo.className = 'location-photo img-thumbnail';
                photo.src = location.photo_url;
                photo.alt = `Photo of ${location.location_name}`;
                photo.style.maxWidth = '100%';
                photo.style.maxHeight = '150px';
                
                photoDiv.appendChild(photo);
                cardBody.appendChild(photoDiv);
            }
            
            // Add pending sync indicator if applicable
            if (location.pending_sync) {
                const pendingSyncDiv = document.createElement('div');
                pendingSyncDiv.className = 'mb-2';
                
                const pendingSyncBadge = document.createElement('span');
                pendingSyncBadge.className = 'badge bg-warning';
                pendingSyncBadge.innerHTML = '<i class="fas fa-sync me-1"></i> Pending Sync';
                
                pendingSyncDiv.appendChild(pendingSyncBadge);
                cardBody.appendChild(pendingSyncDiv);
            }
            
            // Create the actions buttons
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'd-flex justify-content-end mt-2';
            
            // Edit button
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-outline-primary me-2';
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.setAttribute('data-bs-toggle', 'tooltip');
            editButton.setAttribute('data-bs-placement', 'top');
            editButton.setAttribute('title', 'Edit');
            editButton.addEventListener('click', () => openEditLocationModal(location.id));
            
            // Set as default button (if not already default)
            if (!location.is_default) {
                const setDefaultButton = document.createElement('button');
                setDefaultButton.className = 'btn btn-sm btn-outline-success me-2';
                setDefaultButton.innerHTML = '<i class="fas fa-star"></i>';
                setDefaultButton.setAttribute('data-bs-toggle', 'tooltip');
                setDefaultButton.setAttribute('data-bs-placement', 'top');
                setDefaultButton.setAttribute('title', 'Set as Default');
                setDefaultButton.addEventListener('click', () => setDefaultLocation(location.id));
                
                actionsDiv.appendChild(setDefaultButton);
            }
            
            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.setAttribute('data-bs-toggle', 'tooltip');
            deleteButton.setAttribute('data-bs-placement', 'top');
            deleteButton.setAttribute('title', 'Delete');
            deleteButton.addEventListener('click', () => {
                // Set the location ID in the delete modal
                document.getElementById('delete-location-id').value = location.id;
                document.getElementById('delete-location-name').textContent = location.location_name;
                
                // Show the modal
                const deleteModal = new bootstrap.Modal(document.getElementById('deleteLocationModal'));
                deleteModal.show();
            });
            
            actionsDiv.appendChild(editButton);
            actionsDiv.appendChild(deleteButton);
            
            // Add actions to the card body
            cardBody.appendChild(actionsDiv);
            
            // Add the card body to the card
            locationCard.appendChild(cardBody);
            
            // Add the card to the locations list
            locationsList.appendChild(locationCard);
            
            // Initialize tooltips
            const tooltips = [editButton, deleteButton];
            if (!location.is_default) {
                tooltips.push(actionsDiv.querySelector('.btn-outline-success'));
            }
            
            tooltips.forEach(el => {
                new bootstrap.Tooltip(el);
            });
        });
    }
    
    /**
     * Render disposal centers in the list
     */
    function renderDisposalCenters() {
        disposalCentersList.innerHTML = '';
        
        disposalCenters.forEach(center => {
            const centerItem = document.createElement('li');
            centerItem.className = 'list-group-item px-3 py-3';
            
            centerItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="d-flex align-items-center">
                        <div class="location-icon bg-info bg-opacity-10 text-info rounded-circle p-2 me-3">
                            <i class="bi bi-trash"></i>
                        </div>
                        <div>
                            <h6 class="mb-1 fw-bold">${center.name}</h6>
                            <p class="mb-0 text-muted small">${center.address}</p>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline-info btn-sm" data-action="view-center" data-id="${center.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            `;
            
            disposalCentersList.appendChild(centerItem);
        });
        
        // Add event listeners to the view buttons
        document.querySelectorAll('[data-action="view-center"]').forEach(button => {
            button.addEventListener('click', () => {
                const centerId = button.getAttribute('data-id');
                const center = disposalCenters.find(c => c.id === centerId);
                
                if (center) {
                    const coordinates = parseCoordinates(center.coordinates);
                    mainMap.setView([coordinates.lat, coordinates.lng], 16);
                    
                    // Find and open the marker popup
                    markers.forEach(marker => {
                        if (marker.centerId === centerId) {
                            marker.openPopup();
                        }
                    });
                }
            });
        });
    }
    
    /**
     * Add user locations to the main map
     */
    function addLocationsToMap() {
        // Clear existing location markers
        markers.forEach(marker => {
            if (marker.type === 'location') {
                mainMap.removeLayer(marker);
            }
        });
        
        markers = markers.filter(marker => marker.type !== 'location');
        
        // Add new markers
        userLocations.forEach(location => {
            const coordinates = parseCoordinates(location.coordinates);
            
            // Choose the right icon based on location type
            let iconClass;
            let iconColor;
            
            switch(location.location_type) {
                case 'home':
                    iconClass = 'fa-home';
                    iconColor = 'success';
                    break;
                case 'work':
                    iconClass = 'fa-building';
                    iconColor = 'primary';
                    break;
                case 'school':
                    iconClass = 'fa-graduation-cap';
                    iconColor = 'info';
                    break;
                default:
                    iconClass = 'fa-map-marker-alt';
                    iconColor = 'danger';
            }
            
            // Create a custom icon with the right class and color
            const markerHtml = `<div class="marker-icon bg-${iconColor}"><i class="fas ${iconClass}"></i></div>`;
            
            const marker = L.marker([coordinates.lat, coordinates.lng], {
                icon: L.divIcon({
                    className: `location-marker ${location.location_type}-marker`,
                    html: markerHtml,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                })
            }).addTo(mainMap);
            
            // Store the location ID and type on the marker
            marker.locationId = location.id;
            marker.type = 'location';
            
            // Create popup content with all available information
            let popupContent = `
                <div class="location-popup">
                    <h6 class="mb-2">${location.location_name}</h6>
                    <p class="mb-2"><i class="fas fa-map-marker-alt me-2 text-primary"></i>${location.address}</p>
            `;
            
            // Add default badge if applicable
            if (location.is_default) {
                popupContent += `<p class="mb-2"><span class="badge bg-success"><i class="fas fa-star me-1"></i> Default Location</span></p>`;
            }
            
            // Add notes if available
            if (location.notes) {
                popupContent += `<p class="mb-2"><strong>Notes:</strong> ${location.notes}</p>`;
            }
            
            // Add pickup instructions if available
            if (location.pickup_instructions) {
                popupContent += `<p class="mb-2"><strong>Pickup Instructions:</strong> ${location.pickup_instructions}</p>`;
            }
            
            // Add last pickup date if available
            if (location.last_pickup_date) {
                const date = new Date(location.last_pickup_date).toLocaleDateString();
                popupContent += `<p class="mb-2"><strong>Last Pickup:</strong> ${date}</p>`;
            }
            
            // Add photo if available
            if (location.photo_url) {
                popupContent += `<img src="${location.photo_url}" alt="Location Photo" class="img-fluid mt-2 mb-2" style="max-height: 100px;">`;
            }
            
            // Add pending sync indicator if applicable
            if (location.pending_sync) {
                popupContent += `<p class="mb-2"><span class="badge bg-warning"><i class="fas fa-sync me-1"></i> Pending Sync</span></p>`;
            }
            
            // Close the popup div
            popupContent += `</div>`;
            
            // Bind the popup to the marker
            marker.bindPopup(popupContent);
            
            // Add the marker to our markers array
            markers.push(marker);
        });
        
        // Center map on default location or first location
        const defaultLocation = userLocations.find(loc => loc.is_default);
        const locationToCenter = defaultLocation || (userLocations.length > 0 ? userLocations[0] : null);
        
        if (locationToCenter) {
            const coordinates = parseCoordinates(locationToCenter.coordinates);
            mainMap.setView([coordinates.lat, coordinates.lng], 12);
        }
    }
    
    /**
     * Add disposal centers to the main map
     */
    function addDisposalCentersToMap() {
        // Clear existing disposal center markers
        markers.forEach(marker => {
            if (marker.type === 'center') {
                mainMap.removeLayer(marker);
            }
        });
        
        markers = markers.filter(marker => marker.type !== 'center');
        
        // Add new markers
        disposalCenters.forEach(center => {
            const coordinates = parseCoordinates(center.coordinates);
            
            const marker = L.marker([coordinates.lat, coordinates.lng], {
                icon: L.divIcon({
                    className: 'disposal-center-marker',
                    html: '<i class="bi bi-trash"></i>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                })
            }).addTo(mainMap);
            
            marker.centerId = center.id;
            marker.type = 'center';
            
            marker.bindPopup(`
                <div class="center-popup">
                    <h6>${center.name}</h6>
                    <p>${center.address}</p>
                </div>
            `);
            
            markers.push(marker);
        });
    }
    
    /**
     * Save a new location with offline sync support
     */
    async function saveLocation() {
        try {
            // Get form values
            const locationName = document.getElementById('location-name').value.trim();
            const address = document.getElementById('location-address').value.trim();
            const locationType = document.getElementById('location-type').value;
            const isDefault = document.getElementById('is-default-location').checked;
            const coordinatesJson = document.getElementById('location-coordinates').value;
            const notes = document.getElementById('location-notes').value.trim();
            const pickupInstructions = document.getElementById('location-pickup-instructions').value.trim();
            
            // Get photo data if available
            let photoData = null;
            const photoPreview = document.getElementById('photo-preview');
            if (!photoPreview.classList.contains('d-none')) {
                const photoImg = document.getElementById('photo-preview-image');
                if (photoImg.src && photoImg.src.startsWith('data:image')) {
                    photoData = photoImg.src.split(',')[1]; // Get base64 data without the prefix
                }
            }
            
            // Validate form
            let isValid = true;
            
            if (!locationName) {
                document.getElementById('location-name').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('location-name').classList.remove('is-invalid');
            }
            
            if (!address) {
                document.getElementById('location-address').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('location-address').classList.remove('is-invalid');
            }
            
            if (!coordinatesJson) {
                document.getElementById('coordinates-feedback').style.display = 'block';
                isValid = false;
            } else {
                document.getElementById('coordinates-feedback').style.display = 'none';
            }
            
            if (!isValid) {
                return;
            }
            
            // Parse coordinates
            const coordinates = JSON.parse(coordinatesJson);
            
            // Prepare the data
            const locationData = {
                location_name: locationName,
                address,
                location_type: locationType,
                is_default: isDefault,
                coordinates: `POINT(${coordinates.lng} ${coordinates.lat})`,
                notes: notes || null,
                pickup_instructions: pickupInstructions || null,
                photo_data: photoData
            };
            
            // Get user ID from localStorage
            const userId = localStorage.getItem('user_id');
            
            // Use offline sync to add the location
            const result = await window.TrashDropOfflineSync.addLocation(locationData, userId);
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addLocationModal'));
            modal.hide();
            
            if (result.success) {
                // Show appropriate success message based on offline status
                if (result.offline) {
                    showToast('Success', 'Location saved locally. Will sync when online.', 'warning');
                } else {
                    showToast('Success', 'Location added successfully!', 'success');
                }
                
                // Update the pending sync count if offline
                if (result.offline) {
                    updatePendingSyncCount();
                }
                
                // Reload locations
                loadUserLocations();
            } else {
                console.error('Failed to add location:', result.error);
                showToast('Error', result.error || 'Failed to add location. Please try again.', 'danger');
            }
            
            // Reset form
            resetAddLocationForm();
        } catch (error) {
            console.error('Error adding location:', error);
            showToast('Error', 'An error occurred while adding the location.', 'danger');
        }
    }
    
    /**
     * Reset the add location form
     */
    function resetAddLocationForm() {
        document.getElementById('add-location-form').reset();
        document.getElementById('photo-preview').classList.add('d-none');
        document.getElementById('photo-preview-image').src = '';
        
        // Clear validation classes
        const inputs = document.getElementById('add-location-form').querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('is-invalid');
        });
        
// Center map on default location or first location
const defaultLocation = userLocations.find(loc => loc.is_default);
const locationToCenter = defaultLocation || (userLocations.length > 0 ? userLocations[0] : null);
        
if (locationToCenter) {
    const coordinates = parseCoordinates(locationToCenter.coordinates);
    mainMap.setView([coordinates.lat, coordinates.lng], 12);
}
}
        
/**
 * Add disposal centers to the main map
 */
function addDisposalCentersToMap() {
    // Clear existing disposal center markers
    markers.forEach(marker => {
        if (marker.type === 'center') {
            mainMap.removeLayer(marker);
        }
    });
        
    markers = markers.filter(marker => marker.type !== 'center');
        
    // Add new markers
    disposalCenters.forEach(center => {
        const coordinates = parseCoordinates(center.coordinates);
            
        const marker = L.marker([coordinates.lat, coordinates.lng], {
            icon: L.divIcon({
                className: 'disposal-center-marker',
                html: '<i class="bi bi-trash"></i>',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            })
        }).addTo(mainMap);
            
        marker.centerId = center.id;
        marker.type = 'center';
            
        marker.bindPopup(`
            <div class="center-popup">
                <h6>${center.name}</h6>
                <p>${center.address}</p>
            </div>
        `);
            
        markers.push(marker);
    });
}
        
/**
 * Save a new location with offline sync support
 */
async function saveLocation() {
    try {
        // Get form values
        const locationName = document.getElementById('location-name').value.trim();
        const address = document.getElementById('location-address').value.trim();
        const locationType = document.getElementById('location-type').value;
        const isDefault = document.getElementById('is-default-location').checked;
        const coordinatesJson = document.getElementById('location-coordinates').value;
        const notes = document.getElementById('location-notes').value.trim();
        const pickupInstructions = document.getElementById('location-pickup-instructions').value.trim();
            
        // Get photo data if available
        let photoData = null;
        const photoPreview = document.getElementById('photo-preview');
        if (!photoPreview.classList.contains('d-none')) {
            const photoImg = document.getElementById('photo-preview-image');
            if (photoImg.src && photoImg.src.startsWith('data:image')) {
                photoData = photoImg.src.split(',')[1]; // Get base64 data without the prefix
            }
        }
            
        // Validate form
        let isValid = true;
            
        if (!locationName) {
            document.getElementById('location-name').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('location-name').classList.remove('is-invalid');
        }
            
        if (!address) {
            document.getElementById('location-address').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('location-address').classList.remove('is-invalid');
        }
            
        if (!coordinatesJson) {
            document.getElementById('coordinates-feedback').style.display = 'block';
            isValid = false;
        } else {
            document.getElementById('coordinates-feedback').style.display = 'none';
        }
            
        if (!isValid) {
            return;
        }
            
        // Parse coordinates
        const coordinates = JSON.parse(coordinatesJson);
            
        // Prepare the data
        const locationData = {
            location_name: locationName,
            address,
            location_type: locationType,
            is_default: isDefault,
            coordinates: `POINT(${coordinates.lng} ${coordinates.lat})`,
            notes: notes || null,
            pickup_instructions: pickupInstructions || null,
            photo_data: photoData
        };
            
        // Get user ID from localStorage
        const userId = localStorage.getItem('user_id');
            
        // Use offline sync to add the location
        const result = await window.TrashDropOfflineSync.addLocation(locationData, userId);
            
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addLocationModal'));
        modal.hide();
            
        if (result.success) {
            // Show appropriate success message based on offline status
            if (result.offline) {
                showToast('Success', 'Location saved locally. Will sync when online.', 'warning');
            } else {
                showToast('Success', 'Location added successfully!', 'success');
            }
                
            // Update the pending sync count if offline
            if (result.offline) {
                updatePendingSyncCount();
            }
                
            // Reload locations
            loadUserLocations();
        } else {
            console.error('Failed to add location:', result.error);
            showToast('Error', result.error || 'Failed to add location. Please try again.', 'danger');
        }
            
        // Reset form
        resetAddLocationForm();
    } catch (error) {
        console.error('Error adding location:', error);
        showToast('Error', 'An error occurred while adding the location.', 'danger');
    }
}
        
/**
 * Reset the add location form
 */
function resetAddLocationForm() {
    document.getElementById('add-location-form').reset();
    document.getElementById('photo-preview').classList.add('d-none');
    document.getElementById('photo-preview-image').src = '';
        
    // Clear validation classes
    const inputs = document.getElementById('add-location-form').querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.classList.remove('is-invalid');
    });
}
        
/**
 * Open the edit location modal with the selected location
 */
async function openEditLocationModal(locationId) {
    try {
        if (!locationId) {
            console.error('Error opening edit modal: No location ID provided');
            showToast('Error', 'Invalid location ID.', 'danger');
            return;
        }
            
        console.log(`Opening edit modal for location ID: ${locationId}`);
            
        // First try to find the location in the user locations array
        let location = userLocations.find(loc => loc.id === locationId);
            
        // If not found in memory, try to get it from IndexedDB directly
        if (!location) {
            console.log(`Location ${locationId} not found in memory, trying IndexedDB...`);
            try {
                location = await window.TrashDropOfflineSync.getLocationFromIndexedDB(locationId);
            } catch (dbError) {
                console.error('Error retrieving location from IndexedDB:', dbError);
                // Continue with null location, will be handled below
            }
        }
            
        if (!location) {
            console.error(`Location not found in memory or IndexedDB: ${locationId}`);
            showToast('Error', 'Location not found. It may have been deleted.', 'danger');
            return;
        }
            
        // Set the location ID in the form
        document.getElementById('edit-location-id').value = location.id;
            
        // Set the form values
        document.getElementById('edit-location-name').value = location.location_name;
        document.getElementById('edit-location-address').value = location.address;
        document.getElementById('edit-location-type').value = location.location_type;
        document.getElementById('edit-is-default-location').checked = location.is_default;
        
        // Set additional fields if they exist
        document.getElementById('edit-location-notes').value = location.notes || '';
        document.getElementById('edit-location-pickup-instructions').value = location.pickup_instructions || '';
        
        // Set last pickup date if available
        if (location.last_pickup_date) {
            // Format the date as YYYY-MM-DD for the input field
            const date = new Date(location.last_pickup_date);
            const formattedDate = date.toISOString().split('T')[0];
            document.getElementById('edit-last-pickup-date').value = formattedDate;
        } else {
            document.getElementById('edit-last-pickup-date').value = '';
        }
        
        // Handle photo if available
        const photoPreview = document.getElementById('edit-photo-preview');
        const photoPreviewImage = document.getElementById('edit-photo-preview-image');
        
        if (location.photo_url) {
            photoPreviewImage.src = location.photo_url;
            photoPreview.classList.remove('d-none');
        } else {
            photoPreviewImage.src = '';
            photoPreview.classList.add('d-none');
        }
        
        // Parse coordinates
        const coordinates = parseCoordinates(location.coordinates);
        document.getElementById('edit-location-coordinates').value = JSON.stringify(coordinates);
        
        // Update the map marker
        editLocationMarker.setLatLng([coordinates.lat, coordinates.lng]);
        editLocationMap.setView([coordinates.lat, coordinates.lng], 15);
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editLocationModal'));
        modal.show();
    }
    
    /**
     * Update an existing location with offline sync support
     */
    async function updateLocation() {
        try {
            const locationId = document.getElementById('edit-location-id').value;
            
            // Get form values
            const locationName = document.getElementById('edit-location-name').value.trim();
            const address = document.getElementById('edit-location-address').value.trim();
            const locationType = document.getElementById('edit-location-type').value;
            const isDefault = document.getElementById('edit-is-default-location').checked;
            const coordinatesJson = document.getElementById('edit-location-coordinates').value;
            const notes = document.getElementById('edit-location-notes').value.trim();
            const pickupInstructions = document.getElementById('edit-location-pickup-instructions').value.trim();
            const lastPickupDate = document.getElementById('edit-last-pickup-date').value || null;
            
            // Get photo data if available
            let photoData = null;
            const photoPreview = document.getElementById('edit-photo-preview');
            if (!photoPreview.classList.contains('d-none')) {
                const photoImg = document.getElementById('edit-photo-preview-image');
                if (photoImg.src && photoImg.src.startsWith('data:image')) {
                    photoData = photoImg.src.split(',')[1]; // Get base64 data without the prefix
                }
            }
            
            // Validate form
            let isValid = true;
            
            if (!locationName) {
                document.getElementById('edit-location-name').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('edit-location-name').classList.remove('is-invalid');
            }
            
            if (!address) {
                document.getElementById('edit-location-address').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('edit-location-address').classList.remove('is-invalid');
            }
            
            if (!coordinatesJson) {
                document.getElementById('edit-coordinates-feedback').style.display = 'block';
                isValid = false;
            } else {
                document.getElementById('edit-coordinates-feedback').style.display = 'none';
            }
            
            if (!isValid) {
                return;
            }
            
            // Parse coordinates
            const coordinates = JSON.parse(coordinatesJson);
            
            // Prepare the data
            const locationData = {
                location_name: locationName,
                address,
                location_type: locationType,
                is_default: isDefault,
                coordinates: `POINT(${coordinates.lng} ${coordinates.lat})`,
                notes: notes || null,
                pickup_instructions: pickupInstructions || null,
                last_pickup_date: lastPickupDate,
                photo_data: photoData
            };
            
            // Get user ID from localStorage
            const userId = localStorage.getItem('user_id');
            
            // Use offline sync to update the location
            const result = await window.TrashDropOfflineSync.updateLocation(locationId, locationData, userId);
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editLocationModal'));
            modal.hide();
            
            if (result.success) {
                // Show appropriate success message based on offline status
                if (result.offline) {
                    showToast('Success', 'Location updated locally. Will sync when online.', 'warning');
                } else {
                    showToast('Success', 'Location updated successfully!', 'success');
                }
                
                // Update the pending sync count if offline
                if (result.offline) {
                    updatePendingSyncCount();
                }
                
                // Reload locations
                loadUserLocations();
            } else {
                console.error('Failed to update location:', result.error);
                showToast('Error', result.error || 'Failed to update location. Please try again.', 'danger');
            }
        } catch (error) {
            console.error('Error updating location:', error);
            showToast('Error', 'An error occurred while updating the location.', 'danger');
        }
    }
    
    /**
     * Delete a location with offline sync support
     */
    async function deleteLocation() {
        try {
            const locationId = document.getElementById('delete-location-id').value;
            
            // Get user ID from localStorage
            const userId = localStorage.getItem('user_id');
            
            // Use offline sync to delete the location
            const result = await window.TrashDropOfflineSync.deleteLocation(locationId, userId);
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteLocationModal'));
            modal.hide();
            
            if (result.success) {
                // Show appropriate success message based on offline status
                if (result.offline) {
                    showToast('Success', 'Location queued for deletion. Will sync when online.', 'warning');
                    // Update the pending sync count
                    updatePendingSyncCount();
                } else {
                    showToast('Success', 'Location deleted successfully!', 'success');
                }
                
                // Reload locations
                loadUserLocations();
            } else {
                console.error('Failed to delete location:', result.error);
                showToast('Error', result.error || 'Failed to delete location. Please try again.', 'danger');
            }
        } catch (error) {
            console.error('Error deleting location:', error);
            showToast('Error', 'An error occurred while deleting the location.', 'danger');
        }
    }

/**
 * Set a location as the default with offline sync support
 */
async function setDefaultLocation(locationId) {
    try {
        // Get user ID from localStorage
        const userId = localStorage.getItem('user_id');
        
        // Use offline sync to set default location
        const result = await window.TrashDropOfflineSync.setDefaultLocation(locationId, userId);
        
        if (result.success) {
            // Show appropriate success message based on offline status
            if (result.offline) {
                showToast('Success', 'Default location will be updated when online.', 'warning');
                // Update the pending sync count
                updatePendingSyncCount();
            } else {
                showToast('Success', 'Default location updated successfully!', 'success');
            }
            
            // Reload locations
            loadUserLocations();
        } else {
            console.error('Failed to set default location:', result.error);
            showToast('Error', result.error || 'Failed to set default location. Please try again.', 'danger');
        }
    } catch (error) {
        console.error('Error setting default location:', error);
        showToast('Error', 'An error occurred while setting the default location.', 'danger');
    }
}

/**
 * Handle photo upload and preview
 */
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.match('image.*')) {
        showToast('Error', 'Please select an image file.', 'danger');
        return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Error', 'Image file size must be less than 5MB.', 'danger');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        // Determine which modal is active to update the correct preview
        const isAddModal = document.getElementById('addLocationModal').classList.contains('show');
        const previewContainer = document.getElementById(isAddModal ? 'photo-preview' : 'edit-photo-preview');
        const previewImage = document.getElementById(isAddModal ? 'photo-preview-image' : 'edit-photo-preview-image');
        
        // Update preview
        previewImage.src = e.target.result;
        previewContainer.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
}

/**
 * Manually sync offline data with the server
 */
async function syncOfflineData() {
    try {
        const syncBtn = document.getElementById('sync-offline-data');
        const syncIcon = document.getElementById('sync-icon');
        const syncText = document.getElementById('sync-text');
        
        // Update button to show syncing state
        syncBtn.disabled = true;
        syncIcon.classList.add('fa-spin');
        syncText.textContent = 'Syncing...';
        
        // Attempt to sync with the server
        const result = await window.TrashDropOfflineSync.syncWithServer();
        
        // Update button state based on result
        syncIcon.classList.remove('fa-spin');
        syncBtn.disabled = false;
        
        if (result.success) {
            // Show success message
            showToast('Success', 'Successfully synced your data with the server!', 'success');
            syncText.textContent = 'Synced';
            
            // Update the sync count (should be 0 now)
            updatePendingSyncCount();
            
            // Reload locations to get the latest data
            loadUserLocations();
            
            // Reset the sync button text after a delay
            setTimeout(() => {
                syncText.textContent = 'Sync';
            }, 3000);
        } else {
            // Show error message
            showToast('Error', 'Failed to sync with server. Please try again later.', 'danger');
            syncText.textContent = 'Sync Failed';
            
            // Reset the sync button text after a delay
            setTimeout(() => {
                syncText.textContent = 'Sync';
            }, 3000);
        }
    } catch (error) {
        console.error('Error syncing with server:', error);
        showToast('Error', 'An error occurred while syncing with the server.', 'danger');
        
        // Reset button state
        document.getElementById('sync-icon').classList.remove('fa-spin');
        document.getElementById('sync-text').textContent = 'Sync';
        document.getElementById('sync-offline-data').disabled = false;
    }
}

/**
 * Parse coordinates from a POINT string
 */
function parseCoordinates(pointString) {
    // Handle different formats
    if (typeof pointString === 'string') {
        // Try to parse POINT(lng lat) format
        const match = pointString.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
        if (match) {
            return {
                lng: parseFloat(match[1]),
                lat: parseFloat(match[2])
            };
        }
        
        // Try to parse GeoJSON format
        try {
            const geoJson = JSON.parse(pointString);
            if (geoJson.type === 'Point' && Array.isArray(geoJson.coordinates)) {
    function parseCoordinates(pointString) {
        // Handle different formats
        if (typeof pointString === 'string') {
            // Try to parse POINT(lng lat) format
            const match = pointString.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
            if (match) {
                return {
                    lng: parseFloat(match[1]),
                    lat: parseFloat(match[2])
                };
            }
            
            // Try to parse GeoJSON format
            try {
                const geoJson = JSON.parse(pointString);
                if (geoJson.type === 'Point' && Array.isArray(geoJson.coordinates)) {
                    return {
                        lng: geoJson.coordinates[0],
                        lat: geoJson.coordinates[1]
                    };
                }
            } catch (e) {
                console.error('Error parsing GeoJSON:', e);
            }
        } else if (typeof pointString === 'object') {
            // If it's already an object with lat/lng
            if (pointString.lat && pointString.lng) {
                return pointString;
            }
        }
        
        // Default to New York City if we can't parse
        console.error('Could not parse coordinates:', pointString);
        return { lat: 40.7128, lng: -74.0060 };
    }
    
    /**
     * Reverse geocode coordinates to get an address
     */
    function reverseGeocode(lat, lng, callback) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.display_name) {
                    callback(data.display_name);
                } else {
                    callback(null);
                }
            })
            .catch(error => {
                console.error('Reverse geocoding error:', error);
                callback(null);
            });
    }
    
    /**
     * Check if user is authenticated
     */
    function checkAuthentication() {
        return new Promise((resolve, reject) => {
            const token = localStorage.getItem('token');
            
            if (!token) {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                reject('Not authenticated');
            } else {
                // Update user information
                const username = localStorage.getItem('user_name');
                const userPoints = localStorage.getItem('user_points') || '0';
                
                if (username) {
                    document.getElementById('user-name').textContent = username;
                }
                
                if (document.getElementById('user-points')) {
                    document.getElementById('user-points').textContent = userPoints;
                }
                
                if (document.getElementById('user-total-points')) {
                    document.getElementById('user-total-points').textContent = userPoints;
                }
                
                resolve();
            }
        });
    }
    
    /**
     * Show a toast notification
     */
    function showToast(title, message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.id = toastId;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong>: ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Initialize and show the toast
        const toastInstance = new bootstrap.Toast(toast, { delay: 5000 });
        toastInstance.show();
        
        // Remove the toast when hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }
});
