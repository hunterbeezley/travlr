'use client'
import { useState } from 'react'
import { X, Folder, FolderOpen } from 'lucide-react'

interface OrganizeFolderModalProps {
  collectionId: string
  currentFolder: string
  folders: string[]
  onOrganize: (collectionId: string, newFolder: string) => void
  onClose: () => void
}

export default function OrganizeFolderModal({
  collectionId,
  currentFolder,
  folders,
  onOrganize,
  onClose
}: OrganizeFolderModalProps) {
  const [selectedFolder, setSelectedFolder] = useState(currentFolder)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const folderName = creatingNew ? newFolderName.trim() : selectedFolder
    if (folderName) {
      onOrganize(collectionId, folderName)
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
            maxWidth: '400px',
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
              Organize Collection
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

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
            {!creatingNew ? (
              <>
                {/* Existing Folders */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: 'var(--foreground)'
                  }}>
                    Move to folder
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedFolder('Unsorted')}
                      style={{
                        padding: '0.75rem',
                        background: selectedFolder === 'Unsorted' ? 'var(--accent)' : 'var(--muted)',
                        color: selectedFolder === 'Unsorted' ? 'white' : 'var(--foreground)',
                        border: '2px solid',
                        borderColor: selectedFolder === 'Unsorted' ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        fontFamily: 'var(--font-body)',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'var(--transition)'
                      }}
                    >
                      <FolderOpen size={16} />
                      Unsorted
                    </button>

                    {folders.filter(f => f !== 'Unsorted').map((folder) => (
                      <button
                        key={folder}
                        type="button"
                        onClick={() => setSelectedFolder(folder)}
                        style={{
                          padding: '0.75rem',
                          background: selectedFolder === folder ? 'var(--accent)' : 'var(--muted)',
                          color: selectedFolder === folder ? 'white' : 'var(--foreground)',
                          border: '2px solid',
                          borderColor: selectedFolder === folder ? 'var(--accent)' : 'var(--border)',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          fontFamily: 'var(--font-body)',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'var(--transition)'
                        }}
                      >
                        <Folder size={16} />
                        {folder}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create New Folder Button */}
                <button
                  type="button"
                  onClick={() => setCreatingNew(true)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--background)',
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--foreground)',
                    marginBottom: '1.5rem',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  + Create New Folder
                </button>
              </>
            ) : (
              <>
                {/* New Folder Name */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: 'var(--foreground)'
                  }}>
                    New folder name
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g. Travel, Food, Wishlist"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--foreground)',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCreatingNew(false)
                    setNewFolderName('')
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--foreground)',
                    marginBottom: '1.5rem',
                    transition: 'var(--transition)'
                  }}
                >
                  ← Back to Folders
                </button>
              </>
            )}

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingNew && !newFolderName.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: (creatingNew && !newFolderName.trim()) ? 'var(--muted)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: (creatingNew && !newFolderName.trim()) ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  opacity: (creatingNew && !newFolderName.trim()) ? 0.5 : 1
                }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
