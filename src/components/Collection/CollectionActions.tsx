'use client'
import { logger } from '@/lib/logger'
import { useState } from 'react'
import { Heart, Bookmark, MessageCircle, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ShareCollectionModal from '../Share/ShareCollectionModal'

interface CollectionActionsProps {
  collectionId: string
  collectionName?: string
  stats: {
    likes_count: number
    saves_count: number
    comments_count: number
    shares_count?: number
    user_liked: boolean
    user_saved: boolean
  }
  currentUserId: string
  showShare?: boolean
}

export default function CollectionActions({
  collectionId,
  collectionName = 'Collection',
  stats: initialStats,
  currentUserId,
  showShare = true
}: CollectionActionsProps) {
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const handleLike = async () => {
    if (loading) return
    setLoading(true)

    try {
      const rpcFunc = stats.user_liked ? 'unlike_collection' : 'like_collection'
      const { error } = await supabase.rpc(rpcFunc, {
        p_collection_id: collectionId
      })

      if (error) {
        logger.error('Error toggling like:', error)
        throw error
      }

      setStats(prev => ({
        ...prev,
        likes_count: prev.user_liked ? prev.likes_count - 1 : prev.likes_count + 1,
        user_liked: !prev.user_liked
      }))
    } catch (error) {
      logger.error('Error toggling like:', error)
      // Optionally show user-friendly error message
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (loading) return
    setLoading(true)

    try {
      const rpcFunc = stats.user_saved ? 'unsave_collection' : 'save_collection'
      const { error } = await supabase.rpc(rpcFunc, {
        p_collection_id: collectionId,
        ...(rpcFunc === 'save_collection' && { p_folder: null })
      })

      if (error) {
        logger.error('Error toggling save:', error)
        throw error
      }

      setStats(prev => ({
        ...prev,
        saves_count: prev.user_saved ? prev.saves_count - 1 : prev.saves_count + 1,
        user_saved: !prev.user_saved
      }))
    } catch (error) {
      logger.error('Error toggling save:', error)
      // Optionally show user-friendly error message
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      {/* Like Button */}
      <button
        onClick={handleLike}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: stats.user_liked ? 'var(--accent)' : 'var(--muted)',
          border: '1px solid',
          borderColor: stats.user_liked ? 'var(--accent)' : 'var(--border)',
          borderRadius: 'var(--radius)',
          cursor: loading ? 'not-allowed' : 'pointer',
          color: stats.user_liked ? 'white' : 'var(--foreground)',
          fontSize: '0.875rem',
          fontWeight: '600',
          fontFamily: 'var(--font-body)',
          transition: 'var(--transition)',
          opacity: loading ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading && !stats.user_liked) {
            e.currentTarget.style.borderColor = 'var(--accent)'
          }
        }}
        onMouseLeave={(e) => {
          if (!stats.user_liked) {
            e.currentTarget.style.borderColor = 'var(--border)'
          }
        }}
      >
        <Heart size={16} fill={stats.user_liked ? 'currentColor' : 'none'} />
        <span>{stats.likes_count}</span>
      </button>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: stats.user_saved ? 'var(--accent)' : 'var(--muted)',
          border: '1px solid',
          borderColor: stats.user_saved ? 'var(--accent)' : 'var(--border)',
          borderRadius: 'var(--radius)',
          cursor: loading ? 'not-allowed' : 'pointer',
          color: stats.user_saved ? 'white' : 'var(--foreground)',
          fontSize: '0.875rem',
          fontWeight: '600',
          fontFamily: 'var(--font-body)',
          transition: 'var(--transition)',
          opacity: loading ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading && !stats.user_saved) {
            e.currentTarget.style.borderColor = 'var(--accent)'
          }
        }}
        onMouseLeave={(e) => {
          if (!stats.user_saved) {
            e.currentTarget.style.borderColor = 'var(--border)'
          }
        }}
      >
        <Bookmark size={16} fill={stats.user_saved ? 'currentColor' : 'none'} />
        <span>{stats.saves_count}</span>
      </button>

      {/* Comment Count (not clickable, just display) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        color: 'var(--muted-foreground)',
        fontSize: '0.875rem',
        fontWeight: '600',
        fontFamily: 'var(--font-body)'
      }}>
        <MessageCircle size={16} />
        <span>{stats.comments_count}</span>
      </div>

      {/* Share Button */}
      {showShare && (
        <button
          onClick={() => setShowShareModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'var(--muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            color: 'var(--foreground)',
            fontSize: '0.875rem',
            fontWeight: '600',
            fontFamily: 'var(--font-body)',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <Share2 size={16} />
          {stats.shares_count !== undefined && stats.shares_count > 0 && (
            <span>{stats.shares_count}</span>
          )}
        </button>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareCollectionModal
          collectionId={collectionId}
          collectionName={collectionName}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
