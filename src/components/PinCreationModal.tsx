'use client'
import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import SingleImageUpload from './SingleImageUpload'
import MultipleImageUpload from './MultipleImageUpload'
import CollectionPicker from './CollectionPicker'
import { X, MapPin } from 'lucide-react'
import { PIN_CATEGORIES } from '@/lib/categoryIcons'


interface PinCreationModalProps {
  isOpen: boolean
  onClose: () => void
  latitude: number
  longitude: number
  onPinCreated?: (pin: any) => void
}

interface ImageItem {
  id: string
  url: string
  path: string
  order: number
  isUploading: boolean
  isTemp: boolean
}

export default function PinCreationModal({
  isOpen,
  onClose,
  latitude,
  longitude,
  onPinCreated
}: PinCreationModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState<string>('')
  const [loadingAddress, setLoadingAddress] = useState(false)

  // Location data from geocoding
  const [locationData, setLocationData] = useState<{
    city: string | null
    state: string | null
    country: string | null
    country_code: string | null
  }>({
    city: null,
    state: null,
    country: null,
    country_code: null
  })

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
    }
  }, [isOpen, user])

  const fetchAddress = async () => {
    try {
      setLoadingAddress(true)
      // Use Google Geocoding API for reverse geocoding
      const response = await fetch(
        `/api/google-places/geocode?latlng=${latitude},${longitude}`
      )
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        setAddress(result.formatted_address)

        // Extract city, state, country from address_components
        const addressComponents = result.address_components || []
        let city = null
        let state = null
        let country = null
        let countryCode = null

        for (const component of addressComponents) {
          const types = component.types

          // City - can be locality or postal_town
          if (types.includes('locality')) {
            city = component.long_name
          } else if (!city && types.includes('postal_town')) {
            city = component.long_name
          } else if (!city && types.includes('sublocality')) {
            city = component.long_name
          }

          // State/Province
          if (types.includes('administrative_area_level_1')) {
            state = component.short_name // Use short name for states (e.g., "CA" instead of "California")
          }

          // Country
          if (types.includes('country')) {
            country = component.long_name
            countryCode = component.short_name
          }
        }

        logger.log('📍 Extracted location data:', { city, state, country, countryCode })

        setLocationData({
          city,
          state,
          country,
          country_code: countryCode
        })
      } else {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      }
    } catch (error) {
      logger.error('Error fetching address:', error)
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
    } finally {
      setLoadingAddress(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    logger.log('🚀 Pin creation started')
    logger.log('User:', user)
    logger.log('Form data:', formData)
    logger.log('Image mode:', useMultipleImages ? 'multiple' : 'single')
    logger.log('Single image data:', imageData)
    logger.log('Multiple images data:', multipleImages)
    logger.log('Location:', { latitude, longitude })

    if (!user) {
      logger.error('❌ No user found')
      setError('You must be logged in to create pins')
      return
    }

    if (!formData.title.trim()) {
      logger.error('❌ No title provided')
      setError('Title is required')
      return
    }

    if (!formData.collectionId) {
      logger.error('❌ No collection selected')
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

    logger.log('✅ Validation passed, creating pin...')
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

      logger.log('📡 Creating pin with main image:', mainImageUrl)

      // Create the pin first with location data
      const result = await DatabaseService.createPin(
        user.id,
        formData.collectionId,
        formData.title.trim(),
        latitude,
        longitude,
        formData.description.trim() || undefined,
        mainImageUrl, // This goes in the main pins table for backward compatibility
        formData.category,
        locationData.city,
        locationData.state,
        locationData.country,
        locationData.country_code
      )

      if (!result.success || !result.data) {
        logger.error('❌ Pin creation failed:', result.error)
        setError(result.error || 'Failed to create pin')
        setLoading(false)
        return
      }

      const newPin = result.data
      logger.log('✅ Pin created successfully:', newPin)

      // If using multiple images, save them to the pin_images table
      if (useMultipleImages && multipleImages.length > 0) {
        const validImages = multipleImages.filter(img => !img.isUploading && !img.isTemp)

        if (validImages.length > 0) {
          logger.log('📷 Saving multiple images to pin_images table')

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
            logger.warn('⚠️ Pin created but failed to save multiple images:', imageResult.error)
            // Don't fail the whole operation - pin is created
          } else {
            logger.log('✅ Multiple images saved successfully')
          }
        }
      }

      onPinCreated?.(newPin)
      onClose()
    } catch (error) {
      logger.error('💥 Unexpected error creating pin:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'rgba(39, 39, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: 'min(500px, calc(100vw - 2rem))',
        maxHeight: 'calc(100vh - 2rem)',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        {/* Header */}
        <div className="modal-header" style={{
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
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            Create Pin
          </h2>
          <button
            onClick={onClose}
            className="modal-close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: 'var(--radius)',
              transition: 'var(--transition)',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Location Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              backgroundColor: 'var(--muted)',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <MapPin size={16} style={{ flexShrink: 0 }} />
              <span><strong>Location:</strong> {loadingAddress ? 'Loading address...' : address}</span>
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
            <CollectionPicker
              value={formData.collectionId}
              onChange={(id) => setFormData(prev => ({ ...prev, collectionId: id }))}
            />
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