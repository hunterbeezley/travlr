'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface Reaction {
  emoji: string
  count: number
  users: string[]
}

interface CommentReactionsProps {
  commentId: string
  currentUserId?: string
}

const AVAILABLE_EMOJIS = ['👍', '❤️', '😂', '😮', '😢']

export default function CommentReactions({
  commentId,
  currentUserId
}: CommentReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [userReactions, setUserReactions] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReactions()
    if (currentUserId) {
      loadUserReactions()
    }

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`comment-reactions:${commentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
          filter: `comment_id=eq.${commentId}`
        },
        () => {
          loadReactions()
          if (currentUserId) {
            loadUserReactions()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [commentId, currentUserId])

  const loadReactions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_comment_reactions', {
        p_comment_id: commentId
      })

      if (error) throw error
      setReactions(data || [])
    } catch (error) {
      logger.error('Error loading reactions:', error)
    }
  }

  const loadUserReactions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_reactions_on_comment', {
        p_comment_id: commentId
      })

      if (error) throw error
      setUserReactions(data || [])
    } catch (error) {
      logger.error('Error loading user reactions:', error)
    }
  }

  const toggleReaction = async (emoji: string) => {
    if (!currentUserId || loading) return

    setLoading(true)
    try {
      const { error } = await supabase.rpc('toggle_comment_reaction', {
        p_comment_id: commentId,
        p_emoji: emoji
      })

      if (error) throw error

      // Optimistic update
      setUserReactions(prev =>
        prev.includes(emoji)
          ? prev.filter(e => e !== emoji)
          : [...prev, emoji]
      )

      setShowPicker(false)
    } catch (error) {
      logger.error('Error toggling reaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasUserReacted = (emoji: string) => userReactions.includes(emoji)

  return (
    <div style={{ position: 'relative' }}>
      {/* Existing Reactions */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginTop: '0.5rem',
        alignItems: 'center'
      }}>
        {reactions.map(({ emoji, count }) => (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            disabled={!currentUserId || loading}
            className={hasUserReacted(emoji) ? 'glass-strong' : 'glass-subtle'}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-lg)',
              border: hasUserReacted(emoji)
                ? '1px solid var(--color-red-muted)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              background: hasUserReacted(emoji)
                ? 'rgba(230, 57, 70, 0.2)'
                : 'rgba(255, 255, 255, 0.05)',
              cursor: currentUserId ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontWeight: hasUserReacted(emoji) ? '600' : '400'
            }}
            onMouseEnter={(e) => {
              if (currentUserId) {
                e.currentTarget.style.transform = 'scale(1.05)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <span style={{ fontSize: '1rem' }}>{emoji}</span>
            <span style={{ color: 'var(--foreground)' }}>{count}</span>
          </button>
        ))}

        {/* Add Reaction Button */}
        {currentUserId && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="glass-subtle"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '1.125rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
              aria-label="Add reaction"
            >
              {showPicker ? '×' : '😊'}
            </button>

            {/* Emoji Picker */}
            {showPicker && (
              <div
                className="glass-strong animate-scale-in"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 0.5rem)',
                  left: 0,
                  display: 'flex',
                  gap: '0.25rem',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(39, 39, 42, 0.95)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  zIndex: 10
                }}
              >
                {AVAILABLE_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(emoji)}
                    disabled={loading}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: hasUserReacted(emoji)
                        ? '2px solid var(--color-red-muted)'
                        : '1px solid transparent',
                      background: hasUserReacted(emoji)
                        ? 'rgba(230, 57, 70, 0.2)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.2)'
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.background = hasUserReacted(emoji)
                        ? 'rgba(230, 57, 70, 0.2)'
                        : 'transparent'
                    }}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
