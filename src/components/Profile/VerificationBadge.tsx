'use client'

import { Check, Star, Building2, Crown } from 'lucide-react'

interface VerificationBadgeProps {
  verificationType?: 'creator' | 'local_expert' | 'business' | 'staff'
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
}

const VERIFICATION_CONFIG = {
  creator: {
    icon: Check,
    label: 'Verified Creator',
    color: '#3b82f6'
  },
  local_expert: {
    icon: Star,
    label: 'Local Expert',
    color: '#8b5cf6'
  },
  business: {
    icon: Building2,
    label: 'Business',
    color: '#10b981'
  },
  staff: {
    icon: Crown,
    label: 'Staff',
    color: '#f59e0b'
  }
}

export default function VerificationBadge({
  verificationType = 'creator',
  size = 'medium',
  showLabel = false
}: VerificationBadgeProps) {
  const config = VERIFICATION_CONFIG[verificationType]

  const sizeMap = {
    small: {
      icon: 14,
      padding: '0.125rem 0.25rem',
      fontSize: '0.625rem',
      gap: '0.25rem'
    },
    medium: {
      icon: 16,
      padding: '0.25rem 0.5rem',
      fontSize: '0.7rem',
      gap: '0.375rem'
    },
    large: {
      icon: 20,
      padding: '0.375rem 0.75rem',
      fontSize: '0.875rem',
      gap: '0.5rem'
    }
  }

  const sizing = sizeMap[size]
  const Icon = config.icon

  return (
    <span
      title={config.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizing.gap,
        padding: sizing.padding,
        background: `${config.color}15`,
        border: `1px solid ${config.color}40`,
        borderRadius: 'var(--radius)',
        fontSize: sizing.fontSize,
        fontWeight: '700',
        color: config.color,
        fontFamily: 'var(--font-body)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}
    >
      <Icon size={sizing.icon} color={config.color} style={{ flexShrink: 0 }} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
