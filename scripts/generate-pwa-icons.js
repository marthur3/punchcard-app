#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 *
 * This script creates placeholder PWA icons by copying the existing favicon.svg
 * to PNG files at required sizes. For production, replace these with properly
 * designed PNG icons.
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
const faviconPath = path.join(publicDir, 'favicon.svg');

// Required icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('📱 Generating PWA icons...\n');

// For now, we'll create a simple HTML file that can be used to manually export
// the icons. In production, you'd use a tool like sharp or imagemagick.
const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <title>PWA Icon Generator</title>
  <style>
    body {
      font-family: system-ui;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    .icon-preview {
      display: inline-block;
      margin: 10px;
      text-align: center;
    }
    canvas {
      border: 1px solid #ccc;
      display: block;
      margin: 5px auto;
    }
  </style>
</head>
<body>
  <h1>PWA Icon Generator</h1>
  <p>Right-click each canvas and save as PNG with the filename shown below it.</p>
  <div id="icons"></div>

  <script>
    const svg = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#991B1B" rx="20"/>
      <text x="50" y="70" font-size="60" font-weight="bold" fill="white" text-anchor="middle" font-family="system-ui">T</text>
    </svg>\`;

    const sizes = ${JSON.stringify(sizes)};
    const iconsDiv = document.getElementById('icons');

    sizes.forEach(size => {
      const div = document.createElement('div');
      div.className = 'icon-preview';

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svg);

      const label = document.createElement('div');
      label.textContent = \`icon-\${size}x\${size}.png\`;

      div.appendChild(canvas);
      div.appendChild(label);
      iconsDiv.appendChild(div);
    });
  </script>
</body>
</html>`;

const generatorPath = path.join(publicDir, 'icon-generator.html');
fs.writeFileSync(generatorPath, htmlTemplate);

console.log('✅ Created icon generator HTML at: public/icon-generator.html');
console.log('\n📝 Instructions:');
console.log('1. Open public/icon-generator.html in a browser');
console.log('2. Right-click each canvas and save as PNG');
console.log('3. Save each file with the name shown below the canvas');
console.log('4. Place all files in the public/icons/ directory');
console.log('\nAlternatively, use an online tool or image editor to create');
console.log('PNG icons from public/favicon.svg at the following sizes:');
sizes.forEach(size => {
  console.log(`   - ${size}x${size}px → public/icons/icon-${size}x${size}.png`);
});

console.log('\n✨ For production, use high-quality PNG icons with proper branding.');
