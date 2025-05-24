// TrashDrop Password Reset Page

document.addEventListener('DOMContentLoaded', () => {
  // Get form elements
  const resetFormStep1 = document.getElementById('reset-form-step1');
  const resetFormStep2 = document.getElementById('reset-form-step2');
  const backToStep1Btn = document.getElementById('back-to-step1');
  const resendOtpBtn = document.getElementById('resend-otp');
  
  // Step 1 form submission
  if (resetFormStep1) {
    resetFormStep1.addEventListener('submit', handleResetStep1);
  }
  
  // Step 2 form submission
  if (resetFormStep2) {
    resetFormStep2.addEventListener('submit', handleResetStep2);
  }
  
  // Back button
  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
      document.getElementById('reset-step-1').style.display = 'block';
      document.getElementById('reset-step-2').style.display = 'none';
    });
  }
  
  // Resend OTP button
  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', handleResendOTP);
  }
});

// Handle reset step 1 (phone number)
async function handleResetStep1(e) {
  e.preventDefault();
  
  // Get form input
  const phoneInput = document.getElementById('phoneNumber');
  
  // Validate form
  let isValid = true;
  
  if (!phoneInput.value.trim() || !isValidPhoneNumber(phoneInput.value)) {
    phoneInput.classList.add('is-invalid');
    isValid = false;
  } else {
    phoneInput.classList.remove('is-invalid');
  }
  
  if (!isValid) {
    return;
  }
  
  // Store phone for later use
  sessionStorage.setItem('reset_phone', phoneInput.value.trim());
  
  // Show loading spinner
  showSpinner('Sending verification code...');
  
  try {
    // Call reset password API to send OTP
    const result = await AuthManager.requestPasswordReset(phoneInput.value.trim());
    
    // Hide spinner
    hideSpinner();
    
    // Show success message
    showToast('Verification Code Sent', 'Please check your phone for the verification code.', 'success');
    
    // Show step 2 form
    document.getElementById('reset-step-1').style.display = 'none';
    document.getElementById('reset-step-2').style.display = 'block';
    
  } catch (error) {
    // Hide spinner
    hideSpinner();
    
    // Show error message
    showToast('Error', error.message || 'Failed to send verification code.', 'danger');
  }
}

// Handle reset step 2 (OTP verification and new password)
async function handleResetStep2(e) {
  e.preventDefault();
  
  // Get form inputs
  const otpInput = document.getElementById('otpCode');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  // Get phone from session storage
  const phone = sessionStorage.getItem('reset_phone');
  
  if (!phone) {
    showToast('Error', 'Phone number not found. Please go back and try again.', 'danger');
    return;
  }
  
  // Validate form
  let isValid = true;
  
  if (!otpInput.value.trim() || otpInput.value.length !== 6) {
    otpInput.classList.add('is-invalid');
    isValid = false;
  } else {
    otpInput.classList.remove('is-invalid');
  }
  
  if (!newPasswordInput.value) {
    newPasswordInput.classList.add('is-invalid');
    isValid = false;
  } else {
    newPasswordInput.classList.remove('is-invalid');
  }
  
  if (!confirmPasswordInput.value || confirmPasswordInput.value !== newPasswordInput.value) {
    confirmPasswordInput.classList.add('is-invalid');
    isValid = false;
  } else {
    confirmPasswordInput.classList.remove('is-invalid');
  }
  
  if (!isValid) {
    return;
  }
  
  // Show loading spinner
  showSpinner('Resetting your password...');
  
  try {
    // Call reset password API
    const result = await AuthManager.resetPassword(
      otpInput.value.trim(),
      phone,
      newPasswordInput.value
    );
    
    // Hide spinner
    hideSpinner();
    
    // Show success message
    showToast('Success', 'Your password has been reset successfully!', 'success');
    
    // Show step 3 (success message)
    document.getElementById('reset-step-2').style.display = 'none';
    document.getElementById('reset-step-3').style.display = 'block';
    
    // Clear session storage
    sessionStorage.removeItem('reset_phone');
    
  } catch (error) {
    // Hide spinner
    hideSpinner();
    
    // Show error message
    showToast('Error', error.message || 'Failed to reset password.', 'danger');
  }
}

// Handle resend OTP button
async function handleResendOTP() {
  // Get stored phone
  const phone = sessionStorage.getItem('reset_phone');
  
  if (!phone) {
    showToast('Error', 'Phone number not found. Please go back and try again.', 'danger');
    return;
  }
  
  // Show loading spinner
  showSpinner('Resending verification code...');
  
  try {
    // Call reset password API again to resend OTP
    const result = await AuthManager.requestPasswordReset(phone);
    
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
