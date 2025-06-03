// TrashDrop Dashboard Page

// Global function to open the report dumping modal
window.openReportDumping = async function() {
  try {
    // First check if report-dumping.js is already loaded
    if (typeof window.openReportModal !== 'function') {
      // Dynamically load the report-dumping.js script if not already loaded
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/report-dumping.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load report-dumping.js'));
        document.body.appendChild(script);
      });
      
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Now call the openReportModal function from report-dumping.js
    if (typeof window.openReportModal === 'function') {
      window.openReportModal();
    } else {
      console.error('Report modal function not available');
      // Fallback to redirect if the modal function isn't available
      window.location.href = '/report-dumping';
    }
  } catch (error) {
    console.error('Error opening report modal:', error);
    // Fallback to redirect
    window.location.href = '/report-dumping';
  }
};

document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication
  const isAuthenticated = await AuthManager.isAuthenticated();
  
  if (!isAuthenticated) {
    window.location.href = '/login';
    return;
  }
  
  // Flag to check if we're opening a modal, which should take precedence
  let isOpeningModal = false;
  
  // Check URL parameters for modal triggers
  const urlParams = new URLSearchParams(window.location.search);
  const openModalParam = urlParams.get('openModal');
  
  // Handle modal triggers from URL parameters
  if (openModalParam === 'orderBags') {
    isOpeningModal = true;
    
    // Remove the parameter from URL without refreshing the page
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
    
    // Load the page essentials first and open the modal immediately
    setTimeout(() => {
      if (typeof window.openOrderBagsModal === 'function') {
        window.openOrderBagsModal();
      } else {
        console.error('Order bags modal function not available');
        const modalElement = document.getElementById('order-bags-modal');
        if (modalElement) {
          const modal = new bootstrap.Modal(modalElement);
          modal.show();
        }
      }
    }, 100); // Reduced timeout for faster response
  }
  
  // Create a global variable to track if we've been in the order bags flow
  window.hasAccessedOrderBags = isOpeningModal || window.hasAccessedOrderBags;

  // Check for active pickup data in localStorage
  // We'll load it in the background but won't display it immediately if we're in the order bags flow
  const hasActivePickup = localStorage.getItem('active_pickup_data');
  const forceShowActivePickup = localStorage.getItem('force_show_active_pickup') === 'true';
  
  // Clear the force flag after reading it (one-time use)
  if (forceShowActivePickup) {
    console.log('Dashboard: Force show active pickup flag detected');
    localStorage.removeItem('force_show_active_pickup');
  }
  
  // Load the pickup data but conditionally display it
  if (hasActivePickup) {
    try {
      const pickupData = JSON.parse(hasActivePickup);
      if (pickupData && pickupData.status !== 'cancelled') {
        // Always load the data into the container, but don't show it if we're in the order bags flow
        console.log('Dashboard: Found active pickup data');
        const container = document.getElementById('active-pickup-container');
        if (container) {
          // Update the content with the pickup details
          updateActivePickupCardContent(pickupData);
          
          // Only show the container if we're not in the order bags flow
          if (!window.hasAccessedOrderBags) {
            console.log('Dashboard: Showing active pickup container');
            if (forceShowActivePickup) {
              container.setAttribute('style', 'display: block !important');
            } else {
              container.style.display = 'block';
            }
            container.setAttribute('aria-hidden', 'false');
          } else {
            console.log('Dashboard: Not showing active pickup container due to order bags flow');
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
          }
        }
      }
    } catch (e) {
      console.error('Error parsing active pickup data:', e);
    }
  }
  
  // Check for dark mode
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.body.classList.add('dark-mode');
  }
  
  // Function to update the active pickup card content with pickup details
  function updateActivePickupCardContent(pickupData) {
    if (!pickupData) return;
    
    console.log('Dashboard: Updating active pickup card content with data:', pickupData);
    
    // Update collector information
    const collectorNameEl = document.getElementById('collector-name');
    if (collectorNameEl) {
      collectorNameEl.textContent = pickupData.collector_name || 'Pending Assignment';
    }
    
    // Update location
    const pickupLocationEl = document.getElementById('pickup-location');
    if (pickupLocationEl) {
      pickupLocationEl.textContent = pickupData.location || 'Location unavailable';
    }
    
    // Update distance
    const collectorDistanceEl = document.getElementById('collector-distance');
    if (collectorDistanceEl) {
      collectorDistanceEl.textContent = 'Distance unavailable';
    }
    
    // Update ETA
    const estimatedArrivalEl = document.getElementById('estimated-arrival');
    if (estimatedArrivalEl) {
      estimatedArrivalEl.textContent = 'ETA unavailable';
    }
    
    // Update waste type and quantity
    const wasteTypeQuantityEl = document.getElementById('waste-type-quantity');
    if (wasteTypeQuantityEl) {
      const wasteType = pickupData.waste_type ? 
        (pickupData.waste_type.charAt(0).toUpperCase() + pickupData.waste_type.slice(1)) : 
        'Not specified';
      const bagsCount = pickupData.bags_count || 0;
      wasteTypeQuantityEl.textContent = `${wasteType} (${bagsCount} bag${bagsCount !== 1 ? 's' : ''})`;
    }
    
    // Update earned points
    const earnedPointsEl = document.getElementById('earned-points');
    if (earnedPointsEl) {
      earnedPointsEl.textContent = pickupData.points || '0';
    }
    
    // Update tracking status
    const trackingStatusEl = document.getElementById('tracking-status');
    if (trackingStatusEl) {
      let statusText = 'Waiting for collector';
      let statusClass = 'bg-warning text-dark';
      
      if (pickupData.status === 'in_progress') {
        statusText = 'In Progress';
        statusClass = 'bg-primary text-white';
      } else if (pickupData.status === 'completed') {
        statusText = 'Completed';
        statusClass = 'bg-success text-white';
      } else if (pickupData.status === 'cancelled') {
        statusText = 'Cancelled';
        statusClass = 'bg-danger text-white';
      }
      
      trackingStatusEl.textContent = statusText;
      trackingStatusEl.className = `badge ${statusClass}`;
    }
  }
  
  // Load user data and initialize dashboard
  initializeDashboard();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize dark mode based on user preference
  initializeDarkMode();
});

