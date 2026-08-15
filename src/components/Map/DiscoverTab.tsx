'use client'
import CollectionList from './CollectionList'
import { CollectionCardData } from './CollectionCard'

interface DiscoverTabProps<T extends CollectionCardData> {
  collections: T[]
  loading: boolean
  selectedId: string | null
  onSelect: (collection: T) => void
}

export default function DiscoverTab<T extends CollectionCardData>({
  collections,
  loading,
  selectedId,
  onSelect,
}: DiscoverTabProps<T>) {
  return (
    <CollectionList
      items={collections}
      loading={loading}
      variant="discover"
      selectedId={selectedId}
      onSelect={onSelect}
      header={
        <div style={{
          fontSize: '0.875rem',
          fontWeight: '700',
          marginBottom: '1rem',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--muted-foreground)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          Trending near you
          {loading && (
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: '2px solid var(--muted-foreground)',
              borderTopColor: 'transparent',
              animation: 'spin 0.6s linear infinite'
            }} />
          )}
        </div>
      }
      emptyMessage={
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          No public collections near this area yet - try panning the map.
        </div>
      }
    />
  )
}
