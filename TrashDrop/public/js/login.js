// TrashDrop Login Page
// This module handles the login form submission and authentication flow

// Ensure window.loginState is available
if (!window.loginState) {
  window.loginState = {
    inProgress: false,
    start: (form) => {
      this.inProgress = true;
      const submitBtn = form?.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
      }
    },
    end: () => {
      this.inProgress = false;
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    },
    setError: (error) => {
      console.error('Login error:', error);
      const errorElement = document.querySelector('.alert-danger');
      if (errorElement) {
        errorElement.textContent = error.message || 'An error occurred during login';
        errorElement.classList.remove('d-none');
      }
    }
  };
}

// Centralized login state management with enhanced protection
const loginState = {
  inProgress: false,
  form: null,
  lastSubmitTime: 0,
  minSubmitInterval: 1000, // 1 second minimum between submissions
  
  start: function(form) {
    const now = Date.now();
    
    // Prevent rapid successive submissions
    if (this.inProgress || (now - this.lastSubmitTime) < this.minSubmitInterval) {
      console.log('[LOGIN] Submission throttled - too soon since last attempt');
      return false;
    }
    
    this.inProgress = true;
    this.lastSubmitTime = now;
    this.form = form;
    
    // Disable form elements to prevent multiple submissions
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      const inputs = form.querySelectorAll('input, button, textarea, select');
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
      }
      
      // Store original disabled states
      this.originalStates = Array.from(inputs).map(input => ({
        element: input,
        disabled: input.disabled
      }));
      
      // Disable all form inputs
      inputs.forEach(input => {
        if (!input.disabled) {
          input.disabled = true;
        }
      });
    }
    
    return true;
  },
  
  end: function() {
    // Re-enable form elements
    if (this.form) {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      
      // Restore original disabled states
      if (this.originalStates) {
        this.originalStates.forEach(({ element, disabled }) => {
          element.disabled = disabled;
        });
        delete this.originalStates;
      }
      
      if (submitBtn) {
        submitBtn.removeAttribute('aria-busy');
      }
      
      this.form = null;
    }
    
    this.inProgress = false;
  },
  
  reset: function() {
    this.inProgress = false;
    this.lastSubmitTime = 0;
    this.form = null;
    delete this.originalStates;
  }
};

// Reset login state on page load to prevent stuck states
function initializeLoginState() {
  console.log('[LOGIN] Initializing login state manager');
  
  // Clean up any existing state
  loginState.reset();
  
  // Clear any lingering form submission flags
  if (window.sessionStorage) {
    // Clear all login-related session storage
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('_login_') || key.includes('auth') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        console.log(`[LOGIN] Cleared session storage: ${key}`);
      } catch (e) {
        console.warn(`[LOGIN] Failed to clear session storage ${key}:`, e);
      }
    });
  }
  
  // Clean up any forms that might be in a submitted state
  document.querySelectorAll('form').forEach(form => {
    try {
      form.dataset.submitted = 'false';
      form.removeAttribute('data-submission-id');
      
      // Re-enable all form elements
      const inputs = form.querySelectorAll('input, button, textarea, select');
      inputs.forEach(input => {
        input.disabled = false;
      });
      
      // Remove any busy indicators
      const busyElements = form.querySelectorAll('[aria-busy="true"]');
      busyElements.forEach(el => el.removeAttribute('aria-busy'));
    } catch (e) {
      console.warn('[LOGIN] Error cleaning up form state:', e);
    }
  });
  
  console.log('[LOGIN] Login state initialized');
}

