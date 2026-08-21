'use client'
import { logger } from '@/lib/logger'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Check, Twitter, Facebook, MessageCircle, Mail } from 'lucide-react'

interface ShareCollectionModalProps {
  collectionId: string
  collectionName: string
  onClose: () => void
}

export default function ShareCollectionModal({
  collectionId,
  collectionName,
  onClose
}: ShareCollectionModalProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/collections/${collectionId}`

  const trackShare = async (method: string) => {
    try {
      await supabase.rpc('track_collection_share', {
        p_collection_id: collectionId,
        p_share_method: method
      })
    } catch (error) {
      logger.error('Error tracking share:', error)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      await trackShare('link')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.error('Error copying link:', error)
    }
  }

  const handleShare = async (platform: string) => {
    await trackShare(platform)

    const text = `Check out "${collectionName}" on Travlr!`
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(text)

    let url = ''
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        break
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        break
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(collectionName)}&body=${encodedText}%20${encodedUrl}`
        break
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--background)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '500px',
            width: '100%'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              margin: 0,
              fontFamily: 'var(--font-display)'
            }}>
              Share Collection
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                padding: '0.25rem',
                lineHeight: 1
              }}
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem' }}>
            {/* Copy Link */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: 'var(--foreground)'
              }}>
                Share Link
              </label>
              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem'
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: copied ? '#10b981' : 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-body)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    whiteSpace: 'nowrap',
                    transition: 'var(--transition)'
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={16} /> Copied
                    </>
                  ) : (
                    'Copy'
                  )}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: 'var(--foreground)'
              }}>
                Share to
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => handleShare('twitter')}
                  style={{
                    padding: '0.75rem',
                    background: '#1DA1F2',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  <Twitter size={16} />
                  <span>Twitter</span>
                </button>

                <button
                  onClick={() => handleShare('facebook')}
                  style={{
                    padding: '0.75rem',
                    background: '#1877F2',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  <Facebook size={16} />
                  <span>Facebook</span>
                </button>

                <button
                  onClick={() => handleShare('whatsapp')}
                  style={{
                    padding: '0.75rem',
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => handleShare('email')}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--muted)',
                    color: 'var(--foreground)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <Mail size={16} />
                  <span>Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