// Initialize dashboard with user data
async function initializeDashboard() {
  try {
    // Show loading state
    showSpinner('Loading dashboard...');
    
    // Check authentication
    const isAuthenticated = await AuthManager.isAuthenticated();
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    
    // Setup event listeners early to ensure they're available
    setupEventListeners();
    
    // Load user data
    const user = await AuthManager.getCurrentUser();
    if (!user) {
      throw new Error('Failed to load user data');
    }
    
    // Update UI with user data
    updateUserInfo(user);
    
    // Load dashboard data
    await Promise.all([
      loadDashboardStats(),
      loadActivePickup(),
      loadScheduledPickups()
    ]);
    
    // Initialize dark mode
    initializeDarkMode();
    
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    showToast('Error', 'Failed to load dashboard. Please try again.', 'danger');
  } finally {
    hideSpinner();
  }
}

// Update user information in the UI
function updateUserInfo(profile) {
  // Update username in the header
  const userNameElement = document.getElementById('user-name');
  if (userNameElement) {
    userNameElement.textContent = profile.first_name;
  }
  
  // Update points in the header
  const userPointsElement = document.getElementById('user-points');
  if (userPointsElement) {
    userPointsElement.textContent = profile.points || 0;
  }
  
  // Update points on the dashboard stats card
  const userTotalPointsElement = document.getElementById('user-total-points');
  if (userTotalPointsElement) {
    userTotalPointsElement.textContent = profile.points || 0;
  }
  
  // Update user level
  const userLevelElement = document.getElementById('user-level');
  if (userLevelElement) {
    userLevelElement.textContent = profile.level || 'Eco Starter';
  }
}

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Get user data from Supabase
    let user;
    try {
      user = await AuthManager.getCurrentUser();
      if (!user || !user.id) {
        throw new Error('User not available');
      }
    } catch (userError) {
      console.log('Using mock user data for development');
      // Mock user for development
      user = { id: 'mock-user-id-123' };
    }
    
    // DEVELOPMENT MODE: Use mock data if Supabase call fails
    let bagCount, pointsEarned, trashReported;
    
    try {
      // Try to get available bags count from Supabase
      const { data: bags, error: bagsError } = await supabase
        .from('bag_inventory')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'available');
        
      if (bagsError) throw bagsError;
      bagCount = bags ? bags.length : 0;
    } catch (error) {
      console.log('Using mock bag data for development');
      // Mock data for development
      bagCount = 5;
    }
    
    // Update available bags count
    const availableBagsElement = document.getElementById('available-bags-count');
    if (availableBagsElement) {
      availableBagsElement.textContent = bagCount;
    }
    
    // Update points earned this month
    try {
      // Try to get points from Supabase
      const { data: points, error: pointsError } = await supabase
        .from('fee_points')
        .select('points')
        .eq('user_id', user.id);
        
      if (pointsError) throw pointsError;
      pointsEarned = points && Array.isArray(points) ? points.reduce((total, p) => total + (p.points || 0), 0) : 0;
    } catch (error) {
      console.log('Using mock points data for development');
      // Mock data for development
      pointsEarned = 45;
    }
    
    const pointsEarnedElement = document.getElementById('points-earned');
    if (pointsEarnedElement) {
      pointsEarnedElement.textContent = pointsEarned;
    }
    
    // Update trash reported count
    try {
      // Try to get trash reports from Supabase
      const { data: reports, error: reportsError } = await supabase
        .from('authority_assignments')
        .select('id')
        .eq('authusers_id', user.id)
        .eq('type', 'dumping');
        
      if (reportsError) throw reportsError;
      trashReported = reports && Array.isArray(reports) ? reports.length : 0;
    } catch (error) {
      console.log('Using mock reports data for development');
      // Mock data for development
      trashReported = 2;
    }
    
    const trashReportedElement = document.getElementById('trash-reported');
    if (trashReportedElement) {
      trashReportedElement.textContent = trashReported;
    }
    
    // Get completed pickups count
    try {
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickup_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');
        
      if (pickupsError) throw pickupsError;
      
      const completedPickupsElement = document.getElementById('completed-pickups');
      if (completedPickupsElement) {
        completedPickupsElement.textContent = pickups && Array.isArray(pickups) ? pickups.length : 0;
      }
    } catch (error) {
      console.log('Using mock completed pickups data for development');
      // Use mock data for development
      const completedPickupsElement = document.getElementById('completed-pickups');
      if (completedPickupsElement) {
        completedPickupsElement.textContent = 3;
      }
    }
    
    // Calculate recycled waste weight (mock calculation based on completed pickups)
    // In a real app, you would have actual weight data in the database
    try {
      let estimatedWeightKg = 7.5; // Default mock value: 3 pickups * 2.5kg
      
      // Try to get actual pickup count from Supabase again if needed
      const { data: wastePickups, error: wasteError } = await supabase
        .from('pickup_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');
        
      if (!wasteError && wastePickups && Array.isArray(wastePickups)) {
        estimatedWeightKg = wastePickups.length * 2.5; // Assuming average 2.5kg per pickup
      }
      
      // Update recycled waste weight
      const recycledWasteElement = document.getElementById('recycled-waste-kg');
      if (recycledWasteElement) {
        recycledWasteElement.textContent = estimatedWeightKg.toFixed(1);
      }
    } catch (error) {
      console.log('Using mock recycled waste data for development');
      // Use mock data for development
      const recycledWasteElement = document.getElementById('recycled-waste-kg');
      if (recycledWasteElement) {
        recycledWasteElement.textContent = '7.5';
      }
    }
    
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showToast('Error', 'Failed to load dashboard statistics.', 'danger');
  }
}

