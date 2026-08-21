'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CollectionActions from '../Collection/CollectionActions'
import { Heart, MapPin } from 'lucide-react'

interface BentoFeedCardProps {
  activity: any
  currentUserId: string
}

export default function BentoFeedCard({ activity, currentUserId }: BentoFeedCardProps) {
  const router = useRouter()
  const { target_data } = activity

  if (!target_data) return null

  const collection = target_data
  const pins = collection.pins || []
  const firstImage = collection.sample_images?.[0]

  // Build Google Static Maps URL from pins' lat/lng
  const buildMapUrl = () => {
    if (pins.length === 0) return null

    const centerLat = pins.reduce((sum: number, pin: any) => sum + pin.latitude, 0) / pins.length
    const centerLng = pins.reduce((sum: number, pin: any) => sum + pin.longitude, 0) / pins.length

    const markers = pins
      .slice(0, 10)
      .map((pin: any) => `${pin.latitude},${pin.longitude}`)
      .join('|')

    // Smaller size for thumbnail
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=12&size=400x400&markers=color:red%7C${markers}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&scale=1&style=feature:poi|visibility:off&style=feature:transit|visibility:off`
    return mapUrl
  }

  const mapUrl = buildMapUrl()

  return (
    <div
      onClick={() => router.push(`/collections/${collection.id}`)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '2px',
        background: 'var(--line)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid transparent',
        boxShadow: 'var(--shadow)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow)'
      }}
    >
      {/* Photo Tile (top-left, spans 2 rows) */}
      <div
        style={{
          gridRow: 'span 2',
          gridColumn: '1 / 2',
          position: 'relative',
          background: 'var(--surface)',
          overflow: 'hidden',
          minHeight: '154px'
        }}
      >
        {firstImage ? (
          <>
            <img
              src={firstImage}
              alt={collection.title}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            {/* Bottom scrim for depth, matching the full-bleed hero
                treatment on the collection detail page */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 45%)',
                pointerEvents: 'none'
              }}
            />
          </>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--color-terracotta-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MapPin size={32} color="var(--accent)" strokeWidth={1.5} />
          </div>
        )}
        {/* Corner brackets */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '30px',
            height: '30px',
            borderTop: '2px solid var(--color-terracotta-muted)',
            borderLeft: '2px solid var(--color-terracotta-muted)',
            zIndex: 10
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '30px',
            height: '30px',
            borderBottom: '2px solid var(--color-terracotta-muted)',
            borderRight: '2px solid var(--color-terracotta-muted)',
            zIndex: 10
          }}
        />
      </div>

      {/* Map Tile (top-right) */}
      <div
        style={{
          gridRow: '1 / 2',
          gridColumn: '2 / 3',
          background: 'var(--surface)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '76px'
        }}
      >
        {mapUrl ? (
          <img
            src={mapUrl}
            alt={`Map of ${collection.title}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)'
            }}
          >
            No map
          </div>
        )}
      </div>

      {/* Title/Info & Stats Tile (bottom-right) */}
      <div
        style={{
          gridRow: '2 / 3',
          gridColumn: '2 / 3',
          background: 'var(--surface)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
              marginBottom: '4px',
              fontFamily: 'var(--font-body)'
            }}
          >
            {activity.username || 'Anonymous'}
          </div>
          <h3
            style={{
              fontSize: '0.9375rem',
              fontWeight: '600',
              color: 'var(--foreground)',
              margin: 0,
              fontFamily: 'var(--font-display)',
              lineHeight: '1.25',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {collection.title}
          </h3>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            fontVariantNumeric: 'tabular-nums',
            gap: '10px'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Heart size={12} color="var(--accent)" fill="var(--accent)" />
            <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {collection.stats?.likes_count || 0}
            </strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} color="var(--foreground)" />
            <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>
              {collection.pin_count}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}
