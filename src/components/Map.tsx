'use client'
import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import PinCreationModal from './PinCreationModal'
import PinEditModal from './PinEditModal'
import PinImageViewerModal from './PinImageViewerModal'

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

interface Pin {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  image_url: string | null
  category: string | null
  created_at: string
  user_id: string
  collection_id: string
}

export default function Map({ onMapClick }: MapProps) {
  const { user } = useAuth()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [lng, setLng] = useState(-122.6765)
  const [lat, setLat] = useState(45.5152)
  const [zoom, setZoom] = useState(11)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // Pin creation state
  const [showPinModal, setShowPinModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [loadingPins, setLoadingPins] = useState(false)

  // Image viewer modal state
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [selectedPinForImages, setSelectedPinForImages] = useState<{
    id: string
    title: string
  } | null>(null)

  // Pin editing state
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)

  const mapStyles = [
    { name: 'Streets', value: 'mapbox://styles/mapbox/streets-v12', icon: '🏙️' },
    { name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-v9', icon: '🛰️' },
    { name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12', icon: '🏔️' },
    { name: 'Dark', value: 'mapbox://styles/mapbox/dark-v11', icon: '🌙' },
  ]

  const getCategoryIcon = (category: string | null) => {
    const icons: { [key: string]: string } = {
      restaurant: '🍽️',
      cafe: '☕',
      bar: '🍺',
      attraction: '🎯',
      nature: '🌲',
      shopping: '🛍️',
      hotel: '🏨',
      transport: '🚌',
      activity: '🎪',
      other: '📍'
    }
    return icons[category || 'other'] || '📍'
  }

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=us&limit=5`
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

  const selectSearchResult = (result: SearchResult) => {
    if (map.current) {
      map.current.flyTo({
        center: result.center,
        zoom: 14
      })
    }
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  // Load pins from database
  const loadPins = async () => {
    if (!user) {
      setPins([])
      return
    }

    setLoadingPins(true)
    try {
      // You can modify this query based on your needs
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading pins:', error)
        return
      }

      setPins(data || [])
    } catch (error) {
      console.error('Error loading pins:', error)
    } finally {
      setLoadingPins(false)
    }
  }

  // Store marker references to clean them up properly
  const markersRef = useRef<mapboxgl.Marker[]>([])

  // Enhanced addPinsToMap function with better debugging
  const addPinsToMap = () => {
    if (!map.current) {
      console.warn('⚠️ Cannot add pins: map not initialized')
      return
    }

    console.log('🔧 Adding pins to map:', pins.length, 'pins')
    console.log('📍 Pin IDs:', pins.map(p => p.id))

    // Remove existing pin source and layers if they exist
    if (map.current.getSource('pins')) {
      console.log('🗑️ Removing existing pin layers and source')
      try {
        if (map.current.getLayer('pins-layer')) {
          map.current.removeLayer('pins-layer')
          console.log('✅ Removed pins-layer')
        }
        if (map.current.getLayer('pins-icons')) {
          map.current.removeLayer('pins-icons')
          console.log('✅ Removed pins-icons')
        }
        map.current.removeSource('pins')
        console.log('✅ Removed pins source')
      } catch (error) {
        console.error('❌ Error removing existing layers:', error)
      }
    }

    if (pins.length === 0) {
      console.log('⚠️ No pins to display')
      return
    }

    // Create GeoJSON data from pins
    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: pins.map(pin => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [pin.longitude, pin.latitude]
        },
        properties: {
          id: pin.id,
          title: pin.title,
          description: pin.description || '',
          category: pin.category || 'other',
          image_url: pin.image_url || '',
          created_at: pin.created_at,
          user_id: pin.user_id,
          icon: getCategoryIcon(pin.category)
        }
      }))
    }

    console.log('📊 GeoJSON features:', geojsonData.features.length)

    // Add source
    map.current.addSource('pins', {
      type: 'geojson',
      data: geojsonData
    })

    console.log('✅ Added pins source to map')

    // Add circle pins layer
    map.current.addLayer({
      id: 'pins-layer',
      type: 'circle',
      source: 'pins',
      paint: {
        'circle-radius': 8,
        'circle-color': '#dc2626',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    })

    console.log('✅ Added pins-layer (circles)')

    // Add category icons layer
    map.current.addLayer({
      id: 'pins-icons',
      type: 'symbol',
      source: 'pins',
      layout: {
        'text-field': ['get', 'icon'],
        'text-size': 12,
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffffff'
      }
    })

    console.log('✅ Added pins-icons layer (text)')

    // Add click handlers for popups
    const clickHandler = (e: any) => {
      if (!e.features || !e.features[0]) return
      
      const feature = e.features[0]
      const coordinates = (feature.geometry as any).coordinates.slice()
      const props = feature.properties

      console.log('🖱️ Pin clicked:', props.title)

      // Ensure popup appears correctly
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
      }

      // Check if this pin belongs to the current user
      const isOwnPin = user && props.user_id === user.id

      const editButton = isOwnPin ? 
        `<button onclick="editPin('${props.id}')" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px;">✏️ Edit</button>` : ''

      const viewImagesButton = `<button onclick="viewPinImages('${props.id}', '${props.title.replace(/'/g, "\\'")}')" style="background: #2563eb; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px; margin-right: 8px;">🖼️ Images</button>`

      const popupContent = `
        <div style="min-width: 200px; max-width: 280px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${props.title}</h3>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${props.description}</p>
          <div style="font-size: 12px; color: #888;">📍 ${props.category || 'other'}</div>
          ${props.image_url ? 
            `<img src="${props.image_url}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" alt="${props.title}" />` : ''}
          <div style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
            📅 ${new Date(props.created_at).toLocaleDateString()}
          </div>
          ${viewImagesButton}
          ${editButton}
        </div>
      `

      new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false, // Disable close on click so we can handle it manually
        maxWidth: '300px'
      })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map.current!)
    }

    // Add click handlers to both layers
    map.current.on('click', 'pins-layer', clickHandler)
    map.current.on('click', 'pins-icons', clickHandler)

    // Add hover effects
    const mouseEnterHandler = () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer'
        map.current.setPaintProperty('pins-layer', 'circle-radius', 10)
      }
    }

    const mouseLeaveHandler = () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = ''
        map.current.setPaintProperty('pins-layer', 'circle-radius', 8)
      }
    }

    map.current.on('mouseenter', 'pins-layer', mouseEnterHandler)
    map.current.on('mouseleave', 'pins-layer', mouseLeaveHandler)
    map.current.on('mouseenter', 'pins-icons', mouseEnterHandler)
    map.current.on('mouseleave', 'pins-icons', mouseLeaveHandler)

    console.log('🎯 Pin display setup complete')
  }

  // Global function for edit button clicks (called from popup HTML)
  useEffect(() => {
    // Edit pin function (existing)
    (window as any).editPin = (pinId: string) => {
      const pin = pins.find(p => p.id === pinId)
      if (pin && user && pin.user_id === user.id) {
        setSelectedPin(pin)
        setShowEditModal(true)
        
        // Close any open popups
        const popups = document.getElementsByClassName('mapboxgl-popup')
        for (let i = 0; i < popups.length; i++) {
          const popup = popups[i] as HTMLElement
          popup.remove()
        }
      }
    }

    // View pin images function (new)
    (window as any).viewPinImages = (pinId: string, pinTitle: string) => {
      console.log('🖼️ Opening image viewer for pin:', pinId, pinTitle)
      setSelectedPinForImages({ id: pinId, title: pinTitle })
      setShowImageViewer(true)
      
      // Close any open popups
      const popups = document.getElementsByClassName('mapboxgl-popup')
      for (let i = 0; i < popups.length; i++) {
        const popup = popups[i] as HTMLElement
        popup.remove()
      }
    }

    return () => {
      delete (window as any).editPin
      delete (window as any).viewPinImages
    }
  }, [pins, user])

  // Load pins when user changes or component mounts
  useEffect(() => {
    if (user) {
      loadPins()
    }
  }, [user])

  // Enhanced useEffect to handle all pin changes (add, update, delete)
  useEffect(() => {
    console.log('🔄 useEffect triggered - pins changed, length:', pins.length)
    if (map.current) {
      // Always call addPinsToMap - it handles empty pins array correctly
      addPinsToMap()
    }
  }, [pins]) // This dependency ensures map updates whenever pins array changes

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
      dragPan: true,
      scrollZoom: true,
      doubleClickZoom: false, // Disable double-click zoom to prevent conflicts with pin creation
      touchZoomRotate: true
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
  }, [])

  // Handle click events for popup closing and pin viewing
  useEffect(() => {
    if (!map.current) return

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      // Check if we clicked on a pin layer - if so, don't close popups
      // First check if the layers exist to avoid errors
      const layersToCheck = []
      if (map.current!.getLayer('pins-layer')) {
        layersToCheck.push('pins-layer')
      }
      if (map.current!.getLayer('pins-icons')) {
        layersToCheck.push('pins-icons')
      }

      if (layersToCheck.length > 0) {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: layersToCheck
        })

        if (features.length > 0) {
          console.log('🎯 Clicked on existing pin, keeping popup open')
          return // Don't close popups if we clicked on a pin
        }
      }

      // Close any open popups when clicking elsewhere on the map
      console.log('🗺️ Clicked on map, closing any open popups')
      const popups = document.getElementsByClassName('mapboxgl-popup')
      for (let i = popups.length - 1; i >= 0; i--) {
        const popup = popups[i] as HTMLElement
        popup.remove()
      }
    }

    map.current.on('click', handleClick)

    return () => {
      if (map.current) {
        map.current.off('click', handleClick)
      }
    }
  }, [user])

  // Handle double-click events for pin creation
  useEffect(() => {
    if (!map.current) return

    const handleDoubleClick = (e: mapboxgl.MapMouseEvent) => {
      // Check if we double-clicked on a pin layer - if so, don't create a new pin
      const layersToCheck = []
      if (map.current!.getLayer('pins-layer')) {
        layersToCheck.push('pins-layer')
      }
      if (map.current!.getLayer('pins-icons')) {
        layersToCheck.push('pins-icons')
      }

      if (layersToCheck.length > 0) {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: layersToCheck
        })

        if (features.length > 0) {
          console.log('🎯 Double-clicked on existing pin, not creating new pin')
          return // Don't create a new pin if we double-clicked on an existing one
        }
      }

      // Only create pins for logged-in users
      if (!user) {
        alert('Please log in to create pins')
        return
      }

      console.log('📍 Double-clicked! Creating new pin at:', e.lngLat.lat, e.lngLat.lng)

      // Close any open popups first
      const popups = document.getElementsByClassName('mapboxgl-popup')
      for (let i = popups.length - 1; i >= 0; i--) {
        const popup = popups[i] as HTMLElement
        popup.remove()
      }

      // Set selected location and show modal
      setSelectedLocation({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng
      })
      setShowPinModal(true)

      // Call original onMapClick if provided
      onMapClick?.(e.lngLat.lng, e.lngLat.lat)
    }

    map.current.on('dblclick', handleDoubleClick)

    return () => {
      if (map.current) {
        map.current.off('dblclick', handleDoubleClick)
      }
    }
  }, [onMapClick, user])

  // Update map style when changed
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyle)
    }
  }, [mapStyle])

  // Handle pin creation success
  const handlePinCreated = (pin: Pin) => {
    setPins(prev => [pin, ...prev])
    setShowPinModal(false)
    setSelectedLocation(null)
  }

  // Handle pin update success
  const handlePinUpdated = (updatedPin: Pin) => {
    setPins(prev => prev.map(pin => 
      pin.id === updatedPin.id ? updatedPin : pin
    ))
    setShowEditModal(false)
    setSelectedPin(null)
  }

  // Enhanced handlePinDeleted with modal auto-close
  const handlePinDeleted = (pinId: string) => {
    console.log('🗑️ Map: handlePinDeleted called for pin:', pinId)
    console.log('📊 Current pins before deletion:', pins.length)
    
    // Update the pins state - React will handle the map update via useEffect
    setPins(prev => {
      const newPins = prev.filter(pin => pin.id !== pinId)
      console.log('📊 Pins after filtering:', newPins.length)
      return newPins
    })
    
    // Auto-close any modals that are showing the deleted pin
    if (selectedPin?.id === pinId) {
      console.log('🔄 Closing edit modal for deleted pin')
      setShowEditModal(false)
      setSelectedPin(null)
    }
    
    if (selectedPinForImages?.id === pinId) {
      console.log('🔄 Closing image viewer modal for deleted pin')
      setShowImageViewer(false)
      setSelectedPinForImages(null)
    }
    
    console.log('✅ Pin deletion handling complete')
  }

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
                justifyContent: 'center'
              }}
            >
              🔍
            </button>
            
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleSearch(e.target.value)
                }}
                placeholder="Search for places..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.875rem',
                  padding: '0.5rem'
                }}
              />
            )}
          </div>

          {/* Search Results */}
          {showSearch && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              marginTop: '0.5rem',
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(8px)',
              zIndex: 20,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => selectSearchResult(result)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--muted)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{result.place_name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                    {result.place_type.join(', ')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Style Selector */}
      <div style={{
        position: 'absolute',
        top: '0.75rem',
        right: '1rem',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.25rem',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(8px)'
        }}>
          {mapStyles.map((style) => (
            <button
              key={style.value}
              onClick={() => setMapStyle(style.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'var(--transition)',
                background: mapStyle === style.value ? 'var(--accent)' : 'transparent',
                color: mapStyle === style.value ? 'white' : 'var(--foreground)'
              }}
            >
              <span>{style.icon}</span>
              <span>{style.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User Instructions */}
      {user && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          color: 'var(--muted-foreground)',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(8px)',
          textAlign: 'center'
        }}>
          📍 Double-click anywhere on the map to create a pin • Click on existing pins to view
        </div>
      )}

      {/* Pin Count Display */}
      {pins.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          zIndex: 10,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--muted-foreground)',
          boxShadow: 'var(--shadow)',
          backdropFilter: 'blur(8px)'
        }}>
          📍 {pins.length} pin{pins.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%' 
        }} 
      />

      {/* Pin Creation Modal */}
      {selectedLocation && (
        <PinCreationModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false)
            setSelectedLocation(null)
          }}
          latitude={selectedLocation.lat}
          longitude={selectedLocation.lng}
          onPinCreated={handlePinCreated}
        />
      )}

      {/* Pin Edit Modal */}
      <PinEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedPin(null)
        }}
        pin={selectedPin}
        onPinUpdated={handlePinUpdated}
        onPinDeleted={handlePinDeleted}
      />

      {/* Pin Image Viewer Modal */}
      {showImageViewer && selectedPinForImages && (
        <PinImageViewerModal
          isOpen={showImageViewer}
          onClose={() => {
            setShowImageViewer(false)
            setSelectedPinForImages(null)
          }}
          pinId={selectedPinForImages.id}
          pinTitle={selectedPinForImages.title}
        />
      )}
    </div>
  )
}