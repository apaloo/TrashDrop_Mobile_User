// TrashDrop Login Page

// Centralized login state management
const loginState = {
  inProgress: false,
  form: null,
  
  start: function(form) {
    if (this.inProgress) return false;
    this.inProgress = true;
    this.form = form;
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
    }
    return true;
  },
  
  end: function() {
    this.inProgress = false;
    if (this.form) {
      const submitBtn = this.form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
      this.form = null;
    }
  },
  
  reset: function() {
    this.inProgress = false;
    this.form = null;
  }
};

// Reset login state on page load to prevent stuck states
window.addEventListener('load', () => {
  loginState.reset();
});

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Login page initialized');
  
  // Check if we were in a redirect loop and show appropriate message
  if (sessionStorage.getItem('_authStabilizer_loopHandled')) {
    console.log('Login page loaded after handling a refresh loop');
  }
  
  // Initialize base URL if available
  if (typeof window.initializeBaseUrl === 'function') {
    window.initializeBaseUrl();
    console.log('Base URL initialized');
  }
  
  const loginForm = document.getElementById('login-form');
  
  // Check if we're on the login page
  if (loginForm) {
    console.log('Login form found, attaching event listeners');
    
    // Add submit event listener with duplicate submission prevention
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Prevent multiple submissions
      if (!loginState.start(this)) {
        console.log('Login already in progress, ignoring additional request');
        return false;
      }
      
      try {
        // Handle login using the event directly
        await handleLogin(e);
      } catch (error) {
        console.error('Login error:', error);
        // Show error to user
        showToast('Login Failed', 'An error occurred during login. Please try again.', 'error');
      } finally {
        // Always ensure we clean up the login state
        loginState.end();
      }
    });
    
    // Initialize password toggle functionality
    initPasswordToggle();
    
    // Check for remembered login details
    checkRememberedLogin();
  } else {
    console.log('Login form not found on this page');
  }
  
  // Attempt to automatically process any pending login details stored during Safari workaround
  processPendingLogin();
});