// Initialize when the DOM is ready
function setupLoginPage() {
  console.log('[LOGIN] Setting up login page');
  
  // Initialize login state
  initializeLoginState();
  
  // Get the login form
  const loginForm = document.getElementById('login-form');
  if (!loginForm) {
    console.error('Login form not found');
    return;
  }
  
  // Handle login form submission
  async function handleLogin(e) {
    if (e) e.preventDefault();
    
    console.log('=== Login process started ===');
    
    // Prevent multiple submissions
    if (loginState.inProgress) {
      console.log('⚠️ Login already in progress');
      return;
    }
    
    // Get form reference
    const form = e?.target || document.getElementById('login-form');
    if (!form) {
      console.error('❌ Login form not found');
      return;
    }
    
    // Start login state
    if (!loginState.start(form)) {
      console.log('⚠️ Login state initialization failed');
      return;
    }
    
    try {
      // Get form data
      const formData = new FormData(form);
      const email = formData.get('email')?.trim();
      const password = formData.get('password');
      const rememberMe = formData.get('remember-me') === 'on';
      
      console.log('🔑 Login attempt for:', email);
      
      // Validate inputs
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }
      
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
      }
      
      // Wait for Supabase to be ready with a timeout
      const supabase = await waitForSupabase(10000);
      
      if (!supabase?.auth?.signInWithPassword) {
        throw new Error('Authentication service is not properly initialized');
      }
      
      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('❌ Login error:', error);
        throw error;
      }
      
      console.log('✅ Login successful:', data);
      await processLoginResponse(data, email, rememberMe);
      
    } catch (error) {
      console.error('❌ Login process failed:', error);
      
      // Show user-friendly error message
      let errorMessage = 'An error occurred during login';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before logging in.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error to user
      showToast('Login Failed', errorMessage, 'error');
      
      // Re-focus on the email field
      const emailInput = form.querySelector('input[name="email"]');
      if (emailInput) emailInput.focus();
      
    } finally {
      // Always clean up the login state
      loginState.end();
      
      // Reset form submission state after a short delay
      setTimeout(() => {
        if (form) {
          form.dataset.submitted = 'false';
          form.removeAttribute('data-submission-id');
        }
      }, 1000);
    }
  }
  
  // Helper function to wait for Supabase to be ready
  function waitForSupabase(timeout = 10000) {
    return new Promise((resolve, reject) => {
      // If Supabase is already available
      if (window.supabase?.auth) {
        console.log('ℹ️ Supabase already available');
        return resolve(window.supabase);
      }
      
      console.log('⏳ Waiting for Supabase to initialize...');
      
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Authentication service timeout. Please try again.'));
      }, timeout);
      
      const onReady = (event) => {
        console.log('✅ Supabase ready event received:', event.type);
        cleanup();
        
        if (event.detail?.error) {
          console.warn('Supabase ready with error:', event.detail.error);
          if (event.detail.isMock) {
            console.warn('Using mock authentication - some features may be limited');
            resolve(window.supabase || createMockSupabaseClient());
          } else {
            reject(new Error(event.detail.error));
          }
        } else {
          resolve(window.supabase || createMockSupabaseClient());
        }
      };
      
      function cleanup() {
        clearTimeout(timer);
        document.removeEventListener('supabase:ready', onReady);
        document.removeEventListener('auth:ready', onReady);
      }
      
      // Listen for ready events
      document.addEventListener('supabase:ready', onReady, { once: true });
      document.addEventListener('auth:ready', onReady, { once: true });
    });
  }
  
  // Create a mock Supabase client for development
  function createMockSupabaseClient() {
    console.warn('⚠️ Creating mock Supabase client - some features may be limited');
    
    return {
      auth: {
        signInWithPassword: (credentials) => {
          console.log('[MOCK] signInWithPassword:', credentials.email);
          return Promise.resolve({
            data: { 
              user: { 
                id: 'mock-user-id', 
                email: credentials.email,
                user_metadata: { name: 'Mock User' }
              },
              session: { access_token: 'mock-token' }
            }, 
            error: null 
          });
        },
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { 
            subscription: { 
              unsubscribe: () => console.log('[MOCK] Unsubscribed from auth changes')
            }
          }
        }),
        handleError: (error) => {
          const errorMessage = error?.message || 'Too many login attempts. Please try again later.';
          window.loginState.setError(new Error(errorMessage));
          window.loginState.end();
        }
      }
    };
  };
  
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;
    const rememberMe = form.rememberMe?.checked || false;
    
    // Update login state
    window.loginState.start(form);
    
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }
      
      // Show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
      
      // Attempt login
      const { data, error } = await window.auth.signIn(email, password);
      
      if (error) throw error;
      
      // Handle successful login
      if (data?.user) {
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('lastLoginEmail', email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('lastLoginEmail');
        }
        
        // Redirect to dashboard
        window.location.href = '/dashboard.html';
      }
    } catch (error) {
      console.error('Login error:', error);
      window.loginState.setError(error);
      
      // Show error to user
      const errorMessage = error?.message || 'Login failed. Please try again.';
      alert(errorMessage);
    } finally {
      // Reset form state
      submitButton.disabled = false;
      submitButton.textContent = 'Sign In';
      window.loginState.end();
    }
  };
  
  // Set up form submission if not already set up
  if (typeof window.loginFormInitialized === 'undefined') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.removeEventListener('submit', handleSubmit);
      loginForm.addEventListener('submit', handleSubmit);
      window.loginFormInitialized = true;
    }
  }
  
  // Check for remembered email
  if (localStorage.getItem('rememberMe') === 'true') {
    const emailInput = document.querySelector('input[name="email"]');
    const rememberCheckbox = document.querySelector('input[name="rememberMe"]');
    
    if (emailInput) {
      emailInput.value = localStorage.getItem('lastLoginEmail') || '';
    }
    
    if (rememberCheckbox) {
      rememberCheckbox.checked = true;
    }
  }
  
  console.log('[LOGIN] Login page setup complete');
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLoginPage);
} else {
  setupLoginPage();
}

