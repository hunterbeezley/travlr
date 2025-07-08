'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import SingleImageUpload from './SingleImageUpload'
import MultipleImageUpload from './MultipleImageUpload'


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

interface ImageItem {
  id: string
  url: string
  path: string
  order: number
  isUploading: boolean
  isTemp: boolean
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
    collectionId: ''
  })

// Image mode toggle
const [useMultipleImages, setUseMultipleImages] = useState(false)

// Single image state (existing)
const [imageData, setImageData] = useState<{
  url: string
  path: string
} | null>(null)

// Multiple images state (new)
const [multipleImages, setMultipleImages] = useState<ImageItem[]>([])
  // Reset form when modal opens/closes
useEffect(() => {
  if (isOpen) {
    setFormData({
      title: '',
      description: '',
      category: 'other',
      collectionId: ''
    })
    setImageData(null)
    setMultipleImages([])
    setUseMultipleImages(false) // Reset to single image mode
    setError(null)
    fetchAddress()
    
    // Only fetch collections if user is available
    if (user) {
      fetchCollections()
    }
  }
}, [isOpen, user]) // Add 'user' as a dependency

 const fetchCollections = async () => {
  if (!user) {
    console.log('❌ fetchCollections: No user found')
    return
  }

  console.log('🔍 fetchCollections: Starting fetch for user:', user.id)

  try {
    setLoadingCollections(true)
    const { data, error } = await supabase
      .from('collections')
      .select('id, title, description, is_public')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('📥 fetchCollections result:', { data, error })

    if (error) {
      console.error('❌ fetchCollections error:', error)
      setError(`Failed to load collections: ${error.message}`)
      return
    }

    console.log(`✅ fetchCollections: Found ${data?.length || 0} collections:`, data)
    setCollections(data || [])
    
    // Auto-select first collection if available
    if (data && data.length > 0 && !formData.collectionId) {
      console.log('🎯 Auto-selecting first collection:', data[0].id)
      setFormData(prev => ({ ...prev, collectionId: data[0].id }))
    } else {
      console.log('⚠️ No collections to auto-select or collection already selected')
    }
  } catch (error) {
    console.error('💥 fetchCollections exception:', error)
    setError('Failed to load collections')
  } finally {
    setLoadingCollections(false)
  }
}

