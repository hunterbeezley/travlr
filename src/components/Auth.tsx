'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Attempting to send magic link to:', email)
      console.log('Redirect URL:', `${window.location.origin}/`)

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (error) {
        console.error('Supabase OTP error:', error)
        alert(`Error: ${error.message}`)
      } else {
        console.log('Magic link sent successfully:', data)
        setSubmitted(true)
      }
    } catch (err) {
      console.error('Unexpected error during login:', err)
      alert('An unexpected error occurred. Please check the console for details.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="form-container fade-in">
        <div className="text-center">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
          <h2 className="form-title">Check your email</h2>
          <p className="form-subtitle">
            We've sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
            Click the link in your email to sign in to your account.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="btn btn-primary"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-container slide-up">
      <h2 className="form-title">Welcome to Travlr</h2>
      <p className="form-subtitle">
        Sign in with your email to start exploring
      </p>
      
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            required
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading || !email}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <div className="flex items-center gap-sm">
              <div className="spinner" style={{ width: '1rem', height: '1rem' }} />
              Sending magic link...
            </div>
          ) : (
            <>
              ✨ Send magic link
            </>
          )}
        </button>
      </form>
      
      <div style={{ marginTop: '1.5rem' }} className="text-center">
        <p className="text-sm text-muted">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  )
}