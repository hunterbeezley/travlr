'use client'
import Link from 'next/link'
import CollectionActions from '../Collection/CollectionActions'

interface CollectionGridProps {
  collections: any[]
  currentUserId: string
}

export default function CollectionGrid({ collections, currentUserId }: CollectionGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem'
    }}>
      {collections.map((collection) => (
        <div
          key={collection.collection_id}
          style={{
            background: 'var(--card)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {/* Image Grid */}
          {collection.sample_images && collection.sample_images.length > 0 && (
            <Link href={`/collections/${collection.collection_id}`}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: collection.sample_images.length === 1
                  ? '1fr'
                  : collection.sample_images.length === 2
                    ? 'repeat(2, 1fr)'
                    : 'repeat(3, 1fr)',
                gap: '2px',
                background: 'var(--border)',
                aspectRatio: '16/9'
              }}>
                {collection.sample_images.slice(0, 3).map((url: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--muted)',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                ))}
              </div>
            </Link>
          )}

          {/* Content */}
          <div style={{ padding: '1rem' }}>
            {/* User Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <Link
                href={`/profile/${collection.user_id}`}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {collection.avatar_url ? (
                  <img
                    src={collection.avatar_url}
                    alt={collection.username}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '0.75rem' }}>👤</span>
                )}
              </Link>
              <Link
                href={`/profile/${collection.user_id}`}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--foreground)',
                  textDecoration: 'none'
                }}
              >
                {collection.username}
              </Link>
            </div>

            {/* Title & Description */}
            <Link
              href={`/collections/${collection.collection_id}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
                marginBottom: '0.75rem'
              }}
            >
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '700',
                marginBottom: '0.25rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)'
              }}>
                {collection.collection_name}
              </h3>
              {collection.collection_description && (
                <p style={{
                  color: 'var(--muted-foreground)',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {collection.collection_description}
                </p>
              )}
            </Link>

            {/* Stats */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.7rem',
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem'
            }}>
              <span>📍 {collection.pin_count}</span>
              {collection.distance_km !== undefined && (
                <span>🚶 {collection.distance_km.toFixed(1)} km</span>
              )}
              {collection.trending_score !== undefined && (
                <span>🔥 {collection.trending_score}</span>
              )}
            </div>

            {/* Actions */}
            {collection.stats && (
              <CollectionActions
                collectionId={collection.collection_id}
                collectionName={collection.collection_name}
                stats={collection.stats}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
