'use client'
import React, { useState, useEffect } from 'react'
import { Pin } from '@/lib/types/collection'

interface SchedulePinModalProps {
  pin: Pin
  collectionStartDate: string
  collectionEndDate: string
  onClose: () => void
  onSave: (pinId: string, scheduling: {
    scheduled_date: string | null
    scheduled_time: string | null
    duration_minutes: number | null
    timeline_notes: string | null
  }) => Promise<void>
}

// Generate time slots for dropdown
function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, '0')
      const minuteStr = minute.toString().padStart(2, '0')
      slots.push(`${hourStr}:${minuteStr}`)
    }
  }
  return slots
}

// Format time for display (e.g., "14:00" -> "2:00 PM")
function formatTimeDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

export default function SchedulePinModal({
  pin,
  collectionStartDate,
  collectionEndDate,
  onClose,
  onSave
}: SchedulePinModalProps) {
  const [scheduledDate, setScheduledDate] = useState(pin.scheduled_date || '')
  const [scheduledTime, setScheduledTime] = useState(
    pin.scheduled_time ? pin.scheduled_time.substring(0, 5) : ''
  )
  const [durationMinutes, setDurationMinutes] = useState(
    pin.duration_minutes?.toString() || '60'
  )
  const [timelineNotes, setTimelineNotes] = useState(pin.timeline_notes || '')
  const [saving, setSaving] = useState(false)

  const timeSlots = generateTimeSlots()

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(pin.id, {
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime ? `${scheduledTime}:00` : null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        timeline_notes: timelineNotes.trim() || null
      })
      onClose()
    } catch (error) {
      console.error('Error saving schedule:', error)
      alert('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const handleClearSchedule = async () => {
    if (!confirm('Remove this pin from the timeline?')) return

    setSaving(true)
    try {
      await onSave(pin.id, {
        scheduled_date: null,
        scheduled_time: null,
        duration_minutes: null,
        timeline_notes: null
      })
      onClose()
    } catch (error) {
      console.error('Error clearing schedule:', error)
      alert('Failed to clear schedule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            fontFamily: 'var(--font-mono)',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Schedule Pin
        </h2>

        <p
          style={{
            fontSize: '1rem',
            color: 'var(--foreground)',
            marginBottom: '1.5rem',
            fontWeight: '600'
          }}
        >
          {pin.title}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Date Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={collectionStartDate}
              max={collectionEndDate}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-mono)'
              }}
            />
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                marginTop: '0.25rem'
              }}
            >
              Select a day during your trip
            </p>
          </div>

          {/* Time Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Time (Optional)
            </label>
            <select
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              <option value="">No specific time</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatTimeDisplay(slot)}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Duration (minutes)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[30, 60, 90, 120, 180, 240].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDurationMinutes(mins.toString())}
                  style={{
                    padding: '0.625rem',
                    background:
                      durationMinutes === mins.toString() ? 'var(--accent)' : 'var(--muted)',
                    color:
                      durationMinutes === mins.toString()
                        ? 'white'
                        : 'var(--foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="Custom minutes"
              min="1"
              style={{
                width: '100%',
                padding: '0.625rem',
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.875rem',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-mono)',
                marginTop: '0.5rem'
              }}
            />
          </div>

          {/* Timeline Notes */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Timeline Notes (Optional)
            </label>
            <textarea
              value={timelineNotes}
              onChange={(e) => setTimelineNotes(e.target.value)}
              placeholder="Add notes specific to this itinerary..."
              rows={3}
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
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                marginTop: '0.25rem'
              }}
            >
              E.g., "Reservations at 7pm" or "Meet at entrance"
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem',
                  opacity: saving ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !scheduledDate}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: scheduledDate ? 'var(--accent)' : 'var(--muted)',
                  color: scheduledDate ? 'white' : 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: saving || !scheduledDate ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem',
                  opacity: saving || !scheduledDate ? 0.5 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>

            {/* Clear Schedule Button (only if already scheduled) */}
            {pin.scheduled_date && (
              <button
                onClick={handleClearSchedule}
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  background: 'transparent',
                  color: 'var(--destructive)',
                  border: '1px solid var(--destructive)',
                  borderRadius: 'var(--radius)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '0.75rem',
                  opacity: saving ? 0.5 : 1
                }}
              >
                Remove from Timeline
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
