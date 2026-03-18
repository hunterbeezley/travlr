#!/bin/bash

# Rally App - Legal & Compliance Audit Script
# Run this script to perform a comprehensive legal/compliance audit locally

set -e

echo "⚖️  Rally App Legal & Compliance Audit"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0

# Create reports directory
mkdir -p legal-reports
REPORT_DATE=$(date +%Y-%m-%d_%H-%M-%S)
REPORT_FILE="legal-reports/compliance-audit-$REPORT_DATE.md"

echo "# Legal & Compliance Audit Report" > $REPORT_FILE
echo "Generated: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 1: REQUIRED LEGAL DOCUMENTS
# ============================================================================

echo "📄 Section 1: Required Legal Documents"
echo "========================================"
echo "" >> $REPORT_FILE
echo "## 1. Required Legal Documents" >> $REPORT_FILE
echo "" >> $REPORT_FILE

MISSING_DOCS=0

# Check for Terms of Service
echo -n "Checking for Terms of Service... "
if [ -f "app/terms/page.tsx" ] || [ -f "app/(legal)/terms/page.tsx" ] || [ -f "public/terms.html" ]; then
    echo -e "${GREEN}✅ Found${NC}"
    echo "- Terms of Service: ✅ EXISTS" >> $REPORT_FILE
else
    echo -e "${RED}❌ MISSING (CRITICAL)${NC}"
    echo "- Terms of Service: ❌ MISSING - **CRITICAL** Required before launch" >> $REPORT_FILE
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    MISSING_DOCS=$((MISSING_DOCS + 1))
fi

# Check for Privacy Policy
echo -n "Checking for Privacy Policy... "
if [ -f "app/privacy/page.tsx" ] || [ -f "app/(legal)/privacy/page.tsx" ] || [ -f "public/privacy.html" ]; then
    echo -e "${GREEN}✅ Found${NC}"
    echo "- Privacy Policy: ✅ EXISTS" >> $REPORT_FILE
else
    echo -e "${RED}❌ MISSING (CRITICAL)${NC}"
    echo "- Privacy Policy: ❌ MISSING - **CRITICAL** Required by GDPR/CCPA" >> $REPORT_FILE
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    MISSING_DOCS=$((MISSING_DOCS + 1))
fi

# Check if legal docs are referenced but don't exist
echo -n "Checking for false legal document references... "
if grep -rq "Terms of Service\|Privacy Policy" app/ components/ 2>/dev/null; then
    if [ $MISSING_DOCS -gt 0 ]; then
        echo -e "${RED}❌ DECEPTIVE (CRITICAL)${NC}"
        echo "- False References: ❌ **CRITICAL** - App references legal docs that don't exist (FTC violation)" >> $REPORT_FILE
        echo "  - Found in: $(grep -rl "Terms of Service\|Privacy Policy" app/ components/ 2>/dev/null | head -3 | tr '\n' ', ' | sed 's/,$//')" >> $REPORT_FILE
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    else
        echo -e "${GREEN}✅ Valid references${NC}"
        echo "- Legal References: ✅ Documents exist and are properly linked" >> $REPORT_FILE
    fi
else
    echo -e "${YELLOW}⚠️  No references found${NC}"
    echo "- Legal References: ⚠️  No references to legal docs found (add to footer/signup)" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 2: PRIVACY & DATA PROTECTION COMPLIANCE
# ============================================================================

echo ""
echo "🔒 Section 2: Privacy & Data Protection"
echo "========================================="
echo "" >> $REPORT_FILE
echo "## 2. Privacy & Data Protection Compliance" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for consent mechanisms
echo -n "Checking for data collection consent... "
if grep -rq "consent\|agree to\|I accept" app/ components/ 2>/dev/null; then
    echo -e "${GREEN}✅ Found consent mechanism${NC}"
    echo "- Consent Mechanism: ✅ Found in codebase" >> $REPORT_FILE
