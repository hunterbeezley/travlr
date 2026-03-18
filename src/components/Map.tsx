'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Wrapper } from '@googlemaps/react-wrapper'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { supabase } from '@/lib/supabase'
import { DatabaseService, FriendsCollection } from '@/lib/database'
import PinCreationModal from './PinCreationModal'
import PinEditModal from './PinEditModal'
import PinImageViewerModal from './PinImageViewerModal'
import PinProfileModal from './PinProfileModal'
import FollowButton from './FollowButton'
import CollectionDetailsModal from './CollectionDetailsModal'
import AddSearchLocationModal from './AddSearchLocationModal'
import BottomSheet from './BottomSheet'
import MapLayersModal from './MapLayersModal'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

interface MapProps {
  onMapClick?: (lng: number, lat: number) => void
}

interface GooglePlacesPrediction {
  place_id: string
  description: string
  types: string[]
}

interface GooglePlacesGeometry {
  location: {
    lat: number
    lng: number
  }
}

interface GooglePlaceDetails {
  name?: string
  formatted_address?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
  geometry?: GooglePlacesGeometry
}

interface SearchResult {
  id: string
  place_name: string
  center: [number, number]
  place_type: string[]
  properties: {
    category?: string
  }
  placeDetails?: GooglePlaceDetails
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

interface POI {
  place_id: string
  name: string
  types: string[]
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  rating?: number
  user_ratings_total?: number
  price_level?: string | null
  business_status?: string
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
  color: string
  upvotes?: number
  downvotes?: number
  net_score?: number
}

// Styles to hide default Google POI markers (for all map types)
const HIDE_POI_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  }
]

// Dark mode styles for Google Maps
const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }]
  }
]