// Also clean up on page unload
window.addEventListener('beforeunload', () => {
  console.log('[LOGIN] Page unloading, cleaning up login state');
  loginState.end();
});

// Export for debugging
window.loginState = loginState;

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Login page initialized');
  
  // Debug: Check if Auth module is available
  console.log('Auth module available:', typeof auth !== 'undefined' ? '✓' : '❌');
  
  // Check if we were in a redirect loop and show appropriate message
  if (sessionStorage.getItem('_authStabilizer_loopHandled')) {
    console.log('Login page loaded after handling a refresh loop');
    // Clear the flag to avoid showing the message again on next load
    sessionStorage.removeItem('_authStabilizer_loopHandled');
  }
  
  // Initialize Supabase if not already done
  if (typeof supabase === 'undefined' && typeof initializeSupabaseClient === 'function') {
    console.log('Initializing Supabase client...');
    try {
      supabase = initializeSupabaseClient();
      console.log('Supabase client initialized:', supabase ? '✓' : '❌');
      
      // Wait for auth to be ready
      await new Promise((resolve) => {
        if (window.auth) {
          const checkAuth = setInterval(() => {
            if (window.auth && window.supabase) {
              clearInterval(checkAuth);
              resolve();
            }
          }, 100);
        } else {
          resolve();
        }
      });
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }
  
  // Check if user is already logged in
  try {
    if (window.auth) {
      const { data: { session } } = await window.auth.getSession();
      if (session) {
        console.log('User is already authenticated, redirecting...');
        window.location.href = 'dashboard.html';
        return;
      }
    } else {
      console.warn('Auth module not available, skipping session check');
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
    // Continue with login form even if session check fails
  }
  
  // Initialize base URL if available
  if (typeof window.initializeBaseUrl === 'function') {
    try {
      window.initializeBaseUrl();
      console.log('Base URL initialized');
    } catch (error) {
      console.error('Failed to initialize base URL:', error);
    }
  }
  
  const loginForm = document.getElementById('login-form');
  
  // Check if we're on the login page
  if (loginForm) {
    console.log('Login form found, attaching event listeners');
    
    // Add submit event listener with duplicate submission prevention
    const handleFormSubmit = async (e) => {
      console.log('=== Form submission started ===');
      
      // Prevent default form submission
      if (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      
      // Get the form reference
      const form = e ? e.target : loginForm;
      
      // Prevent multiple submissions
      if (!loginState.start(form)) {
        console.log('⚠️ Login already in progress, ignoring additional request');
        return false;
      }
      
      try {
        console.log('🔑 Starting login process...');
        await handleLogin(e);
        console.log('✅ Login process completed successfully');
      } catch (error) {
        console.error('❌ Error during login:', error);
        try {
          showToast('Error', error.message || 'An unexpected error occurred', 'error');
        } catch (toastError) {
          console.error('Failed to show error toast:', toastError);
          // Fallback to alert if toast fails
          alert('Login error: ' + (error.message || 'An unexpected error occurred'));
        }
      } finally {
        // Ensure we always clean up the login state
        try {
          loginState.end(loginState.submissionId);
        } catch (endError) {
          console.error('Error cleaning up login state:', endError);
        }
        
        // Force cleanup of any lingering form states
        setTimeout(() => {
          try {
            if (form) {
              form.dataset.submitted = 'false';
              form.removeAttribute('data-submission-id');
            }
          } catch (cleanupError) {
            console.warn('Error during form cleanup:', cleanupError);
          }
        }, 1000);
      }
      
      return false;
    };
    
    // Remove any existing listeners to prevent duplicates
    loginForm.removeEventListener('submit', handleFormSubmit);
    loginForm.addEventListener('submit', handleFormSubmit);
    
    // Also prevent form submission via Enter key in all input fields
    loginForm.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && loginState.inProgress) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      });
    });
    
    // Initialize password toggle functionality
    initPasswordToggle();
    
    // Check for remembered login details
    checkRememberedLogin();
    
    // Process any pending login (for Safari workaround)
    processPendingLogin();
    
    // Check if we have an auth error in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      showToast('Authentication Required', 'Please log in to continue', 'error');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } else {
    console.log('Login form not found on this page');
  }
});

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  // Prevent default form submission if event exists
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Add a small delay to prevent rapid submissions
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('=== Starting login process ===');
  
  // Check if we're already in the middle of a login attempt
  if (loginState.inProgress) {
    console.log('⚠️ Login already in progress - ignoring duplicate submission');
    return false;
  }
  
  // Start login state with the form
  const submissionId = Date.now().toString();
  if (!loginState.start(loginForm, submissionId)) {
    console.log('⚠️ Login submission throttled - too soon since last attempt');
    return false;
  }
  
  console.log('2. Login state started successfully');
  
  // Track login attempt in session storage to detect refresh loops
  try {
    const loginAttempts = parseInt(sessionStorage.getItem('_login_attempts') || '0', 10) + 1;
    sessionStorage.setItem('_login_attempts', loginAttempts.toString());
    
    // If too many login attempts, show error and reset
    if (loginAttempts > 3) {
      console.error('⚠️ Too many login attempts - resetting form');
      showToast('Login Error', 'Too many attempts. Please try again in a moment.', 'error');
      sessionStorage.removeItem('_login_attempts');
      loginState.reset();
      return false;
    }
  } catch (e) {
    console.error('Error tracking login attempts:', e);
  }
  
  try {
    // Get form elements with null checks
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // Validate elements exist
    if (!emailInput || !passwordInput) {
      throw new Error('Required form elements not found');
    }
    
    // Get form values with additional validation
    const email = (emailInput.value || '').trim();
    const password = passwordInput.value || '';
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
    
    // Basic validation with more specific error messages
    if (!email) throw new Error('Please enter your email address');
    if (!password) throw new Error('Please enter your password');
    
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address (e.g., user@example.com)');
    }
    
    // Show loading state with a small delay to allow UI to update
    showSpinner('Signing in...');
    
    // Wait for auth to be ready if needed
    if (!window.auth) {
      console.log('[LOGIN] Auth module not found, checking for Supabase...');
      
      // Check if we have Supabase directly
      if (window.supabase?.auth) {
        console.log('[LOGIN] Found Supabase auth, initializing auth module...');
        window.auth = {
          signIn: (email, password) => window.supabase.auth.signInWithPassword({ email, password }),
          signUp: (email, password) => window.supabase.auth.signUp({ email, password }),
          signOut: () => window.supabase.auth.signOut(),
          getSession: () => window.supabase.auth.getSession(),
          getUser: () => window.supabase.auth.getUser(),
          resetPassword: (email) => window.supabase.auth.resetPasswordForEmail(email),
          client: () => window.supabase,
          isMock: false
        };
      } else {
        console.log('[LOGIN] Waiting for auth module to be ready...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Authentication service timed out'));
          }, 10000);
          
          const onAuthReady = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          document.addEventListener('auth:ready', onAuthReady, { once: true });
          
          // Also check periodically in case the event was missed
          const checkAuth = setInterval(() => {
            if (window.auth) {
              clearInterval(checkAuth);
              onAuthReady();
            }
          }, 100);
        });
      }
        
    }
    
    console.log('[LOGIN] Attempting to sign in with email:', email);
    
    // Sign in using the auth module
    const { data, error } = await window.auth.signIn(email, password);
    
    if (error) throw error;
    
    // Process successful login
    try {
      await processLoginResponse({
        session: data.session,
        user: data.user,
      }, email, rememberMe);
      
      // Clear any stored login attempts on success
      sessionStorage.removeItem('_login_attempts');
      
      return true;
    } catch (error) {
      console.error('[LOGIN] Error during login process:', error);
      throw error; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Show appropriate error message
    let errorMessage = 'Login failed. Please check your credentials and try again.';
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Please verify your email address before logging in.';
    } else if (error.message.includes('too many requests')) {
      errorMessage = 'Too many login attempts. Please try again later.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.message.includes('timed out')) {
      errorMessage = 'The authentication service is taking too long to respond. Please try again.';
    }
    
    showToast('Login Failed', errorMessage, 'error');
    
  } finally {
    // Clean up
    hideSpinner();
    loginState.end();
  }
  
  return false;
}

