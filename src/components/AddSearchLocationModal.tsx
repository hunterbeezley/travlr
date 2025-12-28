'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  id: string
  place_name: string
  center: [number, number]
  place_type: string[]
  properties: {
    category?: string
  }
}

interface Collection {
  id: string
  title: string
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  pin_count?: number
  first_pin_image?: string | null
  user_id?: string
}

interface AddSearchLocationModalProps {
  isOpen: boolean
  onClose: () => void
  searchLocation: SearchResult
  collections: Collection[]
  userId: string
  onSuccess: () => void
}

export default function AddSearchLocationModal({
  isOpen,
  onClose,
  searchLocation,
  collections,
  userId,
  onSuccess
}: AddSearchLocationModalProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newCollectionTitle, setNewCollectionTitle] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const placeName = searchLocation.place_name.split(',')[0]
  const category = searchLocation.properties?.category || searchLocation.place_type[0] || 'place'

  const handleSave = async () => {
    if (!isCreatingNew && !selectedCollectionId) {
      setError('Please select a collection')
      return
    }

    if (isCreatingNew && !newCollectionTitle.trim()) {
      setError('Collection title is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      let collectionId = selectedCollectionId

      // Create new collection if needed
      if (isCreatingNew) {
        const { data: newCollection, error: collectionError } = await supabase
          .from('collections')
          .insert({
            title: newCollectionTitle.trim(),
            description: newCollectionDescription.trim() || null,
            is_public: isPublic,
            user_id: userId
          })
          .select()
          .single()

        if (collectionError) throw collectionError
        collectionId = newCollection.id
      }

      // Create the pin
      const { error: pinError } = await supabase
        .from('pins')
        .insert({
          title: placeName,
          description: searchLocation.place_name,
          latitude: searchLocation.center[1],
          longitude: searchLocation.center[0],
          category: category,
          collection_id: collectionId,
          user_id: userId
        })

      if (pinError) throw pinError

      // Success!
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving location:', err)
      setError(err.message || 'Failed to save location')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--background)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '2rem'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              margin: 0,
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              ADD TO COLLECTION
            </h2>
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)'
            }}>
              {placeName}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ×
          </button>
        </div>

        {/* Collection Selection */}
        {!isCreatingNew ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted-foreground)'
              }}>
                SELECT COLLECTION
              </label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--background)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
              >
                <option value="">Choose a collection...</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title} ({collection.pin_count || 0} pins)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsCreatingNew(true)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--muted)',
                color: 'var(--foreground)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.5rem'
              }}
            >
              + CREATE NEW COLLECTION
            </button>
          </>
        ) : (
          <>
            {/* New Collection Form */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted-foreground)'
              }}>
                COLLECTION TITLE
              </label>
              <input
                type="text"
                value={newCollectionTitle}
                onChange={(e) => setNewCollectionTitle(e.target.value)}
                placeholder="e.g., Favorite Restaurants"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--background)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
                maxLength={100}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--muted-foreground)'
              }}>
                DESCRIPTION (OPTIONAL)
              </label>
              <textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Add a description..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--background)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  minHeight: '80px',
                  fontFamily: 'inherit'
                }}
                maxLength={500}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.75rem',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--muted)'
              }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  {isPublic ? '🌍 PUBLIC COLLECTION' : '🔒 PRIVATE COLLECTION'}
                </span>
              </label>
            </div>

            <button
              onClick={() => setIsCreatingNew(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                color: 'var(--foreground)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '1.5rem'
              }}
            >
              ← BACK TO EXISTING COLLECTIONS
            </button>
          </>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid #ef4444',
            borderRadius: 'var(--radius)',
            color: '#ef4444',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--muted)',
              color: 'var(--foreground)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: loading ? 0.6 : 1
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              color: 'white',
              border: '2px solid var(--accent)',
              borderRadius: 'var(--radius)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'SAVING...' : 'SAVE PIN'}
          </button>
        </div>
      </div>
    </div>
  )
}
