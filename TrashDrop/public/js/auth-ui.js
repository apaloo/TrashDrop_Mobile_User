// Auth UI Handler for TrashDrop
// Handles the UI interactions for authentication

document.addEventListener('DOMContentLoaded', () => {
    // Initialize toast
    const toastEl = document.getElementById('toast');
    const toast = new bootstrap.Toast(toastEl);
    
    // Show toast message
    function showToast(title, message, type = 'info') {
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        // Set message and style
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // Set background color based on type
        const bgClass = {
            'success': 'bg-success text-white',
            'error': 'bg-danger text-white',
            'warning': 'bg-warning text-dark',
            'info': 'bg-info text-white'
        }[type] || '';
        
        // Update toast classes
        const toastHeader = toastEl.querySelector('.toast-header');
        toastHeader.className = `toast-header ${bgClass} text-white`;
        
        // Show the toast
        toast.show();
    }
    
    // Toggle button loading state
    function setLoading(button, isLoading) {
        const spinner = button.querySelector('.spinner-border');
        if (isLoading) {
            button.disabled = true;
            if (spinner) spinner.classList.remove('d-none');
        } else {
            button.disabled = false;
            if (spinner) spinner.classList.add('d-none');
        }
    }
    
    // Update UI based on auth state
    function updateAuthUI(user) {
        const authForms = document.querySelectorAll('#signInForm, #signUpForm');
        const userInfoCard = document.getElementById('userInfoCard');
        const userInfo = document.getElementById('userInfo');
        
        if (user) {
            // User is signed in
            authForms.forEach(form => form.reset());
            authForms.forEach(form => form.closest('.card').classList.add('d-none'));
            if (userInfoCard) userInfoCard.classList.remove('d-none');
            
            // Display user info
            if (userInfo) {
                userInfo.innerHTML = `
                    <p><strong>ID:</strong> ${user.id}</p>
                    <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                    <p><strong>Last Sign In:</strong> ${new Date(user.last_sign_in_at).toLocaleString()}</p>
                    <p><strong>Email Verified:</strong> ${user.email_confirmed_at ? '✅' : '❌'}</p>
                `;
            }
        } else {
            // User is signed out
            authForms.forEach(form => form.closest('.card').classList.remove('d-none'));
            if (userInfoCard) userInfoCard.classList.add('d-none');
        }
    }
    
    // Handle sign in with email/password
    async function handleSignIn(event) {
        if (event) event.preventDefault();
        
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;
        const submitBtn = event?.target?.querySelector('button[type="submit"]');
        
        if (!email || !password) {
            showToast('Error', 'Please enter both email and password', 'error');
            return;
        }
        
        try {
            if (submitBtn) setLoading(submitBtn, true);
            
            const { data, error } = await window.auth.signIn(email, password);
            
            if (error) throw error;
            
            showToast('Success', 'Signed in successfully!', 'success');
            updateAuthUI(data.user);
        } catch (error) {
            console.error('Sign in error:', error);
            showToast('Error', error.message || 'Failed to sign in', 'error');
        } finally {
            if (submitBtn) setLoading(submitBtn, false);
        }
    }
    
    // Handle sign up with email/password
    async function handleSignUp(event) {
        if (event) event.preventDefault();
        
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const submitBtn = event?.target?.querySelector('button[type="submit"]');
        
        if (password !== confirmPassword) {
            showToast('Error', 'Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Error', 'Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            if (submitBtn) setLoading(submitBtn, true);
            
            const { data, error } = await window.auth.signUp(email, password);
            
            if (error) throw error;
            
            showToast('Success', 'Account created! Please check your email to confirm your account.', 'success');
            // Switch to sign in tab
            document.getElementById('signInTab')?.click();
        } catch (error) {
            console.error('Sign up error:', error);
            showToast('Error', error.message || 'Failed to create account', 'error');
        } finally {
            if (submitBtn) setLoading(submitBtn, false);
        }
    }
    
    // Handle social login
    async function handleSocialLogin(provider) {
        const button = document.getElementById(`${provider}SignIn`);
        
        try {
            if (button) setLoading(button, true);
            
            const { data, error } = await window.supabase.auth.signInWithOAuth({
                provider: provider.toLowerCase(),
                options: {
                    redirectTo: window.location.origin + '/auth/callback'
                }
            });
            
            if (error) throw error;
            
        } catch (error) {
            console.error(`${provider} sign in error:`, error);
            showToast('Error', `Failed to sign in with ${provider}: ${error.message}`, 'error');
        } finally {
            if (button) setLoading(button, false);
        }
    }
    
    // Handle sign out
    async function handleSignOut() {
        const button = document.getElementById('signOutBtn');
        
        try {
            if (button) setLoading(button, true);
            
            const { error } = await window.auth.signOut();
            
            if (error) throw error;
            
            showToast('Success', 'Signed out successfully', 'success');
            updateAuthUI(null);
        } catch (error) {
            console.error('Sign out error:', error);
            showToast('Error', 'Failed to sign out', 'error');
        } finally {
            if (button) setLoading(button, false);
        }
    }
    
    // Check current session on page load
    async function checkSession() {
        try {
            const { data: { user } } = await window.auth.getSession();
            if (user) {
                updateAuthUI(user);
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }
    
    // Initialize event listeners
    function initEventListeners() {
        // Sign in form
        const signInForm = document.getElementById('signInForm');
        if (signInForm) {
            signInForm.addEventListener('submit', handleSignIn);
        }
        
        // Sign up form
        const signUpForm = document.getElementById('signUpForm');
        if (signUpForm) {
            signUpForm.addEventListener('submit', handleSignUp);
        }
        
        // Social login buttons
        const googleBtn = document.getElementById('googleSignIn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => handleSocialLogin('google'));
        }
        
        const githubBtn = document.getElementById('githubSignIn');
        if (githubBtn) {
            githubBtn.addEventListener('click', () => handleSocialLogin('github'));
        }
        
        // Sign out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', handleSignOut);
        }
    }
    
    // Initialize auth UI
    async function initAuthUI() {
        // Wait for auth to be ready
        try {
            await new Promise((resolve, reject) => {
                const checkAuth = setInterval(() => {
                    if (window.auth) {
                        clearInterval(checkAuth);
                        resolve();
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkAuth);
                    reject(new Error('Auth module not available'));
                }, 5000);
            });
            
            // Initialize event listeners
            initEventListeners();
            
            // Check current session
            await checkSession();
            
        } catch (error) {
            console.error('Failed to initialize auth UI:', error);
            showToast('Error', 'Failed to initialize authentication', 'error');
        }
    }
    
    // Start initialization
    initAuthUI();
});
