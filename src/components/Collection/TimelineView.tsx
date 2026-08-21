'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Calendar } from 'lucide-react'
import { Pin } from '@/lib/types/collection'
import SchedulePinModal from './SchedulePinModal'
import { supabase } from '@/lib/supabase'
import { getCategoryIcon } from '@/lib/categoryIcons'

interface TimelineViewProps {
  pins: Pin[]
  startDate: string | null
  endDate: string | null
  collectionColor: string
  isOwner?: boolean
  onOpenSettings?: () => void
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
  collectionColor,
  isOwner = false,
  onOpenSettings
}: TimelineViewProps) {
  const router = useRouter()
  const [schedulingPin, setSchedulingPin] = useState<Pin | null>(null)

  // Handle saving pin schedule
  const handleSaveSchedule = async (
    pinId: string,
    scheduling: {
      scheduled_date: string | null
      scheduled_time: string | null
      duration_minutes: number | null
      timeline_notes: string | null
    }
  ) => {
    const { error } = await supabase
      .from('pins')
      .update(scheduling)
      .eq('id', pinId)

    if (error) {
      throw error
    }

    // Refresh the page to show updated schedule
    router.refresh()
  }

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
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <Calendar size={48} color="var(--muted-foreground)" />
        </div>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: 'var(--foreground)',
          marginBottom: '0.5rem'
        }}>
          Set Trip Dates
        </h3>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem'
        }}>
          {isOwner
            ? 'Add start and end dates to organize your pins on a timeline'
            : 'This collection needs trip dates configured'
          }
        </p>
        {isOwner && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              background: collectionColor,
              border: 'none',
              borderRadius: 'var(--radius)',
              color: 'white',
              fontWeight: '600',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Set Trip Dates
          </button>
        )}
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
        fontFamily: 'var(--font-display)'
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
                  fontFamily: 'var(--font-body)'
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
                    const CategoryIcon = getCategoryIcon(pin.category)

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
                            fontFamily: 'var(--font-body)',
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
                            <CategoryIcon size={16} color="var(--muted-foreground)" />
                            <h3 style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: 'var(--foreground)',
                              margin: 0,
                              fontFamily: 'var(--font-display)',
                              flex: 1
                            }}>
                              {pin.title}
                            </h3>
                            {isOwner && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSchedulingPin(pin)
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'var(--muted)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius)',
                                  fontSize: '0.625rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font-body)'
                                }}
                              >
                                Edit
                              </button>
                            )}
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
              const CategoryIcon = getCategoryIcon(pin.category)

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
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <CategoryIcon size={16} color="var(--muted-foreground)" />
                      <h3 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'var(--foreground)',
                        margin: 0,
                        fontFamily: 'var(--font-display)',
                        flex: 1
                      }}>
                        {pin.title}
                      </h3>
                    </div>
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSchedulingPin(pin)
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: collectionColor,
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem'
                        }}
                      >
                        <Calendar size={14} />
                        Schedule
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schedule Pin Modal */}
      {schedulingPin && startDate && endDate && (
        <SchedulePinModal
          pin={schedulingPin}
          collectionStartDate={startDate}
          collectionEndDate={endDate}
          onClose={() => setSchedulingPin(null)}
          onSave={handleSaveSchedule}
        />
      )}
    </div>
  )
}
