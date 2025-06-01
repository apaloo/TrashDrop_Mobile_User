// TrashDrop - Authentication Helpers
// This script provides a global wrapper around different authentication methods
// to ensure consistent token retrieval across the application

(function() {
  // Create the global jwtHelpers object if it doesn't exist
  if (!window.jwtHelpers) {
    console.log('Creating global jwtHelpers object');
    
    // Unified token retrieval from multiple possible sources
    window.jwtHelpers = {
      // Get the authentication token using the most appropriate method
      getToken: function() {
        try {
          // First try to get token from AuthManager if available
          if (window.AuthManager) {
            // Try different AuthManager methods
            if (typeof window.AuthManager.jwtHelpers === 'object' && 
                typeof window.AuthManager.jwtHelpers.getToken === 'function') {
              return window.AuthManager.jwtHelpers.getToken();
            }
            
            if (typeof window.AuthManager.devUserStorage === 'object' && 
                typeof window.AuthManager.devUserStorage.getToken === 'function') {
              return window.AuthManager.devUserStorage.getToken();
            }
            
            // Try to get from localStorage through direct methods
            if (typeof window.AuthManager.isDev === 'function' && window.AuthManager.isDev()) {
              const devToken = localStorage.getItem('dev_token') || localStorage.getItem('token');
              if (devToken) return devToken;
            }
          }
          
          // Ngrok-specific token handling
          const isNgrok = window.location.hostname.includes('ngrok.io') || 
                         window.location.hostname.endsWith('.ngrok.app');
          
          if (isNgrok && window.ngrokAuth && typeof window.ngrokAuth.getToken === 'function') {
            return window.ngrokAuth.getToken();
          }
          
          // Fallback to direct localStorage access as last resort
          return localStorage.getItem('jwt_token') || 
                 localStorage.getItem('token') || 
                 localStorage.getItem('supabase.auth.token') || 
                 '';
        } catch (error) {
          console.error('Error in jwtHelpers.getToken():', error);
          // Final fallback
          return localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
        }
      },
      
      // Store a token (for compatibility)
      storeToken: function(token) {
        if (!token) return;
        
        try {
          // Store in multiple places for maximum compatibility
          localStorage.setItem('jwt_token', token);
          localStorage.setItem('token', token);
          
          // If AuthManager is available, use its methods too
          if (window.AuthManager && 
              typeof window.AuthManager.jwtHelpers === 'object' && 
              typeof window.AuthManager.jwtHelpers.storeToken === 'function') {
            window.AuthManager.jwtHelpers.storeToken(token);
          }
        } catch (error) {
          console.error('Error in jwtHelpers.storeToken():', error);
        }
      },
      
      // Remove stored token (logout helper)
      removeToken: function() {
        try {
          // Clear from all possible storage locations
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('token');
          localStorage.removeItem('supabase.auth.token');
          
          // If AuthManager is available, use its methods too
          if (window.AuthManager && 
              typeof window.AuthManager.jwtHelpers === 'object' && 
              typeof window.AuthManager.jwtHelpers.removeToken === 'function') {
            window.AuthManager.jwtHelpers.removeToken();
          }
        } catch (error) {
          console.error('Error in jwtHelpers.removeToken():', error);
        }
      }
    };
  } else {
    console.log('jwtHelpers already exists, extending functionality');
    
    // Save original methods
    const originalGetToken = window.jwtHelpers.getToken;
    
    // Enhance existing getToken with more robust fallback
    window.jwtHelpers.getToken = function() {
      try {
        // Try original method first
        const token = originalGetToken();
        if (token) return token;
        
        // If original method fails, use our fallback approach
        console.log('Original getToken failed, using fallback');
        
        // Fallback to direct localStorage access
        return localStorage.getItem('jwt_token') || 
               localStorage.getItem('token') || 
               localStorage.getItem('supabase.auth.token') || 
               '';
      } catch (error) {
        console.error('Error in enhanced jwtHelpers.getToken():', error);
        // Final fallback
        return localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
      }
    };
  }
  
  console.log('Authentication helpers initialized');
})();
