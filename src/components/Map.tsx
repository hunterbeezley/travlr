'use client'
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Wrapper } from '@googlemaps/react-wrapper'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase } from '@/lib/supabase'
import { DatabaseService, FriendsCollection, DiscoverCollectionInBounds, CollectionPin } from '@/lib/database'
import { logger } from '@/lib/logger'
import { getCachedPlaces, setCachedPlaces } from '@/lib/placesCache'
import { Z_INDEX } from '@/lib/mapUiConstants'
import PinCreationModal from './PinCreationModal'
import PinEditModal from './PinEditModal'
import PinImageViewerModal from './PinImageViewerModal'
import PinProfileModal from './PinProfileModal'
import FollowButton from './FollowButton'
import AddSearchLocationModal from './AddSearchLocationModal'
import BottomSheet from './BottomSheet'
import MapLayersModal from './MapLayersModal'
import ForkPinModal from './ForkPinModal'
import CollectionTabs, { CollectionTabId } from './Map/CollectionTabs'
import DiscoverTab from './Map/DiscoverTab'
import MineTab from './Map/MineTab'
import DiscoverCollectionDetailModal from './Map/DiscoverCollectionDetailModal'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

type DiscoverCollection = DiscoverCollectionInBounds

// Simple v1 ranking heuristic for the Discover feed: net_score (votes) plus
// a recency bonus that decays from full weight in the first 24h to ~0 by two
// weeks. Tuning constants, not derived from data - revisit after shipping.
function recencyBoost(createdAt: string, now: number): number {
  const ageHours = (now - new Date(createdAt).getTime()) / 3_600_000
  return Math.max(0, 5 - ageHours / 67.2)
}

function rankDiscoverCollections(collections: DiscoverCollection[]): DiscoverCollection[] {
  const now = Date.now()
  return [...collections].sort((a, b) => {
    const scoreA = (a.net_score ?? 0) + recencyBoost(a.created_at, now)
    const scoreB = (b.net_score ?? 0) + recencyBoost(b.created_at, now)
    return scoreB - scoreA
  })
}

interface CollectionSearchResult {
  id: string
  title: string
  description: string | null
  pin_count?: number
}

