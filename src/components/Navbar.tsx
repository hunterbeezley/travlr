'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import UserAvatar from '@/components/UserAvatar'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile, loading } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Logo */}
        <div
          className="navbar-brand"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
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
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            MAP
          </button>

          <button
            onClick={() => router.push('/feed')}
            className={`nav-link ${isActive('/feed') ? 'active' : ''}`}
          >
            FEED
          </button>

          <button
            onClick={() => router.push('/explore')}
            className={`nav-link ${isActive('/explore') ? 'active' : ''}`}
          >
            EXPLORE
          </button>

          <button
            onClick={() => router.push('/saved')}
            className={`nav-link ${isActive('/saved') ? 'active' : ''}`}
          >
            SAVED
          </button>

          {user && (
            <button
              onClick={() => router.push('/analytics')}
              className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}
            >
              ANALYTICS
            </button>
          )}
        </div>

        {!loading && user && (
          <div className="navbar-user">
            <div
              onClick={() => router.push('/profile')}
              style={{ cursor: 'pointer' }}
              title="Go to profile"
            >
              <UserAvatar
                profileImageUrl={profile?.profile_image}
                email={user.email || ''}
                size="medium"
              />
            </div>
            <button
              onClick={handleSignOut}
              className="btn btn-destructive btn-small"
              title="Sign out"
            >
              LOGOUT
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
