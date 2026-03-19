'use client'

interface Badge {
  badge_type: string
  earned_at: string
  metadata: any
}

interface UserBadgesProps {
  badges: Badge[]
}

const BADGE_CONFIG: Record<string, { icon: string; label: string; description: string; color: string }> = {
  creator_starter: {
    icon: '🌱',
    label: 'Creator Starter',
    description: 'Created your first collection',
    color: '#10b981'
  },
  creator_bronze: {
    icon: '🥉',
    label: 'Bronze Creator',
    description: 'Created 5 collections',
    color: '#cd7f32'
  },
  creator_silver: {
    icon: '🥈',
    label: 'Silver Creator',
    description: 'Created 15 collections',
    color: '#c0c0c0'
  },
  creator_gold: {
    icon: '🥇',
    label: 'Gold Creator',
    description: 'Created 30+ collections',
    color: '#ffd700'
  },
  explorer_bronze: {
    icon: '🗺️',
    label: 'Bronze Explorer',
    description: 'Saved 10 collections',
    color: '#cd7f32'
  },
  explorer_silver: {
    icon: '🧭',
    label: 'Silver Explorer',
    description: 'Saved 50 collections',
    color: '#c0c0c0'
  },
  explorer_gold: {
    icon: '🌍',
    label: 'Gold Explorer',
    description: 'Saved 100+ collections',
    color: '#ffd700'
  },
  social_butterfly: {
    icon: '🦋',
    label: 'Social Butterfly',
    description: 'Following 25+ people',
    color: '#ec4899'
  },
  trendsetter: {
    icon: '🔥',
    label: 'Trendsetter',
    description: 'Created a trending collection',
    color: '#f97316'
  },
  local_expert: {
    icon: '⭐',
    label: 'Local Expert',
    description: 'Highly-rated local collections',
    color: '#8b5cf6'
  },
  verified_creator: {
    icon: '✓',
    label: 'Verified Creator',
    description: 'Verified account',
    color: '#3b82f6'
  },
  early_adopter: {
    icon: '🚀',
    label: 'Early Adopter',
    description: 'Joined in early access',
    color: '#06b6d4'
  },
  beta_tester: {
    icon: '🧪',
    label: 'Beta Tester',
    description: 'Helped test new features',
    color: '#a855f7'
  }
}

export default function UserBadges({ badges }: UserBadgesProps) {
  if (!badges || badges.length === 0) return null

  return (
    <div style={{
      background: 'var(--card)',
      border: '2px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem'
    }}>
      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: '700',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '1rem'
      }}>
        🏅 Badges ({badges.length})
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '0.75rem'
      }}>
        {badges.map((badge) => {
          const config = BADGE_CONFIG[badge.badge_type] || {
            icon: '🏆',
            label: badge.badge_type,
            description: 'Achievement unlocked',
            color: '#6b7280'
          }

          return (
            <div
              key={badge.badge_type}
              title={config.description}
              style={{
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
                textAlign: 'center',
                cursor: 'help',
                transition: 'var(--transition)',
                border: `2px solid ${config.color}33`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.background = 'var(--background)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.background = 'var(--muted)'
              }}
            >
              <div style={{
                fontSize: '2rem',
                marginBottom: '0.25rem'
              }}>
                {config.icon}
              </div>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                color: config.color,
                lineHeight: '1.2'
              }}>
                {config.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
