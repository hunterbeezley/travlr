'use client'
import { useEffect } from 'react'
import { Check, X, AlertCircle, Info } from 'lucide-react'

interface ToastProps {
  message: string
  icon?: string
  duration?: number
  onClose: () => void
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default'
}

export default function Toast({
  message,
  icon,
  duration = 3000,
  onClose,
  variant = 'default'
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  // Variant configurations
  const variantConfig = {
    success: {
      background: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgb(34, 197, 94)',
      icon: <Check size={20} strokeWidth={2.5} style={{ color: 'rgb(34, 197, 94)' }} />,
      iconBg: 'rgba(34, 197, 94, 0.2)'
    },
    error: {
      background: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgb(239, 68, 68)',
      icon: <X size={20} strokeWidth={2.5} style={{ color: 'rgb(239, 68, 68)' }} />,
      iconBg: 'rgba(239, 68, 68, 0.2)'
    },
    warning: {
      background: 'rgba(251, 191, 36, 0.15)',
      borderColor: 'rgb(251, 191, 36)',
      icon: <AlertCircle size={20} strokeWidth={2.5} style={{ color: 'rgb(251, 191, 36)' }} />,
      iconBg: 'rgba(251, 191, 36, 0.2)'
    },
    info: {
      background: 'rgba(59, 130, 246, 0.15)',
      borderColor: 'rgb(59, 130, 246)',
      icon: <Info size={20} strokeWidth={2.5} style={{ color: 'rgb(59, 130, 246)' }} />,
      iconBg: 'rgba(59, 130, 246, 0.2)'
    },
    default: {
      background: 'var(--accent)',
      borderColor: 'var(--accent)',
      icon: icon ? <span style={{ fontSize: '1.25rem' }}>{icon}</span> : null,
      iconBg: 'transparent'
    }
  }

  const config = variantConfig[variant]

  return (
    <div
      role="alert"
      aria-live="polite"
      className="glass-strong"
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: config.background,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${config.borderColor}`,
        color: 'var(--foreground)',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        animation: 'toastSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.875rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minWidth: '250px',
        maxWidth: '90vw'
      }}
    >
      {/* Icon container with animation for success variant */}
      {config.icon && (
        <div
          className={variant === 'success' ? 'animate-scale-in' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: config.iconBg,
            flexShrink: 0
          }}
        >
          {config.icon}
        </div>
      )}
      <span>{message}</span>

      <style jsx>{`
        @keyframes toastSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  )
}
