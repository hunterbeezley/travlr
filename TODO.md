# Travlr - Task Board

**Last Updated:** March 21, 2026

> **All tasks are now tracked as GitHub Issues!**
>
> Use GitHub Issues with labels for task management:
> - View by priority: Filter by labels (enhancement, bug, security)
> - Interactive workflow: Track progress with issues
> - Link to code, PRs, and commits

## 🔗 Quick Links

- **All Issues:** https://github.com/hunterbeezley/travlr/issues
- **Open Enhancements:** https://github.com/hunterbeezley/travlr/issues?q=is:issue+is:open+label:enhancement
- **Open Bugs:** https://github.com/hunterbeezley/travlr/issues?q=is:issue+is:open+label:bug
- **Closed Issues:** https://github.com/hunterbeezley/travlr/issues?q=is:issue+is:closed

## 📊 Current Issues Summary

### 🔴 Critical Priority - Launch Blocker (1 issue)

| # | Issue | Priority |
|---|-------|----------|
| [#21](https://github.com/hunterbeezley/travlr/issues/21) | Create Terms of Service and Privacy Policy | 🚫 LAUNCH BLOCKER |

**Why Critical:** Legal requirement before production launch

### 🟡 High Priority - Growth & Engagement (4 issues)

| # | Issue | Priority |
|---|-------|----------|
| [#90](https://github.com/hunterbeezley/travlr/issues/90) | Competitive Analysis: Feature Gaps vs Pinbox & Map Platforms | 📊 STRATEGY |
| [#89](https://github.com/hunterbeezley/travlr/issues/89) | Implement trending/popular content algorithm | 📈 DISCOVERY |
| [#87](https://github.com/hunterbeezley/travlr/issues/87) | Add collection collaboration (multiple editors) | 🤝 SOCIAL |
| [#58](https://github.com/hunterbeezley/travlr/issues/58) | Create comprehensive onboarding flow for new users | 🎓 UX |

### 🟢 Medium Priority - Features & Integration (4 issues)

| # | Issue | Priority |
|---|-------|----------|
| [#88](https://github.com/hunterbeezley/travlr/issues/88) | Add embeddable map widgets for external websites | 🌐 INTEGRATION |
| [#86](https://github.com/hunterbeezley/travlr/issues/86) | Add offline mode for viewing cached collections | 📱 PWA |
| [#85](https://github.com/hunterbeezley/travlr/issues/85) | Add navigation app integration (Google Maps, Apple Maps, Waze) | 🗺️ INTEGRATION |
| [#84](https://github.com/hunterbeezley/travlr/issues/84) | Add import/export support for KML, GPX, and CSV formats | 📥 DATA |

### 🟣 Low Priority - Polish & Compliance (4 issues)

| # | Issue | Priority |
|---|-------|----------|
| [#24](https://github.com/hunterbeezley/travlr/issues/24) | Accessibility: Improve WCAG compliance (ARIA labels, semantic HTML) | ♿ A11Y |
| [#23](https://github.com/hunterbeezley/travlr/issues/23) | Compliance: Execute Data Processing Agreement with Supabase | 📄 LEGAL |
| [#18](https://github.com/hunterbeezley/travlr/issues/18) | Code Style: Replace var with const/let and reduce 'any' usage | 🧹 CODE QUALITY |
| [#17](https://github.com/hunterbeezley/travlr/issues/17) | Accessibility: Missing alt attributes and button types | ♿ A11Y |

---

## 🎯 How to Use GitHub Issues

### Creating Issues
```bash
gh issue create --title "Issue title" --body "Description" --label "priority:high,security"
```

### Viewing Issues
```bash
# All open issues
gh issue list

# Filter by priority
gh issue list --label "priority:critical"

# View specific issue
gh issue view 1
```

### Working on Issues
```bash
# Assign to yourself
gh issue edit 1 --add-assignee @me

# Close when done
gh issue close 1 --comment "Fixed in PR #42"
```

### Filtering in GitHub UI
- Click "Issues" tab
- Use "Labels" dropdown to filter by priority
- Use "Filters" to create custom views
- Save custom filters for quick access

## 🔄 Workflow

### Starting Work
1. Pick an issue from critical/high priority
2. Assign to yourself: `gh issue edit <number> --add-assignee @me`
3. Create branch: `git checkout -b fix/issue-<number>`
4. Work on the issue

### Completing Work
1. Commit changes (reference issue): `git commit -m "Fix: Add server-side validation (#2)"`
2. Push and create PR
3. Close issue when PR merged: `gh issue close <number>`

### During Session
- Check issues at start
- Update issue with progress/comments
- Link commits/PRs to issues
- Close completed issues

---

## 📈 Progress Tracking

**Total Open Issues:** 13 (down from 120 closed!)
**Launch Blocker:** 1 issue (#21 - Legal docs)

### ✅ Recently Completed

- 🔐 Security Phase 1: Route protection, rate limiting, validation (#120)
- 🎨 Tidal-inspired design system (#107)
- 🌍 Social feed implementation (#28, #91, #92, #93)
- 📱 Mobile UX improvements (#26, #95-#119 - 25 bugs fixed!)
- 🔍 Search functionality (#98, #102, #104, #112-#114)

### 🎯 Focus Areas

**Critical:** Legal compliance (#21) before launch
**High Priority:** Growth features (trending, collaboration, onboarding)
**Medium Priority:** Integrations and data portability
**Low Priority:** Polish and code quality

---

## 💡 Tips

**Link commits to issues:**
```bash
git commit -m "Fix server-side auth check

Fixes #1"
```

**Reference issues in PRs:**
```markdown
Closes #1
Fixes #2
Related to #3
```

**Use GitHub CLI:**
```bash
# Quick issue creation
gh issue create

# View on web
gh issue view 1 --web

# Search issues
gh issue list --search "security"
```

---

**Repository:** https://github.com/hunterbeezley/travlr
**Issues:** https://github.com/hunterbeezley/travlr/issues
**Competitive Analysis:** See [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) for feature comparison with Pinbox

This file is now a reference/snapshot. GitHub Issues are the source of truth.
