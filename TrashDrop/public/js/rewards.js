// TrashDrop Rewards Page

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const isAuthenticated = await AuthManager.isAuthenticated();
  
  if (!isAuthenticated) {
    window.location.href = '/login';
    return;
  }
  
  // Load user data and initialize page
  initializeRewardsPage();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize dark mode based on user preference
  initializeDarkMode();
});

// Initialize rewards page with user data
async function initializeRewardsPage() {
  // Show loading spinner
  showSpinner('Loading rewards...');
  
  try {
    // Get user profile
    let userProfile;
    try {
      userProfile = await AuthManager.getUserProfile();
    } catch (profileError) {
      console.warn('Error loading user profile:', profileError);
      userProfile = null;
    }
    
    if (userProfile) {
      // Update user info in the UI
      updateUserInfo(userProfile);
    }
    
    // Load data from Supabase
    try {
      const pointsData = await getUserPoints();
      updatePointsUI(pointsData);
    } catch (e) {
      console.error('Supabase getUserPoints failed, fallback to mock', e);
      loadMockPointsData();
    }

    try {
      const rewards = await getAvailableRewards();
      updateRewardsUI(rewards, pointsData?.totalPoints || 0);
    } catch (e) {
      console.error('Supabase getAvailableRewards failed, fallback to mock', e);
      loadMockRewards();
    }

    try {
      const history = await getPointsHistory();
      updatePointsHistoryUI(history);
    } catch (e) {
      console.error('Supabase getPointsHistory failed, fallback to mock', e);
      loadMockPointsHistory();
    }

  } catch (error) {
    console.error('Unhandled error initializing rewards page:', error);
    loadMockPointsData();
    loadMockRewards();
    loadMockPointsHistory();
  } finally {
    // Hide spinner when all attempts are complete
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
}

// Load user points data
async function loadPointsData() {
  try {
    // Get points data from the server
    const response = await fetch('/api/points/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtHelpers.getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch points data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update the UI with points data
    updatePointsUI(data);
    
    return data;
  } catch (error) {
    console.error('Error loading points data:', error);
    
    // Fall back to mock data if API returned 500 error
    if (error.message && error.message.includes('500')) {
      console.log('Falling back to mock points data');
      if (window.PointsAPI && typeof window.PointsAPI.getUserPoints === 'function') {
        try {
          const mockData = await window.PointsAPI.getUserPoints();
          updatePointsUI(mockData);
          return mockData;
        } catch (mockError) {
          console.error('Error loading mock points data:', mockError);
          loadMockPointsData(); // Use local fallback as last resort
        }
      } else {
        loadMockPointsData(); // Use local fallback
      }
      return null;
    }
    
    showToast('Error', 'Failed to load points data. Please try again.', 'danger');
    return null;
  }
}

// Load mock points data for development
function loadMockPointsData() {
  const mockData = {
    totalPoints: 250,
    userLevel: 'Eco Guardian',
    nextLevel: {
      level: 'Eco Warrior',
      threshold: 500,
      current: 250,
      progress: 50
    }
  };
  
  updatePointsUI(mockData);
}

// Update points UI elements
function updatePointsUI(data) {
  // Update total points
  const totalPointsElement = document.getElementById('total-points');
  if (totalPointsElement) {
    totalPointsElement.textContent = data.totalPoints;
  }
  
  // Update current level
  const currentLevelElement = document.getElementById('current-level');
  if (currentLevelElement) {
    currentLevelElement.textContent = data.userLevel;
  }
  
  // Update next level
  const nextLevelElement = document.getElementById('next-level');
  if (nextLevelElement) {
    nextLevelElement.textContent = data.nextLevel.level;
  }
  
  // Update progress bar
  const progressBarElement = document.getElementById('level-progress-bar');
  if (progressBarElement) {
    progressBarElement.style.width = `${data.nextLevel.progress}%`;
    progressBarElement.setAttribute('aria-valuenow', data.nextLevel.progress);
  }
  
  // Update progress text
  const progressTextElement = document.getElementById('level-progress-text');
  if (progressTextElement) {
    progressTextElement.textContent = `${data.nextLevel.current}/${data.nextLevel.threshold}`;
  }
  
  // Also update points in the navbar
  const userPointsElement = document.getElementById('user-points');
  if (userPointsElement) {
    userPointsElement.textContent = data.totalPoints;
  }
}

// Load available rewards
async function loadRewards() {
  try {
    // Get rewards from the server
    const response = await fetch('/api/points/rewards', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtHelpers.getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rewards: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update the UI with rewards data
    updateRewardsUI(data.availableRewards, data.totalPoints || 0);
    
    return data;
  } catch (error) {
    console.error('Error loading rewards:', error);
    
    // Fall back to mock data if API returned 500 error
    if (error.message && error.message.includes('500')) {
      console.log('Falling back to mock rewards data');
      if (window.PointsAPI && typeof window.PointsAPI.getAvailableRewards === 'function') {
        try {
          const mockData = await window.PointsAPI.getAvailableRewards();
          updateRewardsUI(mockData.availableRewards, mockData.totalPoints || 0);
          return mockData;
        } catch (mockError) {
          console.error('Error loading mock rewards data:', mockError);
          loadMockRewards(); // Use local fallback as last resort
        }
      } else {
        loadMockRewards(); // Use local fallback
      }
      return null;
    }
    
    showToast('Error', 'Failed to load rewards. Please try again.', 'danger');
    return null;
  }
}

// Load mock rewards for development
function loadMockRewards() {
  const mockRewards = [
    {
      id: 'reward-1',
      name: 'Reusable Water Bottle',
      description: 'Eco-friendly reusable water bottle made from recycled materials',
      pointsCost: 50,
      category: 'merchandise',
      image: '/images/rewards/water-bottle.jpg'
    },
    {
      id: 'reward-2',
      name: 'TrashDrop T-Shirt',
      description: 'Show your environmental commitment with this organic cotton T-shirt',
      pointsCost: 100,
      category: 'merchandise',
      image: '/images/rewards/tshirt.jpg'
    },
    {
      id: 'reward-3',
      name: 'Plant a Tree Certificate',
      description: 'We plant a tree on your behalf and send you a certificate',
      pointsCost: 150,
      category: 'impact',
      image: '/images/rewards/tree-certificate.jpg'
    },
    {
      id: 'reward-4',
      name: '5% Grocery Discount',
      description: 'Receive a 5% discount on your next grocery purchase at partner stores',
      pointsCost: 200,
      category: 'discount',
      image: '/images/rewards/grocery-discount.jpg'
    },
    {
      id: 'reward-5',
      name: 'Free Waste Pickup',
      description: 'Get one free waste pickup service',
      pointsCost: 300,
      category: 'service',
      image: '/images/rewards/free-pickup.jpg'
    }
  ];
  
  // Create some locked rewards (higher point cost than available)
  const lockedRewards = [
    {
      id: 'reward-6',
      name: 'Premium Eco Kit',
      description: 'Complete kit with reusable items: bottle, containers, bags, and utensils',
      pointsCost: 500,
      category: 'merchandise',
      image: '/images/rewards/eco-kit.jpg'
    },
    {
      id: 'reward-7',
      name: 'Community Garden Donation',
      description: 'Donate to a community garden project in your neighborhood',
      pointsCost: 750,
      category: 'impact',
      image: '/images/rewards/garden-donation.jpg'
    },
    {
      id: 'reward-8',
      name: 'Eco Ambassador Status',
      description: 'Become an official TrashDrop Eco Ambassador with special perks',
      pointsCost: 1000,
      category: 'status',
      image: '/images/rewards/ambassador.jpg'
    }
  ];
  
  // Combine available and locked rewards
  const allRewards = [...mockRewards, ...lockedRewards];
  
  // Update the UI with rewards
  updateRewardsUI(allRewards, 250);
}

// Update rewards UI
function updateRewardsUI(rewards, userPoints) {
  const rewardsGrid = document.getElementById('rewards-grid');
  const noRewardsMessage = document.getElementById('no-rewards-message');
  
  if (!rewardsGrid) return;
  
  // Clear existing rewards
  rewardsGrid.innerHTML = '';
  
  if (!rewards || rewards.length === 0) {
    // Show no rewards message
    if (noRewardsMessage) {
      noRewardsMessage.style.display = 'block';
    }
    return;
  }
  
  // Hide no rewards message
  if (noRewardsMessage) {
    noRewardsMessage.style.display = 'none';
  }
  
  // Display rewards
  rewards.forEach(reward => {
    const isLocked = reward.pointsCost > userPoints;
    const categoryBadgeColor = getCategoryBadgeColor(reward.category);
    
    const rewardCard = document.createElement('div');
    rewardCard.className = 'col-md-6 col-lg-4';
    rewardCard.innerHTML = `
      <div class="card reward-card border-0 shadow-sm">
        <div class="position-relative">
          <img src="${reward.image || '/images/rewards/placeholder.jpg'}" class="card-img-top reward-image ${isLocked ? 'locked-reward' : ''}" alt="${reward.name}">
          ${isLocked ? `
            <div class="locked-overlay">
              <i class="bi bi-lock-fill fs-1"></i>
              <div class="mt-2">Need ${reward.pointsCost - userPoints} more points</div>
            </div>
          ` : ''}
          <span class="badge bg-${categoryBadgeColor} reward-category">${capitalizeFirstLetter(reward.category)}</span>
          <span class="badge bg-warning text-dark points-badge">
            <i class="bi bi-award-fill me-1"></i>${reward.pointsCost} points
          </span>
        </div>
        <div class="card-body">
          <h5 class="card-title fs-6 fw-bold">${reward.name}</h5>
          <p class="card-text small text-muted">${reward.description}</p>
          <button class="btn btn-success btn-sm w-100 redeem-button" data-reward-id="${reward.id}" ${isLocked ? 'disabled' : ''}>
            ${isLocked ? 'Not Enough Points' : 'Redeem Reward'}
          </button>
        </div>
      </div>
    `;
    
    rewardsGrid.appendChild(rewardCard);
  });
  
  // Add event listeners to redeem buttons
  const redeemButtons = document.querySelectorAll('.redeem-button:not([disabled])');
  redeemButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const rewardId = e.target.getAttribute('data-reward-id');
      const reward = rewards.find(r => r.id === rewardId);
      if (reward) {
        openRedeemModal(reward);
      }
    });
  });
}

