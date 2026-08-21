'use client'
import { logger } from '@/lib/logger'
import React, { useState, useEffect } from 'react'
import { X, MapPin, ThumbsUp, ThumbsDown, MessageCircle, Calendar, Globe2, Lock, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ReportCommentModal from './ReportCommentModal'
import CollectionActions from './Collection/CollectionActions'

interface Collection {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  pin_count?: number
  first_pin_image?: string | null
  user_id?: string
  color: string
  upvotes?: number
  downvotes?: number
  net_score?: number
}

interface CollectionDetailsModalProps {
  collection: Collection
  onClose: () => void
  onUpdate: () => void
  userId: string
}

interface PinImage {
  id: string
  pin_id: string
  image_url: string
  upload_order: number
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

export default function CollectionDetailsModal({
  collection,
  onClose,
  onUpdate,
  userId
}: CollectionDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: collection.title,
    description: collection.description || '',
    is_public: collection.is_public,
    color: collection.color || '#E05C3A'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<PinImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)

  // Voting state
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [voteCounts, setVoteCounts] = useState({
    upvotes: collection.upvotes || 0,
    downvotes: collection.downvotes || 0,
    net_score: collection.net_score || 0
  })
  const [votingInProgress, setVotingInProgress] = useState(false)

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

  // Check if the current user owns this collection
  const isOwner = collection.user_id === userId

  // Load collection images, vote data, and comments
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load images
        const { data: pins } = await supabase
          .from('pins')
          .select('id')
          .eq('collection_id', collection.id)

        if (pins && pins.length > 0) {
          const { data: pinImages } = await supabase
            .from('pin_images')
            .select('*')
            .in('pin_id', pins.map(p => p.id))
            .order('upload_order', { ascending: true })
            .limit(6)

          setImages(pinImages || [])
        }

        // Load user's vote
        const { data: voteData } = await supabase
          .rpc('get_user_vote_on_collection', { p_collection_id: collection.id })

        setUserVote(voteData as 'up' | 'down' | null)

        // Load vote counts
        const { data: countsData } = await supabase
          .rpc('get_collection_vote_counts', { p_collection_id: collection.id })

        if (countsData) {
          setVoteCounts({
            upvotes: countsData.upvotes || 0,
            downvotes: countsData.downvotes || 0,
            net_score: countsData.net_score || 0
          })
        }

        // Load initial comments with user information
        const { data: commentsData, error: commentsError } = await supabase
          .from('collection_comments')
          .select(`
            *,
            users:user_id (
              username,
              profile_image
            )
          `)
          .eq('collection_id', collection.id)
          .order('created_at', { ascending: true })
          .range(0, COMMENTS_PER_PAGE - 1)

        if (commentsError) throw commentsError

        // Transform the data to flatten user info
        const transformedComments = (commentsData || []).map((comment: any) => ({
          id: comment.id,
          collection_id: comment.collection_id,
          user_id: comment.user_id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          username: comment.users?.username,
          profile_image: comment.users?.profile_image
        }))

        setComments(transformedComments)
        setHasMoreComments((commentsData || []).length === COMMENTS_PER_PAGE)
        setCommentsPage(1)
      } catch (err) {
        logger.error('Error loading data:', err)
      } finally {
        setLoadingImages(false)
        setLoadingComments(false)
      }
    }

    loadData()
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
            profile_image
          )
        `)
        .eq('collection_id', collection.id)
        .order('created_at', { ascending: true })
        .range(startRange, endRange)

      if (commentsError) throw commentsError

      // Transform the data to flatten user info
      const transformedComments = (commentsData || []).map((comment: any) => ({
        id: comment.id,
        collection_id: comment.collection_id,
        user_id: comment.user_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        username: comment.users?.username,
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

  const handleSave = async () => {
    if (!editForm.title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('collections')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          is_public: editForm.is_public,
          color: editForm.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', collection.id)
        .eq('user_id', userId)

      if (updateError) throw updateError

      setIsEditing(false)
      onUpdate()
    } catch (err: any) {
      logger.error('Error updating collection:', err)
      setError(err.message || 'Failed to update collection')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditForm({
      title: collection.title,
      description: collection.description || '',
      is_public: collection.is_public,
      color: collection.color || '#E05C3A'
    })
    setError('')
    setIsEditing(false)
  }

  const handleVote = async (voteType: 'up' | 'down') => {
    if (votingInProgress) return

    setVotingInProgress(true)

    try {
      // Optimistic update
      const wasVoted = userVote === voteType
      const previousVote = userVote
      const previousCounts = { ...voteCounts }

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
      const { data, error: voteError } = await supabase
        .rpc('toggle_collection_vote', {
          p_collection_id: collection.id,
          p_vote_type: voteType
        })

      if (voteError) throw voteError

      // Refresh actual counts from server
      const { data: countsData } = await supabase
        .rpc('get_collection_vote_counts', { p_collection_id: collection.id })

      if (countsData) {
        setVoteCounts({
          upvotes: countsData.upvotes || 0,
          downvotes: countsData.downvotes || 0,
          net_score: countsData.net_score || 0
        })
      }

      const { data: voteData } = await supabase
        .rpc('get_user_vote_on_collection', { p_collection_id: collection.id })

      setUserVote(voteData as 'up' | 'down' | null)

    } catch (err: any) {
      logger.error('Error voting:', err)
      setError('Failed to record vote. Please try again.')
      // Note: Optimistic update already happened, real data will sync on next load
    } finally {
      setVotingInProgress(false)
    }
  }

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    if (postingComment) return

    setPostingComment(true)
    setError('')

    try {
      // Insert comment
      const { data: insertedComment, error: insertError } = await supabase
        .from('collection_comments')
        .insert({
          collection_id: collection.id,
          user_id: userId,
          comment_text: newComment.trim()
        })
        .select(`
          *,
          users:user_id (
            username,
            profile_image
          )
        `)
        .single()

      if (insertError) throw insertError

      // Transform and add to comments list
      const transformedComment: Comment = {
        id: insertedComment.id,
        collection_id: insertedComment.collection_id,
        user_id: insertedComment.user_id,
        comment_text: insertedComment.comment_text,
        created_at: insertedComment.created_at,
        updated_at: insertedComment.updated_at,
        username: (insertedComment.users as any)?.username,
        profile_image: (insertedComment.users as any)?.profile_image
      }

      setComments(prev => [...prev, transformedComment])
      setNewComment('')
    } catch (err: any) {
      logger.error('Error posting comment:', err)
      setError('Failed to post comment. Please try again.')
    } finally {
      setPostingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('collection_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId) // Ensure user can only delete their own comments

      if (deleteError) throw deleteError

      // Remove from local state
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err: any) {
      logger.error('Error deleting comment:', err)
      setError('Failed to delete comment. Please try again.')
    }
  }

  const handleStartEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.comment_text)
  }

  const handleCancelEditComment = () => {
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
        .eq('user_id', userId) // Ensure user can only update their own comments

      if (updateError) throw updateError

      // Update local state
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, comment_text: editingCommentText.trim(), updated_at: new Date().toISOString() }
          : c
      ))

      setEditingCommentId(null)
      setEditingCommentText('')
    } catch (err: any) {
      logger.error('Error updating comment:', err)
      setError('Failed to update comment. Please try again.')
    }
  }

  return (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-content"
        style={{
          background: 'var(--background)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: 'min(600px, calc(100vw - 2rem))',
          width: '100%',
          maxHeight: 'calc(100vh - 2rem)',
          overflow: 'auto',
          padding: '2rem'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: '1rem'
        }}>
          {isOwner && isEditing ? (
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              style={{
                flex: 1,
                fontSize: '1.5rem',
                fontWeight: '700',
                padding: '0.5rem',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-body)'
              }}
              maxLength={100}
            />
          ) : (
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0,
              fontFamily: 'var(--font-display)'
            }}>
              {collection.title}
            </h2>
          )}

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              lineHeight: 1,
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Public/Private Badge or Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          {isOwner && isEditing ? (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '0.75rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: editForm.is_public ? 'rgba(34, 197, 94, 0.1)' : 'var(--muted)'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: 'var(--foreground)'
                }}>
                  {editForm.is_public ? <Globe2 size={16} /> : <Lock size={16} />}
                  {editForm.is_public ? 'Public Collection' : 'Private Collection'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  marginTop: '0.25rem',
                  color: 'var(--muted-foreground)'
                }}>
                  {editForm.is_public ? 'Visible to everyone' : 'Only visible to you'}
                </div>
              </div>

              {/* Toggle Switch */}
              <div style={{ position: 'relative' }}>
                <input
                  type="checkbox"
                  checked={editForm.is_public}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: editForm.is_public ? '#22c55e' : 'var(--muted)',
                  border: '2px solid',
                  borderColor: editForm.is_public ? '#22c55e' : 'var(--border)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: editForm.is_public ? '26px' : '2px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </div>
              </div>
            </label>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: collection.is_public ? 'rgba(34, 197, 94, 0.1)' : 'var(--muted)',
              color: collection.is_public ? '#22c55e' : 'var(--foreground)',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              fontWeight: '700',
              fontFamily: 'var(--font-body)'
            }}>
              {collection.is_public ? <Globe2 size={14} /> : <Lock size={14} />}
              {collection.is_public ? 'Public' : 'Private'}
            </div>
          )}
        </div>

        {/* Voting Section */}
        {!isOwner && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'var(--muted)',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--border)'
            }}>
              {/* Upvote Button */}
              <button
                onClick={() => handleVote('up')}
                disabled={votingInProgress}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: userVote === 'up' ? '#22c55e' : 'var(--background)',
                  color: userVote === 'up' ? 'white' : 'var(--foreground)',
                  border: '2px solid',
                  borderColor: userVote === 'up' ? '#22c55e' : 'var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: votingInProgress ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.2s ease',
                  opacity: votingInProgress ? 0.6 : 1
                }}
              >
                <ThumbsUp size={16} fill={userVote === 'up' ? 'currentColor' : 'none'} />
                <span>{voteCounts.upvotes}</span>
              </button>

              {/* Net Score Display */}
              <div style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '1.25rem',
                fontWeight: '700',
                fontFamily: 'var(--font-body)',
                color: voteCounts.net_score > 0 ? '#22c55e' : voteCounts.net_score < 0 ? 'var(--destructive)' : 'var(--muted-foreground)'
              }}>
                {voteCounts.net_score > 0 ? '+' : ''}{voteCounts.net_score}
              </div>

              {/* Downvote Button */}
              <button
                onClick={() => handleVote('down')}
                disabled={votingInProgress}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: userVote === 'down' ? 'var(--destructive)' : 'var(--background)',
                  color: userVote === 'down' ? 'white' : 'var(--foreground)',
                  border: '2px solid',
                  borderColor: userVote === 'down' ? 'var(--destructive)' : 'var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: votingInProgress ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.2s ease',
                  opacity: votingInProgress ? 0.6 : 1
                }}
              >
                <ThumbsDown size={16} fill={userVote === 'down' ? 'currentColor' : 'none'} />
                <span>{voteCounts.downvotes}</span>
              </button>
            </div>

            {/* Voting hint */}
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-body)',
              textAlign: 'center'
            }}>
              {userVote ? `You voted ${userVote === 'up' ? 'up' : 'down'} • Click again to remove` : 'Vote to rate this collection'}
            </div>
          </div>
        )}

        {/* Color Picker - Only show when editing */}
        {isOwner && isEditing && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted-foreground)'
            }}>
              Pin Color
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {/* Preset Colors */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                {['#E63946', '#F77F00', '#FCBF49', '#06D6A0', '#118AB2', '#073B4C', '#8B5CF6', '#EC4899'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, color }))}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius)',
                      background: color,
                      border: '3px solid',
                      borderColor: editForm.color === color ? 'white' : 'var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: editForm.color === color ? '0 0 0 2px ' + color : 'none'
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom Color Input */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                  style={{
                    width: '60px',
                    height: '40px',
                    borderRadius: 'var(--radius)',
                    border: '2px solid var(--border)',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                />
                <input
                  type="text"
                  value={editForm.color}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setEditForm(prev => ({ ...prev, color: value }))
                    }
                  }}
                  placeholder="#E63946"
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase'
                  }}
                  maxLength={7}
                />
              </div>

              {/* Preview */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-body)',
                color: 'var(--muted-foreground)'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: editForm.color,
                  border: '2px solid var(--border)'
                }} />
                <span>Preview: Pins will appear in this color on the map</span>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-body)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--muted-foreground)'
          }}>
            Description
          </label>
          {isOwner && isEditing ? (
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add a description for this collection..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                resize: 'vertical',
                minHeight: '100px',
                fontFamily: 'inherit'
              }}
              maxLength={500}
            />
          ) : (
            <p style={{
              margin: 0,
              color: collection.description ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontSize: '0.875rem',
              fontStyle: collection.description ? 'normal' : 'italic'
            }}>
              {collection.description || 'No description'}
            </p>
          )}
        </div>

        {/* Images Grid */}
        {!loadingImages && images.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--muted-foreground)'
            }}>
              Images ({images.length})
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))',
              gap: '0.5rem'
            }}>
              {images.map((image) => (
                <div
                  key={image.id}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    border: '2px solid var(--border)'
                  }}
                >
                  <img
                    src={image.image_url}
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
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--muted-foreground)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <MapPin size={14} /> {collection.pin_count || 0} pins
          </div>
          {voteCounts.net_score !== 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              color: voteCounts.net_score > 0 ? '#22c55e' : 'var(--destructive)',
              fontWeight: '700'
            }}>
              {voteCounts.net_score > 0 ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
              {Math.abs(voteCounts.net_score)} {voteCounts.net_score > 0 ? 'upvotes' : 'downvotes'} net
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <MessageCircle size={14} /> {comments.length} comments
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Calendar size={14} /> {new Date(collection.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Comments Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '700',
            marginBottom: '1rem',
            fontFamily: 'var(--font-body)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--muted-foreground)'
          }}>
            <MessageCircle size={14} /> Comments ({comments.length})
          </label>

          {/* Comments List */}
          <div style={{
            marginBottom: '1rem',
            maxHeight: '300px',
            overflowY: 'auto',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--muted)'
          }}>
            {loadingComments ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--muted-foreground)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)'
              }}>
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--muted-foreground)',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                fontStyle: 'italic'
              }}>
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '1rem',
                      borderBottom: index < comments.length - 1 ? '1px solid var(--border)' : 'none',
                      background: comment.user_id === userId ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                    }}
                  >
                    {/* Comment Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      gap: '0.5rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flex: 1,
                        minWidth: 0
                      }}>
                        {/* Profile Image */}
                        {comment.profile_image ? (
                          <img
                            src={comment.profile_image}
                            alt={comment.username || 'User'}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: '2px solid var(--border)',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            border: '2px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'white',
                            flexShrink: 0
                          }}>
                            {(comment.username || 'U')[0].toUpperCase()}
                          </div>
                        )}

                        {/* Username */}
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          fontFamily: 'var(--font-body)',
                          color: 'var(--foreground)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {comment.username || 'Anonymous'}
                        </span>

                        {/* Owner Badge */}
                        {comment.user_id === collection.user_id && (
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '700',
                            fontFamily: 'var(--font-body)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '0.125rem 0.375rem',
                            background: 'var(--accent)',
                            color: 'white',
                            borderRadius: 'var(--radius)',
                            flexShrink: 0
                          }}>
                            Owner
                          </span>
                        )}
                      </div>

                      {/* Timestamp and Action Buttons */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexShrink: 0
                      }}>
                        <span style={{
                          fontSize: '0.625rem',
                          color: 'var(--muted-foreground)',
                          fontFamily: 'var(--font-body)',
                          whiteSpace: 'nowrap'
                        }}>
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>

                        {editingCommentId !== comment.id && (
                          <>
                            {comment.user_id === userId ? (
                              <>
                                <button
                                  onClick={() => handleStartEditComment(comment)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.25rem 0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--accent)',
                                    cursor: 'pointer',
                                    fontSize: '0.625rem',
                                    fontWeight: '700',
                                    fontFamily: 'var(--font-body)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  title="Edit comment"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.25rem 0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    color: 'var(--destructive)',
                                    cursor: 'pointer',
                                    fontSize: '0.625rem',
                                    fontWeight: '700',
                                    fontFamily: 'var(--font-body)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  title="Delete comment"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setReportingCommentId(comment.id)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius)',
                                  color: 'var(--muted-foreground)',
                                  cursor: 'pointer',
                                  fontSize: '0.625rem',
                                  fontWeight: '700',
                                  fontFamily: 'var(--font-body)',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--destructive)'
                                  e.currentTarget.style.color = 'var(--destructive)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'var(--border)'
                                  e.currentTarget.style.color = 'var(--muted-foreground)'
                                }}
                                title="Report inappropriate comment"
                              >
                                Report
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Comment Text or Edit Form */}
                    {editingCommentId === comment.id ? (
                      <div style={{
                        marginTop: '0.5rem'
                      }}>
                        <textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '2px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            background: 'var(--background)',
                            color: 'var(--foreground)',
                            fontSize: '0.875rem',
                            resize: 'vertical',
                            minHeight: '60px',
                            fontFamily: 'inherit',
                            marginBottom: '0.5rem'
                          }}
                          maxLength={1000}
                        />
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end'
                        }}>
                          <button
                            onClick={handleCancelEditComment}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: 'var(--muted)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                              color: 'var(--foreground)',
                              cursor: 'pointer',
                              fontSize: '0.625rem',
                              fontWeight: '700',
                              fontFamily: 'var(--font-body)'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateComment(comment.id)}
                            disabled={!editingCommentText.trim()}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: !editingCommentText.trim() ? 'var(--muted)' : 'var(--accent)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                              color: !editingCommentText.trim() ? 'var(--muted-foreground)' : 'white',
                              cursor: !editingCommentText.trim() ? 'not-allowed' : 'pointer',
                              fontSize: '0.625rem',
                              fontWeight: '700',
                              fontFamily: 'var(--font-body)'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        lineHeight: '1.5',
                        wordBreak: 'break-word'
                      }}>
                        {renderCommentWithMentions(comment.comment_text)}
                      </p>
                    )}
                  </div>
                ))}

                {/* Load More Button */}
                {hasMoreComments && !loadingComments && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '1rem 0'
                  }}>
                    <button
                      onClick={loadMoreComments}
                      disabled={loadingMoreComments}
                      style={{
                        padding: '0.5rem 1.5rem',
                        background: loadingMoreComments ? 'var(--muted)' : 'var(--card)',
                        border: '2px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--foreground)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: loadingMoreComments ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--font-body)',
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
                      {loadingMoreComments ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Post Comment Form */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start'
          }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              disabled={postingComment}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                resize: 'vertical',
                minHeight: '80px',
                fontFamily: 'inherit',
                opacity: postingComment ? 0.6 : 1
              }}
              maxLength={1000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handlePostComment()
                }
              }}
            />
            <button
              onClick={handlePostComment}
              disabled={!newComment.trim() || postingComment}
              style={{
                padding: '0.75rem 1rem',
                background: !newComment.trim() || postingComment ? 'var(--muted)' : 'var(--accent)',
                color: !newComment.trim() || postingComment ? 'var(--muted-foreground)' : 'white',
                border: '2px solid',
                borderColor: !newComment.trim() || postingComment ? 'var(--border)' : 'var(--accent)',
                borderRadius: 'var(--radius)',
                cursor: !newComment.trim() || postingComment ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem',
                fontWeight: '700',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title="⌘/Ctrl + Enter to post"
            >
              {postingComment ? 'Posting...' : 'Post'}
            </button>
          </div>

          {/* Keyboard shortcut hint */}
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.625rem',
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-body)',
            textAlign: 'right'
          }}>
            ⌘/Ctrl + Enter to post
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.75rem',
            background: 'var(--color-red-subtle)',
            border: '2px solid var(--destructive)',
            borderRadius: 'var(--radius)',
            color: 'var(--destructive)',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons - Only show for collection owner */}
        {isOwner && (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    fontFamily: 'var(--font-body)',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--accent)',
                    color: 'white',
                    border: '2px solid var(--accent)',
                    borderRadius: 'var(--radius)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    fontFamily: 'var(--font-body)',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent)',
                  color: 'white',
                  border: '2px solid var(--accent)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Edit Collection
              </button>
            )}
          </div>
        )}
      </div>

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
    </div>
  )
}
