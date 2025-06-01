// TrashDrop - Order Bags Functionality
// Enhanced version with ngrok compatibility and authentication handling

// Global variables to track modal and fullscreen state
let orderBagsModal;
let wasInFullscreen = false;
let originalActivePickupDisplayState = null;

// Helper function to check if running on ngrok domain
function isRunningOnNgrok() {
  return window.location.hostname.includes('ngrok-free.app') || 
         window.location.hostname.includes('ngrok.io');
}

// Function to check if we're in fullscreen mode
function isInFullscreenMode() {
  return !!(document.fullscreenElement || 
           document.webkitFullscreenElement || 
           document.mozFullScreenElement || 
           document.msFullscreenElement);
}

// Function to exit fullscreen mode
function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    return document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    return document.msExitFullscreen();
  }
  return Promise.resolve();
}

// Function to request fullscreen mode
function requestFullscreen(element) {
  if (element.requestFullscreen) {
    return element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    return element.webkitRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    return element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    return element.msRequestFullscreen();
  }
  return Promise.resolve();
}
