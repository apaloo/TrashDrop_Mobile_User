#!/usr/bin/env node

/**
 * Apply Theme Script
 * 
 * This script automatically adds dark theme CSS and theme switcher JS
 * to all HTML pages in the views directory.
 */

const fs = require('fs');
const path = require('path');

// Define paths
const viewsDir = path.join(__dirname, '..', 'views');

// Patterns to search for in HTML files
const headEndPattern = '</head>';
const bootstrapJsPattern = '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>';

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
      
      let modified = false;
      let newContent = content;
      
      // Check if dark theme CSS already exists
      if (!content.includes('dark-theme.css')) {
        // Add dark theme CSS before </head>
        newContent = newContent.replace(
          headEndPattern, 
          `    <link rel="stylesheet" href="/css/dark-theme.css">\n${headEndPattern}`
        );
        modified = true;
      }
      
      // Check if theme switcher JS already exists
      if (!content.includes('theme-switcher.js')) {
        // Add theme switcher JS after Bootstrap JS
        if (content.includes(bootstrapJsPattern)) {
          newContent = newContent.replace(
            bootstrapJsPattern, 
            `${bootstrapJsPattern}\n    <!-- Theme Switcher (must be early) -->\n    <script src="/js/theme-switcher.js"></script>`
          );
          modified = true;
        } else {
          // If Bootstrap JS pattern not found, add theme switcher before </body>
          newContent = newContent.replace(
            '</body>', 
            `    <!-- Theme Switcher -->\n    <script src="/js/theme-switcher.js"></script>\n</body>`
          );
          modified = true;
        }
      }
      
      // Only write to file if changes were made
      if (modified) {
        fs.writeFile(filePath, newContent, 'utf8', (err) => {
          if (err) {
            console.error(`Error writing to file ${file}:`, err);
          } else {
            console.log(`✅ Updated ${file}`);
          }
        });
      } else {
        console.log(`⏭️ No changes needed for ${file}`);
      }
    });
  });
});
