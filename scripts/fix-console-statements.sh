#!/bin/bash

# Script to replace console statements with logger utility across the codebase
# Part of security cleanup issue #16

set -e

cd "$(dirname "$0")/.."

echo "🔧 Fixing console statements across the codebase..."
echo ""

# Count total console statements before
BEFORE_COUNT=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/logger.ts" -exec grep -h "console\.\(log\|error\|warn\|info\|debug\)" {} \; | wc -l | tr -d ' ')
echo "📊 Found $BEFORE_COUNT console statements to replace"
echo ""

# Process each file that contains console statements
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/logger.ts" | while read -r file; do
  # Check if file has console statements
  if grep -q "console\.\(log\|error\|warn\|info\|debug\)" "$file"; then
    echo "Processing: $file"

    # Check if file already has logger import
    if ! grep -q "import.*logger.*from.*@/lib/logger" "$file" && ! grep -q "import.*logger.*from.*'@/lib/logger'" "$file" && ! grep -q "import.*logger.*from.*\"@/lib/logger\"" "$file"; then
      # Determine the correct import location based on file type
      if head -1 "$file" | grep -q "'use client'"; then
        # Client component - add after 'use client'
        sed -i.bak "1a\\
import { logger } from '@/lib/logger'
" "$file"
      elif head -1 "$file" | grep -q '"use client"'; then
        # Client component with double quotes - add after 'use client'
        sed -i.bak "1a\\
import { logger } from '@/lib/logger'
" "$file"
      elif head -1 "$file" | grep -q "import"; then
        # Regular file starting with import - add at top
        sed -i.bak "1i\\
import { logger } from '@/lib/logger'
" "$file"
      else
        # Other files - add at very top
        sed -i.bak "1i\\
import { logger } from '@/lib/logger'
" "$file"
      fi
    fi

    # Replace console statements
    sed -i.bak "s/console\.log(/logger.log(/g" "$file"
    sed -i.bak "s/console\.error(/logger.error(/g" "$file"
    sed -i.bak "s/console\.warn(/logger.warn(/g" "$file"
    sed -i.bak "s/console\.info(/logger.info(/g" "$file"
    sed -i.bak "s/console\.debug(/logger.debug(/g" "$file"

    # Remove backup file
    rm -f "$file.bak"
  fi
done

echo ""
echo "✅ Console statement replacement complete!"
echo ""

# Count remaining console statements
AFTER_COUNT=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/logger.ts" -exec grep -h "console\.\(log\|error\|warn\|info\|debug\)" {} \; 2>/dev/null | wc -l | tr -d ' ')
REPLACED=$((BEFORE_COUNT - AFTER_COUNT))

echo "📊 Statistics:"
echo "   - Replaced: $REPLACED console statements"
echo "   - Remaining: $AFTER_COUNT console statements"
echo ""

if [ "$AFTER_COUNT" -eq "0" ]; then
  echo "🎉 All console statements successfully replaced with logger!"
else
  echo "⚠️  Some console statements remain (likely in logger.ts itself)"
fi
