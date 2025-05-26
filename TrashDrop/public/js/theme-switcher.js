/**
 * TrashDrop Theme Switcher (Enhanced Version)
 * Provides consistent and robust dark mode functionality across all pages
 * @version 2.0.0
 */

// Create the ThemeSwitcher as an IIFE to avoid global namespace pollution
window.ThemeSwitcher = (function() {
  // Constants
  const THEME_STORAGE_KEY = 'trashdrop-theme-preference';
  const DATA_THEME_ATTR = 'data-theme';
  const SYSTEM_THEME = 'system';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';
  const THEME_TRANSITION_CLASS = 'theme-transition';
  
  // Early theme application to prevent flash
  function earlyThemeSetup() {
    // Get saved theme preference
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || SYSTEM_THEME;
    let isDarkTheme = false;
    
    // Apply the right theme
    if (savedTheme === SYSTEM_THEME) {
      // Use system preference
      isDarkTheme = window.matchMedia && 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      // Use explicit preference
      isDarkTheme = savedTheme === DARK_THEME;
    }
    
    // Apply to HTML element right away to prevent flash
    document.documentElement.setAttribute(DATA_THEME_ATTR, isDarkTheme ? DARK_THEME : LIGHT_THEME);
  }
  
  // Run early setup immediately
  earlyThemeSetup();
  
  // State
  let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || SYSTEM_THEME;
  let isCurrentlyDark = document.documentElement.getAttribute(DATA_THEME_ATTR) === DARK_THEME;
  let mutationObserver = null;
  
  /**
   * Initialize the theme switcher
   */
  function init() {
    console.log('ThemeSwitcher: Initializing enhanced version');
    
    // Apply theme transition class after initial load to prevent initial flash
    setTimeout(() => {
      document.documentElement.classList.add(THEME_TRANSITION_CLASS);
    }, 100);
    
    // Apply the theme to ensure consistency
    applyTheme();
    
    // Set up event listeners for theme toggle buttons
    setupEventListeners();
    
    // Watch for DOM changes and set up new toggle buttons
    setupMutationObserver();
    
    // Listen for system preference changes
    setupSystemThemeListener();
    
    // Update UI to reflect current theme
    updateThemeUI();
    
    // Set up sync across tabs
    setupStorageListener();
    
    // Add a safety check that runs periodically to ensure themes are consistent
    setInterval(validateThemeConsistency, 2000);
  }
  
  /**
   * Set up storage event listener to sync theme across tabs
   */
  function setupStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        currentTheme = event.newValue || SYSTEM_THEME;
        applyTheme();
        updateThemeUI();
      }
    });
  }
  
  /**
   * Set up mutation observer to watch for new toggle buttons added to the DOM
   */
  function setupMutationObserver() {
    if (!window.MutationObserver) return;
    
    mutationObserver = new MutationObserver((mutations) => {
      let shouldCheckForButtons = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          shouldCheckForButtons = true;
          break;
        }
      }
      
      if (shouldCheckForButtons) {
        attachToggleListeners();
      }
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * Set up listener for system theme preference changes
   */
  function setupSystemThemeListener() {
    if (window.matchMedia) {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Apply initial state if using system theme
      if (currentTheme === SYSTEM_THEME) {
        isCurrentlyDark = darkModeMediaQuery.matches;
        applyThemeClasses();
      }
      
      // Standard method for modern browsers
      try {
        darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
      } catch (error1) {
        try {
          // Fallback for Safari and older browsers
          darkModeMediaQuery.addListener(handleSystemThemeChange);
        } catch (error2) {
          console.error('ThemeSwitcher: Could not add media query listener', error2);
        }
      }
    }
  }
  
  /**
   * Handle system theme preference changes
   */
  function handleSystemThemeChange(e) {
    if (currentTheme === SYSTEM_THEME) {
      isCurrentlyDark = e.matches;
      applyThemeClasses();
      updateThemeUI();
    }
  }
  
  /**
   * Set up event listeners for theme toggle buttons
   */
  function setupEventListeners() {
    // Handle toggle buttons when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        attachToggleListeners();
      });
    } else {
      attachToggleListeners();
    }
    
    // Listen for clicks on the document to catch delegated events
    document.addEventListener('click', (e) => {
      // Find closest toggle button if any
      const toggleButton = e.target.closest('[data-theme-toggle="true"]');
      if (toggleButton) {
        e.preventDefault();
        toggleTheme();
      }
    });
  }
  
  /**
   * Attach click listeners to all theme toggle buttons
   */
  function attachToggleListeners() {
    // Find all toggle buttons by ID and data attribute
    const toggleButtons = document.querySelectorAll(
      '#toggle-theme, #toggle-theme-mobile, [data-theme-toggle="true"]'
    );
    
    toggleButtons.forEach(button => {
      if (button && !button.hasAttribute('data-theme-listener')) {
        button.setAttribute('data-theme-listener', 'true');
        button.setAttribute('data-theme-toggle', 'true');
        button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          toggleTheme();
        });
      }
    });
  }
  
  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    console.log('ThemeSwitcher: Toggling theme');
    
    // Determine the new theme
    if (currentTheme === SYSTEM_THEME) {
      // If using system theme, explicitly switch to opposite of current
      currentTheme = isCurrentlyDark ? LIGHT_THEME : DARK_THEME;
    } else if (currentTheme === DARK_THEME) {
      currentTheme = LIGHT_THEME;
    } else {
      currentTheme = DARK_THEME;
    }
    
    // Save the preference
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    
    // Apply the theme
    applyTheme();
    
    // Update UI to reflect new theme
    updateThemeUI();
    
    // Dispatch event for other scripts that might need to react
    document.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme: currentTheme, isDark: isCurrentlyDark } 
    }));
  }
  
  /**
   * Apply the current theme to the document
   */
  function applyTheme() {
    // Determine if we should use dark theme
    if (currentTheme === SYSTEM_THEME) {
      // Use system preference
      isCurrentlyDark = window.matchMedia && 
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      // Use explicit preference
      isCurrentlyDark = currentTheme === DARK_THEME;
    }
    
    // Apply appropriate classes
    applyThemeClasses();
  }
  
  /**
   * Apply the appropriate theme attribute based on current state
   */
  function applyThemeClasses() {
    const newThemeValue = isCurrentlyDark ? DARK_THEME : LIGHT_THEME;
    
    // Set on documentElement (preferred method using data-theme)
    document.documentElement.setAttribute(DATA_THEME_ATTR, newThemeValue);
    
    // Also set the class-based approach for backward compatibility
    if (isCurrentlyDark) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
    
    // Also update meta theme-color for mobile browsers
    updateMetaThemeColor(newThemeValue);
  }
  
  /**
   * Update the meta theme-color for mobile browsers
   */
  function updateMetaThemeColor(theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        theme === DARK_THEME ? '#121212' : '#4CAF50'
      );
    }
  }
  
  /**
   * Update UI elements to reflect current theme
   */
  function updateThemeUI() {
    // Get current state
    const isDark = isCurrentlyDark;
    
    // Update all toggle buttons
    const toggleButtons = document.querySelectorAll(
      '#toggle-theme, #toggle-theme-mobile, [data-theme-toggle="true"]'
    );
    
    toggleButtons.forEach(button => {
      if (!button) return;
      
      // Update icon if present
      const icon = button.querySelector('i.bi');
      if (icon) {
        if (isDark) {
          // Using light/sun icon when dark mode is active (to show what will happen on click)
          if (icon.classList.contains('bi-moon')) {
            icon.classList.remove('bi-moon');
            icon.classList.add('bi-sun');
          }
        } else {
          // Using dark/moon icon when light mode is active
          if (icon.classList.contains('bi-sun')) {
            icon.classList.remove('bi-sun');
            icon.classList.add('bi-moon');
          }
        }
      }
      
      // Update text content if present
      const textNode = Array.from(button.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      
      if (textNode) {
        const newText = isDark ? 'Light Mode' : 'Dark Mode';
        if (textNode.textContent.includes('Dark Mode') || 
            textNode.textContent.includes('Light Mode')) {
          textNode.textContent = textNode.textContent
            .replace(/Dark Mode|Light Mode/i, newText);
        }
      } else if (button.textContent && 
               (button.textContent.includes('Dark Mode') || 
                button.textContent.includes('Light Mode'))) {
        button.textContent = button.textContent
          .replace(/Dark Mode|Light Mode/i, isDark ? 'Light Mode' : 'Dark Mode');
      }
      
      // Update aria-label
      button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  
  /**
   * Validate theme consistency to prevent bugs
   */
  function validateThemeConsistency() {
    const htmlTheme = document.documentElement.getAttribute(DATA_THEME_ATTR);
    const expectedTheme = isCurrentlyDark ? DARK_THEME : LIGHT_THEME;
    
    // If there's a mismatch, reapply theme
    if (htmlTheme !== expectedTheme) {
      console.warn('ThemeSwitcher: Detected theme inconsistency, fixing...');
      applyThemeClasses();
      updateThemeUI();
    }
  }
  
  /**
   * Set theme explicitly
   */
  function setTheme(theme) {
    if (![LIGHT_THEME, DARK_THEME, SYSTEM_THEME].includes(theme)) {
      console.error('ThemeSwitcher: Invalid theme', theme);
      return;
    }
    
    currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme();
    updateThemeUI();
  }
  
  /**
   * Get the current theme
   */
  function getTheme() {
    return {
      preference: currentTheme,
      isDark: isCurrentlyDark,
      actualTheme: isCurrentlyDark ? DARK_THEME : LIGHT_THEME
    };
  }
  
  /**
   * Clean up resources
   */
  function cleanup() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
  }
  
  // Public API
  return {
    init,
    toggleTheme,
    getTheme,
    setTheme,
    applyTheme,
    cleanup
  };
})();

// Initialize the theme switcher when the script loads
window.ThemeSwitcher.init();
