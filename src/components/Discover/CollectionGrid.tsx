'use client'
import Link from 'next/link'
import CollectionActions from '../Collection/CollectionActions'

interface CollectionGridProps {
  collections: any[]
  currentUserId: string
}

// Helper to determine if collection is new (created in last 7 days)
const isNew = (createdAt: string) => {
  const created = new Date(createdAt)
  const now = new Date()
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff <= 7
}

// Helper to determine if collection is trending (high trending_score or recent engagement)
const isTrending = (collection: any) => {
  return collection.trending_score && collection.trending_score > 50
}

// Helper to determine if collection is popular (many likes/saves)
const isPopular = (collection: any) => {
  const totalEngagement = (collection.stats?.likes_count || 0) + (collection.stats?.saves_count || 0)
  return totalEngagement >= 20
}

export default function CollectionGrid({ collections, currentUserId }: CollectionGridProps) {
  return (
    <div className="collection-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem'
    }}>
      {collections.map((collection) => {
        const showTrendingBadge = isTrending(collection)
        const showPopularBadge = isPopular(collection)
        const showNewBadge = isNew(collection.created_at)

        return (
          <div
            key={collection.collection_id}
            style={{
              background: 'var(--card)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              transition: 'var(--transition)',
              position: 'relative'
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
                  aspectRatio: '16/9',
                  position: 'relative'
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
              {/* Badges */}
              {(showTrendingBadge || showPopularBadge || showNewBadge) && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  {showTrendingBadge && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(249, 115, 22, 0.1)',
                      color: '#f97316',
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.625rem',
                      fontWeight: '700',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      🔥 Trending
                    </span>
                  )}
                  {showPopularBadge && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(168, 85, 247, 0.1)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.625rem',
                      fontWeight: '700',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      ⭐ Popular
                    </span>
                  )}
                  {showNewBadge && (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.625rem',
                      fontWeight: '700',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      🆕 New
                    </span>
                  )}
                </div>
              )}

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

              {/* Enhanced Stats Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                fontSize: '0.7rem',
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.75rem',
                padding: '0.5rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  📍 {collection.pin_count} {collection.pin_count === 1 ? 'pin' : 'pins'}
                </span>

                {collection.stats && (
                  <>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}>
                      ❤️ {collection.stats.likes_count || 0}
                    </span>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6' }}>
                      💾 {collection.stats.saves_count || 0}
                    </span>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      💬 {collection.stats.comments_count || 0}
                    </span>
                  </>
                )}

                {collection.distance_km !== undefined && (
                  <>
                    <span style={{ color: 'var(--border)' }}>•</span>
                    <span>🚶 {collection.distance_km.toFixed(1)} km</span>
                  </>
                )}
              </div>

              {/* Actions */}
              {collection.stats && (
                <CollectionActions
                  collectionId={collection.collection_id}
                  collectionName={collection.collection_name}
                  stats={collection.stats}
                  currentUserId={currentUserId}
                  showShare={false}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