// Get appropriate badge color for reward category
function getCategoryBadgeColor(category) {
  const categoryColors = {
    'merchandise': 'primary',
    'impact': 'success',
    'discount': 'info',
    'service': 'secondary',
    'status': 'danger'
  };
  
  return categoryColors[category] || 'secondary';
}

// Capitalize first letter of a string
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Open redeem modal with reward details
function openRedeemModal(reward) {
  const modal = new bootstrap.Modal(document.getElementById('redeemModal'));
  
  // Set reward details in the modal
  document.getElementById('reward-image-preview').src = reward.image || '/images/rewards/placeholder.jpg';
  document.getElementById('reward-name-preview').textContent = reward.name;
  document.getElementById('reward-description-preview').textContent = reward.description;
  document.getElementById('reward-cost-preview').textContent = reward.pointsCost;
  
  // Set up confirm button
  const confirmButton = document.getElementById('confirm-redeem');
  const existingListener = confirmButton.getAttribute('data-listener');
  
  if (existingListener === 'true') {
    // Remove existing listener to prevent duplicates
    confirmButton.replaceWith(confirmButton.cloneNode(true));
  }
  
  // Get the new button (or the same one if we didn't replace it)
  const newConfirmButton = document.getElementById('confirm-redeem');
  newConfirmButton.setAttribute('data-listener', 'true');
  newConfirmButton.setAttribute('data-reward-id', reward.id);
  
  // Add click event listener
  newConfirmButton.addEventListener('click', () => {
    redeemReward(reward);
  });
  
  // Show the modal
  modal.show();
}

