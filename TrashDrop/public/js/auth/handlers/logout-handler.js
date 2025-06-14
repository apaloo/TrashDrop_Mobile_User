import { AuthStorage, AuthUI } from '../utils/auth-utils.js';

class LogoutHandler {
  constructor() {
    this.logoutButtons = document.querySelectorAll('[data-logout]');
    this.initialize();
  }

  initialize() {
    if (this.logoutButtons.length === 0) return;

    // Add click handlers to all logout buttons
    this.logoutButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleLogout(e, button));
    });
  }

  async handleLogout(event, button) {
    event.preventDefault();
    
    try {
      // Set loading state if button is provided
      if (button) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = `
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span class="visually-hidden">Signing out...</span>
        `;
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear auth data from storage
      AuthStorage.clearAuthData();
      
      // Redirect to login page
      const redirectUrl = this.getRedirectUrl();
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Show error message if there's a container for it
      const errorContainer = document.getElementById('logout-error');
      if (errorContainer) {
        errorContainer.textContent = 'Failed to sign out. Please try again.';
        errorContainer.style.display = 'block';
      }
      
      // Reset button state if it exists
      if (button) {
        button.disabled = false;
        button.textContent = 'Sign Out';
      }
    }
  }
  
  getRedirectUrl() {
    // Get current path to redirect back after login
    const currentPath = window.location.pathname + window.location.search;
    
    // Don't redirect back to auth pages
    if (currentPath.includes('/auth/') || currentPath.includes('/login')) {
      return '/';
    }
    
    // Add current path as redirect parameter
    return `/?redirect=${encodeURIComponent(currentPath)}`;
  }
}

// Initialize logout handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LogoutHandler();
});

// Also make it available globally for programmatic logout
window.logoutUser = async () => {
  const handler = new LogoutHandler();
  await handler.handleLogout({ preventDefault: () => {} });
};

export default LogoutHandler;
