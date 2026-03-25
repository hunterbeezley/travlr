'use client'
import React, { useState } from 'react'
import { ItineraryItem } from '@/lib/types/itinerary'

interface DayViewProps {
  date: Date
  items: ItineraryItem[]
  onItemClick: (item: ItineraryItem) => void
  onTimeSlotClick: (hour: number) => void
  onItemDrop: (itemId: string, newTime: string) => void
}

// Generate hours for the day (6 AM to 11 PM)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6-23 (6 AM - 11 PM)

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function getTimePosition(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes
  const startMinutes = 6 * 60 // 6 AM in minutes
  const pixelsPerMinute = 60 / 60 // 60px per hour / 60 minutes
  return (totalMinutes - startMinutes) * pixelsPerMinute
}

export default function DayView({
  date,
  items,
  onItemClick,
  onTimeSlotClick,
  onItemDrop
}: DayViewProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Filter items for this specific date
  const dateStr = date.toISOString().split('T')[0]
  const dayItems = items.filter((item) => item.scheduled_date === dateStr)

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    if (!draggedItem) return

    const newTime = `${hour.toString().padStart(2, '0')}:00:00`
    onItemDrop(draggedItem, newTime)
    setDraggedItem(null)
  }

  return (
    <div
      style={{
        background: 'var(--background)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Date Header */}
      <div
        style={{
          padding: '1.5rem',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              fontFamily: 'var(--font-display)',
              marginBottom: '0.25rem'
            }}
          >
            {date.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              fontWeight: '600'
            }}
          >
            {date.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
        </div>

        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {dayItems.length} {dayItems.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Timeline */}
      <div
        style={{
          position: 'relative',
          height: `${HOURS.length * 60}px`, // 60px per hour
          background: 'var(--background)'
        }}
      >
        {/* Hour rows */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{
              position: 'relative',
              height: '60px',
              borderBottom: '1px solid var(--border)',
              display: 'flex'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, hour)}
            onClick={() => onTimeSlotClick(hour)}
          >
            {/* Hour label */}
            <div
              style={{
                width: '80px',
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-mono)',
                fontWeight: '600',
                flexShrink: 0
              }}
            >
              {formatHour(hour)}
            </div>

            {/* Time slot area */}
            <div
              style={{
                flex: 1,
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--muted)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            />
          </div>
        ))}

        {/* Scheduled items (positioned absolutely) */}
        {dayItems.map((item) => {
          if (!item.scheduled_time) return null

          const topPosition = getTimePosition(item.scheduled_time)
          const height = (item.duration_minutes / 60) * 60 // Convert minutes to pixels

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onClick={() => onItemClick(item)}
              style={{
                position: 'absolute',
                left: '90px',
                right: '10px',
                top: `${topPosition}px`,
                height: `${height}px`,
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.5rem 0.75rem',
                cursor: 'grab',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'white',
                  marginBottom: '0.25rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.title}
              </div>
              {item.notes && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {item.notes}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {dayItems.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              fontStyle: 'italic'
            }}
          >
            Click a time slot to add an item
          </p>
        </div>
      )}
    </div>
  )
}
