/**
 * TrashDrop - Report Dumping Module
 * 
 * Handles illegal dumping reporting, photo capture, location selection,
 * and submission to the backend or local storage when offline.
 * 
 * @version 2.0.0
 * @author TrashDrop Engineering
 */

// Configuration helpers
const getConfig = (key, defaultValue) => {
    if (window.AppConfig && window.AppConfig.get) {
        return window.AppConfig.get(key) || defaultValue;
    }
    return defaultValue;
};

// Development mode check using AppConfig if available
const isDevelopment = () => {
    if (window.AppConfig && window.AppConfig.get) {
        // Check environment config first
        const environment = window.AppConfig.get('app.environment');
        if (environment === 'development') return true;
        
        // Check feature flags
        const devMode = window.AppConfig.get('features.developmentMode');
        if (devMode) return true;
    }
    
    // Fall back to hostname check
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '' ||
           hostname.includes('ngrok');
};

// Development user data
const getDevUser = () => {
    // Try to get from AuthManager first if available
    if (window.AuthManager && window.AuthManager.getDevUser) {
        const authDevUser = window.AuthManager.getDevUser();
        if (authDevUser) return authDevUser;
    }
    
    return {
        id: 'dev-user-' + Date.now(),
        email: getConfig('development.defaultUserEmail', 'dev@trashdrop.local'),
        name: getConfig('development.defaultUserName', 'Development User'),
        user_metadata: {
            name: getConfig('development.defaultUserName', 'Development User'),
            avatar_url: getConfig('development.defaultAvatarUrl', '/img/profile-placeholder.jpg')
        }
    };
};

// Global variables for report data and state
let reportData = {
    photos: [], // Will store photo data URLs
    trashType: null,
    size: null,
    isAnonymous: false
};

