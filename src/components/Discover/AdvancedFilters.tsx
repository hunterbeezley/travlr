'use client'
import { useState } from 'react'

interface AdvancedFiltersProps {
  onApplyFilters: (filters: FilterState) => void
  onClearFilters: () => void
}

export interface FilterState {
  category: string | null
  city: string | null
  minPins: number | null
  maxPins: number | null
  hasImages: boolean | null
  verifiedOnly: boolean
  minLikes: number | null
  sortBy: 'relevance' | 'popular' | 'recent' | 'trending'
}

const CATEGORIES = [
  'Coffee Shops',
  'Restaurants',
  'Bars & Nightlife',
  'Hotels & Stays',
  'Things to Do',
  'Outdoors & Nature',
  'Culture & Arts',
  'Shopping',
  'Other'
]

export default function AdvancedFilters({ onApplyFilters, onClearFilters }: AdvancedFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    city: null,
    minPins: null,
    maxPins: null,
    hasImages: null,
    verifiedOnly: false,
    minLikes: null,
    sortBy: 'relevance'
  })

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApplyFilters(filters)
    setShowFilters(false)
  }

  const handleClear = () => {
    setFilters({
      category: null,
      city: null,
      minPins: null,
      maxPins: null,
      hasImages: null,
      verifiedOnly: false,
      minLikes: null,
      sortBy: 'relevance'
    })
    onClearFilters()
  }

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy') return false
    if (value === null || value === false) return false
    return true
  }).length

  return (
    <div>
      {/* Toggle Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        style={{
          padding: '0.75rem 1rem',
          background: showFilters ? 'var(--accent)' : 'var(--muted)',
          color: showFilters ? 'white' : 'var(--foreground)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span>🔍 Filters</span>
        {activeFilterCount > 0 && (
          <span style={{
            background: 'white',
            color: 'var(--accent)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: '700'
          }}>
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {showFilters && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              marginBottom: '1.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Advanced Filters
            </h2>

            {/* Category */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.875rem',
                  color: 'var(--foreground)'
                }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                City
              </label>
              <input
                type="text"
                value={filters.city || ''}
                onChange={(e) => updateFilter('city', e.target.value || null)}
                placeholder="e.g., San Francisco"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.875rem',
                  color: 'var(--foreground)'
                }}
              />
            </div>

            {/* Pin Count Range */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Number of Pins
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  value={filters.minPins || ''}
                  onChange={(e) => updateFilter('minPins', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Min"
                  min="0"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    color: 'var(--foreground)'
                  }}
                />
                <span style={{ color: 'var(--muted-foreground)' }}>to</span>
                <input
                  type="number"
                  value={filters.maxPins || ''}
                  onChange={(e) => updateFilter('maxPins', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Max"
                  min="0"
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    color: 'var(--foreground)'
                  }}
                />
              </div>
            </div>

            {/* Minimum Likes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Minimum Likes
              </label>
              <input
                type="number"
                value={filters.minLikes || ''}
                onChange={(e) => updateFilter('minLikes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g., 10"
                min="0"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.875rem',
                  color: 'var(--foreground)'
                }}
              />
            </div>

            {/* Toggles */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer'
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Has Images</span>
                <input
                  type="checkbox"
                  checked={filters.hasImages === true}
                  onChange={(e) => updateFilter('hasImages', e.target.checked ? true : null)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer'
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                  Verified Creators Only
                </span>
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => updateFilter('verifiedOnly', e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </label>
            </div>

            {/* Sort By */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.875rem',
                  color: 'var(--foreground)'
                }}
              >
                <option value="relevance">Relevance</option>
                <option value="popular">Most Popular</option>
                <option value="recent">Most Recent</option>
                <option value="trending">Trending</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleClear}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem'
                }}
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilters(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem'
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
