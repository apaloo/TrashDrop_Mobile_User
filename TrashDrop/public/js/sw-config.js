/**
 * Service Worker Configuration
 * This file provides dynamic configuration for the service worker
 */

// Create a self-executing function to avoid global scope pollution
(function() {
  // Initialize config only if AppConfig is available
  if (window.AppConfig) {
    // Create a SW config object
    window.SwConfig = {
      // Initialize with default values
      cdnResources: {
        bootstrap: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
        bootstrapJs: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
        bootstrapIcons: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
        leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        leafletJs: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        chartJs: 'https://cdn.jsdelivr.net/npm/chart.js@4.2.1/dist/chart.umd.min.js',
        supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js'
      },
      
      // Flag to track initialization state
      initialized: false,
      
      // Method to initialize config
      initialize: async function() {
        if (this.initialized) return;
        
        try {
          // Wait for AppConfig to be initialized
          if (!window.AppConfig.initialized) {
            await window.AppConfig.initialize();
          }
          
          // Update CDN resources from AppConfig
          this.cdnResources = {
            bootstrap: window.AppConfig.get('cdnResources.bootstrap'),
            bootstrapJs: window.AppConfig.get('cdnResources.bootstrapJs'),
            bootstrapIcons: window.AppConfig.get('cdnResources.bootstrapIcons'),
            leafletCss: window.AppConfig.get('cdnResources.leafletCss'),
            leafletJs: window.AppConfig.get('cdnResources.leafletJs'),
            chartJs: window.AppConfig.get('cdnResources.chartJs'),
            supabase: window.AppConfig.get('cdnResources.supabase')
          };
          
          // Mark as initialized
          this.initialized = true;
          
          // Dispatch an event to notify that SW config is ready
          document.dispatchEvent(new CustomEvent('sw-config:ready', { 
            detail: { config: this }
          }));
          
          console.log('Service Worker configuration initialized');
        } catch (err) {
          console.error('Failed to initialize Service Worker configuration:', err);
        }
      },
      
      // Get all CDN resources as an array for caching
      getCdnResourcesArray: function() {
        return Object.values(this.cdnResources).filter(url => url);
      }
    };
    
    // Try to initialize immediately
    window.SwConfig.initialize();
    
  } else {
    console.warn('AppConfig not available, SwConfig not initialized');
  }
})();
