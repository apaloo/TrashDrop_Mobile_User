import { FormValidator, AuthUI } from '../utils/auth-utils.js';

class ForgotPasswordHandler {
  constructor() {
    this.form = document.getElementById('reset-password-form');
    this.successAlert = document.getElementById('reset-success');
    this.errorAlert = document.getElementById('reset-error');
    this.submitButton = document.getElementById('submit-button');
    this.validator = null;
    
    this.initialize();
  }

  initialize() {
    if (!this.form) return;

    // Initialize form validator
    this.validator = new FormValidator('reset-password-form')
      .addField('email', {
        required: true,
        type: 'email',
        customValidation: (value) => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Please enter a valid email address';
          }
          return null;
        }
      });

    // Add form submission handler
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    // Clear previous errors and success messages
    this.hideAlerts();
    
    // Validate form
    const isValid = this.validator.validate();
    
    if (!isValid) {
      AuthUI.showErrors(this.form, this.validator.getErrors());
      return;
    }

    // Get email
    const email = this.form.email.value.trim();
    
    try {
      // Set loading state
      AuthUI.setLoading(this.form, true, 'Sending reset link...');
      
      // Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
      });

      if (error) throw error;
      
      // Show success message
      this.showSuccess('If an account with that email exists, we\'ve sent a password reset link.');
      
      // Clear the form
      this.form.reset();
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Show error message
      let errorMessage = 'An error occurred while sending the reset link. Please try again.';
      
      if (error.message.includes('not found')) {
        // We don't want to reveal if the email exists or not, so we show a generic message
        this.showSuccess('If an account with that email exists, we\'ve sent a password reset link.');
        this.form.reset();
        return;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showError(errorMessage);
      
    } finally {
      // Reset loading state
      AuthUI.setLoading(this.form, false);
    }
  }
  
  showSuccess(message) {
    if (!this.successAlert) return;
    
    const messageElement = document.getElementById('success-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    this.successAlert.classList.remove('d-none');
    this.errorAlert.classList.add('d-none');
    
    // Scroll to show the success message
    this.successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  showError(message) {
    if (!this.errorAlert) return;
    
    const messageElement = document.getElementById('error-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    this.errorAlert.classList.remove('d-none');
    this.successAlert.classList.add('d-none');
    
    // Scroll to show the error message
    this.errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  hideAlerts() {
    if (this.successAlert) this.successAlert.classList.add('d-none');
    if (this.errorAlert) this.errorAlert.classList.add('d-none');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ForgotPasswordHandler();
});
