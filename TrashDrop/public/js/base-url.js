/**
 * Base URL Utility
 * Ensures consistent URL handling across the TrashDrop application
 * Integrates with AppConfig for centralized configuration management
 * 
 * @version 2.0.0
 * @author TrashDrop Engineering
 */

// Initialize baseUrl as a global variable that other scripts can use
window.baseUrl = '';
window.preferredProtocol = 'http:';

/**
 * Detect if the browser is Safari
 * @returns {boolean} True if the browser is Safari
 */
function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Function to determine the correct base URL based on how the page is being accessed
 * It integrates with AppConfig when available for configuration consistency
 */
async function initializeBaseUrl() {
  const currentProtocol = window.location.protocol;
  const hostname = window.location.hostname;
  let port = window.location.port || (currentProtocol === 'https:' ? '443' : '80');
  let serverPort = port;
  let isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('ngrok');
  
  // Use AppConfig if available to get server port and environment settings
  if (window.AppConfig) {
    try {
      const config = await window.AppConfig.initialize();
      serverPort = config.server?.port || '3000';
      isDevelopment = config.app?.environment === 'development';
      
      console.log('BaseUrlHandler initialized with AppConfig');
    } catch (error) {
      console.warn('BaseUrlHandler could not initialize with AppConfig, using default values', error);
    }
  }
  
  // Force HTTP for localhost and 127.0.0.1 in all browsers to avoid HTTPS connection issues
  // Safari particularly has issues with HTTPS on localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    window.preferredProtocol = 'http:';
    
    // If we're currently on HTTPS, we need to redirect to HTTP
    if (currentProtocol === 'https:') {
      const newUrl = `http://${hostname}${port !== '443' && port !== '80' ? ':' + port : ''}${window.location.pathname}${window.location.search}`;
      console.log(`Redirecting from ${window.location.href} to ${newUrl} to avoid HTTPS connection issues`);
      window.location.href = newUrl;
      return;
    }
    
    // If we're accessing via IP without port specified but need port 3000 (or configured server port)
    if ((hostname === '127.0.0.1' || hostname === 'localhost') && (port === '80' || port === '443')) {
      window.baseUrl = `http://${hostname}:${serverPort}`;
    } else {
      window.baseUrl = `http://${hostname}${port !== '80' ? ':' + port : ''}`;
    }
  } else {
    // For all other hostnames, use the current protocol and origin
    window.preferredProtocol = currentProtocol;
    window.baseUrl = window.location.origin;
  }
  
  console.log(`Base URL initialized: ${window.baseUrl} (Protocol: ${window.preferredProtocol})`);

  // Update all navigation links that start with '/' once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixNavigationLinks);
  } else {
    // DOM already loaded, fix links immediately
    fixNavigationLinks();
  }
  
  // Also fix form actions to use the correct base URL
  document.addEventListener('DOMContentLoaded', fixFormActions);
  
  // Register for AppConfig updates if available
  if (window.AppConfig) {
    window.AppConfig.on('configloaded', handleConfigUpdate);
  }
}

// Function to fix navigation links by prepending the baseUrl
function fixNavigationLinks() {
  // Find all links starting with '/' (relative to root)
  const links = document.querySelectorAll('a[href^="/"]');
  links.forEach(link => {
    // Don't modify anchor links or javascript: links
    if (!link.getAttribute('href').startsWith('/#') && 
        !link.getAttribute('href').startsWith('javascript:')) {
      const href = link.getAttribute('href');
      link.setAttribute('href', window.baseUrl + href);
      console.log(`Fixed link: ${href} → ${window.baseUrl + href}`);
    }
  });
}

// Function to fix form actions
function fixFormActions() {
  const forms = document.querySelectorAll('form[action^="/"]');
  forms.forEach(form => {
    const action = form.getAttribute('action');
    form.setAttribute('action', window.baseUrl + action);
    console.log(`Fixed form action: ${action} → ${window.baseUrl + action}`);
  });
}

// Special handling for Safari
function setupSafariWorkarounds() {
  if (isSafari()) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // For Safari, we'll use our alternative route for login
      const loginLinks = document.querySelectorAll('a[href$="/login"]');
      loginLinks.forEach(link => {
        link.setAttribute('href', window.baseUrl + '/account-access');
        console.log('Redirecting login link to /account-access for Safari compatibility');
      });
    }
  }
}

