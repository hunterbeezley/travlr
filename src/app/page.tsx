'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Auth from '@/components/Auth'
import Map from '@/components/Map'
import UserAvatar from '@/components/UserAvatar'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  const handleMapClick = (lng: number, lat: number) => {
    console.log('Map clicked at:', { lng, lat })
    // TODO: Add pin creation logic with enhanced visual feedback
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="text-xl font-medium text-muted">Loading Travlr...</div>
      </div>
    )
  }

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

  return (
    <div className="page-container">
      <nav className="navbar">
        <div className="navbar-content">
          <h1 className="navbar-brand">
            Travlr
          </h1>
          
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
                Explore and discover amazing places around the world
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