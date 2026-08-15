'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { DatabaseService } from '@/lib/database'

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem('gdpr_consent')
    if (!hasConsented) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000)
    }
  }, [])

  const handleConsent = async (consented: boolean) => {
    setLoading(true)

    try {
      // Generate a session ID for tracking consent (for non-authenticated users)
      let sessionId = localStorage.getItem('session_id')
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('session_id', sessionId)
      }

      // Try to record consent in database (gracefully handle if migration not run yet)
      try {
        await DatabaseService.recordConsent('data_collection', consented, sessionId)
      } catch (dbError) {
        logger.warn('Could not record consent in database (migration may not be run):', dbError)
        // Continue anyway - local storage is enough for now
      }

      // Store consent locally (primary storage until migration is run)
      localStorage.setItem('gdpr_consent', consented ? 'accepted' : 'declined')
      localStorage.setItem('gdpr_consent_date', new Date().toISOString())

      // Hide banner
      setShowBanner(false)
    } catch (error) {
      logger.error('Error handling consent:', error)
      // Still hide banner and store locally even if everything fails
      localStorage.setItem('gdpr_consent', consented ? 'accepted' : 'declined')
      setShowBanner(false)
    } finally {
      setLoading(false)
    }
  }

  if (!showBanner) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '2px solid rgba(255, 255, 255, 0.1)',
      padding: '20px',
      paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      zIndex: 9999,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Cookie Icon */}
        <div style={{ fontSize: '32px' }}>🍪</div>

        {/* Message */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <p style={{
            color: 'white',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: 0
          }}>
            We use essential cookies to provide our service. By continuing to use Travlr, you consent to our data collection practices as described in our{' '}
            <a href="/privacy" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleConsent(false)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Decline
          </button>
          <button
            onClick={() => handleConsent(true)}
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#2563eb'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3b82f6'
            }}
          >
            {loading ? 'Processing...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
