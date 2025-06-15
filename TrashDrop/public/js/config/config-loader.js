/**
 * TrashDrop Configuration Loader
 * 
 * This script provides visual feedback during configuration loading
 * to ensure a smooth user experience when the app is initializing.
 * 
 * @version 1.0.1
 * @author TrashDrop Engineering
 */

// Use IIFE pattern to prevent global namespace pollution and redeclaration issues
(function(window) {
  // Exit early if ConfigLoader is already defined - prevents redeclaration errors
  if (window.ConfigLoader && typeof window.ConfigLoader.show === 'function') {
    console.log('[ConfigLoader] Already initialized, skipping definition');
    return;
  }

  // Define ConfigLoader class
  class ConfigLoader {
    /**
     * Constructor - initialize with configuration
     * @param {Object} options - Initialization options
     */
    constructor(options = {}) {
        this.options = {
            containerId: 'config-loader-container',
            fadeOutDuration: 500,
            minDisplayTime: 800,
            showSpinner: true,
            spinnerColor: '#4CAF50',
            text: 'Loading application...',
            zIndex: 9999,
            ...options
        };
        
        this.isLoading = false;
        this.container = null;
        this.startTime = null;
        
        // Create elements on instantiation
        this._createElements();
        
        // Bind methods
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this._handleConfigLoaded = this._handleConfigLoaded.bind(this);
        this._handleConfigError = this._handleConfigError.bind(this);
        
        // Register events if AppConfig is available and supports events
        if (window.AppConfig && typeof window.AppConfig.on === 'function') {
            window.AppConfig.on('configloading', this.show);
            window.AppConfig.on('configloaded', this._handleConfigLoaded);
            window.AppConfig.on('configerror', this._handleConfigError);
        }
    }
    
    /**
     * Create the loader elements
     * @private
     */
    _createElements() {
        // Safety check - if document or window isn't available yet, we can't proceed
        if (typeof document === 'undefined' || typeof window === 'undefined') {
            console.warn('[ConfigLoader] Document or window not available - deferring element creation');
            // Try again later when globals should be available
            setTimeout(() => this._createElements(), 50);
            return;
        }
        
        try {
            // Create container if it doesn't exist
            let container = document.getElementById(this.options.containerId);
            
            if (!container) {
                container = document.createElement('div');
                container.id = this.options.containerId;
                
                // Check if document.body exists - it might not if script runs before body is parsed
                if (document.body) {
                    document.body.appendChild(container);
                } else {
                    // Defer creation until body is available
                    console.log('[ConfigLoader] Deferring container creation until DOM is ready');
                    const readyStateHandler = () => {
                        if (document.readyState === 'interactive' || document.readyState === 'complete') {
                            document.removeEventListener('readystatechange', readyStateHandler);
                            if (document.body) {
                                document.body.appendChild(container);
                                this._styleContainer(container); // Style after appending
                                this.container = container;
                            } else {
                                console.error('[ConfigLoader] Document body still not available after DOM ready');
                            }
                        }
                    };
                    
                    document.addEventListener('readystatechange', readyStateHandler);
                    document.addEventListener('DOMContentLoaded', () => {
                        if (document.body && !document.body.contains(container)) {
                            document.body.appendChild(container);
                            this._styleContainer(container); // Style after appending
                            this.container = container;
                        }
                    });
                    return; // Exit early, we'll complete setup when body is available
                }
            }
            
            this._styleContainer(container);
            this.container = container;
        } catch (error) {
            console.error('[ConfigLoader] Error creating elements:', error);
        }
    }
    
    /**
     * Apply styles to the container element
     * @param {HTMLElement} container - The container to style
     * @private
     */
    _styleContainer(container) {
        if (!container) return;
        
        try {
            // Style the container
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            container.style.zIndex = this.options.zIndex;
            container.style.opacity = '0';
            container.style.transition = `opacity ${this.options.fadeOutDuration}ms ease-in-out`;
            container.style.pointerEvents = 'none';
            
            // Check for dark mode
            if (document.documentElement.getAttribute('data-bs-theme') === 'dark' || 
                document.body.classList.contains('dark-mode')) {
                container.style.backgroundColor = 'rgba(33, 37, 41, 0.9)';
                container.style.color = '#fff';
            }
            
            // Clear existing content
            container.innerHTML = '';
            
            // Create spinner if needed
            if (this.options.showSpinner) {
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                spinner.style.width = '48px';
                spinner.style.height = '48px';
                spinner.style.border = `4px solid rgba(0, 0, 0, 0.1)`;
                spinner.style.borderRadius = '50%';
                spinner.style.borderTopColor = this.options.spinnerColor;
                spinner.style.animation = 'spin 1s linear infinite';
                container.appendChild(spinner);
                
                // Add keyframes for spinner animation if not already present
                if (!document.getElementById('loader-keyframes')) {
                    const style = document.createElement('style');
                    style.id = 'loader-keyframes';
                    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
                    document.head.appendChild(style);
                }
            }
            
            // Create text element
            const text = document.createElement('p');
            text.textContent = this.options.text;
            text.style.marginTop = '16px';
            text.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
            text.style.fontSize = '16px';
            container.appendChild(text);
            
            this.container = container;
        } catch (error) {
            console.error('[ConfigLoader] Error styling container:', error);
        }
    }
    
    /**
     * Show the loading indicator
     */
    show() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.startTime = Date.now();
        
        // Only proceed if the DOM is ready
        if (document.readyState === 'loading') {
            // Wait for DOM to be ready before proceeding
            document.addEventListener('DOMContentLoaded', () => {
                // Re-attempt show when DOM is ready
                this.isLoading = false;
                this.show();
            });
            return;
        }
        
        // Make sure the container exists and create it if needed
        if (!this.container) {
            this._createElements();
        }
        
        // Safety check: if container couldn't be created or body isn't available
        if (!this.container || !document.body) {
            console.warn('[ConfigLoader] Container or document.body not available');
            // Schedule a retry with a slight delay
            setTimeout(() => {
                this.isLoading = false;
                this.show();
            }, 50);
            return;
        }
        
        try {
            // Ensure the container is in the DOM
            if (!document.body.contains(this.container)) {
                document.body.appendChild(this.container);
            }
            
            // Show the container
            this.container.style.display = 'flex';
            this.container.style.pointerEvents = 'auto';
            
            // Trigger reflow before setting opacity for transition to work
            void this.container.offsetWidth;
            this.container.style.opacity = '1';
        } catch (e) {
            console.error('[ConfigLoader] Error showing loader:', e);
            // Reset loading state
            this.isLoading = false;
        }
    }
    
    /**
     * Hide the loading indicator
     */
    hide() {
        if (!this.isLoading) return;
        
        // Ensure the container exists before trying to hide it
        if (!this.container) {
            console.warn('[ConfigLoader] Container is null in hide() method');
            this.isLoading = false;
            return;
        }
        
        // Safety check for document body
        if (!document.body) {
            console.warn('[ConfigLoader] Document body not available in hide() method');
            this.isLoading = false;
            return;
        }
        
        try {
            const elapsedTime = Date.now() - this.startTime;
            const remainingTime = Math.max(0, this.options.minDisplayTime - elapsedTime);
            
            // Ensure the loader is displayed for a minimum amount of time
            setTimeout(() => {
                try {
                    // Double check the container still exists before accessing its properties
                    if (this.container && document.body && document.body.contains(this.container)) {
                        this.container.style.opacity = '0';
                        this.container.style.pointerEvents = 'none';
                    }
                    
                    setTimeout(() => {
                        this.isLoading = false;
                    }, this.options.fadeOutDuration);
                } catch (e) {
                    console.error('[ConfigLoader] Error during hide transition:', e);
                    this.isLoading = false;
                }
            }, remainingTime);
        } catch (e) {
            console.error('[ConfigLoader] Error hiding loader:', e);
            // Reset loading state
            this.isLoading = false;
        }
    }
    
    /**
     * Update the loader text
     * @param {string} text - New text to display
     */
    updateText(text) {
        if (this.container) {
            const textElement = this.container.querySelector('p');
            if (textElement) {
                textElement.textContent = text;
            }
        }
    }
    
    /**
     * Handle configuration loaded event
     * @param {Object} data - Event data
     * @private
     */
    _handleConfigLoaded(data) {
        this.updateText('Configuration loaded successfully');
        this.hide();
    }
    
    /**
     * Handle configuration error event
     * @param {Object} data - Event data containing error
     * @private
     */
    _handleConfigError(data) {
        this.updateText(`Configuration error: ${data.error.message || 'Unknown error'}`);
        
        // Still hide after a delay, but with a longer display time
        setTimeout(() => this.hide(), 2000);
    }
}

// Create and export singleton instance
const configLoader = new ConfigLoader();

// Auto-show on page load if AppConfig exists but is not yet fully initialized
if (window.AppConfig && window.AppConfig.initialized === false) {
    configLoader.show();
}

// Make globally available
window.ConfigLoader = configLoader;

// Export the ConfigLoader class for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConfigLoader: window.ConfigLoader };
}

// Close the if statement that prevents redeclaration
})(window); // End IIFE

// Auto-initialize on script load - safely check for document body first
document.addEventListener('DOMContentLoaded', () => {
    // If document body is null, this could cause errors
    if (!document.body) {
        console.warn('[ConfigLoader] Document body is not available');
        return;
    }
    
    // Only show if AppConfig exists but isn't initialized yet
    if (window.AppConfig && window.AppConfig.initialized === false && window.ConfigLoader) {
        window.ConfigLoader.show();
    }
});
