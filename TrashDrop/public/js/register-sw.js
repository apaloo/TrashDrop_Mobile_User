/**
 * TrashDrop Service Worker Registration
 * Enables offline functionality and PWA features with enhanced offline support
 */

// Check if service workers are supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    // Use the enhanced service worker
    navigator.serviceWorker.register('/service-worker-enhanced.js')
      .then(function(registration) {
        console.log('Enhanced ServiceWorker registration successful with scope: ', registration.scope);
        
        // Check if background sync is available and register for sync
        if ('SyncManager' in window) {
          // Register for background sync
          Promise.all([
            registration.sync.register('sync-pickups'),
            registration.sync.register('sync-bags')
          ]).then(() => {
            console.log('Background sync registered for offline data');
          }).catch(err => {
            console.warn('Background sync registration failed:', err);
          });
        } else {
          console.warn('Background sync not supported in this browser');
        }
      })
      .catch(function(error) {
        // Fallback to standard service worker if enhanced one fails
        console.warn('Enhanced ServiceWorker registration failed, trying standard version: ', error);
        
        navigator.serviceWorker.register('/service-worker.js')
          .then(function(registration) {
            console.log('Standard ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(function(error) {
            console.error('All ServiceWorker registration attempts failed: ', error);
          });
      });
  });
  
  // Setup connection status indicator in the UI
  function updateOnlineStatus() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      if (navigator.onLine) {
        statusElement.textContent = 'Online';
        statusElement.classList.remove('text-danger');
        statusElement.classList.add('text-success');
      } else {
        statusElement.textContent = 'Offline';
        statusElement.classList.remove('text-success');
        statusElement.classList.add('text-danger');
      }
    }
  }

  // Update status when online/offline events occur
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial status check
  if (document.readyState === 'complete') {
    updateOnlineStatus();
  } else {
    window.addEventListener('DOMContentLoaded', updateOnlineStatus);
  }
}
