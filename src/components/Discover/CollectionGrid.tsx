'use client'
import Link from 'next/link'
import CollectionActions from '../Collection/CollectionActions'
import { User, MapPin, Heart, Bookmark, MessageCircle, TrendingUp, Star, Sparkles } from 'lucide-react'

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
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
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
              background: 'var(--card-elevated)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow)'
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
                        loading="lazy"
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
                      padding: '0.375rem 0.75rem',
                      background: 'rgba(249, 115, 22, 0.15)',
                      color: '#f97316',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <TrendingUp size={12} /> Trending
                    </span>
                  )}
                  {showPopularBadge && (
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#a855f7',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Star size={12} /> Popular
                    </span>
                  )}
                  {showNewBadge && (
                    <span style={{
                      padding: '0.375rem 0.75rem',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Sparkles size={12} /> New
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
                    <User size={14} style={{ color: 'var(--muted-foreground)' }} />
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
                  fontFamily: 'var(--font-display)',
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
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                marginBottom: '0.75rem',
                padding: '0.625rem 0.75rem',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={13} /> {collection.pin_count} {collection.pin_count === 1 ? 'pin' : 'pins'}
                </span>

                {collection.stats && (
                  <>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444' }}>
                      <Heart size={13} /> {collection.stats.likes_count || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6' }}>
                      <Bookmark size={13} /> {collection.stats.saves_count || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MessageCircle size={13} /> {collection.stats.comments_count || 0}
                    </span>
                  </>
                )}

                {collection.distance_km !== undefined && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={13} /> {collection.distance_km.toFixed(1)} km
                  </span>
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