else
    echo -e "${RED}❌ MISSING (CRITICAL)${NC}"
    echo "- Consent Mechanism: ❌ **CRITICAL** - No consent for data collection (GDPR violation)" >> $REPORT_FILE
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

# Check for data deletion functionality
echo -n "Checking for account/data deletion... "
if grep -rq "delete.*account\|deleteUser\|removeAccount" app/ components/ lib/ 2>/dev/null; then
    echo -e "${GREEN}✅ Found deletion mechanism${NC}"
    echo "- Data Deletion: ✅ Account deletion functionality exists" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  MISSING (HIGH)${NC}"
    echo "- Data Deletion: ❌ **HIGH** - No data deletion mechanism (GDPR right to erasure)" >> $REPORT_FILE
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
fi

# Check for data export functionality
echo -n "Checking for data export/download... "
if grep -rq "export.*data\|download.*data\|data.*portability" app/ components/ lib/ 2>/dev/null; then
    echo -e "${GREEN}✅ Found export mechanism${NC}"
    echo "- Data Export: ✅ Data export functionality exists" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  MISSING (HIGH)${NC}"
    echo "- Data Export: ❌ **HIGH** - No data export (GDPR right to data portability)" >> $REPORT_FILE
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
fi

# Check for age verification
echo -n "Checking for age verification (COPPA)... "
if grep -rq "age.*13\|age.*18\|birthday\|date.*birth" app/signup/ app/login/ 2>/dev/null; then
    echo -e "${GREEN}✅ Found age check${NC}"
    echo "- Age Verification: ✅ Age verification implemented" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  MISSING (MEDIUM)${NC}"
    echo "- Age Verification: ⚠️  **MEDIUM** - No age verification (COPPA compliance if <13 users)" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 3: TRADEMARK & INTELLECTUAL PROPERTY
# ============================================================================

echo ""
echo "™️  Section 3: Trademark & Intellectual Property"
echo "================================================"
echo "" >> $REPORT_FILE
echo "## 3. Trademark & Intellectual Property" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check app name in package.json
echo -n "Checking application name... "
APP_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*"name": "\(.*\)".*/\1/')
echo -e "${BLUE}App name: $APP_NAME${NC}"
echo "- Application Name: \`$APP_NAME\`" >> $REPORT_FILE

if [ "$APP_NAME" = "rally-app" ] || [ "$APP_NAME" = "rally" ]; then
    echo -e "${YELLOW}⚠️  TRADEMARK RISK (HIGH)${NC}"
    echo "  - Trademark Risk: ⚠️  **HIGH** - 'Rally' conflicts with Rally Software (Broadcom)" >> $REPORT_FILE
    echo "  - Recommendation: Consider trademark search and legal consultation" >> $REPORT_FILE
    echo "  - See LEGAL_COMPLIANCE_REPORT.md Section 2 for detailed analysis" >> $REPORT_FILE
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
else
    echo -e "${GREEN}✅ Name appears unique${NC}"
    echo "  - Trademark Risk: ✅ Name does not match known conflicts" >> $REPORT_FILE
    echo "  - Note: Still recommend trademark search before launch" >> $REPORT_FILE
fi

# Check for copyright notices
echo -n "Checking for copyright notices... "
if grep -rq "Copyright\|©\|All rights reserved" app/ components/ public/ 2>/dev/null; then
    echo -e "${GREEN}✅ Found copyright notices${NC}"
    echo "- Copyright Notices: ✅ Copyright protection claimed" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  No copyright notices (MEDIUM)${NC}"
    echo "- Copyright Notices: ⚠️  **MEDIUM** - Consider adding copyright footer" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi

# Check for LICENSE file
echo -n "Checking for LICENSE file... "
if [ -f "LICENSE" ] || [ -f "LICENSE.md" ] || [ -f "LICENSE.txt" ]; then
    LICENSE_TYPE=$(head -5 LICENSE 2>/dev/null | grep -i "MIT\|Apache\|GPL\|BSD" || echo "Custom")
    echo -e "${GREEN}✅ Found: $LICENSE_TYPE${NC}"
    echo "- Software License: ✅ LICENSE file exists (\`$LICENSE_TYPE\`)" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  No LICENSE file (LOW)${NC}"
    echo "- Software License: ⚠️  **LOW** - No LICENSE file (add if open source)" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 4: THIRD-PARTY SERVICES & DATA PROCESSORS
