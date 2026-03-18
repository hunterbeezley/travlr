'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CollectionPageClient from './CollectionPageClient'
import { CollectionPageSkeleton } from '@/components/SkeletonLoader'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CollectionPage({ params }: PageProps) {
  const router = useRouter()
  const [collection, setCollection] = useState<any>(null)
  const [pins, setPins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [notFoundError, setNotFoundError] = useState(false)
  const [collectionId, setCollectionId] = useState<string | null>(null)

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params
      setCollectionId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!collectionId) return

    async function loadData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        // Fetch collection data
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select(`
            id,
            title,
            description,
            is_public,
            color,
            created_at,
            user_id,
            profiles:user_id (
              username,
              full_name,
              profile_image
            )
          `)
          .eq('id', collectionId)
          .single()

        if (collectionError || !collectionData) {
          setNotFoundError(true)
          setLoading(false)
          return
        }

        // Check if collection is public or user has access
        const owner = user?.id === collectionData.user_id
        setIsOwner(owner)

        if (!collectionData.is_public && !owner) {
          setNotFoundError(true)
          setLoading(false)
          return
        }

        setCollection(collectionData)

        // Fetch pins in collection
        const { data: pinsData } = await supabase
          .from('pins')
          .select(`
            id,
            title,
            description,
            latitude,
            longitude,
            category,
            created_at,
            pin_images (
              image_url,
              upload_order
            )
          `)
          .eq('collection_id', collectionId)
          .order('created_at', { ascending: false })

        setPins(pinsData || [])
        setLoading(false)
      } catch (error) {
        console.error('Error loading collection:', error)
        setNotFoundError(true)
        setLoading(false)
      }
    }

    loadData()
  }, [collectionId])

  if (loading) {
    return <CollectionPageSkeleton />
  }

  if (notFoundError || !collection) {
    return notFound()
  }

  return (
    <CollectionPageClient
      collection={collection}
      pins={pins}
      pinCount={pins.length}
      isOwner={isOwner}
    />
  )
}
