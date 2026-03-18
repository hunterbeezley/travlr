# Travlr - Task Board

**Last Updated:** March 17, 2026

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
- **Security Issues:** https://github.com/hunterbeezley/travlr/issues?q=is:issue+is:open+label:security

## 📊 Current Issues Summary

### 🔴 Critical Priority - Social Competition (3 issues)

| # | Issue | Priority |
|---|-------|----------|
| [#30](https://github.com/hunterbeezley/travlr/issues/30) | Add comments and voting system to collections | ⭐ CRITICAL |
| [#29](https://github.com/hunterbeezley/travlr/issues/29) | Add city-based discovery feed to explore popular collections | ⭐ CRITICAL |
| [#21](https://github.com/hunterbeezley/travlr/issues/21) | Create Terms of Service and Privacy Policy | 🚫 LAUNCH BLOCKER |

**Why Critical:** Without these, Travlr cannot compete with Pinbox as a social platform

### 🟡 High Priority - User Experience (4 issues)

| # | Issue | Priority |
|---|-------|----------|
| [#31](https://github.com/hunterbeezley/travlr/issues/31) | Enhance UX and visual design for collections and pins pages | 🎨 UX |
| [#26](https://github.com/hunterbeezley/travlr/issues/26) | Mobile responsiveness and touch optimization | 📱 MOBILE |
| [#28](https://github.com/hunterbeezley/travlr/issues/28) | Add social feed for discovery and friend activity | 🌍 DISCOVERY |
| [#27](https://github.com/hunterbeezley/travlr/issues/27) | Add POI discovery and improve pin visibility/differentiation | 🗺️ DISCOVERY |

### 🟢 Medium Priority - Polish & Compliance (4 issues)

| # | Issue | Priority |
|---|-------|----------|
| [#25](https://github.com/hunterbeezley/travlr/issues/25) | Improve map view toggle UX with modal selector | 🗺️ UX |
| [#24](https://github.com/hunterbeezley/travlr/issues/24) | Accessibility: Improve WCAG compliance | ♿ A11Y |
| [#23](https://github.com/hunterbeezley/travlr/issues/23) | Compliance: Execute Data Processing Agreement with Supabase | 📄 LEGAL |
| [#18](https://github.com/hunterbeezley/travlr/issues/18) | Code Style: Replace var with const/let and reduce 'any' usage | 🧹 CODE QUALITY |

### 🔵 Low Priority - Nice to Have (1 issue)

| # | Issue | Priority |
|---|-------|----------|
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

**Total Active Issues:** 23
**Estimated Total Time:** ~74 hours

**Production Blockers:** 2 issues (12 hours)
**Security Hardening:** 8 issues (22 hours)
**Enhancements:** 11 issues (45 hours)
**Documentation:** 2 issues (8 hours)

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
