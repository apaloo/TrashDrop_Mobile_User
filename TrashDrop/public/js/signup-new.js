// TrashDrop Signup - New Implementation

// Track form submission state
let isSubmitting = false;

// Configuration
const CONFIG = {
    supabaseUrl: 'https://cpeyavpxqcloupolbvyh.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXlhdnB4cWNsb3Vwb2xidnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTY4OTYsImV4cCI6MjA2MTA3Mjg5Nn0.5rxsiRuLHCpeJZ5TqoIA5X4UwoAAuxIpNu_reafwwbQ',
    storageKey: 'sb-cpeyavpxqcloupolbvyh-supabase-co-auth-token'
};

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded, initializing application...');
    
    try {
        // Initialize Supabase
        const supabase = await initializeSupabase();
        if (!supabase) {
            throw new Error('Failed to initialize Supabase');
        }
        
        // Set up form event listeners
        setupFormHandlers(supabase);
        
        // Check for existing session
        await checkSession(supabase);
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Failed to initialize the application. Please refresh the page.', 'Initialization Error');
    }
});

/**
 * Initialize Supabase client
 */
async function initializeSupabase() {
    console.log('Initializing Supabase...');
    
    try {
        // Load Supabase script if not already loaded
        if (typeof window.supabase === 'undefined') {
            console.log('Loading Supabase script...');
            await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
            
            // Wait for Supabase to be available
            await waitFor(() => typeof window.supabase !== 'undefined', 5000, 100);
            
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase failed to load');
            }
        }
        
        // Create and configure Supabase client
        const supabase = window.supabase.createClient(
            CONFIG.supabaseUrl,
            CONFIG.supabaseKey,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    storage: {
                        getItem: key => localStorage.getItem(key),
                        setItem: (key, value) => localStorage.setItem(key, value),
                        removeItem: key => localStorage.removeItem(key)
                    },
                    storageKey: CONFIG.storageKey,
                    phone: true // Enable phone authentication
                }
            }
        );
        
        // Store client globally
        window.supabase = supabase;
        
        console.log('Supabase initialized successfully');
        return supabase;
        
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        showError('Failed to initialize authentication service. Please refresh the page.', 'Authentication Error');
        return null;
    }
}

/**
 * Set up form event handlers
 */
function setupFormHandlers(supabase) {
    const phoneForm = document.getElementById('signup-form-step1');
    const otpForm = document.getElementById('signup-form-step2');
    const backButton = document.getElementById('back-to-step1');
    
    if (phoneForm) {
        phoneForm.addEventListener('submit', (e) => handlePhoneSubmit(e, supabase));
    }
    
    if (otpForm) {
        otpForm.addEventListener('submit', (e) => handleOtpSubmit(e, supabase));
    }
    
    if (backButton) {
        backButton.addEventListener('click', showPhoneForm);
    }
}

/**
 * Handle phone number submission
 */
async function handlePhoneSubmit(e, supabase) {
    e.preventDefault();
    if (isSubmitting) return;
    
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput?.value.trim();
    
    if (!phone) {
        showError('Please enter a phone number');
        return;
    }
    
    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
        showError('Please enter a valid phone number with country code');
        return;
    }
    
    try {
        isSubmitting = true;
        showLoading(true);
        
        // Send OTP
        const { error } = await supabase.auth.signInWithOtp({
            phone: formattedPhone,
            options: {
                shouldCreateUser: true
            }
        });
        
        if (error) throw error;
        
        // Store phone number for verification
        sessionStorage.setItem('signup_phone', formattedPhone);
        
        // Show OTP form
        showOtpForm();
        
    } catch (error) {
        console.error('Error sending OTP:', error);
        showError(error.message || 'Failed to send verification code');
    } finally {
        isSubmitting = false;
        showLoading(false);
    }
}

/**
 * Handle OTP submission
 */
async function handleOtpSubmit(e, supabase) {
    e.preventDefault();
    if (isSubmitting) return;
    
    const otpInput = document.getElementById('otp');
    const passwordInput = document.getElementById('password');
    
    const otp = otpInput?.value.trim();
    const password = passwordInput?.value;
    const phone = sessionStorage.getItem('signup_phone');
    
    if (!otp || !password) {
        showError('Please enter the verification code and password');
        return;
    }
    
    try {
        isSubmitting = true;
        showLoading(true);
        
        // Verify OTP
        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: 'sms'
        });
        
        if (error) throw error;
        
        // Update user password
        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });
        
        if (updateError) throw updateError;
        
        // Redirect to dashboard after successful verification
        window.location.href = '/dashboard.html';
        
    } catch (error) {
        console.error('Error verifying OTP:', error);
        showError(error.message || 'Failed to verify code. Please try again.');
    } finally {
        isSubmitting = false;
        showLoading(false);
    }
}

/**
 * Check for existing session
 */
async function checkSession(supabase) {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
            console.log('User already signed in, redirecting...');
            window.location.href = '/dashboard.html';
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}

// Helper Functions

function showPhoneForm() {
    document.getElementById('signup-form-step1')?.classList.remove('d-none');
    document.getElementById('signup-form-step2')?.classList.add('d-none');
}

function showOtpForm() {
    document.getElementById('signup-form-step1')?.classList.add('d-none');
    document.getElementById('signup-form-step2')?.classList.remove('d-none');
    document.getElementById('otp')?.focus();
}

function showLoading(show) {
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(btn => {
        const spinner = btn.querySelector('.spinner-border');
        if (spinner) {
            spinner.classList.toggle('d-none', !show);
        }
        btn.disabled = show;
    });
}

function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If starts with country code, add +
    if (digits.length > 10) {
        return `+${digits}`;
    }
    
    // Assume US/Canada number if no country code
    if (digits.length === 10) {
        return `+1${digits}`;
    }
    
    return null;
}

function showError(message, title = 'Error') {
    console.error(`${title}: ${message}`);
    
    // Show error in UI if error element exists
    const errorElement = document.getElementById('error-message') || createErrorElement();
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.add('d-none');
        }, 5000);
    }
    
    // Also show alert as fallback
    alert(`${title}: ${message}`);
}

function createErrorElement() {
    const existing = document.getElementById('error-message');
    if (existing) return existing;
    
    const container = document.querySelector('.auth-container') || document.body;
    if (!container) return null;
    
    const div = document.createElement('div');
    div.id = 'error-message';
    div.className = 'alert alert-danger d-none';
    div.role = 'alert';
    container.prepend(div);
    
    return div;
}

// Utility Functions

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function waitFor(condition, timeout = 5000, interval = 100) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        
        const check = () => {
            if (condition()) {
                resolve(true);
            } else if (Date.now() - start > timeout) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                setTimeout(check, interval);
            }
        };
        
        check();
    });
}
