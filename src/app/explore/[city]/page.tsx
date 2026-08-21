'use client'
import { logger } from '@/lib/logger'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import CollectionGrid from '@/components/Discover/CollectionGrid'
import Auth from '@/components/Auth'
import { Building2, Folder, MapPin, Star, Clock, Flame } from 'lucide-react'

type SortOption = 'popular' | 'recent' | 'top_rated' | 'most_pins'

export default function CityDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const citySlug = params.city as string

  const [cityName, setCityName] = useState('')
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  const [totalCollections, setTotalCollections] = useState(0)
  const [totalPins, setTotalPins] = useState(0)

  // Convert slug back to city name (e.g., "san-francisco" -> "San Francisco")
  useEffect(() => {
    if (citySlug) {
      const name = citySlug
        .toString()
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      setCityName(name)
    }
  }, [citySlug])

  // Load collections for this city
  useEffect(() => {
    const loadCityCollections = async () => {
      if (!user || !cityName) return

      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoading(false)
          return
        }

        // Get collections for this city
        const { data, error } = await supabase.rpc('get_collections_by_city', {
          p_city: cityName,
          p_limit: 50,
          p_offset: 0
        })

        if (error) throw error

        if (data) {
          // Enrich with sample images and stats
          const enriched = await Promise.all(
            data.map(async (collection: any) => {
              const { data: samplePins } = await supabase
                .from('pins')
                .select('image_url')
                .eq('collection_id', collection.collection_id)
                .not('image_url', 'is', null)
                .limit(3)

              const { data: stats } = await supabase.rpc('get_collection_stats', {
                p_collection_id: collection.collection_id
              })

              return {
                ...collection,
                sample_images: samplePins?.map((p: any) => p.image_url).filter(Boolean) || [],
                stats
              }
            })
          )

          // Sort based on selected option
          const sorted = sortCollections(enriched, sortBy)
          setCollections(sorted)

          // Calculate totals
          setTotalCollections(enriched.length)
          const pins = enriched.reduce((sum, col) => sum + (col.pin_count || 0), 0)
          setTotalPins(pins)
        }
      } catch (error) {
        logger.error('Error loading city collections:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCityCollections()
  }, [user, cityName, sortBy])

  const sortCollections = (collections: any[], sortOption: SortOption) => {
    const sorted = [...collections]

    switch (sortOption) {
      case 'popular':
        return sorted.sort((a, b) => {
          const aScore = (a.stats?.likes_count || 0) + (a.stats?.saves_count || 0)
          const bScore = (b.stats?.likes_count || 0) + (b.stats?.saves_count || 0)
          return bScore - aScore
        })
      case 'recent':
        return sorted.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      case 'top_rated':
        return sorted.sort((a, b) => {
          const aScore = (a.net_score || 0)
          const bScore = (b.net_score || 0)
          return bScore - aScore
        })
      case 'most_pins':
        return sorted.sort((a, b) => (b.pin_count || 0) - (a.pin_count || 0))
      default:
        return sorted
    }
  }

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem', paddingTop: '5rem' }}>
        {/* Breadcrumb */}
        <div style={{
          marginBottom: '1rem',
          fontSize: '0.8125rem',
          fontFamily: 'var(--font-body)',
          color: 'var(--muted-foreground)'
        }}>
          <Link href="/explore" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Explore
          </Link>
          {' > '}
          <span>{cityName}</span>
        </div>

        {/* City Header */}
        <div style={{
          marginBottom: '2rem',
          padding: '2rem',
          background: 'var(--card)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ color: 'var(--accent)' }}><Building2 size={48} strokeWidth={1.5} /></div>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                fontFamily: 'var(--font-display)',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                {cityName}
              </h1>
              <div style={{
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--muted-foreground)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Folder size={14} /> {totalCollections} {totalCollections === 1 ? 'collection' : 'collections'}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MapPin size={14} /> {totalPins} {totalPins === 1 ? 'pin' : 'pins'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          padding: '1rem',
          background: 'var(--muted)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'var(--font-body)',
            color: 'var(--foreground)'
          }}>
            Sort by:
          </div>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {[
              { value: 'popular', label: 'Popular', icon: Star },
              { value: 'recent', label: 'Recent', icon: Clock },
              { value: 'top_rated', label: 'Top Rated', icon: Flame },
              { value: 'most_pins', label: 'Most Pins', icon: MapPin }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as SortOption)}
                style={{
                  padding: '0.5rem 1rem',
                  background: sortBy === option.value ? 'var(--accent)' : 'var(--background)',
                  color: sortBy === option.value ? 'white' : 'var(--foreground)',
                  border: '2px solid',
                  borderColor: sortBy === option.value ? 'var(--accent)' : 'var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
                onMouseEnter={(e) => {
                  if (sortBy !== option.value) {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (sortBy !== option.value) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }
                }}
              >
                <option.icon size={14} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--muted-foreground)',
            fontSize: '0.875rem'
          }}>
            Loading {cityName} collections...
          </div>
        ) : collections.length === 0 ? (
          <div style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            background: 'var(--muted)',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
              <Building2 size={48} strokeWidth={1.5} />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-display)'
            }}>
              No Collections in {cityName} Yet
            </h3>
            <p style={{
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem'
            }}>
              Be the first to create a collection here!
            </p>
            <Link
              href="/collections/new"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'var(--accent)',
                color: 'white',
                border: '2px solid var(--accent)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'var(--font-body)',
                textDecoration: 'none',
                transition: 'var(--transition)'
              }}
            >
              Create Collection
            </Link>
          </div>
        ) : (
          <CollectionGrid collections={collections} currentUserId={user.id} />
        )}
      </div>
    </>
  )
}
