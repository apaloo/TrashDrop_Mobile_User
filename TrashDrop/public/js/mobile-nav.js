/**
 * TrashDrop Mobile Navigation
 * Handles the bottom navigation bar for mobile devices
 */

// IMMEDIATELY executing function to ensure mobile navbar is hidden on desktop
(function() {
    // Create a style tag to properly hide mobile navbar on desktop
    const style = document.createElement('style');
    style.textContent = `
        /* Ensure mobile bottom nav is only visible on mobile screens */
        @media (min-width: 992px) {
            .mobile-bottom-nav {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('Added CSS to ensure mobile navbar is hidden on desktop');
})();

class MobileNavigation {
    constructor() {
        this.currentPath = window.location.pathname;
        this.navItems = [
            { path: '/dashboard', icon: 'house', label: 'Home' },
            { path: '/scan', icon: 'qr-code-scan', label: 'Scan' },
            { path: '/request-pickup', icon: 'truck', label: 'Pickup' },
            { path: '/report-dumping', icon: 'exclamation-triangle', label: 'Report' }
        ];
    }

    /**
     * Initialize the mobile navigation
     */
    init() {
        this.injectNavigation();
        this.highlightCurrentPage();
    }

    /**
     * Get HTML for the bottom navigation
     */
    getNavigationHTML() {
        let html = `
        <!-- Mobile Bottom Navigation - Visible only on mobile and small tablets -->
        <div class="d-lg-none mobile-bottom-nav shadow-lg">`;
        
        // Add navigation items
        this.navItems.forEach(item => {
            html += `
            <a href="${item.path}" class="mobile-nav-item">
                <i class="bi bi-${item.icon}"></i>
                <span>${item.label}</span>
            </a>`;
        });
        
        html += `
        </div>
        `;
        
        return html;
    }

    /**
     * Get CSS for the bottom navigation
     */
    getNavigationCSS() {
        return `
        <style>
            /* Mobile Bottom Navigation Styles */
            .mobile-bottom-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-around;
                background-color: white;
                padding: 0.5rem 0;
                border-top: 1px solid rgba(0,0,0,0.1);
                z-index: 1000;
            }
            
            .mobile-nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                color: #6c757d;
                text-decoration: none;
                padding: 0.5rem;
                border-radius: 0.5rem;
                transition: all 0.2s ease;
            }
            
            .mobile-nav-item i {
                font-size: 1.5rem;
                margin-bottom: 0.25rem;
            }
            
            .mobile-nav-item span {
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .mobile-nav-item.active {
                color: var(--bs-success);
            }
            
            .mobile-nav-item:hover, .mobile-nav-item:focus {
                color: var(--bs-success);
                background-color: rgba(var(--bs-success-rgb), 0.1);
            }
            
            /* Add bottom padding to main content to prevent it from being hidden behind the navigation bar */
            @media (max-width: 991.98px) {
                main.container {
                    padding-bottom: 5rem !important; /* Ensure content isn't hidden behind the nav bar */
                }
                
                /* Adjust footer margin on mobile */
                footer {
                    margin-bottom: 4rem;
                }
            }
        </style>`;
    }

    /**
     * Inject the navigation into the page
     */
    injectNavigation() {
        // Only inject if not already present
        if (document.querySelector('.mobile-bottom-nav')) {
            return;
        }
        
        // Add CSS to head if not already there
        if (!document.getElementById('mobile-nav-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'mobile-nav-styles';
            styleElement.innerHTML = this.getNavigationCSS();
            document.head.appendChild(styleElement);
        }
        
        // Add navigation HTML before the footer
        const footer = document.querySelector('footer');
        if (footer) {
            const navElement = document.createElement('div');
            navElement.innerHTML = this.getNavigationHTML();
            footer.parentNode.insertBefore(navElement.firstElementChild, footer);
        } else {
            // If no footer, append to body
            const navElement = document.createElement('div');
            navElement.innerHTML = this.getNavigationHTML();
            document.body.appendChild(navElement.firstElementChild);
        }
    }

    /**
     * Highlight the current page in the navigation
     */
    highlightCurrentPage() {
        const navItems = document.querySelectorAll('.mobile-nav-item');
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            
            // Handle special cases
            if (href === '/dashboard' && this.currentPath === '/') {
                item.classList.add('active');
            } 
            // Handle activity and reports pages
            else if (href === '/report-dumping' && this.currentPath === '/reports') {
                item.classList.add('active');
            }
            // Handle exact matches
            else if (this.currentPath === href) {
                item.classList.add('active');
            }
        });
    }
}

// Initialize the mobile navigation when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const mobileNav = new MobileNavigation();
    mobileNav.init();
});