import { getUserPoints, getAvailableRewards, getPointsHistory, redeemReward as redeemRewardAPI } from './pointsService.js';

async function redeemReward(reward) {
  // Hide redeem modal if it exists
  const redeemModal = bootstrap.Modal.getInstance(document.getElementById('redeemModal'));
  if (redeemModal) {
    redeemModal.hide();
  }
  
  // Show loading spinner
  showSpinner('Redeeming...');
  
  try {
    await redeemRewardAPI(reward.id);
    showToast('Success', 'Reward redeemed successfully');
    // Refresh points
    const pointsData = await getUserPoints();
    updatePointsUI(pointsData);
  } catch (error) {
    console.error('Redeem error', error);
    showToast('Error', 'Could not redeem reward', 'danger');
  } finally {
    hideSpinner();
  }
}

// Load points history
async function loadPointsHistory() {
  try {
    // Get points history from the server
    const response = await fetch('/api/points/history', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtHelpers.getToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch points history: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update the UI with points history
    updatePointsHistoryUI(data.pointsHistory);
    
    return data;
  } catch (error) {
    console.error('Error loading points history:', error);
    
    // Fall back to mock data if API returned 500 error
    if (error.message && error.message.includes('500')) {
      console.log('Falling back to mock points history data');
      if (window.PointsAPI && typeof window.PointsAPI.getPointsHistory === 'function') {
        try {
          const mockData = await window.PointsAPI.getPointsHistory();
          updatePointsHistoryUI(mockData.pointsHistory);
          return mockData;
        } catch (mockError) {
          console.error('Error loading mock points history:', mockError);
          loadMockPointsHistory(); // Use local fallback as last resort
        }
      } else {
        loadMockPointsHistory(); // Use local fallback
      }
      return null;
    }
    
    showToast('Error', 'Failed to load points history. Please try again.', 'danger');
    return null;
  }
}

// Load mock points history for development
function loadMockPointsHistory() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const mockHistory = [
    {
      id: 'history-1',
      points: 50,
      reason: 'Recycling plastic waste',
      pickup_requests: {
        location: '123 Main St',
        created_at: today.toISOString()
      },
      created_at: today.toISOString()
    },
    {
      id: 'history-2',
      points: 30,
      reason: 'General waste pickup',
      pickup_requests: {
        location: '456 Oak Ave',
        created_at: yesterday.toISOString()
      },
      created_at: yesterday.toISOString()
    },
    {
      id: 'history-3',
      points: 100,
      reason: 'Community cleanup participation',
      pickup_requests: {
        location: 'Riverfront Park',
        created_at: twoDaysAgo.toISOString()
      },
      created_at: twoDaysAgo.toISOString()
    },
    {
      id: 'history-4',
      points: 70,
      reason: 'Multiple bag pickup',
      pickup_requests: {
        location: '789 Pine St',
        created_at: lastWeek.toISOString()
      },
      created_at: lastWeek.toISOString()
    }
  ];
  
  updatePointsHistoryUI(mockHistory);
}

