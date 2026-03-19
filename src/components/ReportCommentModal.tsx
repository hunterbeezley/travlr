'use client'
import { logger } from '@/lib/logger'
import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ReportCommentModalProps {
  commentId: string
  onClose: () => void
  onReported: () => void
}

export default function ReportCommentModal({
  commentId,
  onClose,
  onReported
}: ReportCommentModalProps) {
  const [reason, setReason] = useState<'spam' | 'harassment' | 'inappropriate' | 'other'>('spam')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submitting) return

    setSubmitting(true)
    setError('')

    try {
      const { error: reportError } = await supabase.rpc('report_comment', {
        p_comment_id: commentId,
        p_reason: reason,
        p_details: details.trim() || null
      })

      if (reportError) {
        if (reportError.message.includes('already reported')) {
          setError('You have already reported this comment')
        } else {
          throw reportError
        }
        return
      }

      onReported()
      onClose()
    } catch (err) {
      logger.error('Error reporting comment:', err)
      setError('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--background)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Report Comment
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                padding: '0.25rem',
                lineHeight: 1
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              Help us keep the community safe by reporting comments that violate our guidelines.
            </p>

            {/* Reason */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: 'var(--foreground)'
              }}>
                Reason for report
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="spam">Spam or misleading</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: 'var(--foreground)'
              }}>
                Additional details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any additional context..."
                maxLength={500}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                marginTop: '0.25rem',
                textAlign: 'right'
              }}>
                {details.length}/500
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: 'var(--radius)',
                color: '#ef4444',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: submitting ? 'var(--muted)' : '#ef4444',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
