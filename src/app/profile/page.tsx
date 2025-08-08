'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Map from '@/components/Map'
import UserAvatar from '@/components/UserAvatar'
import ProfileCompletion from '@/components/ProfileCompletion'
import Auth from '@/components/Auth'
import { supabase } from '@/lib/supabase'

interface Pin {
  id: string
  title: string
  description?: string
  latitude: number
  longitude: number
  collection_id?: string
  user_id: string
  created_at: string
}

const getDisplayName = (profile: any, user: any) => {
  if (profile?.username) return `@${profile.username}`
  if (profile?.full_name) return profile.full_name
  return user?.email || 'User'
}

export default function HomePage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [showPinForm, setShowPinForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [isDraggingPin, setIsDraggingPin] = useState(false)
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleMapClick = (lat: number, lng: number) => {
    if (!user) return
    
    setSelectedLocation({ lat, lng })
    setShowPinForm(true)
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    if (!user) return
    
    setSelectedLocation({ lat, lng })
    setShowPinForm(true)
  }

  const handlePinSaved = (newPin: Pin) => {
    setPins(prevPins => [...prevPins, newPin])
    setShowPinForm(false)
    setSelectedLocation(null)
  }

  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin)
  }

  const handlePinDragStart = () => {
    setIsDraggingPin(true)
  }

  const handlePinDragEnd = () => {
    setIsDraggingPin(false)
  }

  const handlePinUpdate = (updatedPin: Pin) => {
    setPins(prevPins => 
      prevPins.map(pin => 
        pin.id === updatedPin.id ? updatedPin : pin
      )
    )
  }

  const handlePinDelete = (deletedPinId: string) => {
    setPins(prevPins => prevPins.filter(pin => pin.id !== deletedPinId))
    setSelectedPin(null)
  }

  // Check if profile is incomplete and show completion modal
  useEffect(() => {
    if (user && profile && !loading) {
      const isIncomplete = !profile.username || !profile.full_name
      setShowProfileCompletion(isIncomplete)
    }
  }, [user, profile, loading])

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 100%)'
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
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ maxWidth: '400px', width: '100%' }}>
            {/* App Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '2rem',
              justifyContent: 'center'
            }}>
              <svg width="40" height="40" viewBox="0 0 400 300" style={{ flexShrink: 0 }}>
                <circle 
                  cx="200" 
                  cy="150" 
                  r="45" 
                  fill="none" 
                  stroke="#EA8B47" 
                  strokeWidth="4"
                />
                <circle 
                  cx="200" 
                  cy="150" 
                  r="15" 
                  fill="#EA8B47"
                />
              </svg>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0
              }}>
                Travlr
              </h1>
            </div>

            {/* Use the existing Auth component for email authentication */}
            <Auth />
          </div>
        </div>
      </div>
    )
  }

  // Show the main app for authenticated users
  return (
    <div className="page-container">
      {/* Profile Completion Modal */}
      {showProfileCompletion && (
        <ProfileCompletion
          onComplete={() => {
            setShowProfileCompletion(false)
            refreshProfile()
          }}
        />
      )}

      {/* Navigation Bar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="32" height="32" viewBox="0 0 400 300" style={{ flexShrink: 0 }}>
              <circle 
                cx="200" 
                cy="150" 
                r="45" 
                fill="none" 
                stroke="#EA8B47" 
                strokeWidth="4"
              />
              <circle 
                cx="200" 
                cy="150" 
                r="15" 
                fill="#EA8B47"
              />
            </svg>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              Travlr
            </h1>
          </div>
          
          {/* Navigation Menu */}
          <div style={{
            display: 'flex',
            gap: '1rem'
          }}>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              🗺️ Map
            </button>
            
            <button
              onClick={() => router.push('/profile')}
              style={{
                padding: '0.5rem 1rem',
                background: 'none',
                color: 'var(--muted-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              👤 Profile
            </button>
          </div>

          {/* User Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <UserAvatar
              profileImageUrl={profile?.profile_image_url}
              email={user.email || ''}
              size="small"
            />
            <span style={{
              fontSize: '0.875rem',
              color: 'var(--foreground)'
            }}>
              {getDisplayName(profile, user)}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                padding: '0.375rem 0.75rem',
                background: 'none',
                color: 'var(--muted-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ 
        paddingTop: '4rem', // Account for fixed navbar
        height: '100vh' 
      }}>
        <Map onMapClick={handleMapClick} />
      </main>
    </div>
  )
}