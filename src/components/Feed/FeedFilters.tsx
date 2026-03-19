'use client'

interface FeedFiltersProps {
  filter: 'all' | 'friends' | 'self'
  onFilterChange: (filter: 'all' | 'friends' | 'self') => void
  followingCount: number
}

export default function FeedFilters({
  filter,
  onFilterChange,
  followingCount
}: FeedFiltersProps) {
  const filters = [
    { value: 'all' as const, label: 'All' },
    { value: 'friends' as const, label: `Friends (${followingCount})` },
    { value: 'self' as const, label: 'Me' }
  ]

  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      background: 'var(--muted)',
      padding: '0.25rem',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)'
    }}>
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onFilterChange(f.value)}
          style={{
            padding: '0.5rem 1rem',
            background: filter === f.value ? 'var(--accent)' : 'transparent',
            color: filter === f.value ? 'white' : 'var(--foreground)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: '600',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            transition: 'var(--transition)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (filter !== f.value) {
              e.currentTarget.style.background = 'var(--background)'
            }
          }}
          onMouseLeave={(e) => {
            if (filter !== f.value) {
              e.currentTarget.style.background = 'transparent'
            }
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
