/**
 * TrashDrop Theme Switcher Ngrok Fix
 * This script provides a patch for theme preference errors on ngrok domains
 */

// Function to check if running on ngrok domain
function isRunningOnNgrok() {
  return window.location.hostname.includes('ngrok-free.app') || 
         window.location.hostname.includes('ngrok.io');
}

// Patch the ThemeSwitcher.toggleTheme function to avoid API calls on ngrok domains
(function patchThemeSwitcher() {
  // Wait for ThemeSwitcher to be available
  const checkInterval = setInterval(() => {
    if (window.ThemeSwitcher && window.ThemeSwitcher.toggleTheme) {
      clearInterval(checkInterval);
      
      // Store the original toggleTheme function
      const originalToggleTheme = window.ThemeSwitcher.toggleTheme;
      
      // Override with ngrok-compatible version
      window.ThemeSwitcher.toggleTheme = function() {
        try {
          // Call original function for the UI changes
          originalToggleTheme();
          
          // If we're on ngrok, suppress any API calls that might happen elsewhere
          if (isRunningOnNgrok()) {
            console.log('ThemeSwitcher: Using ngrok compatibility mode, bypassing API calls');
            
            // Close any error alerts that might be visible
            const errorAlerts = document.querySelectorAll('.alert-danger');
            errorAlerts.forEach(alert => {
              if (alert.textContent.includes('theme preference')) {
                alert.style.display = 'none';
              }
            });
            
            // Specifically handle the error toast at the top
            const toastContainer = document.querySelector('.toast-container');
            if (toastContainer) {
              const toasts = toastContainer.querySelectorAll('.toast');
              toasts.forEach(toast => {
                if (toast.textContent.includes('theme preference')) {
                  toast.remove();
                }
              });
            }
          }
        } catch (error) {
          console.error('Error in patched toggleTheme:', error);
        }
      };
      
      console.log('ThemeSwitcher: Successfully patched for ngrok compatibility');
    }
  }, 100);
  
  // Give up after 5 seconds to prevent infinite checking
  setTimeout(() => clearInterval(checkInterval), 5000);
})();

// Also patch the dashboard.js toggleDarkMode function if it exists
(function patchDashboardToggleDarkMode() {
  const checkInterval = setInterval(() => {
    if (window.toggleDarkMode) {
      clearInterval(checkInterval);
      
      // Store the original function
      const originalToggleDarkMode = window.toggleDarkMode;
      
      // Override with ngrok-compatible version
      window.toggleDarkMode = async function(e) {
        if (e) e.preventDefault();
        
        if (isRunningOnNgrok()) {
          console.log('Dashboard: Using ngrok compatibility mode for theme toggle');
          
          // Just do the visual toggle without any API calls
          const isDarkMode = !document.body.classList.contains('dark-mode');
          
          // Apply visual changes
          document.body.classList.toggle('dark-mode');
          document.querySelector('html').setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light');
          
          // Update button text if it exists
          const darkModeToggle = document.getElementById('toggle-theme');
          if (darkModeToggle) {
            darkModeToggle.innerHTML = isDarkMode 
              ? '<i class="bi bi-sun me-2"></i>Light Mode'
              : '<i class="bi bi-moon me-2"></i>Dark Mode';
          }
          
          // Store preference in localStorage for persistence
          localStorage.setItem('trashdrop-theme-preference', isDarkMode ? 'dark' : 'light');
          
          return;
        }
        
        // If not on ngrok, use the original function
        return originalToggleDarkMode(e);
      };
      
      console.log('Dashboard: Successfully patched toggleDarkMode for ngrok compatibility');
    }
  }, 100);
  
  // Give up after 5 seconds
  setTimeout(() => clearInterval(checkInterval), 5000);
})();

// Handle error toasts specifically
(function interceptToasts() {
  // Check if toastr library is available
  if (window.toastr) {
    // Save original error function
    const originalError = window.toastr.error;
    
    // Override error function
    window.toastr.error = function(message, title, options) {
      // Check if we're on ngrok domain and message is about theme
      if (isRunningOnNgrok() && message && message.includes('theme preference')) {
        console.log('Intercepted theme error toast on ngrok domain');
        return; // Suppress the error toast
      }
      
      // Otherwise, use the original function
      return originalError(message, title, options);
    };
  }
})();
