'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { X, Smartphone } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

      // Don't show again for 7 days
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      // Show the install prompt after a delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Wait 3 seconds before showing
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      logger.log('PWA was installed')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    logger.log('User response to install prompt:', outcome)

    if (outcome === 'accepted') {
      logger.log('User accepted the install prompt')
    } else {
      logger.log('User dismissed the install prompt')
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  // Don't render if already installed or no prompt to show
  if (isInstalled || !showPrompt) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        // Clear the mobile bottom nav bar (~70px + safe area) instead of
        // sitting underneath/behind it.
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
        left: '1rem',
        right: '1rem',
        maxWidth: '500px',
        margin: '0 auto',
        zIndex: 1150,
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <div
        style={{
          background: 'rgba(39, 39, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '2px solid var(--accent)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0.25rem',
            lineHeight: 1,
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--foreground)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted-foreground)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          {/* Icon */}
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
            <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--accent)" strokeWidth="2"/>
            <circle cx="24" cy="24" r="6" fill="var(--accent)"/>
            <line x1="4" y1="4" x2="8" y2="8" stroke="var(--accent)" strokeWidth="2"/>
            <line x1="44" y1="4" x2="40" y2="8" stroke="var(--accent)" strokeWidth="2"/>
            <line x1="4" y1="44" x2="8" y2="40" stroke="var(--accent)" strokeWidth="2"/>
            <line x1="44" y1="44" x2="40" y2="40" stroke="var(--accent)" strokeWidth="2"/>
          </svg>

          {/* Content */}
          <div style={{ flex: 1, paddingRight: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)',
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Smartphone size={20} /> Install Travlr
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              marginBottom: '1rem',
              lineHeight: '1.5'
            }}>
              Add Travlr to your home screen for quick access and a better experience!
            </p>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleInstall}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  fontFamily: 'var(--font-body)',
                  transition: 'var(--transition)'
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
                Install Now
              </button>

              <button
                onClick={handleDismiss}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: 'transparent',
                  color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  fontFamily: 'var(--font-body)',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--foreground)'
                  e.currentTarget.style.color = 'var(--foreground)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
