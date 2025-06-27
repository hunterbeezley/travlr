'use client'
import { useState, useRef } from 'react'
import { ImageUploadService } from '@/lib/imageUpload'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (url: string, path: string) => void
  userId: string
  folder?: 'profiles' | 'pins'
  className?: string
  placeholder?: string
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  userId,
  folder = 'profiles',
  className = '',
  placeholder = 'Click to upload image'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // Create preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Resize if it's a large image
      const resizedFile = await ImageUploadService.resizeImage(file, 800)

      // Upload to Supabase
      const result = await ImageUploadService.uploadImage(resizedFile, userId, folder)

      if (result.success && result.url && result.path) {
        onImageUploaded(result.url, result.path)
        // Clean up preview URL since we now have the real URL
        URL.revokeObjectURL(preview)
        setPreviewUrl(result.url)
      } else {
        alert(result.error || 'Upload failed')
        setPreviewUrl(currentImageUrl || null)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <div
        onClick={handleClick}
        className={`
          cursor-pointer border-2 border-dashed border-gray-300 rounded-lg
          hover:border-gray-400 transition-colors
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Upload preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <div className="text-white">Uploading...</div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-gray-500">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{uploading ? 'Uploading...' : placeholder}</span>
          </div>
        )}
      </div>
    </div>
  )
}