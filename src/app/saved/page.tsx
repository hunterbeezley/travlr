'use client'
import { logger } from '@/lib/logger'
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
  const [insights, setInsights] = useState<any>(null)

  // Load folders
  useEffect(() => {
    if (!user) return

    const loadFolders = async () => {
      try {
        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          logger.error('No session found')
          return
        }

        const { data, error } = await supabase.rpc('get_user_folders')
        if (error) throw error

        // Add smart folders
        const allCount = data?.reduce((sum: number, f: any) => sum + f.collection_count, 0) || 0
        setFolders([
          { folder: 'All', collection_count: allCount },
          { folder: 'Recently Saved', collection_count: 0, smart: true },
          ...(data || [])
        ])
      } catch (error) {
        logger.error('Error loading folders:', error)
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
          logger.error('No session found')
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

        // Filter by selected folder (including smart folders)
        let filtered
        if (selectedFolder === 'All') {
          filtered = allCollections
        } else if (selectedFolder === 'Recently Saved') {
          // Recently Saved = last 30 days
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          filtered = allCollections.filter(c =>
            new Date(c.saved_at) > thirtyDaysAgo
          )
        } else {
          filtered = allCollections.filter(c => c.folder === selectedFolder)
        }

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

        // Calculate insights
        const totalPins = enriched.reduce((sum, c) => sum + (c.pin_count || 0), 0)
        const cities = new Set(enriched.map(c => c.city).filter(Boolean))
        const creators = new Set(enriched.map(c => c.user_id).filter(Boolean))

        setInsights({
          totalCollections: enriched.length,
          totalPins,
          totalCities: cities.size,
          totalCreators: creators.size
        })
      } catch (error) {
        logger.error('Error loading collections:', error)
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
      logger.error('Error organizing collection:', error)
    }
  }

  const handleUnsave = async (collectionId: string) => {
    if (!confirm('Remove this collection from your saved list?')) return

    try {
      const { error } = await supabase.rpc('unsave_collection', {
        p_collection_id: collectionId
      })

      if (error) throw error

      // Remove from local state
      setCollections(prev => prev.filter(c => c.collection_id !== collectionId))

      // Update folder counts
      const currentFolder = collections.find(c => c.collection_id === collectionId)?.folder
      setFolders(prev => prev.map(f =>
        f.folder === currentFolder || f.folder === 'All'
          ? { ...f, collection_count: Math.max(0, f.collection_count - 1) }
          : f
      ))
    } catch (error) {
      logger.error('Error unsaving collection:', error)
      alert('Failed to unsave collection')
    }
  }

  const handleShare = async (collectionId: string, collectionName: string) => {
    const url = `${window.location.origin}/collections/${collectionId}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: collectionName,
          url: url
        })
      } catch {
        logger.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
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
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '1rem'
        }}>
          Saved Collections
        </h1>

        {/* Insights Panel */}
        {insights && insights.totalCollections > 0 && (
          <div style={{
            padding: '1.5rem',
            background: 'var(--muted)',
            borderRadius: 'var(--radius)',
            border: '2px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                Collections
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)'
              }}>
                {insights.totalCollections}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                Total Pins
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)'
              }}>
                {insights.totalPins}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                Cities
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)'
              }}>
                {insights.totalCities}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--muted-foreground)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                Creators
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)'
              }}>
                {insights.totalCreators}
              </div>
            </div>
          </div>
        )}
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
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {selectedFolder === 'Recently Saved' ? '📅' : '💾'}
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-mono)'
          }}>
            {selectedFolder === 'Recently Saved'
              ? 'No Recent Saves'
              : selectedFolder === 'All'
                ? 'No Saved Collections Yet'
                : `No Collections in "${selectedFolder}"`}
          </h3>
          <p style={{
            color: 'var(--muted-foreground)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            maxWidth: '400px',
            margin: '0 auto 1.5rem'
          }}>
            {selectedFolder === 'Recently Saved'
              ? 'You haven\'t saved any collections in the last 30 days. Discover and save collections to see them here.'
              : selectedFolder === 'All'
                ? 'Start saving collections you love to organize and revisit them later.'
                : 'This folder is empty. Move collections here or explore to find new ones.'}
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link
              href="/explore"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'var(--accent)',
                color: 'white',
                border: '2px solid var(--accent)',
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
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'var(--muted)',
                color: 'var(--foreground)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.875rem'
              }}
            >
              View Feed
            </Link>
          </div>
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

                {/* Folder Badge */}
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem'
                }}>
                  📁 {collection.folder}
                </div>

                {/* Stats */}
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--muted-foreground)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  padding: '0.5rem',
                  background: 'var(--muted)',
                  borderRadius: 'var(--radius)'
                }}>
                  <span>📍 {collection.pin_count}</span>
                  {collection.stats && (
                    <>
                      <span>❤️ {collection.stats.likes_count || 0}</span>
                      <span>💬 {collection.stats.comments_count || 0}</span>
                    </>
                  )}
                </div>

                {/* Quick Actions */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem'
                }}>
                  <Link
                    href={`/collections/${collection.collection_id}`}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--accent)',
                      color: 'white',
                      border: '2px solid var(--accent)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.8'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    <span>👁️</span> View
                  </Link>

                  <button
                    onClick={() => handleShare(collection.collection_id, collection.collection_name)}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--muted)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--foreground)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <span>🔗</span> Share
                  </button>

                  <button
                    onClick={() => setOrganizingCollection(collection.collection_id)}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--muted)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--foreground)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <span>📁</span> Move
                  </button>

                  <button
                    onClick={() => handleUnsave(collection.collection_id)}
                    style={{
                      padding: '0.5rem',
                      background: 'var(--muted)',
                      border: '2px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ef4444'
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--muted)'
                    }}
                  >
                    <span>🗑️</span> Unsave
                  </button>
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
