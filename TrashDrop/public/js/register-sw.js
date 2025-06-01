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
        
        // Check if background sync is available
        if ('SyncManager' in window) {
          // First check if service worker is already active
          if (registration.active) {
            registerBackgroundSync(registration);
          } else {
            // Wait for the service worker to activate before registering sync
            registration.addEventListener('activate', (event) => {
              registerBackgroundSync(registration);
            });
            
            // Force activation if needed (for new service workers)
            if (registration.waiting) {
              registration.waiting.postMessage({type: 'SKIP_WAITING'});
            }
          }
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
  
  // Helper function to register background sync
  function registerBackgroundSync(registration) {
    // Ensure we have an active service worker before registering sync
    if (!registration.active) {
      console.warn('Cannot register background sync - no active service worker');
      return Promise.reject(new Error('No active service worker'));
    }
    
    // Register for background sync with retry
    return Promise.all([
      registration.sync.register('sync-pickups'),
      registration.sync.register('sync-bags')
    ]).then(() => {
      console.log('Background sync registered for offline data');
      // Let the page know sync is available
      document.dispatchEvent(new CustomEvent('syncRegistered'));
    }).catch(err => {
      console.warn('Background sync registration failed:', err);
      // Try again after a delay if it was a temporary issue
      if (err.name !== 'InvalidStateError') {
        setTimeout(() => registerBackgroundSync(registration), 5000);
      }
    });
  }
  
  // Listen for service worker updates and handle accordingly
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller changed - page will reload for consistency');
    // Optional: reload the page to ensure consistency
    // window.location.reload();
  });
  
  // Listen for messages from the service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_COMPLETE') {
      console.log(`Background sync complete for: ${event.data.tag}`);
      // Notify the user or update the UI
      updateSyncStatus(event.data.tag, true);
    }
  });
  
  // Function to update UI based on sync status
  function updateSyncStatus(syncType, success) {
    const statusElement = document.getElementById('sync-status');
    if (statusElement) {
      if (success) {
        if (syncType === 'sync-pickups') {
          statusElement.textContent = 'Pickups synced';
        } else if (syncType === 'sync-bags') {
          statusElement.textContent = 'Bags synced';
        }
        statusElement.classList.remove('text-warning');
        statusElement.classList.add('text-success');
        
        // Reset status after a while
        setTimeout(() => {
          statusElement.textContent = '';
        }, 3000);
      }
    }
  }
}
