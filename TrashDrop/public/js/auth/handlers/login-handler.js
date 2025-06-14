import { FormValidator, AuthStorage, AuthUI, VALIDATION } from '../utils/auth-utils.js';

// Supabase client will be passed in via constructor

export class LoginHandler {
  constructor(supabaseClient) {
    // Allow the caller to pass a Supabase client. If not provided, fallback to window.supabase (if already initialised).
    this.supabase = supabaseClient || window.supabase;

    if (!this.supabase) {
      console.error('LoginHandler initialised without a Supabase client instance.');
      return; // Prevent further initialisation – caller must pass a client.
    }
    this.form = document.getElementById('login-form');
    this.validator = null;
    this.initialize();
  }

  initialize() {
    if (!this.form) return;

    // Initialize form validator
    this.validator = new FormValidator('login-form')
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
      });

    // Add form submission handler
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    // Validate form
    if (!this.validator.validate()) {
      return;
    }

    // Get form data
    const formData = new FormData(this.form);
    const email = formData.get('email')?.trim() || '';
    const password = formData.get('password') || '';
    const rememberMe = formData.get('remember-me') === 'on';
    
    // Validate required fields
    if (!email || !password) {
      AuthUI.showErrors(this.form, ['Email and password are required']);
      return;
    }

    try {
      // Set loading state
      AuthUI.setLoading(this.form, true);
      
      console.log('Attempting login with email:', email);
      
      let data, error;
      
      // Get the Supabase URL and key from meta tags
      const supabaseUrl = document.querySelector('meta[name="SUPABASE_URL"]')?.content;
      const supabaseKey = document.querySelector('meta[name="SUPABASE_ANON_KEY"]')?.content;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }
      
      // Try using the passed in client first
      if (this.supabase && this.supabase.auth && typeof this.supabase.auth.signInWithPassword === 'function') {
        console.log('Using Supabase client instance for login');
        const result = await this.supabase.auth.signInWithPassword({ email, password });
        data = result.data;
        error = result.error;
      } 
      // Fallback to direct API call if auth not available
      else {
        console.log('Fallback: Making direct API call to Supabase auth');
        
        // Fallback to direct API request
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          data = {
            session: {
              access_token: result.access_token,
              refresh_token: result.refresh_token,
              expires_in: result.expires_in,
              user: result.user
            },
            user: result.user
          };
        } else {
          error = { message: result.error_description || result.error || 'Authentication failed' };
        }
      }

      if (error) throw error;
      
      // Store session if remember me is checked
      if (rememberMe && data && data.session) {
        AuthStorage.setAuthData({
          session: data.session,
          user: data.user
        });
      }
      
      // Get redirect URL or default to dashboard
      const redirectUrl = this.getRedirectUrl();
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      let errorMessage = 'An error occurred during login. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before logging in.';
      } else if (error.message?.includes('too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.';
      }
      
      AuthUI.showErrors(this.form, [errorMessage]);
      
    } finally {
      // Reset loading state
      AuthUI.setLoading(this.form, false);
    }
  }
  
  getRedirectUrl() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    
    if (redirectParam && redirectParam.startsWith('/')) {
      return redirectParam;
    }
    
    // Check session storage
    try {
      const redirectUrl = sessionStorage.getItem('auth_redirect');
      if (redirectUrl) {
        sessionStorage.removeItem('auth_redirect');
        return redirectUrl;
      }
    } catch (e) {
      console.warn('Could not access sessionStorage:', e);
    }
    
    // Default redirect
    return '/dashboard.html';
  }
}

// Removed automatic initialisation here. The page script is responsible for instantiating
// LoginHandler with a valid Supabase client instance to avoid race-conditions.
