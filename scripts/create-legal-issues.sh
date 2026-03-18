#!/bin/bash

# Rally App - Create GitHub Issues for Legal Compliance
# Generates GitHub issues for all legal/compliance action items

set -e

echo "🔨 Creating GitHub Issues for Legal Compliance"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
    echo "Install with: brew install gh"
    echo "Then authenticate: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI ready${NC}"
echo ""

# Function to create issue if it doesn't exist
create_issue_if_not_exists() {
    local title="$1"
    local body="$2"
    local labels="$3"

    # Check if issue with this title already exists
    existing=$(gh issue list --search "in:title $title" --state all --json number --jq '.[0].number' 2>/dev/null || echo "")

    if [ -n "$existing" ]; then
        echo -e "${YELLOW}⚠️  Issue already exists: #$existing - $title${NC}"
        return 0
    fi

    # Create the issue
    issue_number=$(gh issue create --title "$title" --body "$body" --label "$labels" 2>&1 | grep -oE '#[0-9]+' | grep -oE '[0-9]+')

    if [ -n "$issue_number" ]; then
        echo -e "${GREEN}✓ Created issue #$issue_number: $title${NC}"
    else
        echo -e "${RED}❌ Failed to create: $title${NC}"
    fi
}

echo "Creating issues for CRITICAL priorities..."
echo ""

# CRITICAL ISSUE 1: Terms of Service
create_issue_if_not_exists \
    "Create Terms of Service" \
    "## Priority: 🔴 CRITICAL

**Issue:** App references Terms of Service that doesn't exist. This is required before production launch.

