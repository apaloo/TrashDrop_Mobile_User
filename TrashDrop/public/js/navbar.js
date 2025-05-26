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
        .container > .row:first-child + .row {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    console.log('Added CSS to ensure navbars display correctly');
    
    // Remove duplicate navbars and header elements
    function removeDuplicateNavbars() {
        // Don't remove navbars on pages where we've manually added them
        const currentPath = window.location.pathname;
        const hardcodedNavbarPages = ['/scan', '/request-pickup', '/report-dumping'];
        
        if (hardcodedNavbarPages.includes(currentPath)) {
            console.log('Page has hardcoded navbar, skipping duplicate removal');
            return;
        }
        
        // Remove duplicate navbars
        const allNavbars = document.querySelectorAll('nav.navbar.navbar-dark.bg-success');
        console.log(`Found ${allNavbars.length} navbars on the page`);
        
        if (allNavbars.length > 1) {
            for (let i = 1; i < allNavbars.length; i++) {
                console.log(`Removing duplicate navbar #${i}`);
                if (allNavbars[i] && allNavbars[i].parentNode) {
                    allNavbars[i].parentNode.removeChild(allNavbars[i]);
                }
            }
        }
        
        // Remove duplicate logos/brand links
        const allBrands = document.querySelectorAll('.navbar-brand');
        if (allBrands.length > 1) {
            for (let i = 1; i < allBrands.length; i++) {
                console.log(`Removing duplicate brand #${i}`);
                if (allBrands[i] && allBrands[i].parentNode) {
                    allBrands[i].parentNode.removeChild(allBrands[i]);
                }
            }
        }
        
        // Target duplicate TrashDrop text
        const trashDropElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.childNodes && 
            Array.from(el.childNodes).some(node => 
                node.nodeType === 3 && node.textContent.trim() === 'TrashDrop'
            )
        );
        
        if (trashDropElements.length > 1) {
            for (let i = 1; i < trashDropElements.length; i++) {
                console.log(`Removing duplicate TrashDrop text element #${i}`);
                if (trashDropElements[i] && trashDropElements[i].parentNode) {
                    trashDropElements[i].parentNode.removeChild(trashDropElements[i]);
                }
            }
        }
    }
    
    // Run immediately
    removeDuplicateNavbars();
    
    // Also set up a MutationObserver to catch dynamically added navbars
    const observer = new MutationObserver((mutations) => {
        let needsCleanup = false;
        
        // Check if any mutations added a navbar
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element node
                        if (node.matches && node.matches('nav.navbar.navbar-dark.bg-success')) {
                            needsCleanup = true;
                        } else if (node.querySelectorAll) {
                            const navbars = node.querySelectorAll('nav.navbar.navbar-dark.bg-success');
                            if (navbars.length > 0) {
                                needsCleanup = true;
                            }
                        }
                    }
                }
            }
        }
        
        // If a navbar was added, clean up duplicates
        if (needsCleanup) {
            removeDuplicateNavbars();
        }
    });
    
    // Start observing the entire document
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();

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
                                <li><a class="dropdown-item text-danger" href="#" id="emergency-logout-mobile" data-bs-toggle="modal" data-bs-target="#emergencyLogoutModal"><i class="bi bi-exclamation-triangle me-2"></i>Emergency Logout</a></li>
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
                    <button class="navbar-toggler d-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse show" id="navbarNav">
                        <ul class="navbar-nav me-auto">
                            <!-- Navbar items removed as requested -->
                        </ul>
                        <div class="d-flex align-items-center">
                            <div class="d-flex align-items-center me-3">
                                <span id="connection-status" class="badge text-bg-success me-2">Online</span>
                                <span id="pickup-offline-indicator" class="badge rounded-pill text-bg-warning d-none">0</span>
                            </div>
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
                                    <li><a class="dropdown-item" href="#" id="toggle-theme"><i class="bi bi-moon me-2"></i>Dark Mode</a></li>
                                    <li><a class="dropdown-item" href="/views/db-performance.html"><i class="bi bi-speedometer2 me-2"></i>DB Performance</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" id="emergency-logout" data-bs-toggle="modal" data-bs-target="#emergencyLogoutModal"><i class="bi bi-exclamation-triangle me-2"></i>Emergency Logout</a></li>
                                    <li><a class="dropdown-item" href="#" id="logout"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>`;
    }

    /**
     * Inject the navbar into the page
     */
    injectNavbar() {
        // Only inject if not already present and if we're not on login or signup pages
        if (document.querySelector('.navbar') || 
            this.currentPath.includes('/login') || 
            this.currentPath.includes('/signup')) {
            console.log('Navbar already exists or on login/signup page, not injecting');
            return;
        }
        console.log('Injecting navbar into page');
        
        // Create navbar element
        const navElement = document.createElement('div');
        navElement.innerHTML = this.getNavbarHTML();
        
        // Insert the navbar at the beginning of the body
        document.body.insertBefore(navElement.firstElementChild, document.body.firstChild);
    }

    /**
     * Update user information in the navbar
     */
    updateUserInfo() {
        const userNameElement = document.getElementById('user-name');
        const userPointsElement = document.getElementById('user-points');
        const userPointsMobileElement = document.getElementById('user-points-mobile');
        
        if (userNameElement) {
            userNameElement.textContent = this.userData.name || 'User';
        }
        
        if (userPointsElement) {
            userPointsElement.textContent = this.userData.points || '0';
        }
        
        if (userPointsMobileElement) {
            userPointsMobileElement.textContent = this.userData.points || '0';
        }
    }

    /**
     * Update connection status in the navbar
     */
    updateConnectionStatus() {
        const connectionStatus = document.getElementById('connection-status');
        const connectionStatusMobile = document.getElementById('connection-status-mobile');
        const isOnline = navigator.onLine;
        
        if (connectionStatus) {
            connectionStatus.textContent = isOnline ? 'Online' : 'Offline';
            connectionStatus.classList.remove(isOnline ? 'text-bg-danger' : 'text-bg-success');
            connectionStatus.classList.add(isOnline ? 'text-bg-success' : 'text-bg-danger');
        }
        
        if (connectionStatusMobile) {
            connectionStatusMobile.textContent = isOnline ? 'Online' : 'Offline';
            connectionStatusMobile.classList.remove(isOnline ? 'text-bg-danger' : 'text-bg-success');
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
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/login?logout=true';
            });
        }
        
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/login?logout=true';
            });
        }
        
        // Dark mode toggle
        const toggleThemeBtn = document.getElementById('toggle-theme');
        const toggleThemeBtnMobile = document.getElementById('toggle-theme-mobile');
        
        if (toggleThemeBtn && window.ThemeSwitcher) {
            toggleThemeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.ThemeSwitcher.toggleTheme();
            });
        }
        
        if (toggleThemeBtnMobile && window.ThemeSwitcher) {
            toggleThemeBtnMobile.addEventListener('click', (e) => {
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
