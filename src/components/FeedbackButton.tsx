'use client'
import { logger } from '@/lib/logger'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import { Z_INDEX } from '@/lib/mapUiConstants'

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
      logger.error('Error submitting feedback:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    // Rendered inline inside Navbar's actions row - not fixed/floating.
    // A floating position was tried and reliably collided with page content
    // (map search bar, first dashboard card, etc.) on real mobile devices,
    // since there's no screen region that's guaranteed empty on every page.
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="navbar-feedback-trigger"
        title="Send Feedback"
        aria-label="Send Feedback"
      >
        <MessageCircle size={17} strokeWidth={2} />
      </button>
    )
  }

  // Portaled to document.body: the trigger lives inside Navbar, and .navbar
  // has backdrop-filter set - which (like transform/filter/will-change)
  // creates a containing block for position:fixed descendants. Without the
  // portal, this modal would fix-position relative to the navbar's own tiny
  // box instead of the viewport, clipping it to a sliver above the page.
  return createPortal(
    <>
      {/* Backdrop - also owns centering the modal via flex, so the modal's
          own height never has to be guessed (a fixed top:50%/translate
          centering trick clips top AND bottom equally off-screen when
          content is taller than the visible viewport, which is common on
          mobile Safari once its own chrome eats into viewport height - that
          previously made the close button unreachable). */}
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
          zIndex: Z_INDEX.feedbackModalBackdrop,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
      >
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '100%',
          overflowY: 'auto',
          zIndex: Z_INDEX.feedbackModalContent,
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
            fontSize: '1.375rem',
            fontWeight: '700',
            fontFamily: 'var(--font-display)',
            margin: 0
          }}>
            Send Feedback
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Feedback Type */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--muted-foreground)'
            }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { value: 'bug', label: '🐛 Bug' },
                { value: 'feature', label: '✨ Feature' },
                { value: 'other', label: '💭 Other' }
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
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-body)',
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
              fontSize: '0.8125rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              color: 'var(--muted-foreground)'
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
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* User Info */}
          <div style={{
            fontSize: '0.8125rem',
            color: 'var(--muted-foreground)',
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'var(--muted)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-body)'
          }}>
            <div>{profile?.username || user?.email || 'Anonymous'}</div>
            <div>Page: {pathname}</div>
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
              fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem',
              transition: 'var(--transition)'
            }}
          >
            {isSubmitting ? 'Sending...' : submitStatus === 'success' ? 'Sent!' : 'Send Feedback'}
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
      </div>
    </>,
    document.body
  )
}