// Function to handle login form submission
async function handleLogin(e) {
  if (e) e.preventDefault();
  
  console.log('Starting login process');
  const form = loginState.form;
  
  // Show loading state
  const submitBtn = form?.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn?.innerHTML || '';
  if (submitBtn) {
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging in...';
  }
  
  // Get form elements
  const phoneInput = document.getElementById('phoneNumber');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  
  if (!phoneInput || !passwordInput) {
    console.error('Required form elements not found');
    loginState.end();
    return;
  }
  
  // Clear any previous error messages
  const errorMessages = document.querySelectorAll('.login-error-message');
  errorMessages.forEach(msg => msg.remove());
  
  // Validate form
  let isValid = true;
  
  // Handle both phone number and email formats
  const inputValue = phoneInput.value.trim();
  const isEmail = inputValue.includes('@');
  
  if (!inputValue) {
    phoneInput.classList.add('is-invalid');
    isValid = false;
  } else {
    // If it's an email, just validate it contains @ and .
    // If it's a phone, check if it has a country code
    if (isEmail) {
      if (!inputValue.includes('.')) {
        phoneInput.classList.add('is-invalid');
        isValid = false;
      } else {
        phoneInput.classList.remove('is-invalid');
      }
    } else {
      // For phone numbers, we're being flexible in development mode
      phoneInput.classList.remove('is-invalid');
    }
  }
  
  if (!passwordInput.value) {
    passwordInput.classList.add('is-invalid');
    isValid = false;
  } else {
    passwordInput.classList.remove('is-invalid');
  }
  
  if (!isValid) {
    loginInProgress = false;
    return;
  }
  
  // Show loading spinner
  showSpinner('Logging in...');
  
  try {
    console.log('Starting login process...');
    
    // Use the baseUrl from base-url.js if available, otherwise fallback to current origin
    const baseUrl = window.baseUrl || window.location.origin;
    const apiUrl = `${baseUrl}/auth/login`;
    
    console.log(`Sending login request to: ${apiUrl}`);
    
    // Check if we're on localhost/127.0.0.1 to ensure we use HTTP
    let isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    
    // Use the isSafari function from base-url.js if available, otherwise fallback to UA detection
    let isSafari = window.isSafari ? window.isSafari() : /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Check if Safari special handling is disabled (persisted in sessionStorage)
    const disableSafariSpecialHandling = sessionStorage.getItem('disableSafariSpecialHandling') === 'true' || window.disableSafariSpecialHandling;
    
    // Only use the special Safari handling if not disabled and we're not already on /account-access
    if (isSafari && isLocalhost && !disableSafariSpecialHandling && !window.location.pathname.includes('/account-access')) {
      console.log('Using Safari-specific login approach');
      
      // Check if we've already attempted this special handling
      if (sessionStorage.getItem('safari_login_attempts')) {
        // We've already tried this approach, don't try again to avoid loops
        console.log('Skipping Safari special handling to prevent loops');
      } else {
        // Track this attempt
        let attempts = parseInt(sessionStorage.getItem('safari_login_attempts') || '0');
        sessionStorage.setItem('safari_login_attempts', (attempts + 1).toString());
        
        // Only try the special handling if we haven't exceeded attempts
        if (attempts < 2) {
          showToast('Redirecting', 'Processing login request...', 'info');
          
          // Store login details temporarily in sessionStorage
          sessionStorage.setItem('trashdrop.pendingLogin', JSON.stringify({
            phone: phoneInput.value,
            password: passwordInput.value,
            rememberMe: rememberMeCheckbox && rememberMeCheckbox.checked
          }));
          
          // Disable further Safari special handling for subsequent loads
          sessionStorage.setItem('disableSafariSpecialHandling', 'true');
          
          // Use account-access route which is configured to bypass Safari security restrictions
          window.location.href = `${baseUrl}/account-access`;
          return;
        }
      }
    }
    
    // For other browsers, make a direct fetch call to the login API
    console.log('Making API request with credentials');
    
    // Create request payload based on input type (email or phone)
    const isEmail = phoneInput.value.includes('@');
    const payload = {
      password: passwordInput.value
    };
    
    // Add either email or phone based on what was entered
    if (isEmail) {
      payload.email = phoneInput.value;
    } else {
      payload.phone = phoneInput.value;
    }
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Add credentials to handle cookies properly
        credentials: 'include'
      });
      
      console.log('Received response:', response.status, response.statusText);
      
      // For development mode, we can simulate a successful login even if the API fails
      if (!response.ok && window.location.hostname.includes('localhost')) {
        console.log('Simulating successful login in development mode');
        return simulateSuccessfulLogin(phoneInput.value, rememberMeCheckbox);
      }
      
      const result = await response.json();
      console.log('Response data received');
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to log in');
      }
      
      // Process successful login response
      return processLoginResponse(result, phoneInput.value, rememberMeCheckbox);
    } catch (error) {
      // If in development mode, simulate successful login on error
      if (window.location.hostname.includes('localhost')) {
        console.log('Error occurred, simulating successful login in development mode', error);
        return simulateSuccessfulLogin(phoneInput.value, rememberMeCheckbox);
      }
      throw error;
    }

  } catch (error) {
    // Reset login in progress flag
    loginInProgress = false;
    
    // Hide spinner
    hideSpinner();
    
    console.error('Login error:', error);
    
    // Reset Safari login attempts on error
    sessionStorage.removeItem('safari_login_attempts');
    
    // Create an error message element with red background
    const loginForm = document.getElementById('login-form');
    const errorElement = document.createElement('div');
    errorElement.className = 'alert alert-danger mt-3 login-error-message';
    errorElement.textContent = error.message || 'Failed to login. Please check your credentials.';
    
    // Insert error message before the form submit button
    if (loginForm) {
      const submitButton = loginForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.parentNode.insertBefore(errorElement, submitButton);
      } else {
        loginForm.appendChild(errorElement);
      }
    }
    
    // Also show toast notification
    showToast('Login Error', error.message || 'Failed to login. Please check your credentials.', 'danger');
  } finally {
    // Always reset the login in progress flag
    loginInProgress = false;
  }
}

