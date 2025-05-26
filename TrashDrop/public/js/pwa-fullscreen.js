/**
 * PWA Fullscreen Handler
 * Forces fullscreen mode on PWA launch
 */

(function() {
  // Try to detect if running as installed PWA
  const isRunningAsPwa = () => {
    return window.matchMedia('(display-mode: fullscreen)').matches || 
           window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  };

  // Force fullscreen when possible
  const attemptFullscreen = () => {
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .catch(err => console.warn('Error attempting to enable fullscreen:', err));
    }
  };

  // Handle PWA launch
  const handlePwaLaunch = () => {
    if (isRunningAsPwa()) {
      // Add a special class to enable CSS fullscreen tweaks
      document.documentElement.classList.add('pwa-mode');
      document.body.classList.add('pwa-mode');
      
      // Add viewport padding for notches and rounded corners
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover';
      }
      
      // Try to request fullscreen after a slight delay
      // This helps on devices where immediate request is ignored
      setTimeout(() => {
        attemptFullscreen();
        
        // If user interacts, try again (some browsers require user gesture)
        document.body.addEventListener('click', function fullscreenOnInteraction() {
          attemptFullscreen();
          document.body.removeEventListener('click', fullscreenOnInteraction);
        }, { once: true });
      }, 1000);
    }
  };

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePwaLaunch);
  } else {
    handlePwaLaunch();
  }
  
  // Also run when page becomes visible (PWA might be switched to from another app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunningAsPwa()) {
      attemptFullscreen();
    }
  });
})();
