'use client'
import { useAuth } from '@/hooks/useAuth'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Auth from '@/components/Auth'
import OrganizeFolderModal from '@/components/Saved/OrganizeFolderModal'

export default function SavedCollectionsPage() {
  const { user, loading: authLoading } = useAuth()
  const [folders, setFolders] = useState<any[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('All')
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [organizingCollection, setOrganizingCollection] = useState<string | null>(null)

  // Load folders
  useEffect(() => {
    if (!user) return

    const loadFolders = async () => {
      try {
        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          console.error('No session found')
          return
        }

        const { data, error } = await supabase.rpc('get_user_folders')
        if (error) throw error

        setFolders([
          { folder: 'All', collection_count: data?.reduce((sum: number, f: any) => sum + f.collection_count, 0) || 0 },
          ...(data || [])
        ])
      } catch (error) {
        console.error('Error loading folders:', error)
      }
    }

    loadFolders()
  }, [user])

  // Load collections
  useEffect(() => {
    if (!user) return

    const loadCollections = async () => {
      setLoading(true)
      try {
        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          console.error('No session found')
          setLoading(false)
          return
        }

        const { data, error } = await supabase.rpc('get_saved_collections_by_folder', {
          p_limit: 100,
          p_offset: 0
        })

        if (error) throw error

        // Flatten and filter by selected folder
        const allCollections: any[] = []
        data?.forEach((folder: any) => {
          const folderCollections = folder.collections || []
          folderCollections.forEach((col: any) => {
            allCollections.push({
              ...col,
              folder: folder.folder
            })
          })
        })

        // Filter by selected folder
        const filtered = selectedFolder === 'All'
          ? allCollections
          : allCollections.filter(c => c.folder === selectedFolder)

        // Enrich with sample images and stats
        const enriched = await Promise.all(
          filtered.map(async (collection: any) => {
            const { data: samplePins } = await supabase
              .from('pins')
              .select('image_url')
              .eq('collection_id', collection.collection_id)
              .not('image_url', 'is', null)
              .limit(3)

            const { data: stats } = await supabase.rpc('get_collection_stats', {
              p_collection_id: collection.collection_id
            })

            return {
              ...collection,
              sample_images: samplePins?.map((p: any) => p.image_url).filter(Boolean) || [],
              stats
            }
          })
        )

        setCollections(enriched)
      } catch (error) {
        console.error('Error loading collections:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCollections()
  }, [user, selectedFolder])

  const handleOrganize = async (collectionId: string, newFolder: string) => {
    try {
      const { error } = await supabase.rpc('organize_saved_collection', {
        p_collection_id: collectionId,
        p_folder: newFolder || null
      })

      if (error) throw error

      // Reload collections and folders
      setOrganizingCollection(null)
      window.location.reload()
    } catch (error) {
      console.error('Error organizing collection:', error)
    }
  }

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return <Auth />
  }

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem', paddingTop: '5rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid var(--border)'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0
        }}>
          Saved Collections
        </h1>
      </div>

      {/* Folders */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {folders.map((folder) => (
          <button
            key={folder.folder}
            onClick={() => setSelectedFolder(folder.folder)}
            style={{
              padding: '0.75rem 1.5rem',
              background: selectedFolder === folder.folder ? 'var(--accent)' : 'var(--muted)',
              color: selectedFolder === folder.folder ? 'white' : 'var(--foreground)',
              border: '2px solid',
              borderColor: selectedFolder === folder.folder ? 'var(--accent)' : 'var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{folder.folder === 'All' ? '📚' : '📁'}</span>
            <span>{folder.folder}</span>
            <span style={{
              fontSize: '0.7rem',
              opacity: 0.8
            }}>
              ({folder.collection_count})
            </span>
          </button>
        ))}
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--muted-foreground)'
        }}>
          Loading collections...
        </div>
      ) : collections.length === 0 ? (
        <div style={{
          padding: '3rem 1rem',
          textAlign: 'center',
          background: 'var(--muted)',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔖</div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-mono)'
          }}>
            No Saved Collections
          </h3>
          <p style={{
            color: 'var(--muted-foreground)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            Start saving collections you love to view them here.
          </p>
          <Link
            href="/explore"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: '600',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.875rem'
            }}
          >
            Explore Collections
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {collections.map((collection) => (
            <div
              key={collection.collection_id}
              style={{
                background: 'var(--card)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden'
              }}
            >
              {/* Image Grid */}
              {collection.sample_images && collection.sample_images.length > 0 && (
                <Link href={`/collections/${collection.collection_id}`}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: collection.sample_images.length === 1
                      ? '1fr'
                      : 'repeat(3, 1fr)',
                    gap: '2px',
                    background: 'var(--border)',
                    aspectRatio: '16/9'
                  }}>
                    {collection.sample_images.slice(0, 3).map((url: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--muted)',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={url}
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
                </Link>
              )}

              {/* Content */}
              <div style={{ padding: '1rem' }}>
                <Link
                  href={`/collections/${collection.collection_id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    marginBottom: '0.75rem'
                  }}
                >
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    marginBottom: '0.25rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--foreground)'
                  }}>
                    {collection.collection_name}
                  </h3>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--muted-foreground)',
                    marginBottom: '0.5rem'
                  }}>
                    by {collection.username}
                  </p>
                </Link>

                {/* Folder & Organize */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--muted-foreground)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase'
                  }}>
                    📁 {collection.folder}
                  </div>
                  <button
                    onClick={() => setOrganizingCollection(collection.collection_id)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      color: 'var(--foreground)',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    Organize
                  </button>
                </div>

                {/* Stats */}
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  gap: '0.75rem'
                }}>
                  <span>📍 {collection.pin_count}</span>
                  {collection.stats && (
                    <>
                      <span>❤️ {collection.stats.likes_count}</span>
                      <span>💬 {collection.stats.comments_count}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Organize Folder Modal */}
      {organizingCollection && (
        <OrganizeFolderModal
          collectionId={organizingCollection}
          currentFolder={collections.find(c => c.collection_id === organizingCollection)?.folder || ''}
          folders={folders.filter(f => f.folder !== 'All').map(f => f.folder)}
          onOrganize={handleOrganize}
          onClose={() => setOrganizingCollection(null)}
        />
      )}
    </div>
    </>
  )
}