function MapComponent({ onMapClick }: MapProps) {
  const { user, profile, loading: authLoading } = useAuth()
  const { preferences, updatePreference } = useUserPreferences()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const searchMarkerRef = useRef<google.maps.Marker | null>(null)

  const [lng, setLng] = useState(-122.6765)
  const [lat, setLat] = useState(45.5152)
  const [zoom, setZoom] = useState(11)
  const [mapStyle, setMapStyle] = useState(preferences.map_style || 'roadmap')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Pin creation state
  const [showPinModal, setShowPinModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [loadingPins, setLoadingPins] = useState(false)

  // POI state
  const [pois, setPois] = useState<POI[]>([])
  const [showPOIs, setShowPOIs] = useState(true)
  const poiMarkersRef = useRef<google.maps.Marker[]>([])

  // Ref to track current user for event listeners
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

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

  // Mobile bottom sheet state
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  // Map layers modal state
  const [showMapLayersModal, setShowMapLayersModal] = useState(false)

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [allPins, setAllPins] = useState<Pin[]>([])

  // Friends/Follow state
  const [activeTab, setActiveTab] = useState<'my-collections' | 'friends'>('my-collections')
  const [friendsCollections, setFriendsCollections] = useState<FriendsCollection[]>([])
  const [loadingFriendsCollections, setLoadingFriendsCollections] = useState(false)
  const [friendsPins, setFriendsPins] = useState<Pin[]>([])

  // Collection details modal state
  const [showCollectionDetails, setShowCollectionDetails] = useState(false)
  const [selectedCollectionForDetails, setSelectedCollectionForDetails] = useState<Collection | null>(null)

  // Search location state
  const [selectedSearchLocation, setSelectedSearchLocation] = useState<SearchResult | null>(null)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)

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

  // Create custom marker icon SVG - Classic teardrop/map marker shape
  const createMarkerIcon = (category: string | null, color: string = '#E63946') => {
    const icon = getCategoryIcon(category)
    // Use color as part of filter ID to ensure uniqueness
    const filterId = `shadow-${color.replace('#', '')}`
    const svg = `
      <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.5"/>
          </filter>
        </defs>

        <!-- Classic teardrop/map marker shape -->
        <g filter="url(#${filterId})">
          <path
            d="M 18 2
               C 9 2, 2 9, 2 18
               C 2 24, 6 30, 18 46
               C 30 30, 34 24, 34 18
               C 34 9, 27 2, 18 2 Z"
            fill="${color}"
            stroke="#ffffff"
            stroke-width="2.5"
            stroke-linejoin="round"
          />
        </g>

        <!-- Category icon -->
        <text
          x="18"
          y="22"
          font-size="14"
          fill="#ffffff"
          text-anchor="middle"
          font-family="monospace"
          font-weight="bold"
        >${icon}</text>
      </svg>
    `
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(36, 48),
      anchor: new google.maps.Point(18, 46) // Anchor at bottom tip of teardrop
    }
  }

  // Create POI marker icon - Smaller, muted style to differentiate from user pins
  const createPOIMarkerIcon = (types: string[]) => {
    // Determine icon based on primary type
    let emoji = '📍' // Default
    if (types.includes('restaurant')) emoji = '🍽️'
    else if (types.includes('cafe') || types.includes('coffee_shop')) emoji = '☕'
    else if (types.includes('bar') || types.includes('night_club')) emoji = '🍷'
    else if (types.includes('museum') || types.includes('art_gallery')) emoji = '🎨'
    else if (types.includes('park')) emoji = '🌳'
    else if (types.includes('tourist_attraction') || types.includes('point_of_interest')) emoji = '⭐'
    else if (types.includes('store') || types.includes('shopping_mall')) emoji = '🛍️'
    else if (types.includes('lodging') || types.includes('hotel')) emoji = '🏨'

    const filterId = `poi-shadow-${types[0]?.replace(/[^a-z]/g, '') || 'default'}`
    const svg = `
      <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
          </filter>
        </defs>

        <!-- Muted circle background -->
        <circle
          cx="14"
          cy="14"
          r="12"
          fill="rgba(120, 120, 130, 0.7)"
          stroke="rgba(255, 255, 255, 0.6)"
          stroke-width="1.5"
          filter="url(#${filterId})"
        />

        <!-- Emoji icon -->
        <text
          x="14"
          y="19"
          font-size="14"
          text-anchor="middle"
          font-family="system-ui, -apple-system, sans-serif"
        >${emoji}</text>
      </svg>
    `
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(28, 28),
      anchor: new google.maps.Point(14, 14)
    }
  }

  // Search functionality - Google Places Autocomplete with debouncing
  const handleSearch = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(false)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const mapCenter = map.current?.getCenter()
        const location = mapCenter ? `${mapCenter.lat()},${mapCenter.lng()}` : ''

        const params = new URLSearchParams({
          input: query,
          ...(location && { location }),
          radius: '50000'
        })

        console.log('🔍 Searching for:', query)
        const response = await fetch(`/api/google-places/autocomplete?${params.toString()}`)
        const data = await response.json()

        console.log('🔍 Search response:', data)

        if (data.error) {
          console.error('Google Places API error:', data.error)
          setSearchResults([])
          setHasSearched(true)
          return
        }

        const transformedResults: SearchResult[] = (data.predictions || [])
          .slice(0, 5)
          .map((pred: GooglePlacesPrediction) => ({
            id: pred.place_id,
            place_name: pred.description,
            center: [0, 0] as [number, number],
            place_type: pred.types || ['establishment'],
            properties: {
              category: pred.types?.[0] || 'establishment'
            }
          }))

        console.log('🔍 Transformed results:', transformedResults)
        setSearchResults(transformedResults)
        setHasSearched(true)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
        setHasSearched(true)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const selectSearchResult = async (result: SearchResult) => {
    if (!map.current) return

    try {
      const response = await fetch(`/api/google-places/details?place_id=${result.id}`)

      if (!response.ok) {
        console.error('Failed to fetch place details: HTTP', response.status)
        alert('Failed to load place details. Please try again.')
        return
      }

      const data = await response.json()

      if (data.error || !data.result) {
        console.error('Failed to fetch place details:', data.error)
        alert('Failed to load place details. Please try again.')
        return
      }

      const placeDetails = data.result
      const location = placeDetails.geometry?.location

      if (!location) {
        console.error('No location found in place details')
        return
      }

      result.center = [location.lng, location.lat]

      // Fly to location using panTo and setZoom
      map.current.panTo({ lat: location.lat, lng: location.lng })
      map.current.setZoom(14)

      // Remove existing search marker if any
      if (searchMarkerRef.current) {
        searchMarkerRef.current.setMap(null)
      }

      // Store the selected location
      setSelectedSearchLocation({
        ...result,
        placeDetails
      })

      // Create InfoWindow content with liquid glass styling
      const infoWindowContent = document.createElement('div')
      infoWindowContent.style.padding = '12px'
      infoWindowContent.style.minWidth = '200px'
      infoWindowContent.style.fontFamily = "'Share Tech Mono', monospace"
      infoWindowContent.style.color = '#F4F4F5'

      const title = document.createElement('div')
      title.textContent = placeDetails.name || result.place_name.split(',')[0]
      title.style.fontWeight = '700'
      title.style.marginBottom = '8px'
      title.style.fontSize = '14px'
      title.style.color = '#F4F4F5'
      title.style.textTransform = 'uppercase'
      title.style.letterSpacing = '0.05em'
      infoWindowContent.appendChild(title)

      if (placeDetails.rating) {
        const ratingDiv = document.createElement('div')
        ratingDiv.style.fontSize = '12px'
        ratingDiv.style.color = '#f59e0b'
        ratingDiv.style.marginBottom = '8px'
        ratingDiv.style.fontWeight = '600'
        ratingDiv.textContent = `★ ${placeDetails.rating} (${placeDetails.user_ratings_total || 0} reviews)`
        infoWindowContent.appendChild(ratingDiv)
      }

      if (placeDetails.business_status) {
        const statusDiv = document.createElement('div')
        statusDiv.style.fontSize = '10px'
        statusDiv.style.marginBottom = '8px'
        statusDiv.style.fontWeight = '700'
        statusDiv.style.textTransform = 'uppercase'
        statusDiv.style.letterSpacing = '0.1em'

        if (placeDetails.business_status === 'OPERATIONAL') {
          statusDiv.style.color = '#22c55e'
          statusDiv.textContent = '● OPEN'
        } else if (placeDetails.business_status === 'CLOSED_TEMPORARILY') {
          statusDiv.style.color = '#f59e0b'
          statusDiv.textContent = '● TEMPORARILY CLOSED'
        } else if (placeDetails.business_status === 'CLOSED_PERMANENTLY') {
          statusDiv.style.color = '#E63946'
          statusDiv.textContent = '● PERMANENTLY CLOSED'
        }
        infoWindowContent.appendChild(statusDiv)
      }

      const address = document.createElement('div')
      address.textContent = placeDetails.formatted_address || result.place_name
      address.style.fontSize = '11px'
      address.style.color = '#A1A1AA'
      address.style.marginBottom = '12px'
      address.style.lineHeight = '1.5'
      address.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)'
      address.style.paddingTop = '8px'
      infoWindowContent.appendChild(address)

      const button = document.createElement('button')
      button.textContent = 'ADD TO COLLECTION'
      button.style.width = '100%'
      // Mobile-optimized touch targets
      const isMobile = window.innerWidth < 768
      button.style.padding = isMobile ? '14px' : '10px'
      button.style.minHeight = isMobile ? '44px' : 'auto'
      button.style.background = '#E63946'
      button.style.color = 'white'
      button.style.border = '1px solid #E63946'
      button.style.borderRadius = '4px'
      button.style.cursor = 'pointer'
      button.style.fontFamily = "'Share Tech Mono', monospace"
      button.style.fontWeight = '700'
      button.style.fontSize = isMobile ? '13px' : '11px'
      button.style.letterSpacing = '0.1em'
      button.style.transition = 'all 0.15s ease'
      button.onmouseenter = () => {
        button.style.background = '#D62839'
      }
      button.onmouseleave = () => {
        button.style.background = '#E63946'
      }
      button.onclick = () => {
        setShowAddLocationModal(true)
      }
      infoWindowContent.appendChild(button)

      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
      })

      // Create marker
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#E63946',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      })

      infoWindow.open(map.current, marker)
      searchMarkerRef.current = marker

      // Clear search
      setSearchQuery('')
      setSearchResults([])
      setShowSearch(false)

    } catch (error) {
      console.error('Error selecting search result:', error)
      alert('An error occurred while loading the place. Please try again.')
    }
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

  // Fetch nearby POIs from Google Places
  const fetchNearbyPOIs = async () => {
    if (!map.current || !showPOIs) return

    const currentZoom = map.current.getZoom()
    // Only show POIs when zoomed in close enough
    if (currentZoom === undefined || currentZoom < 14) {
      setPois([])
      return
    }

    const center = map.current.getCenter()
    if (!center) return

    try {
      const params = new URLSearchParams({
        lat: center.lat().toString(),
        lng: center.lng().toString(),
        radius: '1500', // 1.5km radius
        types: 'restaurant,cafe,bar,museum,park,tourist_attraction,store'
      })

      const response = await fetch(`/api/google-places/nearby?${params.toString()}`)
      const data = await response.json()

      if (data.error) {
        console.error('POI fetch error:', data.error)
        return
      }

      setPois(data.results || [])
    } catch (error) {
      console.error('Error fetching nearby POIs:', error)
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

  // Filter pins by collection
  const filterPinsByCollection = (collectionId: string | null) => {
    if (collectionId === null) {
      setPins(allPins)
    } else {
      setPins(allPins.filter(pin => pin.collection_id === collectionId))
    }
  }

  // Fit map bounds to show all pins
  const fitMapToPins = (pinsToFit: Pin[]) => {
    if (!map.current || pinsToFit.length === 0) return

    if (pinsToFit.length === 1) {
      const pin = pinsToFit[0]
      map.current.panTo({ lat: pin.latitude, lng: pin.longitude })
      map.current.setZoom(14)
    } else {
      const bounds = new google.maps.LatLngBounds()
      pinsToFit.forEach(pin => {
        bounds.extend({ lat: pin.latitude, lng: pin.longitude })
      })

      map.current.fitBounds(bounds, {
        top: 80,
        bottom: 80,
        left: 350,
        right: 80
      })
    }
  }

  // Handle collection selection
  const handleCollectionSelect = (
    collectionId: string | null,
    isFriendCollection: boolean = false
  ) => {
    setSelectedCollectionId(collectionId)

    if (isFriendCollection && collectionId) {
      loadFriendCollectionPins(collectionId)
    } else {
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

    const confirmed = window.confirm(
      `Delete collection "${collectionTitle}"?\n\nThis will permanently delete the collection and all its pins. This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      const result = await DatabaseService.deleteCollection(collectionId, user.id)

      if (result.success) {
        if (selectedCollectionId === collectionId) {
          setSelectedCollectionId(null)
          setPins(allPins)
        }

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

  // Add pins to map as individual markers
  const addPinsToMap = useCallback(() => {
    if (!map.current || !isMapLoaded) {
      console.warn('⚠️ Cannot add pins: map not initialized or loaded')
      return
    }

    console.log('🔧 Adding pins to map:', pins.length, 'pins')

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    if (pins.length === 0) {
      console.log('⚠️ No pins to display')
      return
    }

    // Create a map of collection ID to color for quick lookup
    const collectionColorMap: Record<string, string> = {}
    collections.forEach(collection => {
      collectionColorMap[collection.id] = collection.color || '#E63946'
    })

    // Create markers for each pin
    pins.forEach(pin => {
      // Get the collection color for this pin, default to red if not found
      const pinColor = collectionColorMap[pin.collection_id] || '#E63946'

      const marker = new google.maps.Marker({
        position: { lat: pin.latitude, lng: pin.longitude },
        map: map.current!,
        icon: createMarkerIcon(pin.category, pinColor),
        title: pin.title
      })

      // Create click handler for marker
      marker.addListener('click', () => {
        console.log('🖱️ Pin clicked:', pin.title)

        // Close any open InfoWindow
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close()
        }

        // Check if this pin belongs to the current user
        const isOwnPin = user && pin.user_id === user.id

        const infoWindowContent = document.createElement('div')
        infoWindowContent.style.minWidth = '200px'
        infoWindowContent.style.maxWidth = '280px'
        infoWindowContent.style.fontFamily = "'Share Tech Mono', monospace"
        infoWindowContent.style.padding = '12px'
        infoWindowContent.style.color = '#F4F4F5'

        const title = document.createElement('h3')
        title.textContent = pin.title
        title.style.margin = '0 0 8px 0'
        title.style.fontSize = '14px'
        title.style.fontWeight = '700'
        title.style.textTransform = 'uppercase'
        title.style.letterSpacing = '0.1em'
        title.style.color = '#F4F4F5'
        infoWindowContent.appendChild(title)

        if (pin.description) {
          const description = document.createElement('p')
          description.textContent = pin.description
          description.style.margin = '0 0 8px 0'
          description.style.fontSize = '12px'
          description.style.color = '#A1A1AA'
          description.style.lineHeight = '1.5'
          infoWindowContent.appendChild(description)
        }

        const category = document.createElement('div')
        category.textContent = `[${pin.category || 'other'}]`
        category.style.fontSize = '10px'
        category.style.color = '#E63946'
        category.style.fontWeight = '700'
        category.style.letterSpacing = '0.1em'
        category.style.textTransform = 'uppercase'
        infoWindowContent.appendChild(category)

        if (pin.image_url) {
          const image = document.createElement('img')
          image.src = pin.image_url
          image.alt = pin.title
          image.style.width = '100%'
          image.style.height = '120px'
          image.style.objectFit = 'cover'
          image.style.margin = '8px 0'
          image.style.border = '1px solid rgba(255, 255, 255, 0.15)'
          image.style.borderRadius = '4px'
          infoWindowContent.appendChild(image)
        }

        const date = document.createElement('div')
        date.textContent = new Date(pin.created_at).toLocaleDateString()
        date.style.fontSize = '10px'
        date.style.color = '#A1A1AA'
        date.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)'
        date.style.paddingTop = '8px'
        date.style.marginTop = '8px'
        date.style.fontWeight = '600'
        date.style.letterSpacing = '0.05em'
        infoWindowContent.appendChild(date)

        const buttonContainer = document.createElement('div')
        buttonContainer.style.marginTop = '12px'
        buttonContainer.style.display = 'flex'
        buttonContainer.style.gap = '8px'

        const viewButton = document.createElement('button')
        viewButton.textContent = 'VIEW'
        // Mobile-optimized touch targets
        const isMobile = window.innerWidth < 768
        viewButton.style.background = 'transparent'
        viewButton.style.color = '#F4F4F5'
        viewButton.style.border = '1px solid rgba(255, 255, 255, 0.3)'
        viewButton.style.padding = isMobile ? '12px 14px' : '8px 12px'
        viewButton.style.minHeight = isMobile ? '44px' : 'auto'
        viewButton.style.cursor = 'pointer'
        viewButton.style.fontSize = isMobile ? '12px' : '10px'
        viewButton.style.fontFamily = "'Share Tech Mono', monospace"
        viewButton.style.fontWeight = '700'
        viewButton.style.letterSpacing = '0.1em'
        viewButton.style.flex = '1'
        viewButton.style.borderRadius = '4px'
        viewButton.style.transition = 'all 0.15s ease'
        viewButton.onmouseenter = () => {
          viewButton.style.background = 'rgba(255, 255, 255, 0.1)'
          viewButton.style.borderColor = '#F4F4F5'
        }
        viewButton.onmouseleave = () => {
          viewButton.style.background = 'transparent'
          viewButton.style.borderColor = 'rgba(255, 255, 255, 0.3)'
        }
        viewButton.onclick = () => {
          setSelectedPinForImages({ id: pin.id, title: pin.title })
          setShowPinProfile(true)
          if (activeInfoWindowRef.current) {
            activeInfoWindowRef.current.close()
          }
        }
        buttonContainer.appendChild(viewButton)

        if (isOwnPin) {
          const editButton = document.createElement('button')
          editButton.textContent = 'EDIT'
          editButton.style.background = '#E63946'
          editButton.style.color = 'white'
          editButton.style.border = '1px solid #E63946'
          editButton.style.padding = isMobile ? '12px 14px' : '8px 12px'
          editButton.style.minHeight = isMobile ? '44px' : 'auto'
          editButton.style.cursor = 'pointer'
          editButton.style.fontSize = isMobile ? '12px' : '10px'
          editButton.style.fontFamily = "'Share Tech Mono', monospace"
          editButton.style.fontWeight = '700'
          editButton.style.letterSpacing = '0.1em'
          editButton.style.flex = '1'
          editButton.style.borderRadius = '4px'
          editButton.style.transition = 'all 0.15s ease'
          editButton.onmouseenter = () => {
            editButton.style.background = '#D62839'
          }
          editButton.onmouseleave = () => {
            editButton.style.background = '#E63946'
          }
          editButton.onclick = () => {
            setSelectedPin(pin)
            setShowEditModal(true)
            if (activeInfoWindowRef.current) {
              activeInfoWindowRef.current.close()
            }
          }
          buttonContainer.appendChild(editButton)
        }

        infoWindowContent.appendChild(buttonContainer)

        const infoWindow = new google.maps.InfoWindow({
          content: infoWindowContent
        })

        infoWindow.open(map.current!, marker)
        activeInfoWindowRef.current = infoWindow
      })

      markersRef.current.push(marker)
    })

    console.log('🎯 Pin display setup complete')
  }, [pins, isMapLoaded, user, collections])

  // Add POIs to map as markers
  const addPOIsToMap = useCallback(() => {
    if (!map.current || !isMapLoaded || !showPOIs) {
      // Clear existing POI markers if POIs are hidden
      poiMarkersRef.current.forEach(marker => marker.setMap(null))
      poiMarkersRef.current = []
      return
    }

    // Clear existing POI markers
    poiMarkersRef.current.forEach(marker => marker.setMap(null))
    poiMarkersRef.current = []

    if (pois.length === 0) {
      return
    }

    console.log('📍 Adding POIs to map:', pois.length, 'places')

    // Create markers for each POI
    pois.forEach(poi => {
      const marker = new google.maps.Marker({
        position: { lat: poi.geometry.location.lat, lng: poi.geometry.location.lng },
        map: map.current!,
        icon: createPOIMarkerIcon(poi.types),
        title: poi.name,
        opacity: 0.8 // Slightly transparent to differentiate from user pins
      })

      // Create click handler for POI marker
      marker.addListener('click', () => {
        console.log('🖱️ POI clicked:', poi.name)

        // Close any open InfoWindow
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close()
        }

        const infoWindowContent = document.createElement('div')
        infoWindowContent.style.minWidth = '200px'
        infoWindowContent.style.maxWidth = '280px'
        infoWindowContent.style.fontFamily = "'Share Tech Mono', monospace"
        infoWindowContent.style.padding = '12px'
        infoWindowContent.style.color = '#F4F4F5'

        const title = document.createElement('h3')
        title.textContent = poi.name
        title.style.margin = '0 0 8px 0'
        title.style.fontSize = '14px'
        title.style.fontWeight = '700'
        title.style.textTransform = 'uppercase'
        title.style.letterSpacing = '0.1em'
        title.style.color = '#F4F4F5'
        infoWindowContent.appendChild(title)

        const type = document.createElement('div')
        type.textContent = `[${poi.types[0]?.replace(/_/g, ' ') || 'place'}]`
        type.style.fontSize = '10px'
        type.style.color = '#78787E'
        type.style.fontWeight = '700'
        type.style.letterSpacing = '0.1em'
        type.style.textTransform = 'uppercase'
        type.style.marginBottom = '8px'
        infoWindowContent.appendChild(type)

        if (poi.rating) {
          const rating = document.createElement('div')
          rating.textContent = `⭐ ${poi.rating} ${poi.user_ratings_total ? `(${poi.user_ratings_total})` : ''}`
          rating.style.fontSize = '12px'
          rating.style.color = '#A1A1AA'
          rating.style.marginBottom = '8px'
          infoWindowContent.appendChild(rating)
        }

        // Add "Add to Collection" button if user is logged in
        if (user) {
          const addButton = document.createElement('button')
          addButton.textContent = '+ Add to Collection'
          addButton.style.width = '100%'
          addButton.style.padding = '8px'
          addButton.style.marginTop = '8px'
          addButton.style.background = 'var(--accent)'
          addButton.style.color = 'white'
          addButton.style.border = '1px solid var(--border)'
          addButton.style.borderRadius = 'var(--radius)'
          addButton.style.cursor = 'pointer'
          addButton.style.fontFamily = "'Share Tech Mono', monospace"
          addButton.style.fontSize = '11px'
          addButton.style.fontWeight = '700'
          addButton.style.letterSpacing = '0.05em'
          addButton.style.textTransform = 'uppercase'

          addButton.addEventListener('click', () => {
            // Pre-fill location for pin creation
            setSelectedLocation({
              lat: poi.geometry.location.lat,
              lng: poi.geometry.location.lng
            })
            // Store POI details for auto-fill
            setSelectedSearchLocation({
              id: poi.place_id,
              place_name: poi.name,
              center: [poi.geometry.location.lng, poi.geometry.location.lat],
              place_type: poi.types,
              properties: { category: poi.types[0] },
              placeDetails: {
                name: poi.name,
                geometry: poi.geometry,
                rating: poi.rating,
                user_ratings_total: poi.user_ratings_total,
                business_status: poi.business_status
              }
            })
            setShowPinModal(true)
            if (activeInfoWindowRef.current) {
              activeInfoWindowRef.current.close()
            }
          })

          infoWindowContent.appendChild(addButton)
        }

        const infoWindow = new google.maps.InfoWindow({
          content: infoWindowContent
        })

        infoWindow.open(map.current!, marker)
        activeInfoWindowRef.current = infoWindow
      })

      poiMarkersRef.current.push(marker)
    })

    console.log('📍 POI display setup complete')
  }, [pois, isMapLoaded, showPOIs, user])

  // Fetch POIs when map moves or zoom changes (with debouncing)
  useEffect(() => {
    if (!map.current || !isMapLoaded) return

    let debounceTimer: NodeJS.Timeout

    const handleMapChange = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchNearbyPOIs()
      }, 500) // Debounce for 500ms
    }

    // Listen to zoom and bounds changes
    const zoomListener = map.current.addListener('zoom_changed', handleMapChange)
    const boundsListener = map.current.addListener('bounds_changed', handleMapChange)

    // Initial fetch
    fetchNearbyPOIs()

    return () => {
      clearTimeout(debounceTimer)
      google.maps.event.removeListener(zoomListener)
      google.maps.event.removeListener(boundsListener)
    }
  }, [isMapLoaded, showPOIs])

  // Update POI markers when pois state changes
  useEffect(() => {
    if (map.current && isMapLoaded) {
      addPOIsToMap()
    }
  }, [pois, isMapLoaded, showPOIs, addPOIsToMap])

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Load saved map style from preferences
  useEffect(() => {
    if (preferences.map_style && preferences.map_style !== mapStyle) {
      console.log('📍 Loading saved map style:', preferences.map_style)
      setMapStyle(preferences.map_style)

      // Apply the style to the map if it's already initialized
      if (map.current) {
        if (preferences.map_style === 'dark') {
          map.current.setMapTypeId(google.maps.MapTypeId.ROADMAP)
          const styledMapType = new google.maps.StyledMapType([...HIDE_POI_STYLES, ...DARK_MAP_STYLES], { name: 'Dark' })
          map.current.mapTypes.set('dark_mode', styledMapType)
          map.current.setMapTypeId('dark_mode')
        } else {
          map.current.setMapTypeId(preferences.map_style as google.maps.MapTypeId)
          map.current.setOptions({ styles: HIDE_POI_STYLES })
        }
      }
    }
  }, [preferences.map_style, mapStyle])

  // Handler to change map style and save preference
  const handleMapStyleChange = (newStyle: string) => {
    console.log('🎨 Changing map style to:', newStyle)
    setMapStyle(newStyle)

    if (user) {
      updatePreference('map_style', newStyle)
    }

    if (map.current) {
      if (newStyle === 'dark') {
        map.current.setMapTypeId(google.maps.MapTypeId.ROADMAP)
        const styledMapType = new google.maps.StyledMapType([...HIDE_POI_STYLES, ...DARK_MAP_STYLES], { name: 'Dark' })
        map.current.mapTypes.set('dark_mode', styledMapType)
        map.current.setMapTypeId('dark_mode')
      } else {
        map.current.setMapTypeId(newStyle as google.maps.MapTypeId)
        map.current.setOptions({ styles: HIDE_POI_STYLES })
      }
    }
  }

  // Load pins when user changes
  useEffect(() => {
    if (user) {
      loadPins()
      loadCollections()
      loadFriendsCollections()
    }
  }, [user])

  // Filter pins whenever allPins or selectedCollectionId changes
  useEffect(() => {
    filterPinsByCollection(selectedCollectionId)
  }, [allPins, selectedCollectionId])

  // Update markers when pins change
  useEffect(() => {
    if (map.current && isMapLoaded) {
      addPinsToMap()
    }
  }, [pins, isMapLoaded, addPinsToMap])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const mapInstance = new google.maps.Map(mapContainer.current, {
      center: { lat, lng },
      zoom,
      mapTypeId: mapStyle === 'dark' ? google.maps.MapTypeId.ROADMAP : mapStyle as google.maps.MapTypeId,
      disableDoubleClickZoom: true,
      zoomControl: true,
      fullscreenControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      clickableIcons: false, // Disable clicking on default POI markers
      styles: mapStyle === 'dark' ? [] : HIDE_POI_STYLES // Hide POIs for non-dark modes
    })

    map.current = mapInstance

    // Add dark mode if needed (with POI hiding merged in)
    if (mapStyle === 'dark') {
      const styledMapType = new google.maps.StyledMapType([...HIDE_POI_STYLES, ...DARK_MAP_STYLES], { name: 'Dark' })
      mapInstance.mapTypes.set('dark_mode', styledMapType)
      mapInstance.setMapTypeId('dark_mode')
    }

    // Add custom geolocate control
    const geolocateButton = document.createElement('button')
    geolocateButton.textContent = '⊙'
    geolocateButton.style.backgroundColor = 'white'
    geolocateButton.style.border = '2px solid white'
    geolocateButton.style.borderRadius = '2px'
    geolocateButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)'
    geolocateButton.style.cursor = 'pointer'
    geolocateButton.style.width = '40px'
    geolocateButton.style.height = '40px'
    geolocateButton.style.margin = '10px'
    geolocateButton.style.fontSize = '18px'
    geolocateButton.title = 'Go to your location'

    geolocateButton.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
            mapInstance.setCenter(pos)
            mapInstance.setZoom(15)
          },
          () => {
            alert('Error: The Geolocation service failed.')
          }
        )
      } else {
        alert('Error: Your browser doesn\'t support geolocation.')
      }
    })

    mapInstance.controls[google.maps.ControlPosition.RIGHT_TOP].push(geolocateButton)

    // Add event listeners for position tracking
    mapInstance.addListener('center_changed', () => {
      const center = mapInstance.getCenter()
      if (center) {
        setLng(Number(center.lng().toFixed(4)))
        setLat(Number(center.lat().toFixed(4)))
      }
    })

    mapInstance.addListener('zoom_changed', () => {
      setZoom(Number(mapInstance.getZoom()?.toFixed(2) || 11))
    })

    // Handle map clicks to close InfoWindows
    mapInstance.addListener('click', () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close()
      }
    })

    // Handle double-click for pin creation
    mapInstance.addListener('dblclick', (e: google.maps.MapMouseEvent) => {
      // Use userRef.current to get the latest user value
      if (!userRef.current) {
        alert('Please log in to create pins')
        return
      }

      if (e.latLng) {
        console.log('📍 Double-clicked! Creating new pin at:', e.latLng.lat(), e.latLng.lng())

        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close()
        }

        setSelectedLocation({
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        })
        setShowPinModal(true)

        onMapClick?.(e.latLng.lng(), e.latLng.lat())
      }
    })

    setIsMapLoaded(true)
    console.log('✅ Google Map initialized')

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []
    }
  }, [])

  // Handle pin creation success
  const handlePinCreated = (pin: Pin) => {
    setAllPins(prev => [pin, ...prev])

    if (selectedCollectionId === null || pin.collection_id === selectedCollectionId) {
      setPins(prev => [pin, ...prev])
    }

    loadCollections()

    setShowPinModal(false)
    setSelectedLocation(null)
  }

  // Handle pin update success
  const handlePinUpdated = (updatedPin: Pin) => {
    setAllPins(prev => prev.map(pin =>
      pin.id === updatedPin.id ? updatedPin : pin
    ))
    setPins(prev => prev.map(pin =>
      pin.id === updatedPin.id ? updatedPin : pin
    ))
    setShowEditModal(false)
    setSelectedPin(null)
  }

  // Handle pin deletion
  const handlePinDeleted = (pinId: string) => {
    console.log('🗑️ Map: handlePinDeleted called for pin:', pinId)

    setAllPins(prev => prev.filter(pin => pin.id !== pinId))
    setPins(prev => prev.filter(pin => pin.id !== pinId))

    loadCollections()

    if (selectedPin?.id === pinId) {
      setShowEditModal(false)
      setSelectedPin(null)
    }

    if (selectedPinForImages?.id === pinId) {
      setShowImageViewer(false)
      setSelectedPinForImages(null)
    }

    console.log('✅ Pin deletion handling complete')
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Collections Sidebar with Tabs */}
      {!authLoading && user && (
        <div
          className="map-sidebar"
          style={{
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
            flexWrap: 'wrap',
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
                flex: '1 1 auto',
                minWidth: '50px',
                padding: '0.75rem 0.25rem',
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
                flex: '1 1 auto',
                minWidth: '50px',
                padding: '0.75rem 0.25rem',
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
                        {collection.net_score !== undefined && collection.net_score !== 0 && (
                          <span style={{
                            backgroundColor: collection.net_score > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: collection.net_score > 0 ? '#22c55e' : '#ef4444',
                            padding: '0.125rem 0.375rem',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.625rem',
                            fontWeight: '700'
                          }}>
                            {collection.net_score > 0 ? '+' : ''}{collection.net_score}
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
          ) : (
            <>
              {/* Friends Tab Content */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                marginBottom: '1rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Friends Collections
              </div>

              {/* Loading State */}
              {loadingFriendsCollections && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                  Loading friends collections...
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
                    backgroundColor: 'transparent',
                    color: 'var(--foreground)',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleCollectionSelect(collection.id, true)}
                >
                  {/* Thumbnail */}
                  {collection.first_pin_image ? (
                    <img
                      src={collection.first_pin_image}
                      alt=""
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius)',
                        objectFit: 'cover'
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

                  {/* Collection Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <span>{collection.pin_count || 0} pins</span>
                      <span>by @{collection.username}</span>
                      {collection.net_score !== undefined && collection.net_score !== 0 && (
                        <span style={{
                          backgroundColor: collection.net_score > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: collection.net_score > 0 ? '#22c55e' : '#ef4444',
                          padding: '0.125rem 0.375rem',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.625rem',
                          fontWeight: '700'
                        }}>
                          {collection.net_score > 0 ? '+' : ''}{collection.net_score}
                        </span>
                      )}
                    </div>
                  </div>
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
                  <div>No friends collections</div>
                  <div style={{ fontSize: '0.65rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Follow users to see their collections
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Search Bar - Always Visible */}
      <div style={{
        position: 'absolute',
        top: '0.75rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        width: '100%',
        maxWidth: '500px',
        padding: '0 1rem'
      }}>
        <div style={{ position: 'relative' }}>
          {/* Main Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(39, 39, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.75rem 1rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            gap: '0.75rem'
          }}>
            {/* Search Icon */}
            <div style={{
              color: 'var(--color-red)',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}>
              🔍
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                handleSearch(e.target.value)
              }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search for places..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.875rem',
                padding: '0.25rem',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.02em'
              }}
            />

            {/* Loading Indicator */}
            {isSearching && (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid var(--color-red)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                flexShrink: 0
              }} />
            )}

            {/* Clear Button */}
            {searchQuery && !isSearching && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setShowSearch(false)
                  setHasSearched(false)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: 0,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-red)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted-foreground)'
                }}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearch && (searchResults.length > 0 || (hasSearched && searchQuery)) && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              left: 0,
              right: 0,
              background: 'rgba(39, 39, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              zIndex: 20,
              maxHeight: '400px',
              overflowY: 'auto',
              animation: 'slideDown 0.2s ease'
            }}>
              {/* Results Header */}
              {searchResults.length > 0 && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--muted-foreground)',
                  fontWeight: '700'
                }}>
                  {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
                </div>
              )}

              {/* No Results Message */}
              {searchResults.length === 0 && hasSearched && searchQuery && (
                <div style={{
                  padding: '2rem 1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.75rem'
                  }}>
                    🔍
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem',
                    color: 'var(--foreground)'
                  }}>
                    No Results Found
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    lineHeight: '1.5'
                  }}>
                    Try searching with different keywords or check your spelling
                  </div>
                </div>
              )}

              {/* Results List */}
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => selectSearchResult(result)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(230, 57, 70, 0.1)'
                    e.currentTarget.style.paddingLeft = '1.25rem'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.paddingLeft = '1rem'
                  }}
                >
                  {/* Location Icon */}
                  <div style={{
                    fontSize: '1.25rem',
                    flexShrink: 0
                  }}>
                    📍
                  </div>

                  {/* Place Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '600',
                      marginBottom: '0.25rem',
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {result.place_name.split(',')[0]}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted-foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {result.place_name.split(',').slice(1).join(',')}
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div style={{
                    color: 'var(--color-red)',
                    fontSize: '0.875rem',
                    flexShrink: 0,
                    opacity: 0.5
                  }}>
                    →
                  </div>
                </button>
              ))}
            </div>
          )}

          <style jsx>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      </div>

      {/* Map Layers Button - Below collections FAB on mobile */}
      <button
        onClick={() => setShowMapLayersModal(true)}
        className="map-style-selector mobile-only"
        style={{
          position: 'fixed',
          bottom: '9rem',
          left: '1rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          border: '2px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          zIndex: 997,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        aria-label="Map layers"
      >
        🗺️
      </button>

      {/* User Instructions - Only show for new users (within 7 days of signup) */}
      {!authLoading && user && (() => {
        // Check if user is new (signed up within last 7 days)
        if (!profile?.created_at) return false
        const signupDate = new Date(profile.created_at)
        const daysSinceSignup = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceSignup <= 7
      })() && (
        <div className="mobile-hidden" style={{
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

      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%'
        }}
      />

      {/* Modals */}
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
            if (searchMarkerRef.current) {
              searchMarkerRef.current.setMap(null)
              searchMarkerRef.current = null
            }
            setSelectedSearchLocation(null)
            loadPins()
            loadCollections()
          }}
        />
      )}

      {/* Mobile Floating Action Button - Only show on mobile when user is authenticated */}
      {!authLoading && user && (
        <button
          onClick={() => setIsBottomSheetOpen(true)}
          className="mobile-only"
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '1rem',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'white',
            border: '2px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            zIndex: 997,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
          aria-label="Open collections"
        >
          📂
        </button>
      )}

      {/* Mobile Bottom Sheet - Shows collections on mobile */}
      {!authLoading && user && (
        <BottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          snapPoints={[40, 85]}
          defaultSnap={0}
        >
          {/* Tab Headers */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            borderBottom: '2px solid var(--border)',
            paddingBottom: '0.5rem'
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
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'var(--transition)'
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
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.625rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'var(--transition)'
              }}
            >
              FRIENDS
            </button>
          </div>

          {/* Tab Content - My Collections */}
          {activeTab === 'my-collections' && (
            <>
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
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 'var(--radius)'
                }}>
                  {allPins.length}
                </span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {/* All Pins Button */}
                <button
                  onClick={() => {
                    handleCollectionSelect(null, false)
                    setIsBottomSheetOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
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
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {allPins.length}
                  </span>
                </button>

                {/* Collection Items */}
                {!loadingCollections && collections.map(collection => (
                  <button
                    key={collection.id}
                    onClick={() => {
                      handleCollectionSelect(collection.id, false)
                      setIsBottomSheetOpen(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: selectedCollectionId === collection.id ? 'var(--accent)' : 'transparent',
                      color: selectedCollectionId === collection.id ? 'white' : 'var(--foreground)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
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
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        border: '2px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        backgroundColor: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '700'
                      }}>
                        {collection.color || '📂'}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {collection.title}
                      </div>
                      <div style={{
                        fontSize: '0.625rem',
                        color: selectedCollectionId === collection.id ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {collection.pin_count || 0} pins
                      </div>
                    </div>
                  </button>
                ))}

                {loadingCollections && (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)'
                  }}>
                    Loading collections...
                  </div>
                )}

                {!loadingCollections && collections.length === 0 && (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.75rem'
                  }}>
                    No collections yet. Start creating collections to organize your pins!
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tab Content - Friends */}
          {activeTab === 'friends' && (
            <>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                marginBottom: '1rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Friends Collections
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {!loadingFriendsCollections && friendsCollections.map((collection) => (
                  <button
                    key={`${collection.user_id}-${collection.id}`}
                    onClick={() => {
                      handleCollectionSelect(collection.id, true)
                      setIsBottomSheetOpen(false)
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: selectedCollectionId === collection.id ? 'var(--accent)' : 'transparent',
                      color: selectedCollectionId === collection.id ? 'white' : 'var(--foreground)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        marginBottom: '0.25rem'
                      }}>
                        {collection.title}
                      </div>
                      <div style={{
                        fontSize: '0.625rem',
                        color: 'var(--muted-foreground)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        by @{collection.username} • {collection.pin_count || 0} pins
                      </div>
                    </div>
                  </button>
                ))}

                {loadingFriendsCollections && (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)'
                  }}>
                    Loading...
                  </div>
                )}

                {!loadingFriendsCollections && friendsCollections.length === 0 && (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.75rem'
                  }}>
                    No friends collections yet
                  </div>
                )}
              </div>
            </>
          )}

        </BottomSheet>
      )}

      {/* Map Layers Modal */}
      <MapLayersModal
        isOpen={showMapLayersModal}
        onClose={() => setShowMapLayersModal(false)}
        currentStyle={mapStyle}
        onStyleSelect={handleMapStyleChange}
      />
    </div>
  )
}

// Main export with Wrapper
export default function Map(props: MapProps) {
  return (
    <Wrapper apiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
      <MapComponent {...props} />
    </Wrapper>
  )
}