/**
 * Process successful login response
 * @param {object} data - The response data from the auth module
 * @param {string} email - The user's email address
 * @param {boolean} rememberMe - Whether to remember the user's login details
 */
async function processLoginResponse(data, email, rememberMe) {
  // Show loading state while processing
  showSpinner('Finalizing your login...');
  
  try {
    console.log('[AUTH] Processing login response...');
    
    // Small delay to ensure all auth state is properly updated
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get the current session with retry logic
    let session, error;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const sessionResult = await auth.getSession();
        session = sessionResult.data?.session;
        error = sessionResult.error;
        
        if (session || error) break;
      } catch (e) {
        console.warn(`[AUTH] Session fetch attempt ${retryCount + 1} failed:`, e);
      }
      
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (error) {
      console.error('[AUTH] Error getting session:', error);
      throw error;
    }
    
    if (!session) {
      throw new Error('No active session found after login');
    }
    
    console.log('[AUTH] Session retrieved successfully:', session);
    
    // Store authentication data with error handling
    try {
      if (session.access_token) {
        localStorage.setItem('supabase.auth.token', session.access_token);
        localStorage.setItem('supabase.auth.refreshToken', session.refresh_token || '');
        
        // Set session expiration
        const expiresIn = rememberMe ? 
          30 * 24 * 60 * 60 * 1000 : // 30 days for "remember me"
          2 * 60 * 60 * 1000; // 2 hours for normal sessions
          
        const expiresAt = Date.now() + expiresIn;
        localStorage.setItem('supabase.auth.expiresAt', expiresAt.toString());
        
        console.log(`[AUTH] Auth data stored, expires at: ${new Date(expiresAt).toISOString()}`);
      }
    } catch (storageError) {
      console.error('[AUTH] Error storing auth data:', storageError);
      // Continue even if storage fails - the session might still be valid in memory
    }
    
    // Handle remember me preference
    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
    } catch (e) {
      console.warn('[AUTH] Could not update remember me preference:', e);
    }
    
    // Store user info with error handling
    if (session.user) {
      try {
        localStorage.setItem('user', JSON.stringify(session.user));
      } catch (e) {
        console.warn('[AUTH] Could not store user data:', e);
      }
    }
    
    // Clear any loop detection flags and reset state
    try {
      if (window.authStabilizer) {
        if (typeof window.authStabilizer.clearLoopDetection === 'function') {
          window.authStabilizer.clearLoopDetection();
        }
        if (typeof window.authStabilizer.reset === 'function') {
          window.authStabilizer.reset();
        }
      }
      
      // Clear any stored login attempts
      sessionStorage.removeItem('_login_attempts');
      sessionStorage.removeItem('_login_submitted');
      
    } catch (e) {
      console.warn('[AUTH] Error cleaning up auth state:', e);
    }
    
    // Show success message with a brief delay
    console.log('[AUTH] Login successful, preparing redirect...');
    showToast('Success', 'Login successful!', 'success');
    
    // Determine redirect destination
    let redirectTo = 'dashboard';
    try {
      const storedRedirect = sessionStorage.getItem('redirectAfterLogin');
      if (storedRedirect) {
        // Basic validation of the redirect URL
        const url = new URL(storedRedirect, window.location.origin);
        if (url.origin === window.location.origin) {
          redirectTo = storedRedirect;
        }
        sessionStorage.removeItem('redirectAfterLogin');
      }
    } catch (e) {
      console.warn('[AUTH] Invalid redirect URL in session storage:', e);
    }

    // Ensure redirect path is relative and has proper extension
    if (!redirectTo.startsWith('http') && !redirectTo.startsWith('/')) {
      redirectTo = '/' + redirectTo;
    }
    
    // Add .html extension if missing and not an API endpoint
    if (!redirectTo.endsWith('.html') && !redirectTo.includes('?') && !redirectTo.includes('#')) {
      redirectTo = redirectTo.endsWith('/') 
        ? redirectTo + 'index.html' 
        : redirectTo + '.html';
    }
    
    console.log(`[AUTH] Final redirect path: ${redirectTo}`);
    
    // Small delay before redirect to ensure UI updates and prevent race conditions
    setTimeout(() => {
      try {
        // Get the base URL using the existing utility function if available
        const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
        const fullRedirectUrl = baseUrl + redirectTo;
        
        console.log(`[AUTH] Full redirect URL: ${fullRedirectUrl}`);
        
        // Clear any stored login state
        sessionStorage.removeItem('_login_attempts');
        sessionStorage.removeItem('_login_submitted');
        
        // Add a cache-busting parameter to ensure a fresh page load
        const timestamp = new Date().getTime();
        const separator = fullRedirectUrl.includes('?') ? '&' : '?';
        const redirectUrl = `${fullRedirectUrl}${separator}_=${timestamp}`;
        
        console.log(`[AUTH] Performing redirect to: ${redirectUrl}`);
        
        // Use replace to prevent the login page from being in the browser history
        window.location.replace(redirectUrl);
      } catch (e) {
        console.error('[AUTH] Error during redirect:', e);
        // Fallback to default dashboard with base URL
        const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
        window.location.href = `${baseUrl}/dashboard.html`;
      }
    }, 500);
    
  } catch (error) {
    console.error('[AUTH] Error processing login response:', error);
    
    // Clean up any partial authentication state
    try {
      ['supabase.auth.token', 'supabase.auth.refreshToken', 'supabase.auth.expiresAt', 'user']
        .forEach(key => localStorage.removeItem(key));
      
      if (window.auth) {
        await auth.signOut().catch(e => console.warn('Error during sign out cleanup:', e));
      }
    } catch (cleanupError) {
      console.warn('[AUTH] Error during cleanup after login failure:', cleanupError);
    }
    
    // Show error message
    showToast(
      'Login Error', 
      error.message || 'Failed to complete login. Please try again.', 
      'error'
    );
    
    // Reset login state
    loginState.end();
    hideSpinner();
    
    // Re-enable form after a delay
    setTimeout(() => {
      loginState.reset();
    }, 1000);
  }
}

