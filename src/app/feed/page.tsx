'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FeedRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
    </div>
  )
}
