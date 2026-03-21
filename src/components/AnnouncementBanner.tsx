'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface AnnouncementBannerProps {
  id: string
  children: React.ReactNode
  variant?: 'info' | 'success' | 'warning'
}

export default function AnnouncementBanner({
  id,
  children,
  variant = 'info'
}: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(true) // Start true to avoid flash
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDismissed = localStorage.getItem(`banner-dismissed-${id}`)
    setDismissed(isDismissed === 'true')
  }, [id])

  const handleDismiss = () => {
    localStorage.setItem(`banner-dismissed-${id}`, 'true')
    setDismissed(true)
  }

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted || dismissed) return null

  const variantStyles = {
    info: {
      background: 'linear-gradient(135deg, rgba(230, 57, 70, 0.9) 0%, rgba(214, 40, 57, 0.9) 100%)',
      borderColor: 'rgba(230, 57, 70, 0.5)'
    },
    success: {
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)',
      borderColor: 'rgba(34, 197, 94, 0.5)'
    },
    warning: {
      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9) 0%, rgba(245, 158, 11, 0.9) 100%)',
      borderColor: 'rgba(251, 191, 36, 0.5)'
    }
  }

  const style = variantStyles[variant]

  return (
    <div
      role="banner"
      aria-label="Announcement"
      className="animate-slide-down"
      style={{
        background: style.background,
        borderBottom: `1px solid ${style.borderColor}`,
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        position: 'relative',
        zIndex: 50,
        color: 'white',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: '500',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Content */}
      <div style={{
        flex: 1,
        padding: '0 2rem'
      }}>
        {children}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
        style={{
          position: 'absolute',
          right: '1rem',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <X size={16} strokeWidth={2.5} />
      </button>

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
