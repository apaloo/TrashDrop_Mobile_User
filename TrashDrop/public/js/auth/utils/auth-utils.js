/**
 * AuthUtils - Utility functions for authentication
 * Provides consistent validation and storage management
 */

// Storage keys
export const STORAGE_KEYS = {
  AUTH: 'trashdrop_auth',
  SESSION: 'sb_session',
  TOKEN: 'sb_token',
  USER: 'sb_user'
};

// Validation patterns
export const VALIDATION = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true
  }
};

/**
 * Form Validation
 */
export class FormValidator {
  constructor(formId) {
    this.form = document.getElementById(formId);
    this.fields = {};
    this.errors = [];
  }

  // Add field validation
  addField(name, { required = true, type = 'text', minLength = 0, pattern = null, customValidation = null }) {
    this.fields[name] = {
      required,
      type,
      minLength,
      pattern,
      customValidation,
      element: this.form?.querySelector(`[name="${name}"]`)
    };
    return this;
  }

  // Validate all fields
  validate() {
    this.errors = [];
    
    for (const [name, field] of Object.entries(this.fields)) {
      const value = field.element?.value?.trim() || '';
      
      // Check required fields
      if (field.required && !value) {
        this.errors.push(`${name} is required`);
        continue;
      }
      
      // Skip further validation if field is empty and not required
      if (!value) continue;
      
      // Type-specific validation
      switch (field.type) {
        case 'email':
          if (!VALIDATION.EMAIL.test(value)) {
            this.errors.push('Please enter a valid email address');
          }
          break;
          
        case 'password':
          if (value.length < VALIDATION.PASSWORD.MIN_LENGTH) {
            this.errors.push(`Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters`);
          }
          if (VALIDATION.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(value)) {
            this.errors.push('Password must contain at least one uppercase letter');
          }
          if (VALIDATION.PASSWORD.REQUIRE_NUMBER && !/\d/.test(value)) {
            this.errors.push('Password must contain at least one number');
          }
          if (VALIDATION.PASSWORD.REQUIRE_SPECIAL_CHAR && !/[^A-Za-z0-9]/.test(value)) {
            this.errors.push('Password must contain at least one special character');
          }
          break;
      }
      
      // Pattern validation
      if (field.pattern && !field.pattern.test(value)) {
        this.errors.push(`Invalid format for ${name}`);
      }
      
      // Custom validation
      if (field.customValidation) {
        const customError = field.customValidation(value);
        if (customError) this.errors.push(customError);
      }
    }
    
    return this.errors.length === 0;
  }
  
  // Get validation errors
  getErrors() {
    return [...new Set(this.errors)]; // Remove duplicates
  }
  
  // Reset validation state
  reset() {
    this.errors = [];
    if (this.form) this.form.reset();
  }
}

/**
 * Storage Management
 */
export class AuthStorage {
  // Clear only auth-related data
  static clearAuthData() {
    try {
      // Clear specific auth keys
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear any Supabase-related keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear cookies (if any)
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.startsWith('sb-') || name.startsWith('supabase')) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  }
  
  // Get auth data
  static getAuthData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting auth data:', error);
      return null;
    }
  }
  
  // Set auth data
  static setAuthData(data) {
    try {
      if (!data) {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
        return true;
      }
      
      const authData = {
        ...data,
        _timestamp: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(authData));
      return true;
    } catch (error) {
      console.error('Error setting auth data:', error);
      return false;
    }
  }
}

/**
 * UI Helpers
 */
export const AuthUI = {
  // Set form loading state
  setLoading(form, isLoading) {
    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, button');
    
    if (!submitButton) return;
    
    if (isLoading) {
      submitButton.disabled = true;
      submitButton.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span class="visually-hidden">Loading...</span>
      `;
      
      // Disable all inputs during submission
      inputs.forEach(input => {
        input.disabled = true;
      });
    } else {
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.originalText || 'Submit';
      
      // Re-enable all inputs
      inputs.forEach(input => {
        input.disabled = false;
      });
    }
  },
  
  // Show form errors
  showErrors(form, errors) {
    // Clear previous errors
    this.clearErrors(form);
    
    if (!errors || errors.length === 0) return;
    
    // Create error container if it doesn't exist
    let errorContainer = form.querySelector('.form-errors');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.className = 'alert alert-danger form-errors';
      form.prepend(errorContainer);
    }
    
    // Add errors to container
    errorContainer.innerHTML = `
      <strong>Please fix the following errors:</strong>
      <ul class="mb-0">
        ${errors.map(error => `<li>${error}</li>`).join('')}
      </ul>
    `;
    
    // Scroll to errors
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  
  // Clear form errors
  clearErrors(form) {
    const errorContainer = form?.querySelector('.form-errors');
    if (errorContainer) {
      errorContainer.remove();
    }
  }
};

// Make utilities available globally
window.AuthUtils = {
  FormValidator, 
  AuthStorage, 
  AuthUI, 
  STORAGE_KEYS, 
  VALIDATION
};

// Support module environments if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FormValidator, 
    AuthStorage, 
    AuthUI, 
    STORAGE_KEYS, 
    VALIDATION
  };
}
