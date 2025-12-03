#!/usr/bin/env node
/**
 * Generate PWA icons from the master SVG
 * Run: node scripts/generate-pwa-icons.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Icon sizes to generate
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 192, name: 'icon-192x192-maskable.png', maskable: true },
  { size: 512, name: 'icon-512x512-maskable.png', maskable: true },
];

async function generateIcons() {
  // Dynamic import of sharp
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp is not installed. Installing...');
    const { execSync } = await import('child_process');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    sharp = (await import('sharp')).default;
  }

  const svgPath = join(iconsDir, 'app-icon.svg');
  const svgBuffer = readFileSync(svgPath);

  console.log('Generating PWA icons...');

  for (const { size, name, maskable } of sizes) {
    let inputSvg = svgBuffer;
    
    // For maskable icons, we need to add padding (safe zone is inner 80%)
    // This means the icon content should be in the center 80% of the canvas
    if (maskable) {
      // Read SVG and modify viewBox to add padding
      const svgContent = svgBuffer.toString();
      // Create a version with extra padding by wrapping in a larger viewBox
      const paddedSvg = svgContent
        .replace('viewBox="0 0 512 512"', 'viewBox="-64 -64 640 640"');
      inputSvg = Buffer.from(paddedSvg);
    }

    const outputPath = join(iconsDir, name);
    
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`  Created: ${name} (${size}x${size})`);
  }

  console.log('\nAll icons generated successfully!');
  console.log('\nNote: You may also want to convert favicon-32x32.png to favicon.ico');
  console.log('You can use an online tool or run: npm install -g png-to-ico && png-to-ico public/icons/favicon-32x32.png > public/favicon.ico');
}

generateIcons().catch(console.error);