interface PersonSearchResult {
  id: string
  username: string | null
  full_name: string | null
  profile_image: string | null
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

function MapComponent() {
  const { user, profile, loading: authLoading } = useAuth()
  const { preferences, updatePreference } = useUserPreferences()
  const isMobileViewport = useIsMobile()
  // Desktop sidebar only renders once auth resolves to a logged-in user -
  // used to decide whether Map Layers lives in the sidebar or floats as a FAB.
  const showsSidebar = !authLoading && !!user && !isMobileViewport
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const discoverMarkersRef = useRef<google.maps.Marker[]>([])
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const searchMarkerRef = useRef<google.maps.Marker | null>(null)
  const isInfoWindowInteractionRef = useRef(false)

  // Refs (not state) since these are only read once at map-init and would
  // otherwise force a full re-render on every tick of a pan/zoom gesture.
  const lngRef = useRef(-122.6765)
  const latRef = useRef(45.5152)
  const zoomRef = useRef(11)
  const [mapStyle, setMapStyle] = useState(preferences.map_style || 'roadmap')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Unified search - collections and people (alongside Places, above)
  const [collectionSearchResults, setCollectionSearchResults] = useState<CollectionSearchResult[]>([])
  const [peopleSearchResults, setPeopleSearchResults] = useState<PersonSearchResult[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  // Create a blank collection directly from the map (no place required yet -
  // covers "I'm traveling but don't know what to add" before any pins exist)
  const [creatingBlankCollection, setCreatingBlankCollection] = useState(false)
  const [newBlankCollectionTitle, setNewBlankCollectionTitle] = useState('')
  const [savingBlankCollection, setSavingBlankCollection] = useState(false)

  // Pin creation state
  const [showPinModal, setShowPinModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [loadingPins, setLoadingPins] = useState(false)

  // POI state
  const [pois, setPois] = useState<POI[]>([])
  const [showPOIs, setShowPOIs] = useState(true)
  // No longer user-editable (category filter UI was removed from MapLayersModal) -
  // fixed default category list used for the nearby-POI fetch.
  const [poiCategories] = useState<string[]>([
    'restaurant',
    'cafe',
    'bar',
    'museum',
    'park',
    'tourist_attraction',
    'store'
  ])
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
  // addPinsToMap only needs collection colors, not the whole array - this keeps
  // its identity stable across collection refetches that don't touch color,
  // so personal pin markers aren't torn down/rebuilt unnecessarily.
  const collectionColorSignature = useMemo(
    () => collections.map(c => `${c.id}:${c.color}`).join('|'),
    [collections]
  )

  // Friends/Follow state
  const [activeTab, setActiveTab] = useState<'my-collections' | 'friends' | 'discover'>('discover')
  // Ref to track active tab for the bounds-changed listener, so switching
  // tabs doesn't require re-subscribing the underlying Maps event listeners.
  const activeTabRef = useRef(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])
  const [friendsCollections, setFriendsCollections] = useState<FriendsCollection[]>([])
  const [loadingFriendsCollections, setLoadingFriendsCollections] = useState(false)
  const [friendsPins, setFriendsPins] = useState<Pin[]>([])

  // Discover state (public collections from any user)
  const [discoverCollections, setDiscoverCollections] = useState<DiscoverCollection[]>([])
  const [loadingDiscoverCollections, setLoadingDiscoverCollections] = useState(false)
  const [selectedDiscoverCollection, setSelectedDiscoverCollection] = useState<DiscoverCollection | null>(null)
  // Pins for the selected Discover collection's detail modal - fetched on
  // demand when opened rather than eagerly for every collection in bounds.
  const [discoverDetailPins, setDiscoverDetailPins] = useState<CollectionPin[]>([])
  const [loadingDiscoverDetailPins, setLoadingDiscoverDetailPins] = useState(false)
  const [forkingPinId, setForkingPinId] = useState<string | null>(null)
  const [forkingPinTitle, setForkingPinTitle] = useState('')

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
      setCollectionSearchResults([])
      setPeopleSearchResults([])
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

        logger.log('🔍 Searching for:', query)

        // Search places, collections, and people in parallel - one search
        // bar covers everything (replaces the old standalone /search and
        // /friends pages)
        const [placesResponse, collectionsResult, peopleResult] = await Promise.all([
          fetch(`/api/google-places/autocomplete?${params.toString()}`).then(r => r.json()),
          supabase.rpc('search_collections', {
            search_query: query.trim(),
            filter_category: null,
            filter_location: null,
            sort_by: 'relevance',
            result_limit: 5
          }),
          supabase.rpc('search_users', {
            search_query: query.trim(),
            result_limit: 5
          })
        ])

        if (placesResponse.error) {
          logger.error('Google Places API error:', placesResponse.error)
          setSearchResults([])
        } else {
          const transformedResults: SearchResult[] = (placesResponse.predictions || [])
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
          setSearchResults(transformedResults)
        }

        if (collectionsResult.error) {
          logger.error('Collection search error:', collectionsResult.error)
          setCollectionSearchResults([])
        } else {
          setCollectionSearchResults(collectionsResult.data || [])
        }

        if (peopleResult.error) {
          logger.error('People search error:', peopleResult.error)
          setPeopleSearchResults([])
        } else {
          setPeopleSearchResults(peopleResult.data || [])
        }

        setHasSearched(true)
      } catch (error) {
        logger.error('Search error:', error)
        setSearchResults([])
        setCollectionSearchResults([])
        setPeopleSearchResults([])
        setHasSearched(true)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleFollowPerson = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('follow_user', { p_following_id: userId })
      if (error) throw error
      setFollowingIds(prev => new Set(prev).add(userId))
    } catch (error) {
      logger.error('Error following user:', error)
    }
  }

