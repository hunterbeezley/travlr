'use client'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createElement } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  variant?: 'default' | 'subtle'
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default'
}: EmptyStateProps) {
  const router = useRouter()

  const handleAction = () => {
    if (onAction) {
      onAction()
    } else if (actionHref) {
      router.push(actionHref)
    }
  }

  return (
    <div
      className={`${variant === 'subtle' ? 'glass' : 'glass-strong'} animate-fade-in-fast`}
      style={{
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '0 auto'
      }}
    >
      {/* Icon */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        {createElement(icon, {
          size: 64,
          strokeWidth: 1.5,
          style: {
            color: 'rgba(255, 255, 255, 0.3)',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
          }
        })}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '0.75rem',
        color: 'var(--foreground)'
      }}>
        {title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: '0.875rem',
        color: 'var(--muted-foreground)',
        lineHeight: '1.6',
        maxWidth: '400px',
        margin: '0 auto',
        marginBottom: actionLabel ? '2rem' : '0'
      }}>
        {description}
      </p>

      {/* Action Button */}
      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            style={{
              display: 'inline-block',
              padding: '0.875rem 1.75rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontWeight: '600',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-glow)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={handleAction}
            style={{
              padding: '0.875rem 1.75rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-glow)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  )
}
