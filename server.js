const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Serve static files from the current directory
app.use(express.static(__dirname));

// For all routes, serve the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Create HTTP server
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`Access your app at http://localhost:${PORT}`);
  console.log('NOTE: Speech recognition may not work over HTTP.');
});

// Check if certificate files exist for HTTPS
try {
  if (fs.existsSync('server.key') && fs.existsSync('server.crt')) {
    const options = {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.crt')
    };

    // Create HTTPS server
    const httpsServer = https.createServer(options, app);
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
      console.log(`Access your app securely at https://localhost:${HTTPS_PORT}`);
      console.log('HTTPS is recommended for speech recognition to work properly');
    });
  } else {
    console.log('\n-----------------------------------------');
    console.log('SSL certificate files not found. Running in HTTP mode only.');
    console.log('Speech recognition may not work properly in HTTP mode.');
    console.log('\nTo enable HTTPS (recommended for speech recognition):');
    console.log('  1. Run: npm run generate-cert');
    console.log('  2. Restart the server: npm start');
    console.log('  3. Access your app at: https://localhost:3443');
    console.log('-----------------------------------------\n');
  }
} catch (err) {
  console.error('Error setting up HTTPS server:', err);
}