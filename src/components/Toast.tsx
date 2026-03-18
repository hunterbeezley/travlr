'use client'
import { useEffect } from 'react'

interface ToastProps {
  message: string
  icon?: string
  duration?: number
  onClose: () => void
}

export default function Toast({ message, icon = '✓', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--accent)',
        color: 'white',
        padding: '1rem 2rem',
        borderRadius: 'var(--radius)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        animation: 'toastSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.875rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minWidth: '250px',
        maxWidth: '90vw'
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>{icon}</span>
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
