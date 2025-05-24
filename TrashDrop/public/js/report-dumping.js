// Supabase client is already initialized in auth.js
// We'll use the existing supabase instance

// Global variables for report data and state
let reportData = {
    photos: [], // Will store photo data URLs
    trashType: null,
    size: null,
    isAnonymous: false
};

// Initialize shared variables
let map, marker;
let currentLatitude = 40.7128; // Default to New York
let currentLongitude = -74.0060;
let mediaStream = null;
let cameraFacingMode = 'environment'; // Start with rear camera
let user;
let isPageLoaded = false;

// Add global error handler to catch any camera-related errors
window.addEventListener('error', function(event) {
    // If error contains camera view related errors, suppress them
    if (event.error && event.error.toString().includes('cameraView') || 
        event.message && event.message.includes('cameraView')) {
        console.warn('Suppressed camera view error:', event.error || event.message);
        event.preventDefault();
        event.stopPropagation();
    }
}, true);

document.addEventListener('DOMContentLoaded', async () => {
    // Authentication check
    user = await AuthManager.getCurrentUser();
    if (!user) {
        const isAuthenticated = await AuthManager.isAuthenticated();
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }
        
        // Get user profile
        user = await AuthManager.getUserProfile();
        if (!user) {
            showToast('Error loading user profile');
            return;
        }
    }
    
    // Initialize offline handling
    handleOfflineStatus();
    
    // Initialize map immediately since we're on the standalone page
    setTimeout(() => {
        initMap();
        getUserLocation(); // Automatically get user location
    }, 300);
    
    // Load user's past reports
    loadPastReports();
    
    isPageLoaded = true;
    
    // Initialize event listeners
    initEventListeners();
    
    // Function to set up all event listeners
    function initEventListeners() {
        // Only set up event listeners for elements that exist on the current page
        
        // Create Report button (only on report-dumping page)
        const createReportBtn = document.getElementById('create-report-btn');
        if (createReportBtn) {
            createReportBtn.addEventListener('click', window.openReportModal);
        }
        
        // Camera controls
        const addPhotoBtn = document.getElementById('add-photo');
        if (addPhotoBtn) {
            addPhotoBtn.addEventListener('click', openCamera);
        }
        
        // Set up event listeners for camera modal buttons
        const capturePhotoBtn = document.getElementById('capture-photo');
        if (capturePhotoBtn) {
            capturePhotoBtn.addEventListener('click', capturePhoto);
        }
        
        const switchCameraBtn = document.getElementById('switch-camera');
        if (switchCameraBtn) {
            switchCameraBtn.addEventListener('click', switchCamera);
        }
        
        const selectFromGalleryBtn = document.getElementById('select-from-gallery');
        if (selectFromGalleryBtn) {
            selectFromGalleryBtn.addEventListener('click', () => {
                // Close the camera modal
                const cameraModal = bootstrap.Modal.getInstance(document.getElementById('camera-modal'));
                if (cameraModal) {
                    cameraModal.hide();
                }
                // Stop camera stream
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    mediaStream = null;
                }
                // Open file input
                document.getElementById('gallery-input').click();
            });
        }
        
        // Handle modal close event to properly stop camera stream
        const cameraModal = document.getElementById('camera-modal');
        if (cameraModal) {
            cameraModal.addEventListener('hidden.bs.modal', () => {
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    mediaStream = null;
                }
            });
        }
        
        const galleryInput = document.getElementById('gallery-input');
        if (galleryInput) {
            galleryInput.addEventListener('change', handleGallerySelection);
        }
        
        // Location controls
        const useLocationBtn = document.getElementById('use-current-location');
        if (useLocationBtn) {
            useLocationBtn.addEventListener('click', getUserLocation);
        }
        
        // Waste type selection
        const trashTypeButtons = document.querySelectorAll('.trash-type-btn');
        trashTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Clear previous selection
                trashTypeButtons.forEach(b => b.classList.remove('selected'));
                // Select this button
                btn.classList.add('selected');
                // Store the selected trash type
                reportData.trashType = btn.getAttribute('data-trash-type');
            });
        });
        
        // Size selection
        const sizeOptions = document.querySelectorAll('.size-option');
        sizeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Clear previous selection
                sizeOptions.forEach(o => o.classList.remove('selected'));
                // Select this option
                option.classList.add('selected');
                // Store the selected size
                reportData.size = option.getAttribute('data-size');
                console.log('Selected size:', reportData.size);
            });
        });
        
        // Initialize a MutationObserver to handle dynamically added size options
        const sizeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    const newSizeOptions = document.querySelectorAll('.size-option:not(.size-option-initialized)');
                    newSizeOptions.forEach(option => {
                        option.classList.add('size-option-initialized');
                        option.addEventListener('click', () => {
                            // Clear previous selection
                            document.querySelectorAll('.size-option').forEach(o => o.classList.remove('selected'));
                            // Select this option
                            option.classList.add('selected');
                            // Store the selected size
                            reportData.size = option.getAttribute('data-size');
                            console.log('Selected size (from new element):', reportData.size);
                        });
                    });
                }
            });
        });
        
        // Start observing the document with the configured parameters
        sizeObserver.observe(document.body, { childList: true, subtree: true });
        
        // Anonymous checkbox
        const anonymousCheckbox = document.getElementById('anonymous-report');
        if (anonymousCheckbox) {
            anonymousCheckbox.addEventListener('change', (e) => {
                reportData.isAnonymous = e.target.checked;
            });
        }
        
        // Submit report button
        const submitReportBtn = document.getElementById('submit-report');
        if (submitReportBtn) {
            submitReportBtn.addEventListener('click', submitReport);
        }
        
        // Add event listener for when the user navigates away
        window.addEventListener('beforeunload', () => {
            // Stop camera stream if active
            if (mediaStream) {
                closeCamera();
            }
        });
    }
    
    // Validate the unified form before submission
    function validateReportForm() {
        // Check photos (optional but with warning)
        if (!reportData.photos || reportData.photos.length === 0) {
            if (!confirm('No photos added. Are you sure you want to continue without photos?')) {
                return false;
            }
        }
        
        // Check if we have location data
        if (!currentLatitude || !currentLongitude) {
            // Use defaults if not available
            showToast('Using default location. Please try enabling location services for better accuracy.');
        }
        
        // Set a generic location name since we removed the location description field
        reportData.location = 'Reported illegal dumping';
        
        // Get current selected waste type if not already set
        const selectedTrashType = document.querySelector('.trash-type-btn.selected');
        if (!selectedTrashType) {
            showToast('Please select a waste type');
            return false;
        }
        reportData.trashType = selectedTrashType.getAttribute('data-trash-type');
        
        // Get current selected size if not already set
        const selectedSize = document.querySelector('.size-option.selected');
        if (!selectedSize) {
            showToast('Please select an approximate size');
            return false;
        }
        reportData.size = selectedSize.getAttribute('data-size');
        
        // Capture description
        const description = document.getElementById('description');
        if (description) {
            reportData.description = description.value.trim();
        }
        
        // Capture priority
        const priority = document.getElementById('priority');
        if (priority) {
            reportData.priority = priority.value;
        }
        
        // Check if anonymous
        const anonymousCheckbox = document.getElementById('anonymous-report');
        if (anonymousCheckbox) {
            reportData.isAnonymous = anonymousCheckbox.checked;
        }
        
        return true;
    }
    
    // Initialize map
    function initMap() {
        try {
            map = L.map('map').setView([currentLatitude, currentLongitude], 13);
            
            // Use OpenStreetMap tiles with offline fallback
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);
            
            // Add marker for current position
            marker = L.marker([currentLatitude, currentLongitude], {
                draggable: true
            }).addTo(map);
            
            // Update coordinates display when marker is moved
            marker.on('dragend', function(e) {
                const position = marker.getLatLng();
                currentLatitude = position.lat;
                currentLongitude = position.lng;
                updateCoordinatesDisplay();
            });
            
            // Allow clicking on map to set marker
            map.on('click', function(e) {
                currentLatitude = e.latlng.lat;
                currentLongitude = e.latlng.lng;
                marker.setLatLng(e.latlng);
                updateCoordinatesDisplay();
            });
            
            // Initial coordinates display
            updateCoordinatesDisplay();
            
            // Try to get user's location automatically
            getUserLocation();
        } catch (error) {
            console.error('Map initialization error:', error);
            document.getElementById('map').innerHTML = 
                '<div class="map-error">Map could not be loaded. Please check your connection.</div>';
        }
    }
    
    // Update the coordinates display in the UI
    function updateCoordinatesDisplay() {
        document.getElementById('latitude').textContent = currentLatitude.toFixed(6);
        document.getElementById('longitude').textContent = currentLongitude.toFixed(6);
    }
    
    // Get user's location to populate the map
    function getUserLocation() {
        // First check if the map is initialized
        if (!map || !marker) {
            // If map isn't ready yet, try again in a moment
            setTimeout(getUserLocation, 500);
            return;
        }
        
        if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLatitude = position.coords.latitude;
                    currentLongitude = position.coords.longitude;
                    
                    map.setView([currentLatitude, currentLongitude], 15);
                    marker.setLatLng([currentLatitude, currentLongitude]);
                    updateCoordinatesDisplay();
                    
                    // Update the map display
                    map.invalidateSize();
                },
                (error) => {
                    // Use a more descriptive error message based on the error code
                    let errorMessage = 'Could not get your location. Using default location instead.';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access was denied. Please enable location services.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is unavailable. Using default location.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Using default location.';
                            break;
                    }
                    
                    console.log('Geolocation error: ' + errorMessage);
                    showToast(errorMessage);
                    
                    // Use default location and update map
                    map.setView([currentLatitude, currentLongitude], 15);
                    updateCoordinatesDisplay();
                },
                options
            );
        } else {
            showToast('Geolocation is not supported by your browser');
            // Use default location
            map.setView([currentLatitude, currentLongitude], 15);
            updateCoordinatesDisplay();
        }
    }
    
    // Handle photo uploads
    function handlePhotoUpload(event) {
        const files = event.target.files;
        const photoPreview = document.getElementById('photo-preview');
        photoPreview.innerHTML = '';
        
        if (files.length > 5) {
            showToast('Maximum 5 photos allowed');
            return;
        }
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast(`File ${file.name} is too large. Maximum size is 5MB.`);
                continue;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewContainer = document.createElement('div');
                previewContainer.className = 'photo-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.className = 'remove-photo';
                removeBtn.onclick = function() {
                    photoPreview.removeChild(previewContainer);
                };
                
                previewContainer.appendChild(img);
                previewContainer.appendChild(removeBtn);
                photoPreview.appendChild(previewContainer);
            };
            
            reader.readAsDataURL(file);
        }
    }
    
    // Submit report to server or save offline
    async function submitReport() {
        try {
            // Validate all form fields before submission
            if (!validateReportForm()) {
                return;
            }
            
            const isOnline = navigator.onLine;
            const submitBtn = document.getElementById('submit-report');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';
            
            // Get current values from the form
            const description = document.getElementById('description')?.value || '';
            const priority = document.getElementById('priority')?.value || 'medium';
            const isAnonymous = document.getElementById('anonymous-report')?.checked || false;
            
            // Make sure we have proper location data
            if (!currentLatitude || !currentLongitude) {
                // Use default location if geolocation failed
                console.log('Using default location for report');
            }
            
            // Ensure we have the trash type and size
            if (!reportData.trashType) {
                const selectedTrashType = document.querySelector('.trash-type-btn.selected');
                reportData.trashType = selectedTrashType ? selectedTrashType.getAttribute('data-trash-type') : 'household';
            }
            
            if (!reportData.size) {
                const selectedSize = document.querySelector('.size-option.selected');
                reportData.size = selectedSize ? selectedSize.getAttribute('data-size') : 'medium';
            }
            
            // Prepare final report data for submission
            const submissionData = {
                // Location data
                location: 'Reported illegal dumping', // Generic name since we removed the location description field
                latitude: currentLatitude,
                longitude: currentLongitude,
                coordinates: `POINT(${currentLongitude} ${currentLatitude})`,
                
                // Waste classification
                type: 'dumping', // Required by the schema
                trashType: reportData.trashType || 'household', // Additional context
                size: reportData.size || 'medium', // Additional context
                
                // Report details
                priority: priority,
                description: description,
                isAnonymous: isAnonymous,
                
                // Default values
                authority: 'local',
                estimated_time: '1h',
                payment: reportData.size === 'large' ? '20' : (reportData.size === 'medium' ? '10' : '5'), // Payment based on size
                distance: '0km',
                status: 'pending',
                
                // Photos array to be populated after upload
                photos: reportData.photos || []
            };
            
            // Prepare progress indicator
            showToast('Processing report...', 3000);
            
            // Upload photos if online
            if (isOnline && reportData.photos && reportData.photos.length > 0) {
                showToast('Uploading photos...', 3000);
                try {
                    const photoPromises = reportData.photos.map(dataUrl => uploadPhoto(dataUrl));
                    
                    // Wait for all photo uploads
                    const uploadedUrls = await Promise.all(photoPromises);
                    submissionData.photos = uploadedUrls.filter(url => url !== null);
                    
                    showToast(`Uploaded ${submissionData.photos.length} photos`);
                } catch (photoError) {
                    console.log('Photo upload error:', photoError);
                    showToast('Some photos could not be uploaded. Continuing with report submission.');
                }
            }
            
            // Submit report if online, otherwise save to IndexedDB
            if (isOnline) {
                try {
                    // For development, we'll simulate a successful report submission
                    console.log('Submitting report:', submissionData);
                    
                    // Create a unique ID for the report
                    const reportId = 'report-' + Date.now();
                    
                    // Store the report in localStorage for development
                    const pastReports = JSON.parse(localStorage.getItem('dev_reports') || '[]');
                    pastReports.push({
                        id: reportId,
                        location: submissionData.location,
                        latitude: submissionData.latitude,
                        longitude: submissionData.longitude,
                        trashType: submissionData.trashType,
                        size: submissionData.size,
                        priority: submissionData.priority,
                        description: submissionData.description,
                        photos: submissionData.photos,
                        isAnonymous: submissionData.isAnonymous,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    });
                    localStorage.setItem('dev_reports', JSON.stringify(pastReports));
                    
                    // Show success message and redirect to dashboard
                    showToast('Report submitted successfully!');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                } catch (error) {
                    console.log('Error submitting report:', error);
                    showToast('Error submitting report. Will try offline save.');
                    // If online submission fails, save offline
                    await storeOfflineReport(submissionData);
                }
            } else {
                // Store in IndexedDB for later sync
                await storeOfflineReport(submissionData);
                showToast('Report saved offline. Will be submitted when you reconnect.');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            }
        } catch (error) {
            console.log('Error submitting report:', error);
            showToast('Error submitting report. Please try again.');
        } finally {
            const submitBtn = document.getElementById('submit-report');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Submit Report';
        }
    }
    
    // Camera control functions
    async function openCamera() {
        try {
            // Check if device has camera
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast('Camera not supported on this device');
                // Fall back to file upload
                document.getElementById('gallery-input').click();
                return;
            }
            
            // Open the camera modal
            const cameraModal = new bootstrap.Modal(document.getElementById('camera-modal'));
            cameraModal.show();
            
            // Wait for the modal to be fully shown before accessing the camera
            document.getElementById('camera-modal').addEventListener('shown.bs.modal', async () => {
                try {
                    // Request camera permissions
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: cameraFacingMode },
                        audio: false
                    });
                    
                    // Display camera view
                    const videoElement = document.getElementById('camera-stream');
                    
                    if (videoElement) {
                        videoElement.srcObject = mediaStream;
                        
                        // Wait for video to be ready
                        await new Promise(resolve => {
                            videoElement.onloadedmetadata = () => {
                                resolve();
                            };
                        });
                        
                        // Start playing the video
                        await videoElement.play();
                    } else {
                        console.error('Video element not found');
                        showToast('Camera element not found');
                    }
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    showToast('Could not access camera. Please check permissions.');
                    // Close the modal
                    cameraModal.hide();
                    // Fall back to file upload
                    document.getElementById('gallery-input').click();
                }
            }, { once: true }); // Only run this once per modal open
            
        } catch (error) {
            console.error('Error initializing camera:', error);
            showToast('Could not initialize camera interface');
            // Fall back to file upload
            document.getElementById('gallery-input').click();
        }
    }
    
    function closeCamera() {
        // Stop all video streams
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        
        // Hide camera modal
        const cameraModal = bootstrap.Modal.getInstance(document.getElementById('camera-modal'));
        if (cameraModal) {
            cameraModal.hide();
        }
    }
    
    async function switchCamera() {
        // Toggle between front and rear cameras
        cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
        
        // Close current stream
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        
        // Reopen with new facing mode
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacingMode },
                audio: false
            });
            
            // Update video stream
            const videoElement = document.getElementById('camera-stream');
            videoElement.srcObject = mediaStream;
            
        } catch (error) {
            console.error('Error switching camera:', error);
            showToast('Could not switch camera');
        }
    }
    
    async function capturePhoto() {
        try {
            const videoElement = document.getElementById('camera-stream');
            if (!videoElement || !videoElement.srcObject) {
                console.error('Video stream not available');
                showToast('Camera not ready. Please try again.');
                return;
            }
            
            // Create a canvas to capture the frame
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            
            // Draw the video frame to the canvas
            const context = canvas.getContext('2d');
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Add photo to grid
            addPhotoToGrid(dataUrl);
            
            // Show success toast
            showToast('Photo captured successfully');
            
            // Close camera modal
            closeCamera();
            
        } catch (error) {
            console.error('Error capturing photo:', error);
            showToast('Could not capture photo: ' + (error.message || 'Unknown error'));
        }
    }
    
    function handleGallerySelection(event) {
        const files = event.target.files;
        
        if (!files || files.length === 0) return;
        
        // Check if we're exceeding the photo limit
        if (reportData.photos.length + files.length > 6) {
            showToast(`You can add a maximum of 6 photos. Adding the first ${6 - reportData.photos.length}.`);
        }
        
        // Process each file
        Array.from(files).slice(0, 6 - reportData.photos.length).forEach(file => {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast(`File ${file.name} is too large. Maximum size is 5MB.`);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                addPhotoToGrid(e.target.result);
            };
            
            reader.readAsDataURL(file);
        });
        
        // Reset file input
        event.target.value = '';
    }
    
    function addPhotoToGrid(dataUrl) {
        // Check if we already have 6 photos
        if (reportData.photos.length >= 6) {
            showToast('Maximum 6 photos allowed');
            return;
        }
        
        // Add to report data
        reportData.photos.push(dataUrl);
        
        // Create photo element
        const photoGrid = document.getElementById('photo-grid');
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        
        const img = document.createElement('img');
        img.src = dataUrl;
        
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.className = 'btn btn-sm btn-danger position-absolute top-0 right-0 m-1';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.width = '24px';
        removeBtn.style.height = '24px';
        removeBtn.style.padding = '0';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        
        // Remove photo when button is clicked
        removeBtn.addEventListener('click', () => {
            const index = reportData.photos.indexOf(dataUrl);
            if (index !== -1) {
                reportData.photos.splice(index, 1);
                photoGrid.removeChild(photoItem);
            }
        });
        
        photoItem.appendChild(img);
        photoItem.appendChild(removeBtn);
        
        // Insert before the add button
        const addPhotoBtn = document.getElementById('add-photo');
        photoGrid.insertBefore(photoItem, addPhotoBtn);
    }
    
    // Upload a photo to Supabase Storage (mock for development)
    async function uploadPhoto(dataUrl) {
        try {
            // In development mode, we'll just use the data URL directly
            console.log('Mock photo upload in development mode');
            
            // Generate a mock URL for development
            const timestamp = new Date().getTime();
            const mockUrl = `mock-photo-url-${timestamp}.jpg`;
            
            // In a real environment, we would upload to Supabase Storage
            // For development, we'll just return a fake URL
            return mockUrl;
        } catch (error) {
            console.error('Error handling photo:', error);
            return null;
        }
    }
    
    // Store report in IndexedDB for offline use
    async function storeOfflineReport(reportData) {
        // Add timestamp and photos as data URLs
        reportData.createdAt = new Date().toISOString();
        reportData.pending = true;
        
        // Get photo data URLs
        const photoElements = document.querySelectorAll('.photo-preview-item img');
        const photoDataUrls = [];
        
        for (let i = 0; i < photoElements.length; i++) {
            photoDataUrls.push(photoElements[i].src);
        }
        
        reportData.photoDataUrls = photoDataUrls;
        
        // Store in offline-reports store
        const db = await openIndexedDB();
        const tx = db.transaction('offline-reports', 'readwrite');
        const store = tx.objectStore('offline-reports');
        await store.add(reportData);
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    
    // Open IndexedDB
    function openIndexedDB() {
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open('trashdrop-db', 1);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create offline-reports store if it doesn't exist
                    if (!db.objectStoreNames.contains('offline-reports')) {
                        db.createObjectStore('offline-reports', { keyPath: 'createdAt' });
                    }
                };
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => {
                    console.error('IndexedDB error:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('Error opening IndexedDB:', error);
                reject(error);
            }
        });
    }
    
    // Handle online/offline status
    function handleOfflineStatus() {
        const offlineIndicator = document.querySelector('.offline-indicator');
        
        // Initial status check
        if (!navigator.onLine) {
            offlineIndicator.style.display = 'block';
        }
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            offlineIndicator.style.display = 'none';
            syncOfflineReports();
        });
        
        window.addEventListener('offline', () => {
            offlineIndicator.style.display = 'block';
        });
    }
    
    // Sync offline reports when back online
    async function syncOfflineReports() {
        try {
            const db = await openIndexedDB();
            const tx = db.transaction('offline-reports', 'readonly');
            const store = tx.objectStore('offline-reports');
            const reports = await store.getAll();
            
            if (reports.length === 0) return;
            
            showToast(`Syncing ${reports.length} offline report(s)...`);
            
            // Process each offline report
            for (const report of reports) {
                try {
                    // Upload any photos first
                    if (report.photoDataUrls && report.photoDataUrls.length > 0) {
                        const uploadPromises = report.photoDataUrls.map(url => uploadPhoto(url));
                        const uploadedUrls = await Promise.all(uploadPromises);
                        report.photos = uploadedUrls.filter(url => url !== null);
                    }
                    
                    // Remove photo data URLs to save bandwidth
                    delete report.photoDataUrls;
                    delete report.pending;
                    
                    // Submit report
                    await supabase.functions.invoke('create-report', {
                        body: report
                    });
                    
                    // Remove from IndexedDB
                    const deleteTx = db.transaction('offline-reports', 'readwrite');
                    const deleteStore = deleteTx.objectStore('offline-reports');
                    await deleteStore.delete(report.createdAt);
                    
                    await new Promise(resolve => {
                        deleteTx.oncomplete = resolve;
                    });
                } catch (error) {
                    console.error('Error syncing report:', error);
                }
            }
            
            showToast('All offline reports synced successfully!');
            loadPastReports(); // Refresh the list
        } catch (error) {
            console.error('Error syncing offline reports:', error);
            showToast('Error syncing some reports. They will be tried again later.');
        }
    }
    
    // Load user's past reports
    async function loadPastReports() {
        // Check if reports list element exists (it may not in the standalone version)
        const reportsList = document.getElementById('reports-list');
        if (!reportsList) {
            console.log('Reports list element not found - skipping past reports loading');
            return;
        }
        
        reportsList.innerHTML = '<p class="loading-text">Loading your previous reports...</p>';
        
        try {
            // Get reports from localStorage in development mode
            const devReports = JSON.parse(localStorage.getItem('dev_reports') || '[]');
            
            // Also get any pending offline reports
            let offlineReports = [];
            
            // Safely check for IndexedDB support and try to get offline reports
            if (window.indexedDB) {
                try {
                    // For development mode, let's handle IndexedDB errors gracefully
                    const checkIDBSupport = await new Promise((resolve) => {
                        const testRequest = indexedDB.open('test-idb-support');
                        testRequest.onerror = () => resolve(false);
                        testRequest.onsuccess = () => {
                            testRequest.result.close();
                            resolve(true);
                        };
                    });
                    
                    if (checkIDBSupport) {
                        const db = await openIndexedDB();
                        const tx = db.transaction('offline-reports', 'readonly');
                        const store = tx.objectStore('offline-reports');
                        
                        // Use a promise wrapper around getAll for better error handling
                        offlineReports = await new Promise((resolve, reject) => {
                            const getAllRequest = store.getAll();
                            getAllRequest.onsuccess = () => resolve(getAllRequest.result || []);
                            getAllRequest.onerror = (event) => {
                                console.error('Error in getAll:', event.target.error);
                                resolve([]);
                            };
                        });
                    }
                } catch (err) {
                    console.error('Error accessing offline reports:', err);
                    // Continue with empty offline reports
                }
            }
            
            // Display reports
            if (devReports.length === 0 && offlineReports.length === 0) {
                reportsList.innerHTML = '<p class="no-reports">You haven\'t submitted any reports yet.</p>';
                return;
            }
            
            reportsList.innerHTML = '';
            
            // Display offline reports first
            for (const report of offlineReports) {
                const reportElement = createReportElement({
                    location: report.location,
                    created_at: report.createdAt,
                    priority: report.priority,
                    status: 'Pending Sync',
                    offline: true
                });
                reportsList.appendChild(reportElement);
            }
            
            // Display reports from localStorage (development mode)
            console.log('Development reports to display:', devReports);
            
            try {
                for (const report of devReports) {
                    // Add validation to ensure the report object has all required properties
                    if (!report || typeof report !== 'object') {
                        console.warn('Invalid report object:', report);
                        continue;
                    }
                    
                    // Ensure all required properties exist
                    const safeReport = {
                        location: report.location || 'Unknown location',
                        created_at: report.created_at || new Date().toISOString(),
                        priority: report.priority || 'medium',
                        status: report.status || 'pending',
                        authority: report.authority || 'local'
                    };
                    
                    const reportElement = createReportElement(safeReport);
                    reportsList.appendChild(reportElement);
                }
            } catch (renderError) {
                console.error('Error rendering reports:', renderError);
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            reportsList.innerHTML = '<p class="error-text">Error loading reports. Please try again later.</p>';
        }
    }
    
    // Create HTML element for a report
    function createReportElement(report) {
        try {
            const reportElement = document.createElement('div');
            reportElement.className = `report-item priority-${report.priority || 'medium'}`;
            
            // Safe status class determination
            let statusClass = 'status-pending';
            if (report.offline) {
                statusClass = 'status-offline';
            } else if (report.status) {
                if (report.status === 'completed') statusClass = 'status-completed';
                else if (report.status === 'in_progress') statusClass = 'status-in-progress';
            }
            
            // Safe date formatting
            let formattedDate = 'Unknown date';
            try {
                if (report.created_at) {
                    const date = new Date(report.created_at);
                    if (!isNaN(date.getTime())) { // Check if date is valid
                        formattedDate = date.toLocaleDateString() + ' ' + 
                                       date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    }
                }
            } catch (dateError) {
                console.warn('Error formatting date:', dateError);
            }
            
            // Safe status text
            let statusText = 'Pending';
            if (report.offline) {
                statusText = 'Pending Sync';
            } else if (report.status) {
                statusText = capitalizeFirstLetter((report.status || '').replace('_', ' '));
            }
            
            // Safe priority text
            const priorityText = capitalizeFirstLetter(report.priority || 'medium');
            
            // Build HTML
            reportElement.innerHTML = `
                <div class="report-header">
                    <div class="report-location">${report.location || 'Unknown location'}</div>
                    <div class="report-date">${formattedDate}</div>
                </div>
                <div class="report-details">
                    <div class="report-priority">
                        <i class="fas fa-exclamation-circle"></i> ${priorityText} Priority
                    </div>
                    <div class="report-status ${statusClass}">
                        <i class="fas ${getStatusIcon(report.status, report.offline)}"></i> 
                        ${statusText}
                    </div>
                </div>
            `;
            
            return reportElement;
        } catch (error) {
            console.error('Error creating report element:', error, report);
            // Return a fallback element
            const fallbackElement = document.createElement('div');
            fallbackElement.className = 'report-item';
            fallbackElement.textContent = 'Error displaying report';
            return fallbackElement;
        }
    }
    
    // Helper function to get icon for status
    function getStatusIcon(status, offline) {
        try {
            if (offline) return 'fa-clock';
            
            // Make sure status is a string
            const statusStr = String(status || '');
            
            switch (statusStr) {
                case 'completed': return 'fa-check-circle';
                case 'in_progress': return 'fa-spinner fa-spin';
                default: return 'fa-hourglass-half';
            }
        } catch (error) {
            console.error('Error in getStatusIcon:', error);
            return 'fa-exclamation-circle'; // Fallback icon
        }
    }
    
    // Reset the form after submission
    function resetForm() {
        // Reset form fields
        // Location field has been removed
        document.getElementById('description').value = '';
        document.getElementById('priority').value = 'medium';
        document.getElementById('anonymous-report').checked = false;
        
        // Clear photo grid (except for the add button)
        const photoGrid = document.getElementById('photo-grid');
        const addPhotoBtn = document.getElementById('add-photo');
        photoGrid.innerHTML = '';
        photoGrid.appendChild(addPhotoBtn);
        
        // Reset trash type and size selection
        document.querySelectorAll('.trash-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        document.querySelectorAll('.size-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Reset submit button
        const submitBtn = document.getElementById('submit-report');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        }
        
        // Reset reportData object
        reportData.photos = [];
        reportData.trashType = null;
        reportData.size = null;
        reportData.isAnonymous = false;
        // Location description field has been removed, using a generic name instead
        reportData.location = 'Reported illegal dumping';
        reportData.latitude = null;
        reportData.longitude = null;
        reportData.description = null;
        reportData.priority = null;
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Show toast message
    function showToast(message) {
        // Check if toast container exists, create if not
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        // Show the toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Hide and remove the toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
    }
});
