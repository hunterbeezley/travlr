'use client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Z_INDEX } from '@/lib/mapUiConstants'

export interface DiscoverCollectionDetailPin {
  id: string
  title: string
}

export interface DiscoverCollectionDetailData {
  id: string
  title: string
  description: string | null
  pins: DiscoverCollectionDetailPin[]
}

interface DiscoverCollectionDetailModalProps {
  collection: DiscoverCollectionDetailData
  loading?: boolean
  onClose: () => void
  onFork: (pinId: string, pinTitle: string) => void
}

// Discover collection detail modal - shown when a Discover marker or sidebar
// card is clicked. Pins are fetched on demand by the caller when opened, so
// `loading` covers the brief gap before they arrive.
export default function DiscoverCollectionDetailModal({
  collection,
  loading,
  onClose,
  onFork,
}: DiscoverCollectionDetailModalProps) {
  const router = useRouter()
  const { user } = useAuth()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX.discoverDetailModalBackdrop,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--background)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: '1.5rem',
          maxWidth: '480px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{collection.title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--muted-foreground)' }}
          >
            ✕
          </button>
        </div>
        {collection.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            {collection.description}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              Loading places...
            </div>
          ) : collection.pins.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              No places in this collection yet.
            </div>
          ) : collection.pins.map(pin => (
            <div
              key={pin.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}
            >
              <button
                onClick={() => router.push(`/pins/${pin.id}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationColor: 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecorationColor = 'var(--foreground)' }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = 'transparent' }}
              >
                {pin.title}
              </button>
              {user && (
                <button
                  onClick={() => onFork(pin.id, pin.title)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginLeft: '0.75rem',
                  }}
                >
                  + Add to collection
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
