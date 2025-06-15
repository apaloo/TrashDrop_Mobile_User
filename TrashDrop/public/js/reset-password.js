// TrashDrop Password Reset - Email-based

// Configuration using AppConfig
let CONFIG = {
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    hasUppercase: /[A-Z]/,
    hasNumber: /\d/,
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/
  },
  REDIRECT_URL: window.location.origin + '/reset-password.html'
};

// Initialize configuration asynchronously
async function initializeConfig() {
  try {
    if (window.AppConfig && !window.AppConfig.initialized) {
      await window.AppConfig.initialize();
    }
    
    // Load Supabase credentials from AppConfig
    CONFIG.SUPABASE_URL = window.AppConfig.get('supabase.url');
    CONFIG.SUPABASE_KEY = window.AppConfig.get('supabase.anonKey');
    
    // Update redirect URL from config if available
    const resetPasswordPath = window.AppConfig.get('routes.resetPassword');
    if (resetPasswordPath) {
      CONFIG.REDIRECT_URL = window.location.origin + resetPasswordPath;
    }
    
    // Update password requirements if specified in config
    const passwordMinLength = window.AppConfig.get('security.password.minLength');
    if (passwordMinLength) {
      CONFIG.PASSWORD_REQUIREMENTS.minLength = passwordMinLength;
    }
    
    console.log('Configuration initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize configuration:', error);
    return false;
  }
};

// State
const state = {
  supabase: null,
  accessToken: null,
  email: null
};

// DOM Elements
const elements = {
  emailInput: null,
  passwordInput: null,
  confirmPasswordInput: null,
  resetForm: null,
  messageDiv: null,
  loadingIndicator: null,
  passwordStrengthMeter: null
};

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing password reset...');
  
  try {
    // Initialize configuration
    await initializeConfig();
    
    // Initialize Supabase
    await initializeSupabase();
    
    // Initialize DOM elements
    initializeElements();
    
    // Check for access token in URL or storage
    await checkForAccessToken();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Password reset initialized successfully');
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize password reset. Please refresh the page and try again.');
  }
});

// Initialize Supabase client
async function initializeSupabase() {
  console.log('Initializing Supabase client...');
  
  // Load Supabase if not already available
  if (typeof supabase === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  }
  
  // Create Supabase client
  state.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  
  console.log('Supabase client initialized');
}

// Load script dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (error) => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Initialize DOM elements
function initializeElements() {
  console.log('Initializing DOM elements...');
  
  // Form elements
  elements.resetForm = document.getElementById('resetForm');
  elements.emailInput = document.getElementById('email');
  elements.passwordInput = document.getElementById('password');
  elements.confirmPasswordInput = document.getElementById('confirmPassword');
  elements.messageDiv = document.getElementById('message');
  elements.loadingIndicator = document.getElementById('loadingIndicator');
  elements.passwordStrengthMeter = document.getElementById('passwordStrengthMeter');
  
  // Buttons
  elements.submitButton = document.querySelector('button[type="submit"]');
  
  console.log('DOM elements initialized:', elements);
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Form submission
  if (elements.resetForm) {
    elements.resetForm.addEventListener('submit', handleFormSubmit);
    console.log('Added form submit listener');
  }
  
  // Password strength meter
  if (elements.passwordInput) {
    elements.passwordInput.addEventListener('input', updatePasswordStrength);
    console.log('Added password strength listener');
  }
  
  // Enter key in password fields
  if (elements.passwordInput) {
    elements.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFormSubmit(e);
      }
    });
  }
  
  if (elements.confirmPasswordInput) {
    elements.confirmPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFormSubmit(e);
      }
    });
  }
  
  console.log('Event listeners set up');
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  console.log('Form submitted');
  
  const formData = new FormData(e.target);
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  
  // Check which step we're on
  if (email) {
    await handleForgotPassword(email);
  } else if (password && confirmPassword) {
    await handleResetPassword(password, confirmPassword);
  }
}

// Handle forgot password request
async function handleForgotPassword(email) {
  console.log('Handling forgot password for:', email);
  
  if (!email) {
    showError('Please enter your email address');
    return;
  }
  
  try {
    setLoading(true);
    
    const { error } = await state.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: CONFIG.REDIRECT_URL
    });
    
    if (error) throw error;
    
    showSuccess('Password reset link sent! Please check your email.');
    console.log('Password reset email sent to:', email);
    
    // Store email for next step
    state.email = email;
    
  } catch (error) {
    console.error('Error sending reset email:', error);
    
    let errorMessage = 'Failed to send reset link. Please try again.';
    if (error.message.includes('user not found')) {
      errorMessage = 'No account found with this email address.';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Too many attempts. Please try again later.';
    }
    
    showError(errorMessage);
  } finally {
    setLoading(false);
  }
}

