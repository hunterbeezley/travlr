'use client'
import { ReactNode } from 'react'
import CollectionCard, { CollectionCardData, CollectionCardVariant } from './CollectionCard'

interface CollectionListProps<T extends CollectionCardData> {
  items: T[]
  loading: boolean
  loadingMessage?: string
  // Fully-styled node shown when `!loading && items.length === 0` - owned by
  // the caller since Mine/Discover/Friends empty states differ enough
  // (icon + hint line vs. a single line) that a shared wrapper style doesn't fit all three.
  emptyMessage: ReactNode
  variant: CollectionCardVariant
  selectedId: string | null
  onSelect: (item: T) => void
  onViewDetails?: (item: T) => void
  onDelete?: (item: T) => void
  // Header content slot (render prop not needed - a node is enough since
  // header text/count is computed by the caller from data it already has).
  header?: ReactNode
}

export default function CollectionList<T extends CollectionCardData>({
  items,
  loading,
  loadingMessage = 'Loading...',
  emptyMessage,
  variant,
  selectedId,
  onSelect,
  onViewDetails,
  onDelete,
  header,
}: CollectionListProps<T>) {
  // Only blank the list for the initial fetch (no items yet). A refetch
  // while items are already showing (e.g. Discover re-querying as the map
  // pans) should keep the existing items visible rather than flashing empty -
  // callers surface that "refreshing" state separately (e.g. a header spinner).
  const isInitialLoad = loading && items.length === 0

  return (
    <>
      {header}
      {isInitialLoad && (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
          {loadingMessage}
        </div>
      )}
      {!isInitialLoad && items.length === 0 && emptyMessage}
      {!isInitialLoad && items.map((item) => (
        <CollectionCard
          key={item.id}
          collection={item}
          variant={variant}
          selected={selectedId === item.id}
          onSelect={() => onSelect(item)}
          onViewDetails={onViewDetails ? () => onViewDetails(item) : undefined}
          onDelete={onDelete ? () => onDelete(item) : undefined}
        />
      ))}
    </>
  )
}
