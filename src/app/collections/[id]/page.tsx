'use client'
import { logger } from '@/lib/logger'
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
  const [voteCounts, setVoteCounts] = useState({ upvotes: 0, downvotes: 0, net_score: 0 })
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)

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

        // Fetch collection data (including timeline fields)
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
            view_mode,
            start_date,
            end_date
          `)
          .eq('id', collectionId)
          .single()

        // Fetch owner profile separately
        let profileData = null
        if (collectionData && !collectionError) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, full_name, profile_image')
            .eq('id', collectionData.user_id)
            .single()

          if (profileError) {
            logger.error('Error fetching profile:', profileError)
          }
          profileData = profile
        }

        // Get vote counts
        let voteCounts = { upvotes: 0, downvotes: 0, net_score: 0 }
        let userVote = null
        if (collectionData && !collectionError) {
          const { data: countsData } = await supabase
            .rpc('get_collection_vote_counts', { p_collection_id: collectionId })

          if (countsData) {
            voteCounts = countsData
          }

          if (user) {
            const { data: voteData } = await supabase
              .rpc('get_user_vote_on_collection', { p_collection_id: collectionId })
            userVote = voteData
          }
        }

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

        // Merge profile data into collection
        const collectionWithProfile = {
          ...collectionData,
          profiles: profileData || { username: null, full_name: null, profile_image: null }
        }

        setCollection(collectionWithProfile)

        // Fetch pins in collection (including timeline fields)
        const { data: pinsData } = await supabase
          .from('pins')
          .select('id, title, description, latitude, longitude, category, created_at, scheduled_date, scheduled_time, duration_minutes, timeline_notes')
          .eq('collection_id', collectionId)
          .order('created_at', { ascending: false })

        // Fetch images for each pin
        let pinsWithImages: any[] = []
        if (pinsData && pinsData.length > 0) {
          pinsWithImages = await Promise.all(
            pinsData.map(async (pin) => {
              const { data: images } = await supabase
                .from('pin_images')
                .select('image_url, upload_order')
                .eq('pin_id', pin.id)
                .order('upload_order', { ascending: true })

              return {
                ...pin,
                pin_images: images || []
              }
            })
          )
        }

        setPins(pinsWithImages)
        setVoteCounts(voteCounts)
        setUserVote(userVote)
        setLoading(false)
      } catch (error) {
        logger.error('Error loading collection:', error)
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
      initialVoteCounts={voteCounts}
      initialUserVote={userVote}
    />
  )
}