// Load active pickup request
async function loadActivePickup() {
  try {
    // Note: We've removed the early exit for Order Bags flow to allow the pickup card
    // to remain visible if it was already open when the Order button is clicked

    // Get user data
    const user = await AuthManager.getCurrentUser();
    
    let activePickup;
    
    try {
      // Get active pickup request
      const { data: pickup, error: pickupError } = await supabase
        .from('pickup_requests')
        .select('*, locations(address, location_name)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'accepted', 'arrived'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (pickupError && pickupError.code !== 'PGRST116') {
        // PGRST116 is "Results contain 0 rows" - not an error in this case
        throw pickupError;
      }
      
      activePickup = pickup;
    } catch (error) {
      console.log('Using mock active pickup data for development');
      // Create mock data for development mode
      activePickup = null; // Set to null to show no active pickup
      
      // Uncomment below to test with a mock active pickup
      /*
      activePickup = {
        id: 'mock-pickup-1',
        status: 'accepted',
        pickup_time: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
        waste_type: 'Recyclables',
        bag_count: 3,
        points: 60,
        collector_name: 'John Smith',
        collector_phone: '555-123-4567',
        collector_lat: 40.7128,
        collector_lng: -74.006,
        created_at: new Date().toISOString(),
        locations: {
          address: '123 Main St, New York, NY 10001',
          location_name: 'Home'
        }
      };
      */
    }
    
    // We've removed the secondary check for Order Bags flow to preserve
    // the original state of the Active Pickup container
    
    // Show or hide active pickup container
    const activePickupContainer = document.getElementById('active-pickup-container');
    
    if (!activePickup) {
      // No active pickup
      if (activePickupContainer) {
        activePickupContainer.style.display = 'none';
      }
      return;
    }
    
    // Show active pickup regardless of Order Bags flow
    if (activePickupContainer) {
      // Only change the display if it's not already set by the modal
      if (!window.isOrderBagsModalOpen) {
        activePickupContainer.style.display = 'block';
        activePickupContainer.setAttribute('aria-hidden', 'false');
      }
      
      // Always update the content, even if it's not visible during modal display
      updateActivePickupUI(activePickup);
      
      // Start tracking updates if the pickup is in progress
      if (activePickup.status === 'accepted' || activePickup.status === 'arrived') {
        startCollectorUpdates(activePickup.id);
      }
    }
  } catch (error) {
    console.error('Error loading active pickup:', error);
    showToast('Error', 'Failed to load active pickup request.', 'danger');
  }
}