# ============================================================================

echo ""
echo "🔗 Section 4: Third-Party Services & Processors"
echo "================================================"
echo "" >> $REPORT_FILE
echo "## 4. Third-Party Services & Data Processors" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for Supabase usage
echo -n "Checking for Supabase (data processor)... "
if grep -q "supabase" package.json 2>/dev/null; then
    echo -e "${YELLOW}⚠️  REQUIRES DPA (HIGH)${NC}"
    echo "- Supabase: ⚠️  **HIGH** - Data processor identified" >> $REPORT_FILE
    echo "  - Required: Execute Data Processing Agreement (DPA)" >> $REPORT_FILE
    echo "  - Required: Disclose in Privacy Policy" >> $REPORT_FILE
    echo "  - Action: Visit Supabase dashboard to sign DPA" >> $REPORT_FILE
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
fi

# Check for Google OAuth
echo -n "Checking for Google OAuth... "
if grep -rq "google.*oauth\|signInWithOAuth.*google" app/ lib/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  REQUIRES DISCLOSURE (MEDIUM)${NC}"
    echo "- Google OAuth: ⚠️  **MEDIUM** - Third-party authentication detected" >> $REPORT_FILE
    echo "  - Required: Disclose data sharing with Google in Privacy Policy" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi

# Check for analytics services
echo -n "Checking for analytics/tracking... "
ANALYTICS_FOUND=0
for service in "google-analytics" "gtag" "mixpanel" "segment" "amplitude" "posthog" "plausible" "fathom"; do
    if grep -rq "$service" app/ components/ package.json 2>/dev/null; then
        echo -e "${YELLOW}⚠️  REQUIRES CONSENT (HIGH)${NC}"
        echo "- Analytics: ⚠️  **HIGH** - Analytics service detected (\`$service\`)" >> $REPORT_FILE
        echo "  - Required: Cookie consent banner" >> $REPORT_FILE
        echo "  - Required: Cookie policy" >> $REPORT_FILE
        echo "  - Required: Opt-out mechanism" >> $REPORT_FILE
        HIGH_ISSUES=$((HIGH_ISSUES + 1))
        ANALYTICS_FOUND=1
        break
    fi
done

