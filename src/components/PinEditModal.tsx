'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

interface PinEditModalProps {
  isOpen: boolean
  onClose: () => void
  pin: {
    id: string
    title: string
    description: string | null
    category: string | null
    image_url: string | null
    latitude: number
    longitude: number
    user_id: string
    collection_id: string
  } | null
  onPinUpdated?: (pin: any) => void
  onPinDeleted?: (pinId: string) => void
}

interface Collection {
  id: string
  title: string
  description: string | null
  is_public: boolean
}

const PIN_CATEGORIES = [
  { value: 'restaurant', label: '🍽️ Restaurant', icon: '🍽️' },
  { value: 'cafe', label: '☕ Café', icon: '☕' },
  { value: 'bar', label: '🍺 Bar/Pub', icon: '🍺' },
  { value: 'attraction', label: '🎯 Attraction', icon: '🎯' },
  { value: 'nature', label: '🌲 Nature', icon: '🌲' },
  { value: 'shopping', label: '🛍️ Shopping', icon: '🛍️' },
  { value: 'hotel', label: '🏨 Hotel', icon: '🏨' },
  { value: 'transport', label: '🚌 Transport', icon: '🚌' },
  { value: 'activity', label: '🎪 Activity', icon: '🎪' },
  { value: 'other', label: '📍 Other', icon: '📍' }
]

export default function PinEditModal({ 
  isOpen, 
  onClose, 
  pin,
  onPinUpdated,
  onPinDeleted
}: PinEditModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    collectionId: '',
    imageUrl: ''
  })

  // Load collections for user
  useEffect(() => {
    if (isOpen && user) {
      fetchCollections()
    }
  }, [isOpen, user])

  // Initialize form data when pin changes
  useEffect(() => {
    if (pin && isOpen) {
      setFormData({
        title: pin.title || '',
        description: pin.description || '',
        category: pin.category || 'other',
        collectionId: pin.collection_id || '',
        imageUrl: pin.image_url || ''
      })
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [pin, isOpen])

  const fetchCollections = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, title, description, is_public')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching collections:', error)
        setError('Failed to load collections')
        return
      }

      setCollections(data || [])
    } catch (error) {
      console.error('Error fetching collections:', error)
      setError('Failed to load collections')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !pin) {
      setError('You must be logged in to edit pins')
      return
    }

    // Check if user owns the pin
    if (pin.user_id !== user.id) {
      setError('You can only edit your own pins')
      return
    }

    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    if (!formData.collectionId) {
      setError('Please select a collection')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Handle collection change if needed
      if (formData.collectionId !== pin.collection_id) {
        // First update the pin's collection
        const { error: moveError } = await supabase
          .from('pins')
          .update({ collection_id: formData.collectionId })
          .eq('id', pin.id)
          .eq('user_id', user.id)

        if (moveError) {
          console.error('Error moving pin to new collection:', moveError)
          setError('Failed to move pin to new collection')
          setLoading(false)
          return
        }
      }

      // Update the pin details
      const result = await DatabaseService.updatePin(
        pin.id,
        user.id,
        {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          image_url: formData.imageUrl.trim() || undefined
        }
      )

      if (result.success && result.data) {
        console.log('✅ Pin updated successfully:', result.data)
        onPinUpdated?.({ ...result.data, collection_id: formData.collectionId })
        onClose()
      } else {
        setError(result.error || 'Failed to update pin')
      }
    } catch (error) {
      console.error('💥 Unexpected error updating pin:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !pin) return

    setDeleteLoading(true)
    setError(null)

    try {
      const result = await DatabaseService.deletePin(pin.id, user.id)

      if (result.success) {
        console.log('✅ Pin deleted successfully')
        onPinDeleted?.(pin.id)
        onClose()
      } else {
        setError(result.error || 'Failed to delete pin')
      }
    } catch (error) {
      console.error('💥 Unexpected error deleting pin:', error)
      setError('An unexpected error occurred')
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen || !pin) return null

  // Don't allow editing if user doesn't own the pin
  if (pin.user_id !== user?.id) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}>
        <div style={{
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--destructive)' }}>
            ⚠️ Access Denied
          </h3>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted-foreground)' }}>
            You can only edit pins that you created.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            ✏️ Edit Pin
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: 'var(--radius)',
              fontSize: '1.25rem',
              transition: 'var(--transition)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Location Info (Read-only) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              backgroundColor: 'var(--muted)',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)'
            }}>
              📍 <strong>Location:</strong> {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
              <br />
              <small>Note: Location cannot be changed</small>
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What is this place?"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                backgroundColor: 'var(--card)'
              }}
            >
              {PIN_CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Collection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Collection *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={formData.collectionId}
                onChange={(e) => setFormData(prev => ({ ...prev, collectionId: e.target.value }))}
                required
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '1rem',
                  backgroundColor: 'var(--card)'
                }}
              >
                <option value="">Select a collection...</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title} {collection.is_public ? '(Public)' : '(Private)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us about this place..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Image URL */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              Image URL (optional)
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: 'var(--radius)',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'space-between'
          }}>
            {/* Delete Button */}
            <div>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--destructive)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  🗑️ Delete
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      backgroundColor: 'transparent',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: deleteLoading ? 'var(--muted)' : 'var(--destructive)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      cursor: deleteLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {deleteLoading ? '⏳' : '✓'} Confirm Delete
                  </button>
                </div>
              )}
            </div>

            {/* Save/Cancel Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: loading ? 'var(--muted)' : 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}