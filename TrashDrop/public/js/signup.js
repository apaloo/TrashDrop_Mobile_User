// TrashDrop Signup Page

// Track submissions to prevent duplicates
let step1SubmissionInProgress = false;
let step2SubmissionInProgress = false;

// Global reference to Supabase client
let supabaseClient = null;

// Flag to track initialization state
let isInitialized = false;

// Flag to track if initialization is in progress
let isInitializing = false;

// Helper function to show error messages
function showError(message, title = 'Error') {
    console.error(`${title}: ${message}`);
    
    // Try to show error in UI if elements exist
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    // Also show alert as fallback
    alert(`${title}: ${message}`);
}

// Function to set up auth state change listener
function setupAuthStateListener() {
    if (!window.supabase?.auth) {
        console.warn('Supabase auth not available for state listener');
        return null;
    }
    
    const { data: { subscription } } = window.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN') {
            console.log('User signed in, checking if needs password setup...');
            // Handle redirect after successful sign-in
            const currentPath = window.location.pathname;
            if (!currentPath.includes('dashboard')) {
                window.location.href = '/dashboard.html';
            }
        }
    });
    
    return subscription;
}

// Debug function to log Supabase status
function logSupabaseStatus() {
  console.group('Supabase Status Check');
  console.log('window.supabase exists:', !!window.supabase);
  
  if (window.supabase) {
    console.log('Supabase auth exists:', 'auth' in window.supabase);
    console.log('Supabase auth methods:', 
      typeof window.supabase.auth === 'object' 
        ? Object.getOwnPropertyNames(window.supabase.auth)
            .filter(k => typeof window.supabase.auth[k] === 'function')
        : 'auth is not an object'
    );
    
    // Try to log Supabase version
    try {
      console.log('Supabase version info:', {
        version: window.supabase.supabaseUrl ? 'v2' : 'unknown',
        supabaseUrl: window.supabase.supabaseUrl || 'Not set'
      });
    } catch (e) {
      console.log('Could not get Supabase version info:', e.message);
    }
  }
  console.groupEnd();
}

// Debug function to check Supabase status
function checkSupabaseStatus() {
  console.log('Supabase status:', {
    'window.supabase exists': !!window.supabase,
    'window.supabase.auth exists': window.supabase?.auth ? true : false,
    'window.supabase.auth.getSession exists': window.supabase?.auth?.getSession ? true : false,
    'window.supabase.createClient exists': typeof window.supabase?.createClient === 'function'
  });
}

// Initialize the signup functionality
async function initializeSignup() {
  console.log('Initializing signup functionality...');
  
  if (isInitialized) {
    console.log('Signup already initialized');
    return true;
  }
  
  if (isInitializing) {
    console.log('Signup initialization already in progress');
    return false;
  }
  
  isInitializing = true;
  
  try {
    // Check Supabase status
    checkSupabaseStatus();
    
    // Wait for Supabase to be available
    if (!window.supabase?.auth) {
      console.log('Supabase auth not available, waiting for initialization...');
      
      // Check if Supabase script is loaded but not initialized
      if (window.supabase && !window.supabase.auth && window.supabase.createClient) {
        console.log('Supabase script loaded but not initialized, initializing now...');
        const SUPABASE_URL = 'https://cpeyavpxqcloupolbvyh.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXlhdnB4cWNsb3Vwb2xidnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTY4OTYsImV4cCI6MjA2MTA3Mjg5Nn0.5rxsiRuLHCpeJZ5TqoIA5X4UwoAAuxIpNu_reafwwbQ';
        
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: {
              getItem: (key) => localStorage.getItem(key),
              setItem: (key, value) => localStorage.setItem(key, value),
              removeItem: (key) => localStorage.removeItem(key)
            },
            storageKey: `sb-${SUPABASE_URL.replace(/^https?:\/\//, '').split('/')[0]}-auth-token`,
            phone: true
          }
        });
        
        console.log('Supabase client created directly');
        checkSupabaseStatus();
      } else {
        // Wait for Supabase to be initialized by the main script
        console.log('Waiting for Supabase to be initialized...');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            checkSupabaseStatus();
            reject(new Error('Timeout waiting for Supabase to initialize'));
          }, 10000); // 10 second timeout
          
          const checkSupabaseAuth = () => {
            if (window.supabase?.auth) {
              clearTimeout(timeout);
              console.log('Supabase auth is now available');
              checkSupabaseStatus();
              resolve();
            } else {
              setTimeout(checkSupabaseAuth, 250);
            }
          };
          
          checkSupabaseAuth();
        });
      }
    }
    
    // Store the Supabase client globally
    supabaseClient = window.supabase;
    
    if (!supabaseClient?.auth) {
      checkSupabaseStatus();
      throw new Error('Supabase auth is not available after initialization');
    }
    
    console.log('Checking user session...');
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Error checking session:', error);
      throw error;
    }
    
    if (session) {
      console.log('User already signed in, redirecting to dashboard...');
      window.location.href = '/dashboard.html';
      return false; // Prevent further execution
    }
    
    console.log('Signup initialization complete');
    isInitialized = true;
    return true; // Continue with signup flow
    
  } catch (error) {
    console.error('Error in initializeSignup:', error);
    showToast('Error', 'Failed to initialize authentication. Please refresh the page.', 'error');
    return false;
  } finally {
    isInitializing = false;
  }
}