if [ $ANALYTICS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ None detected${NC}"
    echo "- Analytics: ✅ No analytics services detected (add cookie policy if adding later)" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 5: CONTENT & USER-GENERATED CONTENT
# ============================================================================

echo ""
echo "💬 Section 5: Content & User-Generated Content"
echo "==============================================="
echo "" >> $REPORT_FILE
echo "## 5. Content & User-Generated Content" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for content upload functionality
echo -n "Checking for user content uploads... "
if grep -rq "upload\|file.*input\|avatar\|image" app/ components/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  REQUIRES POLICY (MEDIUM)${NC}"
    echo "- User Uploads: ⚠️  **MEDIUM** - File upload functionality detected" >> $REPORT_FILE
    echo "  - Required: Content policy in Terms of Service" >> $REPORT_FILE
    echo "  - Required: DMCA takedown procedures" >> $REPORT_FILE
    echo "  - Recommended: Content moderation system" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
else
    echo -e "${GREEN}✅ No uploads detected${NC}"
    echo "- User Uploads: ✅ No file upload functionality detected" >> $REPORT_FILE
fi

# Check for comment/UGC functionality
echo -n "Checking for comments/user content... "
if grep -rq "comment\|post\|message" app/ components/ database/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  REQUIRES POLICY (MEDIUM)${NC}"
    echo "- User Content: ⚠️  **MEDIUM** - User-generated content detected" >> $REPORT_FILE
    echo "  - Required: Acceptable use policy" >> $REPORT_FILE
    echo "  - Required: Content moderation policy" >> $REPORT_FILE
    echo "  - Recommended: Reporting/flagging mechanism" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi

# Check for reporting mechanism
echo -n "Checking for content reporting... "
if grep -rq "report\|flag\|abuse" app/ components/ 2>/dev/null; then
    echo -e "${GREEN}✅ Reporting mechanism found${NC}"
    echo "- Content Reporting: ✅ Reporting mechanism implemented" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  No reporting found (LOW)${NC}"
    echo "- Content Reporting: ⚠️  **LOW** - No user reporting mechanism" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 6: ACCESSIBILITY COMPLIANCE
# ============================================================================

echo ""
echo "♿ Section 6: Accessibility Compliance"
echo "======================================"
echo "" >> $REPORT_FILE
echo "## 6. Accessibility Compliance (ADA/WCAG)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for ARIA labels
echo -n "Checking for ARIA labels... "
if grep -rq "aria-label\|aria-describedby\|aria-" app/ components/ 2>/dev/null; then
    ARIA_COUNT=$(grep -ro "aria-" app/ components/ 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Found $ARIA_COUNT ARIA attributes${NC}"
    echo "- ARIA Labels: ✅ Found $ARIA_COUNT ARIA attributes" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  No ARIA labels (MEDIUM)${NC}"
    echo "- ARIA Labels: ⚠️  **MEDIUM** - No ARIA labels found (consider accessibility audit)" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi

# Check for alt text on images
echo -n "Checking for image alt text... "
if grep -rq "alt=" app/ components/ 2>/dev/null; then
    ALT_COUNT=$(grep -ro "alt=" app/ components/ 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Found $ALT_COUNT alt attributes${NC}"
    echo "- Image Alt Text: ✅ Found $ALT_COUNT alt attributes" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  No alt text found (MEDIUM)${NC}"
    echo "- Image Alt Text: ⚠️  **MEDIUM** - No alt text on images" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
fi

# Check for semantic HTML
echo -n "Checking for semantic HTML... "
if grep -rq "<nav\|<header\|<main\|<footer\|<article\|<section" app/ components/ 2>/dev/null; then
    echo -e "${GREEN}✅ Semantic HTML found${NC}"
    echo "- Semantic HTML: ✅ Using semantic HTML elements" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  Limited semantic HTML (LOW)${NC}"
    echo "- Semantic HTML: ⚠️  **LOW** - Limited semantic HTML (improve structure)" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "**Note:** Full WCAG 2.1 AA audit recommended before launch (automated tests limited)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 7: EMAIL & COMMUNICATIONS COMPLIANCE
# ============================================================================

echo ""
echo "📧 Section 7: Email & Communications"
echo "====================================="
echo "" >> $REPORT_FILE
echo "## 7. Email & Communications Compliance" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for email functionality
echo -n "Checking for email sending... "
if grep -rq "sendEmail\|email.*send\|notification.*email" app/ lib/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️  REQUIRES COMPLIANCE (MEDIUM)${NC}"
    echo "- Email Sending: ⚠️  **MEDIUM** - Email functionality detected" >> $REPORT_FILE
    echo "  - Required: Unsubscribe links (CAN-SPAM)" >> $REPORT_FILE
    echo "  - Required: Physical address in emails" >> $REPORT_FILE
    echo "  - Required: Honor opt-outs within 10 days" >> $REPORT_FILE
    MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
else
    echo -e "${GREEN}✅ No custom email sending${NC}"
    echo "- Email Sending: ✅ No custom email sending detected (Supabase auth emails are compliant)" >> $REPORT_FILE
fi

# Check for unsubscribe mechanism
echo -n "Checking for unsubscribe functionality... "
if grep -rq "unsubscribe\|opt.*out\|email.*preference" app/ lib/ 2>/dev/null; then
    echo -e "${GREEN}✅ Found unsubscribe mechanism${NC}"
    echo "- Unsubscribe: ✅ Unsubscribe mechanism found" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  No unsubscribe found (prepare for future)${NC}"
    echo "- Unsubscribe: ⚠️  Add before sending marketing/notification emails" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 8: JURISDICTIONAL COMPLIANCE
# ============================================================================

echo ""
echo "🌍 Section 8: Jurisdictional Compliance"
echo "========================================"
echo "" >> $REPORT_FILE
echo "## 8. Jurisdictional & International Compliance" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for geographic restrictions
echo -n "Checking for geo-restrictions... "
if grep -rq "geo.*block\|country.*restrict\|region.*restrict" app/ lib/ middleware.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Geographic controls found${NC}"
    echo "- Geographic Controls: ✅ Some geographic restrictions implemented" >> $REPORT_FILE
else
    echo -e "${BLUE}ℹ️  Available globally${NC}"
    echo "- Geographic Controls: ℹ️  No restrictions (available globally)" >> $REPORT_FILE
    echo "  - Implication: Must comply with GDPR, CCPA, and other global regulations" >> $REPORT_FILE
    echo "  - Recommendation: Implement GDPR compliance as baseline" >> $REPORT_FILE
fi

# Check for jurisdiction in Terms
echo -n "Checking for jurisdiction clauses... "
if [ -f "app/terms/page.tsx" ] || [ -f "app/(legal)/terms/page.tsx" ]; then
    if grep -rq "governing law\|jurisdiction\|venue" app/terms/ app/\(legal\)/terms/ 2>/dev/null; then
        echo -e "${GREEN}✅ Jurisdiction specified${NC}"
        echo "- Jurisdiction: ✅ Governing law/jurisdiction specified in Terms" >> $REPORT_FILE
    else
        echo -e "${YELLOW}⚠️  No jurisdiction specified (MEDIUM)${NC}"
        echo "- Jurisdiction: ⚠️  **MEDIUM** - Add governing law and jurisdiction to Terms" >> $REPORT_FILE
        MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
    fi
else
    echo -e "${RED}❌ No Terms to check${NC}"
    echo "- Jurisdiction: ❌ Cannot verify (Terms of Service missing)" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 9: DEVELOPMENT ARTIFACTS & DISCLOSURE
# ============================================================================

echo ""
echo "🔍 Section 9: Development Artifacts"
echo "===================================="
echo "" >> $REPORT_FILE
echo "## 9. Development Artifacts & Disclosures" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check for exposed secrets
echo -n "Checking for exposed credentials... "
if [ -f ".env" ] || [ -f ".env.production" ]; then
    echo -e "${RED}❌ EXPOSED SECRETS (CRITICAL)${NC}"
    echo "- Exposed Secrets: ❌ **CRITICAL** - .env files found (should be in .gitignore)" >> $REPORT_FILE
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
elif grep -rE "(password|secret|api_key|token)[\s]*=[\s]*['\"][^'\"]+['\"]" app/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "NEXT_PUBLIC"; then
    echo -e "${YELLOW}⚠️  Hardcoded credentials found${NC}"
    echo "- Hardcoded Credentials: ⚠️  **HIGH** - Review and remove hardcoded secrets" >> $REPORT_FILE
    HIGH_ISSUES=$((HIGH_ISSUES + 1))
else
    echo -e "${GREEN}✅ No obvious exposure${NC}"
    echo "- Credentials: ✅ No obvious credential exposure" >> $REPORT_FILE
fi

# Check for debug/development code
echo -n "Checking for debug code... "
DEBUG_COUNT=$(grep -r "console.log\|debugger\|TODO\|FIXME" app/ components/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ $DEBUG_COUNT -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Found $DEBUG_COUNT debug statements (LOW)${NC}"
    echo "- Debug Code: ⚠️  **LOW** - Found $DEBUG_COUNT debug/dev statements (clean up for production)" >> $REPORT_FILE
elif [ $DEBUG_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ Minimal ($DEBUG_COUNT statements)${NC}"
    echo "- Debug Code: ✅ Minimal debug code found ($DEBUG_COUNT statements)" >> $REPORT_FILE
else
    echo -e "${GREEN}✅ Clean${NC}"
    echo "- Debug Code: ✅ No debug code found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# ============================================================================
# SECTION 10: SUMMARY & RECOMMENDATIONS
# ============================================================================

echo ""
echo "========================================"
echo "📊 Compliance Audit Summary"
echo "========================================"
echo "" >> $REPORT_FILE
echo "## Summary & Risk Assessment" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Calculate overall status
TOTAL_ISSUES=$((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES))

echo -e "Critical Issues: ${RED}$CRITICAL_ISSUES${NC}"
echo -e "High Priority:   ${YELLOW}$HIGH_ISSUES${NC}"
echo -e "Medium Priority: ${BLUE}$MEDIUM_ISSUES${NC}"
echo ""

echo "### Issue Breakdown:" >> $REPORT_FILE
echo "- 🔴 **Critical Issues:** $CRITICAL_ISSUES (must fix before launch)" >> $REPORT_FILE
echo "- 🟡 **High Priority:** $HIGH_ISSUES (should fix before launch)" >> $REPORT_FILE
echo "- 🟢 **Medium Priority:** $MEDIUM_ISSUES (fix soon after launch)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Determine production readiness
if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo -e "${RED}❌ NOT PRODUCTION READY${NC}"
    echo "### Production Readiness: ❌ **NOT READY**" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**Critical blockers must be resolved before public launch.**" >> $REPORT_FILE
    EXIT_CODE=1
elif [ $HIGH_ISSUES -gt 3 ]; then
    echo -e "${YELLOW}⚠️  PRODUCTION READY WITH RISKS${NC}"
    echo "### Production Readiness: ⚠️  **READY WITH RISKS**" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**High priority issues should be addressed before launch to reduce legal risk.**" >> $REPORT_FILE
    EXIT_CODE=1
else
    echo -e "${GREEN}✅ PRODUCTION READY (with minor issues)${NC}"
    echo "### Production Readiness: ✅ **READY**" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    echo "**Minor issues can be addressed post-launch, but should be prioritized.**" >> $REPORT_FILE
    EXIT_CODE=0
fi

echo "" >> $REPORT_FILE
echo "### Recommendations:" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo "1. **Immediate Action:** Create Terms of Service and Privacy Policy (templates: $500-1,000)" >> $REPORT_FILE
    echo "2. **Legal Review:** Consult attorney for document review ($2,000-5,000)" >> $REPORT_FILE
    echo "3. **Compliance Implementation:** Add consent mechanisms and data subject rights (1-2 weeks)" >> $REPORT_FILE
fi

if [ $HIGH_ISSUES -gt 0 ]; then
    echo "4. **Trademark Decision:** Resolve trademark risk within 1 week" >> $REPORT_FILE
    echo "5. **Vendor Agreements:** Execute Data Processing Agreement with Supabase" >> $REPORT_FILE
    echo "6. **Privacy Features:** Implement data deletion and export (1 week)" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "### Next Steps:" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "1. Review full report: \`LEGAL_COMPLIANCE_REPORT.md\`" >> $REPORT_FILE
echo "2. Prioritize critical issues (estimated 2-3 weeks to resolve)" >> $REPORT_FILE
echo "3. Consider legal consultation before launch" >> $REPORT_FILE
echo "4. Implement privacy compliance features" >> $REPORT_FILE
echo "5. Create comprehensive legal documents" >> $REPORT_FILE
echo "6. Re-run this audit before production deployment" >> $REPORT_FILE
echo "" >> $REPORT_FILE

echo "📄 Full report saved to: $REPORT_FILE"
echo ""
echo "📖 For detailed analysis and recommendations, see: LEGAL_COMPLIANCE_REPORT.md"
echo ""

# Exit with error if critical issues found
exit $EXIT_CODE