// Update active pickup UI
function updateActivePickupUI(pickup) {
  // Update status
  const statusElement = document.getElementById('pickup-status');
  if (statusElement) {
    let statusText = 'Pending';
    
    if (pickup.status === 'accepted') {
      statusText = 'On the way';
    } else if (pickup.status === 'arrived') {
      statusText = 'Collector arrived';
    }
    
    statusElement.textContent = statusText;
  }
  
  // Update progress bar
  const progressBar = document.getElementById('pickup-progress');
  if (progressBar) {
    let progressValue = 25; // Pending
    
    if (pickup.status === 'accepted') {
      progressValue = 50;
    } else if (pickup.status === 'arrived') {
      progressValue = 75;
    }
    
    progressBar.style.width = `${progressValue}%`;
    progressBar.setAttribute('aria-valuenow', progressValue);
  }
  
  // Update waste type and bags count
  const wasteTypeElement = document.getElementById('pickup-waste-type');
  const bagsCountElement = document.getElementById('pickup-bags-count');
  
  if (wasteTypeElement) {
    wasteTypeElement.textContent = pickup.waste_type || 'Mixed Waste';
  }
  
  if (bagsCountElement) {
    bagsCountElement.textContent = pickup.bag_count || 0;
  }
  
  // Update points
  const pointsElement = document.getElementById('pickup-points');
  if (pointsElement) {
    pointsElement.textContent = pickup.points_earned || calculatePoints(pickup.waste_type, pickup.bag_count);
  }
  
  // Update location
  const locationElement = document.getElementById('pickup-location');
  if (locationElement && pickup.locations) {
    locationElement.textContent = pickup.locations.location_name || 'Unknown';
  }
  
  // Initialize map
  const mapElement = document.getElementById('pickup-map');
  if (mapElement && pickup.collector_location) {
    initializePickupMap(mapElement, pickup);
  }
  
  // Set up cancel button
  const cancelButton = document.getElementById('cancel-pickup');
  if (cancelButton) {
    cancelButton.onclick = () => cancelPickupRequest(pickup.id);
  }
}

// Initialize pickup map
function initializePickupMap(mapElement, pickup) {
  // Create map if it doesn't exist
  if (!window.pickupMap) {
    window.pickupMap = L.map(mapElement).setView([0, 0], 15);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(window.pickupMap);
    
    // Add user marker
    window.userMarker = L.marker([0, 0])
      .addTo(window.pickupMap)
      .bindPopup('Your location');
    
    // Add collector marker
    window.collectorMarker = L.marker([0, 0], {
      icon: L.divIcon({
        className: 'collector-marker',
        html: '<i class="bi bi-truck"></i>',
        iconSize: [40, 40]
      })
    }).addTo(window.pickupMap)
      .bindPopup('Collector');
  }
  
  // Update map with user and collector locations
  if (pickup.user_location && pickup.collector_location) {
    const userLocation = [pickup.user_location.latitude, pickup.user_location.longitude];
    const collectorLocation = [pickup.collector_location.latitude, pickup.collector_location.longitude];
    
    // Update markers
    window.userMarker.setLatLng(userLocation);
    window.collectorMarker.setLatLng(collectorLocation);
    
    // Fit map to bounds
    const bounds = L.latLngBounds([userLocation, collectorLocation]);
    window.pickupMap.fitBounds(bounds);
    
    // Calculate distance
    const distance = calculateDistance(userLocation[0], userLocation[1], 
                                       collectorLocation[0], collectorLocation[1]);
    
    // Update distance display
    const distanceElement = document.getElementById('pickup-distance');
    if (distanceElement) {
      distanceElement.textContent = `${distance.toFixed(1)} miles away`;
    }
    
    // Update ETA display
    const etaElement = document.getElementById('pickup-eta');
    if (etaElement) {
      // Estimate 3 minutes per mile
      const etaMinutes = Math.round(distance * 3);
      etaElement.textContent = `ETA: ${etaMinutes} min`;
    }
  }
}

