/**
 * Port redirection server for TrashDrop
 * This lightweight server runs on port 80 and redirects all requests to port 3000
 */

const http = require('http');

// Create a server that redirects all requests to port 3000
const redirectServer = http.createServer((req, res) => {
  // Get the path from the original request
  const path = req.url || '/';
  
  // Set up the redirect
  res.writeHead(302, {
    'Location': `http://127.0.0.1:3000${path}`
  });
  
  // End the response
  res.end();
  
  console.log(`Redirected: ${req.method} ${req.url} -> http://127.0.0.1:3000${path}`);
});

// Try to listen on port 80
try {
  redirectServer.listen(80, () => {
    console.log('Redirect server running on port 80 -> 3000');
  });
} catch (error) {
  console.error('Could not start redirect server on port 80:', error.message);
  console.log('You may need to run this script with sudo privileges to bind to port 80');
}
