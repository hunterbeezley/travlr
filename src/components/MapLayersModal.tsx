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
}

export default function MapLayersModal({
  isOpen,
  onClose,
  currentStyle,
  onStyleSelect
}: MapLayersModalProps) {
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
        </div>
      </div>
    </>
  )
}
