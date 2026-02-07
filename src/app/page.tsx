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
  if (profile?.full_name) return profile.full_name
  if (profile?.username) return `@${profile.username}`
  // Generate anonymous name based on user ID
  if (profile?.id) {
    const shortId = profile.id.slice(0, 8)
    return `anon${shortId}`
  }
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
              gap: '1rem',
              marginBottom: '3rem',
              justifyContent: 'center'
            }}>
              <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                {/* Geometric logo */}
                <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
                <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--color-red)" strokeWidth="2"/>
                <circle cx="24" cy="24" r="8" fill="var(--color-red)"/>
                <line x1="4" y1="4" x2="8" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
                <line x1="44" y1="4" x2="40" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
                <line x1="4" y1="44" x2="8" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
                <line x1="44" y1="44" x2="40" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
              </svg>
              <h1 style={{
                fontSize: '3rem',
                fontWeight: '700',
                color: 'var(--color-white)',
                margin: 0,
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
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
          <div className="navbar-brand" style={{ cursor: 'default' }}>
            <svg width="32" height="32" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <rect x="4" y="4" width="40" height="40" fill="none" stroke="var(--color-white)" strokeWidth="2"/>
              <rect x="8" y="8" width="32" height="32" fill="none" stroke="var(--color-red)" strokeWidth="2"/>
              <circle cx="24" cy="24" r="6" fill="var(--color-red)"/>
              <line x1="4" y1="4" x2="8" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="44" y1="4" x2="40" y2="8" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="4" y1="44" x2="8" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
              <line x1="44" y1="44" x2="40" y2="40" stroke="var(--color-red)" strokeWidth="2"/>
            </svg>
            Travlr
          </div>

          {/* Navigation Menu */}
          <div className="navbar-nav">
            <button
              onClick={() => router.push('/')}
              className="nav-link active"
            >
              MAP
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="nav-link"
            >
              PROFILE
            </button>
          </div>

          <div className="navbar-user">
            <UserAvatar
              profileImageUrl={profile?.profile_image}
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
              EXIT
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