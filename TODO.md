# Rally App - Task Board

**Last Updated:** March 13, 2026

> **All tasks are now tracked as GitHub Issues!**
>
> Use GitHub Issues with labels for task management:
> - View by priority: Filter by `priority:critical`, `priority:high`, etc.
> - View by type: Filter by `security`, `enhancement`, `bug`, etc.
> - Interactive kanban: Move issues between columns
> - Link to code, PRs, and commits

## 🔗 Quick Links

- **All Issues:** https://github.com/hunterbeezley/rally-app/issues
- **Critical Issues:** https://github.com/hunterbeezley/rally-app/issues?q=is:issue+is:open+label:priority:critical
- **High Priority:** https://github.com/hunterbeezley/rally-app/issues?q=is:issue+is:open+label:priority:high
- **Security Issues:** https://github.com/hunterbeezley/rally-app/issues?q=is:issue+is:open+label:security

## 📊 Current Issues Summary

### 🔴 Critical Priority (2 issues)

| # | Issue | Est. |
|---|-------|------|
| [#1](https://github.com/hunterbeezley/rally-app/issues/1) | Add server-side route protection | 4h |
| [#2](https://github.com/hunterbeezley/rally-app/issues/2) | Implement server-side validation | 8h |

**Total:** 12 hours

### 🟡 High Priority (4 issues)

| # | Issue | Est. |
|---|-------|------|
| [#3](https://github.com/hunterbeezley/rally-app/issues/3) | Fix email address exposure to non-hosts | 2h |
| [#4](https://github.com/hunterbeezley/rally-app/issues/4) | Activate storage policies for file uploads | 1h |
| [#5](https://github.com/hunterbeezley/rally-app/issues/5) | Add server-side file validation | 3h |
| [#6](https://github.com/hunterbeezley/rally-app/issues/6) | Implement rate limiting | 4h |

**Total:** 10 hours

### 🟢 Medium Priority (6 issues)

| # | Issue | Est. |
|---|-------|------|
| [#7](https://github.com/hunterbeezley/rally-app/issues/7) | Add security headers (CSP, X-Frame-Options, etc.) | 2h |
| [#8](https://github.com/hunterbeezley/rally-app/issues/8) | Strengthen password requirements | 1h |
| [#9](https://github.com/hunterbeezley/rally-app/issues/9) | Implement link validation in comments | 2h |
| [#10](https://github.com/hunterbeezley/rally-app/issues/10) | Remove console.log statements from production code | 1h |
| [#11](https://github.com/hunterbeezley/rally-app/issues/11) | Address TODO/FIXME/HACK comments in code | Varies |
| [#12](https://github.com/hunterbeezley/rally-app/issues/12) | Add clickjacking protection (X-Frame-Options) | 30m |

**Total:** ~7 hours

### 🔵 Low Priority (11 issues)

| # | Issue | Est. |
|---|-------|------|
| [#13](https://github.com/hunterbeezley/rally-app/issues/13) | Add email notifications for events | 8h |
| [#14](https://github.com/hunterbeezley/rally-app/issues/14) | Implement browser push notifications | 6h |
| [#15](https://github.com/hunterbeezley/rally-app/issues/15) | Add user notification preferences | 4h |
| [#16](https://github.com/hunterbeezley/rally-app/issues/16) | Add comment reactions/likes | 3h |
| [#17](https://github.com/hunterbeezley/rally-app/issues/17) | Add comment threading/replies | 8h |
| [#18](https://github.com/hunterbeezley/rally-app/issues/18) | Implement comment sorting options | 2h |
| [#19](https://github.com/hunterbeezley/rally-app/issues/19) | Create privacy policy | 4h |
| [#20](https://github.com/hunterbeezley/rally-app/issues/20) | Create terms of service | 4h |
| [#21](https://github.com/hunterbeezley/rally-app/issues/21) | Add CAPTCHA to prevent spam | 2h |
| [#22](https://github.com/hunterbeezley/rally-app/issues/22) | Set up error monitoring (Sentry) | 2h |
| [#23](https://github.com/hunterbeezley/rally-app/issues/23) | Add analytics tracking | 2h |

**Total:** ~45 hours

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

**Repository:** https://github.com/hunterbeezley/rally-app
**Issues:** https://github.com/hunterbeezley/rally-app/issues

This file is now a reference/snapshot. GitHub Issues are the source of truth.
