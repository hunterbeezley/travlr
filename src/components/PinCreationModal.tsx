'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

interface PinCreationModalProps {
  isOpen: boolean
  onClose: () => void
  latitude: number
  longitude: number
  onPinCreated?: (pin: any) => void
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

export default function PinCreationModal({ 
  isOpen, 
  onClose, 
  latitude, 
  longitude, 
  onPinCreated 
}: PinCreationModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [loadingCollections, setLoadingCollections] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState<string>('')
  const [loadingAddress, setLoadingAddress] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    collectionId: '',
    imageUrl: ''
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        category: 'other',
        collectionId: '',
        imageUrl: ''
      })
      setError(null)
      fetchAddress()
    }
  }, [isOpen, latitude, longitude])

  // Fetch user's collections
  useEffect(() => {
    if (isOpen && user) {
      fetchCollections()
    }
  }, [isOpen, user])

  const fetchCollections = async () => {
    if (!user) return

    try {
      setLoadingCollections(true)
      const { data, error } = await supabase
        .from('collections')
        .select('id, title, description, is_public')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching collections:', error)
        return
      }

      setCollections(data || [])
      
      // Auto-select first collection if available
      if (data && data.length > 0 && !formData.collectionId) {
        setFormData(prev => ({ ...prev, collectionId: data[0].id }))
      }
    } catch (error) {
      console.error('Error in fetchCollections:', error)
    } finally {
      setLoadingCollections(false)
    }
  }

  const fetchAddress = async () => {
    try {
      setLoadingAddress(true)
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&types=address,poi,place`
      )
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        setAddress(data.features[0].place_name)
      } else {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      }
    } catch (error) {
      console.error('Error fetching address:', error)
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
    } finally {
      setLoadingAddress(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 Pin creation started')
    console.log('User:', user)
    console.log('Form data:', formData)
    console.log('Location:', { latitude, longitude })
    
    if (!user) {
      console.error('❌ No user found')
      setError('You must be logged in to create pins')
      return
    }

    if (!formData.title.trim()) {
      console.error('❌ No title provided')
      setError('Title is required')
      return
    }

    if (!formData.collectionId) {
      console.error('❌ No collection selected')
      setError('Please select a collection')
      return
    }

    console.log('✅ Validation passed, creating pin...')
    setLoading(true)
    setError(null)

    try {
      console.log('📡 Calling DatabaseService.createPin with:', {
        userId: user.id,
        collectionId: formData.collectionId,
        title: formData.title.trim(),
        latitude,
        longitude,
        description: formData.description.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        category: formData.category
      })

      const result = await DatabaseService.createPin(
        user.id,
        formData.collectionId,
        formData.title.trim(),
        latitude,
        longitude,
        formData.description.trim() || undefined,
        formData.imageUrl.trim() || undefined,
        formData.category
      )

      console.log('📥 DatabaseService response:', result)

      if (result.success && result.data) {
        console.log('✅ Pin created successfully:', result.data)
        onPinCreated?.(result.data)
        onClose()
      } else {
        console.error('❌ Pin creation failed:', result.error)
        setError(result.error || 'Failed to create pin')
      }
    } catch (error) {
      console.error('💥 Unexpected error creating pin:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const createNewCollection = async () => {
    const title = prompt('Enter a name for your new collection:')
    if (!title?.trim() || !user) return

    try {
      const result = await DatabaseService.createCollection(
        user.id,
        title.trim(),
        undefined,
        false // default to private
      )

      if (result.success && result.data) {
        setCollections(prev => [result.data, ...prev])
        setFormData(prev => ({ ...prev, collectionId: result.data.id }))
      } else {
        setError(result.error || 'Failed to create collection')
      }
    } catch (error) {
      console.error('Error creating collection:', error)
      setError('Failed to create collection')
    }
  }

  if (!isOpen) return null

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
            📍 Create Pin
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
          {/* Location Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              backgroundColor: 'var(--muted)',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)'
            }}>
              📍 <strong>Location:</strong> {loadingAddress ? 'Loading address...' : address}
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
                fontSize: '1rem'
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
                disabled={loadingCollections}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '1rem'
                }}
              >
                <option value="">Select a collection...</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title} {collection.is_public ? '(Public)' : '(Private)'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={createNewCollection}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap'
                }}
              >
                + New
              </button>
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

          {/* Image URL (for now - can be replaced with file upload later) */}
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
            justifyContent: 'flex-end'
          }}>
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
              disabled={loading || loadingCollections}
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
              {loading ? '⏳ Creating...' : '📍 Create Pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}