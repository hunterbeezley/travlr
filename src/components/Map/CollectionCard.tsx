'use client'
import { Folder, Info, X } from 'lucide-react'

export type CollectionCardVariant = 'mine' | 'discover' | 'friends'

// Minimal shape a collection needs to render as a card. `mine`-variant fields
// (thumbnail/badges) are optional so `discover`/`friends` items (which don't
// fetch them yet) still satisfy this type.
export interface CollectionCardData {
  id: string
  title: string
  pin_count?: number
  first_pin_image?: string | null
  is_public?: boolean
  net_score?: number
  color?: string
}

interface CollectionCardProps {
  collection: CollectionCardData
  variant: CollectionCardVariant
  selected: boolean
  onSelect: () => void
  onViewDetails?: () => void
  onDelete?: () => void
}

export default function CollectionCard({
  collection,
  variant,
  selected,
  onSelect,
  onViewDetails,
  onDelete,
}: CollectionCardProps) {
  const showActions = variant === 'mine'

  return (
    <div
      style={{
        width: '100%',
        padding: '0.75rem',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius)',
        backgroundColor: selected ? 'var(--accent)' : 'transparent',
        color: selected ? 'white' : 'var(--foreground)',
        transition: 'var(--transition)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        position: 'relative'
      }}
    >
      {/* Clickable area for selection. When action buttons are present
          (mine), this sits underneath them so their clicks
          (stopPropagation'd) take priority; otherwise it spans the card. */}
      <button
        onClick={onSelect}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: showActions ? '68px' : 0,
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
          loading="lazy"
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
          borderRadius: 'var(--radius)',
          border: '2px solid var(--border)',
          backgroundColor: collection.color ? `${collection.color}22` : 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted-foreground)',
          pointerEvents: 'none'
        }}>
          <Folder size={20} />
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
          gap: '0.5rem'
        }}>
          <span>{collection.pin_count || 0} pins</span>
          {collection.is_public && (
            <span style={{
              backgroundColor: selected ? 'rgba(255,255,255,0.2)' : 'rgba(34,197,94,0.1)',
              color: selected ? 'white' : '#22c55e',
              padding: '0.125rem 0.375rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.625rem'
            }}>
              Public
            </span>
          )}
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

      {/* Details Button */}
      {showActions && (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onViewDetails?.()
        }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '28px',
          height: '28px',
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
          e.currentTarget.style.backgroundColor = 'var(--color-terracotta-subtle)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--foreground)'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        title={`View details for ${collection.title}`}
      >
        <Info size={14} />
      </button>
      )}

      {/* Delete Button */}
      {showActions && (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete?.()
        }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '28px',
          height: '28px',
          padding: 0,
          border: '1px solid var(--border)',
          backgroundColor: 'transparent',
          color: 'var(--foreground)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition)',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--destructive)'
          e.currentTarget.style.color = 'var(--destructive)'
          e.currentTarget.style.backgroundColor = 'var(--color-red-subtle)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--foreground)'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
        title={`Delete ${collection.title}`}
      >
        <X size={16} />
      </button>
      )}
    </div>
  )
}
