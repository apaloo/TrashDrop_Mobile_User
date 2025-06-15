/**
 * AuthManager - Centralized authentication management for TrashDrop
 * Provides a consistent interface for authentication-related operations
 * Integrates with AppConfig for centralized configuration management
 * 
 * @version 2.0.0
 * @author TrashDrop Engineering
 */

class AuthManager {
    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} True if authenticated, false otherwise
     */
    static async isAuthenticated() {
        try {
            // Check if we're in development mode with mock authentication
            if (this.isDevMode()) {
                return this.getDevUserAuthenticated();
            }

            // Normal authentication check
            const { data: { session }, error } = await this.getAuthClient().getSession();
            if (error) throw error;
            return !!session;
        } catch (error) {
            console.error('Auth check failed:', error);
            
            // Fall back to dev mode if appropriate
            if (this.shouldFallbackToDev(error)) {
                console.warn('Falling back to development user');
                return true;
            }
            
            return false;
        }
    }

    /**
     * Get current user
     * @returns {Promise<object|null>} User object or null if not authenticated
     */
    static async getCurrentUser() {
        try {
            // Check if we're in development mode with mock authentication
            if (this.isDevMode()) {
                return this.getDevUser();
            }

            // Normal user fetch
            const { data: { user }, error } = await this.getAuthClient().getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            
            // Fall back to dev mode if appropriate
            if (this.shouldFallbackToDev(error)) {
                console.warn('Falling back to development user');
                return this.getDevUser();
            }
            
            return null;
        }
    }

    /**
     * Sign out the current user
     * @returns {Promise<{error: Error|null}>} Error object if sign out failed
     */
    static async signOut() {
        try {
            // Handle dev mode signout
            if (this.isDevMode()) {
                this.setDevUserAuthenticated(false);
                return { error: null };
            }

            // Normal signout
            const { error } = await this.getAuthClient().signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Sign out failed:', error);
            return { error };
        }
    }

    /**
     * Initialize authentication state
     * @returns {Promise<void>}
     */
    static async initialize() {
        // Initialize with AppConfig if available
        if (window.AppConfig) {
            try {
                await window.AppConfig.initialize();
                console.log('AuthManager initialized with AppConfig');
            } catch (configError) {
                console.warn('Failed to initialize with AppConfig, falling back to default initialization', configError);
            }
        }
        
        // Initialize development mode if needed
        if (this.isDevMode()) {
            console.log('Running in development mode with mock authentication');
            this.initializeDevMode();
            return;
        }

        // Wait for auth client to be ready
        await new Promise((resolve) => {
            if (this.getAuthClient()) return resolve();
            
            const checkAuth = setInterval(() => {
                if (this.getAuthClient()) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        });
    }
    
    /**
     * Get the authentication client from window.auth or window.supabaseClient?.auth
     * @returns {object|null} Auth client or null if not available
     */
    static getAuthClient() {
        return window.auth || (window.supabaseClient?.auth) || null;
    }
    
    /**
     * Check if we're running in development mode
     * @returns {boolean} True if in development mode
     */
    static isDevMode() {
        // Check AppConfig first if available
        if (window.AppConfig) {
            const environment = window.AppConfig.get('app.environment');
            if (environment === 'development') return true;
        }
        
        // Fall back to domain checks
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('ngrok');
    }
    
    /**
     * Initialize development mode with mock authentication
     */
    static initializeDevMode() {
        // Initialize dev user storage if not already present
        if (!localStorage.getItem('trashdrop_dev_user_authenticated')) {
            this.setDevUserAuthenticated(true);
        }
        
        // Create dev user if not exists
        if (!localStorage.getItem('trashdrop_dev_user')) {
            localStorage.setItem('trashdrop_dev_user', JSON.stringify({
                id: 'dev-user-' + Date.now(),
                email: 'dev@trashdrop.local',
                user_metadata: {
                    name: 'Development User',
                    avatar_url: '/img/profile-placeholder.jpg'
                },
                app_metadata: {
                    role: 'user'
                },
                created_at: new Date().toISOString()
            }));
        }
    }
    
    /**
     * Get development user object
     * @returns {object} Development user
     */
    static getDevUser() {
        const userJson = localStorage.getItem('trashdrop_dev_user');
        return userJson ? JSON.parse(userJson) : null;
    }
    
    /**
     * Get development user authenticated state
     * @returns {boolean} True if authenticated
     */
    static getDevUserAuthenticated() {
        return localStorage.getItem('trashdrop_dev_user_authenticated') === 'true';
    }
    
    /**
     * Set development user authenticated state
     * @param {boolean} authenticated - True if authenticated
     */
    static setDevUserAuthenticated(authenticated) {
        localStorage.setItem('trashdrop_dev_user_authenticated', authenticated ? 'true' : 'false');
    }
    
    /**
     * Check if we should fallback to development mode
     * @param {Error} error - The error that occurred
     * @returns {boolean} True if we should fallback
     */
    static shouldFallbackToDev(error) {
        // Only fallback in development mode
        if (!this.isDevMode()) return false;
        
        // Check if it's a connection error or auth error
        const errorMsg = error.message?.toLowerCase() || '';
        return errorMsg.includes('network') || 
               errorMsg.includes('connection') || 
               errorMsg.includes('failed to fetch') ||
               errorMsg.includes('auth') ||
               errorMsg.includes('unauthorized');
    }
}

// Initialize AuthManager when the script loads
(async () => {
    try {
        await AuthManager.initialize();
        console.log('AuthManager initialized');
        
        // Register for configuration changes from AppConfig if available
        if (window.AppConfig) {
            window.AppConfig.on('configloaded', (data) => {
                console.log('AuthManager detected config update');
            });
        }
    } catch (error) {
        console.error('Failed to initialize AuthManager:', error);
    }
})();

// Make AuthManager globally available
window.AuthManager = AuthManager;

// Export the AuthManager for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