// Initialize the base URL when the script loads - use an IIFE for async support
(async function() {
    try {
        await initializeBaseUrl();
    } catch (error) {
        console.error('Error initializing base URL:', error);
        // Fall back to synchronous initialization if async fails
        window.baseUrl = window.location.origin;
        window.preferredProtocol = window.location.protocol;
    }
})();

// Set up Safari-specific workarounds after DOM is loaded
document.addEventListener('DOMContentLoaded', setupSafariWorkarounds);

/**
 * Handle configuration updates from AppConfig
 * @param {Object} data - Event data containing config
 */
function handleConfigUpdate(data) {
  // No need to completely reinitialize, just use this opportunity to fix any links
  // that might have been added to the DOM after our initial run
  fixNavigationLinks();
  fixFormActions();
  
  console.log('BaseUrlHandler refreshed after config update');
}

// Create a global BaseUrlHandler object for consistent access patterns
window.BaseUrlHandler = {
    /**
     * Get the base URL with appropriate protocol and port
     * @returns {string} The base URL
     */
    getBaseUrl: function() {
        return window.baseUrl || '';
    },
    
    /**
     * Get the preferred protocol
     * @returns {string} The preferred protocol
     */
    getProtocol: function() {
        return window.preferredProtocol || 'http:';
    },
    
    /**
     * Format a URL with the correct base
     * @param {string} path - The path to format
     * @returns {string} The formatted URL
     */
    formatUrl: function(path) {
        if (!path) return this.getBaseUrl();
        // Handle absolute URLs
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        // Check if the path is an API endpoint and we have a config with API endpoint base
        if (window.AppConfig && path.startsWith('/api/') && window.AppConfig.get('api.baseUrl')) {
            return window.AppConfig.get('api.baseUrl') + path.substring(4); // Remove /api prefix
        }
        // Make sure the path starts with a slash
        const formattedPath = path.startsWith('/') ? path : '/' + path;
        return this.getBaseUrl() + formattedPath;
    },
    
    /**
     * Get the full URL for a named route from AppConfig
     * @param {string} routeName - The route name (e.g., 'login', 'dashboard')
     * @returns {string} The formatted URL or null if not found
     */
    getRouteUrl: function(routeName) {
        if (window.AppConfig && window.AppConfig.get(`routes.${routeName}`)) {
            return this.formatUrl(window.AppConfig.get(`routes.${routeName}`));
        }
        return null;
    },
    
    /**
     * Check if we're on a mobile device
     * @returns {boolean} True if on a mobile device
     */
    isMobileDevice: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    /**
     * Check if we're running on ngrok
     * @returns {boolean} True if running on ngrok
     */
    isNgrokDomain: function() {
        return window.location.hostname.includes('ngrok-free.app') || window.location.hostname.includes('ngrok.io');
    },
    
    /**
     * Check if we're in development mode
     * @returns {boolean} True if in development mode
     */
    isDevelopmentMode: function() {
        if (window.AppConfig) {
            return window.AppConfig.get('app.environment') === 'development';
        }
        return this.isNgrokDomain() || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },
    
    /**
     * Fix a specific URL element like a link or form
     * @param {Element} element - The DOM element to fix
     * @param {string} attributeName - The attribute name to fix
     */
    fixUrlElement: function(element, attributeName = 'href') {
        if (!element) return;
        const originalUrl = element.getAttribute(attributeName);
        if (originalUrl && originalUrl.startsWith('/') && 
            !originalUrl.startsWith('/#') && 
            !originalUrl.startsWith('javascript:')) {
            element.setAttribute(attributeName, this.formatUrl(originalUrl));
        }
    },
    
    /**
     * Refresh all URL handlers after a configuration change
     */
    refresh: function() {
        fixNavigationLinks();
        fixFormActions();
    }
};

// Export the module for modern JS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BaseUrlHandler: window.BaseUrlHandler,
        getBaseUrl: window.getBaseUrl,
        initializeBaseUrl,
        fixNavigationLinks,
        fixFormActions,
        isSafari
    };
}
