/**
 * AuthManager - Centralized authentication management for TrashDrop
 * Provides a consistent interface for authentication-related operations
 */

class AuthManager {
    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} True if authenticated, false otherwise
     */
    static async isAuthenticated() {
        try {
            const { data: { session }, error } = await window.auth.getSession();
            if (error) throw error;
            return !!session;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    /**
     * Get current user
     * @returns {Promise<object|null>} User object or null if not authenticated
     */
    static async getCurrentUser() {
        try {
            const { data: { user }, error } = await window.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    /**
     * Sign out the current user
     * @returns {Promise<{error: Error|null}>} Error object if sign out failed
     */
    static async signOut() {
        try {
            const { error } = await window.auth.signOut();
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
        // Wait for auth to be ready
        await new Promise((resolve) => {
            if (window.auth) return resolve();
            
            const checkAuth = setInterval(() => {
                if (window.auth) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        });
    }
}

// Initialize AuthManager when the script loads
(async () => {
    try {
        await AuthManager.initialize();
        console.log('AuthManager initialized');
    } catch (error) {
        console.error('Failed to initialize AuthManager:', error);
    }
})();

// Make AuthManager globally available
window.AuthManager = AuthManager;
