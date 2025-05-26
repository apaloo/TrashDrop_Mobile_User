#!/usr/bin/env node

/**
 * Add Fullscreen Script
 * 
 * This script automatically adds the pwa-fullscreen.js script
 * to all HTML pages in the views directory that don't already have it.
 */

const fs = require('fs');
const path = require('path');

// Define paths
const viewsDir = path.join(__dirname, '..', 'views');

// Process all HTML files in the views directory
fs.readdir(viewsDir, (err, files) => {
  if (err) {
    console.error('Error reading views directory:', err);
    process.exit(1);
  }

  // Filter to only include HTML files
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  
  console.log(`Found ${htmlFiles.length} HTML files to process`);
  
  // Process each HTML file
  htmlFiles.forEach(file => {
    const filePath = path.join(viewsDir, file);
    
    // Read file content
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        console.error(`Error reading file ${file}:`, err);
        return;
      }
      
      // Check if pwa-fullscreen.js already exists
      if (!content.includes('pwa-fullscreen.js')) {
        // Find the position to insert the script - before </body>
        const bodyCloseIndex = content.lastIndexOf('</body>');
        if (bodyCloseIndex !== -1) {
          // Insert the script before </body>
          const newContent = content.slice(0, bodyCloseIndex) + 
                            '    <script src="/js/pwa-fullscreen.js"></script>\n' + 
                            content.slice(bodyCloseIndex);
          
          // Write the modified content back to the file
          fs.writeFile(filePath, newContent, 'utf8', (err) => {
            if (err) {
              console.error(`Error writing to file ${file}:`, err);
            } else {
              console.log(`✅ Added fullscreen script to ${file}`);
            }
          });
        } else {
          console.warn(`Could not find </body> in ${file}`);
        }
      } else {
        console.log(`⏭️ Fullscreen script already exists in ${file}`);
      }
    });
  });
});
