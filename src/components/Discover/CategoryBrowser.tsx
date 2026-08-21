'use client'
import { BROWSE_CATEGORY_ICONS } from '@/lib/categoryIcons'

interface CategoryBrowserProps {
  onSelect: (category: string) => void
  selected: string
}

export default function CategoryBrowser({ onSelect, selected }: CategoryBrowserProps) {
  const categories = [
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'coffee', label: 'Coffee' },
    { value: 'bar', label: 'Bars' },
    { value: 'travel', label: 'Travel' },
    { value: 'hotel', label: 'Hotels' },
    { value: 'museum', label: 'Museums' },
    { value: 'park', label: 'Parks' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'beach', label: 'Beaches' },
    { value: 'hike', label: 'Hiking' },
  ]

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: '700',
        fontFamily: 'var(--font-display)',
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
        {categories.map((category) => {
          const Icon = BROWSE_CATEGORY_ICONS[category.value]
          return (
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
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'var(--font-body)',
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
              {Icon && <Icon size={16} />}
              <span>{category.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
