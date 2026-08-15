'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Map, Users } from 'lucide-react'
import UserAvatar from './UserAvatar'
import { Z_INDEX } from '@/lib/mapUiConstants'

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
    { path: '/map', label: 'Map' },
    { path: '/friends', label: 'Friends' },
    { path: '/profile', label: 'Profile' }
  ]

  const handleNavClick = (path: string, label: string, index: number) => {
    console.log('MobileNav - Button clicked:', {
      index,
      path,
      label,
      currentPathname: pathname,
      totalButtons: navItems.length
    })
    router.push(path)
    console.log('MobileNav - router.push() called with:', path)
  }

  const renderIcon = (path: string, active: boolean) => {
    const props = { size: 22, strokeWidth: active ? 2.5 : 2 }
    switch (path) {
      case '/map': return <Map {...props} />
      case '/friends': return <Users {...props} />
      case '/profile': return (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: active ? '2px solid white' : '2px solid transparent',
          transition: 'all 0.2s ease',
          pointerEvents: 'none'
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
        zIndex: Z_INDEX.mobileNav,
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))'
      }}>
      {navItems.map((item, index) => {
        const active = isActive(item.path)

        return (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path, item.label, index)}
            aria-label={item.label}
            data-nav-path={item.path}
            data-nav-index={index}
            type="button"
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
              minHeight: '48px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {renderIcon(item.path, active)}
          </button>
        )
      })}
    </nav>
  )
}
