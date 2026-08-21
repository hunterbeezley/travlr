'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface CollectionOption {
  id: string
  title: string
  is_public: boolean
}

interface CollectionPickerProps {
  value: string
  onChange: (collectionId: string) => void
}

// Single, consistent "pick or create a destination collection" UI, used
// everywhere a place needs to land in one of the user's own collections
// (adding a searched place, forking a pin from someone else's collection).
// Previously PinCreationModal used a plain <select> + window.prompt() while
// the fork flow used a nicer inline radio/create-new UI - two different
// experiences for the same action. This replaces both.
export default function CollectionPicker({ value, onChange }: CollectionPickerProps) {
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const fetchCollections = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('collections')
        .select('id, title, is_public')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error fetching collections:', error)
        setLoading(false)
        return
      }

      setCollections(data || [])
      if (!value && data && data.length > 0) {
        onChange(data[0].id)
      } else if (!data || data.length === 0) {
        setCreatingNew(true)
      }
      setLoading(false)
    }

    fetchCollections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('collections')
        .insert({ user_id: user.id, title: newTitle.trim(), is_public: false })
        .select('id, title, is_public')
        .single()

      if (error || !data) {
        logger.error('Error creating collection:', error)
        return
      }

      setCollections(prev => [data, ...prev])
      onChange(data.id)
      setCreatingNew(false)
      setNewTitle('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setCreatingNew(false)}
          style={{
            padding: '0.4rem 0.75rem',
            background: !creatingNew ? 'var(--accent)' : 'var(--muted)',
            color: !creatingNew ? 'white' : 'var(--foreground)',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '0.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          Existing
        </button>
        <button
          type="button"
          onClick={() => setCreatingNew(true)}
          style={{
            padding: '0.4rem 0.75rem',
            background: creatingNew ? 'var(--accent)' : 'var(--muted)',
            color: creatingNew ? 'white' : 'var(--foreground)',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '0.75rem',
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          New
        </button>
      </div>

      {!creatingNew ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Loading...</div>
          )}
          {!loading && collections.length === 0 && (
            <div style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
              No collections yet - create one instead.
            </div>
          )}
          {collections.map(col => (
            <label
              key={col.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: value === col.id ? 'var(--accent)' : 'var(--card)',
                color: value === col.id ? 'white' : 'var(--foreground)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="collection-picker"
                checked={value === col.id}
                onChange={() => onChange(col.id)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{col.title}</span>
            </label>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Collection name"
            className="form-input"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
            style={{
              padding: '0.6rem 1rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              cursor: creating || !newTitle.trim() ? 'not-allowed' : 'pointer',
              opacity: creating || !newTitle.trim() ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}
    </div>
  )
}
