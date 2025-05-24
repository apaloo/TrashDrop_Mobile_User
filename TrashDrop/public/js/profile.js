document.addEventListener('DOMContentLoaded', async function() {
    // Elements
    const userNameElement = document.getElementById('user-name');
    const userPointsElement = document.getElementById('user-points');
    const profileFullNameElement = document.getElementById('profile-full-name');
    const memberSinceElement = document.getElementById('profile-member-since');
    const avatarPreview = document.getElementById('avatar-preview');
    const avatarUpload = document.getElementById('avatar-upload');
    const currentDeviceElement = document.getElementById('current-device');
    const passwordStrengthMeter = document.getElementById('password-strength-meter');
    const passwordStrengthText = document.getElementById('password-strength-text');
    const confirmDeleteCheckbox = document.getElementById('confirm-delete');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const toggleThemeBtn = document.getElementById('toggle-theme');
    
    // Forms
    const personalInfoForm = document.getElementById('personal-info-form');
    const preferencesForm = document.getElementById('preferences-form');
    const notificationsForm = document.getElementById('notifications-form');
    const changePasswordForm = document.getElementById('change-password-form');

    // Buttons
    const changeAvatarBtn = document.getElementById('change-avatar');
    const logoutAllDevicesBtn = document.getElementById('logout-all-devices');
    const logoutBtn = document.getElementById('logout');
    const confirmEmergencyLogoutBtn = document.getElementById('confirm-emergency-logout');

    // Global variables
    let userProfile = null;
    let isDarkMode = false;
    
    // Initialize
    try {
        await loadUserProfile();
        setupEventListeners();
        detectDeviceInfo();
        checkTheme();
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showToast('Error loading profile', 'danger');
    }

    // Load user profile data
    async function loadUserProfile() {
        try {
            // Check if user is logged in
            const user = await AuthManager.getCurrentUser();
            if (!user) {
                // Redirect to login if not authenticated
                window.location.href = '/login';
                return;
            }

            // Get user profile
            userProfile = await AuthManager.getUserProfile();
            if (!userProfile) {
                throw new Error('Failed to load user profile');
            }

            // Fill in the form fields
            populateProfileData(userProfile);
            
            // Update user info in header
            updateUserInfo(userProfile);
            
            console.log('Profile loaded successfully');
        } catch (error) {
            console.error('Error loading user profile:', error);
            throw error;
        }
    }

    // Populate profile data in forms
    function populateProfileData(profile) {
        // Personal Info
        document.getElementById('first_name').value = profile.first_name || '';
        document.getElementById('last_name').value = profile.last_name || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('address').value = profile.address || '';
        
        // Display name and member since
        profileFullNameElement.textContent = `${profile.first_name} ${profile.last_name}`;
        
        // Format created_at date
        if (profile.created_at) {
            const createdDate = new Date(profile.created_at);
            const options = { year: 'numeric', month: 'long' };
            memberSinceElement.textContent = `Member since: ${createdDate.toLocaleDateString('en-US', options)}`;
        }
        
        // Avatar
        if (profile.avatar_url) {
            avatarPreview.src = profile.avatar_url;
        }
        
        // Preferences
        document.getElementById('dark_mode').checked = profile.dark_mode || false;
        isDarkMode = profile.dark_mode || false;
        
        if (profile.language) {
            document.getElementById('language').value = profile.language;
        }
        
        // For demonstration purposes, we'll set some default values for other preferences
        // These would come from the user profile in a real implementation
        document.getElementById('high_contrast').checked = localStorage.getItem('high_contrast') === 'true';
        document.getElementById('large_text').checked = localStorage.getItem('large_text') === 'true';
        document.getElementById('reduce_motion').checked = localStorage.getItem('reduce_motion') === 'true';
        
        // Notifications (demo values)
        document.getElementById('enable_push').checked = localStorage.getItem('enable_push') !== 'false';
        document.getElementById('notify_pickup_reminders').checked = localStorage.getItem('notify_pickup_reminders') !== 'false';
        document.getElementById('notify_bag_scans').checked = localStorage.getItem('notify_bag_scans') !== 'false';
        document.getElementById('notify_points_earned').checked = localStorage.getItem('notify_points_earned') !== 'false';
        document.getElementById('notify_news').checked = localStorage.getItem('notify_news') !== 'false';
        
        document.getElementById('enable_email').checked = localStorage.getItem('enable_email') !== 'false';
        document.getElementById('email_pickup_summary').checked = localStorage.getItem('email_pickup_summary') !== 'false';
        document.getElementById('email_points_summary').checked = localStorage.getItem('email_points_summary') !== 'false';
        document.getElementById('email_special_offers').checked = localStorage.getItem('email_special_offers') === 'true';
    }

    // Setup event listeners
    function setupEventListeners() {
        // Avatar upload
        changeAvatarBtn.addEventListener('click', () => {
            avatarUpload.click();
        });
        
        avatarUpload.addEventListener('change', handleAvatarUpload);
        
        // Form submissions
        personalInfoForm.addEventListener('submit', handlePersonalInfoSubmit);
        preferencesForm.addEventListener('submit', handlePreferencesSubmit);
        notificationsForm.addEventListener('submit', handleNotificationsSubmit);
        changePasswordForm.addEventListener('submit', handlePasswordChange);
        
        // Password strength meter
        document.getElementById('new_password').addEventListener('input', updatePasswordStrength);
        
        // Logout buttons
        logoutBtn.addEventListener('click', handleLogout);
        logoutAllDevicesBtn.addEventListener('click', handleLogoutAllDevices);
        confirmEmergencyLogoutBtn.addEventListener('click', handleEmergencyLogout);
        
        // Account deletion
        confirmDeleteCheckbox.addEventListener('change', function() {
            confirmDeleteBtn.disabled = !this.checked;
        });
        
        confirmDeleteBtn.addEventListener('click', handleAccountDeletion);
        
        // Theme toggle
        toggleThemeBtn.addEventListener('click', toggleDarkMode);
        document.getElementById('dark_mode').addEventListener('change', function() {
            isDarkMode = this.checked;
            applyTheme(isDarkMode);
        });
    }

    // Handle personal info form submission
    async function handlePersonalInfoSubmit(event) {
        event.preventDefault();
        
        try {
            const updatedProfile = {
                first_name: document.getElementById('first_name').value,
                last_name: document.getElementById('last_name').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                updated_at: new Date().toISOString()
            };
            
            // Check network status
            if (!navigator.onLine) {
                // Store update for later sync
                storeProfileUpdateForSync(updatedProfile);
                showToast('Profile saved offline. Will update when online.', 'warning');
                return;
            }
            
            // Update in database
            const user = await AuthManager.getCurrentUser();
            if (!user) throw new Error('User not authenticated');
            
            // In development mode
            if (AuthManager.isDev()) {
                // Update local storage for development
                const currentUser = devUserStorage.getUser();
                const updatedUser = { ...currentUser, ...updatedProfile };
                devUserStorage.setUser(updatedUser);
                userProfile = updatedUser;
                
                showToast('Profile updated successfully', 'success');
                updateUserInfo(updatedUser);
                profileFullNameElement.textContent = `${updatedUser.first_name} ${updatedUser.last_name}`;
            } else {
                // Production mode - update in Supabase
                const { data, error } = await supabase
                    .from('profiles')
                    .update(updatedProfile)
                    .eq('id', user.id);
                
                if (error) throw error;
                
                userProfile = { ...userProfile, ...updatedProfile };
                showToast('Profile updated successfully', 'success');
                updateUserInfo(userProfile);
                profileFullNameElement.textContent = `${userProfile.first_name} ${userProfile.last_name}`;
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Failed to update profile', 'danger');
        }
    }

    // Handle preferences form submission
    async function handlePreferencesSubmit(event) {
        event.preventDefault();
        
        try {
            const darkMode = document.getElementById('dark_mode').checked;
            const language = document.getElementById('language').value;
            const highContrast = document.getElementById('high_contrast').checked;
            const largeText = document.getElementById('large_text').checked;
            const reduceMotion = document.getElementById('reduce_motion').checked;
            
            // Store accessibility preferences in localStorage
            localStorage.setItem('high_contrast', highContrast);
            localStorage.setItem('large_text', largeText);
            localStorage.setItem('reduce_motion', reduceMotion);
            
            // Apply theme
            applyTheme(darkMode);
            
            // Update in database
            const user = await AuthManager.getCurrentUser();
            if (!user) throw new Error('User not authenticated');
            
            const updatedPreferences = {
                dark_mode: darkMode,
                language: language,
                updated_at: new Date().toISOString()
            };
            
            // Check network status
            if (!navigator.onLine) {
                // Store update for later sync
                storePreferencesForSync(updatedPreferences);
                showToast('Preferences saved offline. Will update when online.', 'warning');
                return;
            }
            
            // In development mode
            if (AuthManager.isDev()) {
                // Update local storage for development
                const currentUser = devUserStorage.getUser();
                const updatedUser = { ...currentUser, ...updatedPreferences };
                devUserStorage.setUser(updatedUser);
                userProfile = updatedUser;
                
                showToast('Preferences updated successfully', 'success');
            } else {
                // Production mode - update in Supabase
                const { data, error } = await supabase
                    .from('profiles')
                    .update(updatedPreferences)
                    .eq('id', user.id);
                
                if (error) throw error;
                
                userProfile = { ...userProfile, ...updatedPreferences };
                showToast('Preferences updated successfully', 'success');
            }
        } catch (error) {
            console.error('Error updating preferences:', error);
            showToast('Failed to update preferences', 'danger');
        }
    }

    // Handle notifications form submission
    function handleNotificationsSubmit(event) {
        event.preventDefault();
        
        try {
            // Save notification preferences to localStorage for demo purposes
            // In production, these would be saved to the database
            
            // Push notifications
            localStorage.setItem('enable_push', document.getElementById('enable_push').checked);
            localStorage.setItem('notify_pickup_reminders', document.getElementById('notify_pickup_reminders').checked);
            localStorage.setItem('notify_bag_scans', document.getElementById('notify_bag_scans').checked);
            localStorage.setItem('notify_points_earned', document.getElementById('notify_points_earned').checked);
            localStorage.setItem('notify_news', document.getElementById('notify_news').checked);
            
            // Email notifications
            localStorage.setItem('enable_email', document.getElementById('enable_email').checked);
            localStorage.setItem('email_pickup_summary', document.getElementById('email_pickup_summary').checked);
            localStorage.setItem('email_points_summary', document.getElementById('email_points_summary').checked);
            localStorage.setItem('email_special_offers', document.getElementById('email_special_offers').checked);
            
            showToast('Notification preferences updated successfully', 'success');
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            showToast('Failed to update notification preferences', 'danger');
        }
    }

    // Handle password change
    async function handlePasswordChange(event) {
        event.preventDefault();
        
        try {
            const currentPassword = document.getElementById('current_password').value;
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            
            // Validate passwords
            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match', 'danger');
                return;
            }
            
            // Check password strength
            const strength = calculatePasswordStrength(newPassword);
            if (strength < 40) {
                showToast('Password is too weak. Please choose a stronger password.', 'danger');
                return;
            }
            
            // In development mode, just simulate success
            if (AuthManager.isDev()) {
                // Simulate password update
                setTimeout(() => {
                    document.getElementById('current_password').value = '';
                    document.getElementById('new_password').value = '';
                    document.getElementById('confirm_password').value = '';
                    passwordStrengthMeter.style.width = '0%';
                    passwordStrengthText.textContent = 'Password strength: Too weak';
                    
                    showToast('Password updated successfully (Development mode)', 'success');
                }, 1000);
                return;
            }
            
            // Production mode - update password in Supabase
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            // Clear form
            document.getElementById('current_password').value = '';
            document.getElementById('new_password').value = '';
            document.getElementById('confirm_password').value = '';
            passwordStrengthMeter.style.width = '0%';
            passwordStrengthText.textContent = 'Password strength: Too weak';
            
            showToast('Password updated successfully', 'success');
        } catch (error) {
            console.error('Error updating password:', error);
            showToast('Failed to update password', 'danger');
        }
    }

    // Handle avatar upload
    async function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'danger');
                return;
            }
            
            // Display preview
            const reader = new FileReader();
            reader.onload = function(e) {
                avatarPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
            // In development mode, just store the file in localStorage
            if (AuthManager.isDev()) {
                // Store the base64 image in localStorage
                reader.onloadend = function() {
                    const base64Image = reader.result;
                    const currentUser = devUserStorage.getUser();
                    const updatedUser = { ...currentUser, avatar_url: base64Image };
                    devUserStorage.setUser(updatedUser);
                    userProfile = updatedUser;
                    
                    showToast('Profile picture updated successfully (Development mode)', 'success');
                };
                return;
            }
            
            // Production mode - upload to Supabase Storage
            const user = await AuthManager.getCurrentUser();
            if (!user) throw new Error('User not authenticated');
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
            
            // Upload file
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);
            
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            
            const avatar_url = urlData.publicUrl;
            
            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            
            if (updateError) throw updateError;
            
            userProfile = { ...userProfile, avatar_url };
            showToast('Profile picture updated successfully', 'success');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showToast('Failed to update profile picture', 'danger');
        }
    }

    // Handle logout
    function handleLogout(event) {
        event.preventDefault();
        AuthManager.logout()
            .then(() => {
                window.location.href = '/login';
            })
            .catch(error => {
                console.error('Logout error:', error);
                showToast('Failed to logout', 'danger');
            });
    }

    // Handle logout from all devices
    function handleLogoutAllDevices() {
        if (confirm('Are you sure you want to log out from all devices?')) {
            // In a real implementation, this would revoke all session tokens
            AuthManager.logout()
                .then(() => {
                    window.location.href = '/login';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                    showToast('Failed to logout from all devices', 'danger');
                });
        }
    }

    // Handle emergency logout
    function handleEmergencyLogout() {
        // This uses the emergency-logout.js implementation
        if (typeof emergencyLogout === 'function') {
            emergencyLogout();
        } else {
            console.error('Emergency logout function not found');
            // Fallback to regular logout
            AuthManager.logout()
                .then(() => {
                    window.location.href = '/login';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                });
        }
    }

    // Handle account deletion
    async function handleAccountDeletion() {
        const password = document.getElementById('delete-password').value;
        
        if (!password) {
            showToast('Please enter your password to confirm', 'danger');
            return;
        }
        
        try {
            // In development mode, just simulate success
            if (AuthManager.isDev()) {
                // Simulate account deletion
                setTimeout(() => {
                    devUserStorage.clearUser();
                    window.location.href = '/login';
                }, 1500);
                return;
            }
            
            // Production mode - delete account in Supabase
            const user = await AuthManager.getCurrentUser();
            if (!user) throw new Error('User not authenticated');
            
            // Delete profile record
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);
            
            if (profileError) throw profileError;
            
            // Delete auth user (requires admin rights in Supabase)
            // This would typically be done through a server-side function
            
            // For now, just logout
            await AuthManager.logout();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error deleting account:', error);
            showToast('Failed to delete account', 'danger');
        }
    }

    // Update password strength meter
    function updatePasswordStrength(event) {
        const password = event.target.value;
        const strength = calculatePasswordStrength(password);
        
        // Update progress bar
        passwordStrengthMeter.style.width = `${strength}%`;
        
        // Update text and color
        if (strength < 20) {
            passwordStrengthMeter.className = 'progress-bar bg-danger';
            passwordStrengthText.textContent = 'Password strength: Too weak';
        } else if (strength < 40) {
            passwordStrengthMeter.className = 'progress-bar bg-warning';
            passwordStrengthText.textContent = 'Password strength: Weak';
        } else if (strength < 60) {
            passwordStrengthMeter.className = 'progress-bar bg-info';
            passwordStrengthText.textContent = 'Password strength: Medium';
        } else if (strength < 80) {
            passwordStrengthMeter.className = 'progress-bar bg-primary';
            passwordStrengthText.textContent = 'Password strength: Strong';
        } else {
            passwordStrengthMeter.className = 'progress-bar bg-success';
            passwordStrengthText.textContent = 'Password strength: Very strong';
        }
    }

    // Calculate password strength
    function calculatePasswordStrength(password) {
        if (!password) return 0;
        
        let strength = 0;
        
        // Length
        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 10;
        
        // Complexity
        if (/[a-z]/.test(password)) strength += 10;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
        
        // Variety
        const uniqueChars = new Set(password).size;
        strength += Math.min(uniqueChars * 2, 10);
        
        return Math.min(strength, 100);
    }

    // Toggle dark mode
    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        
        // Update checkbox in preferences
        document.getElementById('dark_mode').checked = isDarkMode;
        
        // Apply theme
        applyTheme(isDarkMode);
        
        // Update in database
        updateDarkModePreference(isDarkMode);
    }

    // Apply theme based on dark mode setting
    function applyTheme(darkMode) {
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.querySelector('html').setAttribute('data-bs-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.querySelector('html').setAttribute('data-bs-theme', 'light');
        }
    }

    // Check and apply theme based on user preference
    function checkTheme() {
        const darkMode = userProfile?.dark_mode || false;
        applyTheme(darkMode);
    }

    // Update dark mode preference in database
    async function updateDarkModePreference(darkMode) {
        try {
            const user = await AuthManager.getCurrentUser();
            if (!user) return;
            
            // Development mode
            if (AuthManager.isDev()) {
                const currentUser = devUserStorage.getUser();
                const updatedUser = { ...currentUser, dark_mode: darkMode };
                devUserStorage.setUser(updatedUser);
                userProfile = updatedUser;
                return;
            }
            
            // Production mode
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    dark_mode: darkMode,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', user.id);
            
            if (error) throw error;
            
            userProfile = { ...userProfile, dark_mode: darkMode };
        } catch (error) {
            console.error('Error updating dark mode preference:', error);
        }
    }

    // Store profile update for offline sync
    function storeProfileUpdateForSync(profileData) {
        if (typeof OfflineSync !== 'undefined' && OfflineSync.storeProfileUpdate) {
            OfflineSync.storeProfileUpdate(profileData);
        } else {
            // Fallback implementation
            const pendingUpdates = JSON.parse(localStorage.getItem('pendingProfileUpdates') || '[]');
            pendingUpdates.push({
                data: profileData,
                timestamp: Date.now()
            });
            localStorage.setItem('pendingProfileUpdates', JSON.stringify(pendingUpdates));
        }
    }

    // Store preferences for offline sync
    function storePreferencesForSync(preferencesData) {
        if (typeof OfflineSync !== 'undefined' && OfflineSync.storePreferencesUpdate) {
            OfflineSync.storePreferencesUpdate(preferencesData);
        } else {
            // Fallback implementation
            const pendingUpdates = JSON.parse(localStorage.getItem('pendingPreferencesUpdates') || '[]');
            pendingUpdates.push({
                data: preferencesData,
                timestamp: Date.now()
            });
            localStorage.setItem('pendingPreferencesUpdates', JSON.stringify(pendingUpdates));
        }
    }

    // Update user info in header
    function updateUserInfo(profile) {
        if (userNameElement) {
            userNameElement.textContent = profile.first_name || 'User';
        }
        
        if (userPointsElement) {
            userPointsElement.textContent = profile.points || '0';
        }
    }

    // Detect device info for current session
    function detectDeviceInfo() {
        const browser = detectBrowser();
        const os = detectOS();
        currentDeviceElement.textContent = `${browser} on ${os} • Active now`;
    }

    // Detect browser
    function detectBrowser() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
        if (userAgent.indexOf('Safari') > -1) return 'Safari';
        if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
        if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) return 'Internet Explorer';
        if (userAgent.indexOf('Edge') > -1) return 'Edge';
        
        return 'Unknown Browser';
    }

    // Detect OS
    function detectOS() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.indexOf('Windows') > -1) return 'Windows';
        if (userAgent.indexOf('Mac') > -1) return 'macOS';
        if (userAgent.indexOf('Linux') > -1) return 'Linux';
        if (userAgent.indexOf('Android') > -1) return 'Android';
        if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) return 'iOS';
        
        return 'Unknown OS';
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 5000 });
        bsToast.show();
        
        // Remove toast from DOM after it's hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }
});
