#!/bin/bash

# Script to add loading="lazy" to img tags for better mobile performance
# Part of mobile responsive design improvements issue #55

set -e

cd "$(dirname "$0")/.."

echo "🖼️  Adding lazy loading to images..."
echo ""

# Count images before
BEFORE_COUNT=$(grep -r "<img" src --include="*.tsx" --include="*.ts" | grep -v 'loading=' | grep -v "from 'next/image'" | wc -l | tr -d ' ')
echo "📊 Found $BEFORE_COUNT img tags without lazy loading"
echo ""

# Find all img tags without loading attribute and add it
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "<img" {} \; | while read -r file; do
  # Only process if file has img tags without loading attribute
  if grep -q "<img[^>]*src=" "$file" && ! grep -q 'loading=' "$file"; then
    echo "Processing: $file"

    # Add loading="lazy" to img tags that don't have it
    # Match <img followed by anything, then src=, but not already having loading=
    sed -i.bak 's/<img\([^>]*\)src=\([^>]*\)>/<img\1loading="lazy" src=\2>/g' "$file"

    # Clean up if sed created broken tags (img tags that already had loading)
    # This is a safety check
    if grep -q 'loading="lazy"[^>]*loading=' "$file"; then
      # Restore from backup if we created duplicates
      mv "$file.bak" "$file"
      echo "  ⚠️  Skipped (already has loading attribute)"
    else
      rm -f "$file.bak"
      echo "  ✅ Updated"
    fi
  fi
done

echo ""
echo "✅ Lazy loading added!"
echo ""

# Count remaining
AFTER_COUNT=$(grep -r "<img" src --include="*.tsx" --include="*.ts" | grep -v 'loading=' | grep -v "from 'next/image'" | wc -l | tr -d ' ')
UPDATED=$((BEFORE_COUNT - AFTER_COUNT))

echo "📊 Statistics:"
echo "   - Updated: $UPDATED images"
echo "   - Remaining without lazy loading: $AFTER_COUNT"
echo ""

if [ "$AFTER_COUNT" -lt "$BEFORE_COUNT" ]; then
  echo "🎉 Performance improved! Images will now lazy load on scroll."
fi
