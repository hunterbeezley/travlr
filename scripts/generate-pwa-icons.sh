#!/bin/bash

# PWA Icon Generator Script for Travlr
# This script generates all required PWA icons from the source logo

set -e

echo "🎨 Travlr PWA Icon Generator"
echo "================================"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found!"
    echo ""
    echo "Please install ImageMagick:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    echo "  Windows: https://imagemagick.org/script/download.php"
    echo ""
    exit 1
fi

# Check if source logo exists
if [ ! -f "public/logo.svg" ]; then
    echo "❌ Source logo not found at public/logo.svg"
    echo ""
    echo "Please create a logo.svg file with the Travlr logo design:"
    echo "  - Geometric design with square frames"
    echo "  - Red accent color (#E63946)"
    echo "  - Dark background (#18181B) or transparent"
    echo ""
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p public/icons

echo "📦 Generating PWA icons..."
echo ""

# Icon sizes needed
SIZES=(72 96 128 144 152 192 384 512)

# Generate standard icons
for size in "${SIZES[@]}"; do
    echo "  ✓ Generating ${size}x${size}px icon..."
    convert -background "#18181B" -density 300 public/logo.svg \
        -resize ${size}x${size} \
        -quality 100 \
        public/icons/icon-${size}.png
done

# Generate maskable icon (with padding)
echo "  ✓ Generating 512x512px maskable icon (with padding)..."
convert -background "#18181B" -density 300 public/logo.svg \
    -resize 410x410 \
    -gravity center \
    -extent 512x512 \
    -quality 100 \
    public/icons/icon-512-maskable.png

echo ""
echo "✅ All PWA icons generated successfully!"
echo ""
echo "📋 Generated files:"
echo "  - public/icons/icon-72.png"
echo "  - public/icons/icon-96.png"
echo "  - public/icons/icon-128.png"
echo "  - public/icons/icon-144.png"
echo "  - public/icons/icon-152.png"
echo "  - public/icons/icon-192.png"
echo "  - public/icons/icon-384.png"
echo "  - public/icons/icon-512.png"
echo "  - public/icons/icon-512-maskable.png"
echo ""
echo "🧪 Next steps:"
echo "  1. Test icons at https://maskable.app/"
echo "  2. Run Lighthouse PWA audit"
echo "  3. Test install on real devices"
echo ""
echo "Done! 🎉"
