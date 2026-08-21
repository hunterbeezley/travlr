'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ItineraryItem } from '@/lib/types/itinerary'

interface ManualAddItemModalProps {
  itineraryId: string
  date: Date
  timeSlot: number
  onClose: () => void
  onAdded: (item: ItineraryItem) => void
}

export default function ManualAddItemModal({
  itineraryId,
  date,
  timeSlot,
  onClose,
  onAdded
}: ManualAddItemModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [duration, setDuration] = useState('60')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setSaving(true)
    try {
      const dateStr = date.toISOString().split('T')[0]
      const timeStr = `${timeSlot.toString().padStart(2, '0')}:00:00`

      const { data, error } = await supabase
        .from('itinerary_items')
        .insert({
          itinerary_id: itineraryId,
          title: title.trim(),
          description: description.trim() || null,
          address: address.trim() || null,
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          duration_minutes: parseInt(duration) || 60,
          notes: notes.trim() || null,
          place_id: null,
          latitude: null,
          longitude: null,
          category: 'other'
        })
        .select()
        .single()

      if (error) throw error

      onAdded(data)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item')
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
          padding: '2rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-display)'
          }}
        >
          Add Item
        </h2>

        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {timeSlot}:00
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Title */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Breakfast at Joe's Diner"
              autoFocus
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

          {/* Address */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Address (Optional)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State"
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
                  type="button"
                  onClick={() => setDuration(mins.toString())}
                  style={{
                    padding: '0.625rem',
                    background: duration === mins.toString() ? 'var(--accent)' : 'var(--muted)',
                    color: duration === mins.toString() ? 'white' : 'var(--foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}
            >
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or details..."
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
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
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
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                opacity: saving ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !title.trim()}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: !saving && title.trim() ? 'var(--accent)' : 'var(--muted)',
                color: !saving && title.trim() ? 'white' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem'
              }}
            >
              {saving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
