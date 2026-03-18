# Legal & Compliance Checklist

**Quick reference for legal compliance before production launch.**

## 🚨 Pre-Launch Critical Checklist

Use this checklist before deploying to production. All items marked 🔴 are **CRITICAL** and must be complete.

### Legal Documents 🔴 CRITICAL

- [ ] **Terms of Service created** - Required for legal protection
  - Location: `app/terms/page.tsx` or `app/(legal)/terms/page.tsx`
  - Must include: User rights, prohibited conduct, liability limitations, dispute resolution
  - Template cost: $500-1,000 | Attorney: $2,000-5,000

- [ ] **Privacy Policy created** - Required by law (GDPR/CCPA)
  - Location: `app/privacy/page.tsx` or `app/(legal)/privacy/page.tsx`
  - Must include: Data collected, usage, sharing, retention, user rights
  - Must be GDPR and CCPA compliant
  - Template cost: $500-1,000 | Attorney: $2,000-5,000

- [ ] **Legal docs linked from app** - Footer, signup page, profile page
  - Check: Signup page references them
  - Check: Footer has links to both
  - Check: Links actually work

- [ ] **Last updated dates added** - All legal docs must have dates
  - Add prominent "Last Updated: [DATE]" at top of each document

### Privacy & Data Protection 🔴 CRITICAL

- [ ] **Consent mechanisms implemented**
  - [ ] Signup checkbox: "I agree to Terms of Service and Privacy Policy"
  - [ ] Checkbox must be user action (not pre-checked)
  - [ ] Optional data collection has separate consent

- [ ] **Data collection disclosed**
  - [ ] Privacy Policy lists all data collected
  - [ ] Purpose for each data type explained
  - [ ] Data retention periods specified

- [ ] **User data rights implemented**
  - [ ] Account deletion functionality
  - [ ] Data export/download functionality
  - [ ] Settings page for privacy preferences
  - [ ] Process documented for handling requests

- [ ] **Third-party data processors documented**
  - [ ] Supabase DPA executed (sign in Supabase dashboard)
  - [ ] All vendors listed in Privacy Policy
  - [ ] Verify vendors are GDPR compliant

### Trademark & Branding 🟡 HIGH PRIORITY

- [ ] **Trademark decision made**
  - [ ] Keep "Rally": Attorney consulted, risks accepted
  - [ ] OR Rebrand: New name chosen and implemented
  - [ ] Trademark search completed
  - [ ] USPTO filing prepared (if keeping Rally)

- [ ] **Copyright notices added**
  - [ ] Footer copyright: "© 2026 [Your Company]. All rights reserved."
  - [ ] About page or Terms mentions copyright

- [ ] **Software license chosen** (if open source)
  - [ ] LICENSE file in root directory
  - [ ] License matches your distribution intent

### Content & User Rights 🟡 HIGH PRIORITY

- [ ] **User-generated content policy**
  - [ ] Acceptable use policy in Terms
  - [ ] Content ownership/license clause
  - [ ] Prohibited content defined

- [ ] **Content moderation plan**
  - [ ] Reporting mechanism for users
  - [ ] Abuse reporting button/link
  - [ ] Process for reviewing reports

- [ ] **DMCA compliance** (if applicable)
  - [ ] DMCA agent designated
  - [ ] Takedown procedure documented
  - [ ] Contact info in Terms

### Compliance Features 🟡 HIGH PRIORITY

- [ ] **Age verification**
  - [ ] Terms state minimum age (13+ or 18+)
  - [ ] Signup has age confirmation checkbox
  - [ ] COPPA compliance if allowing <13

- [ ] **Email compliance** (if sending emails)
  - [ ] Unsubscribe link in all emails
  - [ ] Physical address in email footer
  - [ ] Preference center for opt-outs
  - [ ] Honor unsubscribes within 10 days

- [ ] **Cookie policy** (if using analytics)
  - [ ] Cookie consent banner
  - [ ] Cookie policy page created
  - [ ] Opt-out mechanism
  - [ ] Types of cookies disclosed

### Accessibility 🟢 MEDIUM PRIORITY

- [ ] **Basic accessibility**
  - [ ] Alt text on all images
  - [ ] ARIA labels on interactive elements
  - [ ] Keyboard navigation works
  - [ ] Semantic HTML used

- [ ] **Accessibility testing**
  - [ ] Screen reader tested
  - [ ] Color contrast checked
  - [ ] Lighthouse accessibility score >90
  - [ ] WCAG 2.1 AA audit (recommended)

### Security & Incidents 🟢 MEDIUM PRIORITY

- [ ] **Incident response plan**
  - [ ] Data breach notification procedure
  - [ ] 72-hour GDPR notification process
  - [ ] User notification template prepared
  - [ ] Point of contact designated

- [ ] **Security documentation**
  - [ ] Security practices documented
  - [ ] Privacy Policy mentions security measures
  - [ ] Password requirements enforced
  - [ ] HTTPS enforced

### International Compliance 🟢 MEDIUM PRIORITY

- [ ] **Jurisdiction specified**
  - [ ] Governing law stated in Terms
  - [ ] Dispute resolution venue specified
  - [ ] Arbitration clause (if applicable)

- [ ] **Regional compliance**
  - [ ] GDPR compliance (EU users)
  - [ ] CCPA compliance (California users)
  - [ ] Other state laws considered (VA, CO, CT, UT)
  - [ ] International markets identified

