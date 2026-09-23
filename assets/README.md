# Monitor Controller - Build Assets

## Generating Icons

Run the icon generation script:

```bash
npm run icons
```

This produces all three required icon files from `icon.svg`:
- `icon.ico` (Windows, multiple sizes: 16, 24, 32, 48, 64, 128, 256)
- `icon.icns` (macOS, multiple sizes: 128, 256, 512, 1024 + retina)
- `icon.png` (Linux, 256×256)

## Manual Icon Generation

### Windows (.ico)
Convert `icon.svg` to `.ico` with multiple sizes (16, 24, 32, 48, 64, 128, 256):

```bash
# Using ImageMagick
magick convert assets/icon.svg -define icon:auto-resize=256,128,64,48,32,24,16 assets/icon.ico

# Or use online converter: https://cloudconvert.com/svg-to-ico
```

### macOS (.icns)
```bash
# Using iconutil (macOS only)
mkdir -p assets/icon.iconset
sips -z 16 16     assets/icon.svg --out assets/icon.iconset/icon_16x16.png
sips -z 32 32     assets/icon.svg --out assets/icon.iconset/icon_16x16@2x.png
sips -z 32 32     assets/icon.svg --out assets/icon.iconset/icon_32x32.png
sips -z 64 64     assets/icon.svg --out assets/icon.iconset/icon_32x32@2x.png
sips -z 128 128   assets/icon.svg --out assets/icon.iconset/icon_128x128.png
sips -z 256 256   assets/icon.svg --out assets/icon.iconset/icon_128x128@2x.png
sips -z 256 256   assets/icon.svg --out assets/icon.iconset/icon_256x256.png
sips -z 512 512   assets/icon.svg --out assets/icon.iconset/icon_256x256@2x.png
sips -z 512 512   assets/icon.svg --out assets/icon.iconset/icon_512x512.png
sips -z 1024 1024 assets/icon.svg --out assets/icon.iconset/icon_512x512@2x.png
iconutil -c icns assets/icon.iconset -o assets/icon.icns
```

### Linux (.png)
```bash
# PNG icons for .deb/.rpm
magick convert assets/icon.svg -resize 512x512 assets/icon.png
magick convert assets/icon.svg -resize 1024x1024 assets/icon@2x.png
```

### Installer Loading GIF (Windows)
Create `assets/installer-loading.gif` (150x57px recommended):
- Simple animation with logo + progress indicator
- Transparent background preferred

## Code Signing Certificate

Place your EV/OV PFX certificate in `certs/certificate.pfx`

**Never commit certificates or `.env` files!**

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your certificate password
```

## Build Commands

```bash
# Development
npm run start

# Package (unpacked)
npm run package

# Build installers (signed)
npm run make

# Publish (if configured)
npm run publish
```