/**
 * Fill in remembered email if available
 */
function checkRememberedLogin() {
  try {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      const emailInput = document.getElementById('email');
      const rememberMeCheckbox = document.getElementById('rememberMe');

      if (emailInput) {
        emailInput.value = rememberedEmail;
      }

      if (rememberMeCheckbox) {
        rememberMeCheckbox.checked = true;
      }

      // Focus on password field for better UX
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.focus();
      }
    }
  } catch (error) {
    console.error('Error checking remembered login:', error);
  }
}

/**
 * Show loading spinner with message
 * @param {string} message - The message to display with the spinner
 */
function showSpinner(message = 'Loading...') {
  // Check if spinner already exists
  let spinner = document.getElementById('loadingSpinner');
  
  if (!spinner) {
    // Create spinner container
    spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.style.position = 'fixed';
    spinner.style.top = '0';
    spinner.style.left = '0';
    spinner.style.width = '100%';
    spinner.style.height = '100%';
    spinner.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    spinner.style.display = 'flex';
    spinner.style.justifyContent = 'center';
    spinner.style.alignItems = 'center';
    spinner.style.zIndex = '9999';
    spinner.style.flexDirection = 'column';
    spinner.style.color = 'white';
    
    // Create spinner element
    const spinnerElement = document.createElement('div');
    spinnerElement.className = 'spinner-border text-light';
    spinnerElement.style.width = '3rem';
    spinnerElement.style.height = '3rem';
    spinnerElement.role = 'status';
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'mt-3';
    messageElement.textContent = message;
    messageElement.style.fontSize = '1.2rem';
    
    // Append elements
    spinner.appendChild(spinnerElement);
    spinner.appendChild(messageElement);
    document.body.appendChild(spinner);
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
  } else {
    // Update message if spinner already exists
    const messageElement = spinner.querySelector('div:not(.spinner-border)');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }
}

