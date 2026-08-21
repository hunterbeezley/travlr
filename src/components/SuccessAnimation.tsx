'use client'
import { Check } from 'lucide-react'

interface SuccessAnimationProps {
  title?: string
  description?: string
  size?: 'small' | 'medium' | 'large'
}

export default function SuccessAnimation({
  title = 'Success!',
  description,
  size = 'medium'
}: SuccessAnimationProps) {
  const sizeMap = {
    small: { container: 40, icon: 20 },
    medium: { container: 48, icon: 24 },
    large: { container: 64, icon: 32 }
  }

  const { container, icon } = sizeMap[size]

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Animated checkmark */}
      <div
        className="animate-scale-in"
        style={{
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: container,
          height: container,
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.2)',
          marginBottom: description || size === 'large' ? '1rem' : '0.5rem'
        }}
      >
        <Check
          size={icon}
          strokeWidth={2.5}
          style={{
            color: 'rgb(34, 197, 94)'
          }}
        />
      </div>

      {/* Title */}
      {title && (
        <h3
          style={{
            fontSize: size === 'large' ? '1.125rem' : '1rem',
            fontWeight: '600',
            fontFamily: 'var(--font-body)',
            marginBottom: description ? '0.5rem' : '0',
            color: 'var(--foreground)'
          }}
        >
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)',
            lineHeight: '1.5',
            maxWidth: '300px',
            margin: '0 auto'
          }}
        >
          {description}
        </p>
      )}
    </div>
  )
}
