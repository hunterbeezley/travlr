'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface CityBrowserProps {
  onSelect: (city: string) => void
  selected: string
}

export default function CityBrowser({ onSelect, selected }: CityBrowserProps) {
  const [cities, setCities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const loadCities = async () => {
      try {
        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          console.error('No session found')
          setLoading(false)
          return
        }

        const { data, error } = await supabase.rpc('get_popular_cities', {
          p_limit: 20
        })

        if (error) throw error
        setCities(data || [])
      } catch (error) {
        console.error('Error loading cities:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCities()
  }, [])

  if (loading) {
    return (
      <div style={{
        marginBottom: '2rem',
        padding: '1rem',
        background: 'var(--muted)',
        borderRadius: 'var(--radius)',
        textAlign: 'center',
        color: 'var(--muted-foreground)',
        fontSize: '0.875rem'
      }}>
        Loading cities...
      </div>
    )
  }

  if (cities.length === 0) return null

  const displayCities = expanded ? cities : cities.slice(0, 6)

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
        Popular Cities
      </h3>

      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        {displayCities.map((city) => (
          <button
            key={city.city}
            onClick={() => onSelect(city.city)}
            style={{
              padding: '0.5rem 1rem',
              background: selected === city.city ? 'var(--accent)' : 'var(--muted)',
              color: selected === city.city ? 'white' : 'var(--foreground)',
              border: '2px solid',
              borderColor: selected === city.city ? 'var(--accent)' : 'var(--border)',
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
              if (selected !== city.city) {
                e.currentTarget.style.borderColor = 'var(--accent)'
              }
            }}
            onMouseLeave={(e) => {
              if (selected !== city.city) {
                e.currentTarget.style.borderColor = 'var(--border)'
              }
            }}
          >
            <span>🌆</span>
            <span>{city.city}</span>
            <span style={{
              fontSize: '0.7rem',
              opacity: 0.7
            }}>
              ({city.collection_count})
            </span>
          </button>
        ))}

        {cities.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            {expanded ? 'Show Less' : `+${cities.length - 6} More`}
          </button>
        )}
      </div>
    </div>
  )
}