// Handle password reset
async function handleResetPassword(password, confirmPassword) {
  console.log('Handling password reset');
  
  // Validate passwords
  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  if (!validatePassword(password)) {
    showError('Password does not meet requirements');
    return;
  }
  
  try {
    setLoading(true);
    
    // Get the access token from URL or state
    const accessToken = getAccessTokenFromUrl() || state.accessToken;
    if (!accessToken) {
      throw new Error('Invalid or expired reset link');
    }
    
    // Update password
    const { error } = await state.supabase.auth.updateUser(accessToken, {
      password: password
    });
    
    if (error) throw error;
    
    // Show success message
    showSuccess('Your password has been reset successfully!');
    console.log('Password reset successful');
    
    // Redirect to login after delay
    setTimeout(() => {
      window.location.href = './auth-standalone.html';
    }, 2000);
    
  } catch (error) {
    console.error('Error resetting password:', error);
    
    let errorMessage = 'Failed to reset password. Please try again.';
    if (error.message.includes('invalid_grant') || error.message.includes('invalid_token')) {
      errorMessage = 'This password reset link has expired or is invalid. Please request a new one.';
    } else if (error.message.includes('weak_password')) {
      errorMessage = 'Password is too weak. Please choose a stronger password.';
    }
    
    showError(errorMessage);
  } finally {
    setLoading(false);
  }
}

// Check for access token in URL
async function checkForAccessToken() {
  console.log('Checking for access token...');
  
  // Check URL hash first
  const hash = window.location.hash.substring(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const type = params.get('type');
    
    if (accessToken && type === 'recovery') {
      console.log('Found access token in URL');
      state.accessToken = accessToken;
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show password reset form
      showPasswordResetForm();
      return true;
    }
  }
  
  // Check for token in localStorage as fallback
  const storedToken = localStorage.getItem('sb-access-token');
  if (storedToken) {
    console.log('Found access token in localStorage');
    state.accessToken = storedToken;
    showPasswordResetForm();
    return true;
  }
  
  console.log('No access token found');
  return false;
}

// Show password reset form
function showPasswordResetForm() {
  console.log('Showing password reset form');
  
  // Hide email form, show password form
  const emailForm = document.getElementById('emailForm');
  const passwordForm = document.getElementById('passwordForm');
  
  if (emailForm) emailForm.style.display = 'none';
  if (passwordForm) passwordForm.style.display = 'block';
  
  // Focus password field
  if (elements.passwordInput) {
    elements.passwordInput.focus();
  }
}

// Validate password against requirements
function validatePassword(password) {
  if (!password) return false;
  
  const requirements = CONFIG.PASSWORD_REQUIREMENTS;
  
  return (
    password.length >= requirements.minLength &&
    requirements.hasUppercase.test(password) &&
    requirements.hasNumber.test(password) &&
    requirements.hasSpecial.test(password)
  );
}

// Update password strength meter
function updatePasswordStrength() {
  if (!elements.passwordInput || !elements.passwordStrengthMeter) return;
  
  const password = elements.passwordInput.value;
  let strength = 0;
  
  // Length check
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  
  // Complexity checks
  if (CONFIG.PASSWORD_REQUIREMENTS.hasUppercase.test(password)) strength += 25;
  if (CONFIG.PASSWORD_REQUIREMENTS.hasNumber.test(password)) strength += 15;
  if (CONFIG.PASSWORD_REQUIREMENTS.hasSpecial.test(password)) strength += 10;
  
  // Update meter
  elements.passwordStrengthMeter.style.width = `${Math.min(100, strength)}%`;
  
  // Update color
  if (strength < 50) {
    elements.passwordStrengthMeter.style.backgroundColor = '#dc3545'; // Red
  } else if (strength < 75) {
    elements.passwordStrengthMeter.style.backgroundColor = '#ffc107'; // Yellow
  } else {
    elements.passwordStrengthMeter.style.backgroundColor = '#198754'; // Green
  }
}

// Extract access token from URL
function getAccessTokenFromUrl() {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;
  
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const type = params.get('type');
  
  return accessToken && type === 'recovery' ? accessToken : null;
}

