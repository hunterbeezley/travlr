'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'

export default function FeedbackButton() {
  const { user, profile } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('bug')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!feedback.trim()) {
      alert('Please enter your feedback')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          type: feedbackType,
          userEmail: user?.email || 'Anonymous',
          username: profile?.username || 'Anonymous',
          currentPage: pathname,
          userAgent: navigator.userAgent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      const data = await response.json()

      setSubmitStatus('success')
      setFeedback('')
      setTimeout(() => {
        setIsOpen(false)
        setSubmitStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'var(--transition)',
          zIndex: 999
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(230, 57, 70, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
        title="Send Feedback"
      >
        💬
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          maxWidth: '500px',
          width: 'calc(100% - 2rem)',
          zIndex: 1001,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0
          }}>
            📣 Send Feedback
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '0.25rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Feedback Type */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { value: 'bug', label: '🐛 Bug', emoji: '🐛' },
                { value: 'feature', label: '✨ Feature', emoji: '✨' },
                { value: 'other', label: '💭 Other', emoji: '💭' }
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFeedbackType(type.value as any)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: feedbackType === type.value ? 'var(--accent)' : 'var(--muted)',
                    color: feedbackType === type.value ? 'white' : 'var(--foreground)',
                    border: '2px solid',
                    borderColor: feedbackType === type.value ? 'var(--accent)' : 'var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'var(--transition)'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Text */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Your Feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                feedbackType === 'bug'
                  ? 'Describe the bug you encountered...'
                  : feedbackType === 'feature'
                  ? 'Describe the feature you\'d like to see...'
                  : 'Share your thoughts...'
              }
              required
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '0.75rem',
                background: 'var(--background)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* User Info */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'var(--muted)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)'
          }}>
            <div>👤 {profile?.username || user?.email || 'Anonymous'}</div>
            <div>📍 Page: {pathname}</div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !feedback.trim()}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: isSubmitting || !feedback.trim() ? 'var(--muted)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: isSubmitting || !feedback.trim() ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.875rem',
              transition: 'var(--transition)'
            }}
          >
            {isSubmitting ? '⏳ Sending...' : submitStatus === 'success' ? '✅ Sent!' : '📤 Send Feedback'}
          </button>

          {submitStatus === 'error' && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              textAlign: 'center'
            }}>
              Failed to send feedback. Please try again.
            </div>
          )}

          {submitStatus === 'success' && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              textAlign: 'center'
            }}>
              Thanks! Your feedback has been submitted.
            </div>
          )}
        </form>
      </div>
    </>
  )
}
