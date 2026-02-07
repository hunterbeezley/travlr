'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type AuthMode = 'signin' | 'signup' | 'reset'

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Provide more helpful error message for unconfirmed email
        if (error.message === 'Invalid login credentials' || error.message.includes('Email not confirmed')) {
          setError(
            'Invalid credentials. If you just signed up, please check your email for a confirmation link first.'
          )
        } else {
          setError(error.message)
        }
      } else {
        console.log('✅ Signed in successfully:', data.user?.email)
        // Auth state change will redirect automatically via useAuth
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      })

      if (error) {
        setError(error.message)
      } else {
        console.log('✅ Signed up successfully:', data.user?.email)
        console.log('User confirmation required:', data.user?.identities?.length === 0)

        // Check if email confirmation is required
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          // Email confirmation is required
          setSuccessMessage(
            `Account created! Please check your email (${email}) for a confirmation link before signing in.`
          )
        } else {
          // No email confirmation required, can sign in immediately
          setSuccessMessage('Account created! You can now sign in.')
          setMode('signin')
          setPassword('')
          setConfirmPassword('')
        }
      }
    } catch (err: any) {
      console.error('Sign up error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccessMessage('Password reset email sent! Check your inbox.')
        setTimeout(() => {
          setMode('signin')
          setSuccessMessage('')
        }, 3000)
      }
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === 'signin') return handleSignIn(e)
    if (mode === 'signup') return handleSignUp(e)
    if (mode === 'reset') return handlePasswordReset(e)
  }

  return (
    <div className="form-container slide-up">
      <h2 className="form-title">
        {mode === 'signin' && 'Welcome to Travlr'}
        {mode === 'signup' && 'Create your account'}
        {mode === 'reset' && 'Reset your password'}
      </h2>
      <p className="form-subtitle">
        {mode === 'signin' && 'Sign in to start exploring'}
        {mode === 'signup' && 'Join Travlr and start discovering places'}
        {mode === 'reset' && "We'll send you a password reset link"}
      </p>

      {/* Mode Tabs - Only show for signin/signup */}
      {mode !== 'reset' && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'var(--muted)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)'
        }}>
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setError('')
              setSuccessMessage('')
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: mode === 'signin' ? 'var(--accent)' : 'transparent',
              color: mode === 'signin' ? 'white' : 'var(--foreground)',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError('')
              setSuccessMessage('')
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: mode === 'signup' ? 'var(--accent)' : 'transparent',
              color: mode === 'signup' ? 'white' : 'var(--foreground)',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '2px solid #22c55e',
          borderRadius: 'var(--radius)',
          color: '#22c55e',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}>
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius)',
          color: '#ef4444',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email Field */}
        <div className="form-group">
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--muted-foreground)'
          }}>
            Email Address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        {/* Password Field - Show for signin and signup */}
        {mode !== 'reset' && (
          <div className="form-group">
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--muted-foreground)'
            }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              disabled={loading}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>
        )}

        {/* Confirm Password Field - Only for signup */}
        {mode === 'signup' && (
          <div className="form-group">
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--muted-foreground)'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
              disabled={loading}
              autoComplete="new-password"
              minLength={6}
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !email || (mode !== 'reset' && !password)}
          className="btn btn-primary w-full"
          style={{ marginTop: '0.5rem' }}
        >
          {loading ? (
            <div className="flex items-center gap-sm">
              <div className="spinner" style={{ width: '1rem', height: '1rem' }} />
              {mode === 'signin' && 'Signing in...'}
              {mode === 'signup' && 'Creating account...'}
              {mode === 'reset' && 'Sending reset link...'}
            </div>
          ) : (
            <>
              {mode === 'signin' && '🚀 Sign In'}
              {mode === 'signup' && '✨ Create Account'}
              {mode === 'reset' && '📧 Send Reset Link'}
            </>
          )}
        </button>
      </form>

      {/* Forgot Password Link - Show only on signin */}
      {mode === 'signin' && (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setMode('reset')
              setError('')
              setPassword('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'var(--font-mono)'
            }}
          >
            Forgot your password?
          </button>
        </div>
      )}

      {/* Back to Sign In - Show on reset mode */}
      {mode === 'reset' && (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setMode('signin')
              setError('')
              setSuccessMessage('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'var(--font-mono)'
            }}
          >
            ← Back to sign in
          </button>
        </div>
      )}

      {/* Terms */}
      <div style={{ marginTop: '1.5rem' }} className="text-center">
        <p className="text-sm text-muted">
          By {mode === 'signup' ? 'creating an account' : 'signing in'}, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  )
}
