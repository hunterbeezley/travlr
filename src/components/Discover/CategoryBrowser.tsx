'use client'

interface CategoryBrowserProps {
  onSelect: (category: string) => void
  selected: string
}

export default function CategoryBrowser({ onSelect, selected }: CategoryBrowserProps) {
  const categories = [
    { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
    { value: 'coffee', label: 'Coffee', icon: '☕' },
    { value: 'bar', label: 'Bars', icon: '🍺' },
    { value: 'travel', label: 'Travel', icon: '✈️' },
    { value: 'hotel', label: 'Hotels', icon: '🏨' },
    { value: 'museum', label: 'Museums', icon: '🏛️' },
    { value: 'park', label: 'Parks', icon: '🌳' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'beach', label: 'Beaches', icon: '🏖️' },
    { value: 'hike', label: 'Hiking', icon: '🥾' },
  ]

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: '700',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '1rem',
        color: 'var(--foreground)'
      }}>
        Browse by Category
      </h3>

      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => onSelect(category.value)}
            style={{
              padding: '0.5rem 1rem',
              background: selected === category.value ? 'var(--accent)' : 'var(--muted)',
              color: selected === category.value ? 'white' : 'var(--foreground)',
              border: '2px solid',
              borderColor: selected === category.value ? 'var(--accent)' : 'var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (selected !== category.value) {
                e.currentTarget.style.borderColor = 'var(--accent)'
              }
            }}
            onMouseLeave={(e) => {
              if (selected !== category.value) {
                e.currentTarget.style.borderColor = 'var(--border)'
              }
            }}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
