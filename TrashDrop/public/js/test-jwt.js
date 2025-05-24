// JWT Authentication Test Script
document.addEventListener('DOMContentLoaded', async () => {
  // Display output in the page
  const outputDiv = document.getElementById('output');
  
  function log(message) {
    console.log(message);
    const logItem = document.createElement('div');
    logItem.textContent = message;
    outputDiv.appendChild(logItem);
  }
  
  log('JWT Authentication Test Started');
  
  // Test JWT token decoding
  function testTokenDecoding() {
    log('\n--- Testing JWT Token Decoding ---');
    
    try {
      // Sample token for testing
      const sampleToken = localStorage.getItem('jwt_token') || localStorage.getItem('token');
      
      if (!sampleToken) {
        log('No token found in localStorage. Please log in first.');
        return;
      }
      
      log(`Token found: ${sampleToken.substring(0, 15)}...`);
      
      // Decode the token
      const decoded = window.jwtHelpers.decodeToken(sampleToken);
      
      if (decoded) {
        log('Token successfully decoded:');
        log(`Subject ID: ${decoded.sub || decoded.id}`);
        log(`Role: ${decoded.role || 'not specified'}`);
        log(`Issued at: ${new Date(decoded.iat * 1000).toLocaleString()}`);
        log(`Expires at: ${new Date(decoded.exp * 1000).toLocaleString()}`);
        
        // Check if token is expired
        const isExpired = window.jwtHelpers.isTokenExpired(sampleToken);
        log(`Token expired: ${isExpired ? 'Yes' : 'No'}`);
      } else {
        log('Failed to decode token');
      }
    } catch (error) {
      log(`Error decoding token: ${error.message}`);
    }
  }
  
  // Test JWT authentication with API
  async function testApiAuthentication() {
    log('\n--- Testing API Authentication with JWT ---');
    
    try {
      // Make an authenticated request to a protected endpoint
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // Authorization header will be added automatically by our fetch interceptor
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        log('Authentication successful!');
        log(`User ID: ${result.id || result.user?.id || 'N/A'}`);
        log(`Name: ${result.first_name || result.user?.first_name || 'N/A'} ${result.last_name || result.user?.last_name || ''}`);
      } else {
        log(`Authentication failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      log(`API request error: ${error.message}`);
    }
  }
  
  // Run the tests
  testTokenDecoding();
  await testApiAuthentication();
  
  log('\nJWT Authentication Test Completed');
});