// Initialize shared variables
let map, marker;
// Get default coordinates from config or fall back to New York
let currentLatitude = getConfig('maps.defaultLatitude', 40.7128); 
let currentLongitude = getConfig('maps.defaultLongitude', -74.0060);
let mediaStream = null;
let cameraFacingMode = getConfig('camera.defaultFacingMode', 'environment'); // Start with rear camera
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
    try {
        // Wait for AppConfig to be initialized if possible
        if (window.AppConfig && !window.AppConfig.initialized) {
            try {
                await window.AppConfig.initialize();
                console.log('AppConfig initialized for report-dumping.js');
            } catch (configError) {
                console.warn('Failed to initialize AppConfig, using defaults', configError);
            }
        }
        
        if (window.AuthManager) {
            user = await window.AuthManager.getCurrentUser();
            if (!user) {
                const isAuthenticated = await window.AuthManager.isAuthenticated();
                if (!isAuthenticated) {
                    if (!isDevelopment()) {
                        const loginUrl = getConfig('routes.login', '/login');
                        window.location.href = loginUrl;
                        return;
                    }
                } else {
                    // Get user profile
                    user = await window.AuthManager.getUserProfile();
                }
            }
        } else if (!isDevelopment()) {
            console.error('AuthManager not available');
            const loginUrl = getConfig('routes.login', '/login');
            window.location.href = loginUrl;
            return;
        }
        
        // Use development user if in development mode and no user is authenticated
        if ((!user || !user.id) && isDevelopment()) {
            console.log('Using development user');
            user = getDevUser();
        }
    } catch (error) {
        console.error('Authentication error:', error);
        if (!isDevelopment()) {
            const loginUrl = getConfig('routes.login', '/login');
            window.location.href = loginUrl;
            return;
        }
        console.log('Continuing with development mode after auth error');
        user = getDevUser();
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
            
            // Get map configuration from AppConfig or use defaults
            const mapTileUrl = getConfig('maps.tileUrl', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
            const mapAttribution = getConfig('maps.attribution', '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
            const mapMaxZoom = getConfig('maps.maxZoom', 19);
            
            // Use configured tile layer
            L.tileLayer(mapTileUrl, {
                attribution: mapAttribution,
                maxZoom: mapMaxZoom
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
            
            /**
             * Uploads a photo and returns the public URL
             * @param {string} dataUrl - The data URL of the photo to upload
             * @returns {Promise<string>} - The URL of the uploaded photo or null if upload fails
             */
            async function uploadPhoto(dataUrl) {
                try {
                    // Get upload configuration from AppConfig
                    const enableCompression = getConfig('uploads.enableCompression', true);
                    const compressionQuality = getConfig('uploads.compressionQuality', 0.7);
                    const maxWidth = getConfig('uploads.maxWidth', 1200);
                    const maxHeight = getConfig('uploads.maxHeight', 1200);
                    
                    // If in development mode, we can use mock URLs to simulate uploads
                    if (isDevelopment()) {
                        const mockFileBaseUrl = getConfig('development.mockFileBaseUrl', 'https://storage.trashdrop.dev/photos/');
                        const mockFileName = 'photo-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '.jpg';
                        console.log('Using mock file upload URL for development:', mockFileBaseUrl + mockFileName);
                        // Simulate network delay
                        await new Promise(resolve => setTimeout(resolve, 500));
                        return mockFileBaseUrl + mockFileName;
                    }
                    
                    // In production, we'll upload to Supabase storage
                    // First, compress the image if enabled
                    let finalDataUrl = dataUrl;
                    if (enableCompression) {
                        finalDataUrl = await compressImage(dataUrl, compressionQuality, maxWidth, maxHeight);
                    }
                    
                    // Extract base64 data from data URL
                    const base64Data = finalDataUrl.split(',')[1];
                    if (!base64Data) {
                        throw new Error('Invalid data URL format');
                    }
                    
                    // Upload to Supabase storage
                    const fileName = 'report-photo-' + Date.now() + '.jpg';
                    const { data, error } = await supabase.storage
                        .from('report-photos')
                        .upload(`public/${user.id}/${fileName}`, decode(base64Data), {
                            contentType: 'image/jpeg',
                            upsert: true,
                        });
                    
                    if (error) {
                        console.error('Error uploading photo:', error);
                        return null;
                    }
                    
                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from('report-photos')
                        .getPublicUrl(`public/${user.id}/${fileName}`);
                    
                    return urlData.publicUrl;
                } catch (error) {
                    console.error('Error in uploadPhoto:', error);
                    return null;
                }
            }
            
            // Function to compress image using canvas
            async function compressImage(dataUrl, quality = 0.7, maxWidth = 1200, maxHeight = 1200) {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        // Calculate new dimensions
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                        
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                        
                        // Create canvas and draw image
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Get compressed data URL
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                        resolve(compressedDataUrl);
                    };
                    img.src = dataUrl;
                });
            }
            
            // Helper function to decode base64 data
            function decode(base64String) {
                const binaryString = atob(base64String);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes;
            }
            
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
        
        // Add the photo to the grid
        photoGrid.appendChild(photoItem);
    }

    // Function to handle offline reports
    async function syncOfflineReports() {
        try {
            const db = await openIndexedDB();
            const tx = db.transaction('offline-reports', 'readonly');
            const store = tx.objectStore('offline-reports');
            const reports = await store.getAll();
            
            if (reports.length > 0) {
                console.log(`Found ${reports.length} offline reports`);
                showToast(`Syncing ${reports.length} offline report(s)...`);
                
                // Process each offline report
                for (const report of reports) {
                    try {
                        await processOfflineReport(report, db);
                    } catch (processError) {
                        console.error('Error processing report:', processError);
                    }
                }
                
                showToast('All offline reports synced successfully!');
                loadPastReports(); // Refresh the list
            }
        } catch (error) {
            console.error('Error checking offline reports:', error);
            showToast('Error syncing some reports. They will be tried again later.');
        }
    }
    
    // Process a single offline report
    async function processOfflineReport(report, db) {
        try {
            console.log('Processing offline report:', report);
            
            // Upload the photos if there are any
            if (report.photos && report.photos.length > 0) {
                try {
                    // Get photo upload configuration
                    const uploadBatchSize = getConfig('uploads.batchSize', 3);
                    const uploadConcurrency = getConfig('uploads.concurrency', true);
                    const photoUrls = [];
                    
                    if (uploadConcurrency) {
                        // Concurrent uploads with configured batch size
                        const chunks = [];
                        for (let i = 0; i < report.photos.length; i += uploadBatchSize) {
                            chunks.push(report.photos.slice(i, i + uploadBatchSize));
                        }
                        
                        for (const chunk of chunks) {
                            const chunkResults = await Promise.all(chunk.map(photo => uploadPhoto(photo)));
                            photoUrls.push(...chunkResults.filter(url => url !== null));
                        }
                    } else {
                        // Sequential uploads
                        for (const photo of report.photos) {
                            const url = await uploadPhoto(photo);
                            if (url) photoUrls.push(url);
                        }
                    }
                    
                    // Update report with uploaded photo URLs
                    report.photos = photoUrls;
                    
                    console.log('Photos uploaded successfully');
                } catch (error) {
                    console.error('Photo upload failed:', error);
                }
                
                try {
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
                    throw error; // Re-throw to be caught by the caller
                }
            }
        } catch (error) {
            console.error('Error processing offline report:', error);
            throw error; // Re-throw to be caught by the caller
        }
    }
    
    // Initialize offline sync when appropriate
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            syncOfflineReports().catch(err => {
                console.error('Failed to sync offline reports:', err);
            });
        }, 3000); // Delay to ensure other initialization is complete
    });
    
    
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
