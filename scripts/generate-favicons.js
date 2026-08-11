const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure directories exist
const publicDir = path.join(__dirname, '..', 'public');
const appDir = path.join(__dirname, '..', 'app');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// 1. Transparent SVG Icon (Adaptive Dark/Light mode)
const svgMarkContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <style>
    .bar { fill: #101e2b; }
    .gap { fill: #f0722c; }
    @media (prefers-color-scheme: dark) {
      .bar { fill: #faf7f2; }
    }
  </style>
  <rect class="bar" x="14" y="12.5" width="38" height="9" rx="4.5" />
  <rect class="bar" x="30" y="27.5" width="22" height="9" rx="4.5" />
  <rect class="gap" x="14" y="27.5" width="11" height="9" rx="4.5" />
  <rect class="bar" x="14" y="42.5" width="38" height="9" rx="4.5" />
</svg>`;

// 2. Tile SVG Icon (Branded Dark Tile)
const svgTileContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <rect width="64" height="64" rx="14" fill="#0a141d" />
  <g transform="translate(6.26,7.04) scale(0.78)">
    <rect x="14" y="12.5" width="38" height="9" rx="4.5" fill="#faf7f2" />
    <rect x="30" y="27.5" width="22" height="9" rx="4.5" fill="#faf7f2" />
    <rect x="14" y="27.5" width="11" height="9" rx="4.5" fill="#f0722c" />
    <rect x="14" y="42.5" width="38" height="9" rx="4.5" fill="#faf7f2" />
  </g>
</svg>`;

async function generate() {
  // Write SVG files
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgMarkContent, 'utf8');
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgMarkContent, 'utf8');
  console.log('Created icon.svg');

  // Generate PNG files from SVG Tile using sharp
  const tileBuffer = Buffer.from(svgTileContent);
  const markBuffer = Buffer.from(svgMarkContent);

  // 180x180 Apple Touch Icon
  await sharp(tileBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-icon.png'));
  await sharp(tileBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(appDir, 'apple-icon.png'));
  console.log('Created apple-icon.png');

  // 192x192 & 512x512 PWA Icons
  await sharp(tileBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  await sharp(tileBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-192.png and icon-512.png');

  // 32x32 Favicon PNG
  const png32Buffer = await sharp(tileBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();
  
  await sharp(tileBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'icon.png'));

  // Simple ICO file header wrapping 32x32 PNG
  // ICO header: Reserved (2 bytes) = 0, Type (2 bytes) = 1 (icon), Count (2 bytes) = 1
  // Directory entry (16 bytes): Width(1), Height(1), Colors(1), Reserved(1), Planes(2), BPP(2), Size(4), Offset(4)
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = Icon
  icoHeader.writeUInt16LE(1, 4); // 1 Image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0); // Width 32
  dirEntry.writeUInt8(32, 1); // Height 32
  dirEntry.writeUInt8(0, 2);  // Palette 0
  dirEntry.writeUInt8(0, 3);  // Reserved
  dirEntry.writeUInt16LE(1, 4);  // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(png32Buffer.length, 8); // Image size in bytes
  dirEntry.writeUInt32LE(22, 12); // Offset (6 header + 16 dir entry = 22)

  const icoBuffer = Buffer.concat([icoHeader, dirEntry, png32Buffer]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
