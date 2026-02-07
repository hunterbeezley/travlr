// Debug Pin Creation Test Component
// Use this to test pin creation step by step

'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DatabaseService } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export default function DebugPinCreationTest() {
  const { user } = useAuth()
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<string>('')

  // Test form data
  const [formData, setFormData] = useState({
    title: 'Test Pin',
    description: 'This is a test pin created for debugging',
    category: 'other',
    collectionId: '',
    latitude: 42.3601,
    longitude: -71.0589 // Boston coordinates
  })

  useEffect(() => {
    if (user) {
      fetchCollections()
      updateDebugInfo()
    }
  }, [user])

  const updateDebugInfo = () => {
    let info = '=== DEBUG INFORMATION ===\n\n'
    info += `User: ${user ? '✅ Logged in' : '❌ Not logged in'}\n`
    if (user) {
      info += `User ID: ${user.id}\n`
      info += `User Email: ${user.email}\n`
    }
    info += `Collections loaded: ${collections.length}\n`
    info += `Selected collection: ${formData.collectionId || 'None'}\n\n`
    info += `Form data:\n${JSON.stringify(formData, null, 2)}\n\n`
    info += `DatabaseService available: ${typeof DatabaseService !== 'undefined' ? '✅' : '❌'}\n`
    info += `createPin method: ${typeof DatabaseService.createPin === 'function' ? '✅' : '❌'}\n`
    setDebugInfo(info)
  }

  useEffect(() => {
    updateDebugInfo()
  }, [collections, formData, user])

  const fetchCollections = async () => {
    if (!user) return

    try {
      console.log('🔍 Fetching collections for user:', user.id)
      
      const { data, error } = await supabase
        .from('collections')
        .select('id, title, description, is_public')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      console.log('📦 Collections result:', { data, error })

      if (error) {
        console.error('Error fetching collections:', error)
        setResult(`❌ Error fetching collections: ${error.message}`)
        return
      }

      setCollections(data || [])
      
      // Auto-select first collection
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, collectionId: data[0].id }))
        setResult(`✅ Loaded ${data.length} collections`)
      } else {
        setResult('⚠️ No collections found. You need to create a collection first.')
      }
    } catch (error) {
      console.error('Exception fetching collections:', error)
      setResult(`💥 Exception: ${error}`)
    }
  }

  const createTestCollection = async () => {
    if (!user) return

    setLoading(true)
    setResult('Creating test collection...')

    try {
      const result = await DatabaseService.createCollection(
        user.id,
        'Test Collection',
        'A collection created for testing pin creation',
        false
      )

      if (result.success) {
        setResult('✅ Test collection created successfully!')
        fetchCollections() // Refresh collections
      } else {
        setResult(`❌ Failed to create collection: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating test collection:', error)
      setResult(`💥 Exception creating collection: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testPinCreation = async () => {
    if (!user) {
      setResult('❌ No user logged in')
      return
    }

    if (!formData.collectionId) {
      setResult('❌ No collection selected')
      return
    }

    setLoading(true)
    setResult('Testing pin creation...')

    try {
      console.log('🚀 Starting pin creation test...')
      console.log('Form data:', formData)
      
      const result = await DatabaseService.createPin(
        user.id,
        formData.collectionId,
        formData.title,
        formData.latitude,
        formData.longitude,
        formData.description,
        undefined, // no image URL
        formData.category
      )

      console.log('📥 Pin creation result:', result)

      if (result.success) {
        setResult(`✅ Pin created successfully! ID: ${result.data?.id}`)
      } else {
        setResult(`❌ Failed to create pin: ${result.error}`)
      }
    } catch (error) {
      console.error('💥 Exception during pin creation:', error)
      setResult(`💥 Exception: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testDirectDatabaseAccess = async () => {
    if (!user || !formData.collectionId) return

    setLoading(true)
    setResult('Testing direct database access...')

    try {
      const { data, error } = await supabase
        .from('pins')
        .insert({
          user_id: user.id,
          collection_id: formData.collectionId,
          title: 'Direct DB Test Pin',
          latitude: formData.latitude,
          longitude: formData.longitude,
          description: 'Created via direct database access',
          category: 'other'
        })
        .select()
        .single()

      if (error) {
        setResult(`❌ Direct DB access failed: ${error.message}`)
        console.error('Direct DB error:', error)
      } else {
        setResult(`✅ Direct DB access worked! Pin ID: ${data.id}`)
        console.log('Direct DB success:', data)
      }
    } catch (error) {
      console.error('Exception in direct DB test:', error)
      setResult(`💥 Direct DB exception: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>🔧 Pin Creation Debug Tool</h1>
        <p>Please log in to test pin creation functionality.</p>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'monospace',
      fontSize: '14px'
    }}>
      <h1>🔧 Pin Creation Debug Tool</h1>
      
      {/* Debug Information */}
      <div style={{
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem',
        whiteSpace: 'pre-line'
      }}>
        {debugInfo}
      </div>

      {/* Test Form */}
      <div style={{
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3>Test Data</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>Title:</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Description:</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Category:</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', color: 'var(--foreground)' }}
          >
            <option value="restaurant">🍽️ Restaurant</option>
            <option value="cafe">☕ Café</option>
            <option value="bar">🍺 Bar</option>
            <option value="attraction">🎯 Attraction</option>
            <option value="other">📍 Other</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Collection:</label>
          <select
            value={formData.collectionId}
            onChange={(e) => setFormData(prev => ({ ...prev, collectionId: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', color: 'var(--foreground)' }}
          >
            <option value="">Select a collection...</option>
            {collections.map(collection => (
              <option key={collection.id} value={collection.id}>
                {collection.title} {collection.is_public ? '(Public)' : '(Private)'}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          <div>
            <label>Latitude:</label>
            <input
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
          <div>
            <label>Longitude:</label>
            <input
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <button
          onClick={createTestCollection}
          disabled={loading}
          style={{
            padding: '1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳' : '📁'} Create Test Collection
        </button>

        <button
          onClick={testPinCreation}
          disabled={loading || !formData.collectionId}
          style={{
            padding: '1rem',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (loading || !formData.collectionId) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳' : '📍'} Test Pin Creation
        </button>

        <button
          onClick={testDirectDatabaseAccess}
          disabled={loading || !formData.collectionId}
          style={{
            padding: '1rem',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (loading || !formData.collectionId) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳' : '🔧'} Test Direct DB
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div style={{
          background: result.includes('❌') || result.includes('💥') ? '#ffebee' : '#e8f5e8',
          border: '1px solid ' + (result.includes('❌') || result.includes('💥') ? '#f44336' : '#4caf50'),
          borderRadius: '8px',
          padding: '1rem',
          whiteSpace: 'pre-line'
        }}>
          <strong>Result:</strong><br />
          {result}
        </div>
      )}
    </div>
  )
}