  const selectSearchResult = async (result: SearchResult) => {
    if (!map.current) return

    try {
      const response = await fetch(`/api/google-places/details?place_id=${result.id}`)

      if (!response.ok) {
        logger.error('Failed to fetch place details: HTTP', response.status)
        alert('Failed to load place details. Please try again.')
        return
      }

      const data = await response.json()

      if (data.error || !data.result) {
        logger.error('Failed to fetch place details:', data.error)
        alert('Failed to load place details. Please try again.')
        return
      }

      const placeDetails = data.result
      const location = placeDetails.geometry?.location

      if (!location) {
        logger.error('No location found in place details')
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
      logger.error('Error selecting search result:', error)
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
        .select('id, title, description, latitude, longitude, image_url, category, created_at, user_id, collection_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error loading pins:', error)
        return
      }

      setAllPins(data || [])
    } catch (error) {
      logger.error('Error loading pins:', error)
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
        logger.error('Error loading collections:', error)
        return
      }

      setCollections(data || [])
    } catch (error) {
      logger.error('Error loading collections:', error)
    } finally {
      setLoadingCollections(false)
    }
  }

  const handleCreateBlankCollection = async () => {
    if (!user || !newBlankCollectionTitle.trim()) return

    setSavingBlankCollection(true)
    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({ user_id: user.id, title: newBlankCollectionTitle.trim(), is_public: false })
        .select()
        .single()

      if (error || !data) {
        logger.error('Error creating collection:', error)
        return
      }

      await loadCollections()
      setSelectedCollectionId(data.id)
      setNewBlankCollectionTitle('')
      setCreatingBlankCollection(false)
    } finally {
      setSavingBlankCollection(false)
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

    // If no categories selected, don't fetch POIs
    if (poiCategories.length === 0) {
      setPois([])
      return
    }

    const radius = 1500 // 1.5km radius
    const lat = center.lat()
    const lng = center.lng()

    const cached = getCachedPlaces<POI[]>(lat, lng, radius, poiCategories)
    if (cached) {
      setPois(cached)
      return
    }

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        types: poiCategories.join(',')
      })

      const response = await fetch(`/api/google-places/nearby?${params.toString()}`)
      const data = await response.json()

      if (data.error) {
        logger.error('POI fetch error:', data.error)
        return
      }

      const results = data.results || []
      setCachedPlaces(lat, lng, radius, poiCategories, results)
      setPois(results)
    } catch (error) {
      logger.error('Error fetching nearby POIs:', error)
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
      logger.error('Error loading friends collections:', error)
    } finally {
      setLoadingFriendsCollections(false)
    }
  }

  // Load public collections with a pin inside the current map bounds
  // (Discover tab) - re-run as the user pans/zooms while Discover is active.
  const fetchDiscoverCollectionsInBounds = async () => {
    if (!map.current) return
    const bounds = map.current.getBounds()
    if (!bounds) return

    const ne = bounds.getNorthEast()
    const sw = bounds.getSouthWest()

    setLoadingDiscoverCollections(true)
    try {
      const results = await DatabaseService.getDiscoverCollectionsInBounds({
        minLat: sw.lat(),
        maxLat: ne.lat(),
        minLng: sw.lng(),
        maxLng: ne.lng(),
      })
      setDiscoverCollections(rankDiscoverCollections(results))
    } catch (error) {
      logger.error('Error loading discover collections in bounds:', error)
      setDiscoverCollections([])
    } finally {
      setLoadingDiscoverCollections(false)
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
        logger.error('Error loading friend collection pins:', error)
        return
      }

      const friendPins = data || []
      setFriendsPins(friendPins)
      setPins(friendPins)
      fitMapToPins(friendPins)
    } catch (error) {
      logger.error('Error loading friend collection pins:', error)
    }
  }

  // Fetch a Discover collection's pins on demand when its detail modal opens
  const loadDiscoverDetailPins = async (collectionId: string) => {
    setLoadingDiscoverDetailPins(true)
    try {
      const collectionPins = await DatabaseService.getCollectionPins(collectionId)
      setDiscoverDetailPins(collectionPins)
    } finally {
      setLoadingDiscoverDetailPins(false)
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

        logger.log('✅ Collection deleted successfully')
      } else {
        alert(`Failed to delete collection: ${result.error}`)
      }
    } catch (error) {
      logger.error('Error deleting collection:', error)
      alert('Failed to delete collection. Please try again.')
    }
  }

  // Shared Discover/Mine/tab-switcher handlers - used by both the desktop
  // sidebar and the mobile bottom sheet, which render the same
  // CollectionTabs/DiscoverTab/MineTab elements. Mobile variants additionally
  // close the bottom sheet after acting, matching the pre-extraction behavior.
  const handleTabChange = (tab: CollectionTabId) => {
    setActiveTab(tab)
    setSelectedCollectionId(null)
  }

  const handleDiscoverCardSelect = (collection: DiscoverCollection) => {
    setSelectedDiscoverCollection(collection)
  }

  const handleMineSelectAllPins = () => handleCollectionSelect(null, false)
  const handleMineSelectAllPinsMobile = () => {
    handleCollectionSelect(null, false)
    setIsBottomSheetOpen(false)
  }

  const handleMineSelect = (collection: Collection) => handleCollectionSelect(collection.id, false)
  const handleMineSelectMobile = (collection: Collection) => {
    handleCollectionSelect(collection.id, false)
    setIsBottomSheetOpen(false)
  }

  const handleMineViewDetails = (collection: Collection) => router.push(`/collections/${collection.id}`)
  const handleMineViewDetailsMobile = (collection: Collection) => {
    router.push(`/collections/${collection.id}`)
    setIsBottomSheetOpen(false)
  }

  const handleMineDelete = (collection: Collection) => handleDeleteCollection(collection.id, collection.title)

  // Add pins to map as individual markers
  const addPinsToMap = useCallback(() => {
    if (!map.current || !isMapLoaded) {
      logger.warn('⚠️ Cannot add pins: map not initialized or loaded')
      return
    }

    // Discover tab renders its own markers (see addDiscoverMarkersToMap) -
    // clear personal pin markers so the two modes don't overlap
    if (activeTab === 'discover') {
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []
      return
    }

    // Friends tab shows friends' pins, not the user's own - these were
    // being fetched (setFriendsPins) but never actually rendered, so
    // switching to Friends silently kept showing your own pins
    const pinsToRender = activeTab === 'friends' ? friendsPins : pins

    logger.log('🔧 Adding pins to map:', pinsToRender.length, 'pins')

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    if (pinsToRender.length === 0) {
      logger.log('⚠️ No pins to display')
      return
    }

    // Create a map of collection ID to color for quick lookup
    const collectionColorMap: Record<string, string> = {}
    collections.forEach(collection => {
      collectionColorMap[collection.id] = collection.color || '#E63946'
    })

    // Create markers for each pin
    pinsToRender.forEach(pin => {
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
        logger.log('🖱️ Pin clicked:', pin.title)

        // Set flag to prevent bounds_changed from refetching POIs
        isInfoWindowInteractionRef.current = true

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

        // Add "View Collection" button if pin belongs to a collection
        if (pin.collection_id) {
          const collectionButton = document.createElement('button')
          collectionButton.textContent = 'COLLECTION'
          collectionButton.style.background = 'transparent'
          collectionButton.style.color = '#F4F4F5'
          collectionButton.style.border = '1px solid rgba(255, 255, 255, 0.3)'
          collectionButton.style.padding = isMobile ? '12px 14px' : '8px 12px'
          collectionButton.style.minHeight = isMobile ? '44px' : 'auto'
          collectionButton.style.cursor = 'pointer'
          collectionButton.style.fontSize = isMobile ? '12px' : '10px'
          collectionButton.style.fontFamily = "'Share Tech Mono', monospace"
          collectionButton.style.fontWeight = '700'
          collectionButton.style.letterSpacing = '0.1em'
          collectionButton.style.flex = '1'
          collectionButton.style.borderRadius = '4px'
          collectionButton.style.transition = 'all 0.15s ease'
          collectionButton.onmouseenter = () => {
            collectionButton.style.background = 'rgba(230, 57, 70, 0.2)'
            collectionButton.style.borderColor = '#E63946'
            collectionButton.style.color = '#E63946'
          }
          collectionButton.onmouseleave = () => {
            collectionButton.style.background = 'transparent'
            collectionButton.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            collectionButton.style.color = '#F4F4F5'
          }
          collectionButton.onclick = () => {
            router.push(`/collections/${pin.collection_id}`)
            if (activeInfoWindowRef.current) {
              activeInfoWindowRef.current.close()
            }
          }
          buttonContainer.appendChild(collectionButton)
        }

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

        // Reset flag after InfoWindow fully opens (after bounds adjustment)
        setTimeout(() => {
          isInfoWindowInteractionRef.current = false
        }, 1000)

        // Reset flag when InfoWindow is closed
        infoWindow.addListener('closeclick', () => {
          isInfoWindowInteractionRef.current = false
        })
      })

      markersRef.current.push(marker)
    })

    logger.log('🎯 Pin display setup complete')
  }, [pins, friendsPins, isMapLoaded, user, collectionColorSignature, activeTab])

  // Add discover (public collection) markers to map
  const addDiscoverMarkersToMap = useCallback(() => {
    if (!map.current || !isMapLoaded) return

    // Clear existing discover markers
    discoverMarkersRef.current.forEach(marker => marker.setMap(null))
    discoverMarkersRef.current = []

    if (activeTab !== 'discover') return

    discoverCollections
      .forEach(col => {
        const marker = new google.maps.Marker({
          position: { lat: col.rep_latitude, lng: col.rep_longitude },
          map: map.current!,
          title: col.title,
        })

        marker.addListener('click', () => {
          setSelectedDiscoverCollection(col)
        })

        discoverMarkersRef.current.push(marker)
      })
  }, [discoverCollections, activeTab, isMapLoaded])

  useEffect(() => {
    addDiscoverMarkersToMap()
  }, [addDiscoverMarkersToMap])

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

    logger.log('📍 Adding POIs to map:', pois.length, 'places')

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
        logger.log('🖱️ POI clicked:', poi.name)

        // Set flag to prevent bounds_changed from refetching POIs
        isInfoWindowInteractionRef.current = true

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

        // Reset flag after InfoWindow fully opens (after bounds adjustment)
        setTimeout(() => {
          isInfoWindowInteractionRef.current = false
        }, 1000)

        // Reset flag when InfoWindow is closed
        infoWindow.addListener('closeclick', () => {
          isInfoWindowInteractionRef.current = false
        })
      })

      poiMarkersRef.current.push(marker)
    })

    logger.log('📍 POI display setup complete')
  }, [pois, isMapLoaded, showPOIs, user])

  // Fetch POIs, and Discover collections when that tab is active, as the map
  // moves or zoom changes (debounced together on the same listeners).
  useEffect(() => {
    if (!map.current || !isMapLoaded) return

    let debounceTimer: NodeJS.Timeout

    const handleMapChange = () => {
      // Ignore bounds changes caused by InfoWindow interactions
      if (isInfoWindowInteractionRef.current) {
        logger.log('🚫 Ignoring bounds change caused by InfoWindow interaction')
        return
      }

      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchNearbyPOIs()
        if (activeTabRef.current === 'discover') {
          fetchDiscoverCollectionsInBounds()
        }
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
  }, [isMapLoaded, showPOIs, poiCategories])

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
      logger.log('📍 Loading saved map style:', preferences.map_style)
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
    logger.log('🎨 Changing map style to:', newStyle)
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

  // Fetch discover collections for the current bounds the moment the
  // Discover tab becomes active - the bounds-changed effect above owns all
  // subsequent refetches while the tab stays active.
  useEffect(() => {
    if (activeTab === 'discover' && isMapLoaded) {
      fetchDiscoverCollectionsInBounds()
    }
  }, [activeTab, isMapLoaded])

  // Fetch the selected Discover collection's pins when its detail modal opens
  useEffect(() => {
    if (selectedDiscoverCollection) {
      loadDiscoverDetailPins(selectedDiscoverCollection.id)
    } else {
      setDiscoverDetailPins([])
    }
  }, [selectedDiscoverCollection])

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
      center: { lat: latRef.current, lng: lngRef.current },
      zoom: zoomRef.current,
      mapTypeId: mapStyle === 'dark' ? google.maps.MapTypeId.ROADMAP : mapStyle as google.maps.MapTypeId,
      disableDoubleClickZoom: false, // Enable double-click/tap to zoom
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM // Thumb-friendly position on mobile
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.RIGHT_TOP
      },
      mapTypeControl: false,
      streetViewControl: false,
      clickableIcons: false, // Disable clicking on default POI markers
      gestureHandling: 'greedy', // Enable single-finger navigation on mobile
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
    geolocateButton.style.width = '44px' // Apple HIG minimum touch target
    geolocateButton.style.height = '44px' // Apple HIG minimum touch target
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

    mapInstance.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(geolocateButton)

    // Add event listeners for position tracking
    mapInstance.addListener('center_changed', () => {
      const center = mapInstance.getCenter()
      if (center) {
        lngRef.current = Number(center.lng().toFixed(4))
        latRef.current = Number(center.lat().toFixed(4))
      }
    })

    mapInstance.addListener('zoom_changed', () => {
      zoomRef.current = Number(mapInstance.getZoom()?.toFixed(2) || 11)
    })

    // Handle map clicks to close InfoWindows
    mapInstance.addListener('click', () => {
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close()
      }
      // Reset flag when clicking elsewhere on map
      isInfoWindowInteractionRef.current = false
    })

    // Handle right-click (desktop) for pin creation
    mapInstance.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
      // Use userRef.current to get the latest user value
      if (!userRef.current) {
        alert('Please log in to create pins')
        return
      }

      if (e.latLng) {
        logger.log('📍 Right-clicked! Creating new pin at:', e.latLng.lat(), e.latLng.lng())

        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close()
        }

        setSelectedLocation({
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        })
        setShowPinModal(true)
      }
    })

    // Handle long-press (mobile) for pin creation
    let longPressTimer: NodeJS.Timeout | null = null
    let longPressLatLng: google.maps.LatLng | null = null
    let touchMoved = false

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return // Only handle single touch

      touchMoved = false

      // Get the lat/lng from the touch position
      const touch = e.touches[0]
      const mapDiv = mapInstance.getDiv()
      const rect = mapDiv.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      // Convert pixel to lat/lng
      const projection = mapInstance.getProjection()
      if (!projection) return

      const bounds = mapInstance.getBounds()
      if (!bounds) return

      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()

      const mapWidth = rect.width
      const mapHeight = rect.height

      const lng = sw.lng() + (x / mapWidth) * (ne.lng() - sw.lng())
      const lat = ne.lat() - (y / mapHeight) * (ne.lat() - sw.lat())

      longPressLatLng = new google.maps.LatLng(lat, lng)

      // Start long-press timer (500ms)
      longPressTimer = setTimeout(() => {
        if (!touchMoved && longPressLatLng && userRef.current) {
          logger.log('📍 Long-press! Creating new pin at:', longPressLatLng.lat(), longPressLatLng.lng())

          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }

          if (activeInfoWindowRef.current) {
            activeInfoWindowRef.current.close()
          }

          setSelectedLocation({
            lat: longPressLatLng.lat(),
            lng: longPressLatLng.lng()
          })
          setShowPinModal(true)
        }
      }, 500)
    }

    const handleTouchMove = () => {
      touchMoved = true
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      longPressLatLng = null
    }

    // Add touch event listeners to the map div
    const mapDiv = mapInstance.getDiv()
    mapDiv.addEventListener('touchstart', handleTouchStart, { passive: true })
    mapDiv.addEventListener('touchmove', handleTouchMove, { passive: true })
    mapDiv.addEventListener('touchend', handleTouchEnd, { passive: true })
    mapDiv.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    setIsMapLoaded(true)
    logger.log('✅ Google Map initialized')

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []

      // Cleanup touch event listeners
      const mapDiv = mapInstance.getDiv()
      mapDiv.removeEventListener('touchstart', handleTouchStart)
      mapDiv.removeEventListener('touchmove', handleTouchMove)
      mapDiv.removeEventListener('touchend', handleTouchEnd)
      mapDiv.removeEventListener('touchcancel', handleTouchEnd)

      // Clear any pending long-press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
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
    logger.log('🗑️ Map: handlePinDeleted called for pin:', pinId)

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

    logger.log('✅ Pin deletion handling complete')
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Collections Sidebar with Tabs - not just CSS-hidden on mobile, but
          unmounted entirely so its tab-content JSX doesn't reconcile behind
          the scenes on every mobile render. */}
      {showsSidebar && (
        <div
          className="map-sidebar"
          style={{
            position: 'absolute',
            left: '1rem',
            top: '5rem',
            bottom: '1rem',
            width: '340px',
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
          {/* View filter - one continuous view, filtered (not 3 separate destinations) */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <CollectionTabs activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
            <button
              onClick={() => setShowMapLayersModal(true)}
              aria-label="Map layers"
              title="Map layers"
              style={{
                flexShrink: 0,
                width: '40px',
                height: '40px',
                marginBottom: '1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                color: 'var(--foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              🗺️
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'discover' ? (
            <DiscoverTab
              collections={discoverCollections}
              loading={loadingDiscoverCollections}
              selectedId={selectedDiscoverCollection?.id ?? null}
              onSelect={handleDiscoverCardSelect}
            />
          ) : activeTab === 'my-collections' ? (
            <MineTab
              collections={collections}
              loading={loadingCollections}
              allPinsCount={allPins.length}
              selectedCollectionId={selectedCollectionId}
              onSelectAllPins={handleMineSelectAllPins}
              onSelectCollection={handleMineSelect}
              onViewDetails={handleMineViewDetails}
              onDelete={handleMineDelete}
              creatingBlankCollection={creatingBlankCollection}
              onStartCreating={() => setCreatingBlankCollection(true)}
              newBlankCollectionTitle={newBlankCollectionTitle}
              onNewBlankCollectionTitleChange={setNewBlankCollectionTitle}
              onCreateBlankCollection={handleCreateBlankCollection}
              onCancelCreating={() => { setCreatingBlankCollection(false); setNewBlankCollectionTitle('') }}
              savingBlankCollection={savingBlankCollection}
            />
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
                    position: 'relative'
                  }}
                >
                  {/* Clickable area for selection */}
                  <button
                    onClick={() => handleCollectionSelect(collection.id, true)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: '35px',
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

                  {/* View Collection Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/collections/${collection.id}`)
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
                    title={`View collection: ${collection.title}`}
                  >
                    →
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
      <div className="map-search-bar-container" style={{
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
          {showSearch && (searchResults.length > 0 || collectionSearchResults.length > 0 || peopleSearchResults.length > 0 || (hasSearched && searchQuery)) && (
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
              {/* People Results */}
              {peopleSearchResults.length > 0 && (
                <>
                  <div style={{
                    padding: '0.75rem 1rem 0.25rem',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--muted-foreground)',
                    fontWeight: '700'
                  }}>
                    People
                  </div>
                  {peopleSearchResults.map(person => (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 1rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>
                        {person.full_name || person.username || 'Unnamed user'}
                      </span>
                      {!followingIds.has(person.id) ? (
                        <button
                          onClick={() => handleFollowPerson(person.id)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Follow
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                          Following
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Collection Results */}
              {collectionSearchResults.length > 0 && (
                <>
                  <div style={{
                    padding: '0.75rem 1rem 0.25rem',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--muted-foreground)',
                    fontWeight: '700'
                  }}>
                    Collections
                  </div>
                  {collectionSearchResults.map(col => (
                    <button
                      key={col.id}
                      onClick={() => router.push(`/collections/${col.id}`)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.6rem 1rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                      }}
                    >
                      {col.title}
                    </button>
                  ))}
                </>
              )}

              {/* Places Results Header */}
              {searchResults.length > 0 && (
                <div style={{
                  padding: '0.75rem 1rem 0.25rem',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--muted-foreground)',
                  fontWeight: '700'
                }}>
                  Places
                </div>
              )}

              {/* No Results Message */}
              {searchResults.length === 0 && collectionSearchResults.length === 0 && peopleSearchResults.length === 0 && hasSearched && searchQuery && (
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

      {/* Map Layers Button - floating FAB only where there's no sidebar to
          hold the icon-button version (mobile, or logged-out desktop).
          Bottom left on desktop, above collections FAB on mobile. */}
      {!showsSidebar && (
        <button
          onClick={() => setShowMapLayersModal(true)}
          className="map-layers-button"
          style={{
            position: 'fixed',
            left: '1rem',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'white',
            border: '2px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            zIndex: Z_INDEX.mapControls,
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
      )}

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
            bottom: 'calc(5rem + env(safe-area-inset-bottom))', // Above mobile nav with safe area
            left: '1rem',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'white',
            border: '2px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            zIndex: Z_INDEX.mapControls,
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
          {/* View filter - one continuous view, filtered (not 3 separate destinations) */}
          <CollectionTabs activeTab={activeTab} onTabChange={handleTabChange} buttonPadding="0.6rem 0.5rem" />

          {/* Tab Content - Discover */}
          {activeTab === 'discover' && (
            <DiscoverTab
              collections={discoverCollections}
              loading={loadingDiscoverCollections}
              selectedId={selectedDiscoverCollection?.id ?? null}
              onSelect={handleDiscoverCardSelect}
            />
          )}

          {/* Tab Content - My Collections */}
          {activeTab === 'my-collections' && (
            <MineTab
              collections={collections}
              loading={loadingCollections}
              allPinsCount={allPins.length}
              selectedCollectionId={selectedCollectionId}
              onSelectAllPins={handleMineSelectAllPinsMobile}
              onSelectCollection={handleMineSelectMobile}
              onViewDetails={handleMineViewDetailsMobile}
              onDelete={handleMineDelete}
              creatingBlankCollection={creatingBlankCollection}
              onStartCreating={() => setCreatingBlankCollection(true)}
              newBlankCollectionTitle={newBlankCollectionTitle}
              onNewBlankCollectionTitleChange={setNewBlankCollectionTitle}
              onCreateBlankCollection={handleCreateBlankCollection}
              onCancelCreating={() => { setCreatingBlankCollection(false); setNewBlankCollectionTitle('') }}
              savingBlankCollection={savingBlankCollection}
            />
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
                  <div
                    key={`${collection.user_id}-${collection.id}`}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
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
                      onClick={() => {
                        handleCollectionSelect(collection.id, true)
                        setIsBottomSheetOpen(false)
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: '40px',
                        bottom: 0,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      aria-label={`Select ${collection.title}`}
                    />

                    <div style={{ flex: 1, pointerEvents: 'none' }}>
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
                        color: selectedCollectionId === collection.id ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        by @{collection.username} • {collection.pin_count || 0} pins
                      </div>
                    </div>

                    {/* View Collection Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/collections/${collection.id}`)
                        setIsBottomSheetOpen(false)
                      }}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        minWidth: '32px',
                        height: '32px',
                        padding: '0 0.5rem',
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
                        flexShrink: 0,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '700'
                      }}
                      title={`View collection: ${collection.title}`}
                    >
                      →
                    </button>
                  </div>
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
        showPOIs={showPOIs}
        onTogglePOIs={setShowPOIs}
      />

      {/* Discover collection detail (click a Discover marker or sidebar card) */}
      {selectedDiscoverCollection && (
        <DiscoverCollectionDetailModal
          collection={{ ...selectedDiscoverCollection, pins: discoverDetailPins }}
          loading={loadingDiscoverDetailPins}
          onClose={() => setSelectedDiscoverCollection(null)}
          onFork={(pinId, pinTitle) => {
            setForkingPinId(pinId)
            setForkingPinTitle(pinTitle)
          }}
        />
      )}

      {/* Fork pin modal */}
      {forkingPinId && (
        <ForkPinModal
          pinTitle={forkingPinTitle}
          sourcePinId={forkingPinId}
          isOpen={!!forkingPinId}
          onClose={() => setForkingPinId(null)}
          onSuccess={() => {
            setForkingPinId(null)
            setSelectedDiscoverCollection(null)
          }}
        />
      )}
    </div>
  )
}

// Main export with Wrapper
export default function Map() {
  return (
    <Wrapper apiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
      <MapComponent />
    </Wrapper>
  )
}
