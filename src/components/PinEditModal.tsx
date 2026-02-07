'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import SingleImageUpload from './SingleImageUpload'
import MultipleImageUpload from './MultipleImageUpload'

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

  // Images state
  const [pinImages, setPinImages] = useState<{
    id: string
    url: string
    path: string
    order: number
    isUploading: boolean
    isTemp: boolean
  }[]>([])

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
      loadPinImages()
    }
  }, [pin, isOpen])

  const loadPinImages = async () => {
    if (!pin) return
    try {
      const images = await DatabaseService.getPinImages(pin.id)
      setPinImages(images.map(img => ({
        id: img.id,
        url: img.image_url,
        path: img.image_path,
        order: img.upload_order,
        isUploading: false,
        isTemp: false
      })))
    } catch (error) {
      console.error('Error loading pin images:', error)
    }
  }

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
      // Prepare main image URL from multiple images
      const validImages = pinImages.filter(img => !img.isUploading && !img.isTemp)
      const mainImageUrl = validImages.length > 0 ? validImages[0].url : undefined

      // Update the pin details
      const result = await DatabaseService.updatePin(
        pin.id,
        user.id,
        {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          image_url: mainImageUrl
        }
      )

      if (result.success && result.data) {
        // Update pin_images table
        const imagesResult = await DatabaseService.updatePinImages(
          pin.id,
          user.id,
          validImages.map(img => ({
            image_url: img.url,
            image_path: img.path,
            upload_order: img.order
          }))
        )

        if (imagesResult.success) {
          console.log('✅ Pin images updated successfully')
        } else {
          console.error('⚠️ Failed to update pin images:', imagesResult.error)
        }

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
    if (!user || !pin) {
      console.error('❌ Cannot delete: missing user or pin')
      return
    }

    console.log('🗑️ Starting pin deletion process for pin:', pin.id)
    setDeleteLoading(true)
    setError(null)

    try {
      const result = await DatabaseService.deletePin(pin.id, user.id)
      console.log('🔧 Delete result:', result)

      if (result.success) {
        console.log('✅ Pin deleted successfully from database')

        // Call the parent callback to update the UI
        if (onPinDeleted) {
          console.log('📤 Calling onPinDeleted callback with pin ID:', pin.id)
          onPinDeleted(pin.id)
        } else {
          console.warn('⚠️ onPinDeleted callback not provided')
        }

        // Close the modal
        onClose()

        // Optional: Force a page reload as a fallback (remove this once issue is fixed)
        // setTimeout(() => window.location.reload(), 500)

      } else {
        console.error('❌ Pin deletion failed:', result.error)
        setError(result.error || 'Failed to delete pin')
      }
    } catch (error) {
      console.error('💥 Unexpected error deleting pin:', error)
      setError('An unexpected error occurred while deleting the pin')
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
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'rgba(39, 39, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          paddingRight: '4rem', // Extra space for the floating close button
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
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

          {/* Enhanced Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 1001
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'
              e.currentTarget.style.color = 'var(--destructive)'
              e.currentTarget.style.borderColor = 'var(--destructive)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
              e.currentTarget.style.color = 'var(--foreground)'
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title="Close"
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
                backgroundColor: 'var(--card)',
                color: 'var(--foreground)'
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
                  backgroundColor: 'var(--card)',
                  color: 'var(--foreground)'
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
              Images (optional)
            </label>
            <MultipleImageUpload
              currentImages={pinImages}
              onImagesChanged={setPinImages}
              userId={user?.id || ''}
              disabled={loading}
              maxImages={10}
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