## 🏃 Quick Commands

```bash
# Run full legal compliance audit
npm run legal:audit

# Quick legal check
npm run legal:check

# Pre-launch check (code + security + legal)
npm run pre-launch
```

## 📊 Compliance Scoring

### Critical Issues (Must Fix)
- Missing Terms/Privacy Policy
- No consent mechanism
- False legal claims
- GDPR violations

### High Priority (Should Fix)
- No data deletion
- Trademark risks
- No DPA with vendors
- Missing content policy

### Medium Priority (Fix Soon)
- Accessibility gaps
- No age verification
- Missing copyright notices
- No incident plan

## 🎯 Completion Stages

### Stage 1: Minimum Viable Compliance (1-2 weeks)
✅ Legal documents created (templates OK)
✅ Consent mechanisms added
✅ Basic privacy features
✅ Trademark decision made
🚀 **Can soft launch with disclosure**

### Stage 2: Production Ready (2-3 weeks)
✅ Attorney-reviewed documents
✅ Full data subject rights
✅ Vendor agreements executed
✅ Content moderation system
🚀 **Can public launch**

### Stage 3: Enterprise Grade (4-6 weeks)
✅ Full WCAG 2.1 AA compliance
✅ International compliance
✅ Complete incident procedures
✅ Professional legal review
🚀 **Can scale confidently**

## 💰 Budget Guidance

### DIY Approach ($700-2,000)
- Legal document templates
- Self-implementation
- Online resources
- Risk: Potential gaps

### Hybrid Approach ($3,000-8,000)
- Template documents
- Attorney review
- Self-implementation
- Risk: Moderate

### Professional Approach ($10,000-20,000)
- Custom documents
- Full attorney engagement
- Professional implementation
- Risk: Low

## ⏰ Timeline Estimates

| Task | DIY | Professional |
|------|-----|--------------|
| Legal docs | 3-5 days | 1-2 weeks |
| Privacy features | 3-5 days | 1 week |
| Vendor agreements | 1-2 days | 1 week |
| Trademark decision | 1 day | 2-3 weeks |
| Testing & review | 2-3 days | 1 week |
| **Total** | **2-3 weeks** | **4-6 weeks** |

## 📞 When to Hire an Attorney

**You NEED an attorney if:**
- 🔴 Handling sensitive data (health, financial, children)
- 🔴 Collecting payment information
- 🔴 Operating in highly regulated industry
- 🔴 Trademark conflicts identified
- 🔴 Raising venture capital
- 🔴 Targeting enterprise customers

**You SHOULD hire an attorney if:**
- 🟡 Unsure about compliance requirements
- 🟡 Planning significant scale/growth
- 🟡 International expansion planned
- 🟡 Complex terms needed
- 🟡 User-generated content at scale

**Templates may be OK if:**
- 🟢 Simple use case
- 🟢 Minimal data collection
- 🟢 Small user base
- 🟢 Low risk tolerance
- 🟢 Tight budget

## 📚 Resources

### Legal Document Templates
- [Termly](https://termly.io) - Free/paid templates
- [iubenda](https://www.iubenda.com) - Privacy/cookie policies
- [Docracy](https://www.docracy.com) - Open source legal docs
- [TermsFeed](https://www.termsfeed.com) - Free generators

### Compliance Tools
- [GDPR Checklist](https://gdprchecklist.io)
- [CCPA Compliance](https://oag.ca.gov/privacy/ccpa)
- [FTC Guidelines](https://www.ftc.gov/business-guidance)
- [WCAG Checklist](https://www.w3.org/WAI/WCAG21/quickref/)

### Trademark Search
- [USPTO TESS](https://tmsearch.uspto.gov) - US trademarks
- [Trademarkia](https://www.trademarkia.com) - Search tool
- [WIPO Global Brand Database](https://www.wipo.int/branddb/) - International

### Legal Consultation
- [LegalZoom](https://www.legalzoom.com) - $300-2,000
- [Rocket Lawyer](https://www.rocketlawyer.com) - $200-1,500
- Local tech attorney - $2,000-10,000
- Upwork/Freelance attorney - $1,000-5,000

## 🔄 Maintenance Schedule

### Monthly
- [ ] Review any new features for compliance impact
- [ ] Check for regulatory changes
- [ ] Update Privacy Policy if needed

### Quarterly
- [ ] Run full compliance audit
- [ ] Review vendor agreements
- [ ] Check trademark status
- [ ] Update legal docs if needed

### Annually
- [ ] Full legal review
- [ ] Attorney consultation
- [ ] Compliance deep dive
- [ ] International expansion review

## ✅ Sign-Off Checklist

Before going live, get these sign-offs:

- [ ] **Developer:** All features comply with legal requirements
- [ ] **Founder/CEO:** Risks understood and accepted
- [ ] **Legal (if applicable):** Documents reviewed and approved
- [ ] **Compliance Officer (if applicable):** All requirements met

**Date of Sign-Off:** _______________

**Signed by:** _______________

**Notes/Exceptions:** _______________

---

**Last Updated:** March 16, 2026
**Next Review:** Before production launch

For detailed analysis, see: [LEGAL_COMPLIANCE_REPORT.md](./LEGAL_COMPLIANCE_REPORT.md)
