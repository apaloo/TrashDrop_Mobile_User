import { FormValidator, AuthStorage, AuthUI, VALIDATION } from '../utils/auth-utils.js';

class SignupHandler {
  constructor() {
    this.form = document.getElementById('signup-form');
    this.validator = null;
    this.initialize();
  }

  initialize() {
    if (!this.form) return;

    // Initialize form validator with validation rules
    this.validator = new FormValidator('signup-form')
      .addField('name', {
        required: true,
        minLength: 2,
        customValidation: (value) => {
          if (value.trim().length < 2) {
            return 'Name must be at least 2 characters';
          }
          return null;
        }
      })
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
      .addField('phone', {
        required: true,
        pattern: /^[\+\d\s\-\(\)]+$/,
        customValidation: (value) => {
          // Basic phone number validation - can be enhanced based on requirements
          const digits = value.replace(/\D/g, '');
          if (digits.length < 10) {
            return 'Please enter a valid phone number';
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
          const password = document.getElementById('password')?.value;
          if (value !== password) {
            return 'Passwords do not match';
          }
          return null;
        }
      });

    // Add form submission handler
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    
    // Add password match validation
    const passwordField = this.form.querySelector('#password');
    const confirmPasswordField = this.form.querySelector('#confirm-password');
    
    if (passwordField && confirmPasswordField) {
      passwordField.addEventListener('input', () => this.validatePasswordMatch());
      confirmPasswordField.addEventListener('input', () => this.validatePasswordMatch());
    }
  }

  validatePasswordMatch() {
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      confirmPassword.setCustomValidity('Passwords do not match');
    } else {
      confirmPassword.setCustomValidity('');
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    // Clear previous errors
    AuthUI.clearErrors(this.form);
    
    // Validate form
    const isValid = this.validator.validate();
    
    if (!isValid) {
      AuthUI.showErrors(this.form, this.validator.getErrors());
      return;
    }

    // Get form data
    const formData = new FormData(this.form);
    const userData = {
      email: formData.get('email').trim(),
      password: formData.get('password'),
      name: formData.get('name').trim(),
      phone: formData.get('phone').trim(),
      acceptTerms: formData.get('accept-terms') === 'on',
      marketingEmails: formData.get('marketing-emails') === 'on'
    };

    try {
      // Set loading state
      AuthUI.setLoading(this.form, true);
      
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('email, phone')
        .or(`email.eq.${userData.email},phone.eq.${userData.phone}`);

      if (checkError) throw checkError;

      // Check if email or phone already exists
      if (existingUsers && existingUsers.length > 0) {
        const emailExists = existingUsers.some(user => user.email === userData.email);
        const phoneExists = existingUsers.some(user => user.phone === userData.phone);
        
        if (emailExists) throw new Error('An account with this email already exists');
        if (phoneExists) throw new Error('An account with this phone number already exists');
      }
      
      // Create user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.name,
            phone: userData.phone,
            marketing_emails: userData.marketingEmails,
            terms_accepted: userData.acceptTerms,
            terms_accepted_at: new Date().toISOString()
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) throw signUpError;
      
      // Show success message
      this.showSuccessMessage();
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      let errorMessage = 'An error occurred during signup. Please try again.';
      
      if (error.message.includes('already registered')) {
        errorMessage = 'An account with this email already exists.';
      } else if (error.message.includes('password')) {
        errorMessage = 'Please choose a stronger password.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      AuthUI.showErrors(this.form, [errorMessage]);
      
    } finally {
      // Reset loading state
      AuthUI.setLoading(this.form, false);
    }
  }
  
  showSuccessMessage() {
    // Hide form
    this.form.style.display = 'none';
    
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.role = 'alert';
    successDiv.innerHTML = `
      <h4 class="alert-heading">Check your email!</h4>
      <p>We've sent a confirmation link to <strong>${this.form.email.value}</strong>.</p>
      <p>Please click the link in the email to verify your account and complete your registration.</p>
      <hr>
      <p class="mb-0">
        Didn't receive the email? 
        <a href="#" id="resend-email" class="alert-link">Resend verification email</a>
      </p>
    `;
    
    // Insert after form
    this.form.parentNode.insertBefore(successDiv, this.form.nextSibling);
    
    // Add click handler for resend email
    const resendLink = document.getElementById('resend-email');
    if (resendLink) {
      resendLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.resendVerificationEmail();
      });
    }
  }
  
  async resendVerificationEmail() {
    try {
      const email = this.form.email.value;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) throw error;
      
      // Show success message
      const resendLink = document.getElementById('resend-email');
      if (resendLink) {
        const originalText = resendLink.textContent;
        resendLink.textContent = 'Email sent!';
        resendLink.style.pointerEvents = 'none';
        
        // Reset after 5 seconds
        setTimeout(() => {
          resendLink.textContent = originalText;
          resendLink.style.pointerEvents = 'auto';
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      alert('Failed to resend verification email. Please try again later.');
    }
  }
}

// Initialize signup handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SignupHandler();
});
