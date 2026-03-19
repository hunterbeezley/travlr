'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PinPageClient from './PinPageClient'
import { PinPageSkeleton } from '@/components/SkeletonLoader'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PinPage({ params }: PageProps) {
  const router = useRouter()
  const [pin, setPin] = useState<any>(null)
  const [relatedPins, setRelatedPins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [notFoundError, setNotFoundError] = useState(false)
  const [pinId, setPinId] = useState<string | null>(null)

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params
      setPinId(resolvedParams.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!pinId) return

    async function loadData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        // Fetch pin data
        const { data: pinData, error: pinError } = await supabase
          .from('pins')
          .select(`
            id,
            title,
            description,
            latitude,
            longitude,
            category,
            place_id,
            place_name,
            place_rating,
            place_user_ratings_total,
            place_business_status,
            place_website,
            place_phone,
            place_price_level,
            place_opening_hours,
            created_at,
            collection_id,
            user_id
          `)
          .eq('id', pinId)
          .single()

        if (pinError || !pinData) {
          console.error('Error fetching pin:', pinError)
          setNotFoundError(true)
          setLoading(false)
          return
        }

        // Fetch pin images separately
        const { data: pinImages } = await supabase
          .from('pin_images')
          .select('image_url, upload_order')
          .eq('pin_id', pinId)
          .order('upload_order', { ascending: true })

        // Fetch owner profile separately
        let profileData = null
        if (pinData.user_id) {
          const { data: profile } = await supabase
            .from('users')
            .select('username, full_name, profile_image')
            .eq('id', pinData.user_id)
            .single()
          profileData = profile
        }

        // Fetch collection separately
        let collectionData = null
        if (pinData.collection_id) {
          const { data: collection } = await supabase
            .from('collections')
            .select('id, title, color')
            .eq('id', pinData.collection_id)
            .single()
          collectionData = collection
        }

        // Merge related data into pin
        const pinWithRelations = {
          ...pinData,
          profiles: profileData,
          collections: collectionData,
          pin_images: pinImages || []
        }

        setPin(pinWithRelations)
        setIsOwner(user?.id === pinData.user_id)

        // Fetch related pins from the same collection
        if (pinData.collection_id) {
          const { data: relatedPinsData } = await supabase
            .from('pins')
            .select('id, title, category')
            .eq('collection_id', pinData.collection_id)
            .neq('id', pinData.id)
            .limit(6)

          // Fetch images for each related pin
          if (relatedPinsData && relatedPinsData.length > 0) {
            const pinsWithImages = await Promise.all(
              relatedPinsData.map(async (relatedPin) => {
                const { data: images } = await supabase
                  .from('pin_images')
                  .select('image_url, upload_order')
                  .eq('pin_id', relatedPin.id)
                  .order('upload_order', { ascending: true })

                return {
                  ...relatedPin,
                  pin_images: images || []
                }
              })
            )
            setRelatedPins(pinsWithImages)
          } else {
            setRelatedPins([])
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading pin:', error)
        setNotFoundError(true)
        setLoading(false)
      }
    }

    loadData()
  }, [pinId])

  if (loading) {
    return <PinPageSkeleton />
  }

  if (notFoundError || !pin) {
    return notFound()
  }

  return (
    <PinPageClient
      pin={pin}
      relatedPins={relatedPins}
      isOwner={isOwner}
    />
  )
}
