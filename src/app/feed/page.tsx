'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import UserAvatar from '@/components/UserAvatar'
import CityFeedTimeline from '@/components/CityFeedTimeline'

const getDisplayName = (profile: any, user: any) => {
  if (profile?.full_name) return profile.full_name
  if (profile?.username) return `@${profile.username}`
  if (profile?.id) {
    const shortId = profile.id.slice(0, 8)
    return `anon${shortId}`
  }
  return user?.email || 'User'
}

export default function FeedPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [activeNav, setActiveNav] = useState('feed')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

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

  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
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
              onClick={() => {
                setActiveNav('map')
                router.push('/')
              }}
              className={`nav-link ${activeNav === 'map' ? 'active' : ''}`}
            >
              MAP
            </button>

            <button
              onClick={() => {
                setActiveNav('feed')
                router.push('/feed')
              }}
              className={`nav-link ${activeNav === 'feed' ? 'active' : ''}`}
            >
              FEED
            </button>

            <button
              onClick={() => {
                setActiveNav('profile')
                router.push('/profile')
              }}
              className={`nav-link ${activeNav === 'profile' ? 'active' : ''}`}
            >
              PROFILE
            </button>
          </div>

          {!loading && user && (
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
          )}
        </div>
      </nav>

      <main className="main-content">
        <CityFeedTimeline userId={user.id} />
      </main>
    </div>
  )
}
