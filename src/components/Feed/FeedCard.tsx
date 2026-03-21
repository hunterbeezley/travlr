'use client'
import Link from 'next/link'
import CollectionActions from '../Collection/CollectionActions'
import UserAvatar from '../UserAvatar'
import { User, MapPin, Heart, Bookmark, MessageCircle, TrendingUp, Sparkles, Plus } from 'lucide-react'

interface FeedCardProps {
  activity: any
  currentUserId: string
}

export default function FeedCard({ activity, currentUserId }: FeedCardProps) {
  const {
    user_id,
    username,
    avatar_url,
    activity_type,
    target_data,
    created_at
  } = activity

  const getActivityText = () => {
    switch (activity_type) {
      case 'collection_created':
        return 'created a collection'
      case 'collection_updated':
        return 'updated a collection'
      case 'pin_added':
        return 'added pins to'
      case 'collection_liked':
        return 'liked'
      case 'collection_saved':
        return 'saved'
      default:
        return 'activity'
    }
  }

  const getActivityIcon = () => {
    switch (activity_type) {
      case 'collection_created':
        return <Plus size={14} style={{ color: 'var(--accent)' }} />
      case 'collection_updated':
        return <Sparkles size={14} style={{ color: 'var(--accent)' }} />
      case 'pin_added':
        return <MapPin size={14} style={{ color: 'var(--accent)' }} />
      case 'collection_liked':
        return <Heart size={14} style={{ color: 'var(--accent)' }} />
      case 'collection_saved':
        return <Bookmark size={14} style={{ color: 'var(--accent)' }} />
      default:
        return null
    }
  }

  const getActivityBadge = () => {
    if (target_data.stats) {
      const engagementScore = (target_data.stats.likes_count || 0) +
                            (target_data.stats.saves_count || 0) +
                            (target_data.stats.comments_count || 0)
      if (engagementScore > 20) {
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.625rem',
            fontWeight: '700',
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <TrendingUp size={10} />
            Popular
          </div>
        )
      }
    }
    return null
  }

  const getTimeAgo = () => {
    const now = new Date()
    const then = new Date(created_at)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return `${Math.floor(seconds / 604800)}w ago`
  }

  if (!target_data) return null

  return (
    <div style={{
      background: 'var(--card-elevated)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      border: '1px solid transparent'
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
      {/* Header: User Info */}
      <div style={{
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <Link href={`/profile/${user_id}`}>
          <UserAvatar
            profileImageUrl={avatar_url}
            email={username || ''}
            size="medium"
          />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            flexWrap: 'wrap'
          }}>
            {getActivityIcon()}
            <Link
              href={`/profile/${user_id}`}
              style={{
                fontWeight: '700',
                color: 'var(--foreground)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--foreground)'
              }}
            >
              {username}
            </Link>
            <span style={{
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem'
            }}>
              {getActivityText()}
            </span>
            {getActivityBadge()}
          </div>
          <div style={{
            color: 'var(--muted-foreground)',
            fontSize: '0.75rem',
            marginTop: '0.125rem'
          }}>
            {getTimeAgo()}
          </div>
        </div>
      </div>

      {/* Collection Content */}
      <div style={{ padding: '1rem' }}>
        {/* Collection Name - Clickable */}
        <Link
          href={`/collections/${target_data.id}`}
          style={{
            display: 'block',
            textDecoration: 'none',
            marginBottom: '0.75rem'
          }}
        >
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent)',
            transition: 'var(--transition)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          >
            {target_data.title}
          </h3>
        </Link>

        {target_data.description && (
          <p style={{
            color: 'var(--muted-foreground)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
            lineHeight: '1.5'
          }}>
            {target_data.description.length > 150
              ? target_data.description.substring(0, 150) + '...'
              : target_data.description}
          </p>
        )}

        {/* Image Grid - Clickable */}
        {target_data.sample_images && target_data.sample_images.length > 0 && (
          <Link
            href={`/collections/${target_data.id}`}
            style={{
              display: 'block',
              textDecoration: 'none',
              marginBottom: '1rem'
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: target_data.sample_images.length === 1
                ? '1fr'
                : 'repeat(3, 1fr)',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              {target_data.sample_images.slice(0, 3).map((url: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    aspectRatio: '1',
                    background: 'var(--muted)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
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

        {/* Collection Stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'var(--muted-foreground)',
          padding: '0.75rem',
          background: 'var(--surface-subtle)',
          borderRadius: 'var(--radius)',
          marginTop: '0.5rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <MapPin size={14} />
            <strong style={{ color: 'var(--foreground)' }}>{target_data.pin_count}</strong> pins
          </span>
          {target_data.stats && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Heart size={14} />
                <strong style={{ color: 'var(--foreground)' }}>{target_data.stats.likes_count || 0}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Bookmark size={14} />
                <strong style={{ color: 'var(--foreground)' }}>{target_data.stats.saves_count || 0}</strong>
              </span>
              {target_data.stats.comments_count > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MessageCircle size={14} />
                  <strong style={{ color: 'var(--foreground)' }}>{target_data.stats.comments_count}</strong>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {target_data.stats && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'var(--surface-subtle)',
          borderTop: '1px solid var(--border)'
        }}>
          <CollectionActions
            collectionId={target_data.id}
            collectionName={target_data.title}
            stats={target_data.stats}
            currentUserId={currentUserId}
            showShare={false}
          />
        </div>
      )}
    </div>
  )
}
