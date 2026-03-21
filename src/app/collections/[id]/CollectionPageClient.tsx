'use client'
import { logger } from '@/lib/logger'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Toast from '@/components/Toast'
import ReportCommentModal from '@/components/ReportCommentModal'
import Navbar from '@/components/Navbar'
import CollectionActions from '@/components/Collection/CollectionActions'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Profile {
  username: string | null
  full_name: string | null
  profile_image: string | null
}

interface Collection {
  id: string
  title: string
  description: string | null
  is_public: boolean
  color: string
  created_at: string
  user_id: string
  profiles: Profile
}

interface PinImage {
  image_url: string
  upload_order: number
}

interface Pin {
  id: string
  title: string
  description: string | null
  latitude: number
  longitude: number
  category: string | null
  created_at: string
  pin_images: PinImage[]
}

interface Comment {
  id: string
  collection_id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
  username?: string
  profile_image?: string | null
  full_name?: string | null
}

interface CollectionPageClientProps {
  collection: Collection
  pins: Pin[]
  pinCount: number
  isOwner: boolean
  initialVoteCounts: {
    upvotes: number
    downvotes: number
    net_score: number
  }
  initialUserVote: 'up' | 'down' | null
}

const categoryEmojis: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  attraction: '🎯',
  nature: '🌲',
  shopping: '🛍️',
  hotel: '🏨',
  transport: '🚌',
  activity: '🎪',
  other: '📍'
}

