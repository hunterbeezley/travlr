'use client'
import { useEffect } from 'react'
import { Z_INDEX } from '@/lib/mapUiConstants'

interface MapLayer {
  name: string
  value: string
  description: string
  icon: string
}

interface MapLayersModalProps {
  isOpen: boolean
  onClose: () => void
  currentStyle: string
  onStyleSelect: (style: string) => void
  showPOIs: boolean
  onTogglePOIs: (show: boolean) => void
}

export default function MapLayersModal({
  isOpen,
  onClose,
  currentStyle,
  onStyleSelect,
  showPOIs,
  onTogglePOIs,
}: MapLayersModalProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const layers: MapLayer[] = [
    {
      name: 'Default',
      value: 'roadmap',
      description: 'Standard street map with labels',
      icon: '🗺️'
    },
    {
      name: 'Satellite',
      value: 'satellite',
      description: 'Aerial imagery without labels',
      icon: '🛰️'
    },
    {
      name: 'Terrain',
      value: 'terrain',
      description: 'Topographic map with elevation',
      icon: '⛰️'
    },
    {
      name: 'Dark Mode',
      value: 'dark',
      description: 'Dark theme for night viewing',
      icon: '🌙'
    }
  ]

  const handleSelect = (value: string) => {
    onStyleSelect(value)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: Z_INDEX.mapLayersModalBackdrop,
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: Z_INDEX.mapLayersModalContent,
          width: '90%',
          maxWidth: '400px',
          maxHeight: '90vh', // Limit height to viewport
          background: 'var(--background)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0 // Keep header fixed
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: 0
          }}>
            Map Layers
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              color: 'var(--foreground)',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--muted)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            ×
          </button>
        </div>

        {/* Options */}
        <div style={{
          padding: '1rem',
          overflowY: 'auto', // Make scrollable
          flex: 1 // Take remaining space
        }}>
          {layers.map((layer) => (
            <button
              key={layer.value}
              onClick={() => handleSelect(layer.value)}
              style={{
                width: '100%',
                padding: '1rem',
                marginBottom: '0.5rem',
                background: currentStyle === layer.value ? 'var(--accent)' : 'var(--muted)',
                border: '2px solid',
                borderColor: currentStyle === layer.value ? 'var(--accent)' : 'var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
              onMouseEnter={(e) => {
                if (currentStyle !== layer.value) {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentStyle !== layer.value) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {/* Icon */}
              <div style={{
                fontSize: '2rem',
                flexShrink: 0,
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: currentStyle === layer.value ? 'rgba(255,255,255,0.1)' : 'var(--background)',
                borderRadius: 'var(--radius)',
                border: '2px solid var(--border)'
              }}>
                {layer.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.25rem',
                  color: currentStyle === layer.value ? 'white' : 'var(--foreground)'
                }}>
                  {layer.name}
                  {currentStyle === layer.value && (
                    <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>✓</span>
                  )}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: currentStyle === layer.value ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)',
                  lineHeight: '1.4'
                }}>
                  {layer.description}
                </div>
              </div>
            </button>
          ))}

          {/* POI Toggle Section */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '2px solid var(--border)'
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 1rem 0',
              color: 'var(--foreground)'
            }}>
              Points of Interest
            </h4>

            <button
              onClick={() => onTogglePOIs(!showPOIs)}
              style={{
                width: '100%',
                padding: '1rem',
                background: showPOIs ? 'var(--accent)' : 'var(--muted)',
                border: '2px solid',
                borderColor: showPOIs ? 'var(--accent)' : 'var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
              onMouseEnter={(e) => {
                if (!showPOIs) {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!showPOIs) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {/* Icon */}
              <div style={{
                fontSize: '2rem',
                flexShrink: 0,
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: showPOIs ? 'rgba(255,255,255,0.1)' : 'var(--background)',
                borderRadius: 'var(--radius)',
                border: '2px solid var(--border)'
              }}>
                📍
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.25rem',
                  color: showPOIs ? 'white' : 'var(--foreground)'
                }}>
                  Show POIs
                  {showPOIs && (
                    <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>✓</span>
                  )}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: showPOIs ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)',
                  lineHeight: '1.4'
                }}>
                  {showPOIs ? 'Nearby places visible on map' : 'Discover restaurants, cafes & more'}
                </div>
              </div>
            </button>

            {showPOIs && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                lineHeight: '1.5'
              }}>
                <strong>💡 Tip:</strong> Nearby places appear when zoomed in. Search for something specific using the search bar instead of browsing categories here.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