// Show error message
function showError(message) {
  console.error('Error:', message);
  
  if (elements.messageDiv) {
    elements.messageDiv.textContent = message;
    elements.messageDiv.className = 'alert alert-danger';
    elements.messageDiv.style.display = 'block';
    
    // Scroll to message
    elements.messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Show success message
function showSuccess(message) {
  console.log('Success:', message);
  
  if (elements.messageDiv) {
    elements.messageDiv.textContent = message;
    elements.messageDiv.className = 'alert alert-success';
    elements.messageDiv.style.display = 'block';
    
    // Scroll to message
    elements.messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Set loading state
function setLoading(isLoading) {
  console.log('Setting loading state:', isLoading);
  
  if (elements.submitButton) {
    elements.submitButton.disabled = isLoading;
    
    if (isLoading) {
      elements.submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    } else {
      elements.submitButton.textContent = elements.submitButton.getAttribute('data-original-text') || 'Submit';
    }
  }
  
  if (elements.loadingIndicator) {
    elements.loadingIndicator.style.display = isLoading ? 'block' : 'none';
  }
}

function initializeElements() {
  // Form elements
  emailInput = document.getElementById('email');
  passwordInput = document.getElementById('password');
  confirmPasswordInput = document.getElementById('confirmPassword');
  resetButton = document.getElementById('reset-button');
  messageDiv = document.getElementById('message');
  loadingIndicator = document.getElementById('loadingIndicator');
  
  // Form groups
  emailGroup = document.querySelector('.email-group');
  passwordGroup = document.querySelector('.password-group');
  
  // Step indicators
  step1 = document.getElementById('step1');
  step2 = document.getElementById('step2');
  step3 = document.getElementById('step3');
  stepLineFill = document.getElementById('stepLineFill');
  formTitle = document.getElementById('formTitle');
}

function setupEventListeners() {
  const resetForm = document.getElementById('reset-form');
  
  if (resetForm) {
    resetForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Password confirmation validation
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
  }
  
  // Back to login link
  const backToLogin = document.querySelector('.back-to-login a');
  if (backToLogin) {
    backToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'login.html';
    });
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (emailGroup && emailGroup.style.display !== 'none') {
    await handleResetRequest();
  } else {
    await handlePasswordReset();
  }
}

async function handleResetRequest() {
  const email = emailInput.value.trim();
  
  // Validate email
  if (!email) {
    showMessage('Please enter your email address', 'error');
    emailInput.focus();
    return;
  }
  
  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email address', 'error');
    emailInput.focus();
    return;
  }
  
  try {
    showLoading(true);
    showMessage('Sending password reset link...', 'info');
    
    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    
    if (error) throw error;
    
    // Show success message and update UI
    showMessage('Password reset link sent! Please check your email.', 'success');
    updateStep(2);
    
    // Clear email field
    emailInput.value = '';
    
  } catch (error) {
    console.error('Password reset request error:', error);
    showMessage(error.message || 'Failed to send password reset link', 'error');
  } finally {
    showLoading(false);
  }
}

async function handlePasswordReset() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Validate passwords
  if (!validatePasswords()) {
    return;
  }
  
  try {
    showLoading(true);
    showMessage('Updating your password...', 'info');
    
    // Get the access token from URL
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (!accessToken) {
      throw new Error('Invalid or expired password reset link. Please request a new one.');
    }
    
    // Set the session with the recovery token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    });
    
    if (sessionError) throw sessionError;
    
    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });
    
    if (updateError) throw updateError;
    
    // Show success message and update UI
    showMessage('Password updated successfully! Redirecting to login...', 'success');
    updateStep(3);
    
    // Redirect to login after a delay
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 3000);
    
  } catch (error) {
    console.error('Password reset error:', error);
    showMessage(error.message || 'Failed to reset password. Please try again.', 'error');
  } finally {
    showLoading(false);
  }
}

// Validation functions
function validatePasswords() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Check if passwords match
  if (password !== confirmPassword) {
    confirmPasswordInput.classList.add('is-invalid');
    document.getElementById('passwordMatchError').style.display = 'block';
    return false;
  }
  
  // Check password strength
  const strength = checkPasswordStrength(password);
  if (strength < 3) { // At least 3 out of 4 requirements met
    showMessage('Please choose a stronger password', 'error');
    return false;
  }
  
  // Clear error states
  confirmPasswordInput.classList.remove('is-invalid');
  document.getElementById('passwordMatchError').style.display = 'none';
  
  return true;
}

