'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'
import DayView from '@/components/Planner/DayView'
import POISearch from '@/components/Planner/POISearch'
import { Itinerary, ItineraryItem, GooglePlaceResult } from '@/lib/types/itinerary'

export default function PlannerPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null)
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceResult | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Load user's itineraries
  useEffect(() => {
    if (!user) return

    async function loadItineraries() {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setItineraries(data)

        // Auto-select first itinerary if exists
        if (data.length > 0 && !selectedItinerary) {
          setSelectedItinerary(data[0])
          setSelectedDate(new Date(data[0].start_date))
        } else if (data.length === 0) {
          setShowCreateModal(true)
        }
      }
      setLoading(false)
    }

    loadItineraries()
  }, [user])

  // Load items for selected itinerary
  useEffect(() => {
    if (!selectedItinerary) return

    async function loadItems() {
      const { data, error } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('itinerary_id', selectedItinerary.id)
        .order('scheduled_date')
        .order('scheduled_time')
        .order('sort_order')

      if (!error && data) {
        setItems(data)
      }
    }

    loadItems()
  }, [selectedItinerary])

  // Navigate between days
  const goToPreviousDay = () => {
    if (!selectedItinerary) return
    const prevDate = new Date(selectedDate)
    prevDate.setDate(prevDate.getDate() - 1)
    const startDate = new Date(selectedItinerary.start_date)
    if (prevDate >= startDate) {
      setSelectedDate(prevDate)
    }
  }

  const goToNextDay = () => {
    if (!selectedItinerary) return
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const endDate = new Date(selectedItinerary.end_date)
    if (nextDate <= endDate) {
      setSelectedDate(nextDate)
    }
  }

  // Add POI to itinerary
  const handleAddPOI = async (place: GooglePlaceResult, hour: number) => {
    if (!selectedItinerary) return

    const dateStr = selectedDate.toISOString().split('T')[0]
    const timeStr = `${hour.toString().padStart(2, '0')}:00:00`

    try {
      const { data, error } = await supabase
        .from('itinerary_items')
        .insert({
          itinerary_id: selectedItinerary.id,
          title: place.name,
          description: null,
          place_id: place.place_id,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          address: place.formatted_address,
          category: place.types[0] || 'other',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          duration_minutes: 60
        })
        .select()
        .single()

      if (error) throw error

      setItems([...items, data])
      setSelectedPlace(null)
      setSelectedTimeSlot(null)
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Failed to add item')
    }
  }

  // Handle drag and drop of items
  const handleItemDrop = async (itemId: string, newTime: string) => {
    try {
      const { error } = await supabase
        .from('itinerary_items')
        .update({ scheduled_time: newTime })
        .eq('id', itemId)

      if (error) throw error

      // Update local state
      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, scheduled_time: newTime } : item
        )
      )
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Failed to move item')
    }
  }

  // Handle time slot click
  const handleTimeSlotClick = (hour: number) => {
    setSelectedTimeSlot(hour)
  }

  // Handle item click
  const handleItemClick = (item: ItineraryItem) => {
    // Could open an edit modal here
    console.log('Clicked item:', item)
  }

  if (loading || !user) {
    return (
      <>
        <Navbar />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--background)'
        }}>
          <p>Loading planner...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div style={{
        minHeight: '100vh',
        background: 'var(--background)',
        paddingTop: '4rem'
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '2rem'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Trip Planner
            </h1>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.875rem'
              }}
            >
              + New Trip
            </button>
          </div>

          {/* Itinerary Selector */}
          {itineraries.length > 0 && (
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Select Trip
              </label>
              <select
                value={selectedItinerary?.id || ''}
                onChange={(e) => {
                  const itinerary = itineraries.find(i => i.id === e.target.value)
                  if (itinerary) {
                    setSelectedItinerary(itinerary)
                    setSelectedDate(new Date(itinerary.start_date))
                  }
                }}
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
                {itineraries.map((itinerary) => (
                  <option key={itinerary.id} value={itinerary.id}>
                    {itinerary.title} ({new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Main Planner View */}
          {selectedItinerary ? (
            <>
              {/* Trip Info & Search */}
              <div
                style={{
                  background: 'var(--card)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <h2
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      marginBottom: '0.25rem',
                      fontFamily: 'var(--font-display)'
                    }}
                  >
                    {selectedItinerary.title}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                    {new Date(selectedItinerary.start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}{' '}
                    -{' '}
                    {new Date(selectedItinerary.end_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* POI Search */}
                <POISearch
                  onPlaceSelect={(place) => {
                    setSelectedPlace(place)
                    // If a time slot was clicked, add immediately
                    if (selectedTimeSlot !== null) {
                      handleAddPOI(place, selectedTimeSlot)
                    }
                  }}
                />
              </div>

              {/* Day Navigation */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  gap: '1rem'
                }}
              >
                <button
                  onClick={goToPreviousDay}
                  disabled={
                    new Date(selectedDate).toDateString() ===
                    new Date(selectedItinerary.start_date).toDateString()
                  }
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor:
                      new Date(selectedDate).toDateString() ===
                      new Date(selectedItinerary.start_date).toDateString()
                        ? 'not-allowed'
                        : 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    opacity:
                      new Date(selectedDate).toDateString() ===
                      new Date(selectedItinerary.start_date).toDateString()
                        ? 0.5
                        : 1
                  }}
                >
                  ← Previous Day
                </button>

                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  Day{' '}
                  {Math.ceil(
                    (selectedDate.getTime() -
                      new Date(selectedItinerary.start_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1}{' '}
                  of{' '}
                  {Math.ceil(
                    (new Date(selectedItinerary.end_date).getTime() -
                      new Date(selectedItinerary.start_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1}
                </div>

                <button
                  onClick={goToNextDay}
                  disabled={
                    new Date(selectedDate).toDateString() ===
                    new Date(selectedItinerary.end_date).toDateString()
                  }
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor:
                      new Date(selectedDate).toDateString() ===
                      new Date(selectedItinerary.end_date).toDateString()
                        ? 'not-allowed'
                        : 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    opacity:
                      new Date(selectedDate).toDateString() ===
                      new Date(selectedItinerary.end_date).toDateString()
                        ? 0.5
                        : 1
                  }}
                >
                  Next Day →
                </button>
              </div>

              {/* Day View */}
              <DayView
                date={selectedDate}
                items={items}
                onItemClick={handleItemClick}
                onTimeSlotClick={handleTimeSlotClick}
                onItemDrop={handleItemDrop}
              />

              {/* Helper text */}
              {selectedTimeSlot !== null && !selectedPlace && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'var(--accent)',
                    color: 'white',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.875rem',
                    textAlign: 'center'
                  }}
                >
                  Time slot selected: {selectedTimeSlot}:00. Search for a place to add it here!
                </div>
              )}
            </>
          ) : (
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '4rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗓️</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                No trips yet
              </h3>
              <p style={{
                color: 'var(--muted-foreground)',
                marginBottom: '1.5rem'
              }}>
                Create your first trip to start planning
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create Trip
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Itinerary Modal */}
      {showCreateModal && (
        <CreateItineraryModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newItinerary) => {
            setItineraries([newItinerary, ...itineraries])
            setSelectedItinerary(newItinerary)
            setSelectedDate(new Date(newItinerary.start_date))
            setShowCreateModal(false)
          }}
        />
      )}
    </>
  )
}

// Create Itinerary Modal Component
function CreateItineraryModal({
  onClose,
  onCreated
}: {
  onClose: () => void
  onCreated: (itinerary: Itinerary) => void
}) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !startDate || !endDate) {
      alert('Please fill in all required fields')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          title: title.trim(),
          start_date: startDate,
          end_date: endDate,
          notes: notes.trim() || null
        })
        .select()
        .single()

      if (error) throw error

      onCreated(data)
    } catch (error) {
      console.error('Error creating itinerary:', error)
      alert('Failed to create trip')
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
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Create New Trip
        </h2>

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
              Trip Name *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cannon Beach Anniversary"
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

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}
              >
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}
              >
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
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
            </div>
          </div>

          {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--muted-foreground)',
                fontStyle: 'italic'
              }}
            >
              {Math.ceil(
                (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              ) + 1}{' '}
              day trip
            </p>
          )}

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
              placeholder="Add any notes about this trip..."
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
              onClick={handleCreate}
              disabled={saving || !title.trim() || !startDate || !endDate}
              style={{
                flex: 1,
                padding: '0.75rem',
                background:
                  !saving && title.trim() && startDate && endDate
                    ? 'var(--accent)'
                    : 'var(--muted)',
                color:
                  !saving && title.trim() && startDate && endDate
                    ? 'white'
                    : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor:
                  saving || !title.trim() || !startDate || !endDate
                    ? 'not-allowed'
                    : 'pointer',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.75rem'
              }}
            >
              {saving ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
