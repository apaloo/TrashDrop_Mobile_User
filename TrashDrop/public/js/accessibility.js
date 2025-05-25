/**
 * TrashDrop Accessibility Enhancement Script
 * Provides improved keyboard navigation, screen reader support, and responsive behavior
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add skip to content link for keyboard users
    addSkipToContentLink();
    
    // Add proper ARIA attributes to interactive elements that might be missing them
    enhanceAriaAttributes();
    
    // Improve focus management, especially after modal interactions
    improveFocusManagement();
    
    // Add screen reader announcements for dynamic content changes
    setupScreenReaderAnnouncements();
    
    // Implement responsive image handling
    setupResponsiveImages();
    
    // Ensure form labels are properly associated with inputs
    fixFormLabelAssociations();
    
    // Add keyboard support for custom UI components
    enhanceKeyboardSupport();
    
    // Set up event listeners for dark mode to ensure proper contrast
    setupDarkModeAccessibility();
    
    // Add responsive table handling
    makeTablesResponsive();
    
    // Add prefers-reduced-motion support
    applyReducedMotionPreferences();
    
    // Initialize accessibility preferences from localStorage
    initializeAccessibilityPreferences();
    
    // Set up event listeners for accessibility toggle controls
    setupAccessibilityControls();
});

/**
 * Add a skip-to-content link at the top of each page for keyboard users
 */
function addSkipToContentLink() {
    // Only add if it doesn't already exist
    if (!document.querySelector('.skip-to-content')) {
        const skipLink = document.createElement('a');
        skipLink.className = 'skip-to-content';
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Find the main content area and add the ID if it doesn't exist
        const mainContent = document.querySelector('main') || 
                           document.querySelector('.container') || 
                           document.querySelector('.content');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main-content';
        }
    }
}

/**
 * Add proper ARIA attributes to interactive elements that might be missing them
 */
function enhanceAriaAttributes() {
    // Add aria-label to buttons that only have icons
    document.querySelectorAll('button:not([aria-label])').forEach(button => {
        if (!button.textContent.trim() && button.querySelector('i, .bi')) {
            const iconClass = button.querySelector('i, .bi').className;
            // Determine button purpose from icon class
            if (iconClass.includes('arrow-left') || iconClass.includes('back')) {
                button.setAttribute('aria-label', 'Go back');
            } else if (iconClass.includes('close')) {
                button.setAttribute('aria-label', 'Close');
            } else if (iconClass.includes('search')) {
                button.setAttribute('aria-label', 'Search');
            } else if (iconClass.includes('camera')) {
                button.setAttribute('aria-label', 'Camera');
            } else if (iconClass.includes('qr')) {
                button.setAttribute('aria-label', 'Scan QR code');
            }
        }
    });
    
    // Add roles to div elements that function as buttons
    document.querySelectorAll('div[onclick]:not([role])').forEach(div => {
        div.setAttribute('role', 'button');
        // Also make sure they're keyboard accessible
        if (!div.getAttribute('tabindex')) {
            div.setAttribute('tabindex', '0');
        }
    });
    
    // Make sure all forms have proper aria attributes
    document.querySelectorAll('form').forEach(form => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.setAttribute('aria-label', 'Submit form');
        }
        
        // Set required inputs correctly
        form.querySelectorAll('[required]').forEach(input => {
            input.setAttribute('aria-required', 'true');
        });
    });
    
    // Ensure all alerts have proper roles
    document.querySelectorAll('.alert').forEach(alert => {
        if (!alert.getAttribute('role')) {
            alert.setAttribute('role', 'alert');
        }
        // For dismissible alerts, make sure close button is accessible
        const closeBtn = alert.querySelector('.btn-close, .close');
        if (closeBtn && !closeBtn.getAttribute('aria-label')) {
            closeBtn.setAttribute('aria-label', 'Close alert');
        }
    });
}

/**
 * Improve focus management, especially after modal interactions
 */