// (Removed duplicate createNewCollection function to fix redeclaration error)

  // Handler to create a new collection (simple prompt-based version)
  const createNewCollection = async () => {
    const title = window.prompt('Enter a name for your new collection:')
    if (!title || !user) return

    try {
      setLoadingCollections(true)
      const { data, error } = await supabase
        .from('collections')
        .insert([{ title, user_id: user.id, is_public: false }])
        .select('id, title, description, is_public')
        .single()

      if (error) {
        setError('Failed to create collection: ' + error.message)
        return
      }

      if (data) {
        setCollections(prev => [data, ...prev])
        setFormData(prev => ({ ...prev, collectionId: data.id }))
      }
    } catch (err) {
      setError('Failed to create collection')
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
  console.log('Image mode:', useMultipleImages ? 'multiple' : 'single')
  console.log('Single image data:', imageData)
  console.log('Multiple images data:', multipleImages)
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

  // Check if any images are still uploading (for multiple images mode)
  if (useMultipleImages) {
    const hasUploadingImages = multipleImages.some(img => img.isUploading)
    if (hasUploadingImages) {
      setError('Please wait for all images to finish uploading')
      return
    }
  }

  console.log('✅ Validation passed, creating pin...')
  setLoading(true)
  setError(null)

  try {
    // Get the image URL for the main pin record (first image or single image)
    let mainImageUrl: string | undefined
    
    if (useMultipleImages && multipleImages.length > 0) {
      // Use first image from multiple images
      const firstImage = multipleImages.find(img => !img.isUploading && !img.isTemp)
      mainImageUrl = firstImage?.url
    } else if (!useMultipleImages && imageData) {
      // Use single image
      mainImageUrl = imageData.url
    }

    console.log('📡 Creating pin with main image:', mainImageUrl)

    // Create the pin first
    const result = await DatabaseService.createPin(
      user.id,
      formData.collectionId,
      formData.title.trim(),
      latitude,
      longitude,
      formData.description.trim() || undefined,
      mainImageUrl, // This goes in the main pins table for backward compatibility
      formData.category
    )

    if (!result.success || !result.data) {
      console.error('❌ Pin creation failed:', result.error)
      setError(result.error || 'Failed to create pin')
      setLoading(false)
      return
    }

    const newPin = result.data
    console.log('✅ Pin created successfully:', newPin)

    // If using multiple images, save them to the pin_images table
    if (useMultipleImages && multipleImages.length > 0) {
      const validImages = multipleImages.filter(img => !img.isUploading && !img.isTemp)
      
      if (validImages.length > 0) {
        console.log('📷 Saving multiple images to pin_images table')
        
        const imageResult = await DatabaseService.savePinImages(
          newPin.id,
          user.id,
          validImages.map(img => ({
            image_url: img.url,
            image_path: img.path,
            upload_order: img.order
          }))
        )

        if (!imageResult.success) {
          console.warn('⚠️ Pin created but failed to save multiple images:', imageResult.error)
          // Don't fail the whole operation - pin is created
        } else {
          console.log('✅ Multiple images saved successfully')
        }
      }
    }

    onPinCreated?.(newPin)
    onClose()
  } catch (error) {
    console.error('💥 Unexpected error creating pin:', error)
    setError('An unexpected error occurred')
  } finally {
    setLoading(false)
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
                disabled={loadingCollections}
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

          {/* Image Upload Section */}
<div style={{ marginBottom: '1.5rem' }}>
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: '0.5rem' 
  }}>
    <label style={{
      fontWeight: '500',
      fontSize: '0.875rem'
    }}>
      Images (optional)
    </label>
    
    {/* Toggle between single and multiple images */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
        Single
      </span>
      <button
        type="button"
        onClick={() => {
          setUseMultipleImages(!useMultipleImages)
          // Clear images when switching modes
          setImageData(null)
          setMultipleImages([])
        }}
        style={{
          width: '40px',
          height: '20px',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: useMultipleImages ? 'var(--accent)' : 'var(--border)',
          position: 'relative',
          transition: 'var(--transition)'
        }}
        disabled={loading}
      >
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: '2px',
          left: useMultipleImages ? '22px' : '2px',
          transition: 'var(--transition)'
        }} />
      </button>
      <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
        Multiple
      </span>
    </div>
  </div>

  {/* Conditional Image Upload Component */}
  {useMultipleImages ? (
    <MultipleImageUpload
      currentImages={multipleImages}
      onImagesChanged={setMultipleImages}
      userId={user?.id || ''}
      maxImages={5}
      disabled={loading}
    />
  ) : (
    <SingleImageUpload
      currentImageUrl={imageData?.url}
      onImageUploaded={(url, path) => {
        setImageData({ url, path })
        setError(null)
      }}
      onImageRemoved={() => {
        setImageData(null)
      }}
      userId={user?.id || ''}
      disabled={loading}
    />
  )}
  
  {/* Help text */}
  <div style={{
    fontSize: '0.75rem',
    color: 'var(--muted-foreground)',
    marginTop: '0.5rem'
  }}>
    {useMultipleImages 
      ? 'Upload multiple images. First image will be shown on the map.'
      : 'Upload a single image for this pin.'
    }
  </div>
</div>

          {/* Error Message */}
          {error && (
            <div style={{
              color: 'var(--destructive)',
              backgroundColor: 'var(--destructive-muted)',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'var(--transition)'
            }}
          >
            {loading ? 'Creating Pin...' : 'Create Pin'}
          </button>
        </form>
      </div>
    </div>
  )
}