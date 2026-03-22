'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Home, Map, Search, Users, User } from 'lucide-react'
import UserAvatar from './UserAvatar'

export default function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile } = useAuth()

  // Debug: Log profile data
  console.log('MobileNav - Profile data:', {
    hasProfile: !!profile,
    hasProfileImage: !!profile?.profile_image,
    profileImageUrl: profile?.profile_image,
    email: user?.email
  })

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', label: 'Feed' },
    { path: '/map', label: 'Map' },
    { path: '/search', label: 'Search' },
    { path: '/friends', label: 'Friends' },
    { path: '/profile', label: 'Profile' }
  ]

  const renderIcon = (path: string, active: boolean) => {
    const props = { size: 22, strokeWidth: active ? 2.5 : 2 }
    switch (path) {
      case '/': return <Home {...props} />
      case '/map': return <Map {...props} />
      case '/search': return <Search {...props} />
      case '/friends': return <Users {...props} />
      case '/profile': return (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: active ? '2px solid white' : '2px solid transparent',
          transition: 'all 0.2s ease'
        }}>
          <UserAvatar
            profileImageUrl={profile?.profile_image}
            email={user?.email || ''}
            size="small"
          />
        </div>
      )
      default: return null
    }
  }

  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--card)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0.75rem 0',
        zIndex: 1000,
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))'
      }}>
      {navItems.map((item) => {
        const active = isActive(item.path)

        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            aria-label={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem 1.25rem',
              background: active ? 'var(--accent)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              color: active ? 'white' : 'var(--muted-foreground)',
              transition: 'all 0.2s ease',
              minWidth: '48px',
              minHeight: '48px'
            }}
          >
            {renderIcon(item.path, active)}
          </button>
        )
      })}
    </nav>
  )
}
