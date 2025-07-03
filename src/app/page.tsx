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
  color: '#EA8B47',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem'
}}>
  <svg 
    width="48" 
    height="48" 
    viewBox="0 0 400 400" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Pin shape */}
    <path 
      d="M200 50c-55.228 0-100 44.772-100 100 0 75 100 150 100 150s100-75 100-150c0-55.228-44.772-100-100-100z" 
      fill="#EA8B47"
    />
    {/* Inner white circle */}
    <circle 
      cx="200" 
      cy="150" 
      r="40" 
      fill="white"
    />
    {/* Inner orange dot */}
    <circle 
      cx="200" 
      cy="150" 
      r="15" 
      fill="#EA8B47"
    />
  </svg>
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
    <div className="page-container page-bg-default">
      <nav className="navbar">
  <div className="navbar-content">
    <div className="navbar-brand">
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 400 400" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginRight: '0.5rem' }}
      >
        {/* Pin shape */}
        <path 
          d="M200 50c-55.228 0-100 44.772-100 100 0 75 100 150 100 150s100-75 100-150c0-55.228-44.772-100-100-100z" 
          fill="#EA8B47"
        />
        {/* Inner white circle */}
        <circle 
          cx="200" 
          cy="150" 
          r="40" 
          fill="white"
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