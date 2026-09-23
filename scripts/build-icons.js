const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;

const ICON_SOURCE = path.join(__dirname, '..', 'assets', 'icon.svg');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const allSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function buildIcons() {
  const svgImage = sharp(ICON_SOURCE);

  const pngBuffers = await Promise.all(
    allSizes.map((size) =>
      svgImage
        .clone()
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  const png256 = pngBuffers[allSizes.indexOf(256)];
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.png'), png256);

  const windowsSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoPngBuffers = windowsSizes.map((s) => pngBuffers[allSizes.indexOf(s)]);
  const icoBuffer = await pngToIco(icoPngBuffers);
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), icoBuffer);

  const icnsBuffer = buildICNS(pngBuffers);
  fs.writeFileSync(path.join(ASSETS_DIR, 'icon.icns'), icnsBuffer);

  console.log('Icons generated successfully:');
  console.log('  assets/icon.ico  (Windows)');
  console.log('  assets/icon.icns (macOS)');
  console.log('  assets/icon.png  (Linux)');
}

function buildICNS(pngBuffers) {
  const get = (size) => pngBuffers[allSizes.indexOf(size)];

  const icnsTypes = [
    { type: 'ic14', size: 512 },
    { type: 'ic13', size: 256 },
    { type: 'ic12', size: 128 },
    { type: 'ic11', size: 64 },
    { type: 'ic10', size: 1024 },
    { type: 'ic09', size: 512 },
    { type: 'ic08', size: 256 },
    { type: 'ic07', size: 128 },
  ];

  const entryData = [];

  for (const { type, size } of icnsTypes) {
    const png = get(size);
    if (png) {
      entryData.push({ type, buffer: png });
    }
  }

  const tocSize = 8 + 4 + entryData.length * 8;
  let totalSize = tocSize + entryData.reduce((sum, e) => sum + 8 + e.buffer.length, 0);

  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  buf.write('ICNS', offset, 'ascii');
  offset += 4;
  buf.writeUInt32BE(totalSize, offset);
  offset += 4;

  buf.write('TOC ', offset, 'ascii');
  offset += 4;
  buf.writeUInt32BE(tocSize, offset);
  offset += 4;
  buf.writeUInt32BE(entryData.length, offset);
  offset += 4;

  for (const e of entryData) {
    buf.write(e.type, offset, 'ascii');
    offset += 4;
    buf.writeUInt32BE(8 + e.buffer.length, offset);
    offset += 4;
  }

  for (const e of entryData) {
    buf.write(e.type, offset, 'ascii');
    offset += 4;
    buf.writeUInt32BE(8 + e.buffer.length, offset);
    offset += 4;
    e.buffer.copy(buf, offset);
    offset += e.buffer.length;
  }

  return buf;
}

buildIcons()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Icon generation failed:', err);
    process.exit(1);
  });
