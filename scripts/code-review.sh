#!/bin/bash

# Rally App - Local Code Review Script
# Run comprehensive code quality checks before committing

set -e

echo "🔍 Rally App Code Review"
echo "======================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES_FOUND=0
WARNINGS_FOUND=0

# Create reports directory
mkdir -p code-review-reports
REPORT_DATE=$(date +%Y-%m-%d_%H-%M-%S)
REPORT_DIR="code-review-reports/$REPORT_DATE"
mkdir -p "$REPORT_DIR"

echo "📁 Reports will be saved to: $REPORT_DIR"
echo ""

# 1. ESLINT
echo "1️⃣  Running ESLint..."
if npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0 > "$REPORT_DIR/eslint.txt" 2>&1; then
    echo -e "${GREEN}✅ ESLint: No issues${NC}"
else
    echo -e "${RED}❌ ESLint: Issues found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    head -20 "$REPORT_DIR/eslint.txt"
fi
echo ""

# 2. TYPESCRIPT TYPE CHECK
echo "2️⃣  Running TypeScript type check..."
if npx tsc --noEmit > "$REPORT_DIR/typescript.txt" 2>&1; then
    echo -e "${GREEN}✅ TypeScript: No type errors${NC}"
else
    echo -e "${RED}❌ TypeScript: Type errors found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    head -20 "$REPORT_DIR/typescript.txt"
fi
echo ""

# 3. PRETTIER CHECK
echo "3️⃣  Checking code formatting..."
if npx prettier --check "**/*.{ts,tsx,js,jsx,json,css,md}" > "$REPORT_DIR/prettier.txt" 2>&1; then
    echo -e "${GREEN}✅ Prettier: All files formatted${NC}"
else
    echo -e "${YELLOW}⚠️  Prettier: Some files need formatting${NC}"
    echo "   Run: npm run format"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi
echo ""

# 4. CODE COMPLEXITY
echo "4️⃣  Analyzing code complexity..."
if command -v complexity-report &> /dev/null; then
    complexity-report app/ components/ lib/ --format minimal > "$REPORT_DIR/complexity.txt" 2>&1 || true
    echo -e "${BLUE}ℹ️  Complexity report generated${NC}"
else
    echo -e "${YELLOW}⚠️  complexity-report not installed (npm install -g complexity-report)${NC}"
fi
echo ""

# 5. DUPLICATE CODE
echo "5️⃣  Checking for duplicate code..."
if npx jscpd app/ components/ lib/ --min-lines 5 --min-tokens 50 > "$REPORT_DIR/duplicates.txt" 2>&1; then
    echo -e "${GREEN}✅ No significant code duplication${NC}"