function improveFocusManagement() {
    // Track the element that had focus before a modal was opened
    let lastFocusedElement = null;
    
    // When modals open, save the current focus
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('show.bs.modal', function() {
            lastFocusedElement = document.activeElement;
        });
        
        // When modal closes, restore focus
        modal.addEventListener('hidden.bs.modal', function() {
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        });
        
        // Trap focus within modal when open
        modal.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                const focusableElements = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                // If shift+tab and on first element, move to last element
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
                // If tab and on last element, cycle to first element
                else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    });
}

/**
 * Set up a screen reader announcement area for dynamic content changes
 */
function setupScreenReaderAnnouncements() {
    // Create a visually hidden element for screen reader announcements
    const srAnnounce = document.createElement('div');
    srAnnounce.id = 'sr-announce';
    srAnnounce.className = 'sr-only';
    srAnnounce.setAttribute('aria-live', 'polite');
    document.body.appendChild(srAnnounce);
    
    // Add the global announce function
    window.announceToScreenReader = function(message) {
        document.getElementById('sr-announce').textContent = message;
        // Clear it after 5 seconds to prevent confusion on future page interactions
        setTimeout(() => {
            document.getElementById('sr-announce').textContent = '';
        }, 5000);
    };
    
    // Listen for common dynamic changes that should be announced
    
    // 1. Form submission results
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            // This will be populated by the success or error handler
            // in the form's specific JavaScript
        });
    });
    
    // 2. Scan results
    const scanResult = document.getElementById('scan-result');
    if (scanResult) {
        // Use MutationObserver to detect when scan results appear
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class' && 
                    !scanResult.classList.contains('d-none')) {
                    const batchCode = document.getElementById('result-batch-code');
                    const bagType = document.getElementById('result-bag-type');
                    const points = document.getElementById('result-points');
                    
                    if (batchCode && bagType && points) {
                        announceToScreenReader(
                            `Scan successful. Batch code: ${batchCode.textContent}, 
                             Bag type: ${bagType.textContent}, 
                             Points earned: ${points.textContent}`
                        );
                    }
                }
            });
        });
        
        observer.observe(scanResult, { attributes: true });
    }
    
    // 3. Offline status changes
    const offlineAlert = document.getElementById('offline-alert');
    if (offlineAlert) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (!offlineAlert.classList.contains('d-none')) {
                        announceToScreenReader('You are currently offline. Your actions will be saved locally and synchronized when you reconnect.');
                    } else {
                        announceToScreenReader('You are back online.');
                    }
                }
            });
        });
        
        observer.observe(offlineAlert, { attributes: true });
    }
}

/**
 * Set up responsive image handling to improve performance and accessibility
 */
function setupResponsiveImages() {
    // Add loading="lazy" to images that are below the fold
    document.querySelectorAll('img:not([loading])').forEach(img => {
        // Don't lazy load logos or critical UI elements
        if (!img.classList.contains('logo') && 
            !img.closest('.navbar-brand') && 
            !img.closest('header')) {
            img.setAttribute('loading', 'lazy');
        }
    });
    
    // Ensure all images have alt text
    document.querySelectorAll('img:not([alt])').forEach(img => {
        // Set empty alt for decorative images
        if (img.classList.contains('decorative')) {
            img.setAttribute('alt', '');
        } else {
            // Try to determine a reasonable alt text from context
            const parent = img.parentElement;
            const nearbyHeading = parent.querySelector('h1, h2, h3, h4, h5, h6');
            const nearbyCaption = parent.querySelector('figcaption, .caption');
            
            if (nearbyCaption) {
                img.setAttribute('alt', nearbyCaption.textContent.trim());
            } else if (nearbyHeading) {
                img.setAttribute('alt', nearbyHeading.textContent.trim());
            } else {
                // Default to describing the image location if nothing else is available
                img.setAttribute('alt', 'Image in ' + document.title);
            }
        }
    });
}

/**
 * Ensure form labels are properly associated with inputs
 */
