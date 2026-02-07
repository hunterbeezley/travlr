# Enable Email/Password Authentication

Follow these steps to enable email/password authentication in your Supabase project.

## Step 1: Enable Email/Password Provider

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Email** provider
4. Ensure **Enable Email provider** is toggled ON
5. Configure the following settings:

### Recommended Settings for Development:

- **Confirm email**: OFF (for easier testing)
  - This allows users to sign in immediately without email verification
  - ⚠️ Enable this in production for security

- **Secure email change**: ON
  - Requires users to confirm new email addresses

### Recommended Settings for Production:

- **Confirm email**: ON
  - Users must verify their email before signing in
  - More secure

- **Secure email change**: ON
- **Email templates**: Customize to match your brand

## Step 2: Disable Magic Link (Optional)

Since we're migrating away from magic links:

1. In **Authentication** → **Providers** → **Email**
2. You can keep magic links enabled as a backup
3. Or disable **Enable email OTP** if you only want password auth

## Step 3: Configure Password Requirements

1. Go to **Authentication** → **Policies**
2. Set minimum password length (currently 6 characters in the app)
3. Consider enabling:
   - Minimum password strength
   - Special character requirements
   - Number requirements

## Step 4: Test the New Auth Flow

### Create a Test Account:

1. Log out of your current session (or use incognito mode)
2. Click the **Sign Up** tab
3. Enter:
   - Email: test@example.com
   - Password: test123 (at least 6 characters)
   - Confirm Password: test123
4. Click **Create Account**
5. You should see "Account created! You can now sign in."
6. Switch to **Sign In** tab
7. Enter your credentials and sign in

### Test Password Reset:

1. On the sign-in page, click **Forgot your password?**
2. Enter your email
3. Click **Send Reset Link**
4. Check your email for the reset link

## Step 5: Update Email Templates (Optional)

Customize the email templates for better branding:

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - **Confirm signup** (if email confirmation is enabled)
   - **Magic Link** (if still using OTP)
   - **Change Email Address**
   - **Reset Password**

### Example customization:
- Add your logo
- Match your brand colors
- Update the copy to be more friendly

## Migration Notes for Existing Users

**If you have existing users with magic link auth:**

1. They won't have passwords set yet
2. They need to:
   - Go to the sign-in page
   - Click "Forgot your password?"
   - Enter their email
   - Set a new password via the reset link
3. After that, they can sign in with email/password

**Automatic migration**: There's no automatic way to migrate users from magic link to password. Each user must set their password via the reset flow.

## Security Best Practices

### For Production:

1. ✅ Enable email confirmation
2. ✅ Set strong password requirements (8+ chars, numbers, special chars)
3. ✅ Enable rate limiting (already configured by Supabase)
4. ✅ Use HTTPS only (handled by Supabase + Vercel)
5. ✅ Consider enabling MFA (Multi-Factor Authentication)

### Rate Limits:

Supabase has built-in rate limiting:
- **Email auth**: 4 requests per hour per email (adjustable)
- **Password attempts**: 10 attempts per 5 minutes per email

To adjust these:
1. Go to **Authentication** → **Rate Limits**
2. Increase limits for development
3. Keep them strict for production

## Troubleshooting

### "Email rate limit exceeded"
- Wait 1 hour
- Or increase rate limits in Dashboard → Authentication → Rate Limits

### "Invalid login credentials"
- Check email/password are correct
- Ensure user account exists
- Check if email confirmation is required but not completed

### "User already registered"
- Email already has an account
- Try signing in instead of signing up
- Or use password reset to set a new password

## Testing Checklist

- [ ] Sign up with new email/password
- [ ] Sign in with email/password
- [ ] Sign out
- [ ] Password reset flow
- [ ] Sign in after password reset
- [ ] Try wrong password (should show error)
- [ ] Try already-used email on signup (should show error)
- [ ] Check that map preferences persist after logout/login

## Next Steps

After testing:
1. Consider enabling email confirmation for production
2. Customize email templates with your branding
3. Set up password strength requirements
4. Consider adding social auth (Google, GitHub, etc.)
