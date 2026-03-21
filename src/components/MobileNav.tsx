'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Home, Map, Search, Users, User } from 'lucide-react'

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
    { path: '/', label: 'Feed', icon: Home },
    { path: '/map', label: 'Map', icon: Map },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/friends', label: 'Friends', icon: Users },
    { path: '/profile', label: 'Profile', icon: User }
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
        const Icon = item.icon

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
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 2}
            />
          </button>
        )
      })}
    </nav>
  )
}