function fixFormLabelAssociations() {
    // Find inputs without associated labels
    document.querySelectorAll('input, select, textarea').forEach(input => {
        const id = input.getAttribute('id');
        if (id) {
            const hasLabel = document.querySelector(`label[for="${id}"]`);
            if (!hasLabel) {
                // Look for nearby text that might be acting as an informal label
                let label = input.previousElementSibling;
                if (label && !label.hasAttribute('for')) {
                    // Make it a proper label
                    label.setAttribute('for', id);
                }
            }
        } else {
            // Input has no ID, so we need to create one
            const newId = 'input-' + Math.random().toString(36).substring(2, 9);
            input.setAttribute('id', newId);
            
            // Look for nearby text that might be acting as an informal label
            let possibleLabel = input.previousElementSibling;
            if (possibleLabel && possibleLabel.tagName !== 'LABEL') {
                // Create a new label element
                const newLabel = document.createElement('label');
                newLabel.setAttribute('for', newId);
                newLabel.textContent = possibleLabel.textContent;
                input.parentNode.insertBefore(newLabel, input);
                possibleLabel.remove();
            }
        }
    });
}

/**
 * Add keyboard support for custom UI components
 */
function enhanceKeyboardSupport() {
    // Make div/span buttons keyboard accessible
    document.querySelectorAll('[role="button"]:not(button)').forEach(element => {
        if (!element.getAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }
        
        element.addEventListener('keydown', function(e) {
            // Trigger click on Enter or Space
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                element.click();
            }
        });
    });
    
    // Add keyboard navigation for tab-like interfaces
    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        
        tablist.addEventListener('keydown', function(e) {
            // Find the index of the current tab
            const currentTab = document.activeElement;
            const currentIndex = tabs.indexOf(currentTab);
            
            if (currentIndex !== -1) {
                let nextIndex;
                
                // Arrow keys to navigate between tabs
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    e.preventDefault();
                } else if (e.key === 'Home') {
                    nextIndex = 0;
                    e.preventDefault();
                } else if (e.key === 'End') {
                    nextIndex = tabs.length - 1;
                    e.preventDefault();
                }
                
                if (nextIndex !== undefined) {
                    tabs[nextIndex].focus();
                    tabs[nextIndex].click();
                }
            }
        });
    });
}

/**
 * Set up event listeners for dark mode to ensure proper contrast
 */
function setupDarkModeAccessibility() {
    // Observe body class changes to detect dark mode
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                const darkModeEnabled = document.body.classList.contains('dark-mode');
                adjustContrastForDarkMode(darkModeEnabled);
            }
        });
    });
    
    observer.observe(document.body, { attributes: true });
    
    // Initial check
    if (document.body.classList.contains('dark-mode')) {
        adjustContrastForDarkMode(true);
    }
}

/**
 * Adjust contrast for elements when dark mode is enabled/disabled
 */
function adjustContrastForDarkMode(isDarkMode) {
    if (isDarkMode) {
        // Ensure sufficient contrast in dark mode
        document.querySelectorAll('.text-muted').forEach(el => {
            // Make muted text more visible in dark mode
            el.style.color = '#b2b2b2';
        });
        
        // Fix any light badges that may not have enough contrast in dark mode
        document.querySelectorAll('.badge.bg-light').forEach(badge => {
            badge.classList.remove('bg-light');
            badge.classList.add('bg-dark');
        });
    } else {
        // Reset modifications when returning to light mode
        document.querySelectorAll('.text-muted').forEach(el => {
            el.style.color = '';
        });
        
        // Restore badges
        document.querySelectorAll('.badge.bg-dark').forEach(badge => {
            if (badge.dataset.originalClass === 'bg-light') {
                badge.classList.remove('bg-dark');
                badge.classList.add('bg-light');
            }
        });
    }
}

/**
 * Make tables responsive and accessible
 */
function makeTablesResponsive() {
    document.querySelectorAll('table:not(.table-responsive)').forEach(table => {
        // Add responsive wrapper if not already present
        if (!table.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
        
        // Ensure tables have proper scope attributes for headers
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
            if (!header.getAttribute('scope')) {
                const isInThead = header.closest('thead');
                const isFirstCell = Array.from(header.parentElement.children).indexOf(header) === 0;
                
                if (isInThead) {
                    header.setAttribute('scope', 'col');
                } else if (isFirstCell) {
                    header.setAttribute('scope', 'row');
                }
            }
        });
    });
}