/**
 * Hide loading spinner
 */
function hideSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    // Fade out animation
    spinner.style.transition = 'opacity 0.3s ease';
    spinner.style.opacity = '0';
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (spinner && spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
      }
      // Re-enable body scroll
      document.body.style.overflow = '';
    }, 300);
  }
}

/**
 * Show toast notification
 * @param {string} title - The title of the toast
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 */
function showToast(title, message, type = 'success') {
  // Check if toast container exists, if not create it
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  const toastClass = `toast show align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0`;
  toast.className = toastClass;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}</strong><br>
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 5000);
  
  // Add click handler to close button
  const closeButton = toast.querySelector('.btn-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        if (toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }, 300);
    });
  }
}

/**
 * Initialize password toggle functionality
 */
function initPasswordToggle() {
  const togglePassword = document.querySelector('#togglePassword');
  const passwordInput = document.querySelector('#password');
  
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
      // Toggle the type attribute
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Toggle the icon
      const icon = this.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
      }
      
      // Update aria-label
      const label = type === 'password' ? 'Show password' : 'Hide password';
      this.setAttribute('aria-label', label);
    });
    
    // Handle keyboard navigation
    togglePassword.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  }
}



/**
 * Simulate successful login for development mode
 */
function simulateSuccessfulLogin(identifier, rememberMeCheckbox) {
  console.log('Simulating successful login');
  
  // Create mock user data
  const mockUser = {
    id: 'dev-user-123',
    email: identifier.includes('@') ? identifier : 'dev@example.com',
    phone: identifier.includes('@') ? '+1234567890' : identifier,
    name: 'Development User',
    role: 'user'
  };
  
  // Create a mock token
  const mockToken = 'dev-token-' + Math.random().toString(36).substring(2);
  
  // Store the mock data
  const storage = (rememberMeCheckbox && rememberMeCheckbox.checked) ? localStorage : sessionStorage;
  storage.setItem('trashdrop.token', mockToken);
  storage.setItem('jwt_token', mockToken); // Keep for backward compatibility
  storage.setItem('trashdrop.user', JSON.stringify(mockUser));
  
  // Redirect to dashboard
  const baseUrl = window.baseUrl || window.location.origin;
  window.location.href = `${baseUrl}/dashboard`;
  return true;
}

