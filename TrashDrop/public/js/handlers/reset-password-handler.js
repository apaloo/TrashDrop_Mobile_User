import { FormValidator, AuthUI, VALIDATION } from '../utils/auth-utils.js';

class ResetPasswordHandler {
  constructor() {
    this.form = document.getElementById('reset-form');
    this.email = document.getElementById('email');
    this.password = document.getElementById('password');
    this.confirmPassword = document.getElementById('confirm-password');
    this.step1 = document.getElementById('step1');
    this.step2 = document.getElementById('step2');
    this.step3 = document.getElementById('step3');
    this.stepLineFill = document.getElementById('stepLineFill');
    this.formTitle = document.getElementById('formTitle');
    this.message = document.getElementById('message');
    this.emailGroup = document.querySelector('.email-group');
    this.passwordGroup = document.querySelector('.password-group');
    this.successGroup = document.querySelector('.success-group');
    this.validator = null;
    this.token = null;
    this.emailValue = '';
    
    this.initialize();
  }

  initialize() {
    if (!this.form) return;

    // Check for password reset token in URL
    this.checkForToken();
    
    // Initialize form validator
    this.initializeValidator();
    
    // Add event listeners
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Password strength indicator
    if (this.password) {
      this.password.addEventListener('input', this.updatePasswordStrength.bind(this));
    }
  }
  
  checkForToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    
    if (token && email) {
      // We have a token, show password reset form
      this.token = token;
      this.emailValue = email;
      this.showPasswordResetForm();
    } else if (window.location.hash) {
      // Handle hash-based tokens (legacy support)
      this.handleTokenFromHash();
    }
  }
  
  handleTokenFromHash() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const type = params.get('type');
    const token = params.get('access_token');
    
    if (type === 'recovery' && token) {
      this.token = token;
      
      // Extract email from token if possible, or show email input
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.email) {
          this.emailValue = payload.email;
          this.showPasswordResetForm();
          return;
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
      
      // If we couldn't get email from token, show email input
      this.showEmailForm();
    }
  }
  
  initializeValidator() {
    this.validator = new FormValidator('reset-form')
      .addField('email', {
        required: true,
        type: 'email',
        customValidation: (value) => {
          if (!VALIDATION.EMAIL.test(value)) {
            return 'Please enter a valid email address';
          }
          return null;
        }
      })
      .addField('password', {
        required: true,
        type: 'password',
        minLength: VALIDATION.PASSWORD.MIN_LENGTH,
        customValidation: (value) => {
          if (value.length < VALIDATION.PASSWORD.MIN_LENGTH) {
            return `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters`;
          }
          if (VALIDATION.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(value)) {
            return 'Password must contain at least one uppercase letter';
          }
          if (VALIDATION.PASSWORD.REQUIRE_NUMBER && !/\d/.test(value)) {
            return 'Password must contain at least one number';
          }
          if (VALIDATION.PASSWORD.REQUIRE_SPECIAL_CHAR && !/[^A-Za-z0-9]/.test(value)) {
            return 'Password must contain at least one special character';
          }
          return null;
        }
      })
      .addField('confirm-password', {
        required: true,
        type: 'password',
        customValidation: (value) => {
          if (value !== this.password.value) {
            return 'Passwords do not match';
          }
          return null;
        }
      });
  }
  
  showEmailForm() {
    this.step1.classList.add('active');
    this.step2.classList.remove('active');
    this.step3.classList.remove('active');
    this.stepLineFill.style.width = '0%';
    
    if (this.emailGroup) this.emailGroup.style.display = 'block';
    if (this.passwordGroup) this.passwordGroup.style.display = 'none';
    if (this.successGroup) this.successGroup.style.display = 'none';
    
    this.formTitle.textContent = 'Reset Your Password';
    this.form.reset();
  }
  
  showPasswordResetForm() {
    this.step1.classList.add('completed');
    this.step2.classList.add('active');
    this.step3.classList.remove('active');
    this.stepLineFill.style.width = '50%';
    
    if (this.email) this.email.value = this.emailValue;
    if (this.emailGroup) this.emailGroup.style.display = 'none';
    if (this.passwordGroup) this.passwordGroup.style.display = 'block';
    if (this.successGroup) this.successGroup.style.display = 'none';
    
    this.formTitle.textContent = 'Create New Password';
    if (this.password) this.password.focus();
  }
  
  showSuccess() {
    this.step1.classList.add('completed');
    this.step2.classList.add('completed');
    this.step3.classList.add('active');
    this.stepLineFill.style.width = '100%';
    
    if (this.emailGroup) this.emailGroup.style.display = 'none';
    if (this.passwordGroup) this.passwordGroup.style.display = 'none';
    if (this.successGroup) this.successGroup.style.display = 'block';
    
    this.formTitle.textContent = 'Password Reset Successful';
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }
  
  updatePasswordStrength() {
    if (!this.password) return;
    
    const password = this.password.value;
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 20;
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 20;
    // Number check
    if (/\d/.test(password)) strength += 20;
    // Special char check
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    // Length bonus
    if (password.length >= 12) strength += 20;
    
    // Update strength meter
    const strengthMeter = document.getElementById('strengthMeter');
    if (strengthMeter) {
      strengthMeter.style.width = `${strength}%`;
      
      // Update color based on strength
      if (strength < 40) {
        strengthMeter.style.backgroundColor = '#dc3545'; // Red
      } else if (strength < 70) {
        strengthMeter.style.backgroundColor = '#ffc107'; // Yellow
      } else {
        strengthMeter.style.backgroundColor = '#198754'; // Green
      }
    }
    
    // Update requirement indicators
    this.updateRequirement('length', password.length >= 8);
    this.updateRequirement('uppercase', /[A-Z]/.test(password));
    this.updateRequirement('number', /\d/.test(password));
    this.updateRequirement('special', /[^A-Za-z0-9]/.test(password));
  }
  
  updateRequirement(type, isValid) {
    const element = document.querySelector(`.requirement-${type}`);
    if (element) {
      if (isValid) {
        element.classList.add('valid');
      } else {
        element.classList.remove('valid');
      }
    }
  }
  
  async handleSubmit(event) {
    event.preventDefault();
    
    // Clear previous messages
    this.hideMessage();
    
    // Validate form based on current step
    let isValid = false;
    
    if (this.token) {
      // We're on the password reset step
      isValid = this.validator.validate(['password', 'confirm-password']);
    } else {
      // We're on the email step
      isValid = this.validator.validate(['email']);
      
      if (isValid) {
        this.emailValue = this.email.value.trim();
      }
    }
    
    if (!isValid) {
      this.showError('Please fix the errors in the form');
      return;
    }
    
    try {
      if (this.token) {
        // Update password
        await this.resetPassword();
      } else {
        // Send password reset email
        await this.sendResetEmail();
      }
    } catch (error) {
      console.error('Password reset error:', error);
      this.showError(error.message || 'An error occurred. Please try again.');
    }
  }
  
  async sendResetEmail() {
    try {
      AuthUI.setLoading(this.form, true, 'Sending reset link...');
      
      const { error } = await supabase.auth.resetPasswordForEmail(this.emailValue, {
        redirectTo: `${window.location.origin}/reset-password.html`
      });
      
      if (error) throw error;
      
      // Show success message
      this.showMessage(
        'If an account with that email exists, we\'ve sent a password reset link.', 
        'success'
      );
      
      // Move to next step after a delay
      setTimeout(() => {
        this.showPasswordResetForm();
      }, 2000);
      
    } finally {
      AuthUI.setLoading(this.form, false);
    }
  }
  
  async resetPassword() {
    try {
      AuthUI.setLoading(this.form, true, 'Updating password...');
      
      // Update password using the token
      const { error } = await supabase.auth.updateUser({
        password: this.password.value
      });
      
      if (error) throw error;
      
      // Show success message and redirect
      this.showMessage('Your password has been updated successfully!', 'success');
      this.showSuccess();
      
    } finally {
      AuthUI.setLoading(this.form, false);
    }
  }
  
  showMessage(message, type = 'error') {
    if (!this.message) return;
    
    this.message.textContent = message;
    this.message.className = `alert alert-${type} show`;
    this.message.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  hideMessage() {
    if (this.message) {
      this.message.className = 'alert d-none';
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ResetPasswordHandler();
});