function validatePasswordMatch() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (password && confirmPassword) {
    if (password !== confirmPassword) {
      confirmPasswordInput.classList.add('is-invalid');
      document.getElementById('passwordMatchError').style.display = 'block';
      return false;
    } else {
      confirmPasswordInput.classList.remove('is-invalid');
      document.getElementById('passwordMatchError').style.display = 'none';
      return true;
    }
  }
  return false;
}

function checkPasswordStrength(password) {
  let strength = 0;
  
  // Check length
  if (password.length >= passwordRequirements.minLength) {
    document.getElementById('req-length').classList.add('valid');
    strength++;
  } else {
    document.getElementById('req-length').classList.remove('valid');
  }
  
  // Check uppercase
  if (passwordRequirements.hasUppercase.test(password)) {
    document.getElementById('req-uppercase').classList.add('valid');
    strength++;
  } else {
    document.getElementById('req-uppercase').classList.remove('valid');
  }
  
  // Check number
  if (passwordRequirements.hasNumber.test(password)) {
    document.getElementById('req-number').classList.add('valid');
    strength++;
  } else {
    document.getElementById('req-number').classList.remove('valid');
  }
  
  // Check special character
  if (passwordRequirements.hasSpecial.test(password)) {
    document.getElementById('req-special').classList.add('valid');
    strength++;
  } else {
    document.getElementById('req-special').classList.remove('valid');
  }
  
  // Update strength meter
  const strengthMeter = document.getElementById('passwordStrength');
  if (strengthMeter) {
    const width = (strength / 4) * 100;
    strengthMeter.style.width = `${width}%`;
    
    // Update color based on strength
    if (strength <= 1) {
      strengthMeter.style.background = '#dc3545'; // Red
    } else if (strength <= 2) {
      strengthMeter.style.background = '#fd7e14'; // Orange
    } else if (strength <= 3) {
      strengthMeter.style.background = '#ffc107'; // Yellow
    } else {
      strengthMeter.style.background = '#198754'; // Green
    }
  }
  
  return strength;
}

function updatePasswordStrength() {
  const password = passwordInput.value;
  checkPasswordStrength(password);
}

// UI Update functions
function updateStep(step) {
  // Reset all steps
  [step1, step2, step3].forEach((el, index) => {
    if (el) {
      el.classList.remove('active', 'completed');
      if (index + 1 < step) el.classList.add('completed');
      if (index + 1 === step) el.classList.add('active');
    }
  });
  
  // Update step line
  if (stepLineFill) {
    const width = ((step - 1) / 2) * 100;
    stepLineFill.style.width = `${width}%`;
  }
  
  // Update form title
  if (formTitle) {
    const titles = {
      1: 'Reset Your Password',
      2: 'Check Your Email',
      3: 'Password Updated!'
    };
    formTitle.textContent = titles[step] || 'Reset Your Password';
  }
  
  // Show/hide form sections
  if (step === 1) {
    if (emailGroup) emailGroup.style.display = 'block';
    if (passwordGroup) passwordGroup.style.display = 'none';
  } else if (step === 2) {
    if (emailGroup) emailGroup.style.display = 'none';
    if (passwordGroup) passwordGroup.style.display = 'block';
  } else if (step === 3) {
    if (emailGroup) emailGroup.style.display = 'none';
    if (passwordGroup) passwordGroup.style.display = 'none';
  }
}

// Check for access token in URL on page load
function checkForAccessToken() {
  const urlParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = urlParams.get('access_token');
  const type = urlParams.get('type');
  
  if (type === 'recovery' && accessToken) {
    // Hide email input and show password inputs
    updateStep(2);
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    updateStep(1);
  }
}

// Helper functions
function showMessage(message, type = 'info') {
  if (!messageDiv) return;
  
  messageDiv.textContent = message;
  messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
  messageDiv.classList.remove('d-none');
  
  // Auto-hide non-error messages after 5 seconds
  if (type !== 'error') {
    setTimeout(() => {
      messageDiv.classList.add('d-none');
    }, 5000);
  }
}

function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.classList.toggle('d-none', !show);
  }
  
  // Disable form elements while loading
  const formElements = document.querySelectorAll('input, button');
  formElements.forEach(el => {
    if (el.id !== 'reset-button') { // Don't disable the reset button
      el.disabled = show;
    }
  });
  
  // Update button text
  if (resetButton) {
    if (emailGroup && emailGroup.style.display !== 'none') {
      resetButton.innerHTML = show ? 
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...' : 
        'Send Reset Link';
    } else {
      resetButton.innerHTML = show ? 
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...' : 
        'Reset Password';
    }
  }
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}