'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PinPageClient from './PinPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PinPage({ params }: PageProps) {
  const router = useRouter()
  const [pin, setPin] = useState<any>(null)
  const [relatedPins, setRelatedPins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()
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
        setCurrentUserId(user?.id)

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
            user_id,
            profiles:user_id (
              username,
              full_name,
              profile_image
            ),
            collections:collection_id (
              id,
              title,
              color
            ),
            pin_images (
              image_url,
              upload_order
            )
          `)
          .eq('id', pinId)
          .single()

        if (pinError || !pinData) {
          setNotFoundError(true)
          setLoading(false)
          return
        }

        setPin(pinData)
        setIsOwner(user?.id === pinData.user_id)

        // Fetch related pins from the same collection
        if (pinData.collection_id) {
          const { data: relatedData } = await supabase
            .from('pins')
            .select(`
              id,
              title,
              category,
              pin_images (
                image_url,
                upload_order
              )
            `)
            .eq('collection_id', pinData.collection_id)
            .neq('id', pinData.id)
            .limit(6)

          setRelatedPins(relatedData || [])
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
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '3px solid var(--muted)',
          borderTop: '3px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    )
  }

  if (notFoundError || !pin) {
    return notFound()
  }

  return (
    <PinPageClient
      pin={pin}
      relatedPins={relatedPins}
      isOwner={isOwner}
      currentUserId={currentUserId}
    />
  )
}
