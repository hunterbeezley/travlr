#!/bin/bash

# Rally App - Security Audit Script
# Run this script to perform a comprehensive security audit locally

set -e

echo "🔒 Rally App Security Audit"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Create reports directory
mkdir -p security-reports
REPORT_DATE=$(date +%Y-%m-%d_%H-%M-%S)
REPORT_FILE="security-reports/audit-$REPORT_DATE.md"

echo "# Security Audit Report" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 1. Check npm packages for vulnerabilities
echo "📦 Checking npm packages for vulnerabilities..."
if npm audit --audit-level=moderate > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No npm vulnerabilities found${NC}"
    echo "## npm Audit: ✅ PASS" >> $REPORT_FILE
else
    echo -e "${RED}❌ npm vulnerabilities found${NC}"
    echo "## npm Audit: ❌ FAIL" >> $REPORT_FILE
    npm audit >> $REPORT_FILE
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo "" >> $REPORT_FILE

# 2. Check for unsafe React patterns
echo ""
echo "⚛️  Checking for unsafe React patterns..."
UNSAFE_FOUND=0

if grep -r "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" . 2>/dev/null; then
    echo -e "${RED}❌ Found dangerouslySetInnerHTML usage${NC}"
    echo "## Unsafe React Patterns: ❌ dangerouslySetInnerHTML found" >> $REPORT_FILE
    UNSAFE_FOUND=1
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if grep -r "eval(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null; then
    echo -e "${RED}❌ Found eval() usage${NC}"
    echo "## Unsafe Patterns: ❌ eval() found" >> $REPORT_FILE
    UNSAFE_FOUND=1
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $UNSAFE_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No unsafe React patterns found${NC}"
    echo "## Unsafe React Patterns: ✅ PASS" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# 3. Check for hardcoded secrets
echo ""
echo "🔑 Checking for hardcoded secrets..."
if grep -rE "(api[_-]?key|secret|password|token)[\s]*=[\s]*['\"][^'\"]+['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules . 2>/dev/null | grep -v "NEXT_PUBLIC"; then
    echo -e "${YELLOW}⚠️  Potential hardcoded secrets found (review manually)${NC}"
    echo "## Hardcoded Secrets: ⚠️  WARNING - Review manually" >> $REPORT_FILE
else
    echo -e "${GREEN}✅ No obvious hardcoded secrets${NC}"
    echo "## Hardcoded Secrets: ✅ PASS" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# 4. Check environment variables
echo ""
echo "🌍 Checking environment configuration..."
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found${NC}"
    echo "## Environment: ⚠️  .env.local missing" >> $REPORT_FILE
else
    if grep -q "your-project-url" .env.local 2>/dev/null || grep -q "your-anon-key" .env.local 2>/dev/null; then
        echo -e "${RED}❌ Environment variables not configured${NC}"
        echo "## Environment: ❌ Variables not configured" >> $REPORT_FILE
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ Environment variables configured${NC}"
        echo "## Environment: ✅ PASS" >> $REPORT_FILE
    fi
fi
echo "" >> $REPORT_FILE

# 5. Check for console.log in production code
echo ""
echo "📝 Checking for console.log statements..."
CONSOLE_COUNT=$(grep -r "console.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $CONSOLE_COUNT console.log statements${NC}"
    echo "## Console Statements: ⚠️  Found $CONSOLE_COUNT console.log statements" >> $REPORT_FILE
else
    echo -e "${GREEN}✅ No console.log statements found${NC}"
    echo "## Console Statements: ✅ PASS" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# 6. Check TypeScript configuration
echo ""
echo "📘 Checking TypeScript configuration..."
if grep -q '"strict": true' tsconfig.json; then
    echo -e "${GREEN}✅ TypeScript strict mode enabled${NC}"
    echo "## TypeScript: ✅ Strict mode enabled" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  TypeScript strict mode not enabled${NC}"
    echo "## TypeScript: ⚠️  Strict mode disabled" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# 7. Check for TODO/FIXME/HACK comments
echo ""
echo "📌 Checking for TODO/FIXME/HACK comments..."
TODO_COUNT=$(grep -rE "(TODO|FIXME|HACK)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . 2>/dev/null | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME/HACK comments${NC}"
    echo "## Code Comments: ⚠️  Found $TODO_COUNT TODO/FIXME/HACK comments" >> $REPORT_FILE
    grep -rE "(TODO|FIXME|HACK)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules . >> $REPORT_FILE
else
    echo -e "${GREEN}✅ No TODO/FIXME/HACK comments${NC}"
    echo "## Code Comments: ✅ PASS" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# 8. Check for exposed .env files
echo ""
echo "🔒 Checking for exposed .env files..."
if [ -f ".env" ] || [ -f ".env.production" ]; then
    echo -e "${RED}❌ Found .env files that should not be committed${NC}"
    echo "## Exposed Files: ❌ .env files found" >> $REPORT_FILE
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No exposed .env files${NC}"
    echo "## Exposed Files: ✅ PASS" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# 9. Check .gitignore
echo ""
echo "📄 Checking .gitignore configuration..."
MISSING_IGNORES=()
if ! grep -q ".env.local" .gitignore 2>/dev/null; then
    MISSING_IGNORES+=(".env.local")
fi
if ! grep -q "node_modules" .gitignore 2>/dev/null; then
    MISSING_IGNORES+=("node_modules")
fi

if [ ${#MISSING_IGNORES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  .gitignore missing: ${MISSING_IGNORES[*]}${NC}"
    echo "## .gitignore: ⚠️  Missing patterns: ${MISSING_IGNORES[*]}" >> $REPORT_FILE
else
    echo -e "${GREEN}✅ .gitignore properly configured${NC}"
    echo "## .gitignore: ✅ PASS" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# 10. Summary
echo ""
echo "=========================="
echo "📊 Audit Summary"
echo "=========================="
echo "" >> $REPORT_FILE
echo "## Summary" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No critical issues found${NC}"
    echo "✅ No critical issues found" >> $REPORT_FILE
else
    echo -e "${RED}❌ Found $ISSUES_FOUND critical issues${NC}"
    echo "❌ Found $ISSUES_FOUND critical issues" >> $REPORT_FILE
fi

echo ""
echo "📄 Full report saved to: $REPORT_FILE"
echo ""
echo "📖 For detailed security recommendations, see: SECURITY_AUDIT_REPORT.md"
echo ""

# Exit with error if issues found
if [ $ISSUES_FOUND -gt 0 ]; then
    exit 1
fi
