'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { DatabaseService } from '@/lib/database'
import { useAuth } from '@/hooks/useAuth'

interface FollowButtonProps {
  userId: string
  username: string | null
  size?: 'small' | 'medium' | 'large'
  onFollowChange?: (isFollowing: boolean) => void
}

export default function FollowButton({
  userId,
  username,
  size = 'medium',
  onFollowChange
}: FollowButtonProps) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if already following on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || user.id === userId) {
        setChecking(false)
        return
      }

      setChecking(true)
      const status = await DatabaseService.isFollowing(user.id, userId)
      setIsFollowing(status)
      setChecking(false)
    }

    checkFollowStatus()
  }, [user, userId])

  const handleClick = async () => {
    if (!user || loading) return

    setLoading(true)
    try {
      if (isFollowing) {
        const success = await DatabaseService.unfollowUser(userId)
        if (success) {
          setIsFollowing(false)
          onFollowChange?.(false)
        }
      } else {
        const success = await DatabaseService.followUser(userId)
        if (success) {
          setIsFollowing(true)
          onFollowChange?.(true)
        }
      }
    } catch (error) {
      logger.error('Error toggling follow:', error)
    } finally {
      setLoading(false)
    }
  }

  // Don't show button for own profile
  if (!user || user.id === userId) return null

  const sizeStyles = {
    small: {
      padding: '0.375rem 0.75rem',
      fontSize: '0.625rem'
    },
    medium: {
      padding: '0.5rem 1rem',
      fontSize: '0.75rem'
    },
    large: {
      padding: '0.75rem 1.5rem',
      fontSize: '0.875rem'
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || checking}
      style={{
        ...sizeStyles[size],
        backgroundColor: isFollowing ? 'transparent' : 'var(--accent)',
        color: isFollowing ? 'var(--foreground)' : 'white',
        border: `2px solid ${isFollowing ? 'var(--border)' : 'var(--accent)'}`,
        borderRadius: 'var(--radius)',
        cursor: loading || checking ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)',
        fontWeight: '700',
        transition: 'var(--transition)',
        opacity: loading || checking ? 0.6 : 1
      }}
      onMouseEnter={(e) => {
        if (!loading && !checking) {
          if (isFollowing) {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          } else {
            e.currentTarget.style.transform = 'translateY(-2px)'
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!loading && !checking) {
          if (isFollowing) {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--foreground)'
          } else {
            e.currentTarget.style.transform = 'translateY(0)'
          }
        }
      }}
    >
      {checking ? '...' : loading ? (isFollowing ? 'Unfollowing...' : 'Following...') : (isFollowing ? 'Following' : 'Follow')}
    </button>
  )
}
