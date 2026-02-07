'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  color: string
}

interface CollectionDetailsModalProps {
  collection: Collection
  onClose: () => void
  onUpdate: () => void
  userId: string
}

interface PinImage {
  id: string
  pin_id: string
  image_url: string
  upload_order: number
}

export default function CollectionDetailsModal({
  collection,
  onClose,
  onUpdate,
  userId
}: CollectionDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: collection.title,
    description: collection.description || '',
    is_public: collection.is_public,
    color: collection.color || '#E63946'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<PinImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)

  // Check if the current user owns this collection
  const isOwner = collection.user_id === userId

  // Load collection images
  useEffect(() => {
    const loadImages = async () => {
      try {
        const { data: pins } = await supabase
          .from('pins')
          .select('id')
          .eq('collection_id', collection.id)

        if (pins && pins.length > 0) {
          const { data: pinImages } = await supabase
            .from('pin_images')
            .select('*')
            .in('pin_id', pins.map(p => p.id))
            .order('upload_order', { ascending: true })
            .limit(6)

          setImages(pinImages || [])
        }
      } catch (err) {
        console.error('Error loading images:', err)
      } finally {
        setLoadingImages(false)
      }
    }

    loadImages()
  }, [collection.id])

  const handleSave = async () => {
    if (!editForm.title.trim()) {
      setError('Title is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('collections')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          is_public: editForm.is_public,
          color: editForm.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', collection.id)
        .eq('user_id', userId)

      if (updateError) throw updateError

      setIsEditing(false)
      onUpdate()
    } catch (err: any) {
      console.error('Error updating collection:', err)
      setError(err.message || 'Failed to update collection')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setEditForm({
      title: collection.title,
      description: collection.description || '',
      is_public: collection.is_public,
      color: collection.color || '#E63946'
    })
    setError('')
    setIsEditing(false)
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
          maxWidth: '600px',
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
          {isOwner && isEditing ? (
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              style={{
                flex: 1,
                fontSize: '1.5rem',
                fontWeight: '700',
                padding: '0.5rem',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase'
              }}
              maxLength={100}
            />
          ) : (
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              {collection.title}
            </h2>
          )}

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

        {/* Public/Private Badge or Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          {isOwner && isEditing ? (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '0.75rem',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: editForm.is_public ? 'rgba(34, 197, 94, 0.1)' : 'var(--muted)'
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--foreground)'
                }}>
                  {editForm.is_public ? '🌍 PUBLIC COLLECTION' : '🔒 PRIVATE COLLECTION'}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  marginTop: '0.25rem',
                  color: 'var(--muted-foreground)',
                  textTransform: 'none',
                  letterSpacing: '0.02em'
                }}>
                  {editForm.is_public ? 'Visible to everyone' : 'Only visible to you'}
                </div>
              </div>

              {/* Toggle Switch */}
              <div style={{ position: 'relative' }}>
                <input
                  type="checkbox"
                  checked={editForm.is_public}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_public: e.target.checked }))}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                />
                <div style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  background: editForm.is_public ? '#22c55e' : 'var(--muted)',
                  border: '2px solid',
                  borderColor: editForm.is_public ? '#22c55e' : 'var(--border)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: editForm.is_public ? '26px' : '2px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </div>
              </div>
            </label>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: collection.is_public ? 'rgba(34, 197, 94, 0.1)' : 'var(--muted)',
              color: collection.is_public ? '#22c55e' : 'var(--foreground)',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              {collection.is_public ? '🌍 PUBLIC' : '🔒 PRIVATE'}
            </div>
          )}
        </div>

        {/* Color Picker - Only show when editing */}
        {isOwner && isEditing && (
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
              PIN COLOR
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {/* Preset Colors */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                {['#E63946', '#F77F00', '#FCBF49', '#06D6A0', '#118AB2', '#073B4C', '#8B5CF6', '#EC4899'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, color }))}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius)',
                      background: color,
                      border: '3px solid',
                      borderColor: editForm.color === color ? 'white' : 'var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: editForm.color === color ? '0 0 0 2px ' + color : 'none'
                    }}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom Color Input */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                  style={{
                    width: '60px',
                    height: '40px',
                    borderRadius: 'var(--radius)',
                    border: '2px solid var(--border)',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                />
                <input
                  type="text"
                  value={editForm.color}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setEditForm(prev => ({ ...prev, color: value }))
                    }
                  }}
                  placeholder="#E63946"
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase'
                  }}
                  maxLength={7}
                />
              </div>

              {/* Preview */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--muted)',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--muted-foreground)'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: editForm.color,
                  border: '2px solid var(--border)'
                }} />
                <span>Preview: Pins will appear in this color on the map</span>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
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
            DESCRIPTION
          </label>
          {isOwner && isEditing ? (
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add a description for this collection..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '0.875rem',
                resize: 'vertical',
                minHeight: '100px',
                fontFamily: 'inherit'
              }}
              maxLength={500}
            />
          ) : (
            <p style={{
              margin: 0,
              color: collection.description ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontSize: '0.875rem',
              fontStyle: collection.description ? 'normal' : 'italic'
            }}>
              {collection.description || 'No description'}
            </p>
          )}
        </div>

        {/* Images Grid */}
        {!loadingImages && images.length > 0 && (
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
              IMAGES ({images.length})
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '0.5rem'
            }}>
              {images.map((image) => (
                <div
                  key={image.id}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    border: '2px solid var(--border)'
                  }}
                >
                  <img
                    src={image.image_url}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--muted-foreground)'
        }}>
          <div>📌 {collection.pin_count || 0} pins</div>
          <div>📅 {new Date(collection.created_at).toLocaleDateString()}</div>
        </div>

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

        {/* Action Buttons - Only show for collection owner */}
        {isOwner && (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
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
                  {loading ? 'SAVING...' : 'SAVE'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent)',
                  color: 'white',
                  border: '2px solid var(--accent)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                EDIT COLLECTION
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
