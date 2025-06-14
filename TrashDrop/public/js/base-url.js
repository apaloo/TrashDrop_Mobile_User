/**
 * Base URL Utility
 * Ensures consistent URL handling across the TrashDrop application
 * This script should be included before any other scripts that need URL handling
 */

// Initialize baseUrl as a global variable that other scripts can use
window.baseUrl = '';
window.preferredProtocol = 'http:';

// Detect if the browser is Safari
function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// Function to determine the correct base URL based on how the page is being accessed
function initializeBaseUrl() {
  const currentProtocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port || (currentProtocol === 'https:' ? '443' : '80');
  
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
    
    // If we're accessing via IP without port specified but need port 3000
    if ((hostname === '127.0.0.1' || hostname === 'localhost') && (port === '80' || port === '443')) {
      window.baseUrl = `http://${hostname}:3000`;
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

// Initialize the base URL when the script loads
initializeBaseUrl();

// Set up Safari-specific workarounds after DOM is loaded
document.addEventListener('DOMContentLoaded', setupSafariWorkarounds);

// Create a global BaseUrlHandler object for consistent access patterns
window.BaseUrlHandler = {
    // Get the base URL with appropriate protocol and port
    getBaseUrl: function() {
        return window.baseUrl || '';
    },
    
    // Get the preferred protocol
    getProtocol: function() {
        return window.preferredProtocol || 'http:';
    },
    
    // Format a URL with the correct base
    formatUrl: function(path) {
        if (!path) return this.getBaseUrl();
        // Handle absolute URLs
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        // Make sure the path starts with a slash
        const formattedPath = path.startsWith('/') ? path : '/' + path;
        return this.getBaseUrl() + formattedPath;
    },
    
    // Check if we're on a mobile device
    isMobileDevice: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Check if we're running on ngrok
    isNgrokDomain: function() {
        return window.location.hostname.includes('ngrok-free.app');
    },
    
    // Fix a specific URL element like a link or form
    fixUrlElement: function(element, attributeName = 'href') {
        if (!element) return;
        const originalUrl = element.getAttribute(attributeName);
        if (originalUrl && originalUrl.startsWith('/') && 
            !originalUrl.startsWith('/#') && 
            !originalUrl.startsWith('javascript:')) {
            element.setAttribute(attributeName, this.formatUrl(originalUrl));
        }
    }
};

// Expose individual functions globally for backward compatibility
window.initializeBaseUrl = initializeBaseUrl;
window.fixNavigationLinks = fixNavigationLinks;
window.fixFormActions = fixFormActions;
window.isSafari = isSafari;

// Expose getBaseUrl function for backward compatibility
window.getBaseUrl = function() {
    return window.baseUrl || '';
};
