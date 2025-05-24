// TrashDrop Login Page

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Handle "Enter" key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && loginForm) {
      e.preventDefault();
      handleLogin(e);
    }
  });
});

async function handleLogin(e) {
  e.preventDefault();
  
  // Get form elements
  const phoneInput = document.getElementById('phoneNumber');
  const passwordInput = document.getElementById('password');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  
  // Validate form
  let isValid = true;
  
  if (!phoneInput.value) {
    phoneInput.classList.add('is-invalid');
    isValid = false;
  } else {
    phoneInput.classList.remove('is-invalid');
  }
  
  if (!passwordInput.value) {
    passwordInput.classList.add('is-invalid');
    isValid = false;
  } else {
    passwordInput.classList.remove('is-invalid');
  }
  
  if (!isValid) {
    return;
  }
  
  // Show loading spinner
  showSpinner('Logging in...');
  
  try {
    // Ensure we're using the correct protocol for local development
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    
    // Make a direct fetch call to the login API
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneInput.value,
        password: passwordInput.value
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to log in');
    }
    
    // Store the session token for authenticated requests
    if (result.session && result.session.access_token) {
      localStorage.setItem('supabase.auth.token', result.session.access_token);
    }
    
    // If remember me is checked, store user preference
    if (rememberMeCheckbox.checked) {
      localStorage.setItem('trashdrop.rememberMe', 'true');
      localStorage.setItem('trashdrop.phone', phoneInput.value);
    } else {
      localStorage.removeItem('trashdrop.rememberMe');
      localStorage.removeItem('trashdrop.phone');
    }
    
    // Redirect to dashboard or intended page
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect') || '/dashboard';
    
    // Hide spinner and redirect
    hideSpinner();
    window.location.href = redirectUrl;
    
  } catch (error) {
    // Hide spinner
    hideSpinner();
    
    // Show error message
    showToast('Login Error', error.message || 'Failed to login. Please check your credentials.', 'danger');
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

// Check for remembered login on page load
document.addEventListener('DOMContentLoaded', checkRememberedLogin);
