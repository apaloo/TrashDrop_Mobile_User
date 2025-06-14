/**
 * Mock Authentication Service
 * Simulates Supabase auth for testing purposes
 */

class MockAuth {
  constructor() {
    this.currentUser = null;
    this.currentSession = null;
    this.users = [
      {
        id: 'test-user-123',
        email: 'test@example.com',
        password: 'password123',
        user_metadata: { name: 'Test User' }
      }
    ];
  }

  // Simulate sign in
  async signInWithPassword({ email, password }) {
    console.log('[MOCK AUTH] Sign in attempt:', email);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const user = this.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw { message: 'Invalid login credentials' };
    }
    
    this.currentUser = user;
    this.currentSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: { ...user }
    };
    
    return {
      data: {
        user: { ...user },
        session: { ...this.currentSession }
      },
      error: null
    };
  }
  
  // Simulate sign out
  async signOut() {
    this.currentUser = null;
    this.currentSession = null;
    return { error: null };
  }
  
  // Get current session
  async getSession() {
    return {
      data: {
        session: this.currentSession ? { ...this.currentSession } : null
      },
      error: null
    };
  }
  
  // Get current user
  async getUser() {
    return {
      data: {
        user: this.currentUser ? { ...this.currentUser } : null
      },
      error: null
    };
  }
  
  // Auth state change listener
  onAuthStateChange(callback) {
    // Simulate auth state changes
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }
}

// Create and expose the mock auth instance
window.mockAuth = new MockAuth();

// Initialize Supabase mock if needed
if (typeof window.supabase === 'undefined') {
  console.warn('Supabase not found, using mock implementation');
  window.supabase = {
    auth: window.mockAuth
  };
}