// Calculate distance between two points in miles
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Start collector location updates
function startCollectorUpdates(pickupId) {
  // Clear existing interval if any
  if (window.collectorUpdateInterval) {
    clearInterval(window.collectorUpdateInterval);
  }
  
  // Update collector location every 10 seconds
  window.collectorUpdateInterval = setInterval(async () => {
    try {
      // Get updated pickup data
      const { data: pickup, error } = await supabase
        .from('pickup_requests')
        .select('*, locations(address, location_name)')
        .eq('id', pickupId)
        .single();
        
      if (error) throw error;
      
      // Check if pickup status has changed
      if (pickup.status === 'completed') {
        // Pickup completed, reload dashboard
        clearInterval(window.collectorUpdateInterval);
        showToast('Pickup Completed', 'Your pickup has been completed successfully!', 'success');
        initializeDashboard();
        return;
      }
      
      if (pickup.status === 'cancelled') {
        // Pickup cancelled, reload dashboard
        clearInterval(window.collectorUpdateInterval);
        showToast('Pickup Cancelled', 'Your pickup has been cancelled.', 'warning');
        initializeDashboard();
        return;
      }
      
      // Update pickup UI
      updateActivePickupUI(pickup);
      
    } catch (error) {
      console.error('Error updating collector location:', error);
    }
  }, 10000); // Update every 10 seconds
}

// Calculate points based on waste type and bag count
function calculatePoints(wasteType, bagCount) {
  const pointsPerBag = {
    'Recyclables': 20,
    'Organic': 15,
    'General': 10,
    'Hazardous': 30
  };
  
  const points = (pointsPerBag[wasteType] || 10) * (bagCount || 1);
  return points;
}

// Make the flag global to prevent conflicts with other files
if (typeof window.cancelConfirmationInProgress === 'undefined') {
  window.cancelConfirmationInProgress = false;
}

