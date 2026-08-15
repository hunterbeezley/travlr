'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Plus, X } from 'lucide-react'
import CollectionPicker from './CollectionPicker'

interface ForkPinModalProps {
  pinTitle: string
  sourcePinId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ForkPinModal({
  pinTitle,
  sourcePinId,
  isOpen,
  onClose,
  onSuccess,
}: ForkPinModalProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFork = async () => {
    if (!selectedCollectionId) {
      setError('Select or create a collection')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Fork the pin (send the session token - prod's client stores it in
      // localStorage, not cookies, so the API route can't read it any other way)
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/fork-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          sourcePinId,
          targetCollectionId: selectedCollectionId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fork pin')
      }

      logger.log('✅ Forked pin successfully')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      logger.error('Fork error:', err)
      setError(err.message || 'Failed to fork pin')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--background)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            Add "{pinTitle}" to your collection
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--muted-foreground)',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: 'var(--radius)',
              color: '#ef4444',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <CollectionPicker value={selectedCollectionId} onChange={setSelectedCollectionId} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleFork}
            disabled={loading || !selectedCollectionId}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: loading || !selectedCollectionId ? 'var(--muted)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: loading || !selectedCollectionId ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Plus size={16} />
            {loading ? 'Adding...' : 'Add to collection'}
          </button>
        </div>
      </div>
    </div>
  )
}
