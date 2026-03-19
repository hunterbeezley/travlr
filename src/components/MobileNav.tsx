'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function MobileNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', label: 'Feed', icon: '📱' },
    { path: '/map', label: 'Map', icon: '🗺️' },
    { path: '/explore', label: 'Explore', icon: '🔍' },
    { path: '/friends', label: 'Friends', icon: '👥' },
    { path: '/profile', label: 'Profile', icon: '👤' }
  ]

  return (
    <nav
      className="mobile-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--card)',
        borderTop: '2px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0.5rem 0',
        zIndex: 1000,
        // Safe area padding for iOS devices with notches
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))'
      }}>
      {navItems.map((item) => {
        const active = isActive(item.path)

        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--accent)' : 'var(--muted-foreground)',
              transition: 'var(--transition)',
              minWidth: '64px',
              minHeight: '44px', // Apple HIG minimum touch target
              position: 'relative'
            }}
          >
            {/* Icon */}
            <span style={{
              fontSize: '1.5rem',
              lineHeight: 1,
              filter: active ? 'none' : 'grayscale(100%)',
              opacity: active ? 1 : 0.6
            }}>
              {item.icon}
            </span>

            {/* Label */}
            <span style={{
              fontSize: '0.625rem',
              fontWeight: active ? '700' : '500',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {item.label}
            </span>

            {/* Active indicator */}
            {active && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '32px',
                height: '3px',
                background: 'var(--accent)',
                borderRadius: '0 0 3px 3px'
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