// Fill in remembered phone number if available
function checkRememberedLogin() {
  const rememberMe = localStorage.getItem('trashdrop.rememberMe');
  const phoneNumber = localStorage.getItem('trashdrop.phone');
  
  if (rememberMe && phoneNumber) {
    const phoneInput = document.getElementById('phoneNumber');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    if (phoneInput) phoneInput.value = phoneNumber;
    if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
  }
}

// Show loading spinner
function showSpinner(message = 'Loading...') {
  // Remove existing spinner if any
  const existingSpinner = document.querySelector('.spinner-overlay');
  if (existingSpinner) {
    existingSpinner.remove();
  }
  
  // Create spinner element
  const spinnerHtml = `
    <div class="spinner-overlay">
      <div class="spinner-container">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">${message}</p>
      </div>
    </div>
  `;
  
  // Append to body
  document.body.insertAdjacentHTML('beforeend', spinnerHtml);
}

// Hide loading spinner
function hideSpinner() {
  const spinner = document.querySelector('.spinner-overlay');
  if (spinner) {
    spinner.remove();
  }
}

// Show toast notification
function showToast(title, message, type = 'success') {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="5000">
      <div class="toast-header bg-${type} text-white">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  // Add toast to container
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  
  // Initialize and show toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  
  // Remove toast when hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// Initialize password toggle functionality
function initPasswordToggle() {
  const toggleButton = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  
  if (!toggleButton || !passwordInput) {
    console.log('Password toggle elements not found');
    return;
  }
  
  toggleButton.addEventListener('click', function() {
    // Toggle password visibility
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleButton.querySelector('i').classList.remove('bi-eye');
      toggleButton.querySelector('i').classList.add('bi-eye-slash');
    } else {
      passwordInput.type = 'password';
      toggleButton.querySelector('i').classList.remove('bi-eye-slash');
      toggleButton.querySelector('i').classList.add('bi-eye');
    }
  });
}

// Process successful login response
function processLoginResponse(result, identifier, rememberMeCheckbox) {
  // Store the token and user data
  const storage = (rememberMeCheckbox && rememberMeCheckbox.checked) ? localStorage : sessionStorage;
  
  // Handle different API response formats
  const token = result.token || (result.data && result.data.token) || '';
  const user = result.user || (result.data && result.data.user) || { email: identifier };
  
  // Store with consistent keys
  storage.setItem('trashdrop.token', token);
  storage.setItem('jwt_token', token); // Keep for backward compatibility
  storage.setItem('trashdrop.user', JSON.stringify(user));
  
  // Store Supabase token if available
  if (result.session && result.session.access_token) {
    storage.setItem('supabase.auth.token', result.session.access_token);
  }
  
  // If remember me is checked, store user preference
  if (rememberMeCheckbox && rememberMeCheckbox.checked) {
    localStorage.setItem('trashdrop.rememberMe', 'true');
    localStorage.setItem('trashdrop.phone', identifier);
  }
  
  // Redirect to dashboard
  console.log('Login successful, redirecting to dashboard');
  
  // Get the baseUrl for navigation
  const baseUrl = window.baseUrl || window.location.origin;
  window.location.href = `${baseUrl}/dashboard`;
  return true;
}

// Simulate successful login for development mode
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

// Process any pending login details stored during Safari workaround and attempt automatic login
function processPendingLogin() {
  const pendingData = sessionStorage.getItem('trashdrop.pendingLogin');
  if (!pendingData) return;
  try {
    const { phone, password, rememberMe } = JSON.parse(pendingData);
    const phoneInput = document.getElementById('phoneNumber');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');

    if (phoneInput) phoneInput.value = phone || '';
    if (passwordInput) passwordInput.value = password || '';
    if (rememberMeCheckbox) rememberMeCheckbox.checked = !!rememberMe;

    // Clear pending data to avoid reprocessing
    sessionStorage.removeItem('trashdrop.pendingLogin');

    console.log('Automatically submitting pending login after Safari redirect');
    // Trigger login programmatically
    handleLogin();
  } catch (err) {
    console.error('Failed to process pending login data:', err);
    // Ensure we don't retry endlessly
    sessionStorage.removeItem('trashdrop.pendingLogin');
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