**Location:** \`app/signup/page.tsx:242\` references Terms that don't exist

**Legal Risk:**
- FTC violations (unfair/deceptive practices)
- No legal protection if disputes arise
- Potential user lawsuits for misrepresentation

## Requirements

- [ ] Create Terms of Service document
- [ ] Create page at \`app/terms/page.tsx\` or \`app/(legal)/terms/page.tsx\`
- [ ] Include:
  - User rights and responsibilities
  - Prohibited conduct
  - Liability limitations
  - Dispute resolution/arbitration
  - Intellectual property rights
  - Termination conditions
  - Governing law and jurisdiction
- [ ] Add \"Last Updated\" date at top
- [ ] Link from footer
- [ ] Link from signup page
- [ ] Ensure link actually works

## Approach Options

**Option 1: Use Template ($500-1,000)**
- Use service like Termly or iubenda
- Customize for your app
- Fast (1-2 days)
- Medium legal protection

**Option 2: Attorney Draft ($2,000-5,000)**
- Custom document for your needs
- Full legal review
- Slower (1-2 weeks)
- Best legal protection

**Option 3: Hybrid (RECOMMENDED) ($1,000-2,000)**
- Start with quality template
- Customize for app specifics
- Get attorney review
- Good balance of cost/speed/protection

## Resources

- [Termly Terms Generator](https://termly.io/products/terms-and-conditions-generator/)
- [iubenda Terms Generator](https://www.iubenda.com/en/terms-and-conditions-generator)
- [Docracy Free Templates](https://www.docracy.com)

## Timeline

- Template: 1-2 days
- With attorney: 1-2 weeks

## Cost Estimate

$500-5,000 depending on approach

## Related Issues

- #[PRIVACY_POLICY_ISSUE] - Privacy Policy (create together)
- Part of pre-launch compliance

## Documentation

See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 1" \
    "priority:critical,legal,documentation"

# CRITICAL ISSUE 2: Privacy Policy
create_issue_if_not_exists \
    "Create Privacy Policy (GDPR/CCPA compliant)" \
    "## Priority: 🔴 CRITICAL

**Issue:** App references Privacy Policy that doesn't exist. This is REQUIRED BY LAW (GDPR, CCPA).

**Location:** \`app/signup/page.tsx:242\` references Privacy Policy that doesn't exist

**Legal Risk:**
- GDPR violations (€20M or 4% of revenue fines)
- CCPA violations ($2,500-7,500 per violation)
- FTC enforcement actions
- No legal protection for data practices

## Requirements

- [ ] Create GDPR and CCPA compliant Privacy Policy
- [ ] Create page at \`app/privacy/page.tsx\` or \`app/(legal)/privacy/page.tsx\`
- [ ] Include ALL required sections:
  - What data is collected (email, name, username, avatar, RSVP data, comments)
  - Why data is collected (purpose for each type)
  - How data is used
  - Who data is shared with (Supabase, Google OAuth if enabled)
  - How long data is retained
  - User rights (access, deletion, export, correction)
  - Security measures
  - Cookie policy (if applicable)
  - Contact information
  - Children's privacy (COPPA - under 13)
  - International transfers
  - Changes to policy
- [ ] Add \"Last Updated\" date at top
- [ ] Link from footer
- [ ] Link from signup page
- [ ] Ensure link actually works

## Data We Collect

Based on database schema:

**User Data:**
- Email address (required)
- Full name (required)
- Username (optional)
- Password (hashed)
- User ID
- Account creation date

**Profile Data:**
- Avatar images (public)
- Profile information

**Event/RSVP Data:**
- Guest names and emails
- RSVP status
- Plus-ones count
- Event participation

**Activity Data:**
- Comments and mentions
- Notifications
- Timestamps

**Technical Data:**
- IP addresses (Supabase logs)
- Browser info
- Cookies (auth)

## Third-Party Services

Must disclose:
- Supabase (data processor - need DPA)
- Google OAuth (if enabled)
- Vercel (hosting)

## Approach Options

**Option 1: Use Generator ($200-500)**
- Use Termly or iubenda generator
- Fast (1-2 days)
- May miss app-specific details

**Option 2: Attorney Draft ($3,000-8,000)**
- Custom policy
- Full GDPR/CCPA compliance
- Slower (2-3 weeks)

**Option 3: Hybrid (RECOMMENDED) ($1,500-3,000)**
- Use quality generator
- Customize for your data practices
- Get attorney review
- Best balance

## Resources

- [Termly Privacy Generator](https://termly.io/products/privacy-policy-generator/)
- [iubenda Privacy Policy](https://www.iubenda.com/en/privacy-policy-generator)
- [GDPR Checklist](https://gdprchecklist.io)
- [CCPA Guide](https://oag.ca.gov/privacy/ccpa)

## Timeline

- Generator: 1-2 days
- With attorney: 2-3 weeks

## Cost Estimate

$200-8,000 depending on approach

## Compliance Notes

**GDPR requires:**
- Legal basis for processing
- Clear consent
- Data subject rights
- Breach notification procedures

**CCPA requires:**
- Notice at collection
- Right to know
- Right to delete
- Right to opt-out
- Do not sell disclosure

## Related Issues

- #[TERMS_ISSUE] - Terms of Service (create together)
- #[CONSENT_ISSUE] - Implement consent mechanisms
- #[DATA_DELETION_ISSUE] - Data deletion feature
- Part of pre-launch compliance

## Documentation

See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 3" \
    "priority:critical,legal,privacy,documentation"

# CRITICAL ISSUE 3: Consent Mechanisms
create_issue_if_not_exists \
    "Implement explicit consent mechanisms for data collection" \
    "## Priority: 🔴 CRITICAL

**Issue:** App collects personal data without explicit user consent (GDPR violation).

**Current State:** Signup form has text \"By signing up, you agree to our Terms of Service and Privacy Policy\" but:
- No checkbox requiring user action
- Consent is implied, not explicit
- GDPR requires opt-in, not opt-out

**Legal Risk:**
- GDPR Article 7 violation (consent requirements)
- Fines up to €20M or 4% of revenue
- Invalid consent = unlawful processing

## Requirements

### 1. Signup Page Consent
- [ ] Add checkbox (not pre-checked) on signup form
- [ ] Label: \"I agree to the [Terms of Service] and [Privacy Policy]\"
- [ ] Make checkbox required to submit form
- [ ] Links must go to actual documents (not #)
- [ ] File: \`app/signup/page.tsx\`

### 2. Data Collection Notice
- [ ] Add \"What data we collect\" disclosure near signup
- [ ] List: email, name, profile info, activity data
- [ ] Brief explanation of purpose

### 3. Optional Data Consent
- [ ] Separate consent for optional features if added:
  - Marketing emails (if implementing)
  - Analytics/tracking (if implementing)
  - Newsletter (if implementing)
- [ ] Must be separate checkboxes
- [ ] Must not be required
- [ ] Must be opt-in (not pre-checked)

### 4. Google OAuth Consent
- [ ] Add notice: \"By signing in with Google, you agree to share your email and profile with Rally\"
- [ ] Link to Google's privacy policy
- [ ] File: \`app/signup/page.tsx\`

### 5. Avatar Upload Consent
- [ ] Add notice: \"Profile pictures are publicly visible\"
- [ ] Show before user uploads
- [ ] File: \`app/profile/page.tsx\`

## Implementation Example

\`\`\`tsx
'use client';

import { useState } from 'react';

export default function SignupPage() {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSignup = (e) => {
    e.preventDefault();

    if (!agreedToTerms) {
      setError('You must agree to the Terms and Privacy Policy');
      return;
    }

    // ... rest of signup logic
  };

  return (
    <form onSubmit={handleSignup}>
      {/* ... email, password fields ... */}

      <div className=\"flex items-start gap-2\">
        <input
          type=\"checkbox\"
          id=\"terms-consent\"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          required
          className=\"mt-1\"
        />
        <label htmlFor=\"terms-consent\" className=\"text-sm\">
          I agree to the{' '}
          <a href=\"/terms\" target=\"_blank\" className=\"underline\">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href=\"/privacy\" target=\"_blank\" className=\"underline\">
            Privacy Policy
          </a>
        </label>
      </div>

      <button type=\"submit\" disabled={!agreedToTerms}>
        Sign Up
      </button>
    </form>
  );
}
\`\`\`

## GDPR Consent Requirements

Valid consent must be:
- ✅ **Freely given** - not coerced
- ✅ **Specific** - clear what you're consenting to
- ✅ **Informed** - user knows what data/purpose
- ✅ **Unambiguous** - clear affirmative action (checkbox)
- ✅ **Withdrawable** - user can revoke later

## Testing Checklist

- [ ] Checkbox starts unchecked
- [ ] Cannot submit without checking
- [ ] Links work and go to real documents
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation, screen reader)
- [ ] Error message if unchecked

## Timeline

1-2 days implementation

## Related Issues

- #[TERMS_ISSUE] - Terms of Service (must exist first)
- #[PRIVACY_ISSUE] - Privacy Policy (must exist first)

## Documentation

See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 3" \
    "priority:critical,legal,privacy,enhancement"

echo ""
echo "Creating issues for HIGH priorities..."
echo ""

# HIGH PRIORITY 1: Trademark Decision
create_issue_if_not_exists \
    "Make trademark decision: Keep 'Rally' name or rebrand?" \
    "## Priority: 🟡 HIGH

**Issue:** App name \"Rally\" has trademark conflicts with established software products.

**Primary Conflict:** Rally Software (owned by Broadcom)
- Industry: Project/organizational management software
- Overlap: Both organize people and events
- Status: Established enterprise brand with likely trademark

**Risk Level:** MEDIUM-HIGH

## The Decision

You need to choose ONE of these paths:

### Option A: Rebrand Now (RECOMMENDED) ✅

**Why rebrand:**
- Rally Software has established rights in similar space
- \"Rally\" is descriptive (weak trademark protection)
- Potential $10,000-50,000 defense costs if challenged
- Forced rebrand later = $10,000-100,000 cost
- You're pre-launch - minimal impact now

**Steps:**
1. [ ] Brainstorm alternative names (see suggestions below)
2. [ ] Check trademark availability (USPTO TESS)
3. [ ] Check domain availability
4. [ ] Check social media handles
5. [ ] Choose final name
6. [ ] Update \`package.json\` name field
7. [ ] Update branding/marketing materials
8. [ ] Update README and docs
9. [ ] File trademark application (optional but recommended)

**Cost:** $500-2,000 (domain + filing)
**Time:** 2-5 days
**Risk:** LOW (clean slate)

### Option B: Keep \"Rally\" with Mitigation ⚠️

**Why keep it:**
- Name already chosen and integrated
- You believe you can defend it
- Willing to accept risk

**Steps:**
1. [ ] Consult trademark attorney ($1,000-3,000)
2. [ ] Get formal trademark opinion letter
3. [ ] Conduct comprehensive trademark search
4. [ ] File USPTO application proactively
5. [ ] Add distinctive branding elements
6. [ ] Budget for potential defense ($10,000-50,000)
7. [ ] Consider trademark insurance

**Cost:** $2,000-5,000 upfront + ongoing risk
**Time:** 2-3 weeks for attorney process
**Risk:** MEDIUM-HIGH (possible challenge)

## Alternative Name Suggestions

### Coined/Fanciful (Strongest Protection)
- Gatherly
- Evently
- Turnly
- Mixly
- Festify
- Grouply
- Socify

### Suggestive (Good Protection)
- GatherHub
- EventFlow
- MeetSync
- GroupFlow
- SocialHub
- PartyPlan

### Creative Compounds
- GroupCal
- SocialQ
- EventKit
- MeetUp (taken)
- GatherSpace

### Nature/Action Inspired
- Flock (gathering of birds)
- Swarm
- Huddle (taken by Slack)
- Merge
- Converge

## Trademark Search Resources

- [USPTO TESS](https://tmsearch.uspto.gov) - Free US search
- [Trademarkia](https://www.trademarkia.com) - Search tool
- [WIPO Global Brand](https://www.wipo.int/branddb/) - International
- Attorney search: $500-1,500 (comprehensive)

## Domain Check

- [Namecheap](https://www.namecheap.com)
- [GoDaddy](https://www.godaddy.com)
- Expect to pay: $10-2,000 depending on domain

## Code Impact (if rebranding)

Files to update:
- \`package.json\` - \"name\" field
- \`README.md\` - All references
- \`app/layout.tsx\` - metadata title
- \`LEGAL_COMPLIANCE_REPORT.md\` - Update references
- Marketing materials
- Logo/branding assets

## Decision Timeline

**Make decision by:** End of Week 1
**Implementation:** Week 1-2 if rebranding

## Cost Comparison

| Approach | Upfront | Ongoing | Risk |
|----------|---------|---------|------|
| Rebrand now | $500-2,000 | $0 | Low |
| Keep + attorney | $2,000-5,000 | $10k-50k defense | Medium-High |
| Keep without attorney | $0 | Forced rebrand $10k-100k | High |

## Recommendation

**REBRAND NOW** while the impact is minimal. Choose a distinctive, protectable name that won't have legal issues as you scale.

## Related Issues

- Part of pre-launch compliance

## Documentation

See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 2" \
    "priority:high,legal,decision"

# HIGH PRIORITY 2: Data Deletion
create_issue_if_not_exists \
    "Implement account deletion and data erasure (GDPR Right to Erasure)" \
    "## Priority: 🟡 HIGH

**Issue:** Users have no way to delete their account or data (GDPR violation).

**Legal Requirement:**
- GDPR Article 17: Right to Erasure (\"Right to be Forgotten\")
- CCPA: Right to Delete
- Required by law if you have EU or California users

**Current State:** No deletion functionality exists

## Requirements

### 1. Account Deletion UI
- [ ] Add \"Delete Account\" button to settings/profile page
- [ ] Location: \`app/profile/page.tsx\` or new \`app/settings/page.tsx\`
- [ ] Show warning: \"This action is permanent and cannot be undone\"
- [ ] Require password confirmation
- [ ] Add \"Are you sure?\" confirmation dialog

### 2. Data Deletion Logic
- [ ] Create server action: \`lib/actions/account-actions.ts\`
- [ ] Delete from tables in order:
  1. \`notifications\` (user_id foreign key)
  2. \`event_comments\` (user_id foreign key)
  3. \`rsvps\` (user_id foreign key)
  4. \`events\` where \`host_id = user_id\` (or reassign?)
  5. \`profiles\` (user_id = auth user id)
  6. \`auth.users\` (Supabase auth)
- [ ] Delete user's avatar from storage
- [ ] Handle edge cases:
  - What happens to events user hosted?
  - What happens to comments user made?
  - What about RSVP history?

### 3. Deletion Policy Decision

**Option A: Hard Delete (Recommended for GDPR)**
- Delete all user data completely
- Events hosted get deleted too
- Comments get deleted
- RSVPs get deleted
- Clean slate

**Option B: Soft Delete / Anonymization**
- Mark user as deleted
- Keep events but mark as \"[Deleted User]\"
- Keep comments but anonymize
- Maintains data integrity but may not satisfy GDPR

**Decision needed:** Which approach?

### 4. Deletion Confirmation
- [ ] Send confirmation email after deletion
- [ ] Show success message before logout
- [ ] Redirect to homepage after deletion
- [ ] Log deletion for audit trail

### 5. Retention Policy
- [ ] Document how long deleted data is kept (if at all)
- [ ] Backups: How long until user data removed from backups?
- [ ] Add to Privacy Policy

## Implementation Example

\`\`\`typescript
// lib/actions/account-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function deleteAccount(password: string) {
  const supabase = await createClient();

  // 1. Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  // 2. Verify password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: password,
  });
  if (signInError) {
    return { error: 'Invalid password' };
  }

  // 3. Delete user data in order
  try {
    // Delete notifications
    await supabase.from('notifications').delete().eq('user_id', user.id);

    // Delete comments
    await supabase.from('event_comments').delete().eq('user_id', user.id);

    // Delete RSVPs
    await supabase.from('rsvps').delete().eq('user_id', user.id);

    // Delete or reassign events
    await supabase.from('events').delete().eq('host_id', user.id);
    // OR: Update to mark as deleted
    // await supabase.from('events').update({ host_id: null }).eq('host_id', user.id);

    // Delete profile
    await supabase.from('profiles').delete().eq('id', user.id);

    // Delete avatar from storage
    const { data: files } = await supabase.storage
      .from('avatars')
      .list(user.id);

    if (files && files.length > 0) {
      const filePaths = files.map(file => \`\${user.id}/\${file.name}\`);
      await supabase.storage.from('avatars').remove(filePaths);
    }

    // 4. Delete auth user (this signs them out)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return { error: 'Failed to delete account' };
  }
}
\`\`\`

## UI Implementation

\`\`\`tsx
// app/settings/page.tsx
'use client';

import { useState } from 'react';
import { deleteAccount } from '@/lib/actions/account-actions';

export default function SettingsPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleDelete = async () => {
    const result = await deleteAccount(password);
    if (result.error) {
      setError(result.error);
    } else {
      // Redirect to homepage with message
      window.location.href = '/?deleted=true';
    }
  };

  return (
    <div>
      <h1>Account Settings</h1>

      {/* Other settings */}

      <div className=\"border-t border-red-500 pt-6 mt-6\">
        <h2 className=\"text-red-500\">Danger Zone</h2>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className=\"bg-red-500 hover:bg-red-600\"
        >
          Delete Account
        </button>

        {showDeleteConfirm && (
          <div className=\"modal\">
            <h3>Delete Account?</h3>
            <p>This will permanently delete:</p>
            <ul>
              <li>Your profile and avatar</li>
              <li>All events you created</li>
              <li>All your RSVPs</li>
              <li>All your comments</li>
            </ul>
            <p className=\"font-bold\">This action cannot be undone!</p>

            <input
              type=\"password\"
              placeholder=\"Enter your password to confirm\"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className=\"text-red-500\">{error}</p>}

            <button onClick={handleDelete}>
              Yes, delete my account
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
\`\`\`

## Testing Checklist

- [ ] Password validation works
- [ ] All user data deleted from database
- [ ] Avatar files deleted from storage
- [ ] User logged out after deletion
- [ ] Cannot login with deleted account
- [ ] Confirmation email sent
- [ ] No orphaned data left behind
- [ ] RLS policies prevent accessing deleted user data

## Privacy Policy Update

Add to Privacy Policy:
> **Your Rights:**
> You have the right to request deletion of your personal data. To delete your account and all associated data, go to Settings > Delete Account. This action is permanent and cannot be undone. We will delete your data within 30 days, though some data may persist in backups for up to 90 days.

## Timeline

2-3 days implementation + testing

## Cost Estimate

Development time only (no external cost)

## Related Issues

- #[PRIVACY_ISSUE] - Privacy Policy (document this right)
- #[DATA_EXPORT_ISSUE] - Data export feature

## Documentation

See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 3" \
    "priority:high,legal,privacy,enhancement"

# HIGH PRIORITY 3: Supabase DPA
create_issue_if_not_exists \
    "Execute Data Processing Agreement (DPA) with Supabase" \
    "## Priority: 🟡 HIGH

**Issue:** Supabase processes user data but no Data Processing Agreement (DPA) is executed.

**Legal Requirement:**
- GDPR Article 28: Contract with data processors
- Required for ALL third-party services that process personal data
- Supabase is a \"data processor\", you are \"data controller\"

**Current State:** No DPA executed

## What is a DPA?

A Data Processing Agreement defines:
- What data the processor handles
- How they process it
- Security measures
- Data subject rights
- Sub-processors
- Data breach notification
- Liability and indemnification

## Why Required?

- ✅ GDPR legal requirement
- ✅ Clarifies responsibilities
- ✅ Protects both parties
- ✅ Shows due diligence
- ✅ Required for compliance audits

## How to Execute Supabase DPA

**Good news:** Supabase offers a DPA for free!

### Steps:

1. [ ] Log into Supabase dashboard: https://supabase.com/dashboard
2. [ ] Go to your project
3. [ ] Navigate to: Settings > Legal
4. [ ] Find \"Data Processing Agreement\" section
5. [ ] Review the DPA terms
6. [ ] Click \"Accept\" or \"Sign DPA\"
7. [ ] Download signed copy for records
8. [ ] Save to \`legal-docs/supabase-dpa.pdf\` (don't commit to git)

**Time:** 10 minutes
**Cost:** FREE

### Alternative: Email Process

If no DPA in dashboard:
1. [ ] Email Supabase support: support@supabase.com
2. [ ] Request DPA for GDPR compliance
3. [ ] They'll send standard DPA
4. [ ] Review and sign
5. [ ] Return signed copy

## What the DPA Should Cover

- ✅ Data processing scope
- ✅ Security measures (Supabase has SOC 2 Type II)
- ✅ Sub-processors (AWS, etc.)
- ✅ Data breach notification (24-48 hours)
- ✅ Data deletion on termination
- ✅ Audit rights
- ✅ International data transfers
- ✅ Compliance with data protection laws

## Privacy Policy Update

After executing DPA, update Privacy Policy to mention:

> **Third-Party Services:**
>
> We use Supabase to provide our database, authentication, and storage infrastructure. Supabase processes your data on our behalf under a Data Processing Agreement that ensures your data is protected according to GDPR and other data protection laws.
>
> For more information about Supabase's security practices, see: https://supabase.com/security

## Documentation to Keep

- [ ] Signed DPA (PDF)
- [ ] Date executed
- [ ] Copy in secure location (not in git repo)
- [ ] Note in internal compliance docs

## Other Services to Consider

Do you use any of these? If yes, get DPAs:

- [ ] Vercel (hosting) - Has DPA available
- [ ] Google OAuth - Covered by Google Cloud agreement
- [ ] Analytics service - If you add one later
- [ ] Email service - If you add one later
- [ ] Error monitoring - If you add Sentry/etc

## Verification

- [ ] DPA signed with Supabase
- [ ] Copy saved securely
- [ ] Privacy Policy updated
- [ ] List all data processors in Privacy Policy
- [ ] Document review date for annual check

## Timeline

15-30 minutes (mostly reading)

## Cost

$0 (FREE with Supabase)

## Related Issues

- #[PRIVACY_ISSUE] - Privacy Policy (document this)
- Part of GDPR compliance

## Documentation

See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 4" \
    "priority:high,legal,privacy,admin"

echo ""
echo "Creating issues for MEDIUM priorities..."
echo ""

# MEDIUM PRIORITY: Data Export
create_issue_if_not_exists \
    "Implement data export/download (GDPR Right to Data Portability)" \
    "## Priority: 🟢 MEDIUM

**Issue:** Users cannot export/download their data (GDPR violation).

**Legal Requirement:**
- GDPR Article 20: Right to Data Portability
- CCPA: Right to Know
- Users must be able to receive copy of their data

**Current State:** No export functionality

## Requirements

### 1. Export UI
- [ ] Add \"Download My Data\" button to settings/profile
- [ ] Show what data will be included
- [ ] Generate data in machine-readable format (JSON)
- [ ] Provide download link

### 2. Data to Include
- [ ] User profile (email, name, username)
- [ ] Account info (created date, updated date)
- [ ] Events created (with all details)
- [ ] RSVPs made (with event info)
- [ ] Comments posted
- [ ] Notifications received

### 3. Export Format
- [ ] JSON format (machine-readable)
- [ ] Include metadata (export date, data types)
- [ ] Organized by data type
- [ ] Include explanatory README

### 4. Implementation
- [ ] Server action: \`lib/actions/export-data.ts\`
- [ ] Query all user data from Supabase
- [ ] Format as structured JSON
- [ ] Generate download or email link

### Timeline
2-3 days

### Related Issues
- #[PRIVACY_ISSUE] - Document in Privacy Policy

## Documentation
See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 3" \
    "priority:medium,legal,privacy,enhancement"

# MEDIUM PRIORITY: Age Verification
create_issue_if_not_exists \
    "Add age verification to comply with COPPA" \
    "## Priority: 🟢 MEDIUM

**Issue:** No age verification (COPPA requires parental consent for under 13).

**Legal Requirement:**
- COPPA: Cannot collect data from users under 13 without parental consent
- Terms should specify minimum age

## Requirements

- [ ] Add age requirement to Terms (13+ or 18+)
- [ ] Add checkbox on signup: \"I am at least 13 years old\"
- [ ] Make required to submit
- [ ] Consider age gate if needed

### Timeline
1 day

## Documentation
See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 7" \
    "priority:medium,legal,enhancement"

# MEDIUM PRIORITY: Accessibility Audit
create_issue_if_not_exists \
    "Conduct WCAG 2.1 AA accessibility audit" \
    "## Priority: 🟢 MEDIUM

**Issue:** Accessibility compliance unknown (ADA Title III applies to public websites).

**Legal Requirement:**
- ADA Title III for public accommodations
- Section 508 for government use
- WCAG 2.1 AA recommended standard

## Requirements

- [ ] Run Lighthouse accessibility audit
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Verify keyboard navigation works
- [ ] Check color contrast (min 4.5:1)
- [ ] Add ARIA labels where needed
- [ ] Test with accessibility tools
- [ ] Create accessibility statement

### Cost
$2,000-5,000 for professional audit

### Timeline
1 week

## Documentation
See [LEGAL_COMPLIANCE_REPORT.md](../LEGAL_COMPLIANCE_REPORT.md) Section 6" \
    "priority:medium,accessibility,enhancement"

echo ""
echo "=============================================="
echo -e "${GREEN}✓ Issue creation complete${NC}"
echo ""
echo "View issues: gh issue list --label legal"
echo "Or visit: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/issues"
echo ""
