/**
 * AuthService - Centralized authentication service for TrashDrop
 * Handles all authentication state management and token operations
 */

class AuthService {
  static STORAGE_KEY = 'trashdrop_auth';
  static SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

  constructor() {
    this._session = null;
    this._user = null;
    this._listeners = new Set();
    this._initialize();
  }

  // Initialize the service
  _initialize() {
    this._loadSession();
    this._setupAutoRefresh();
    this._setupStorageListener();
  }

  // Load session from storage
  _loadSession() {
    try {
      const stored = localStorage.getItem(AuthService.STORAGE_KEY);
      if (stored) {
        const { session, timestamp } = JSON.parse(stored);
        // Check if session is expired
        if (Date.now() - timestamp < AuthService.SESSION_TIMEOUT) {
          this._session = session;
          this._user = session?.user || null;
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this._clearSession();
    }
    return false;
  }

  // Save session to storage
  _saveSession() {
    if (this._session) {
      const data = {
        session: this._session,
        timestamp: Date.now()
      };
      localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(data));
    } else {
      this._clearSession();
    }
  }

  // Clear session data
  _clearSession() {
    this._session = null;
    this._user = null;
    localStorage.removeItem(AuthService.STORAGE_KEY);
    this._notifyListeners();
  }

  // Setup auto-refresh for session
  _setupAutoRefresh() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    
    if (this._session) {
      const expiresIn = (this._session.expires_at * 1000) - Date.now() - 60000; // 1 min before expiry
      if (expiresIn > 0) {
        this._refreshTimer = setTimeout(() => this.refreshSession(), expiresIn);
      } else {
        this._clearSession();
      }
    }
  }

  // Listen for storage events (tabs sync)
  _setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === AuthService.STORAGE_KEY) {
        this._loadSession();
        this._notifyListeners();
      }
    });
  }

  // Notify all listeners of auth state change
  _notifyListeners() {
    const authState = this.getAuthState();
    this._listeners.forEach(callback => callback(authState));
  }

  // Public Methods
  
  // Get current auth state
  getAuthState() {
    return {
      isAuthenticated: !!this._session,
      user: this._user,
      session: this._session
    };
  }

  // Add auth state change listener
  onAuthStateChanged(callback) {
    this._listeners.add(callback);
    // Return unsubscribe function
    return () => this._listeners.delete(callback);
  }

  // Sign in with email/password
  async signInWithEmail({ email, password }) {
    try {
      const { data, error } = await window.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      this._session = data.session;
      this._user = data.user;
      this._saveSession();
      this._setupAutoRefresh();
      this._notifyListeners();
      
      return { user: this._user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await window.supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    } finally {
      this._clearSession();
    }
  }

  // Refresh session
  async refreshSession() {
    try {
      const { data, error } = await window.supabase.auth.refreshSession();
      if (error) throw error;
      
      this._session = data.session;
      this._user = data.user;
      this._saveSession();
      this._setupAutoRefresh();
      this._notifyListeners();
      
      return { session: this._session, error: null };
    } catch (error) {
      console.error('Session refresh error:', error);
      this._clearSession();
      return { session: null, error };
    }
  }

  // Get current session (refreshes if needed)
  async getSession() {
    if (!this._session) return { session: null, error: 'No active session' };
    
    // If session is about to expire, refresh it
    const expiresSoon = (this._session.expires_at * 1000) - Date.now() < 5 * 60 * 1000; // 5 min
    if (expiresSoon) {
      return this.refreshSession();
    }
    
    return { session: this._session, error: null };
  }
}

// Create and export singleton instance
const authService = new AuthService();

// For debugging
if (typeof window !== 'undefined') {
  window.authService = authService;
}

export { authService };
