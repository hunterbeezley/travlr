'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Star } from 'lucide-react'
import { GooglePlaceResult } from '@/lib/types/itinerary'
import { getCategoryIconForGoogleTypes } from '@/lib/categoryIcons'

interface POISearchProps {
  onPlaceSelect: (place: GooglePlaceResult) => void
}

export default function POISearch({ onPlaceSelect }: POISearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<GooglePlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!window.google || !inputRef.current) return

    const autocomplete = new google.maps.places.AutocompleteService()
    const placesService = new google.maps.places.PlacesService(
      document.createElement('div')
    )

    const searchPlaces = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([])
        setShowResults(false)
        return
      }

      setLoading(true)
      setShowResults(true)

      try {
        autocomplete.getPlacePredictions(
          {
            input: searchQuery,
            types: ['establishment', 'tourist_attraction', 'lodging', 'restaurant']
          },
          (predictions, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              predictions
            ) {
              // Get details for each prediction
              const detailsPromises = predictions.slice(0, 5).map((prediction) => {
                return new Promise<GooglePlaceResult>((resolve, reject) => {
                  placesService.getDetails(
                    {
                      placeId: prediction.place_id,
                      fields: [
                        'name',
                        'formatted_address',
                        'geometry',
                        'place_id',
                        'types',
                        'rating',
                        'user_ratings_total',
                        'opening_hours',
                        'photos'
                      ]
                    },
                    (place, detailStatus) => {
                      if (
                        detailStatus === google.maps.places.PlacesServiceStatus.OK &&
                        place &&
                        place.geometry?.location
                      ) {
                        // Convert Google PlaceResult to our GooglePlaceResult type
                        const result: GooglePlaceResult = {
                          place_id: place.place_id || prediction.place_id,
                          name: place.name || '',
                          formatted_address: place.formatted_address || '',
                          geometry: {
                            location: {
                              lat: place.geometry.location.lat(),
                              lng: place.geometry.location.lng()
                            }
                          },
                          types: place.types || [],
                          rating: place.rating,
                          user_ratings_total: place.user_ratings_total
                        }
                        resolve(result)
                      } else {
                        reject(new Error('Place details not found'))
                      }
                    }
                  )
                })
              })

              Promise.allSettled(detailsPromises).then((results) => {
                const places = results
                  .filter((result): result is PromiseFulfilledResult<GooglePlaceResult> =>
                    result.status === 'fulfilled'
                  )
                  .map(result => result.value)
                setResults(places)
                setLoading(false)
              })
            } else {
              setResults([])
              setLoading(false)
            }
          }
        )
      } catch (error) {
        console.error('Error searching places:', error)
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchPlaces, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPlace = (place: GooglePlaceResult) => {
    onPlaceSelect(place)
    setSearchQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search for restaurants, attractions, hotels..."
          style={{
            width: '100%',
            padding: '0.875rem 3rem 0.875rem 1rem',
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            color: 'var(--foreground)',
            outline: 'none'
          }}
        />
        {/* Search Icon */}
        <div
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            color: 'var(--muted-foreground)'
          }}
        >
          {loading ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search size={18} />
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            right: 0,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 100
          }}
        >
          {results.map((place) => {
            const PlaceIcon = getCategoryIconForGoogleTypes(place.types)
            return (
            <div
              key={place.place_id}
              onClick={() => handleSelectPlace(place)}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--muted)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start'
                }}
              >
                {/* Category Icon */}
                <div style={{ flexShrink: 0, paddingTop: '0.125rem' }}>
                  <PlaceIcon size={22} color="var(--accent)" />
                </div>

                {/* Place Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--foreground)',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {place.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--muted-foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {place.formatted_address}
                  </div>
                  {place.rating && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        color: 'var(--accent)',
                        marginTop: '0.25rem'
                      }}
                    >
                      <Star size={12} fill="var(--accent)" color="var(--accent)" />
                      {place.rating} ({place.user_ratings_total} reviews)
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* No results message */}
      {showResults && !loading && searchQuery.length >= 2 && results.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: 0,
            right: 0,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--muted-foreground)',
            fontSize: '0.875rem',
            zIndex: 100
          }}
        >
          No places found for "{searchQuery}"
        </div>
      )}
    </div>
  )
}
