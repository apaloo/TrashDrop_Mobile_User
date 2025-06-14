/**
 * Logout functionality for TrashDrop
 * Handles user logout and session cleanup
 */

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Logout script initialized');
  
  // Find all logout buttons in the page
  const logoutButtons = document.querySelectorAll('[data-logout]');
  
  // Add click event listeners to all logout buttons
  logoutButtons.forEach(button => {
    button.addEventListener('click', handleLogout);
  });
  
  // Also handle the emergency logout if present
  const emergencyLogoutBtn = document.getElementById('confirmEmergencyLogout');
  if (emergencyLogoutBtn) {
    emergencyLogoutBtn.addEventListener('click', handleEmergencyLogout);
  }
  
  // Check if we're on the logout page and should perform logout automatically
  if (window.location.pathname === '/logout.html' || window.location.pathname === '/logout') {
    await performLogout();
  }
});

/**
 * Handle normal logout
 */
async function handleLogout(e) {
  e.preventDefault();
  
  // Show confirmation dialog if the button has data-confirm="true"
  if (this.dataset.confirm === 'true') {
    if (!confirm('Are you sure you want to log out?')) {
      return;
    }
  }
  
  await performLogout();
}

/**
 * Handle emergency logout
 */
async function handleEmergencyLogout() {
  // Clear all local storage and session storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear cookies
  document.cookie.split(';').forEach(cookie => {
    const [name] = cookie.trim().split('=');
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
  
  // Close the modal if it's open
  const modal = bootstrap.Modal.getInstance(document.getElementById('emergencyLogoutModal'));
  if (modal) {
    modal.hide();
  }
  
  // Redirect to login page
  window.location.href = '/login.html?logout=emergency';
}

/**
 * Perform the actual logout
 */
async function performLogout() {
  try {
    // Show loading state
    const originalButtonText = this?.innerHTML || '';
    if (this) {
      this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging out...';
      this.disabled = true;
    }
    
    // Sign out from Supabase
    if (typeof auth !== 'undefined' && auth.signOut) {
      const { error } = await auth.signOut();
      if (error) throw error;
    }
    
    // Clear auth-related data from localStorage
    const authKeys = [
      'supabase.auth.token',
      'supabase.auth.refreshToken',
      'supabase.auth.expiresAt',
      'user',
      'rememberedEmail'
    ];
    
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage
    sessionStorage.clear();
    
    // Redirect to login page with logout parameter
    const redirectUrl = new URL('/login.html', window.location.origin);
    redirectUrl.searchParams.append('logout', 'success');
    
    window.location.href = redirectUrl.toString();
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Restore button state
    if (this) {
      this.innerHTML = originalButtonText;
      this.disabled = false;
    }
    
    // Show error message
    alert('An error occurred during logout. Please try again.');
  }
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleLogout,
    handleEmergencyLogout,
    performLogout
  };
}
