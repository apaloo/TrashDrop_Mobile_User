/**
 * Authentication Helper
 * Utility functions for handling authentication tokens across the TrashDrop application
 */

(function() {
    // Check if we need to simulate a logged-in state for development
    const simulateLogin = function() {
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.search.includes('dev=true')) {
            
            // Only simulate if no token is present
            if (!localStorage.getItem('token') && 
                !localStorage.getItem('jwt_token') && 
                !localStorage.getItem('trashdrop.token')) {
                
                console.log('Development environment detected, simulating login...');
                
                // Create mock user data
                const mockUser = {
                    id: 'dev-user-' + Date.now(),
                    email: 'dev@example.com',
                    phone: '+1234567890',
                    name: 'Development User',
                    role: 'user'
                };
                
                // Create a mock token
                const mockToken = 'dev-token-' + mockUser.id;
                
                // Store the mock data
                localStorage.setItem('trashdrop.token', mockToken);
                localStorage.setItem('jwt_token', mockToken); // For backward compatibility
                localStorage.setItem('token', mockToken); // For backward compatibility
                localStorage.setItem('trashdrop.user', JSON.stringify(mockUser));
                localStorage.setItem('trashdrop.userId', mockUser.id);
                
                console.log('Simulated login with token:', mockToken);
                return true;
            }
        }
        return false;
    };
    
    // Run simulation check immediately
    simulateLogin();
    
    // Add to global window object
    window.AuthHelper = {
        /**
         * Gets the authentication token from all possible storage locations
         * @returns {string|null} The authentication token or null if not found
         */
        getToken: function() {
            // Try all possible token storage locations
            const token = localStorage.getItem('token') || 
                          localStorage.getItem('jwt_token') || 
                          localStorage.getItem('trashdrop.token');
            
            if (!token) {
                console.error('No authentication token found');
                return null;
            }
            
            return token;
        },
        
        /**
         * Gets the development-specific authentication token
         * @returns {string|null} The development token or null if not in development mode
         */
        getDevToken: function() {
            if (!this.isDevelopment()) {
                return null;
            }
            
            // Get token or create a dev token if in development mode
            let token = this.getToken();
            
            if (!token) {
                return null;
            }
            
            // If we don't have a dev token but have a regular token, create a dev token
            if (!token.startsWith('dev-token-')) {
                // Extract user ID or generate a random one
                const userId = localStorage.getItem('trashdrop.userId') || 'user' + Date.now();
                token = `dev-token-${userId}`;
                console.log('Created development token:', token);
            }
            
            return token;
        },
        
        /**
         * Gets the authentication headers for API requests
         * @returns {Object} Headers object with Authorization header
         */
        getAuthHeaders: function() {
            // Get appropriate token based on environment
            let token = this.isDevelopment() ? this.getDevToken() : this.getToken();
            
            if (!token) {
                return {};
            }
            
            // For development token, use it directly without Bearer prefix
            if (token.startsWith('dev-token-')) {
                return {
                    'Authorization': token
                };
            } 
            
            // For regular tokens, ensure they have the Bearer prefix
            if (!token.startsWith('Bearer ')) {
                token = `Bearer ${token}`;
            }
            
            return {
                'Authorization': token
            };
        },
        
        /**
         * Checks if the application is running in development mode
         * @returns {boolean} True if in development mode
         */
        isDevelopment: function() {
            return window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.port === '3000' ||
                   window.location.href.includes('development') ||
                   window.location.search.includes('dev=true');
        }
    };
})();
