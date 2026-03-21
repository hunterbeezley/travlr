'use client'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { createElement } from 'react'

interface Action {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

interface FeedEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actions?: Action[]
  tips?: string[]
}

export default function FeedEmptyState({
  icon,
  title,
  description,
  actions = [],
  tips = []
}: FeedEmptyStateProps) {
  return (
    <div style={{
      background: 'var(--card-elevated)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow)',
      padding: '3rem 2rem',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Icon with animated gradient background */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          {createElement(icon, {
            size: 40,
            strokeWidth: 2,
            style: { color: 'white' }
          })}
        </div>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        marginBottom: '0.75rem',
        color: 'var(--foreground)'
      }}>
        {title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: '0.9375rem',
        color: 'var(--muted-foreground)',
        lineHeight: '1.6',
        maxWidth: '450px',
        margin: '0 auto 2rem'
      }}>
        {description}
      </p>

      {/* Actions */}
      {actions.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '400px',
          margin: '0 auto 2rem'
        }}>
          {actions.map((action, idx) => {
            const isPrimary = action.variant !== 'secondary'
            const button = (
              <button
                key={idx}
                onClick={action.onClick}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.75rem',
                  background: isPrimary ? 'var(--accent)' : 'var(--muted)',
                  color: isPrimary ? 'white' : 'var(--foreground)',
                  border: isPrimary ? 'none' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isPrimary ? 'var(--shadow-sm)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (isPrimary) {
                    e.currentTarget.style.background = 'var(--accent-hover)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = 'var(--shadow)'
                  } else {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (isPrimary) {
                    e.currentTarget.style.background = 'var(--accent)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  } else {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }
                }}
              >
                {action.label}
              </button>
            )

            return action.href ? (
              <Link key={idx} href={action.href} style={{ textDecoration: 'none' }}>
                {button}
              </Link>
            ) : button
          })}
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div style={{
          background: 'var(--surface-subtle)',
          borderRadius: 'var(--radius)',
          padding: '1.25rem',
          textAlign: 'left',
          marginTop: '1.5rem'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '700',
            color: 'var(--accent)',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Quick Tips
          </h4>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {tips.map((tip, idx) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--foreground)',
                lineHeight: '1.5'
              }}>
                <span style={{
                  color: 'var(--accent)',
                  fontWeight: '700',
                  flexShrink: 0
                }}>
                  {idx + 1}.
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
