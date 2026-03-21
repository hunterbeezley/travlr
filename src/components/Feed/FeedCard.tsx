'use client'
import Link from 'next/link'
import CollectionActions from '../Collection/CollectionActions'
import { User, MapPin, Heart, Bookmark } from 'lucide-react'

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
      overflow: 'hidden'
    }}>
      {/* Header: User Info */}
      <div style={{
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <Link
          href={`/profile/${user_id}`}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={username}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <User size={20} style={{ color: 'var(--muted-foreground)' }} />
          )}
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <Link
              href={`/profile/${user_id}`}
              style={{
                fontWeight: '600',
                color: 'var(--foreground)',
                textDecoration: 'none',
                fontSize: '0.875rem'
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
          color: 'var(--muted-foreground)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={14} /> {target_data.pin_count} pins
          </span>
          {target_data.stats && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Heart size={14} /> {target_data.stats.likes_count || 0}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Bookmark size={14} /> {target_data.stats.saves_count || 0}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {target_data.stats && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'var(--surface-subtle)'
        }}>
          <CollectionActions
            collectionId={target_data.id}
            collectionName={target_data.title}
            stats={target_data.stats}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </div>
  )
}
