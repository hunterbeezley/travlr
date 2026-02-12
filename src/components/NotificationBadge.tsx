'use client'
import { useState, useEffect } from 'react'
import { DatabaseService, Notification } from '@/lib/database'

interface NotificationBadgeProps {
  userId: string
}

export default function NotificationBadge({ userId }: NotificationBadgeProps) {
  const [showModal, setShowModal] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Load unread count
  const loadUnreadCount = async () => {
    const count = await DatabaseService.getUnreadNotificationCount()
    setUnreadCount(count)
  }

  // Load notifications when modal opens
  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await DatabaseService.getUserNotifications(50)
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load unread count on mount and periodically
  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [userId])

  // Load notifications when modal opens
  useEffect(() => {
    if (showModal) {
      loadNotifications()
    }
  }, [showModal])

  // Mark notification as read
  const handleMarkRead = async (notificationId: string) => {
    await DatabaseService.markNotificationRead(notificationId)
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    loadUnreadCount()
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    await DatabaseService.markAllNotificationsRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  // Get time ago string
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowModal(!showModal)}
        style={{
          position: 'relative',
          padding: '0.5rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--accent)',
          transition: 'var(--transition)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
        title="Notifications"
      >
        {/* Bell SVG Icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: 'var(--accent)',
            color: 'white',
            fontSize: '0.625rem',
            fontWeight: '700',
            padding: '0.125rem 0.375rem',
            borderRadius: '10px',
            minWidth: '16px',
            height: '16px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Click Outside Handler */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}

      {/* Notifications Dropdown Menu */}
      {showModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            background: 'var(--background)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '380px',
            maxHeight: '500px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}
        >
            {/* Arrow pointing up to bell */}
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '12px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid var(--border)'
            }} />
            <div style={{
              position: 'absolute',
              top: '-6px',
              right: '13px',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderBottom: '7px solid var(--background)'
            }} />

            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              borderBottom: '1px solid var(--border)'
            }}>
              <h2 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                margin: 0,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--foreground)'
              }}>
                NOTIFICATIONS
              </h2>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.65rem',
                      color: 'var(--muted-foreground)',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.color = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                    }}
                  >
                    Mark all
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div style={{
              overflowY: 'auto',
              flex: 1
            }}>
              {loading ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--muted-foreground)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.5rem'
                  }}>🔔</div>
                  <div>No notifications yet</div>
                  <div style={{
                    fontSize: '0.75rem',
                    marginTop: '0.5rem',
                    opacity: 0.7
                  }}>
                    You'll be notified when someone follows you or when friends create new collections
                  </div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid var(--border)',
                      background: notification.is_read ? 'transparent' : 'rgba(230, 57, 70, 0.05)',
                      cursor: notification.is_read ? 'default' : 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                      if (!notification.is_read) {
                        e.currentTarget.style.background = 'rgba(230, 57, 70, 0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!notification.is_read) {
                        e.currentTarget.style.background = 'rgba(230, 57, 70, 0.05)'
                      }
                    }}
                  >
                    {/* Actor Profile Image or Icon */}
                    {notification.actor_profile_image ? (
                      <img
                        src={notification.actor_profile_image}
                        alt={notification.actor_username || 'User'}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--border)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--muted)',
                        border: '2px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                      }}>
                        {notification.type === 'new_follower' ? '👤' : '📌'}
                      </div>
                    )}

                    {/* Notification Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        marginBottom: '0.25rem'
                      }}>
                        {notification.title}
                      </div>
                      <div style={{
                        fontSize: '0.8125rem',
                        color: 'var(--muted-foreground)',
                        marginBottom: '0.25rem',
                        lineHeight: '1.4'
                      }}>
                        {notification.message}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--muted-foreground)',
                        opacity: 0.7
                      }}>
                        {getTimeAgo(notification.created_at)}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.is_read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        flexShrink: 0,
                        marginTop: '0.5rem'
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
      )}
    </div>
  )
}
