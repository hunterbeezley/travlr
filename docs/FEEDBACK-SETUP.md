# Feedback System Setup Guide

The app includes an automatic feedback system that creates GitHub issues from user feedback.

## 🎯 Features

- **Floating feedback button** on all pages (bottom right)
- **Three feedback types**: Bug, Feature Request, Other
- **Automatic GitHub issue creation** with labels
- **User metadata included**: username, email, current page, browser info
- **Beautiful modal UI** matching app design

## 🔧 Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
   - Or visit: https://github.com/settings/tokens

2. Click **"Generate new token"** → **"Generate new token (classic)"**

3. Configure the token:
   - **Note**: `Travlr Feedback Bot`
   - **Expiration**: No expiration (or set your preference)
   - **Scopes**: Check **`repo`** (Full control of private repositories)
     - This includes `repo:status`, `repo_deployment`, `public_repo`, etc.

4. Click **"Generate token"**

5. **IMPORTANT**: Copy the token immediately (you won't see it again!)
   - Format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Add Token to Environment Variables

#### Local Development (.env.local)

Add to your `.env.local` file:
```bash
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=hunterbeezley
GITHUB_REPO=travlr
```

#### Vercel Production

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add these variables:
   ```
   GITHUB_TOKEN = ghp_your_token_here
   GITHUB_OWNER = hunterbeezley
   GITHUB_REPO = travlr
   ```

3. Make sure to set them for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. **Redeploy** your app after adding environment variables

### 3. Test the Feedback System

1. **Open your app** (local or production)
2. Look for the **💬 feedback button** (bottom right corner)
3. Click it and **submit test feedback**
4. Check your **GitHub repository** → **Issues**
5. You should see a new issue with:
   - Proper title with emoji
   - Labels: `bug`, `enhancement`, or `feedback` + `user-feedback`
   - User metadata in the issue body

## 🏷️ Issue Labels

The system automatically applies these labels:

| Feedback Type | Label | Emoji |
|--------------|-------|-------|
| Bug | `bug` | 🐛 |
| Feature Request | `enhancement` | ✨ |
| Other | `feedback` | 💭 |

All issues also get the `user-feedback` label.

## 📋 Issue Format

GitHub issues are created with this format:

**Title:**
```
🐛 [BUG] Users can't upload images on mobile
```

**Body:**
```markdown
## User Feedback

Users can't upload images on mobile devices. The button doesn't respond when tapped.

---

### Metadata
- **Type**: bug
- **Submitted by**: @johndoe (john@example.com)
- **Page**: `/collections/abc123`
- **User Agent**: `Mozilla/5.0 (iPhone; CPU iPhone OS 15_0...`
- **Timestamp**: 2025-03-18T10:30:00.000Z

---

*This issue was automatically created from user feedback.*
```

## 🚨 Troubleshooting

### "Feedback system is not configured"

**Problem**: `GITHUB_TOKEN` environment variable is missing.

**Solution**:
- Add `GITHUB_TOKEN` to `.env.local` (local)
- Add to Vercel environment variables (production)
- Restart dev server / redeploy

### "Failed to submit feedback"

**Possible causes**:
1. **Invalid token** - Generate a new token with `repo` scope
2. **Wrong repo name** - Check `GITHUB_OWNER` and `GITHUB_REPO` values
3. **Token expired** - Generate a new token
4. **Network issues** - Check internet connection

**Debug**:
- Check browser console for errors
- Check Vercel function logs
- Verify token has `repo` scope

### Issues not appearing in GitHub

1. **Check token permissions** - Must have `repo` scope
2. **Verify repo name** - `GITHUB_OWNER/GITHUB_REPO` must match your repo
3. **Check if you're an owner** - Token must belong to someone with write access

## 🎨 UI Customization

The feedback button appears as:
- **Position**: Bottom right corner (fixed)
- **Icon**: 💬 (speech bubble)
- **Color**: App accent color (red)
- **Z-index**: 999 (appears above most content)

To customize, edit `/src/components/FeedbackButton.tsx`

## 🔒 Security Notes

- **Never commit** your GitHub token to version control
- Add `.env.local` to `.gitignore` (already done)
- Use **environment variables** for all secrets
- Token should have **minimum required permissions** (`repo` scope only)
- Consider **rotating tokens** periodically

## 📊 Monitoring Feedback

### GitHub Repository

View all feedback issues:
- Go to **Issues** tab
- Filter by label: `user-feedback`
- Or use label combinations:
  - `bug` + `user-feedback`
  - `enhancement` + `user-feedback`
  - `feedback` + `user-feedback`

### Responding to Feedback

1. **Triage** - Review new issues daily
2. **Label** - Add additional labels (priority, status, etc.)
3. **Respond** - Thank users and provide updates
4. **Track** - Link to PRs that address the feedback
5. **Close** - Mark as resolved when fixed

## 🎯 Best Practices

1. **Review feedback regularly** - Check GitHub issues daily
2. **Respond to users** - Comment on issues to show you're listening
3. **Prioritize** - Add priority labels to organize work
4. **Link fixes** - Reference issues in PR descriptions
5. **Update status** - Use labels to track progress
6. **Thank contributors** - Acknowledge helpful feedback

## 📈 Analytics Ideas

Track feedback metrics:
- Issues created per day/week
- Bug vs Feature vs Other ratio
- Most common pages with feedback
- Response time to feedback
- Resolution rate

Use GitHub API or Actions to automate reporting.

---

## ✅ Setup Checklist

Before going live with beta testers:

- [ ] GitHub token generated with `repo` scope
- [ ] Token added to `.env.local` (local testing)
- [ ] Token added to Vercel environment variables
- [ ] `GITHUB_OWNER` and `GITHUB_REPO` configured
- [ ] App redeployed with new env vars
- [ ] Feedback button visible in app
- [ ] Test feedback submission works
- [ ] Test issue appears in GitHub
- [ ] Issue has correct labels and formatting
- [ ] `.env.local` is in `.gitignore`

---

**Ready to collect feedback!** 🎉

Your beta testers can now report bugs and suggest features directly from the app.