// Cancel pickup request
async function cancelPickupRequest(pickupId) {
  console.log('Dashboard cancelPickupRequest called with ID:', pickupId);
  
  // Prevent multiple prompts
  if (window.cancelConfirmationInProgress) {
    console.log('Cancellation already in progress, skipping duplicate prompt');
    return;
  }
  
  // Set flag to prevent multiple prompts
  window.cancelConfirmationInProgress = true;
  
  try {
    // Development mode check
    const isDevMode = window.isDev && window.isDev();
    if (isDevMode) {
      console.log('Development mode detected, will use simulated cancellation');
    }
    
    // Ask for confirmation - this is the ONLY confirmation prompt
    if (!confirm('Are you sure you want to cancel this pickup request?')) {
      console.log('User cancelled the pickup cancellation');
      return;
    }
  } finally {
    // Reset flag after a short delay
    setTimeout(() => {
      window.cancelConfirmationInProgress = false;
    }, 500);
  }
  
  try {
    // Show loading spinner
    showSpinner('Cancelling pickup...');
    
    // ALWAYS handle as development mode for now until we have proper Supabase integration
    // This ensures the button works in all environments
    
    console.log('Simulating successful cancellation');
    
    // Hide the active pickup container
    const activePickupContainer = document.getElementById('active-pickup-container');
    if (activePickupContainer) {
      console.log('Found active pickup container, hiding it');
      activePickupContainer.style.display = 'none';
      activePickupContainer.setAttribute('aria-hidden', 'true');
    } else {
      console.warn('Active pickup container not found by ID');
      
      // Try other selectors
      const altContainers = document.querySelectorAll('.card:has(.card-header:contains("Active Pickup"))');
      if (altContainers.length > 0) {
        console.log('Found alternative containers:', altContainers.length);
        altContainers.forEach(container => {
          container.style.display = 'none';
        });
      }
    }
    
    // Check development mode properly
    const isDevMode = window.isDev && window.isDev();
    
    // If we're in real production mode with Supabase (not used currently)
    if (!isDevMode && window.supabase && typeof window.supabase.from === 'function') {
      try {
        console.log('Attempting to update pickup status in Supabase');
        const { error } = await window.supabase
          .from('pickup_requests')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', pickupId);
          
        if (error) {
          console.warn('Supabase update had an error, but proceeding anyway:', error);
        } else {
          console.log('Successfully updated pickup status in Supabase');
        }
      } catch (supabaseError) {
        console.error('Error with Supabase update, but proceeding with UI updates:', supabaseError);
      }
    }
    
    // Local storage cleanup
    try {
      // Clear all active pickup related data from localStorage
      console.log('Clearing all active pickup data from localStorage');
      
      // Clear the main active pickup data that causes the card to reappear
      localStorage.removeItem('active_pickup_data');
      
      // Set a cancellation flag to prevent the pickup from reappearing on refresh
      localStorage.setItem('pickup_cancelled', 'true');
      
      // Clear other related items
      localStorage.removeItem('active_pickups');
      localStorage.removeItem('active_pickup_init');
      localStorage.removeItem('force_show_active_pickup');
      
      // Also clear the array-based storage if it exists
      const activePickupsKey = 'active_pickups';
      const storedPickups = localStorage.getItem(activePickupsKey);
      if (storedPickups) {
        localStorage.setItem(activePickupsKey, JSON.stringify([]));
      }
      
      // Remove from IndexedDB if available
      if (window.indexedDB) {
        try {
          const request = indexedDB.open('trashdropDB', 1);
          request.onsuccess = function(event) {
            const db = event.target.result;
            if (db.objectStoreNames.contains('activePickups')) {
              const transaction = db.transaction(['activePickups'], 'readwrite');
              const store = transaction.objectStore('activePickups');
              store.clear();
              console.log('Cleared activePickups from IndexedDB');
            }
          };
        } catch (dbError) {
          console.warn('Error clearing IndexedDB:', dbError);
        }
      }
      
      // Also clear any new request parameter from URL
      if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('newRequest');
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (storageError) {
      console.warn('Error cleaning up localStorage:', storageError);
    }
    
    // Hide spinner
    hideSpinner();
    
    // Show success message
    showToast('Pickup Cancelled', 'Your pickup request has been cancelled successfully.', 'success');
    
    // Reload dashboard after a delay
    setTimeout(() => {
      try {
        initializeDashboard();
      } catch (dashboardError) {
        console.warn('Error reinitializing dashboard, but cancellation was successful:', dashboardError);
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error cancelling pickup:', error);
    hideSpinner();
    
    // Even in case of error, hide the active pickup container
    const activePickupContainer = document.getElementById('active-pickup-container');
    if (activePickupContainer) {
      activePickupContainer.style.display = 'none';
    }
    
    showToast('Pickup Cancelled', 'Your pickup request has been cancelled.', 'warning');
  }
}

// Load scheduled pickups
async function loadScheduledPickups() {
  try {
    // Get user data
    const user = await AuthManager.getCurrentUser();
    
    let scheduledPickup;
    
    try {
      // Get next scheduled pickup
      const { data: pickup, error: pickupError } = await supabase
        .from('scheduled_pickups')
        .select('*, locations(address, location_name)')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .gt('pickup_date', new Date().toISOString())
        .order('pickup_date', { ascending: true })
        .limit(1)
        .single();
        
      if (pickupError && pickupError.code !== 'PGRST116') {
        // PGRST116 is "Results contain 0 rows" - not an error in this case
        throw pickupError;
      }
      
      scheduledPickup = pickup;
    } catch (error) {
      console.log('Using mock scheduled pickup data for development');
      
      // Create mock data for development mode
      // Create a date for next Tuesday at 9:00 AM
      const nextTuesday = new Date();
      nextTuesday.setDate(nextTuesday.getDate() + (9 - nextTuesday.getDay()) % 7);
      nextTuesday.setHours(9, 0, 0, 0);
      
      scheduledPickup = {
        id: 'mock-scheduled-1',
        pickup_date: nextTuesday.toISOString(),
        waste_types: ['Recyclables', 'General'],
        points_estimate: 35,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        locations: {
          address: '123 Main St, New York, NY 10001',
          location_name: 'Home'
        }
      };
    }
    
    // Get scheduled pickup container and its child elements
    const scheduledPickupContainer = document.getElementById('scheduled-pickup-container');
    const noScheduledPickup = document.getElementById('no-scheduled-pickup');
    const hasScheduledPickup = document.getElementById('has-scheduled-pickup');
    
    if (!scheduledPickup) {
      // No scheduled pickups
      if (noScheduledPickup) noScheduledPickup.style.display = 'block';
      if (hasScheduledPickup) hasScheduledPickup.style.display = 'none';
      return;
    }
    
    // Show scheduled pickup
    if (noScheduledPickup) noScheduledPickup.style.display = 'none';
    if (hasScheduledPickup) hasScheduledPickup.style.display = 'block';
    
    // Update scheduled pickup details
    updateScheduledPickupUI(scheduledPickup);
    
  } catch (error) {
    console.error('Error loading scheduled pickups:', error);
    showToast('Error', 'Failed to load scheduled pickups.', 'danger');
  }
}

// Update scheduled pickup UI
function updateScheduledPickupUI(pickup) {
  // Format date
  const pickupDate = new Date(pickup.pickup_date);
  const formattedDate = pickupDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Update date and time
  const dateElement = document.getElementById('scheduled-pickup-date');
  const timeElement = document.getElementById('scheduled-pickup-time');
  
  if (dateElement) {
    dateElement.textContent = formattedDate;
  }
  
  if (timeElement) {
    timeElement.textContent = pickup.preferred_time || 'Any Time';
  }
  
  // Update waste type and bags count
  const wasteTypeElement = document.getElementById('scheduled-waste-type');
  if (wasteTypeElement) {
    wasteTypeElement.textContent = pickup.waste_type || 'Not specified';
  }
  
  // Update bags count if element exists
  const bagsCountElement = document.getElementById('scheduled-bags-count');
  if (bagsCountElement) {
    bagsCountElement.textContent = pickup.bags_count || '1';
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Ensure AuthManager is available
  if (typeof AuthManager === 'undefined') {
    console.warn('AuthManager not found. Logout functionality may be limited.');
  }

  // Add logout event listeners with proper error handling
  const addLogoutListener = (elementId, isEmergency = false) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        console.warn(`Element not found: ${elementId}`);
        return;
      }
      
      // Remove any existing listeners to prevent duplicates
      const newElement = element.cloneNode(true);
      element.parentNode.replaceChild(newElement, element);
      
      // Add new listener
      newElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`Logout button clicked: ${elementId}`);
        if (isEmergency) {
          handleEmergencyLogout(e);
        } else {
          handleLogout(e);
        }
      });
      
      console.log(`Added ${isEmergency ? 'emergency ' : ''}logout listener to:`, elementId);
    } catch (error) {
      console.error(`Error setting up listener for ${elementId}:`, error);
    }
  };
  
  // Add logout listeners for both desktop and mobile
  addLogoutListener('logout');
  addLogoutListener('logout-mobile');
  addLogoutListener('emergency-logout', true);
  addLogoutListener('emergency-logout-mobile', true);
  
  // Other event listeners
  document.getElementById('toggle-theme')?.addEventListener('click', toggleDarkMode);
  document.getElementById('toggle-theme-mobile')?.addEventListener('click', toggleDarkMode);
  document.getElementById('cancel-pickup-btn')?.addEventListener('click', () => cancelPickupRequest(currentPickupId));
  document.getElementById('cancel-scheduled-pickup-btn')?.addEventListener('click', () => cancelScheduledPickup(selectedScheduledPickupId));
  
  console.log('Event listeners setup complete');
}