// Function to check if Supabase is properly initialized
function isSupabaseReady() {
    return typeof window.supabase !== 'undefined' && 
           typeof window.supabase.createClient === 'function';
}

// Function to load Supabase script dynamically (kept for backward compatibility)
function loadSupabase() {
    console.warn('loadSupabase is deprecated. Supabase should be loaded in the HTML file.');
    return Promise.resolve();
}

// Set up the event listener for Supabase ready
document.addEventListener('supabase:ready', (event) => {
    console.log('Supabase ready event received');
    if (event.detail) {
        window.supabase = event.detail;
    }
    initializeSupabaseClient();
}, { once: true });

// Check if Supabase is already available
if (window.supabase?.auth) {
    console.log('Supabase already available, initializing client...');
    initializeSupabaseClient();
}
    
// If Supabase is not immediately available, log the current state and wait for the ready event
console.log('Supabase auth not immediately available, waiting for ready event...');
logSupabaseStatus();

// Set a timeout to show a message if Supabase doesn't load
const loadTimeout = setTimeout(() => {
    if (!window.supabase?.auth) {
        console.warn('Supabase auth still not available after timeout');
        
        // Create loading message
        const loadingMessage = document.createElement('div');
        loadingMessage.id = 'supabase-loading';
        loadingMessage.className = 'text-center p-4';
        loadingMessage.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Initializing authentication service...</p>
        `;
        
        // Add loading message to the page
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.parentNode.insertBefore(loadingMessage, signupForm);
        } else {
            document.body.prepend(loadingMessage);
        }
        
        // Show error message if still not loaded after additional time
        const errorTimeout = setTimeout(() => {
            const loadingEl = document.getElementById('supabase-loading');
            if (loadingEl) {
                loadingEl.innerHTML = `
                    <div class="alert alert-warning">
                        <h5 class="alert-heading">Service Unavailable</h5>
                        <p>The authentication service is taking longer than expected to load.</p>
                        <hr>
                        <p class="mb-0">
                            <button class="btn btn-sm btn-outline-primary" onclick="window.location.reload()">
                                <i class="bi bi-arrow-clockwise"></i> Refresh Page
                            </button>
                        </p>
                    </div>
                `;
            }
            
            if (signupForm) {
                signupForm.style.opacity = '';
                signupForm.style.pointerEvents = '';
            }
        }, 10000); // Show error after 10 seconds
        
        // Clean up the timeout when the page unloads
        window.addEventListener('beforeunload', () => {
            clearTimeout(errorTimeout);
        });
    }
}, 5000); // Initial timeout of 5 seconds

// Clean up the load timeout when the page unloads
window.addEventListener('beforeunload', () => {
    clearTimeout(loadTimeout);
    // Clean up auth state listener
    if (window.authStateSubscription) {
        window.authStateSubscription.unsubscribe();
        delete window.authStateSubscription;
    }
});

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded');
    
    try {
        // Check if we need to show any verification messages
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('verified') === 'true') {
            showToast('Success', 'Your account has been verified! You can now sign in.', 'success');
        }
        
        // Initialize Supabase and signup process
        const initialized = await initializeSignup();
        if (!initialized) {
            console.error('Failed to initialize signup process');
            showToast('Error', 'Failed to initialize. Please refresh the page and try again.', 'error');
            return;
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Log success
        console.log('Signup page initialized successfully');
        
    } catch (error) {
        console.error('Error initializing signup page:', error);
        showToast('Error', 'An error occurred while initializing the page. Please refresh and try again.', 'error');
    }
});

// Set up all event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Get form elements
  const signupFormStep1 = document.getElementById('signup-form-step1');
  const signupFormStep2 = document.getElementById('signup-form-step2');
  const backToStep1Btn = document.getElementById('back-to-step1');
  const resendOtpBtn = document.getElementById('resend-otp');
  
  // Debug logging
  console.log('Form elements:', { signupFormStep1, signupFormStep2, backToStep1Btn, resendOtpBtn });
  
  // Step 1 form submission with duplicate prevention
  if (signupFormStep1) {
    // Store reference to the original form
    const originalForm = signupFormStep1;
    
    // Function to handle form submission
    const handleSubmit = async function(e) {
      console.log('Step 1 form submitted');
      e.preventDefault();
      
      // Prevent multiple submissions
      if (step1SubmissionInProgress) {
        console.log('Preventing duplicate step 1 submission');
        return false;
      }
      
      // Show loading state on the submit button
      const submitButton = e.target.querySelector('button[type="submit"]');
      const spinner = submitButton?.querySelector('.spinner-border');
      if (submitButton) submitButton.disabled = true;
      if (spinner) spinner.classList.remove('d-none');
      
      try {
        // Set flag and handle submission
        step1SubmissionInProgress = true;
        await handleSignupStep1(e);
      } catch (error) {
        console.error('Error in step 1 submission:', error);
        showToast('Error', error.message || 'An error occurred. Please try again.', 'error');
      } finally {
        // Reset button state
        if (submitButton) {
          submitButton.disabled = false;
          if (spinner) spinner.classList.add('d-none');
        }
        // Reset flag after completion
        step1SubmissionInProgress = false;
      }
    };
    
    // Remove any existing listeners to prevent duplicates
    const newForm = originalForm.cloneNode(true);
    originalForm.parentNode.replaceChild(newForm, originalForm);
    
    // Add new listener to the new form
    newForm.addEventListener('submit', handleSubmit);
    
    console.log('Step 1 form listener attached');
  } else {
    console.error('Signup form step 1 not found');
  }
  
  // Step 2 form submission with duplicate prevention
  if (signupFormStep2) {
    // Remove any existing listeners to prevent duplicates
    const newForm2 = signupFormStep2.cloneNode(true);
    signupFormStep2.parentNode.replaceChild(newForm2, signupFormStep2);
    
    // Add new listener
    newForm2.addEventListener('submit', async function(e) {
      console.log('Step 2 form submitted');
      e.preventDefault();
      
      // Prevent multiple submissions
      if (step2SubmissionInProgress) {
        console.log('Preventing duplicate step 2 submission');
        return false;
      }
      
      try {
        // Set flag and handle submission
        step2SubmissionInProgress = true;
        await handleSignupStep2(e);
      } catch (error) {
        console.error('Error in step 2 submission:', error);
        showToast('Error', error.message || 'An error occurred. Please try again.', 'error');
      } finally {
        // Reset flag after completion
        step2SubmissionInProgress = false;
      }
    });
    
    console.log('Step 2 form listener attached');
  }
  
  // Back button
  if (backToStep1Btn) {
    // Remove any existing listeners to prevent duplicates
    const newBackBtn = backToStep1Btn.cloneNode(true);
    backToStep1Btn.parentNode.replaceChild(newBackBtn, backToStep1Btn);
    
    // Add new listener
    newBackBtn.addEventListener('click', () => {
      console.log('Back button clicked');
      // Show step 1 and hide step 2
      document.getElementById('signup-form-step1')?.classList.remove('d-none');
      document.getElementById('signup-form-step2')?.classList.add('d-none');
      document.getElementById('signup-step2')?.classList.add('d-none');
    });
    
    console.log('Back button listener attached');
  }
  
  // Resend OTP button
  if (resendOtpBtn) {
    // Remove any existing listeners to prevent duplicates
    const newResendBtn = resendOtpBtn.cloneNode(true);
    resendOtpBtn.parentNode.replaceChild(newResendBtn, resendOtpBtn);
    
    // Add new listener
    newResendBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      console.log('Resend OTP button clicked');
      try {
        await handleResendOTP();
      } catch (error) {
        console.error('Error resending OTP:', error);
        showToast('Error', 'Failed to resend verification code. Please try again.', 'error');
      }
    });
    
    console.log('Resend OTP button listener attached');
  }
  
  console.log('Event listeners set up successfully');
}
// Main initialization when the script loads
console.log('Signup script loaded');

// Make Supabase client available globally for debugging
window.debugSupabase = window.supabase;
console.log('Supabase client available as window.debugSupabase');

// Check for URL parameters (e.g., verification success)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('verified') === 'true') {
  showToast('Success', 'Your email has been verified! You can now sign in.', 'success');
}

// Function to initialize the application
const init = async () => {
  // Prevent multiple initializations
  if (window.signupInitializing) return;
  window.signupInitializing = true;
  
  try {
    console.log('Starting application initialization...');
    
    // Initialize Supabase and check authentication status
    const shouldContinue = await initializeSignup();
    if (!shouldContinue) return;
    
    console.log('Setting up event listeners...');
    setupEventListeners();
    
    // Log Supabase status for debugging
    logSupabaseStatus();
    
    // Set up auth state listener
    const authListener = setupAuthStateListener();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      if (authListener && authListener.unsubscribe) {
        console.log('Cleaning up auth listener...');
        authListener.unsubscribe();
      }
      window.signupInitializing = false;
    });
    
    console.log('Signup page fully initialized and ready');
    
  } catch (error) {
    console.error('Failed to initialize signup:', error);
    showToast('Error', 'Failed to initialize. Please refresh the page and try again.', 'error');
    window.signupInitializing = false;
  }
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM already loaded, initialize immediately
  setTimeout(init, 0);
}
  
  // Function to setup auth state change listener
  function setupAuthStateListener() {
    if (window.supabase?.auth) {
      console.log('Setting up auth state change listener');
      const { data: { subscription } } = window.supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN') {
          // User is signed in, redirect to dashboard
          console.log('User signed in, redirecting to dashboard');
          window.location.href = '/dashboard.html';
        }
      });
      
      // Return the subscription so it can be cleaned up
      return subscription;
    } else {
      console.warn('Supabase auth not available when setting up auth state listener');
      return null;
    }
  }
  
// Initialize the signup process which will set up the Supabase client
initializeSignup().then(() => {
  // After initialization, set up the auth state listener
  const authListener = setupAuthStateListener();
  
  // Store the subscription for cleanup
  if (authListener) {
    window.authStateSubscription = authListener;
  }
  
  // Cleanup function when page unloads
  window.addEventListener('beforeunload', () => {
    console.log('Cleaning up signup resources');
    // Clean up auth state listener
    if (window.authStateSubscription && typeof window.authStateSubscription.unsubscribe === 'function') {
      window.authStateSubscription.unsubscribe();
    }
  });
});

async function handleSignupStep1(e) {
  if (e) e.preventDefault();
  
  // Prevent multiple submissions
  if (step1SubmissionInProgress) return;
  step1SubmissionInProgress = true;
  
  // Get form and button references
  const form = e.target.closest('form');
  const submitButton = form?.querySelector('button[type="submit"]');
  const spinner = submitButton?.querySelector('.spinner-border');
  
  try {
    console.log('handleSignupStep1 started');
    
    // Show loading state
    if (submitButton) submitButton.disabled = true;
    if (spinner) spinner.classList.remove('d-none');
    
    // Get form inputs
    const phoneInput = document.getElementById('phone');
    console.log('Phone input element:', phoneInput);
    
    // Validate form
    if (!phoneInput || !phoneInput.value.trim()) {
      phoneInput?.classList.add('is-invalid');
      throw new Error('Please enter a phone number');
    }
    
    // Format and validate phone number
    let formattedPhone = phoneInput.value.trim().replace(/\s+/g, '');
    
    // If it already starts with +, validate the format
    if (formattedPhone.startsWith('+')) {
      if (!/^\+\d{8,15}$/.test(formattedPhone)) {
        phoneInput?.classList.add('is-invalid');
        throw new Error('Please enter a valid phone number with country code (e.g., +12345678900)');
      }
    } 
    // If it's just numbers, format based on length
    else if (/^\d+$/.test(formattedPhone)) {
      // If it's 10 digits, assume it's a US/Canada number without country code
      if (formattedPhone.length === 10) {
        formattedPhone = `+1${formattedPhone}`;
      }
      // If it's 11 digits starting with 1, assume it's a US/Canada number with country code
      else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = `+${formattedPhone}`;
      } else {
        phoneInput?.classList.add('is-invalid');
        throw new Error('Please include a valid country code (e.g., +1 for US/Canada)');
      }
    } else {
      // If we get here, the format is not recognized
      phoneInput?.classList.add('is-invalid');
      throw new Error('Please enter a valid phone number with country code (e.g., +12345678900 or 1234567890)');
    }
    
    // Clear any previous validation errors
    phoneInput?.classList.remove('is-invalid');
    
    // Store the formatted phone number
    sessionStorage.setItem('signup_phone', formattedPhone);
    
    console.log('Attempting to send OTP to:', formattedPhone);
    
    // Get the Supabase client
    const supabase = window.supabase;
    if (!supabase?.auth) {
      console.error('Supabase auth not available');
      throw new Error('Authentication service is not available. Please refresh the page and try again.');
    }
    
    // Prepare the auth options
    const authOptions = {
      shouldCreateUser: true, // This will create a new user if not exists
      data: {
        phone: formattedPhone
      },
      channel: 'sms'
    };
    
    console.log('Auth options:', authOptions);
    
    // Send OTP to the provided phone number
    console.log('Sending OTP to:', formattedPhone);
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: authOptions
    });
    
    if (error) {
      console.error('Error sending OTP:', error);
      throw new Error(error.message || 'Failed to send verification code');
    }
    
    // Show success message and move to OTP verification step
    showToast('Success', 'Verification code sent! Please check your phone.', 'success');
    
    // Show the OTP verification form and hide the phone form
    document.getElementById('signup-form-step1')?.classList.add('d-none');
    document.getElementById('signup-form-step2')?.classList.remove('d-none');
    document.getElementById('otp')?.focus();
    
  } catch (error) {
    console.error('Error in handleSignupStep1:', error);
    
    // In development mode, continue to step 2 even on error
    const isLocalhost = window.location.hostname.includes('localhost') || 
                       window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      console.log('Error occurred, but continuing to step 2 in development mode');
      try {
        // Move to OTP verification step
        document.getElementById('signup-form-step1')?.classList.add('d-none');
        document.getElementById('signup-form-step2')?.classList.remove('d-none');
        document.getElementById('otp')?.focus();
        return; // Exit early in development mode
      } catch (uiError) {
        console.error('Error in development mode fallback:', uiError);
      }
    }
    
    // Show error message
    showToast('Error', error.message || 'Failed to send verification code', 'error');
    
  } finally {
    // Reset button state
    if (submitButton) {
      submitButton.disabled = false;
      if (spinner) spinner.classList.add('d-none');
    }
    
    // Reset submission flag
    step1SubmissionInProgress = false;
  }
}

// Handle signup step 2 (OTP verification and password creation)
async function handleSignupStep2(e) {
  e.preventDefault();
  
  // Prevent multiple submissions
  if (step2SubmissionInProgress) return;
  step2SubmissionInProgress = true;
  
  try {
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const spinner = submitButton?.querySelector('.spinner-border');
    if (submitButton) submitButton.disabled = true;
    if (spinner) spinner.classList.remove('d-none');
    
    // Get form elements
    const otpInput = document.getElementById('otp');
    const passwordInput = document.getElementById('password');
    
    // Reset validation
    otpInput?.classList.remove('is-invalid');
    passwordInput?.classList.remove('is-invalid');
    
    // Validate OTP
    if (!otpInput?.value.trim() || !/^\d{6}$/.test(otpInput.value.trim())) {
      otpInput?.classList.add('is-invalid');
      throw new Error('Please enter a valid 6-digit verification code.');
    }
    
    // Validate password
    if (!passwordInput?.value || passwordInput.value.length < 6) {
      passwordInput?.classList.add('is-invalid');
      throw new Error('Password must be at least 6 characters long.');
    }
    
    // Get stored phone from session
    const phone = sessionStorage.getItem('signup_phone');
    if (!phone) {
      throw new Error('Your session has expired. Please start over.');
    }
    
    const otp = otpInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Verifying OTP for phone:', phone);
    
    // Get Supabase client
    const supabase = window.supabase;
    if (!supabase?.auth) {
      throw new Error('Authentication service is not available. Please refresh the page.');
    }
    
    // Verify OTP and sign in
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otp,
      type: 'sms'
    });
    
    if (error) {
      console.error('OTP verification error:', error);
      throw new Error(error.message || 'Invalid verification code. Please try again.');
    }
    
    console.log('OTP verified successfully:', data);
    
    // Update user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });
    
    if (updateError) {
      console.error('Password update error:', updateError);
      throw new Error('Failed to set password. Please try again.');
    }
    
    console.log('Password updated successfully');
    
    // Show success message
    showToast('Success', 'Account created successfully! Redirecting...', 'success');
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
    
  } catch (error) {
    console.error('Error in handleSignupStep2:', error);
    showToast('Error', error.message || 'Failed to verify code. Please try again.', 'error');
  } finally {
    // Reset loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const spinner = submitButton?.querySelector('.spinner-border');
    if (submitButton) submitButton.disabled = false;
    if (spinner) spinner.classList.add('d-none');
    
    // Reset submission flag
    step2SubmissionInProgress = false;
  }
  
  // Show loading spinner
  showSpinner('Verifying your code...');
  
  try {
    // Get the Supabase client from the window object
    const supabase = window.supabase;
    if (!supabase) {
      throw new Error('Authentication service is not available. Please refresh the page and try again.');
    }

    // Format phone number (ensure it starts with + and country code)
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    
    // Verify the OTP using Supabase v2 API
    const { data: { session, user, error: verifyError } } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otpInput.value.trim(),
      type: 'sms',
      options: {
        redirectTo: window.TRASHDROP_SITE_URL || 'http://localhost:3000'
      }
    });

    if (verifyError) {
      console.error('Error verifying OTP:', verifyError);
      throw new Error('Invalid or expired verification code. Please try again or request a new code.');
    }

    // Update user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordInput.value,
      data: { full_name: fullName }
    });

    if (updateError) {
      console.error('Error updating user:', updateError);
      throw new Error('Failed to set up your account. Please try again.');
    }
    
    // Hide spinner
    hideSpinner();
    
    // Show success message
    showToast('Account Created', 'Your account has been successfully created!', 'success');
    
    // Clear session storage
    sessionStorage.removeItem('signup_phone');
    sessionStorage.removeItem('signup_fullName');
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
    
  } catch (error) {
    // Hide spinner
    hideSpinner();
    
    console.error('Signup step 2 error:', error);
    const errorMessage = error.message || 'Failed to verify code. Please try again.';
    showToast('Verification Failed', errorMessage, 'error');
    
    // Handle specific Supabase errors
    if (error.message.includes('Invalid OTP')) {
      errorMessage = 'Invalid verification code. Please try again.';
    } else if (error.message.includes('expired')) {
      errorMessage = 'Verification code has expired. Please request a new one.';
    }
    
    showToast('Error', errorMessage, 'error');
  } finally {
    // Reset button state
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
    step2SubmissionInProgress = false;
  }
}

// Handle resend OTP button
async function handleResendOTP() {
  // Prevent multiple clicks
  if (step1SubmissionInProgress) return;
  step1SubmissionInProgress = true;
  
  // Get the phone number from session storage
  const phone = sessionStorage.getItem('signup_phone');
  const fullName = sessionStorage.getItem('signup_fullName');
  
  if (!phone || !fullName) {
    showToast('Error', 'Session expired. Please start over.', 'error');
    step1SubmissionInProgress = false;
    return;
  }
  
  // Show loading spinner
  showSpinner('Sending new verification code...');
  
  // Disable button and show loading state
  resendButton.disabled = true;
  const originalText = resendButton.innerHTML;
  resendButton.innerHTML = `
    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    Sending...
  `;
  
  try {
    if (!supabaseClient) {
      throw new Error('Authentication service not available');
    }
    
    // Resend OTP using Supabase
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      phone,
      options: {
        data: {
          full_name: fullName || 'User',
          email: email || null
        }
      }
    });
    
    if (error) throw error;
    
    // Show success message
    showToast('Success', 'New verification code sent', 'success');
    
    // Start cooldown timer
    startResendCooldown();
    
  } catch (error) {
    console.error('Error resending OTP:', error);
    
    // Log additional error details for debugging
    if (error.response) {
      console.error('Error response:', {
        status: error.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error.message);
    }
    
    // Handle specific error cases
    let errorMessage = 'Failed to send verification code. Please try again.';
    
    if (error.message) {
      if (error.message.includes('rate limit') || error.status === 429) {
        errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
      } else if (error.message.includes('phone') || error.message.includes('Phone')) {
        errorMessage = 'Invalid phone number format. Please include country code (e.g., +1 for US/Canada).';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'The phone number or verification code is incorrect.';
      } else {
        errorMessage = error.message;
      }
    }
    
    showToast('Error', errorMessage, 'error');
    
  } finally {
    // Always clean up the loading state
    step1SubmissionInProgress = false;
    
    // Hide loading spinner and re-enable the submit button
    const submitBtn = document.getElementById('submit-step1');
    if (submitBtn) {
      submitBtn.disabled = false;
      const spinner = submitBtn.querySelector('.spinner-border');
      if (spinner) spinner.remove();
    }
    
    // Also ensure any global loading spinner is hidden
    const globalSpinner = document.getElementById('loading-spinner');
    if (globalSpinner) {
      globalSpinner.classList.add('d-none');
    }
  }
}

// Validate phone number format
function isValidPhoneNumber(phone) {
  // Basic validation - at least 10 digits
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im;
  return phoneRegex.test(phone);
}

// Show loading spinner
function showSpinner(message = 'Loading...') {
  // Create or update spinner
  let spinner = document.getElementById('loading-spinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
    spinner.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    spinner.style.zIndex = '9999';
    
    const spinnerContent = document.createElement('div');
    spinnerContent.className = 'text-center bg-white p-4 rounded';
    
    const spinnerElement = document.createElement('div');
    spinnerElement.className = 'spinner-border text-primary mb-2';
    spinnerElement.role = 'status';
    
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.className = 'mt-2';
    
    spinnerContent.appendChild(spinnerElement);
    spinnerContent.appendChild(document.createElement('br'));
    spinnerContent.appendChild(messageElement);
    spinner.appendChild(spinnerContent);
    document.body.appendChild(spinner);
  } else {
    // Update message if spinner already exists
    const messageElement = spinner.querySelector('.mt-2');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }
  
  // Disable form inputs
  document.querySelectorAll('input, button').forEach(el => {
    el.disabled = true;
  });
}

// Hide loading spinner
function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.remove();
  }
  
  // Re-enable form inputs
  document.querySelectorAll('input, button').forEach(el => {
    el.disabled = false;
  });
}

// Show toast notification
function showToast(title, message, type = 'success') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = `toast-${Date.now()}`;
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast show`;
  toast.role = 'alert';
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  // Set toast content based on type
  const typeClass = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-dark',
    info: 'bg-info text-dark'
  }[type] || 'bg-light text-dark';
  
  toast.innerHTML = `
    <div class="toast-header ${typeClass}">
      <strong class="me-auto">${title}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Auto-remove after delay
  setTimeout(() => {
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
      toastElement.remove();
    }
    
    // Remove container if empty
    if (toastContainer && toastContainer.children.length === 0) {
      toastContainer.remove();
    }
  }, 5000);
}