// Update points history UI
function updatePointsHistoryUI(history) {
  const historyTable = document.getElementById('points-history-table');
  const noHistoryMessage = document.getElementById('no-history-message');
  
  if (!historyTable) return;
  
  // Clear existing history
  historyTable.innerHTML = '';
  
  if (!history || history.length === 0) {
    // Show no history message
    if (noHistoryMessage) {
      noHistoryMessage.style.display = 'block';
    }
    // Hide the table if empty
    historyTable.parentElement.style.display = 'none';
    return;
  }
  
  // Show the table
  historyTable.parentElement.style.display = 'table';
  
  // Hide no history message
  if (noHistoryMessage) {
    noHistoryMessage.style.display = 'none';
  }
  
  // Sort history by date (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
  
  // Calculate running balance
  let runningBalance = 0;
  sortedHistory.forEach(item => {
    runningBalance += item.points;
  });
  
  // Display history
  sortedHistory.forEach(item => {
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const description = item.reason || 'Points earned';
    const location = item.pickup_requests?.location ? ` at ${item.pickup_requests.location}` : '';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="history-date">${formattedDate}</td>
      <td>${description}${location}</td>
      <td class="history-points text-success">+${item.points}</td>
      <td class="fw-bold">${runningBalance}</td>
    `;
    
    historyTable.appendChild(row);
    
    // Update running balance for next item
    runningBalance -= item.points;
  });
}

// Setup event listeners
function setupEventListeners() {
  // Logout button
  const logoutButton = document.getElementById('logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
  
  // Emergency logout button
  const emergencyLogoutButton = document.getElementById('emergency-logout');
  if (emergencyLogoutButton && typeof emergencyLogout === 'function') {
    emergencyLogoutButton.addEventListener('click', emergencyLogout);
  }
  
  // Dark mode toggle
  const darkModeToggle = document.getElementById('toggle-theme');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
  }
  
  // Filter buttons for rewards
  const filterButtons = document.querySelectorAll('.reward-filter');
  filterButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      e.target.classList.add('active');
      
      // Get filter category
      const category = e.target.getAttribute('data-filter');
      
      // Filter rewards
      filterRewards(category);
    });
  });
}

// Filter rewards by category
function filterRewards(category) {
  const rewardCards = document.querySelectorAll('.reward-card');
  
  rewardCards.forEach(card => {
    const cardCategory = card.querySelector('.reward-category').textContent.toLowerCase();
    const cardContainer = card.parentElement;
    
    if (category === 'all' || cardCategory === category) {
      cardContainer.style.display = 'block';
    } else {
      cardContainer.style.display = 'none';
    }
  });
}

// Handle logout
function handleLogout(e) {
  e.preventDefault();
  
  // Show confirmation dialog
  if (confirm('Are you sure you want to log out?')) {
    AuthManager.logout()
      .then(() => {
        window.location.href = '/login';
      })
      .catch(error => {
        console.error('Logout error:', error);
        // Force redirect to login page if logout fails
        window.location.href = '/login';
      });
  }
}

// Initialize dark mode
function initializeDarkMode() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  const darkModeToggle = document.getElementById('toggle-theme');
  
  if (darkMode) {
    document.body.classList.add('dark-mode');
    if (darkModeToggle) {
      darkModeToggle.innerHTML = '<i class="bi bi-sun me-2"></i>Light Mode';
    }
  } else {
    document.body.classList.remove('dark-mode');
    if (darkModeToggle) {
      darkModeToggle.innerHTML = '<i class="bi bi-moon me-2"></i>Dark Mode';
    }
  }
}

// Toggle dark mode
function toggleDarkMode(e) {
  e.preventDefault();
  
  const darkMode = document.body.classList.contains('dark-mode');
  const darkModeToggle = document.getElementById('toggle-theme');
  
  if (darkMode) {
    // Switch to light mode
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'false');
    if (darkModeToggle) {
      darkModeToggle.innerHTML = '<i class="bi bi-moon me-2"></i>Dark Mode';
    }
  } else {
    // Switch to dark mode
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'true');
    if (darkModeToggle) {
      darkModeToggle.innerHTML = '<i class="bi bi-sun me-2"></i>Light Mode';
    }
  }
}

// Show loading spinner
function showSpinner(message = 'Loading...') {
  // Check if spinner already exists
  let spinner = document.getElementById('app-spinner');
  
  if (!spinner) {
    // Create spinner element
    spinner = document.createElement('div');
    spinner.id = 'app-spinner';
    spinner.className = 'app-spinner';
    spinner.innerHTML = `
      <div class="spinner-backdrop"></div>
      <div class="spinner-content">
        <div class="spinner-border text-success" role="status"></div>
        <p class="mt-2 spinner-message">${message}</p>
      </div>
    `;
    
    // Append to body
    document.body.appendChild(spinner);
  } else {
    // Update message
    const messageElement = spinner.querySelector('.spinner-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    // Show existing spinner
    spinner.style.display = 'block';
  }
}

// Hide loading spinner
function hideSpinner() {
  const spinner = document.getElementById('app-spinner');
  if (spinner) {
    spinner.style.display = 'none';
  }
}

// Show toast notification
function showToast(title, message, type = 'success') {
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
  toast.className = `toast align-items-center border-0 bg-${type} text-white`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}</strong><br>
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Initialize and show toast
  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: 5000
  });
  
  bsToast.show();
  
  // Remove toast from DOM after it's hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}
