'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function FollowingSuggestions() {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSuggestions()
  }, [])

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_following_suggestions', {
        p_limit: 5
      })

      if (error) throw error
      setSuggestions(data || [])
    } catch (error) {
      logger.error('Error loading suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('follow_user', {
        p_following_id: userId
      })

      if (error) throw error

      setFollowing(prev => new Set(prev).add(userId))
    } catch (error) {
      logger.error('Error following user:', error)
    }
  }

  if (loading) {
    return (
      <div style={{
        padding: '1rem',
        background: 'var(--card)',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <h3 style={{
          fontSize: '0.875rem',
          fontWeight: '700',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '1rem',
          color: 'var(--foreground)'
        }}>
          Suggested For You
        </h3>
        <div style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem',
          textAlign: 'center',
          padding: '1rem'
        }}>
          Loading suggestions...
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) return null

  return (
    <div style={{
      padding: '1rem',
      background: 'var(--card)',
      border: '2px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '1.5rem'
    }}>
      <h3 style={{
        fontSize: '0.875rem',
        fontWeight: '700',
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '1rem',
        color: 'var(--foreground)'
      }}>
        ✨ Suggested For You
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.user_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: 'var(--muted)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)'
            }}
          >
            {/* Avatar */}
            <Link
              href={`/profile/${suggestion.user_id}`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'var(--background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {suggestion.avatar_url ? (
                <img
                  src={suggestion.avatar_url}
                  alt={suggestion.username}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <span style={{ fontSize: '1.25rem' }}>👤</span>
              )}
            </Link>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link
                href={`/profile/${suggestion.user_id}`}
                style={{
                  display: 'block',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  color: 'var(--foreground)',
                  textDecoration: 'none',
                  marginBottom: '0.125rem'
                }}
              >
                {suggestion.username}
              </Link>
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--muted-foreground)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {suggestion.reason}
              </div>
            </div>

            {/* Follow Button */}
            <button
              onClick={() => handleFollow(suggestion.user_id)}
              disabled={following.has(suggestion.user_id)}
              style={{
                padding: '0.5rem 1rem',
                background: following.has(suggestion.user_id) ? 'var(--muted)' : 'var(--accent)',
                color: following.has(suggestion.user_id) ? 'var(--muted-foreground)' : 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: following.has(suggestion.user_id) ? 'not-allowed' : 'pointer',
                fontSize: '0.7rem',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {following.has(suggestion.user_id) ? 'Following' : 'Follow'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
