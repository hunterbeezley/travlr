#!/bin/bash
# Rally Theme Addition Script
# Usage: ./scripts/add-theme.sh <theme-id> <theme-name> <type> <source-file>
#
# Example (animation):
#   ./scripts/add-theme.sh radioexp-01 "Radio Experiment" animation ~/Desktop/TD/exports/radioexp.mov
#
# Example (still):
#   ./scripts/add-theme.sh acidcam-01 "Acid Cam Static" still ~/Desktop/TD/exports/acidcam.jpg

set -e  # Exit on any error

# Check for required commands
command -v ffmpeg >/dev/null 2>&1 || { echo "Error: ffmpeg is required but not installed."; exit 1; }

# Parse arguments
THEME_ID="$1"
THEME_NAME="$2"
TYPE="$3"
SOURCE="$4"

# Validate arguments
if [ -z "$THEME_ID" ] || [ -z "$THEME_NAME" ] || [ -z "$TYPE" ] || [ -z "$SOURCE" ]; then
  echo "Usage: $0 <theme-id> <theme-name> <type> <source-file>"
  echo ""
  echo "Arguments:"
  echo "  theme-id    : Unique identifier (e.g., radioexp-01)"
  echo "  theme-name  : Display name (e.g., 'Radio Experiment')"
  echo "  type        : 'animation' or 'still'"
  echo "  source-file : Path to source video or image file"
  echo ""
  echo "Example:"
  echo "  $0 radioexp-01 'Radio Experiment' animation ~/Desktop/TD/exports/radioexp.mov"
  exit 1
fi

# Validate type
if [ "$TYPE" != "animation" ] && [ "$TYPE" != "still" ]; then
  echo "Error: type must be 'animation' or 'still'"
  exit 1
fi

# Validate source file exists
if [ ! -f "$SOURCE" ]; then
  echo "Error: Source file not found: $SOURCE"
  exit 1
fi

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
THEMES_DIR="$PROJECT_ROOT/public/themes"

echo "🎨 Adding theme: $THEME_NAME ($THEME_ID)"
echo "   Type: $TYPE"
echo "   Source: $SOURCE"
echo ""

# Process based on type
if [ "$TYPE" == "animation" ]; then
  DEST="$THEMES_DIR/animations/${THEME_ID}.mp4"
  POSTER="$THEMES_DIR/posters/${THEME_ID}.jpg"

  echo "📹 Processing video..."
  echo "   Compressing to 4 Mbps H.264 (1920x1080, 30fps)..."

  ffmpeg -i "$SOURCE" \
    -vcodec h264 \
    -acodec aac \
    -vf "scale=1920:1080" \
    -b:v 4M \
    -maxrate 4M \
    -bufsize 8M \
    -movflags +faststart \
    -y \
    "$DEST" 2>&1 | grep -v "^frame=" || true

  echo "   Generating poster frame..."
  ffmpeg -i "$DEST" \
    -ss 00:00:01 \
    -vframes 1 \
    -y \
    "$POSTER" 2>&1 | grep -v "^frame=" || true

  # Get video duration
  DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$DEST" | awk '{print int($1)}')

  # Get file size
  FILE_SIZE=$(du -h "$DEST" | cut -f1)

  echo ""
  echo "✅ Animation processed:"
  echo "   Video: $DEST ($FILE_SIZE, ${DURATION}s)"
  echo "   Poster: $POSTER"

else
  # Still image
  DEST="$THEMES_DIR/stills/${THEME_ID}.jpg"

  echo "🖼️  Copying still image..."
  cp "$SOURCE" "$DEST"

  FILE_SIZE=$(du -h "$DEST" | cut -f1)

  echo ""
  echo "✅ Still image added:"
  echo "   Image: $DEST ($FILE_SIZE)"
fi

echo ""
echo "📝 Next steps:"
echo "   1. Edit public/themes/themes.json"
echo "   2. Add the following entry to the 'themes' array:"
echo ""

if [ "$TYPE" == "animation" ]; then
  cat <<EOF
   {
     "id": "$THEME_ID",
     "name": "$THEME_NAME",
     "type": "animation",
     "category": "abstract",
     "path": "/themes/animations/${THEME_ID}.mp4",
     "poster": "/themes/posters/${THEME_ID}.jpg",
     "duration": ${DURATION:-30},
     "fileSize": "$FILE_SIZE",
     "aspectRatio": "16:9",
     "tags": ["tag1", "tag2", "tag3"]
   }
EOF
else
  cat <<EOF
   {
     "id": "$THEME_ID",
     "name": "$THEME_NAME",
     "type": "still",
     "category": "colorful",
     "path": "/themes/stills/${THEME_ID}.jpg",
     "fileSize": "$FILE_SIZE",
     "aspectRatio": "16:9",
     "tags": ["tag1", "tag2", "tag3"]
   }
EOF
fi

echo ""
echo "   3. Update the category and tags to match your theme"
echo "   4. Commit and push to deploy:"
echo "      git add public/themes/"
echo "      git commit -m 'Add new TD theme: $THEME_NAME'"
echo "      git push origin main"
echo ""
echo "🚀 Vercel will auto-deploy in 2-3 minutes!"