/**
 * Process any pending login details stored during Safari workaround and attempt automatic login
 */
function processPendingLogin() {
  try {
    // Check if we have pending login data from Safari workaround
    const pendingLogin = sessionStorage.getItem('trashdrop.pendingLogin');
    if (!pendingLogin) return;
       
    const loginData = JSON.parse(pendingLogin);
    if (!loginData.phone || !loginData.password) return;
    
    console.log('Processing pending login for:', loginData.phone);
    
    // Auto-fill the form
    const phoneInput = document.querySelector('input[name="phoneNumber"], #phoneNumber');
    const passwordInput = document.querySelector('input[type="password"], #password');
    const rememberMeCheckbox = document.querySelector('input[name="rememberMe"], #rememberMe');
    const loginForm = document.getElementById('login-form');
    
    if (phoneInput && passwordInput && loginForm) {
      phoneInput.value = loginData.phone;
      passwordInput.value = loginData.password;
      if (rememberMeCheckbox) {
        rememberMeCheckbox.checked = !!loginData.rememberMe;
      }
      
      // Clear the pending login data
      sessionStorage.removeItem('trashdrop.pendingLogin');
      
      // Submit the form after a short delay
      setTimeout(() => {
        loginForm.dispatchEvent(new Event('submit'));
      }, 500);
    }
  } catch (error) {
    console.error('Error processing pending login:', error);
    // Clear the pending login data on error
    sessionStorage.removeItem('trashdrop.pendingLogin');
    
    // Try to fill the form if possible
    try {
      const phoneInput = document.querySelector('input[name="phoneNumber"], #phoneNumber');
      const passwordInput = document.querySelector('input[type="password"], #password');
      const rememberMeCheckbox = document.querySelector('input[name="rememberMe"], #rememberMe');
      
      if (phoneInput) phoneInput.value = loginData?.phone || '';
      if (passwordInput) passwordInput.value = loginData?.password || '';
      if (rememberMeCheckbox) rememberMeCheckbox.checked = !!loginData?.rememberMe;
      
      console.log('Please try submitting the form again');
    } catch (nestedError) {
      console.error('Failed to populate form fields:', nestedError);
    }
  }
}

// Ensure disableSafariSpecialHandling flag persists on window for ease of access
if (sessionStorage.getItem('disableSafariSpecialHandling') === 'true') {
  window.disableSafariSpecialHandling = true;
}

// Add global error handler to ensure login state is reset on unhandled errors
window.addEventListener('error', () => {
  loginState.reset();
});

// Reset login state if user navigates away
window.addEventListener('beforeunload', () => {
  loginState.reset();
});