/**
 * Apply user's motion preferences to reduce animations
 */
function applyReducedMotionPreferences() {
    // Check system preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const userPreference = localStorage.getItem('reduceMotion') === 'true';
    
    // Apply if either system preference or user preference is set
    if (prefersReducedMotion || userPreference) {
        document.documentElement.classList.add('reduced-motion');
        
        // Disable all CSS transitions and animations
        const style = document.createElement('style');
        style.innerHTML = '*, *::before, *::after { animation-duration: 0.001s !important; transition-duration: 0.001s !important; }';
        document.head.appendChild(style);
        
        // If we have the preference toggle, update it
        const reduceMotionToggle = document.getElementById('reduce_motion');
        if (reduceMotionToggle) {
            reduceMotionToggle.checked = true;
        }
    }
}

/**
 * Initialize accessibility preferences from localStorage
 */
function initializeAccessibilityPreferences() {
    // High contrast mode
    if (localStorage.getItem('highContrast') === 'true') {
        document.documentElement.classList.add('high-contrast');
        // Update toggle if it exists
        const highContrastToggle = document.getElementById('high_contrast');
        if (highContrastToggle) {
            highContrastToggle.checked = true;
        }
    }
    
    // Larger text mode
    if (localStorage.getItem('largeText') === 'true') {
        document.documentElement.classList.add('large-text');
        document.body.style.fontSize = '1.2rem';
        // Update toggle if it exists
        const largeTextToggle = document.getElementById('large_text');
        if (largeTextToggle) {
            largeTextToggle.checked = true;
        }
    }
    
    // Reduced motion (handled in applyReducedMotionPreferences)
}

/**
 * Set up event listeners for accessibility toggle controls
 */
function setupAccessibilityControls() {
    // High contrast mode toggle
    const highContrastToggle = document.getElementById('high_contrast');
    if (highContrastToggle) {
        highContrastToggle.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.classList.add('high-contrast');
                localStorage.setItem('highContrast', 'true');
                announceToScreenReader('High contrast mode enabled');
            } else {
                document.documentElement.classList.remove('high-contrast');
                localStorage.setItem('highContrast', 'false');
                announceToScreenReader('High contrast mode disabled');
            }
        });
    }
    
    // Larger text toggle
    const largeTextToggle = document.getElementById('large_text');
    if (largeTextToggle) {
        largeTextToggle.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.classList.add('large-text');
                document.body.style.fontSize = '1.2rem';
                localStorage.setItem('largeText', 'true');
                announceToScreenReader('Larger text mode enabled');
            } else {
                document.documentElement.classList.remove('large-text');
                document.body.style.fontSize = '';
                localStorage.setItem('largeText', 'false');
                announceToScreenReader('Larger text mode disabled');
            }
        });
    }
    
    // Reduced motion toggle
    const reduceMotionToggle = document.getElementById('reduce_motion');
    if (reduceMotionToggle) {
        reduceMotionToggle.addEventListener('change', function() {
            if (this.checked) {
                document.documentElement.classList.add('reduced-motion');
                const style = document.createElement('style');
                style.id = 'reduced-motion-style';
                style.innerHTML = '*, *::before, *::after { animation-duration: 0.001s !important; transition-duration: 0.001s !important; }';
                document.head.appendChild(style);
                localStorage.setItem('reduceMotion', 'true');
                announceToScreenReader('Reduced motion mode enabled');
            } else {
                document.documentElement.classList.remove('reduced-motion');
                const style = document.getElementById('reduced-motion-style');
                if (style) style.remove();
                localStorage.setItem('reduceMotion', 'false');
                announceToScreenReader('Reduced motion mode disabled');
            }
        });
    }
}

// The primary applyReducedMotionPreferences function is defined above
