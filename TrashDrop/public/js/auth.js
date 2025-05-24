// TrashDrop Authentication Module

// Use an IIFE (Immediately Invoked Function Expression) to create a namespace
// This prevents variable name collisions with other scripts
(function() {
  // Only initialize if not already initialized
  if (window.AuthManager) {
    console.log('Auth module already initialized');
    return;
  }
  
  // Initialize Supabase client
  // Determine the protocol based on the environment
  const protocol = window.location.hostname === 'localhost' ? 'http://' : 'https://';
  
  // Supabase configuration
  // For production, use the actual values
  const supabaseUrl = 'https://cpeyavpxqcloupolbvyh.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXlhdnB4cWNsb3Vwb2xidnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTY4OTYsImV4cCI6MjA2MTA3Mjg5Nn0.5rxsiRuLHCpeJZ5TqoIA5X4UwoAAuxIpNu_reafwwbQ';
  
  // JWT token handling functions
  const jwtHelpers = {
    // Decode a JWT token without verification (for debugging)
    decodeToken: (token) => {
      try {
        if (!token) return null;
        // Parse base64 encoded JWT payload
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload);
      } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
      }
    },
    
    // Store JWT token
    storeToken: (token) => {
      localStorage.setItem('jwt_token', token);
    },
    
    // Get stored JWT token
    getToken: () => {
      return localStorage.getItem('jwt_token');
    },
    
    // Remove stored JWT token
    removeToken: () => {
      localStorage.removeItem('jwt_token');
    },
    
    // Check if token is expired
    isTokenExpired: (token) => {
      const decoded = jwtHelpers.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    }
  };
  
  // Create a mock Supabase client for development
  let supabase;
  
  // Create a mock Supabase client that allows the app to function without real credentials
  const createMockSupabaseClient = () => {
    return {
      auth: {
        getSession: async () => ({ data: { session: null } }),
        getUser: async () => ({ data: { user: null } }),
        signUp: async () => ({ data: {}, error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: (callback) => {
          // Mock implementation
          return { data: { subscription: { unsubscribe: () => {} } } };
        }
      },
      from: (table) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null })
          }),
          single: async () => ({ data: null, error: null })
        }),
        insert: async () => ({ data: {}, error: null }),
        update: async () => ({ data: {}, error: null }),
        delete: async () => ({ data: {}, error: null })
      })
    };
  };
  
  // Try to initialize the real Supabase client, fall back to mock if there's an error
  try {
    if (window.supabase) {
      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      console.log('Supabase client initialized successfully');
    } else {
      console.warn('Supabase client not available in window, loading from CDN');
      // Load Supabase from CDN if not available
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = function() {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase client loaded from CDN and initialized');
      };
      script.onerror = function() {
        console.error('Failed to load Supabase from CDN, using mock client');
        supabase = createMockSupabaseClient();
      };
      document.head.appendChild(script);
    }
  } catch (error) {
    console.warn('Supabase client initialization error:', error);
    console.log('Using mock Supabase client for development');
    supabase = createMockSupabaseClient();
  }
  
  // User storage for development
  // Making it available globally for other scripts to access
  const devUserStorage = {
    getUser: () => {
      const user = localStorage.getItem('dev_user');
      return user ? JSON.parse(user) : null;
    },
    setUser: (user) => {
      localStorage.setItem('dev_user', JSON.stringify(user));
    },
    removeUser: () => {
      localStorage.removeItem('dev_user');
    },
    clearUser: () => {
      localStorage.removeItem('dev_user');
      localStorage.removeItem('token');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('supabase.auth.token');
    },
    getToken: () => {
      // Try JWT token first, fall back to legacy token
      return localStorage.getItem('jwt_token') || localStorage.getItem('token');
    },
    setToken: (token) => {
      // Store in both places for compatibility
      localStorage.setItem('token', token);
      if (!token.startsWith('dev-token-')) {
        localStorage.setItem('jwt_token', token);
      }
    },
    removeToken: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('supabase.auth.token');
    }
  };
  
  // Auth state management
  // Making it available globally for other scripts to access
  const AuthManager = {
    // Reference to the devUserStorage for other modules
    devUserStorage: devUserStorage,
    
    // Check if running in development mode
    isDev: function() {
      // Check if the hostname is localhost
      if (window.location.hostname === 'localhost') {
        return true;
      }
      
      // Check if we have a dev token
      const token = localStorage.getItem('token');
      if (token && token.startsWith('dev-token-')) {
        return true;
      }
      
      // Check if we have a dev user
      const devUser = localStorage.getItem('dev_user');
      if (devUser) {
        try {
          const parsed = JSON.parse(devUser);
          if (parsed && parsed.id && parsed.id.startsWith('dev-user-')) {
            return true;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      return false;
    },
    
    // Check if user is authenticated
    isAuthenticated: async function() {
      // Check if we're in development mode
      if (this.isDev()) {
        // For development mode, create a mock authentication token if not exists
        if (!localStorage.getItem('token')) {
          console.log('Creating development authentication token');
          const timestamp = Date.now();
          localStorage.setItem('token', 'dev-token-' + timestamp);
          
          // Create a mock user profile
          const mockUser = {
            id: 'dev-user-' + timestamp,
            email: 'dev@example.com',
            phone: '+15555555555',
            first_name: 'Dev',
            last_name: 'User',
            created_at: new Date().toISOString(),
            points: 100,
            role: 'user'
          };
          
          localStorage.setItem('dev_user', JSON.stringify(mockUser));
        }
        
        // Always return true for development
        return true;
      } else {
        // In production, first check for JWT token
        const jwtToken = jwtHelpers.getToken();
        if (jwtToken && !jwtHelpers.isTokenExpired(jwtToken)) {
          console.log('Valid JWT token found');
          return true;
        }
        
        // Fall back to Supabase session check
        try {
          const { data } = await supabase.auth.getSession();
          return !!data.session;
        } catch (error) {
          console.error('Error checking authentication:', error);
          return false;
        }
      }
    },
    
    // Get current user
    getCurrentUser: async function() {
      // For development mode
      if (this.isDev()) {
        const devUser = devUserStorage.getUser();
        if (devUser) {
          return devUser;
        }
        
        // If we have a token but no user, create a mock user
        const token = devUserStorage.getToken();
        if (token) {
          const timestamp = Date.now();
          const mockUser = {
            id: 'dev-user-' + timestamp,
            email: 'dev@example.com',
            phone: '+15555555555',
            first_name: 'Dev',
            last_name: 'User',
            created_at: new Date().toISOString(),
            points: 100,
            role: 'user'
          };
          
          devUserStorage.setUser(mockUser);
          return mockUser;
        }
        return null;
      }
      
      // For production, first try to get user from JWT token
      const jwtToken = jwtHelpers.getToken();
      if (jwtToken && !jwtHelpers.isTokenExpired(jwtToken)) {
        const tokenData = jwtHelpers.decodeToken(jwtToken);
        if (tokenData) {
          // Use token data to get user from Supabase
          try {
            const { data, error } = await supabase.auth.getUser();
            if (error) {
              console.warn('Error getting current user from Supabase:', error.message);
              return null;
            }
            return data.user;
          } catch (error) {
            console.warn('Error getting current user from Supabase:', error);
            return null;
          }
        }
      }
      
      // Fall back to regular Supabase auth
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.warn('Error getting current user:', error.message);
          return null;
        }
        return data.user;
      } catch (error) {
        console.warn('Error getting current user:', error);
        return null;
      }
    },
    
    // Get user profile
    getUserProfile: async function() {
      const user = await this.getCurrentUser();
      if (!user) return null;
      
      // For development mode - just return the user as-is
      // In a real app, we'd fetch the profile from a separate table
      if (user.id.startsWith('dev-user-')) {
        console.log('Returning development user profile');
        
        // Add profile-specific fields if not already there
        const profile = {
          ...user,
          points: user.points || 100,
          address: user.address || '123 Dev Street',
          dark_mode: user.dark_mode || false,
          phone_verified: true
        };
        
        // Update the stored user with any new fields
        devUserStorage.setUser(profile);
        
        return profile;
      }
      
      // For production
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return null;
        }
        
        return data;
      } catch (error) {
        console.warn('Error getting user profile:', error);
        return null;
      }
    },
    
    // Sign in with phone and password
    signIn: async function(phone, password) {
      console.log(`Signing in user with phone ${phone}`);
      
      // Validate inputs
      if (!phone || !password) {
        console.error('Missing required login fields');
        return { success: false, error: 'Phone and password are required' };
      }
      
      try {
        if (this.isDev()) {
          // Development mode - just create a mock token and user
          console.log('Using development login flow');
          
          // Generate a mock token with timestamp for uniqueness
          const timestamp = Date.now();
          const token = 'dev-token-' + timestamp;
          devUserStorage.setToken(token);
          
          // Create a mock user profile
          const mockUser = {
            id: 'dev-user-' + timestamp,
            email: 'dev@example.com',
            phone: phone,
            first_name: 'Dev',
            last_name: 'User',
            created_at: new Date().toISOString(),
            points: 100,
            role: 'user'
          };
          
          devUserStorage.setUser(mockUser);
          
          console.log('Development login successful');
          return { success: true, message: 'Logged in successfully' };
        } else {
          // Production mode - use Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            phone: phone,
            password: password
          });
          
          if (error) {
            console.error('Supabase login error:', error);
            return { success: false, error: error.message };
          }
          
          // Store the JWT token from the session
          if (data && data.session && data.session.access_token) {
            console.log('Storing JWT token from Supabase');
            jwtHelpers.storeToken(data.session.access_token);
            
            // Log token info for debugging (without exposing the full token)
            const tokenInfo = jwtHelpers.decodeToken(data.session.access_token);
            if (tokenInfo) {
              console.log('JWT token info:', {
                exp: new Date(tokenInfo.exp * 1000).toISOString(),
                sub: tokenInfo.sub,
                role: tokenInfo.role
              });
            }
          }
          
          console.log('Supabase login successful');
          return { success: true, message: 'Logged in successfully', user: data.user };
        }
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Sign up with phone and password
    signUp: async function(phone, password, name) {
      console.log(`Signing up user with phone ${phone}`);
      
      // Validate inputs
      if (!phone || !password || !name) {
        console.error('Missing required signup fields');
        return { success: false, error: 'Missing required fields' };
      }
      
      try {
        // Store the password temporarily for OTP verification
        sessionStorage.setItem('temp_password', password);
        sessionStorage.setItem('signup_phone', phone);
        sessionStorage.setItem('signup_name', name);
        
        if (this.isDev()) {
          // Use the mock implementation for development
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone, name })
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            console.error('Signup error:', data.error);
            return { success: false, error: data.error };
          }
          
          console.log('Signup successful, OTP sent');
          return { success: true, message: data.message };
        } else {
          // Use Supabase directly in production
          // First try to create the auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            phone,
            password
          });
          
          if (authError) {
            console.error('Supabase auth signup error:', authError);
            return { success: false, error: authError.message };
          }
          
          // Then create the profile
          const nameParts = name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              email: '',
              created_at: new Date().toISOString(),
              role: 'user'
            });
            
          if (profileError) {
            console.error('Profile creation error:', profileError);
            return { success: false, error: 'Account created but profile setup failed. Please contact support.' };
          }
          
          console.log('Signup successful with Supabase');
          return { success: true, message: 'Account created successfully' };
        }
      } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Verify OTP and complete signup
    verifyOTP: async function(otp, password) {
      // Get password from session storage if not provided
      if (!password) {
        password = sessionStorage.getItem('temp_password');
      }
      
      try {
        // Validate inputs
        if (!otp) {
          return { success: false, error: 'OTP is required' };
        }
        
        if (!password) {
          return { success: false, error: 'Password is required' };
        }
        
        // Get the phone number from session storage
        const phone = sessionStorage.getItem('signup_phone');
        if (!phone) {
          console.error('No phone number found for verification');
          return { success: false, error: 'No phone number found. Please start the signup process again.' };
        }
        
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp, phone, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          return { success: false, error: data.error };
        }
        
        // For development mode, create a mock token and user
        if (this.isDev()) {
          const timestamp = Date.now();
          const token = 'dev-token-' + timestamp;
          devUserStorage.setToken(token);
          
          const mockUser = {
            id: 'dev-user-' + timestamp,
            email: '',
            phone: phone,
            first_name: sessionStorage.getItem('signup_name') || 'New',
            last_name: 'User',
            created_at: new Date().toISOString(),
            role: 'user',
            points: 0
          };
          
          devUserStorage.setUser(mockUser);
        } else if (data.token) {
          // Store the JWT token
          jwtHelpers.storeToken(data.token);
          console.log('JWT token stored after verification');
        }
        
        // Clean up session storage
        sessionStorage.removeItem('signup_phone');
        sessionStorage.removeItem('signup_name');
        sessionStorage.removeItem('temp_password');
        
        return { success: true, token: data.token };
      } catch (error) {
        console.error('OTP verification error:', error);
        return { success: false, error: 'Failed to verify OTP' };
      }
    },
    
    // Sign out
    signOut: async function() {
      console.log('Signing out user');
      
      // For development mode
      if (this.isDev()) {
        console.log('Development mode: Removing mock authentication');
        devUserStorage.removeUser();
        devUserStorage.removeToken();
        
        // Also remove any Supabase and JWT tokens that might exist
        localStorage.removeItem('supabase.auth.token');
        jwtHelpers.removeToken();
        
        console.log('Development sign-out successful');
        return { success: true };
      }
      
      // For production
      try {
        // Sign out with Supabase
        const { error } = await supabase.auth.signOut();
        
        // Always remove JWT token regardless of Supabase result
        jwtHelpers.removeToken();
        
        if (error) {
          console.error('Sign-out error:', error);
          return { error: error.message };
        }
        
        console.log('Sign-out successful');
        return { success: true };
      } catch (error) {
        console.error('Sign-out exception:', error);
        // Still try to remove the token
        jwtHelpers.removeToken();
        return { error: 'Failed to sign out' };
      }
    },
    
    // Request password reset
    requestPasswordReset: async function(phone) {
      try {
        const response = await fetch('/api/auth/reset-password-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to request password reset');
        }
        
        return data;
      } catch (error) {
        console.error('Password reset request error:', error);
        throw error;
      }
    },
    
    // Reset password with OTP
    resetPassword: async function(otp, phone, newPassword) {
      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp, phone, newPassword }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to reset password');
        }
        
        return data;
      } catch (error) {
        console.error('Password reset error:', error);
        throw error;
      }
    },
    
    // Check authentication on protected pages
    checkAuth: async function() {
      // If we're on a login or registration page, no need to check auth
      const publicPages = ['login.html', 'register.html', 'index.html', 'verify-otp.html'];
      const currentPage = window.location.pathname.split('/').pop();
      
      if (publicPages.includes(currentPage)) {
        console.log('On public page, skipping auth check');
        return;
      }
      
      console.log('Checking authentication status...');
      
      // First check JWT token if we're not in dev mode
      if (!this.isDev()) {
        const jwtToken = jwtHelpers.getToken();
        if (jwtToken) {
          // Check if the token is expired
          if (jwtHelpers.isTokenExpired(jwtToken)) {
            console.log('JWT token expired, redirecting to login');
            jwtHelpers.removeToken();
            window.location.href = '/views/login.html';
            return;
          }
          
          // Token is valid
          console.log('Valid JWT token found, user is authenticated');
          return;
        }
      }
      
      // Fall back to checking if the user is authenticated via other means
      const isAuth = await this.isAuthenticated();
      
      if (!isAuth) {
        console.log('Not authenticated, redirecting to login');
        window.location.href = '/views/login.html';
        return;
      }
      
      console.log('User is authenticated');
    }
  };
  
  // Check authentication on page load for protected pages
  document.addEventListener('DOMContentLoaded', async () => {
    await AuthManager.checkAuth();
  });
  
  // Make AuthManager and helpers globally available
  window.AuthManager = AuthManager;
  window.jwtHelpers = jwtHelpers;
  window.devUserStorage = devUserStorage;
  
  // Add JWT token to all fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    // Only add authorization header for API requests
    if (url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`)) {
      options = options || {};
      options.headers = options.headers || {};
      
      // Don't overwrite existing Authorization header
      if (!options.headers.Authorization && !options.headers.authorization) {
        let token;
        
        if (AuthManager.isDev()) {
          // Get development token
          token = localStorage.getItem('token');
        } else {
          // Get JWT token for production
          token = jwtHelpers.getToken();
        }
        
        if (token) {
          options.headers.Authorization = `Bearer ${token}`;
          console.log('Added Authorization header to fetch request');
        }
      }
    }
    
    return originalFetch(url, options);
  };
  
})(); // End of IIFE
