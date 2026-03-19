'use client'

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
  poiCategories: string[]
  onCategoriesChange: (categories: string[]) => void
}

export default function MapLayersModal({
  isOpen,
  onClose,
  currentStyle,
  onStyleSelect,
  showPOIs,
  onTogglePOIs,
  poiCategories,
  onCategoriesChange
}: MapLayersModalProps) {
  if (!isOpen) return null

  const availableCategories = [
    { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
    { value: 'cafe', label: 'Cafes', icon: '☕' },
    { value: 'bar', label: 'Bars', icon: '🍺' },
    { value: 'museum', label: 'Museums', icon: '🏛️' },
    { value: 'park', label: 'Parks', icon: '🌳' },
    { value: 'tourist_attraction', label: 'Attractions', icon: '🎭' },
    { value: 'store', label: 'Stores', icon: '🛍️' }
  ]

  const toggleCategory = (category: string) => {
    if (poiCategories.includes(category)) {
      onCategoriesChange(poiCategories.filter(c => c !== category))
    } else {
      onCategoriesChange([...poiCategories, category])
    }
  }

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
          zIndex: 999,
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
          zIndex: 1000,
          width: '90%',
          maxWidth: '400px',
          background: 'var(--background)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
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
        <div style={{ padding: '1rem' }}>
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
              <>
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  lineHeight: '1.5'
                }}>
                  <strong>💡 Tip:</strong> POIs appear when zoomed in (level 14+). Click any POI to add it to your collection.
                </div>

                {/* Category Filters */}
                <div style={{ marginTop: '1rem' }}>
                  <h5 style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    margin: '0 0 0.75rem 0',
                    color: 'var(--muted-foreground)'
                  }}>
                    Filter Categories
                  </h5>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem'
                  }}>
                    {availableCategories.map((category) => {
                      const isSelected = poiCategories.includes(category.value)
                      return (
                        <button
                          key={category.value}
                          onClick={() => toggleCategory(category.value)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: isSelected ? 'var(--accent)' : 'var(--background)',
                            border: '2px solid',
                            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                            borderRadius: 'var(--radius)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: isSelected ? 'white' : 'var(--foreground)',
                            transition: 'var(--transition)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--accent)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--border)'
                            }
                          }}
                        >
                          <span>{category.icon}</span>
                          <span>{category.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Select/Deselect All */}
                  <div style={{
                    marginTop: '0.75rem',
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    <button
                      onClick={() => onCategoriesChange(availableCategories.map(c => c.value))}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--foreground)',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--muted)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--background)'
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => onCategoriesChange([])}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--foreground)',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--muted)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--background)'
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
