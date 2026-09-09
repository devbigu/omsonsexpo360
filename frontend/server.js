import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

const distPath = join(__dirname, 'dist');
const indexPath = join(distPath, 'index.html');

// Check if dist folder exists
if (!existsSync(distPath)) {
  console.error('Error: dist folder not found. Please run "npm run build" first.');
  process.exit(1);
}

// Serve static files from the dist directory
app.use(express.static(distPath));

// Handle SPA routing - serve index.html for all routes that don't match static files
app.get('*', (req, res) => {
  try {
    if (!existsSync(indexPath)) {
      console.error('Error: index.html not found in dist folder');
      return res.status(500).send('Application not built correctly. Please run "npm run build".');
    }
    const indexHtml = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(indexHtml);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Serving static files from: ${distPath}`);
});

