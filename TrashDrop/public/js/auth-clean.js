/**
 * Authentication Module for TrashDrop
 * Handles Supabase initialization and authentication methods
 */

// Use an IIFE to create a private scope
(function() {
  'use strict';

  // Configuration - will be set from supabase-config.js
  const config = window.supabaseConfig || {
    url: 'https://cpeyavpxqcloupolbvyh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXlhdnB4cWNsb3Vwb2xidnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTY4OTYsImV4cCI6MjA2MTA3Mjg5Nn0.5rxsiRuLHCpeJZ5TqoIA5X4UwoAAuxIpNu_reafwwbQ'
  };

  // Initialize with null, will be set when Supabase is loaded
  let supabase = null;

  // Create a mock Supabase client for fallback
  function createMockSupabaseClient() {
    console.warn('Using mock Supabase client - authentication will not work');
    return {
      auth: {
        signIn: async () => ({ error: 'Mock client - authentication disabled' }),
        signUp: async () => ({ error: 'Mock client - registration disabled' }),
        signOut: async () => ({ error: null }),
        session: () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: 'Mock client' })
          })
        })
      })
    };
  }

  // Initialize Supabase client
  function initSupabase() {
    try {
      // Validate configuration
      if (!config.url || !config.anonKey) {
        console.error('Missing Supabase configuration');
        return createMockSupabaseClient();
      }

      if (!config.url.startsWith('http')) {
        console.error('Invalid Supabase URL format');
        return createMockSupabaseClient();
      }

      if (config.anonKey.length < 30) {
        console.error('Invalid Supabase key format');
        return createMockSupabaseClient();
      }

      // Initialize and return the Supabase client
      const client = supabase.createClient(config.url, config.anonKey);
      console.log('Supabase client initialized successfully');
      return client;
      
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      return createMockSupabaseClient();
    }
  }

  // JWT token handling functions
  const jwtHelpers = {
    // Decode a JWT token without verification
    decodeToken: function(token) {
      try {
        if (!token) return null;
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64));
      } catch (error) {
        console.error('Error decoding token:', error);
        return null;
      }
    },
    
    // Check if a token is expired
    isTokenExpired: function(token) {
      try {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) return true;
        return Date.now() >= decoded.exp * 1000;
      } catch (error) {
        console.error('Error checking token expiration:', error);
        return true;
      }
    }
  };

  // Initialize Supabase client
  supabase = initSupabase();
  
  // Store on window for debugging
  window.supabase = supabase;
  
  // Public API
  const auth = {
    // Core authentication methods
    signIn: async function(email, password) {
      console.log('[AUTH] Starting sign in for email:', email);
      
      // Validate inputs
      if (!email || !password) {
        const error = new Error('Email and password are required');
        console.error('[AUTH] Validation error:', error.message);
        return { error };
      }
      
      try {
        console.log('[AUTH] Calling supabase.auth.signInWithPassword...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        });
        
        console.log('[AUTH] Sign in response received');
        
        if (error) {
          console.error('[AUTH] Sign in error:', error);
          return { data: null, error };
        }
        
        if (data?.session) {
          console.log('[AUTH] Sign in successful, user ID:', data.user?.id);
        } else {
          console.warn('[AUTH] Sign in successful but no session data returned');
        }
        
        return { data, error: null };
        
      } catch (error) {
        console.error('[AUTH] Unexpected error during sign in:', error);
        return { 
          data: null, 
          error: error.message || 'An unexpected error occurred during sign in' 
        };
      }
    },
    
    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        return { error };
      } catch (error) {
        console.error('Sign out error:', error);
        return { error };
      }
    },
    
    // Session management
    getSession: async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        return { session: data?.session, error };
      } catch (error) {
        console.error('Get session error:', error);
        return { error };
      }
    },
    
    // Password reset
    resetPassword: async (email) => {
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        return { data, error };
      } catch (error) {
        console.error('Password reset error:', error);
        return { error };
      }
    },
    
    // Check if user is authenticated
    isAuthenticated: async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { isAuthenticated: !!session, session, error };
      } catch (error) {
        console.error('Authentication check error:', error);
        return { isAuthenticated: false, error };
      }
    },
    
    // JWT helpers
    jwt: jwtHelpers,
    
    // Raw Supabase client (use with caution)
    client: supabase
  };
  
  // Initialize auth state listener
  function initAuthListener() {
    if (!supabase?.auth) {
      console.error('Cannot initialize auth listener: Supabase auth not available');
      return;
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        // You can dispatch a custom event here if needed
        const authEvent = new CustomEvent('auth-state-changed', {
          detail: { event, session }
        });
        window.dispatchEvent(authEvent);
      }
    );
    
    // Return the unsubscribe function
    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }
  
  // Initialize auth when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing auth module...');
    // Start listening for auth state changes
    initAuthListener();
    
    // Expose the auth API
    window.auth = auth;
    
    console.log('Auth module initialized');
  });
  
  // Also expose the auth object immediately for scripts that might need it
  window.auth = auth;
  
})();
