'use client'
import CollectionList from './CollectionList'
import { CollectionCardData } from './CollectionCard'

interface MineTabProps<T extends CollectionCardData> {
  collections: T[]
  loading: boolean
  allPinsCount: number
  selectedCollectionId: string | null
  onSelectAllPins: () => void
  onSelectCollection: (collection: T) => void
  onViewDetails: (collection: T) => void
  onDelete: (collection: T) => void
  creatingBlankCollection: boolean
  onStartCreating: () => void
  newBlankCollectionTitle: string
  onNewBlankCollectionTitleChange: (value: string) => void
  onCreateBlankCollection: () => void
  onCancelCreating: () => void
  savingBlankCollection: boolean
}

export default function MineTab<T extends CollectionCardData>({
  collections,
  loading,
  allPinsCount,
  selectedCollectionId,
  onSelectAllPins,
  onSelectCollection,
  onViewDetails,
  onDelete,
  creatingBlankCollection,
  onStartCreating,
  newBlankCollectionTitle,
  onNewBlankCollectionTitleChange,
  onCreateBlankCollection,
  onCancelCreating,
  savingBlankCollection,
}: MineTabProps<T>) {
  return (
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
          {allPinsCount}
        </span>
      </div>

      {/* Create blank collection - for when you know you're
          traveling but don't know what to add yet */}
      {!creatingBlankCollection ? (
        <button
          onClick={onStartCreating}
          style={{
            width: '100%',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            background: 'var(--muted)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--foreground)',
          }}
        >
          + New Collection
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            autoFocus
            value={newBlankCollectionTitle}
            onChange={(e) => onNewBlankCollectionTitleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCreateBlankCollection() }}
            placeholder="Collection name"
            className="form-input"
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.65rem' }}
          />
          <button
            onClick={onCreateBlankCollection}
            disabled={savingBlankCollection || !newBlankCollectionTitle.trim()}
            style={{
              padding: '0.65rem 0.9rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              cursor: savingBlankCollection || !newBlankCollectionTitle.trim() ? 'not-allowed' : 'pointer',
              opacity: savingBlankCollection || !newBlankCollectionTitle.trim() ? 0.6 : 1,
            }}
          >
            {savingBlankCollection ? '...' : 'Create'}
          </button>
          <button
            onClick={onCancelCreating}
            style={{
              padding: '0.65rem 0.75rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.7rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Collection List */}
      <div style={{
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--accent) var(--muted)'
      }}>
        {/* All Pins Button */}
        <button
          onClick={onSelectAllPins}
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
            fontFamily: 'var(--font-mono)'
          }}>
            {allPinsCount}
          </span>
        </button>

        <CollectionList
          items={collections}
          loading={loading}
          loadingMessage="Loading collections..."
          variant="mine"
          selectedId={selectedCollectionId}
          onSelect={onSelectCollection}
          onViewDetails={onViewDetails}
          onDelete={onDelete}
          emptyMessage={
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
          }
        />
      </div>
    </>
  )
}