// Helper function to render comment text with styled @ mentions
function renderCommentWithMentions(text: string) {
  // Regex to match @username (letters, numbers, underscores)
  const mentionRegex = /@([a-zA-Z0-9_]+)/g
  const parts: (string | React.ReactElement)[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // Add the styled mention
    parts.push(
      <span
        key={`mention-${match.index}`}
        style={{
          color: 'var(--accent)',
          fontWeight: '600',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation()
          // Could add navigation to user profile in the future
        }}
      >
        {match[0]}
      </span>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last mention
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export default function CollectionPageClient({
  collection,
  pins,
  pinCount,
  isOwner,
  initialVoteCounts,
  initialUserVote
}: CollectionPageClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showShareToast, setShowShareToast] = useState(false)

  // Avatar state
  const [avatarLoadError, setAvatarLoadError] = useState(false)

  // Edit collection state
  const [isEditingCollection, setIsEditingCollection] = useState(false)
  const [editForm, setEditForm] = useState({
    title: collection.title,
    description: collection.description || '',
    is_public: collection.is_public,
    color: collection.color
  })
  const [savingCollection, setSavingCollection] = useState(false)

  // Voting state (deprecated - keeping for backwards compat)
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote)
  const [voteCounts, setVoteCounts] = useState(initialVoteCounts)
  const [votingInProgress, setVotingInProgress] = useState(false)

  // Collection stats for CollectionActions
  const [collectionStats, setCollectionStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null)
  const [commentsPage, setCommentsPage] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const COMMENTS_PER_PAGE = 20

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: collection.title,
          text: collection.description || `Check out ${collection.title} on Travlr`,
          url: url
        })
      } catch {
        logger.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 3000)
    }
  }

  const handleSaveCollection = async () => {
    if (!editForm.title.trim()) {
      alert('Collection title is required')
      return
    }

    setSavingCollection(true)
    try {
      const { error } = await supabase
        .from('collections')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          is_public: editForm.is_public,
          color: editForm.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', collection.id)

      if (error) throw error

      // Update local collection object
      collection.title = editForm.title.trim()
      collection.description = editForm.description.trim() || null
      collection.is_public = editForm.is_public
      collection.color = editForm.color

      setIsEditingCollection(false)
      router.refresh()
    } catch (error) {
      logger.error('Error updating collection:', error)
      alert('Failed to update collection')
    } finally {
      setSavingCollection(false)
    }
  }

  // Debug logging
  logger.log('Collection object:', collection)
  logger.log('Collection profiles:', collection.profiles)

  const displayName = (collection.profiles?.full_name ||
                      collection.profiles?.username ||
                      'Anonymous').toString().trim() || 'Anonymous'

  logger.log('Display name:', displayName)

  // Load initial comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        const { data: commentsData, error: commentsError } = await supabase
          .from('collection_comments')
          .select(`
            *,
            users:user_id (
              username,
              full_name,
              profile_image
            )
          `)
          .eq('collection_id', collection.id)
          .order('created_at', { ascending: true })
          .range(0, COMMENTS_PER_PAGE - 1)

        if (commentsError) throw commentsError

        // Transform data to flatten user info
        const transformedComments = (commentsData || []).map((comment: any) => ({
          id: comment.id,
          collection_id: comment.collection_id,
          user_id: comment.user_id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          username: comment.users?.username,
          full_name: comment.users?.full_name,
          profile_image: comment.users?.profile_image
        }))

        setComments(transformedComments)
        setHasMoreComments((commentsData || []).length === COMMENTS_PER_PAGE)
        setCommentsPage(1)
      } catch (err) {
        logger.error('Error loading comments:', err)
      } finally {
        setLoadingComments(false)
      }
    }

    loadComments()
  }, [collection.id])

  // Load collection stats for CollectionActions
  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data: stats, error } = await supabase.rpc('get_collection_stats', {
          p_collection_id: collection.id
        })

        if (error) throw error
        setCollectionStats(stats)
      } catch (err) {
        logger.error('Error loading collection stats:', err)
      } finally {
        setLoadingStats(false)
      }
    }

    loadStats()
  }, [collection.id])

  // Load more comments
  const loadMoreComments = async () => {
    if (loadingMoreComments || !hasMoreComments) return

    setLoadingMoreComments(true)

    try {
      const startRange = commentsPage * COMMENTS_PER_PAGE
      const endRange = startRange + COMMENTS_PER_PAGE - 1

      const { data: commentsData, error: commentsError } = await supabase
        .from('collection_comments')
        .select(`
          *,
          users:user_id (
            username,
            full_name,
            profile_image
          )
        `)
        .eq('collection_id', collection.id)
        .order('created_at', { ascending: true })
        .range(startRange, endRange)

      if (commentsError) throw commentsError

      // Transform data to flatten user info
      const transformedComments = (commentsData || []).map((comment: any) => ({
        id: comment.id,
        collection_id: comment.collection_id,
        user_id: comment.user_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        username: comment.users?.username,
        full_name: comment.users?.full_name,
        profile_image: comment.users?.profile_image
      }))

      setComments(prev => [...prev, ...transformedComments])
      setHasMoreComments((commentsData || []).length === COMMENTS_PER_PAGE)
      setCommentsPage(prev => prev + 1)
    } catch (err) {
      logger.error('Error loading more comments:', err)
    } finally {
      setLoadingMoreComments(false)
    }
  }

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      alert('Please log in to vote')
      return
    }

    if (votingInProgress) return

    setVotingInProgress(true)

    try {
      // Optimistic update
      const wasVoted = userVote === voteType
      const previousVote = userVote

      // Update UI immediately
      if (wasVoted) {
        // Removing vote
        setUserVote(null)
        setVoteCounts(prev => ({
          upvotes: voteType === 'up' ? prev.upvotes - 1 : prev.upvotes,
          downvotes: voteType === 'down' ? prev.downvotes - 1 : prev.downvotes,
          net_score: voteType === 'up' ? prev.net_score - 1 : prev.net_score + 1
        }))
      } else if (previousVote) {
        // Changing vote
        setUserVote(voteType)
        setVoteCounts(prev => ({
          upvotes: voteType === 'up' ? prev.upvotes + 1 : prev.upvotes - 1,
          downvotes: voteType === 'down' ? prev.downvotes + 1 : prev.downvotes - 1,
          net_score: voteType === 'up' ? prev.net_score + 2 : prev.net_score - 2
        }))
      } else {
        // Adding new vote
        setUserVote(voteType)
        setVoteCounts(prev => ({
          upvotes: voteType === 'up' ? prev.upvotes + 1 : prev.upvotes,
          downvotes: voteType === 'down' ? prev.downvotes + 1 : prev.downvotes,
          net_score: voteType === 'up' ? prev.net_score + 1 : prev.net_score - 1
        }))
      }

      // Make API call
      await supabase.rpc('toggle_collection_vote', {
        p_collection_id: collection.id,
        p_vote_type: voteType
      })

      // Refresh actual counts from server
      const { data: countsData } = await supabase
        .rpc('get_collection_vote_counts', { p_collection_id: collection.id })

      if (countsData) {
        setVoteCounts(countsData)
      }

      const { data: voteData } = await supabase
        .rpc('get_user_vote_on_collection', { p_collection_id: collection.id })

      setUserVote(voteData as 'up' | 'down' | null)
    } catch (err) {
      logger.error('Error voting:', err)
      alert('Failed to record vote. Please try again.')
    } finally {
      setVotingInProgress(false)
    }
  }

  const handlePostComment = async () => {
    if (!user) {
      alert('Please log in to comment')
      return
    }

    if (!newComment.trim()) return
    if (postingComment) return

    setPostingComment(true)

    try {
      const { data: insertedComment, error: insertError } = await supabase
        .from('collection_comments')
        .insert({
          collection_id: collection.id,
          user_id: user.id,
          comment_text: newComment.trim()
        })
        .select(`
          *,
          users:user_id (
            username,
            full_name,
            profile_image
          )
        `)
        .single()

      if (insertError) throw insertError

      // Transform and add new comment
      const transformedComment = {
        id: insertedComment.id,
        collection_id: insertedComment.collection_id,
        user_id: insertedComment.user_id,
        comment_text: insertedComment.comment_text,
        created_at: insertedComment.created_at,
        updated_at: insertedComment.updated_at,
        username: (insertedComment.users as any)?.username,
        full_name: (insertedComment.users as any)?.full_name,
        profile_image: (insertedComment.users as any)?.profile_image
      }

      setComments(prev => [...prev, transformedComment])
      setNewComment('')
    } catch (err) {
      logger.error('Error posting comment:', err)
      alert('Failed to post comment. Please try again.')
    } finally {
      setPostingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      const { error: deleteError } = await supabase
        .from('collection_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id)

      if (deleteError) throw deleteError

      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err) {
      logger.error('Error deleting comment:', err)
      alert('Failed to delete comment.')
    }
  }

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.comment_text)
  }

  const cancelEditComment = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return

    try {
      const { error: updateError } = await supabase
        .from('collection_comments')
        .update({
          comment_text: editingCommentText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user?.id)

      if (updateError) throw updateError

      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, comment_text: editingCommentText.trim(), updated_at: new Date().toISOString() }
          : c
      ))

      setEditingCommentId(null)
      setEditingCommentText('')
    } catch (err) {
      logger.error('Error updating comment:', err)
      alert('Failed to update comment.')
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMins = Math.floor(diffInMs / 60000)

    if (diffInMins < 1) return 'just now'
    if (diffInMins < 60) return `${diffInMins}m ago`

    const diffInHours = Math.floor(diffInMins / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`

    const diffInMonths = Math.floor(diffInDays / 30)
    return `${diffInMonths}mo ago`
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      paddingTop: '80px'
    }}>
      {/* Navigation Bar */}
      <Navbar />

      {/* Back Button */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        <button
          onClick={() => router.back()}
          className="btn btn-secondary btn-small"
          aria-label="Go back to previous page"
          style={{ marginBottom: '1rem' }}
        >
          ← BACK
        </button>
      </div>

      {/* Hero Image/Map Preview */}
      {pins.length > 0 && (
        <div className="collection-hero" style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--muted)'
        }}>
          {(() => {
            // Get first pin with image
            const firstPinWithImage = pins.find(pin => pin.pin_images && pin.pin_images.length > 0)

            if (firstPinWithImage) {
              const firstImage = firstPinWithImage.pin_images.sort((a, b) => a.upload_order - b.upload_order)[0]

              return (
                <>
                  <Image
                    src={firstImage.image_url}
                    alt={collection.title}
                    fill
                    style={{
                      objectFit: 'cover',
                      filter: 'brightness(0.7)'
                    }}
                    priority
                    sizes="100vw"
                  />
                  {/* Overlay with collection info */}
                  <div className="collection-hero-overlay" style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '3rem'
                  }}>
                    <div style={{
                      maxWidth: '1200px',
                      width: '100%',
                      margin: '0 auto'
                    }}>
                      <div className="collection-hero-badge" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: `${collection.color}40`,
                        border: `1px solid ${collection.color}`,
                        borderRadius: 'var(--radius)',
                        marginBottom: '1rem',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: collection.color
                        }} />
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'white',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase'
                        }}>
                          {pinCount} {pinCount === 1 ? 'PIN' : 'PINS'}
                        </span>
                      </div>
                      <h1 className="collection-hero-title" style={{
                        fontSize: '3rem',
                        fontWeight: '700',
                        color: 'white',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                      }}>
                        {collection.title}
                      </h1>
                    </div>
                  </div>
                </>
              )
            } else {
              // Show map with all pins
              const centerLat = pins.reduce((sum, pin) => sum + pin.latitude, 0) / pins.length
              const centerLng = pins.reduce((sum, pin) => sum + pin.longitude, 0) / pins.length

              // Create markers string for static map
              const markers = pins.slice(0, 10).map(pin =>
                `${pin.latitude},${pin.longitude}`
              ).join('|')

              const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=12&size=1200x800&markers=color:red%7C${markers}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&scale=2&style=feature:poi|visibility:off&style=feature:transit|visibility:off`

              return (
                <>
                  <img
                    src={mapUrl}
                    alt={`Map of ${collection.title}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'brightness(0.7)'
                    }}
                  />
                  {/* Overlay with collection info */}
                  <div className="collection-hero-overlay" style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '3rem'
                  }}>
                    <div style={{
                      maxWidth: '1200px',
                      width: '100%',
                      margin: '0 auto'
                    }}>
                      <div className="collection-hero-badge" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: `${collection.color}40`,
                        border: `1px solid ${collection.color}`,
                        borderRadius: 'var(--radius)',
                        marginBottom: '1rem',
                        backdropFilter: 'blur(10px)'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: collection.color
                        }} />
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'white',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase'
                        }}>
                          {pinCount} {pinCount === 1 ? 'PIN' : 'PINS'}
                        </span>
                      </div>
                      <h1 className="collection-hero-title" style={{
                        fontSize: '3rem',
                        fontWeight: '700',
                        color: 'white',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                      }}>
                        {collection.title}
                      </h1>
                    </div>
                  </div>
                </>
              )
            }
          })()}
        </div>
      )}

      {/* Content Section */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        background: 'var(--background)',
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh'
      }}>
        <div style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '3rem',
          marginBottom: '2rem'
        }}>
          {/* Collection Header */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              {/* Only show title if no pins (no hero section) */}
              {pins.length === 0 && (
                <>
                  {/* Color indicator */}
                  <div style={{
                    width: '60px',
                    height: '6px',
                    background: collection.color,
                    borderRadius: '3px',
                    marginBottom: '1.5rem'
                  }} />

                  <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: 'var(--foreground)',
                    marginBottom: '1rem',
                    fontFamily: 'var(--font-display)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {collection.title}
                  </h1>
                </>
              )}

              {collection.description && (
                <p style={{
                  fontSize: '1rem',
                  color: 'var(--muted-foreground)',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {collection.description}
                </p>
              )}

              {/* Creator info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                {collection.profiles?.profile_image && !avatarLoadError ? (
                  <Image
                    src={collection.profiles.profile_image}
                    alt={displayName}
                    width={32}
                    height={32}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem'
                  }}>
                    {displayName[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--foreground)',
                    fontWeight: '600'
                  }}>
                    {displayName}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)'
                  }}>
                    {new Date(collection.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Engagement Summary Bar */}
              <div style={{
                padding: '1.5rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                border: '2px solid var(--border)',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '2rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>📍</span>
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      <strong style={{ color: 'var(--foreground)' }}>{pinCount}</strong> {pinCount === 1 ? 'pin' : 'pins'}
                    </span>
                  </div>

                  {collectionStats && (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>❤️</span>
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          <strong style={{ color: 'var(--foreground)' }}>{collectionStats.likes_count || 0}</strong> {collectionStats.likes_count === 1 ? 'like' : 'likes'}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>💾</span>
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          <strong style={{ color: 'var(--foreground)' }}>{collectionStats.saves_count || 0}</strong> {collectionStats.saves_count === 1 ? 'save' : 'saves'}
                        </span>
                      </div>
                    </>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>💬</span>
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      <strong style={{ color: 'var(--foreground)' }}>{comments.length}</strong> {comments.length === 1 ? 'comment' : 'comments'}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>{collection.is_public ? '🌍' : '🔒'}</span>
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {collection.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collection Actions (Like/Save/Share) */}
              {collectionStats && user && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <CollectionActions
                    collectionId={collection.id}
                    collectionName={collection.title}
                    stats={collectionStats}
                    currentUserId={user.id}
                    showShare={false}
                  />
                </div>
              )}

              {/* Owner Actions */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={handleShare}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>🔗</span> SHARE
                </button>

                {isOwner && (
                  <button
                    onClick={() => setIsEditingCollection(true)}
                    className="btn btn-secondary"
                  >
                    ✏️ EDIT COLLECTION
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pins Grid */}
        {pins.length > 0 ? (
          <>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--foreground)',
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Pins in this Collection
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {pins.map((pin) => {
                const firstImage = pin.pin_images.sort((a, b) => a.upload_order - b.upload_order)[0]
                const emoji = categoryEmojis[pin.category || 'other'] || '📍'

                return (
                  <div
                    key={pin.id}
                    onClick={() => router.push(`/pins/${pin.id}`)}
                    style={{
                      background: 'var(--card)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Pin Image */}
                    {firstImage ? (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        paddingTop: '75%',
                        background: 'var(--muted)',
                        overflow: 'hidden'
                      }}>
                        <Image
                          src={firstImage.image_url}
                          alt={pin.title}
                          fill
                          style={{
                            objectFit: 'cover'
                          }}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        paddingTop: '75%',
                        background: 'linear-gradient(135deg, var(--muted) 0%, var(--accent) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '4rem',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}>
                          {emoji}
                        </div>
                      </div>
                    )}

                    {/* Pin Info */}
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
                        <h3 style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: 'var(--foreground)',
                          margin: 0,
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {pin.title}
                        </h3>
                      </div>

                      {pin.description && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: 'var(--muted-foreground)',
                          lineHeight: '1.5',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {pin.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          // Empty state
          <div style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            padding: '4rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📍</div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--foreground)',
              marginBottom: '0.5rem'
            }}>
              No pins yet
            </h3>
            <p style={{
              color: 'var(--muted-foreground)',
              marginBottom: '1.5rem'
            }}>
              {isOwner
                ? 'Start adding pins to this collection from the map'
                : 'This collection is empty'}
            </p>
            {isOwner && (
              <button
                onClick={() => router.push('/')}
                className="btn btn-primary"
              >
                GO TO MAP
              </button>
            )}
          </div>
        )}

        {/* Comments Section */}
        <div style={{
          marginTop: '3rem',
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          padding: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'var(--foreground)',
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Comments ({comments.length})
          </h2>

          {/* Post Comment Form */}
          {user ? (
            <div style={{
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'var(--background)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)'
            }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this collection..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '1rem'
              }}>
                <button
                  onClick={handlePostComment}
                  disabled={postingComment || !newComment.trim()}
                  className="btn btn-primary"
                  style={{
                    opacity: postingComment || !newComment.trim() ? 0.5 : 1,
                    cursor: postingComment || !newComment.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {postingComment ? 'POSTING...' : 'POST COMMENT'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--muted)',
              borderRadius: 'var(--radius)',
              marginBottom: '2rem'
            }}>
              <p style={{
                color: 'var(--muted-foreground)',
                marginBottom: '1rem'
              }}>
                Please log in to comment
              </p>
            </div>
          )}

          {/* Comments List */}
          {loadingComments ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)'
            }}>
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)'
            }}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {comments.map((comment) => {
                const commentDisplayName = comment.full_name || comment.username || 'Anonymous'
                const isCommentOwner = user?.id === comment.user_id
                const isEditing = editingCommentId === comment.id

                return (
                  <div
                    key={comment.id}
                    style={{
                      padding: '1.5rem',
                      background: 'var(--background)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {/* Comment Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        {comment.profile_image ? (
                          <Image
                            src={comment.profile_image}
                            alt={commentDisplayName}
                            width={32}
                            height={32}
                            style={{
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}>
                            {commentDisplayName[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'var(--foreground)'
                          }}>
                            {commentDisplayName}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--muted-foreground)'
                          }}>
                            {formatRelativeTime(comment.created_at)}
                            {comment.updated_at !== comment.created_at && ' (edited)'}
                          </div>
                        </div>
                      </div>

                      {/* Comment Actions */}
                      {!isEditing && (
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem'
                        }}>
                          {isCommentOwner ? (
                            <>
                              <button
                                onClick={() => startEditComment(comment)}
                                style={{
                                  padding: '0.25rem 0.75rem',
                                  background: 'var(--muted)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius)',
                                  fontSize: '0.75rem',
                                  color: 'var(--foreground)',
                                  cursor: 'pointer'
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                style={{
                                  padding: '0.25rem 0.75rem',
                                  background: '#ff6b6b',
                                  border: 'none',
                                  borderRadius: 'var(--radius)',
                                  fontSize: '0.75rem',
                                  color: 'white',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </>
                          ) : user && (
                            <button
                              onClick={() => setReportingCommentId(comment.id)}
                              style={{
                                padding: '0.25rem 0.75rem',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                fontSize: '0.75rem',
                                color: 'var(--muted-foreground)',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#ef4444'
                                e.currentTarget.style.color = '#ef4444'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)'
                                e.currentTarget.style.color = 'var(--muted-foreground)'
                              }}
                            >
                              Report
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Comment Content */}
                    {isEditing ? (
                      <div>
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.75rem',
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--foreground)',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            marginBottom: '0.75rem'
                          }}
                        />
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end'
                        }}>
                          <button
                            onClick={cancelEditComment}
                            className="btn btn-secondary btn-small"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateComment(comment.id)}
                            disabled={!editingCommentText.trim()}
                            className="btn btn-primary btn-small"
                            style={{
                              opacity: !editingCommentText.trim() ? 0.5 : 1,
                              cursor: !editingCommentText.trim() ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {renderCommentWithMentions(comment.comment_text)}
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Load More Button */}
              {hasMoreComments && !loadingComments && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '1.5rem 0'
                }}>
                  <button
                    onClick={loadMoreComments}
                    disabled={loadingMoreComments}
                    style={{
                      padding: '0.75rem 2rem',
                      background: loadingMoreComments ? 'var(--muted)' : 'var(--card)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: loadingMoreComments ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!loadingMoreComments) {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--accent)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loadingMoreComments) {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--foreground)'
                      }
                    }}
                  >
                    {loadingMoreComments ? 'Loading...' : `Load More Comments (${comments.length} shown)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <Toast
          message="Link copied to clipboard!"
          variant="success"
          onClose={() => setShowShareToast(false)}
        />
      )}

      {/* Report Comment Modal */}
      {reportingCommentId && (
        <ReportCommentModal
          commentId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
          onReported={() => {
            alert('Thank you for your report. We will review it shortly.')
          }}
        />
      )}

      {/* Edit Collection Modal */}
      {isEditingCollection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--border)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              marginBottom: '1.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Edit Collection
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Title */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Collection title"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    color: 'var(--foreground)'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Describe this collection..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    color: 'var(--foreground)',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Color */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setEditForm({ ...editForm, color })}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: color,
                        border: editForm.color === color ? '3px solid var(--foreground)' : '2px solid var(--border)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Public/Private */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Public Collection</span>
                  <input
                    type="checkbox"
                    checked={editForm.is_public}
                    onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    setIsEditingCollection(false)
                    setEditForm({
                      title: collection.title,
                      description: collection.description || '',
                      is_public: collection.is_public,
                      color: collection.color
                    })
                  }}
                  disabled={savingCollection}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: savingCollection ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.75rem',
                    opacity: savingCollection ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCollection}
                  disabled={savingCollection || !editForm.title.trim()}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: savingCollection || !editForm.title.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.75rem',
                    opacity: savingCollection || !editForm.title.trim() ? 0.5 : 1
                  }}
                >
                  {savingCollection ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