else
    DUPLICATION=$(grep -c "Clone found" "$REPORT_DIR/duplicates.txt" || echo "0")
    if [ "$DUPLICATION" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $DUPLICATION code duplications${NC}"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    else
        echo -e "${GREEN}✅ No significant code duplication${NC}"
    fi
fi
echo ""

# 6. UNUSED EXPORTS
echo "6️⃣  Finding unused exports..."
if npx ts-prune > "$REPORT_DIR/unused-exports.txt" 2>&1; then
    UNUSED_COUNT=$(grep -v "^$" "$REPORT_DIR/unused-exports.txt" | wc -l)
    if [ "$UNUSED_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $UNUSED_COUNT unused exports${NC}"
        head -10 "$REPORT_DIR/unused-exports.txt"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    else
        echo -e "${GREEN}✅ No unused exports${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  ts-prune check complete${NC}"
fi
echo ""

# 7. SECURITY PATTERNS
echo "7️⃣  Checking security patterns..."
SECURITY_ISSUES=0

# Check for dangerouslySetInnerHTML
if grep -r "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" app/ components/ 2>/dev/null; then
    echo -e "${RED}❌ Found dangerouslySetInnerHTML usage${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check for eval()
if grep -r "eval(" --include="*.ts" --include="*.tsx" app/ components/ lib/ 2>/dev/null; then
    echo -e "${RED}❌ Found eval() usage${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check for console.log
CONSOLE_COUNT=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" app/ components/ lib/ 2>/dev/null | wc -l)
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_COUNT console.log statements${NC}"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

# Check for TODO/FIXME
TODO_COUNT=$(grep -rE "(TODO|FIXME|HACK)" --include="*.ts" --include="*.tsx" app/ components/ lib/ 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME/HACK comments${NC}"
fi

if [ "$SECURITY_ISSUES" -gt 0 ]; then
    ISSUES_FOUND=$((ISSUES_FOUND + SECURITY_ISSUES))
else
    echo -e "${GREEN}✅ No security anti-patterns found${NC}"
fi
echo ""

# 8. CODE STYLE
echo "8️⃣  Checking code style..."
STYLE_ISSUES=0

# Check for var usage
VAR_COUNT=$(grep -r "^[[:space:]]*var " --include="*.ts" --include="*.tsx" --include="*.js" app/ components/ lib/ 2>/dev/null | wc -l)
if [ "$VAR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $VAR_COUNT 'var' statements (use const/let)${NC}"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

# Check for any type usage
ANY_COUNT=$(grep -r ": any" --include="*.ts" --include="*.tsx" app/ components/ lib/ 2>/dev/null | wc -l)
if [ "$ANY_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Found $ANY_COUNT 'any' type usages (minimize usage)${NC}"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

if [ "$STYLE_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ Code style checks passed${NC}"
fi
echo ""

# 9. ACCESSIBILITY
echo "9️⃣  Checking accessibility..."
A11Y_ISSUES=0

# Check for img without alt
MISSING_ALT=$(grep -rn "<img" --include="*.tsx" app/ components/ 2>/dev/null | grep -v "alt=" | wc -l)
if [ "$MISSING_ALT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $MISSING_ALT <img> tags without alt text${NC}"
    A11Y_ISSUES=$((A11Y_ISSUES + 1))
fi

# Check for buttons without type
MISSING_TYPE=$(grep -rn "<button" --include="*.tsx" app/ components/ 2>/dev/null | grep -v 'type=' | wc -l)
if [ "$MISSING_TYPE" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $MISSING_TYPE <button> tags without explicit type${NC}"
    A11Y_ISSUES=$((A11Y_ISSUES + 1))
fi

if [ "$A11Y_ISSUES" -gt 0 ]; then
    WARNINGS_FOUND=$((WARNINGS_FOUND + A11Y_ISSUES))
else
    echo -e "${GREEN}✅ No accessibility issues found${NC}"
fi
echo ""

# 10. BUILD TEST
echo "🔟  Testing build..."
if npm run build > "$REPORT_DIR/build.txt" 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"

    # Check build size
    BUILD_SIZE=$(du -sh .next/ 2>/dev/null | cut -f1)
    echo -e "${BLUE}ℹ️  Build size: $BUILD_SIZE${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    tail -20 "$REPORT_DIR/build.txt"
fi
echo ""

# GENERATE SUMMARY
echo "======================="
echo "📊 Code Review Summary"
echo "======================="
echo ""

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Perfect! No issues or warnings found${NC}"
elif [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No critical issues${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS_FOUND warnings found${NC}"
else
    echo -e "${RED}❌ $ISSUES_FOUND critical issues found${NC}"
    if [ $WARNINGS_FOUND -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS_FOUND warnings found${NC}"
    fi
fi

echo ""
echo "📁 Full reports saved to: $REPORT_DIR"
echo ""

# Generate summary report
SUMMARY_FILE="$REPORT_DIR/summary.md"
{
    echo "# Code Review Summary"
    echo ""
    echo "**Date:** $(date)"
    echo "**Branch:** $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
    echo "**Commit:** $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo ""
    echo "## Results"
    echo ""
    echo "- **Critical Issues:** $ISSUES_FOUND"
    echo "- **Warnings:** $WARNINGS_FOUND"
    echo ""
    echo "## Reports Generated"
    echo ""
    echo "- ESLint: \`eslint.txt\`"
    echo "- TypeScript: \`typescript.txt\`"
    echo "- Prettier: \`prettier.txt\`"
    echo "- Complexity: \`complexity.txt\`"
    echo "- Duplicates: \`duplicates.txt\`"
    echo "- Unused Exports: \`unused-exports.txt\`"
    echo "- Build Log: \`build.txt\`"
    echo ""
    echo "## Quick Fixes"
    echo ""
    echo "Format code: \`npm run format\`"
    echo ""
    echo "Review guide: [CODE_REVIEW_GUIDE.md](../../CODE_REVIEW_GUIDE.md)"
} > "$SUMMARY_FILE"

echo "📋 Summary: $SUMMARY_FILE"
echo ""

# Exit with error if issues found
if [ $ISSUES_FOUND -gt 0 ]; then
    echo -e "${RED}💥 Code review failed. Please fix the issues above.${NC}"
    exit 1
else
    echo -e "${GREEN}✨ Code review passed!${NC}"
    if [ $WARNINGS_FOUND -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Consider addressing the warnings${NC}"
    fi
    exit 0
fi
