'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Pin } from '@/lib/types/collection'

interface TimelineViewProps {
  pins: Pin[]
  startDate: string | null
  endDate: string | null
  collectionColor: string
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

// Generate array of dates between start and end
function getDaysArray(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

// Format time for display (e.g., "14:00:00" -> "2:00 PM")
function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

export default function TimelineView({
  pins,
  startDate,
  endDate,
  collectionColor
}: TimelineViewProps) {
  const router = useRouter()

  // Check if we have date range
  if (!startDate || !endDate) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)'
      }}>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '1rem',
          marginBottom: '1rem'
        }}>
          Set a start and end date to enable timeline view
        </p>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem'
        }}>
          Click the settings icon to configure your trip dates
        </p>
      </div>
    )
  }

  // Generate days
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = getDaysArray(start, end)

  // Group pins by date
  const pinsByDate = pins.reduce((acc, pin) => {
    if (pin.scheduled_date) {
      const dateKey = pin.scheduled_date
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(pin)
    }
    return acc
  }, {} as Record<string, Pin[]>)

  // Get unscheduled pins
  const unscheduledPins = pins.filter(p => !p.scheduled_date)

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        color: 'var(--foreground)',
        marginBottom: '1.5rem',
        fontFamily: 'var(--font-display)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Itinerary Timeline
      </h2>

      {/* Timeline Grid */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '1rem'
      }}>
        {days.map((day, index) => {
          const dateKey = day.toISOString().split('T')[0]
          const dayPins = pinsByDate[dateKey] || []

          // Sort pins by scheduled time
          const sortedPins = [...dayPins].sort((a, b) => {
            if (!a.scheduled_time && !b.scheduled_time) return 0
            if (!a.scheduled_time) return 1
            if (!b.scheduled_time) return -1
            return a.scheduled_time.localeCompare(b.scheduled_time)
          })

          return (
            <div
              key={dateKey}
              style={{
                minWidth: '280px',
                background: 'var(--card)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                overflow: 'hidden'
              }}
            >
              {/* Day Header */}
              <div style={{
                padding: '1rem',
                background: 'var(--muted)',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  Day {index + 1}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-foreground)',
                  marginTop: '0.25rem'
                }}>
                  {formatDate(day)}
                </div>
              </div>

              {/* Pins for this day */}
              <div style={{
                padding: '0.75rem',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {sortedPins.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--muted-foreground)',
                    fontSize: '0.875rem'
                  }}>
                    No pins scheduled
                  </div>
                ) : (
                  sortedPins.map((pin) => {
                    const firstImage = pin.pin_images.sort(
                      (a, b) => a.upload_order - b.upload_order
                    )[0]
                    const emoji = categoryEmojis[pin.category || 'other'] || '📍'

                    return (
                      <div
                        key={pin.id}
                        onClick={() => router.push(`/pins/${pin.id}`)}
                        style={{
                          background: 'var(--background)',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {/* Time Badge */}
                        {pin.scheduled_time && (
                          <div style={{
                            padding: '0.5rem 0.75rem',
                            background: collectionColor,
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>{formatTime(pin.scheduled_time)}</span>
                            {pin.duration_minutes && (
                              <span style={{ opacity: 0.9 }}>
                                {pin.duration_minutes}min
                              </span>
                            )}
                          </div>
                        )}

                        {/* Pin Thumbnail */}
                        {firstImage && (
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            paddingTop: '60%',
                            background: 'var(--muted)',
                            overflow: 'hidden'
                          }}>
                            <Image
                              src={firstImage.image_url}
                              alt={pin.title}
                              fill
                              style={{ objectFit: 'cover' }}
                              sizes="280px"
                            />
                          </div>
                        )}

                        {/* Pin Info */}
                        <div style={{ padding: '0.75rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span style={{ fontSize: '1rem' }}>{emoji}</span>
                            <h3 style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: 'var(--foreground)',
                              margin: 0,
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {pin.title}
                            </h3>
                          </div>

                          {pin.timeline_notes && (
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'var(--muted-foreground)',
                              margin: '0.5rem 0 0 0',
                              lineHeight: '1.4'
                            }}>
                              {pin.timeline_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Unscheduled Pins */}
      {unscheduledPins.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--foreground)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)'
          }}>
            Unscheduled Pins
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {unscheduledPins.map((pin) => {
              const firstImage = pin.pin_images.sort(
                (a, b) => a.upload_order - b.upload_order
              )[0]
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
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {firstImage && (
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
                        style={{ objectFit: 'cover' }}
                        sizes="200px"
                      />
                    </div>
                  )}

                  <div style={{ padding: '0.75rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1rem' }}>{emoji}</span>
                      <h3 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'var(--foreground)',
                        margin: 0,
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {pin.title}
                      </h3>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
