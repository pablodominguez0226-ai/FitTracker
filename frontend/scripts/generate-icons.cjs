const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.buffer.length;
    dirEntries.push(entry);
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(img => img.buffer)]);
}

async function run() {
  const rootDir = path.resolve(__dirname, '..');
  const svgPath = path.join(rootDir, 'public/logo.svg');
  const svgContent = fs.readFileSync(svgPath);

  // 1. Generate apple-touch-icon.png (512x512)
  const png512 = await sharp(svgContent).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(rootDir, 'public/apple-touch-icon.png'), png512);
  console.log('Saved public/apple-touch-icon.png (512x512):', png512.length, 'bytes');

  // 2. Generate favicon.ico (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const icoImages = [];
  for (const s of icoSizes) {
    const buf = await sharp(svgContent).resize(s, s).png().toBuffer();
    icoImages.push({ width: s, height: s, buffer: buf });
  }
  const icoBuf = createIco(icoImages);
  fs.writeFileSync(path.join(rootDir, 'public/favicon.ico'), icoBuf);
  console.log('Saved public/favicon.ico:', icoBuf.length, 'bytes');
}

run().catch(console.error);