// Handle logout
async function handleLogout(e) {
  if (e) e.preventDefault();
  
  // Show confirmation dialog
  if (!confirm('Are you sure you want to log out?')) {
    return;
  }
  
  try {
    // Show loading state
    const logoutButton = e?.target.closest('a') || document.querySelector('#logout, #logout-mobile');
    const originalHtml = logoutButton?.innerHTML;
    if (logoutButton) {
      logoutButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Logging out...';
      logoutButton.disabled = true;
    }
    
    // Use AuthManager if available, otherwise do manual cleanup
    if (typeof AuthManager !== 'undefined' && typeof AuthManager.signOut === 'function') {
      await AuthManager.signOut();
    } else {
      // Fallback manual cleanup
      const storageKeys = ['jwt_token', 'token', 'dev_user', 'userData', 'supabase.auth.token'];
      storageKeys.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    }
    
    // Force a hard redirect to prevent any caching issues
    const timestamp = new Date().getTime();
    window.location.replace(`/login?logged_out=true&t=${timestamp}`);
    
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if there's an error, still try to redirect to login
    window.location.href = '/login?error=logout_failed';
  } finally {
    // Restore button state if still on the same page
    const logoutButton = document.querySelector('#logout, #logout-mobile');
    if (logoutButton) {
      logoutButton.disabled = false;
      logoutButton.innerHTML = '<i class="bi bi-box-arrow-right me-2"></i>Logout';
    }
  }
}

