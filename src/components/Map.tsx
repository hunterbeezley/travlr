'use client'
import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { supabase } from '@/lib/supabase'
import { DatabaseService, FriendsCollection, DiscoverCollection } from '@/lib/database'
import PinCreationModal from './PinCreationModal'
import PinEditModal from './PinEditModal'
import PinImageViewerModal from './PinImageViewerModal'
import PinProfileModal from './PinProfileModal'
import FollowButton from './FollowButton'
import CollectionDetailsModal from './CollectionDetailsModal'
import AddSearchLocationModal from './AddSearchLocationModal'

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

interface Collection {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  pin_count?: number
  first_pin_image?: string | null
  user_id?: string
}

export default function Map({ onMapClick }: MapProps) {
  const { user } = useAuth()
  const { preferences, updatePreference } = useUserPreferences()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [lng, setLng] = useState(-122.6765)
  const [lat, setLat] = useState(45.5152)
  const [zoom, setZoom] = useState(11)
  const [mapStyle, setMapStyle] = useState(preferences.map_style || 'mapbox://styles/mapbox/streets-v12')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [isStyleLoaded, setIsStyleLoaded] = useState(false)
  
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

  // Pin profile modal state
  const [showPinProfile, setShowPinProfile] = useState(false)

  // Pin editing state
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [allPins, setAllPins] = useState<Pin[]>([]) // Cache all pins

  // Friends/Follow state
  const [activeTab, setActiveTab] = useState<'my-collections' | 'friends' | 'discover'>('my-collections')
  const [friendsCollections, setFriendsCollections] = useState<FriendsCollection[]>([])
  const [loadingFriendsCollections, setLoadingFriendsCollections] = useState(false)
  const [friendsPins, setFriendsPins] = useState<Pin[]>([])

  // Discover state
  const [discoverCollections, setDiscoverCollections] = useState<DiscoverCollection[]>([])
  const [loadingDiscoverCollections, setLoadingDiscoverCollections] = useState(false)
  const [discoverPins, setDiscoverPins] = useState<Pin[]>([])

  // Collection details modal state
  const [showCollectionDetails, setShowCollectionDetails] = useState(false)
  const [selectedCollectionForDetails, setSelectedCollectionForDetails] = useState<Collection | null>(null)

  // Search location state
  const [selectedSearchLocation, setSelectedSearchLocation] = useState<SearchResult | null>(null)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null)

  const mapStyles = [
    { name: 'Streets', value: 'mapbox://styles/mapbox/streets-v12', icon: 'ST' },
    { name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-v9', icon: 'SA' },
    { name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12', icon: 'OU' },
    { name: 'Dark', value: 'mapbox://styles/mapbox/dark-v11', icon: 'DK' },
  ]

  const getCategoryIcon = (category: string | null) => {
    const icons: { [key: string]: string } = {
      restaurant: 'RE',
      cafe: 'CA',
      bar: 'BR',
      attraction: 'AT',
      nature: 'NA',
      shopping: 'SH',
      hotel: 'HT',
      transport: 'TR',
      activity: 'AC',
      other: 'OT'
    }
    return icons[category || 'other'] || 'OT'
  }

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Get current map center for proximity bias
      const mapCenter = map.current?.getCenter()
      const proximity = mapCenter ? `${mapCenter.lng},${mapCenter.lat}` : ''

      // Include POI (businesses, landmarks) and addresses in search
      // Types: poi = points of interest, address = street addresses, place = cities/neighborhoods
      const types = 'poi,address,place'

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${mapboxgl.accessToken}&` +
        `types=${types}&` +
        `country=us&` +
        `limit=10&` +
        (proximity ? `proximity=${proximity}` : '')
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
    if (!map.current) return

    // Fly to location
    map.current.flyTo({
      center: result.center,
      zoom: 14
    })

    // Remove existing search marker if any
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove()
    }

    // Store the selected location
    setSelectedSearchLocation(result)

    // Create popup with "Add to Collection" button
    const popupNode = document.createElement('div')
    popupNode.style.padding = '0.75rem'
    popupNode.style.minWidth = '200px'

    const title = document.createElement('div')
    title.textContent = result.place_name.split(',')[0]
    title.style.fontWeight = '700'
    title.style.marginBottom = '0.5rem'
    title.style.fontSize = '0.875rem'
    popupNode.appendChild(title)

    const address = document.createElement('div')
    address.textContent = result.place_name
    address.style.fontSize = '0.75rem'
    address.style.color = 'var(--muted-foreground)'
    address.style.marginBottom = '0.75rem'
    popupNode.appendChild(address)

    const button = document.createElement('button')
    button.textContent = 'ADD TO COLLECTION'
    button.style.width = '100%'
    button.style.padding = '0.5rem'
    button.style.background = 'var(--accent)'
    button.style.color = 'white'
    button.style.border = '2px solid var(--accent)'
    button.style.borderRadius = 'var(--radius)'
    button.style.cursor = 'pointer'
    button.style.fontFamily = 'var(--font-mono)'
    button.style.fontWeight = '700'
    button.style.fontSize = '0.75rem'
    button.style.letterSpacing = '0.1em'
    button.onclick = () => {
      setShowAddLocationModal(true)
    }
    popupNode.appendChild(button)

    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false
    }).setDOMContent(popupNode)

    // Create marker
    const marker = new mapboxgl.Marker({ color: '#E63946' })
      .setLngLat(result.center)
      .setPopup(popup)
      .addTo(map.current)

    marker.togglePopup()
    searchMarkerRef.current = marker

    // Clear search
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  // Load pins from database
  const loadPins = async () => {
    if (!user) {
      setAllPins([])
      setPins([])
      return
    }

    setLoadingPins(true)
    try {
      // Load all pins for client-side filtering
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading pins:', error)
        return
      }

      setAllPins(data || [])
    } catch (error) {
      console.error('Error loading pins:', error)
    } finally {
      setLoadingPins(false)
    }
  }

  // Load collections from database
  const loadCollections = async () => {
    if (!user) return

    setLoadingCollections(true)
    try {
      const { data, error } = await supabase
        .rpc('get_user_collections_with_stats', { user_uuid: user.id })

      if (error) {
        console.error('Error loading collections:', error)
        return
      }

      setCollections(data || [])
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoadingCollections(false)
    }
  }

  // Load friends' public collections
  const loadFriendsCollections = async () => {
    if (!user) return

    setLoadingFriendsCollections(true)
    try {
      const data = await DatabaseService.getFriendsPublicCollections()
      setFriendsCollections(data || [])
    } catch (error) {
      console.error('Error loading friends collections:', error)
    } finally {
      setLoadingFriendsCollections(false)
    }
  }

  // Load pins for a specific friend's collection
  const loadFriendCollectionPins = async (collectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading friend collection pins:', error)
        return
      }

      const friendPins = data || []
      setFriendsPins(friendPins)
      setPins(friendPins)
      fitMapToPins(friendPins)
    } catch (error) {
      console.error('Error loading friend collection pins:', error)
    }
  }

  // Load discover collections (recent public collections from other users)
  const loadDiscoverCollections = async () => {
    if (!user) return

    setLoadingDiscoverCollections(true)
    try {
      const data = await DatabaseService.getDiscoverCollections(50)
      setDiscoverCollections(data || [])
    } catch (error) {
      console.error('Error loading discover collections:', error)
    } finally {
      setLoadingDiscoverCollections(false)
    }
  }

  // Load pins for a specific discover collection
  const loadDiscoverCollectionPins = async (collectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading discover collection pins:', error)
        return
      }

      const discoverPinsData = data || []
      setDiscoverPins(discoverPinsData)
      setPins(discoverPinsData)
      fitMapToPins(discoverPinsData)
    } catch (error) {
      console.error('Error loading discover collection pins:', error)
    }
  }

  // Filter pins by collection
  const filterPinsByCollection = (collectionId: string | null) => {
    if (collectionId === null) {
      setPins(allPins) // Show all pins
    } else {
      setPins(allPins.filter(pin => pin.collection_id === collectionId))
    }
  }

  // Fit map bounds to show all pins
  const fitMapToPins = (pinsToFit: Pin[]) => {
    if (!map.current || pinsToFit.length === 0) return

    if (pinsToFit.length === 1) {
      // Single pin - fly to it
      const pin = pinsToFit[0]
      map.current.flyTo({
        center: [pin.longitude, pin.latitude],
        zoom: 14,
        duration: 1000
      })
    } else {
      // Multiple pins - calculate bounds
      const bounds = new mapboxgl.LngLatBounds()
      pinsToFit.forEach(pin => {
        bounds.extend([pin.longitude, pin.latitude])
      })

      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 350, right: 80 },
        duration: 1000,
        maxZoom: 15
      })
    }
  }

  // Handle collection selection
  const handleCollectionSelect = (
    collectionId: string | null,
    isFriendCollection: boolean = false,
    isDiscoverCollection: boolean = false
  ) => {
    setSelectedCollectionId(collectionId)

    if (isFriendCollection && collectionId) {
      // Load pins for friend's collection
      loadFriendCollectionPins(collectionId)
    } else if (isDiscoverCollection && collectionId) {
      // Load pins for discover collection
      loadDiscoverCollectionPins(collectionId)
    } else {
      // Existing logic for user's own collections
      const filteredPins = collectionId === null
        ? allPins
        : allPins.filter(pin => pin.collection_id === collectionId)

      setPins(filteredPins)
      fitMapToPins(filteredPins)
    }
  }

  // Handle collection deletion
  const handleDeleteCollection = async (collectionId: string, collectionTitle: string) => {
    if (!user) return

    // Confirm deletion
    const confirmed = window.confirm(
      `Delete collection "${collectionTitle}"?\n\nThis will permanently delete the collection and all its pins. This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      const result = await DatabaseService.deleteCollection(collectionId, user.id)

      if (result.success) {
        // If this was the selected collection, clear selection
        if (selectedCollectionId === collectionId) {
          setSelectedCollectionId(null)
          setPins(allPins)
        }

        // Reload collections and pins
        loadCollections()
        loadPins()

        console.log('✅ Collection deleted successfully')
      } else {
        alert(`Failed to delete collection: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
      alert('Failed to delete collection. Please try again.')
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

    if (!isStyleLoaded) {
      console.warn('⚠️ Cannot add pins: map style not loaded yet')
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
        `<button onclick="editPin('${props.id}')" style="background: var(--color-red); color: white; border: 2px solid var(--color-red); padding: 6px 12px; cursor: pointer; font-size: 10px; margin-top: 8px; font-family: var(--font-mono); font-weight: 700; letter-spacing: 0.1em;">EDIT</button>` : ''

      const viewImagesButton = `<button onclick="viewPinImages('${props.id}', '${props.title.replace(/'/g, "\\'")}')" style="background: transparent; color: var(--color-white); border: 2px solid var(--color-white); padding: 6px 12px; cursor: pointer; font-size: 10px; margin-top: 8px; margin-right: 8px; font-family: var(--font-mono); font-weight: 700; letter-spacing: 0.1em;">VIEW</button>`

      const popupContent = `
        <div style="min-width: 200px; max-width: 280px; font-family: var(--font-mono);">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${props.title}</h3>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--muted-foreground);">${props.description}</p>
          <div style="font-size: 10px; color: var(--color-red); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">[${props.category || 'other'}]</div>
          ${props.image_url ?
            `<img src="${props.image_url}" style="width: 100%; height: 120px; object-fit: cover; margin: 8px 0; border: 2px solid var(--border);" alt="${props.title}" />` : ''}
          <div style="font-size: 10px; color: var(--muted-foreground); border-top: 2px solid var(--border); padding-top: 8px; margin-top: 8px; font-weight: 600; letter-spacing: 0.05em;">
            ${new Date(props.created_at).toLocaleDateString()}
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

    // View pin images function (now opens pin profile)
    (window as any).viewPinImages = (pinId: string, pinTitle: string) => {
      console.log('📍 Opening pin profile for:', pinId, pinTitle)
      setSelectedPinForImages({ id: pinId, title: pinTitle })
      setShowPinProfile(true)

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

  // Load saved map style from preferences
  useEffect(() => {
    if (preferences.map_style && preferences.map_style !== mapStyle) {
      console.log('📍 Loading saved map style:', preferences.map_style)
      setMapStyle(preferences.map_style)
    }
  }, [preferences.map_style])

  // Handler to change map style and save preference
  const handleMapStyleChange = (newStyle: string) => {
    console.log('🎨 Changing map style to:', newStyle)
    setMapStyle(newStyle)

    // Save to user preferences (only if logged in)
    if (user) {
      updatePreference('map_style', newStyle)
    }
  }

  // Load pins when user changes or component mounts
  useEffect(() => {
    if (user) {
      loadPins()
      loadCollections()
      loadFriendsCollections()
      loadDiscoverCollections()
    }
  }, [user])

  // Filter pins whenever allPins or selectedCollectionId changes
  useEffect(() => {
    filterPinsByCollection(selectedCollectionId)
  }, [allPins, selectedCollectionId])

  // Enhanced useEffect to handle all pin changes (add, update, delete)
  useEffect(() => {
    console.log('🔄 useEffect triggered - pins changed, length:', pins.length)
    if (map.current && isStyleLoaded) {
      // Always call addPinsToMap - it handles empty pins array correctly
      addPinsToMap()
    }
  }, [pins, isStyleLoaded]) // This dependency ensures map updates whenever pins array changes or style loads

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

    // Wait for style to load before allowing pin operations
    map.current.on('load', () => {
      console.log('✅ Map style loaded')
      setIsStyleLoaded(true)
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
      console.log('🎨 Changing map style to:', mapStyle)
      setIsStyleLoaded(false) // Style is no longer loaded
      map.current.setStyle(mapStyle)

      // Wait for the new style to load
      const handleStyleLoad = () => {
        console.log('✅ New map style loaded')
        setIsStyleLoaded(true)
      }

      map.current.once('style.load', handleStyleLoad)
    }
  }, [mapStyle])

  // Handle pin creation success
  const handlePinCreated = (pin: Pin) => {
    // Add to allPins cache
    setAllPins(prev => [pin, ...prev])

    // If no filter OR pin matches current filter, add to visible pins
    if (selectedCollectionId === null || pin.collection_id === selectedCollectionId) {
      setPins(prev => [pin, ...prev])
    }

    // Refresh collections to update pin counts
    loadCollections()

    setShowPinModal(false)
    setSelectedLocation(null)
  }

  // Handle pin update success
  const handlePinUpdated = (updatedPin: Pin) => {
    // Update in both caches
    setAllPins(prev => prev.map(pin =>
      pin.id === updatedPin.id ? updatedPin : pin
    ))
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

    // Remove from both caches
    setAllPins(prev => prev.filter(pin => pin.id !== pinId))
    setPins(prev => {
      const newPins = prev.filter(pin => pin.id !== pinId)
      console.log('📊 Pins after filtering:', newPins.length)
      return newPins
    })

    // Refresh collections to update pin counts
    loadCollections()

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
      {/* Collections Sidebar with Tabs */}
      {user && (
        <div style={{
          position: 'absolute',
          left: '1rem',
          top: '5rem',
          bottom: '1rem',
          width: '280px',
          backgroundColor: 'rgba(39, 39, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '1rem',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 12rem)',
          overflow: 'hidden'
        }}>
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            borderBottom: '2px solid var(--border)'
          }}>
            <button
              onClick={() => {
                setActiveTab('my-collections')
                setSelectedCollectionId(null)
              }}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                backgroundColor: activeTab === 'my-collections' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'my-collections' ? 'white' : 'var(--foreground)',
                border: 'none',
                borderBottom: activeTab === 'my-collections' ? '2px solid var(--color-red)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'var(--transition)',
                marginBottom: '-2px'
              }}
            >
              MY COLLECTIONS
            </button>
            <button
              onClick={() => {
                setActiveTab('friends')
                setSelectedCollectionId(null)
              }}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                backgroundColor: activeTab === 'friends' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'friends' ? 'white' : 'var(--foreground)',
                border: 'none',
                borderBottom: activeTab === 'friends' ? '2px solid var(--color-red)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'var(--transition)',
                marginBottom: '-2px'
              }}
            >
              FRIENDS
            </button>
            <button
              onClick={() => {
                setActiveTab('discover')
                setSelectedCollectionId(null)
              }}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                backgroundColor: activeTab === 'discover' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'discover' ? 'white' : 'var(--foreground)',
                border: 'none',
                borderBottom: activeTab === 'discover' ? '2px solid var(--color-red)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'var(--transition)',
                marginBottom: '-2px'
              }}
            >
              DISCOVER
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'my-collections' ? (
            <>
              {/* Header */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Collections
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--color-red)',
                  backgroundColor: 'var(--muted)',
                  padding: '0.125rem 0.5rem',
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {allPins.length}
                </span>
              </div>

              {/* Collection List */}
              <div style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {/* All Pins Button */}
                <button
                  onClick={() => handleCollectionSelect(null, false)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border)',
                    backgroundColor: selectedCollectionId === null ? 'var(--accent)' : 'transparent',
                    color: selectedCollectionId === null ? 'white' : 'var(--foreground)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em'
                  }}
                >
                  All Pins
                  <span style={{
                    fontSize: '0.75rem',
                    marginLeft: 'auto',
                    backgroundColor: selectedCollectionId === null ? 'rgba(255,255,255,0.2)' : 'var(--muted)',
                    padding: '0.125rem 0.5rem',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {allPins.length}
                  </span>
                </button>

                {/* Loading State */}
                {loadingCollections && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    Loading collections...
                  </div>
                )}

                {/* Collection Items */}
                {!loadingCollections && collections.map(collection => (
                  <div
                    key={collection.id}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--border)',
                      backgroundColor: selectedCollectionId === collection.id ? 'var(--accent)' : 'transparent',
                      color: selectedCollectionId === collection.id ? 'white' : 'var(--foreground)',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      position: 'relative'
                    }}
                  >
                    {/* Clickable area for selection */}
                    <button
                      onClick={() => handleCollectionSelect(collection.id, false)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: '60px',
                        bottom: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      aria-label={`Select ${collection.title}`}
                    />

                    {/* Thumbnail */}
                    {collection.first_pin_image ? (
                      <img
                        src={collection.first_pin_image}
                        alt=""
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius)',
                          objectFit: 'cover',
                          pointerEvents: 'none'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        border: '2px solid var(--border)',
                        backgroundColor: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '700',
                        color: 'var(--color-red)',
                        pointerEvents: 'none'
                      }}>
                        [ ]
                      </div>
                    )}

                    {/* Collection Info */}
                    <div style={{ flex: 1, minWidth: 0, pointerEvents: 'none' }}>
                      <div style={{
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {collection.title}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>{collection.pin_count || 0} pins</span>
                        {collection.is_public && (
                          <span style={{
                            backgroundColor: selectedCollectionId === collection.id ? 'rgba(255,255,255,0.2)' : 'rgba(34,197,94,0.1)',
                            color: selectedCollectionId === collection.id ? 'white' : '#22c55e',
                            padding: '0.125rem 0.375rem',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.625rem'
                          }}>
                            Public
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCollectionForDetails({ ...collection, user_id: user?.id })
                        setShowCollectionDetails(true)
                      }}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '24px',
                        height: '24px',
                        padding: 0,
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'var(--transition)',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--accent)'
                        e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--foreground)'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                      title={`View details for ${collection.title}`}
                    >
                      ⓘ
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCollection(collection.id, collection.title)
                      }}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '24px',
                        height: '24px',
                        padding: 0,
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'var(--transition)',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-red)'
                        e.currentTarget.style.color = 'var(--color-red)'
                        e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--foreground)'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                      title={`Delete ${collection.title}`}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Empty State */}
                {!loadingCollections && collections.length === 0 && (
                  <div style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <div style={{
                      marginBottom: '0.5rem',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: 'var(--color-red)'
                    }}>[ ]</div>
                    <div>No collections yet</div>
                    <div style={{ fontSize: '0.65rem', marginTop: '0.5rem', opacity: 0.7 }}>
                      Create pins to organize them
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'friends' ? (
            <>
              {/* Friends Tab Header */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Friends
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--color-red)',
                  backgroundColor: 'var(--muted)',
                  padding: '0.125rem 0.5rem',
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {friendsCollections.length}
                </span>
              </div>

              {/* Friends Collection List */}
              <div style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {/* Loading State */}
                {loadingFriendsCollections && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    Loading friends' collections...
                  </div>
                )}

                {/* Friends Collection Items */}
                {!loadingFriendsCollections && friendsCollections.map(collection => (
                  <div
                    key={collection.id}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--border)',
                      backgroundColor: selectedCollectionId === collection.id ? 'var(--accent)' : 'transparent',
                      color: selectedCollectionId === collection.id ? 'white' : 'var(--foreground)',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      position: 'relative'
                    }}
                  >
                    {/* Clickable Area for Selection */}
                    <button
                      onClick={() => handleCollectionSelect(collection.id, true)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: '30px',
                        bottom: 0,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        zIndex: 0
                      }}
                      aria-label={`Select ${collection.title}`}
                    />

                    {/* Thumbnail */}
                    {collection.first_pin_image ? (
                      <img
                        src={collection.first_pin_image}
                        alt=""
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius)',
                          objectFit: 'cover',
                          position: 'relative',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        border: '2px solid var(--border)',
                        backgroundColor: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '700',
                        color: 'var(--color-red)',
                        position: 'relative',
                        zIndex: 1,
                        pointerEvents: 'none'
                      }}>
                        [ ]
                      </div>
                    )}

                    {/* Collection Info */}
                    <div style={{
                      flex: 1,
                      minWidth: 0,
                      position: 'relative',
                      zIndex: 1,
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '0.25rem'
                      }}>
                        {collection.title}
                      </div>

                      {/* Username under collection */}
                      <div style={{
                        fontSize: '0.625rem',
                        opacity: 0.7,
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        @{collection.username || 'anonymous'}
                      </div>

                      <div style={{
                        fontSize: '0.75rem',
                        opacity: 0.8
                      }}>
                        {collection.pin_count || 0} pins
                      </div>
                    </div>

                    {/* Details Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCollectionForDetails(collection)
                        setShowCollectionDetails(true)
                      }}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        width: '24px',
                        height: '24px',
                        padding: 0,
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'var(--transition)',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--accent)'
                        e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--foreground)'
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                      title={`View details for ${collection.title}`}
                    >
                      ⓘ
                    </button>
                  </div>
                ))}

                {/* Empty State */}
                {!loadingFriendsCollections && friendsCollections.length === 0 && (
                  <div style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <div style={{
                      marginBottom: '0.5rem',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: 'var(--color-red)'
                    }}>[ ]</div>
                    <div>No friends yet</div>
                    <div style={{ fontSize: '0.65rem', marginTop: '0.5rem', opacity: 0.7 }}>
                      Follow users to see their public collections
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'discover' ? (
            <>
              {/* Discover Tab Header */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Discover
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--color-red)',
                  backgroundColor: 'var(--muted)',
                  padding: '0.125rem 0.5rem',
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {discoverCollections.length}
                </span>
              </div>

              {/* Discover Collection List */}
              <div style={{
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {/* Loading State */}
                {loadingDiscoverCollections && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    Loading discover collections...
                  </div>
                )}

                {/* Discover Collection Items */}
                {!loadingDiscoverCollections && discoverCollections.map(collection => (
                  <div
                    key={collection.id}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--border)',
                      backgroundColor: selectedCollectionId === collection.id ? 'var(--accent)' : 'transparent',
                      color: selectedCollectionId === collection.id ? 'white' : 'var(--foreground)',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Thumbnail - Clickable */}
                    <button
                      onClick={() => handleCollectionSelect(collection.id, false, true)}
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {collection.first_pin_image ? (
                        <img
                          src={collection.first_pin_image}
                          alt=""
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius)',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          border: '2px solid var(--border)',
                          backgroundColor: 'var(--muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: '700',
                          color: 'var(--color-red)'
                        }}>
                          [ ]
                        </div>
                      )}
                    </button>

                    {/* Collection Info - Clickable */}
                    <button
                      onClick={() => handleCollectionSelect(collection.id, false, true)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'inherit'
                      }}
                    >
                      <div style={{
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '0.25rem'
                      }}>
                        {collection.title}
                      </div>

                      {/* Username under collection */}
                      <div style={{
                        fontSize: '0.625rem',
                        opacity: 0.7,
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        @{collection.username || 'anonymous'}
                      </div>

                      <div style={{
                        fontSize: '0.75rem',
                        opacity: 0.8
                      }}>
                        {collection.pin_count || 0} pins
                      </div>
                    </button>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      flexShrink: 0
                    }}>
                      {/* Details Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCollectionForDetails(collection)
                          setShowCollectionDetails(true)
                        }}
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          border: '1px solid var(--border)',
                          backgroundColor: 'transparent',
                          color: 'var(--foreground)',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'var(--transition)',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.color = 'var(--accent)'
                          e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.color = 'var(--foreground)'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                        title={`View details for ${collection.title}`}
                      >
                        ⓘ
                      </button>

                      {/* Follow Button */}
                      <FollowButton
                        userId={collection.user_id}
                        username={collection.username}
                        size="small"
                        onFollowChange={() => {
                          // Reload friends collections when follow state changes
                          loadFriendsCollections()
                        }}
                      />
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {!loadingDiscoverCollections && discoverCollections.length === 0 && (
                  <div style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <div style={{
                      marginBottom: '0.5rem',
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: 'var(--color-red)'
                    }}>[ ]</div>
                    <div>No collections to discover</div>
                    <div style={{ fontSize: '0.65rem', marginTop: '0.5rem', opacity: 0.7 }}>
                      Check back later for new content
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

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
            background: 'rgba(39, 39, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.5rem',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                background: 'var(--color-red)',
                border: '2px solid var(--color-red)',
                color: 'white',
                cursor: 'pointer',
                padding: '0.5rem 0.75rem',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                fontSize: '0.75rem',
                letterSpacing: '0.1em'
              }}
            >
              {showSearch ? '×' : 'SEARCH'}
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
              background: 'rgba(39, 39, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-lg)',
              marginTop: '0.5rem',
              boxShadow: 'var(--shadow-lg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 20,
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {searchResults.map((result) => {
                const isPOI = result.place_type.includes('poi')
                const category = result.properties?.category || result.place_type[0]
                const displayName = result.text || result.place_name.split(',')[0]
                const address = result.place_name.split(',').slice(1).join(',').trim()

                return (
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
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(230, 57, 70, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div style={{
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {isPOI && (
                        <span style={{
                          fontSize: '0.7rem',
                          background: 'var(--accent)',
                          color: 'white',
                          padding: '0.125rem 0.375rem',
                          borderRadius: 'var(--radius)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}>
                          {category}
                        </span>
                      )}
                      <span>{displayName}</span>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted-foreground)',
                      lineHeight: '1.4'
                    }}>
                      {address || result.place_name}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Map Style Selector */}
      <div style={{
        position: 'absolute',
        top: '0.75rem',
        right: '5rem',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          background: 'rgba(39, 39, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.25rem',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}>
          {mapStyles.map((style) => (
            <button
              key={style.value}
              onClick={() => handleMapStyleChange(style.value)}
              title={style.name}
              style={{
                padding: '0.375rem 0.5rem',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: '0.625rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)',
                background: mapStyle === style.value ? 'var(--accent)' : 'transparent',
                color: mapStyle === style.value ? 'white' : 'var(--foreground)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                minWidth: '32px'
              }}
            >
              {style.icon}
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
          background: 'rgba(39, 39, 42, 0.7)',
          border: '2px solid var(--color-red)',
          padding: '0.75rem 1.5rem',
          fontSize: '0.65rem',
          color: 'var(--foreground)',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: '600'
        }}>
          <span style={{ color: 'var(--color-red)' }}>[DBL-CLICK]</span> Create Pin <span style={{ color: 'var(--muted-foreground)' }}>•</span> <span style={{ color: 'var(--color-red)' }}>[CLICK]</span> View Pin
        </div>
      )}

      {/* Pin Count Display */}
      {pins.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          zIndex: 10,
          background: 'rgba(39, 39, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--foreground)',
          boxShadow: 'var(--shadow)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-mono)',
          fontWeight: '700',
          letterSpacing: '0.1em'
        }}>
          <span style={{ color: 'var(--color-red)' }}>{pins.length.toString().padStart(2, '0')}</span> PIN{pins.length !== 1 ? 'S' : ''}
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

      {/* Pin Profile Modal */}
      {showPinProfile && selectedPinForImages && (
        <PinProfileModal
          isOpen={showPinProfile}
          onClose={() => {
            setShowPinProfile(false)
            setSelectedPinForImages(null)
          }}
          pinId={selectedPinForImages.id}
          onEditPin={(pin) => {
            setSelectedPin(pin)
            setShowEditModal(true)
            setShowPinProfile(false)
          }}
        />
      )}

      {/* Collection Details Modal */}
      {showCollectionDetails && selectedCollectionForDetails && user && (
        <CollectionDetailsModal
          collection={selectedCollectionForDetails}
          onClose={() => {
            setShowCollectionDetails(false)
            setSelectedCollectionForDetails(null)
          }}
          onUpdate={() => {
            loadCollections()
            loadFriendsCollections()
          }}
          userId={user.id}
        />
      )}

      {/* Add Search Location Modal */}
      {showAddLocationModal && selectedSearchLocation && user && (
        <AddSearchLocationModal
          isOpen={showAddLocationModal}
          onClose={() => {
            setShowAddLocationModal(false)
          }}
          searchLocation={selectedSearchLocation}
          collections={collections}
          userId={user.id}
          onSuccess={() => {
            // Remove the search marker
            if (searchMarkerRef.current) {
              searchMarkerRef.current.remove()
              searchMarkerRef.current = null
            }
            setSelectedSearchLocation(null)
            // Reload pins and collections
            loadPins()
            loadCollections()
          }}
        />
      )}
    </div>
  )
}