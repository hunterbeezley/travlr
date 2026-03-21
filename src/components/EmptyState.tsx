'use client'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  icon: Icon,
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
        <Icon
          size={64}
          strokeWidth={1.5}
          style={{
            color: 'rgba(255, 255, 255, 0.3)',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
          }}
        />
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.75rem',
        color: 'var(--foreground)'
      }}>
        {title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: '0.875rem',
        color: 'var(--muted-foreground)',
        marginBottom: actionLabel ? '2rem' : '0',
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
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: '0 2px 8px rgba(230, 57, 70, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 57, 70, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(230, 57, 70, 0.3)'
            }}
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={handleAction}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: '0 2px 8px rgba(230, 57, 70, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 57, 70, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(230, 57, 70, 0.3)'
            }}
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  )
}
