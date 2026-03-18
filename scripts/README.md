# Scripts

Utility scripts for the Rally app.

## Code Review Script

**File:** `code-review.sh`

### Usage

```bash
# Make sure script is executable (already done)
chmod +x scripts/code-review.sh

# Run the code review
./scripts/code-review.sh

# Or use npm script
npm run code:review
```

### What It Checks

1. **ESLint** - Code quality and style issues
2. **TypeScript** - Type checking and type safety
3. **Prettier** - Code formatting consistency
4. **Complexity** - Function complexity analysis
5. **Duplicates** - Code duplication detection
6. **Unused Exports** - Dead code detection
7. **Security** - Anti-patterns (eval, dangerouslySetInnerHTML, console.log)
8. **Code Style** - var usage, any types, console statements
9. **Accessibility** - Missing alt text, button types, form labels
10. **Build Test** - Ensures code builds successfully

### Output

Reports are saved to `code-review-reports/[timestamp]/`

Example structure:
```
code-review-reports/
└── 2026-03-13_19-30-15/
    ├── summary.md
    ├── eslint.txt
    ├── typescript.txt
    ├── prettier.txt
    ├── complexity.txt
    ├── duplicates.txt
    ├── unused-exports.txt
    └── build.txt
```

### Exit Codes

- `0` - All checks passed
- `1` - Critical issues found

### Example Output

**Successful Review:**
```bash
$ npm run code:review

🔍 Rally App Code Review
=======================

1️⃣  Running ESLint...
✅ ESLint: No issues

2️⃣  Running TypeScript type check...
✅ TypeScript: No type errors

3️⃣  Checking code formatting...
✅ Prettier: All files formatted

4️⃣  Analyzing code complexity...
ℹ️  Complexity report generated

5️⃣  Checking for duplicate code...
✅ No significant code duplication

6️⃣  Finding unused exports...
✅ No unused exports

7️⃣  Checking security patterns...
✅ No security anti-patterns found

8️⃣  Checking code style...
✅ Code style checks passed

9️⃣  Checking accessibility...
✅ No accessibility issues found

🔟  Testing build...
✅ Build successful
ℹ️  Build size: 45M

=======================
📊 Code Review Summary
=======================

✅ Perfect! No issues or warnings found

📁 Full reports saved to: code-review-reports/2026-03-13_19-30-15
✨ Code review passed!
```

### Quick Commands

```bash
# Full review
npm run code:review

# Quick check (faster)
npm run code:quick

# Just lint
npm run lint

# Just type check
npm run type-check

# Format code
npm run format
```

---

## Security Audit Script

**File:** `security-audit.sh`

### Usage

```bash
# Make sure script is executable (already done)
chmod +x scripts/security-audit.sh

# Run the security audit
./scripts/security-audit.sh

# Or use npm script
npm run security:audit
```

### What It Checks

1. **npm Packages** - Scans for vulnerable dependencies
2. **React Patterns** - Detects unsafe patterns like `dangerouslySetInnerHTML` and `eval()`
3. **Hardcoded Secrets** - Searches for API keys, tokens, passwords in code
4. **Environment Variables** - Verifies .env configuration
5. **Console Statements** - Finds console.log statements (should be removed in production)
6. **TypeScript Config** - Checks if strict mode is enabled
7. **Code Comments** - Finds TODO/FIXME/HACK comments
8. **Exposed Files** - Looks for .env files that shouldn't be committed
9. **.gitignore** - Verifies proper configuration

### Output

Reports are saved to `security-reports/audit-[timestamp].md`

Example:
```
security-reports/
├── audit-2026-03-13_19-30-15.md
├── audit-2026-03-14_10-15-30.md
└── audit-2026-03-15_14-45-00.md
```

### Exit Codes

- `0` - No critical issues found
- `1` - Critical issues found (need attention)

### Examples

**Successful Audit:**
```bash
$ npm run security:audit

🔒 Rally App Security Audit
==========================

📦 Checking npm packages for vulnerabilities...
✅ No npm vulnerabilities found

⚛️  Checking for unsafe React patterns...
✅ No unsafe React patterns found

🔑 Checking for hardcoded secrets...
✅ No obvious hardcoded secrets

🌍 Checking environment configuration...
✅ Environment variables configured

📝 Checking for console.log statements...
⚠️  Found 3 console.log statements

📘 Checking TypeScript configuration...
✅ TypeScript strict mode enabled

📌 Checking for TODO/FIXME/HACK comments...
⚠️  Found 5 TODO/FIXME/HACK comments

🔒 Checking for exposed .env files...
✅ No exposed .env files

📄 Checking .gitignore configuration...
✅ .gitignore properly configured

==========================
📊 Audit Summary
==========================
✅ No critical issues found

📄 Full report saved to: security-reports/audit-2026-03-13_19-30-15.md
```

**Failed Audit:**
```bash
$ npm run security:audit

🔒 Rally App Security Audit
==========================

📦 Checking npm packages for vulnerabilities...
❌ npm vulnerabilities found

...

==========================
📊 Audit Summary
==========================
❌ Found 2 critical issues

📄 Full report saved to: security-reports/audit-2026-03-13_19-30-15.md
```

## Integration with CI/CD

### GitHub Actions

The repository includes a GitHub Actions workflow that runs automatically.

**File:** `.github/workflows/security-audit.yml`

**When it runs:**
- Manually via GitHub Actions UI
- Weekly on Mondays at 9 AM UTC
- On pull requests to main

**To trigger manually:**
1. Go to GitHub repository
2. Click "Actions" tab
3. Select "Security Audit" workflow
4. Click "Run workflow"

### Pre-commit Hook (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running security checks before commit..."
npm run security:check

if [ $? -ne 0 ]; then
    echo "❌ Security check failed. Commit aborted."
    exit 1
fi

echo "✅ Security check passed. Proceeding with commit."
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Quick Security Check

For a faster check without the full audit:

```bash
npm run security:check
```

This runs:
1. `npm audit` - Check for vulnerable dependencies
2. `npm run lint` - Run ESLint

## Scheduling Regular Audits

### Weekly (Recommended)

Add to your calendar or create a cron job:

```bash
# Run every Monday at 9 AM
0 9 * * 1 cd /path/to/rally-app && npm run security:audit
```

### Monthly

For comprehensive reviews, run the full audit monthly and review:
- All generated reports
- Security checklist (SECURITY_CHECKLIST.md)
- Any new CVEs affecting your dependencies

## Troubleshooting

### "Permission denied" error

Make script executable:
```bash
chmod +x scripts/security-audit.sh
```

### Script not found

Run from repository root:
```bash
cd /path/to/rally-app
npm run security:audit
```

### False positives

Some warnings may be false positives. Review each finding in the report and document any exceptions in comments:

```typescript
// Security audit exception: This console.log is for debugging only
// TODO: Remove before production deployment
console.log('Debug info:', data);
```

## Additional Tools

### Dependency Updates

Check for outdated packages:
```bash
npm outdated
```

Update packages:
```bash
npm update
```

### Manual Security Review

Follow the checklist in [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md)

## Resources

- [Main Security Documentation](../SECURITY.md)
- [Security Audit Report](../SECURITY_AUDIT_REPORT.md)
- [Security Checklist](../SECURITY_CHECKLIST.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
