'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ExploreRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to Feed page (the Explore functionality is now in the Discover tab)
    router.replace('/')
  }, [router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--background)'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div className="spinner" style={{
          width: '2rem',
          height: '2rem',
          margin: '0 auto 1rem'
        }} />
        <p>Redirecting to Discover...</p>
      </div>
    </div>
  )
}
