/**
 * TrashDrop Navbar Component
 * Provides a consistent navigation bar across all pages
 */

// IMMEDIATELY executing function to fix navbar display issues
(function() {
    // Create a style tag to ensure navbars display properly
    const style = document.createElement('style');
    style.textContent = `
        /* Ensure navbars are always visible and fixed at the top */
        nav.navbar.navbar-dark.bg-success {
            display: flex !important;
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            left: 0 !important;
            z-index: 1030 !important;
        }
        
        /* Hide duplicate navbars */
        nav.navbar.navbar-dark.bg-success:not(:first-of-type) {
            display: none !important;
        }
        
        /* Show mobile components on mobile screens */
        @media (max-width: 991.98px) {
            .navbar .d-flex.d-lg-none {
                display: flex !important;
            }
            
            /* Hide desktop components on mobile */
            .navbar .d-none.d-lg-flex {
                display: none !important;
            }
        }
        
        /* Show desktop components on desktop screens */
        @media (min-width: 992px) {
            .navbar .d-none.d-lg-flex {
                display: flex !important;
            }
        }
        
        /* Hide duplicate TrashDrop headers */
        .navbar-brand:not(:first-of-type),
        #green-header-duplicate {
            display: none !important;
        }
        
        /* Target any duplicate green headers */
        .bg-success:not(.navbar) {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Remove duplicate navbars and header elements
    function removeDuplicateNavbars() {
        // Wait for DOM to be loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', performRemoval);
        } else {
            performRemoval();
        }
        
        function performRemoval() {
            // Skip this on pages that handle their own navbars
            const currentPath = window.location.pathname;
            if (currentPath === '/scan' || 
                currentPath === '/pickup' || 
                currentPath === '/report') {
                console.log('On specialized page, skipping navbar cleanup');
                return;
            }
            
            try {
                // Find all navbars
                const navbars = document.querySelectorAll('nav.navbar.navbar-dark.bg-success');
                
                // Keep only the first navbar
                if (navbars.length > 1) {
                    console.log(`Found ${navbars.length} navbars, removing duplicates`);
                    for (let i = 1; i < navbars.length; i++) {
                        if (navbars[i] && navbars[i].parentNode) {
                            navbars[i].parentNode.removeChild(navbars[i]);
                        }
                    }
                }
                
                // Also look for and remove duplicate green headers
                const greenHeaders = document.querySelectorAll('.bg-success:not(.navbar)');
                if (greenHeaders.length > 1) {
                    console.log(`Found ${greenHeaders.length} green headers, removing duplicates`);
                    for (let i = 1; i < greenHeaders.length; i++) {
                        if (greenHeaders[i] && greenHeaders[i].parentNode) {
                            greenHeaders[i].parentNode.removeChild(greenHeaders[i]);
                            greenHeaders[i].id = 'green-header-duplicate'; // Mark for future removal
                        }
                    }
                }
            } catch (error) {
                console.error('Error removing duplicate navbars:', error);
            }
        }
    }
    
    // Run immediately
    removeDuplicateNavbars();
    
    // Also set up a MutationObserver to catch dynamically added navbars
    let observer;
    try {
        observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    // Only check if we've added elements that might contain navbars
                    let hasNav = false;
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'NAV' || node.querySelector('nav')) {
                                hasNav = true;
                                break;
                            }
                        }
                    }
                    
                    if (hasNav) {
                        removeDuplicateNavbars();
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating MutationObserver:', error);
    }
    
    // Start observing the entire document
    if (observer) {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
})();

// TrashDrop Navbar Class
class TrashDropNavbar {
    constructor() {
        this.currentPath = window.location.pathname;
        this.userData = JSON.parse(localStorage.getItem('userData')) || { name: 'User', points: 0 };
    }

    /**
     * Initialize the navbar
     */
    init() {
        this.injectNavbar();
        this.setupEventListeners();
        this.updateUserInfo();
        this.updateConnectionStatus();
    }

    /**
     * Get HTML for the navbar
     */
    getNavbarHTML() {
        return `
        <nav class="navbar navbar-dark bg-success" role="navigation" aria-label="Main Navigation">
            <div class="container">
                <!-- Mobile view (simplified) -->
                <div class="d-flex d-lg-none justify-content-between align-items-center w-100">
                    <a class="navbar-brand" href="/dashboard">
                        <img src="/images/logo.svg" alt="TrashDrop Logo" width="30" height="30" class="d-inline-block align-top me-2">
                        TrashDrop
                    </a>
                    <div class="d-flex align-items-center">
                        <span id="connection-status-mobile" class="badge text-bg-success me-2">Online</span>
                        <span id="pickup-offline-indicator-mobile" class="badge rounded-pill text-bg-warning d-none">0</span>
                        <a href="/rewards" class="text-white me-3 text-decoration-none">
                            <i class="bi bi-award-fill me-1"></i>
                            <span id="user-points-mobile">0</span> points
                        </a>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-light rounded-circle p-1" type="button" id="userDropdownMobile" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-person-circle"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdownMobile">
                                <li><a class="dropdown-item" href="/profile"><i class="bi bi-person me-2"></i>Profile</a></li>
                                <li><a class="dropdown-item" href="#" id="toggle-theme-mobile"><i class="bi bi-moon me-2"></i>Dark Mode</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" id="logout-mobile"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- Desktop view (full) -->
                <div class="d-none d-lg-flex justify-content-between align-items-center w-100">
                    <a class="navbar-brand" href="/dashboard">
                        <img src="/images/logo.svg" alt="TrashDrop Logo" width="30" height="30" class="d-inline-block align-top me-2">
                        TrashDrop
                    </a>
                    <div class="d-flex align-items-center">
                        <a href="/dashboard" class="nav-link text-white ${this.currentPath === '/dashboard' ? 'active' : ''} me-3">
                            <i class="bi bi-house-door-fill me-1"></i> Dashboard
                        </a>
                        <a href="/request-pickup" class="nav-link text-white ${this.currentPath === '/request-pickup' ? 'active' : ''} me-3">
                            <i class="bi bi-truck me-1"></i> Request Pickup
                        </a>
                        <a href="/report" class="nav-link text-white ${this.currentPath === '/report' ? 'active' : ''} me-3">
                            <i class="bi bi-exclamation-triangle-fill me-1"></i> Report Dumping
                        </a>
                        <a href="/scan" class="nav-link text-white ${this.currentPath === '/scan' ? 'active' : ''} me-3">
                            <i class="bi bi-qr-code-scan me-1"></i> Scan Code
                        </a>
                        <div class="dropdown me-3">
                            <button class="btn btn-outline-light dropdown-toggle" type="button" id="moreDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                More
                            </button>
                            <ul class="dropdown-menu" aria-labelledby="moreDropdown">
                                <li><a class="dropdown-item" href="/all-activities"><i class="bi bi-activity me-2"></i>View All Activities</a></li>
                                <li><a class="dropdown-item" href="/all-reports"><i class="bi bi-list-ul me-2"></i>View All Reports</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="/order-bags"><i class="bi bi-bag-fill me-2"></i>Order Bags</a></li>
                                <li><a class="dropdown-item" href="/rewards"><i class="bi bi-trophy-fill me-2"></i>Rewards</a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <span id="connection-status" class="badge text-bg-success me-2">Online</span>
                        <span id="pickup-offline-indicator" class="badge rounded-pill text-bg-warning d-none">0</span>
                        <a href="/rewards" class="text-white me-3 text-decoration-none">
                            <i class="bi bi-award-fill me-1"></i>
                            <span id="user-points">0</span> points
                        </a>
                        <div class="dropdown">
                            <button class="btn btn-outline-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-person-circle me-1"></i>
                                <span id="user-name">User</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                                <li><a class="dropdown-item" href="/profile"><i class="bi bi-person me-2"></i>Profile</a></li>
                                <li><a class="dropdown-item" href="/settings"><i class="bi bi-gear me-2"></i>Settings</a></li>
                                <li><a class="dropdown-item" href="#" id="toggle-theme"><i class="bi bi-moon me-2"></i>Dark Mode</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" id="logout"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
        `;
    }

    /**
     * Inject the navbar into the page
     */
    injectNavbar() {
        // Skip on specialized pages that have their own navbar
        if (this.currentPath === '/scan' || 
            this.currentPath === '/pickup' || 
            this.currentPath === '/report') {
            console.log('On specialized page, skipping navbar injection');
            return;
        }
        
        // Create a new navbar element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.getNavbarHTML().trim();
        const newNavbar = tempDiv.firstChild;
        
        // Find existing navbar
        const existingNavbar = document.querySelector('nav.navbar.navbar-dark.bg-success');
        
        if (existingNavbar) {
            // Replace existing navbar
            existingNavbar.parentNode.replaceChild(newNavbar, existingNavbar);
        } else {
            // Insert at the beginning of the body
            document.body.insertBefore(newNavbar, document.body.firstChild);
        }
        
        // Add padding to body to prevent content from being hidden under fixed navbar
        const navbarHeight = newNavbar.offsetHeight;
        document.body.style.paddingTop = navbarHeight + 'px';
    }

    /**
     * Update user information in the navbar
     */
    updateUserInfo() {
        const userPointsElement = document.getElementById('user-points');
        const userPointsMobileElement = document.getElementById('user-points-mobile');
        const userNameElement = document.getElementById('user-name');
        
        if (userPointsElement) {
            userPointsElement.textContent = this.userData.points || 0;
        }
        
        if (userPointsMobileElement) {
            userPointsMobileElement.textContent = this.userData.points || 0;
        }
        
        if (userNameElement) {
            userNameElement.textContent = this.userData.name || 'User';
        }
    }

    /**
     * Update connection status in the navbar
     */
    updateConnectionStatus() {
        const isOnline = navigator.onLine;
        const connectionStatus = document.getElementById('connection-status');
        const connectionStatusMobile = document.getElementById('connection-status-mobile');
        
        if (connectionStatus) {
            connectionStatus.textContent = isOnline ? 'Online' : 'Offline';
            connectionStatus.classList.remove('text-bg-success', 'text-bg-danger');
            connectionStatus.classList.add(isOnline ? 'text-bg-success' : 'text-bg-danger');
        }
        
        if (connectionStatusMobile) {
            connectionStatusMobile.textContent = isOnline ? 'Online' : 'Offline';
            connectionStatusMobile.classList.remove('text-bg-success', 'text-bg-danger');
            connectionStatusMobile.classList.add(isOnline ? 'text-bg-success' : 'text-bg-danger');
        }
    }

    /**
     * Setup event listeners for navbar elements
     */
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logout');
        const logoutBtnMobile = document.getElementById('logout-mobile');
        
        const handleLogout = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            console.log('Logout button clicked');
            
            // Prevent multiple clicks
            const clickedButton = e.currentTarget;
            if (clickedButton) {
                clickedButton.disabled = true;
                if (clickedButton.querySelector('.spinner-border')) {
                    // Already processing, don't duplicate
                    return;
                }
                
                // Show spinner inside the button for better UX
                const buttonText = clickedButton.innerHTML;
                clickedButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging out...';
            }
            
            // Show a loading spinner or feedback
            const spinner = document.createElement('div');
            spinner.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50';
            spinner.style.zIndex = '9999';
            spinner.innerHTML = '<div class="spinner-border text-light" role="status"><span class="visually-hidden">Logging out...</span></div>';
            document.body.appendChild(spinner);
            
            // Detect if we're on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Try server-side logout first (most reliable method)
            if (isMobile) {
                try {
                    // Use the dedicated server endpoint for logout which handles mobile devices specially
                    window.location.href = '/api/logout?t=' + Date.now();
                    return; // This will navigate away, no need to continue
                } catch (err) {
                    console.error('Server logout failed, falling back to client-side logout', err);
                    // Continue with client-side logout as fallback
                }
            }
            
            // Client-side logout as fallback or for desktop
            try {
                if (window.AuthManager && typeof window.AuthManager.signOut === 'function') {
                    console.log('Using AuthManager to sign out');
                    window.AuthManager.signOut()
                        .then(() => performRedirect())
                        .catch(err => {
                            console.error('Error during AuthManager signOut:', err);
                            performRedirect();
                        });
                } else {
                    console.log('AuthManager not available, performing manual cleanup');
                    // Manual cleanup
                    localStorage.removeItem('jwt_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('dev_user');
                    localStorage.removeItem('userData');
                    localStorage.removeItem('supabase.auth.token');
                    sessionStorage.clear();
                    performRedirect();
                }
            } catch (error) {
                console.error('Error during logout:', error);
                performRedirect();
            }
            
            function performRedirect() {
                console.log('Redirecting to login page');
                
                // Special handling for mobile devices
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const isNgrok = window.location.hostname.includes('ngrok-free.app');
                
                // For all devices, use a simplified direct approach to avoid refresh loops
                console.log('Using direct, simplified approach to logout');
                
                // 1. Clear ALL storage to prevent token persistence
                try {
                    const keysToRemove = ['jwt_token', 'token', 'dev_user', 'userData', 'supabase.auth.token'];
                    keysToRemove.forEach(key => {
                        try { localStorage.removeItem(key); } catch (e) {}
                    });
                    sessionStorage.clear();
                    
                    // Clear all cookies
                    document.cookie.split(';').forEach(cookie => {
                        const name = cookie.split('=')[0].trim();
                        if (name) {
                            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                        }
                    });
                } catch (e) {
                    console.error('Error clearing storage:', e);
                }
                
                // 2. Generate clean login URL with timestamp to prevent caching
                const timestamp = Date.now();
                let loginUrl = '/login?clean=true&t=' + timestamp;
                
                // 3. Use the appropriate base URL if available
                if (window.BaseUrlHandler && typeof window.BaseUrlHandler.getBaseUrl === 'function') {
                    const baseUrl = window.BaseUrlHandler.getBaseUrl();
                    if (baseUrl && !loginUrl.startsWith(baseUrl)) {
                        loginUrl = baseUrl + loginUrl;
                    }
                }
                
                // 4. Direct navigation - most reliable approach
                setTimeout(() => {
                    try {
                        // Replace is better than assign as it doesn't add to browser history
                        window.location.replace(loginUrl);
                    } catch (e) {
                        console.error('Location replace failed, trying direct assignment', e);
                        window.location.href = loginUrl;
                    }
                }, 50); // Short delay to ensure storage clearing is complete
            }
        };
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', handleLogout);
        }
        
        // Dark mode toggle - using unique variable names to avoid conflicts
        const desktopThemeBtn = document.getElementById('toggle-theme');
        const mobileThemeBtn = document.getElementById('toggle-theme-mobile');
        
        if (desktopThemeBtn && window.ThemeSwitcher) {
            desktopThemeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.ThemeSwitcher.toggleTheme();
            });
        }
        
        if (mobileThemeBtn && window.ThemeSwitcher) {
            mobileThemeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.ThemeSwitcher.toggleTheme();
            });
        }
        
        // Online/offline status
        window.addEventListener('online', () => this.updateConnectionStatus());
        window.addEventListener('offline', () => this.updateConnectionStatus());
    }
}

// Initialize the navbar when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const navbar = new TrashDropNavbar();
    navbar.init();
});
