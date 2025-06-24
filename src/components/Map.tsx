'use client'
import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

interface MapProps {
  onMapClick?: (lng: number, lat: number) => void
}

export default function Map({ onMapClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [lng, setLng] = useState(-70.9)
  const [lat, setLat] = useState(42.35)
  const [zoom, setZoom] = useState(9)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12')

  const mapStyles = [
    { name: 'Streets', value: 'mapbox://styles/mapbox/streets-v12', icon: '🏙️' },
    { name: 'Satellite', value: 'mapbox://styles/mapbox/satellite-v9', icon: '🛰️' },
    { name: 'Outdoors', value: 'mapbox://styles/mapbox/outdoors-v12', icon: '🏔️' },
    { name: 'Dark', value: 'mapbox://styles/mapbox/dark-v11', icon: '🌙' },
  ]

  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [lng, lat],
      zoom: zoom,
      pitch: 0,
      bearing: 0,
      antialias: true
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

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lng, e.lngLat.lat)
        
        // Add a temporary marker with animation
        const marker = new mapboxgl.Marker({
          color: '#3b82f6',
          scale: 0.8
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map.current!)
        
        // Remove marker after 2 seconds with fade out
        setTimeout(() => {
          marker.remove()
        }, 2000)
      })
    }

    return () => map.current?.remove()
  }, [lng, lat, zoom, onMapClick])

  // Update map style when changed
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(mapStyle)
    }
  }, [mapStyle])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
        💡 Click anywhere to add a pin
      </div>
    </div>
  )
}