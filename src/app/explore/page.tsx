'use client'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import CollectionGrid from '@/components/Discover/CollectionGrid'
import SearchBar from '@/components/Discover/SearchBar'
import CategoryBrowser from '@/components/Discover/CategoryBrowser'
import CityBrowser from '@/components/Discover/CityBrowser'
import AdvancedFilters, { FilterState } from '@/components/Discover/AdvancedFilters'
import Auth from '@/components/Auth'

export default function ExplorePage() {
  const { user, loading: authLoading } = useAuth()
  const [view, setView] = useState<'trending' | 'nearby' | 'search' | 'category' | 'city' | 'featured'>('featured')
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [filters, setFilters] = useState<FilterState | null>(null)

  // Get user location for nearby collections
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log('Location access denied:', error)
        }
      )
    }
  }, [])

  // Load collections based on view
  const loadCollections = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Verify session exists
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.error('No session found')
        setLoading(false)
        return
      }

      let data = null

      switch (view) {
        case 'featured':
          const { data: featuredData } = await supabase.rpc('get_featured_collections', {
            p_limit: 20
          })
          data = featuredData
          break

        case 'trending':
          const { data: trendingData } = await supabase.rpc('get_trending_collections', {
            p_limit: 20,
            p_offset: 0,
            p_days: 7
          })
          data = trendingData
          break

        case 'nearby':
          if (userLocation) {
            const { data: nearbyData } = await supabase.rpc('get_nearby_collections', {
              p_lat: userLocation.lat,
              p_lng: userLocation.lng,
              p_radius_km: 50,
              p_limit: 20,
              p_offset: 0
            })
            data = nearbyData
          }
          break

        case 'search':
          if (searchQuery || filters) {
            // Use advanced search if filters are set
            if (filters) {
              const { data: searchData } = await supabase.rpc('search_collections_advanced', {
                p_query: searchQuery || null,
                p_category: filters.category,
                p_city: filters.city,
                p_min_pins: filters.minPins,
                p_max_pins: filters.maxPins,
                p_has_images: filters.hasImages,
                p_verified_only: filters.verifiedOnly,
                p_min_likes: filters.minLikes,
                p_sort_by: filters.sortBy,
                p_limit: 20,
                p_offset: 0
              })
              data = searchData
            } else {
              // Simple search
              const { data: searchData } = await supabase.rpc('search_collections', {
                p_query: searchQuery,
                p_limit: 20,
                p_offset: 0
              })
              data = searchData
            }
          }
          break

        case 'category':
          if (selectedCategory) {
            const { data: categoryData } = await supabase.rpc('get_collections_by_category', {
              p_category: selectedCategory,
              p_limit: 20,
              p_offset: 0
            })
            data = categoryData
          }
          break

        case 'city':
          if (selectedCity) {
            const { data: cityData } = await supabase.rpc('get_collections_by_city', {
              p_city: selectedCity,
              p_limit: 20,
              p_offset: 0
            })
            data = cityData
          }
          break
      }

      // Enrich with sample images
      if (data) {
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
        setCollections(enriched)
      } else {
        setCollections([])
      }
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollections()
  }, [view, searchQuery, selectedCategory, selectedCity, userLocation, filters])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setView('search')
  }

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
    setView('category')
  }

  const handleCitySelect = (city: string) => {
    setSelectedCity(city)
    setView('city')
  }

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters)
    setView('search')
  }

  const handleClearFilters = () => {
    setFilters(null)
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
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid var(--border)'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: '0 0 1rem 0'
        }}>
          Explore Collections
        </h1>

        {/* Search Bar and Filters */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap'
        }}>
          <div style={{
            flex: '1 1 auto',
            minWidth: '200px',
            maxWidth: '100%'
          }}>
            <SearchBar onSearch={handleSearch} />
          </div>
          <div style={{ flexShrink: 0 }}>
            <AdvancedFilters
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {[
          { value: 'featured', label: 'Featured', icon: '⭐' },
          { value: 'trending', label: 'Trending', icon: '🔥' },
          { value: 'nearby', label: 'Nearby', icon: '📍', disabled: !userLocation },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setView(tab.value as any)}
            disabled={tab.disabled}
            style={{
              padding: '0.75rem 1.5rem',
              background: view === tab.value ? 'var(--accent)' : 'var(--muted)',
              color: view === tab.value ? 'white' : 'var(--foreground)',
              border: '2px solid',
              borderColor: view === tab.value ? 'var(--accent)' : 'var(--border)',
              borderRadius: 'var(--radius)',
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              opacity: tab.disabled ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Category Browser */}
      <CategoryBrowser
        onSelect={handleCategorySelect}
        selected={selectedCategory}
      />

      {/* City Browser */}
      <CityBrowser
        onSelect={handleCitySelect}
        selected={selectedCity}
      />

      {/* Collections Grid */}
      {loading ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--muted-foreground)'
        }}>
          Loading collections...
        </div>
      ) : collections.length === 0 ? (
        <div style={{
          padding: '3rem 1rem',
          textAlign: 'center',
          background: 'var(--muted)',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-mono)'
          }}>
            No Collections Found
          </h3>
          <p style={{
            color: 'var(--muted-foreground)',
            fontSize: '0.875rem'
          }}>
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <CollectionGrid collections={collections} currentUserId={user.id} />
      )}
    </div>
    </>
  )
}
