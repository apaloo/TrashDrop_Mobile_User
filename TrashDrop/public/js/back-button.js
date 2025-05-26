/**
 * TrashDrop Back to Dashboard Button
 * Handles the conditional display of the Back to Dashboard button
 */

class BackToDashboardButton {
    constructor() {
        this.currentPath = window.location.pathname;
        
        // Pages where the back button should appear
        this.pagesWithBackButton = [
            '/request-pickup',
            '/report-dumping',
            '/schedule-pickup',
            '/scan',
            '/reports',
            '/activity'
        ];
    }

    /**
     * Initialize the back button
     */
    init() {
        // Only add back button on non-dashboard pages
        if (this.shouldShowBackButton()) {
            this.injectBackButton();
        }
    }

    /**
     * Check if the current page should have a back button
     */
    shouldShowBackButton() {
        // Don't show on dashboard
        if (this.currentPath === '/dashboard' || this.currentPath === '/') {
            return false;
        }
        
        // Check if current path is in the list of pages that should have a back button
        return this.pagesWithBackButton.some(path => 
            this.currentPath.startsWith(path)
        );
    }

    /**
     * Get HTML for the back button
     */
    getBackButtonHTML() {
        return `
        <!-- Back to Dashboard Button - Only visible on desktop -->
        <div class="back-to-dashboard-container d-none d-lg-block">
            <div class="container">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h1 class="h3 mb-0 invisible">Spacer</h1>
                    <a href="/dashboard" class="btn btn-outline-secondary">
                        <i class="bi bi-house-fill me-1"></i> Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Get CSS for the back button
     */
    getBackButtonCSS() {
        return `
        <style id="back-button-styles">
            .back-to-dashboard-container {
                padding: 0.5rem 0;
                margin-bottom: 0;
                background-color: #f8f9fa;
                border-bottom: 1px solid rgba(0,0,0,0.05);
            }
            
            .back-to-dashboard-container .btn-outline-secondary {
                font-weight: 500;
                transition: all 0.2s ease;
                border-color: #6c757d;
            }
            
            .back-to-dashboard-container .btn-outline-secondary:hover {
                background-color: #6c757d;
                color: white;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
        </style>`;
    }

    /**
     * Inject the back button into the page
     */
    injectBackButton() {
        // Only inject if not already present
        if (document.querySelector('.back-to-dashboard-container')) {
            return;
        }
        
        // Add CSS to head if not already there
        if (!document.getElementById('back-button-styles')) {
            const styleElement = document.createElement('div');
            styleElement.innerHTML = this.getBackButtonCSS();
            document.head.appendChild(styleElement);
        }
        
        // First, find the navbar element
        const navbar = document.querySelector('nav.navbar');
        
        // If navbar exists, insert back button right after it
        if (navbar) {
            const backButtonElement = document.createElement('div');
            backButtonElement.innerHTML = this.getBackButtonHTML();
            navbar.after(backButtonElement.firstElementChild);
        } else {
            // Fallback: Add before main content if navbar not found
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                const backButtonElement = document.createElement('div');
                backButtonElement.innerHTML = this.getBackButtonHTML();
                mainContent.parentNode.insertBefore(backButtonElement.firstElementChild, mainContent);
            }
        }
        
        // Update the page header structure to maintain consistent layout
        this.updatePageHeading();
    }
    
    /**
     * Update page heading to maintain consistent layout with the back button
     */
    updatePageHeading() {
        // Find the main content container
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        // Find the first heading in the main content
        const mainHeading = mainContent.querySelector('h1');
        if (!mainHeading) return;
        
        // Get the main heading's container (usually a div with mb-4 class)
        const headingContainer = mainHeading.closest('div');
        if (!headingContainer) return;
        
        // Make the main heading invisible in the original location
        // since we're displaying it in the back button container
        mainHeading.classList.add('d-none');
        
        // Find our back button container
        const backButtonContainer = document.querySelector('.back-to-dashboard-container');
        if (!backButtonContainer) return;
        
        // Find the invisible spacer in our back button container
        const spacer = backButtonContainer.querySelector('.invisible');
        if (!spacer) return;
        
        // Replace the spacer text with the actual page heading text
        spacer.textContent = mainHeading.textContent;
        spacer.classList.remove('invisible');
    }
}

// Initialize the back button on page load
document.addEventListener('DOMContentLoaded', () => {
    const backButton = new BackToDashboardButton();
    backButton.init();
});
