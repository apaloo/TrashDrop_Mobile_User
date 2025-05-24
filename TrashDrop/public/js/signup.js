// TrashDrop Signup Page

document.addEventListener('DOMContentLoaded', () => {
  // Get form elements
  const signupFormStep1 = document.getElementById('signup-form-step1');
  const signupFormStep2 = document.getElementById('signup-form-step2');
  const backToStep1Btn = document.getElementById('back-to-step1');
  const resendOtpBtn = document.getElementById('resend-otp');
  
  // Step 1 form submission
  if (signupFormStep1) {
    signupFormStep1.addEventListener('submit', handleSignupStep1);
  }
  
  // Step 2 form submission
  if (signupFormStep2) {
    signupFormStep2.addEventListener('submit', handleSignupStep2);
  }
  
  // Back button
  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
      document.getElementById('signup-step-1').style.display = 'block';
      document.getElementById('signup-step-2').style.display = 'none';
    });
  }
  
  // Resend OTP button
  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', handleResendOTP);
  }
});

// Handle signup step 1 (phone number and name)
async function handleSignupStep1(e) {
  e.preventDefault();
  
  // Get form inputs
  const fullNameInput = document.getElementById('fullName');
  const phoneInput = document.getElementById('phoneNumber');
  
  // Validate form
  let isValid = true;
  
  if (!fullNameInput.value.trim()) {
    fullNameInput.classList.add('is-invalid');
    isValid = false;
  } else {
    fullNameInput.classList.remove('is-invalid');
  }
  
  if (!phoneInput.value.trim() || !isValidPhoneNumber(phoneInput.value)) {
    phoneInput.classList.add('is-invalid');
    isValid = false;
  } else {
    phoneInput.classList.remove('is-invalid');
  }
  
  if (!isValid) {
    return;
  }
  
  // Store values for later use
  sessionStorage.setItem('signup_fullName', fullNameInput.value.trim());
  sessionStorage.setItem('signup_phone', phoneInput.value.trim());
  
  // Show loading spinner
  showSpinner('Sending verification code...');
  
  try {
    // Ensure we're using the correct protocol for local development
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    
    // Call signup API directly to avoid HTTPS issues
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneInput.value.trim(),
        name: fullNameInput.value.trim()
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send verification code');
    }
    
    // Hide spinner
    hideSpinner();
    
    // Show success message
    showToast('Verification Code Sent', 'Please check your phone for the verification code.', 'success');
    
    // Show step 2 form
    document.getElementById('signup-step-1').style.display = 'none';
    document.getElementById('signup-step-2').style.display = 'block';
    
  } catch (error) {
    // Hide spinner
    hideSpinner();
    
    // Show error message
    showToast('Error', error.message || 'Failed to send verification code.', 'danger');
  }
}

// Handle signup step 2 (OTP verification and password creation)
async function handleSignupStep2(e) {
  e.preventDefault();
  
  // Get form inputs
  const otpInput = document.getElementById('otpCode');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  // Validate form
  let isValid = true;
  
  if (!otpInput.value.trim() || otpInput.value.length !== 6) {
    otpInput.classList.add('is-invalid');
    isValid = false;
  } else {
    otpInput.classList.remove('is-invalid');
  }
  
  if (!passwordInput.value) {
    passwordInput.classList.add('is-invalid');
    isValid = false;
  } else {
    passwordInput.classList.remove('is-invalid');
  }
  
  if (!confirmPasswordInput.value || confirmPasswordInput.value !== passwordInput.value) {
    confirmPasswordInput.classList.add('is-invalid');
    isValid = false;
  } else {
    confirmPasswordInput.classList.remove('is-invalid');
  }
  
  if (!isValid) {
    return;
  }
  
  // Show loading spinner
  showSpinner('Creating your account...');
  
  try {
    // Ensure we're using the correct protocol for local development
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    
    // Get the phone number from session storage
    const phone = sessionStorage.getItem('signup_phone');
    
    if (!phone) {
      throw new Error('Phone number not found. Please start over.');
    }
    
    // Call verify OTP API directly to avoid HTTPS issues
    const response = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        otp: otpInput.value.trim(),
        password: passwordInput.value,
        phone: phone
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to verify OTP');
    }
    
    // Hide spinner
    hideSpinner();
    
    // Show success message
    showToast('Success', 'Your account has been created successfully!', 'success');
    
    // Show step 3 (success message)
    document.getElementById('signup-step-2').style.display = 'none';
    document.getElementById('signup-step-3').style.display = 'block';
    
    // Clear session storage
    sessionStorage.removeItem('signup_fullName');
    sessionStorage.removeItem('signup_phone');
    
  } catch (error) {
    // Hide spinner
    hideSpinner();
    
    // Show error message
    showToast('Error', error.message || 'Failed to verify OTP.', 'danger');
  }
}

// Handle resend OTP button
async function handleResendOTP() {
  // Get stored values
  const fullName = sessionStorage.getItem('signup_fullName');
  const phone = sessionStorage.getItem('signup_phone');
  
  if (!fullName || !phone) {
    showToast('Error', 'Missing information. Please go back and try again.', 'danger');
    return;
  }
  
  // Show loading spinner
  showSpinner('Resending verification code...');
  
  try {
    // Ensure we're using the correct protocol for local development
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    
    // Call signup API directly to avoid HTTPS issues
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phone,
        name: fullName
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to resend verification code');
    }
    
    // Hide spinner
    hideSpinner();
    
    // Show success message
    showToast('Verification Code Sent', 'A new verification code has been sent to your phone.', 'success');
    
  } catch (error) {
    // Hide spinner
    hideSpinner();
    
    // Show error message
    showToast('Error', error.message || 'Failed to resend verification code.', 'danger');
  }
}

// Validate phone number format
function isValidPhoneNumber(phone) {
  // Basic validation for international phone number format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
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
