# PWA Icons

This directory should contain the following icon sizes for PWA support:

## Required Icons

- `icon-72.png` - 72x72px
- `icon-96.png` - 96x96px
- `icon-128.png` - 128x128px
- `icon-144.png` - 144x144px
- `icon-152.png` - 152x152px (Apple Touch Icon)
- `icon-192.png` - 192x192px (Standard PWA Icon)
- `icon-384.png` - 384x384px
- `icon-512.png` - 512x512px (Large PWA Icon)
- `icon-512-maskable.png` - 512x512px (Maskable for adaptive icons on Android)

## Generating Icons

You can use the existing Travlr SVG logo to generate all required sizes:

### Option 1: Using Figma/Adobe Illustrator
1. Open the Travlr logo SVG
2. Export as PNG at each required size
3. For maskable icon: Add 10% padding around logo

### Option 2: Using ImageMagick (Command Line)
```bash
# Convert SVG to PNG at different sizes
convert -background none -density 300 logo.svg -resize 72x72 icon-72.png
convert -background none -density 300 logo.svg -resize 96x96 icon-96.png
convert -background none -density 300 logo.svg -resize 128x128 icon-128.png
convert -background none -density 300 logo.svg -resize 144x144 icon-144.png
convert -background none -density 300 logo.svg -resize 152x152 icon-152.png
convert -background none -density 300 logo.svg -resize 192x192 icon-192.png
convert -background none -density 300 logo.svg -resize 384x384 icon-384.png
convert -background none -density 300 logo.svg -resize 512x512 icon-512.png

# For maskable (with padding)
convert -background none -density 300 logo.svg -resize 410x410 -gravity center -extent 512x512 icon-512-maskable.png
```

### Option 3: Using PWA Asset Generator (Recommended)
```bash
npx @vite-pwa/assets-generator --preset minimal public/logo.svg
```

## Logo Design

The Travlr logo is a geometric design with:
- Outer square frame (white stroke)
- Inner square frame (red stroke #E63946)
- Center red circle
- Corner connectors between frames

Background should be **#18181B** (dark) or transparent for icons.

## Maskable Icons

Maskable icons need safe zone padding:
- Minimum 10% padding on all sides
- Important content within center 80% circle
- Background color: #18181B
- Test at: https://maskable.app/

## Shortcuts Icons (Optional)

For app shortcuts in manifest.json, create 96x96 icons for:
- `map-icon.png` - Map pin symbol
- `explore-icon.png` - Compass/search symbol
- `profile-icon.png` - User profile symbol

## Testing

After generating icons, test with:
1. Chrome DevTools > Application > Manifest
2. Lighthouse PWA audit
3. Install on actual device
4. Check icon appearance on home screen

## Current Status

⚠️ **PLACEHOLDER ICONS NEEDED** - Generate actual icons from Travlr logo before deployment.
