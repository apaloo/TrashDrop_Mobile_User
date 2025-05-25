/**
 * Safari Login Helper
 * A specialized script to help Safari users log in without SSL errors
 * in local development environments
 */

document.addEventListener('DOMContentLoaded', function() {
  // Only apply this fix if we're in Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isSafari) {
    console.log('Safari detected, applying login workaround');
    
    // Find all login buttons/links
    const loginButtons = document.querySelectorAll('form[action="/account-access"], form[action="/login"]');
    
    loginButtons.forEach(form => {
      // Prevent the form from submitting normally
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Create a popup window to load the login page
        // This bypasses Safari's automatic HTTPS upgrade for the main window
        const loginWindow = window.open('about:blank', 'loginWindow', 
          'width=500,height=600,resizable=yes,scrollbars=yes,status=yes');
        
        if (loginWindow) {
          loginWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Redirecting to Login...</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                .loader { border: 5px solid #f3f3f3; border-top: 5px solid #4CAF50; 
                  border-radius: 50%; width: 50px; height: 50px; 
                  animation: spin 1s linear infinite; margin: 20px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 
                  100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <h2>Redirecting to TrashDrop Login</h2>
              <div class="loader"></div>
              <p>Loading your login page...</p>
              <script>
                // Use location.replace which has different security handling
                window.location.replace('http://127.0.0.1:3000/login');
                
                // Fallback if replace doesn't work
                setTimeout(function() {
                  window.location.href = 'http://127.0.0.1:3000/login';
                }, 1000);
              </script>
            </body>
            </html>
          `);
          
          // Focus the popup window
          loginWindow.focus();
        } else {
          // If popup is blocked, fallback to direct navigation
          alert('Please allow popups for login functionality or try using a different browser.');
        }
      });
    });
  }
});
