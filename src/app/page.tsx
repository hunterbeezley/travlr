'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Map from '@/components/Map'
import UserAvatar from '@/components/UserAvatar'
import ProfileCompletion from '@/components/ProfileCompletion'
import Auth from '@/components/Auth'  // ← ADD THIS IMPORT
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
    setSelectedPin(updatedPin)
  }

  const handlePinDelete = (deletedPinId: string) => {
    setPins(prevPins => prevPins.filter(pin => pin.id !== deletedPinId))
    setSelectedPin(null)
  }

  const fetchPins = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pins:', error)
        return
      }

      setPins(data || [])
    } catch (error) {
      console.error('Error fetching pins:', error)
    }
  }

  useEffect(() => {
    if (user && !loading) {
      fetchPins()
      
      // Only check for profile completion after auth loading is complete
      // and we have confirmed the profile data
      if (profile !== null && !profile?.username) {
        setShowProfileCompletion(true)
      }
    }
  }, [user, profile, loading])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            border: '3px solid var(--muted)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // ← REPLACE THIS ENTIRE SECTION with the Auth component
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

            {/* Use the Auth component instead of hardcoded Google button */}
            <Auth />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {showProfileCompletion && (
        <ProfileCompletion 
          onComplete={() => {
            setShowProfileCompletion(false)
            refreshProfile()
          }} 
        />
      )}

      <nav className="navbar">
        <div className="navbar-content">
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 400 300" style={{ flexShrink: 0 }}>
              {/* Outer circle */}
              <circle 
                cx="200" 
                cy="150" 
                r="45" 
                fill="none" 
                stroke="#EA8B47" 
                strokeWidth="6"
              />
              {/* Inner orange dot */}
              <circle 
                cx="200" 
                cy="150" 
                r="15" 
                fill="#EA8B47"
              />
            </svg>
            <span style={{ color: '#EA8B47', fontWeight: '700', fontSize: '1.5rem' }}>
              Travlr
            </span>
          </div>
          
          {/* Navigation Menu */}
          <div className="navbar-nav">
            <button
              onClick={() => router.push('/')}
              className="nav-link active"
            >
              🗺️ Map
            </button>
            
            <button
              onClick={() => router.push('/profile')}
              className="nav-link"
            >
              👤 Profile
            </button>
          </div>

          <div className="navbar-user">
            <UserAvatar
              profileImageUrl={profile?.profile_image_url}
              email={user.email || ''}
              size="medium"
            />
            <span className="user-email">
              {getDisplayName(profile, user)}
            </span>
            <button
              onClick={handleSignOut}
              className="btn btn-destructive btn-small"
              title="Sign out"
            >
              🚪 Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="map-container-full">
          <div className="map-card-full fade-in">
            <div className="map-wrapper-full">
              <Map onMapClick={handleMapClick} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}