'use client'
import { useAuth } from '@/hooks/useAuth'
import { useProfileCompletion } from '@/components/ProfileCompletion'
import Auth from '@/components/Auth'
import ProfileCompletion from '@/components/ProfileCompletion'
import Map from '@/components/Map'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const { needsCompletion, loading: profileLoading } = useProfileCompletion()
  const [profileCompleted, setProfileCompleted] = useState(false)

  const handleMapClick = (lng: number, lat: number) => {
    console.log('Map clicked at:', { lng, lat })
    // TODO: Add pin creation logic with enhanced visual feedback
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const handleProfileComplete = () => {
    setProfileCompleted(true)
  }

  // Show loading state while checking auth/profile
  if (authLoading || profileLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="text-xl font-medium text-muted">Loading Travlr...</div>
      </div>
    )
  }

  // No user -> show auth
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="text-center fade-in" style={{ marginBottom: '2rem' }}>
            <h1 className="text-5xl font-bold" style={{ 
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Travlr
            </h1>
            <p className="text-lg text-muted">
              Discover and map your world
            </p>
          </div>
          <Auth />
        </div>
      </div>
    )
  }

  // User exists but needs profile completion
  if ((needsCompletion && !profileCompleted)) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <ProfileCompletion onComplete={handleProfileComplete} />
        </div>
      </div>
    )
  }

  // User is fully authenticated and has profile
  return (
    <div className="page-container page-bg-default">
      <nav className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-brand">
            Travlr
          </h1>
          <div className="navbar-user">
            <div className="user-avatar">
              {getUserInitials(user.email || '')}
            </div>
            <span className="user-email">
              {user.email}
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
        <div className="map-container">
          <div className="map-card fade-in">
            <div className="map-header">
              <h2 className="map-title">
                Your Map
              </h2>
              <p className="map-description">
                THIS IS INFO ABOUT YOUR MAP
              </p>
            </div>
            
            <div className="map-wrapper">
              <Map onMapClick={handleMapClick} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}