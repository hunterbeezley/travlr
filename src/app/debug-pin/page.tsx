// src/app/debug-pin/page.tsx
'use client'
import { useAuth } from '@/hooks/useAuth'
import Auth from '@/components/Auth'
import DebugPinCreationTest from '@/components/DebugPinCreationTest'

export default function DebugPinPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #ddd',
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{ margin: 0 }}>🔧 Pin Creation Debug</h1>
          {user && (
            <div>
              Logged in as: {user.email}
            </div>
          )}
        </div>
      </header>

      <main>
        {user ? (
          <DebugPinCreationTest />
        ) : (
          <div style={{
            maxWidth: '400px',
            margin: '2rem auto',
            padding: '2rem'
          }}>
            <h2>Please log in to test pin creation</h2>
            <Auth />
          </div>
        )}
      </main>
    </div>
  )
}