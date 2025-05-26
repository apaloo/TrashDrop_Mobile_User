/**
 * TrashDrop Responsive Handler
 * Handles dynamic responsive behavior for optimal UI across all devices
 */

(function() {
  // Track the current display mode and orientation
  let currentDisplayMode = 'browser';
  let currentOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  let lastWindowWidth = window.innerWidth;
  let lastWindowHeight = window.innerHeight;
  
  // Detect display mode (browser, standalone, fullscreen)
  function detectDisplayMode() {
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    } else if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      return 'standalone';
    } else {
      return 'browser';
    }
  }
  
  // Apply dynamic font sizing based on viewport width
  function applyResponsiveFontSize() {
    const minWidth = 320; // iPhone 5 width
    const maxWidth = 1200; // Desktop breakpoint
    const minFontSize = 14;
    const maxFontSize = 18;
    
    const width = window.innerWidth;
    
    // Calculate font size based on viewport width
    // This uses a linear scale between min and max sizes
    if (width <= minWidth) {
      document.documentElement.style.setProperty('--base-font-size', `${minFontSize}px`);
    } else if (width >= maxWidth) {
      document.documentElement.style.setProperty('--base-font-size', `${maxFontSize}px`);
    } else {
      const fontSizeValue = minFontSize + ((width - minWidth) / (maxWidth - minWidth)) * (maxFontSize - minFontSize);
      document.documentElement.style.setProperty('--base-font-size', `${fontSizeValue}px`);
    }
  }
  
  // Adjust layout for software keyboards
  function handleKeyboardAppearance() {
    // Detect potential keyboard appearance on mobile
    const heightDifference = Math.abs(window.innerHeight - lastWindowHeight);
    const isPotentialKeyboard = heightDifference > 150 && window.innerHeight < lastWindowHeight;
    
    if (isPotentialKeyboard) {
      document.body.classList.add('keyboard-open');
      
      // Find the active input element and ensure it's visible
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        // Scroll to the active element with padding
        setTimeout(() => {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } else if (document.body.classList.contains('keyboard-open')) {
      document.body.classList.remove('keyboard-open');
    }
  }
  
  // Apply specific adjustments for device orientation
  function handleOrientationChange() {
    const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    if (newOrientation !== currentOrientation) {
      currentOrientation = newOrientation;
      document.body.setAttribute('data-orientation', currentOrientation);
      
      // Adjust map heights for orientation
      const mapElements = document.querySelectorAll('.map-container, [id$="-map"]');
      mapElements.forEach(map => {
        if (currentOrientation === 'landscape') {
          map.style.height = '250px';
        } else {
          map.style.height = '200px';
        }
      });
      
      // Recalculate height-dependent elements
      adjustContentHeight();
    }
  }
  
  // Adjust content height to prevent overflow and ensure full viewport usage
  function adjustContentHeight() {
    const viewportHeight = window.innerHeight;
    const navbar = document.querySelector('.navbar');
    const mobileNav = document.querySelector('.mobile-nav-bar');
    
    let navbarHeight = navbar ? navbar.offsetHeight : 0;
    let mobileNavHeight = mobileNav ? mobileNav.offsetHeight : 0;
    
    // Calculate available content height
    const availableHeight = viewportHeight - navbarHeight - mobileNavHeight;
    
    // Set the main content minimum height
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.minHeight = `${availableHeight}px`;
    }
    
    // Adjust scrollable containers
    const scrollContainers = document.querySelectorAll('.scrollable-container');
    scrollContainers.forEach(container => {
      // Set max height to a percentage of available height
      container.style.maxHeight = `${availableHeight * 0.7}px`;
    });
  }
  
  // Apply different content for different screen sizes
  function applyResponsiveContent() {
    const screenWidth = window.innerWidth;
    
    // Apply different content based on screen size
    document.querySelectorAll('[data-responsive-content]').forEach(element => {
      const contentOptions = JSON.parse(element.getAttribute('data-responsive-content'));
      
      if (screenWidth < 576 && contentOptions.xs) {
        element.innerHTML = contentOptions.xs;
      } else if (screenWidth < 768 && contentOptions.sm) {
        element.innerHTML = contentOptions.sm;
      } else if (screenWidth < 992 && contentOptions.md) {
        element.innerHTML = contentOptions.md;
      } else if (contentOptions.lg) {
        element.innerHTML = contentOptions.lg;
      }
    });
  }
  
  // Optimizes images based on screen size and pixel density
  function optimizeResponsiveImages() {
    const screenWidth = window.innerWidth;
    const pixelRatio = window.devicePixelRatio || 1;
    
    document.querySelectorAll('img[data-src-template]').forEach(img => {
      const template = img.getAttribute('data-src-template');
      let size;
      
      // Determine appropriate image size
      if (screenWidth < 576) {
        size = 'xs';
      } else if (screenWidth < 768) {
        size = 'sm';
      } else if (screenWidth < 992) {
        size = 'md';
      } else if (screenWidth < 1200) {
        size = 'lg';
      } else {
        size = 'xl';
      }
      
      // Apply high-resolution image for high DPI screens
      const resolution = pixelRatio > 1.5 ? '2x' : '1x';
      
      // Generate the image URL from the template
      const imageUrl = template
        .replace('{size}', size)
        .replace('{resolution}', resolution);
      
      // Only update if different to avoid unnecessary reloads
      if (img.src !== imageUrl) {
        img.src = imageUrl;
      }
    });
  }
  
  // Update all responsive elements
  function updateResponsiveElements() {
    const newDisplayMode = detectDisplayMode();
    
    // Check if display mode changed
    if (newDisplayMode !== currentDisplayMode) {
      currentDisplayMode = newDisplayMode;
      document.body.setAttribute('data-display-mode', currentDisplayMode);
    }
    
    // Apply all responsive adjustments
    applyResponsiveFontSize();
    handleOrientationChange();
    adjustContentHeight();
    applyResponsiveContent();
    handleKeyboardAppearance();
    optimizeResponsiveImages();
    
    // Store current dimensions for comparison
    lastWindowWidth = window.innerWidth;
    lastWindowHeight = window.innerHeight;
  }
  
  // Initialize responsive behavior
  function initializeResponsive() {
    // Set initial values
    document.body.setAttribute('data-display-mode', currentDisplayMode);
    document.body.setAttribute('data-orientation', currentOrientation);
    
    // Apply initial responsive adjustments
    updateResponsiveElements();
    
    // Handle window resize events with debounce
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateResponsiveElements();
      }, 100);
    });
    
    // Handle orientation change events
    window.addEventListener('orientationchange', () => {
      setTimeout(updateResponsiveElements, 200);
    });
    
    // Handle page visibility changes (e.g., returning from another app)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateResponsiveElements();
      }
    });
    
    // Handle input focus for better keyboard handling
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        document.body.classList.add('input-focused');
        
        // On mobile, scroll to the input after a short delay
        if (window.innerWidth < 768) {
          setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      }
    });
    
    document.addEventListener('focusout', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        document.body.classList.remove('input-focused');
      }
    });
  }
  
  // Check if DOM is already loaded
  if (document.readyState !== 'loading') {
    initializeResponsive();
  } else {
    document.addEventListener('DOMContentLoaded', initializeResponsive);
  }
  
  // Make utilities available globally
  window.TrashDropResponsive = {
    refreshUI: updateResponsiveElements,
    adjustContentHeight: adjustContentHeight
  };
})();
