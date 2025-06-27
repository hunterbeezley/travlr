'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

// Simple inline ImageUploadService for testing
class TestImageUploadService {
  private static readonly BUCKET_NAME = 'travlr-images'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  static async uploadImage(
    file: File, 
    userId: string, 
    folder: 'profiles' | 'pins' = 'profiles'
  ) {
    try {
      // Validate file
      if (!file) return { success: false, error: 'No file provided' }
      if (file.size > this.MAX_FILE_SIZE) return { success: false, error: 'File too large (max 5MB)' }
      if (!this.ALLOWED_TYPES.includes(file.type)) return { success: false, error: 'Invalid file type' }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${timestamp}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log('Uploading to path:', filePath)

      // Upload file
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        return { success: false, error: error.message }
      }

      console.log('Upload successful:', data)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath)

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      }
    } catch (error) {
      console.error('Upload service error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }
    }
  }

  static async deleteImage(imagePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([imagePath])

      return !error
    } catch (error) {
      console.error('Delete service error:', error)
      return false
    }
  }
}

export default function ImageTestPage() {
  const { user, loading } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string>('')
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; path: string }>>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, folder: 'profiles' | 'pins') => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setUploadResult('Uploading...')

    try {
      const result = await TestImageUploadService.uploadImage(file, user.id, folder)
      
      if (result.success && result.url && result.path) {
        setUploadResult(`✅ Upload successful!\nURL: ${result.url}\nPath: ${result.path}`)
        setUploadedImages(prev => [...prev, { url: result.url!, path: result.path! }])
      } else {
        setUploadResult(`❌ Upload failed: ${result.error}`)
      }
    } catch (error) {
      setUploadResult(`❌ Upload error: ${error}`)
    } finally {
      setUploading(false)
    }
  }

  const testStorageConnection = async () => {
    setUploadResult('Testing storage connection...')
    
    try {
      const { data, error } = await supabase.storage
        .from('travlr-images')
        .list('', { limit: 1 })

      if (error) {
        setUploadResult(`❌ Storage connection failed: ${error.message}`)
      } else {
        setUploadResult('✅ Storage connection successful!')
      }
    } catch (error) {
      setUploadResult(`❌ Storage test error: ${error}`)
    }
  }

  const deleteImage = async (path: string) => {
    const success = await TestImageUploadService.deleteImage(path)
    if (success) {
      setUploadedImages(prev => prev.filter(img => img.path !== path))
      setUploadResult(`✅ Deleted image: ${path}`)
    } else {
      setUploadResult(`❌ Failed to delete: ${path}`)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Image Upload Test</h1>
        <p className="text-red-600">Please sign in to test image uploads.</p>
        <a href="/" className="text-blue-600 underline">Go back to sign in</a>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Image Upload Test</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>

      {/* Storage Connection Test */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">1. Test Storage Connection</h2>
        <button 
          onClick={testStorageConnection}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Test Storage Connection
        </button>
      </div>

      {/* Profile Image Upload */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">2. Test Profile Image Upload</h2>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFileUpload(e, 'profiles')}
          disabled={uploading}
          className="mb-2"
        />
        <p className="text-sm text-gray-600">Will upload to: {user.id}/profiles/timestamp.ext</p>
      </div>

      {/* Pin Image Upload */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">3. Test Pin Image Upload</h2>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFileUpload(e, 'pins')}
          disabled={uploading}
          className="mb-2"
        />
        <p className="text-sm text-gray-600">Will upload to: {user.id}/pins/timestamp.ext</p>
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-2">Upload Result:</h3>
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{uploadResult}</pre>
        </div>
      )}

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4">Uploaded Images:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploadedImages.map((img, index) => (
              <div key={index} className="border rounded p-4">
                <img 
                  src={img.url} 
                  alt={`Upload ${index}`}
                  className="w-full h-48 object-cover rounded mb-2"
                />
                <p className="text-sm text-gray-600 mb-2">Path: {img.path}</p>
                <button
                  onClick={() => deleteImage(img.path)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded">
            <p>Uploading image...</p>
          </div>
        </div>
      )}
      
      <div className="mt-8 pt-4 border-t">
        <a href="/" className="text-blue-600 underline">← Back to Home</a>
      </div>
    </div>
  )
}