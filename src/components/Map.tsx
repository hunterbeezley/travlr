'use client'
import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

interface MapProps {
  onMapClick?: (lng: number, lat: number) => void
}

interface SearchResult {
  id: string
  place_name: string
  center: [number, number]
  place_type: string[]
  properties: {
    category?: string
  }
}

export default function Map({ onMapClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [lng, setLng] = useState(-70.9)
  const [lat, setLat] = useState(42.35)
  const [zoom, setZoom] = useState(9)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const mapStyles = [
    { name: 'Streets', value: 'mapbox://styles/mapbox/streets-v12', icon: '🏙️' },
    { name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-v9', icon: '🛰️' },
    { name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12', icon: '🏔️' },
    { name: 'Dark', value: 'mapbox://styles/mapbox/dark-v11', icon: '🌙' },
  ]

  // Search for places using Mapbox Geocoding API
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&types=place,locality,neighborhood,address,poi&limit=5`
      )
      const data = await response.json()
      setSearchResults(data.features || [])
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  // Handle selecting a search result
  const handleSearchSelect = (result: SearchResult) => {
    const [longitude, latitude] = result.center
    
    if (map.current) {
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        duration: 2000
      })
    }
    
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [lng, lat],
      zoom: zoom,
      pitch: 0,
      bearing: 0,
      antialias: true,
      dragPan: true, // Enable dragging
      scrollZoom: true, // Enable scroll zoom
      doubleClickZoom: true, // Enable double-click zoom
      touchZoomRotate: true // Enable touch gestures
    })

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    )

    map.current.on('move', () => {
      if (!map.current) return
      setLng(Number(map.current.getCenter().lng.toFixed(4)))
      setLat(Number(map.current.getCenter().lat.toFixed(4)))
      setZoom(Number(map.current.getZoom().toFixed(2)))
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, []) // Empty dependency array - only run once!

  // Handle click events separately
  useEffect(() => {
    if (!map.current || !onMapClick) return

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      onMapClick(e.lngLat.lng, e.lngLat.lat)
      
      // Add a temporary marker with animation
      const marker = new mapboxgl.Marker({
        color: '#3b82f6',
        scale: 0.8
      })
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .addTo(map.current!)
      
      // Add popup with coordinates
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px; font-size: 12px;">
            <strong>📍 Pin Added</strong><br>
            ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}
          </div>
        `)
      
      marker.setPopup(popup)
      popup.addTo(map.current!)
      
      // Remove marker and popup after 3 seconds
      setTimeout(() => {
        marker.remove()
        popup.remove()
      }, 3000)
    }

    map.current.on('click', handleClick)

    return () => {
      if (map.current) {
        map.current.off('click', handleClick)
      }
    }
  }, [onMapClick])

  // Update map style when changed
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyle)
    }
  }, [mapStyle])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Search Bar */}
      <div style={{ 
        position: 'absolute', 
        top: '0.75rem', 
        left: '50%', 
        transform: 'translateX(-50%)',
        zIndex: 10,
        width: '100%',
        maxWidth: '400px',
        padding: '0 1rem'
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.5rem',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--muted-foreground)'
              }}
            >
              🔍 Search places...
            </button>
          </div>

          {showSearch && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              backdropFilter: 'blur(8px)',
              overflow: 'hidden'
            }}>
              <input
                type="text"
                placeholder="Search for cities, places, or addresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
                autoFocus
              />
              
              {isSearching && (
                <div style={{ 
                  padding: '0.75rem', 
                  textAlign: 'center', 
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem'
                }}>
                  Searching...
                </div>
              )}

              {searchResults.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSearchSelect(result)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        borderTop: '1px solid var(--border)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--muted)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>
                        {result.place_name}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--muted-foreground)',
                        marginTop: '0.25rem'
                      }}>
                        {result.place_type.join(', ')}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div style={{ 
                  padding: '0.75rem', 
                  textAlign: 'center', 
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem'
                }}>
                  No results found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Controls */}
      <div className="map-controls">
        📍 {lat}°, {lng}° | 🔍 {zoom}x
      </div>
      
      {/* Map Style Selector */}
      <div className="map-style-selector">
        <div className="map-style-title">Map Style</div>
        <div className="map-style-buttons">
          {mapStyles.map((style) => (
            <button
              key={style.value}
              onClick={() => setMapStyle(style.value)}
              className={`map-style-btn ${mapStyle === style.value ? 'active' : ''}`}
            >
              <span>{style.icon}</span>
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Click Instruction */}
      <div className="map-instruction">
        💡 Click anywhere to add a pin • Drag to pan • Scroll to zoom
      </div>
    </div>
  )
}