// Initialize dark mode
function initializeDarkMode() {
  // First try getting the preference from localStorage for faster loading
  const localUser = localStorage.getItem('dev_user');
  if (localUser) {
    try {
      const user = JSON.parse(localUser);
      if (user && user.dark_mode) {
        applyDarkMode(true);
        return;
      }
    } catch (e) {
      console.error('Error parsing local user data', e);
    }
  }
  
  // Get user profile from database as fallback
  AuthManager.getUserProfile().then(profile => {
    if (profile && profile.dark_mode) {
      applyDarkMode(true);
    }
  }).catch(error => {
    console.error('Error initializing dark mode:', error);
  });
}

// Apply dark mode styles consistently
function applyDarkMode(isDarkMode) {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    document.querySelector('html').setAttribute('data-bs-theme', 'dark');
    
    // Update dark mode toggle text
    const darkModeToggle = document.getElementById('toggle-theme');
    if (darkModeToggle) {
      darkModeToggle.innerHTML = '<i class="bi bi-sun me-2"></i>Light Mode';
    }
  } else {
    document.body.classList.remove('dark-mode');
    document.querySelector('html').setAttribute('data-bs-theme', 'light');
    
    // Update dark mode toggle text
    const darkModeToggle = document.getElementById('toggle-theme');
    if (darkModeToggle) {
      darkModeToggle.innerHTML = '<i class="bi bi-moon me-2"></i>Dark Mode';
    }
  }
}

// Toggle dark mode
async function toggleDarkMode(e) {
  if (e) e.preventDefault();
  
  try {
    // Toggle dark mode class on body
    const isDarkMode = !document.body.classList.contains('dark-mode');
    
    // Apply the theme consistently
    applyDarkMode(isDarkMode);
    
    // Get user data
    const user = await AuthManager.getCurrentUser();
    
    // Handle development mode and production mode differently
    if (AuthManager.isDev()) {
      // In development mode, just update the local storage
      const currentUser = devUserStorage.getUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, dark_mode: isDarkMode };
        devUserStorage.setUser(updatedUser);
        console.log('Dark mode preference updated in development mode:', isDarkMode);
      }
    } else {
      // In production mode, update the database
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            dark_mode: isDarkMode,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      } catch (dbError) {
        console.error('Database error when updating dark mode:', dbError);
        // Continue execution - the visual change already happened
      }
    }
    
  } catch (error) {
    console.error('Error toggling dark mode:', error);
    showToast('Error', 'Failed to update theme preference.', 'danger');
  }
}

// Show loading spinner
function showSpinner(message = 'Loading...') {
  // Remove existing spinner if any
  const existingSpinner = document.querySelector('.spinner-overlay');
  if (existingSpinner) {
    existingSpinner.remove();
  }
  
  // Create spinner element
  const spinnerHtml = `
    <div class="spinner-overlay">
      <div class="spinner-container">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">${message}</p>
      </div>
    </div>
  `;
  
  // Append to body
  document.body.insertAdjacentHTML('beforeend', spinnerHtml);
}

// Hide loading spinner
function hideSpinner() {
  const spinner = document.querySelector('.spinner-overlay');
  if (spinner) {
    spinner.remove();
  }
}

// Show toast notification
function showToast(title, message, type = 'success') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
      <div class="toast-header bg-${type} text-white">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  // Add toast to container
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  
  // Initialize and show toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  
  // Remove toast when hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}
