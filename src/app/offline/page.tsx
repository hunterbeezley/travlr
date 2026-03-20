'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    // Check if we're back online
    const handleOnline = () => {
      setIsOnline(true)
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }

    window.addEventListener('online', handleOnline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [router])

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push('/')
    } else {
      window.location.reload()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      padding: '2rem'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        {/* Logo */}
        <svg width="96" height="96" viewBox="0 0 48 48" style={{
          margin: '0 auto 2rem',
          opacity: 0.5
        }}>
          <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
          <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--color-red)" strokeWidth="2"/>
          <circle cx="24" cy="24" r="6" fill="var(--color-red)"/>
          <line x1="4" y1="4" x2="8" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
          <line x1="44" y1="4" x2="40" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
          <line x1="4" y1="44" x2="8" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
          <line x1="44" y1="44" x2="40" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
        </svg>

        {isOnline ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              color: '#22c55e'
            }}>
              Back Online!
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'var(--muted-foreground)',
              marginBottom: '2rem'
            }}>
              Redirecting you now...
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase'
            }}>
              You're Offline
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'var(--muted-foreground)',
              marginBottom: '2rem',
              lineHeight: '1.6'
            }}>
              It looks like you've lost your internet connection. Check your network settings and try again.
            </p>

            <button
              onClick={handleRetry}
              style={{
                padding: '1rem 2rem',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
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
              🔄 Try Again
            </button>

            <p style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              marginTop: '2rem'
            }}>
              Some cached content may still be available
            </p>
          </>
        )}
      </div>
    </div>
  )
}
