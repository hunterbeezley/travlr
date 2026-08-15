import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

interface ForkPinRequest {
  sourcePinId: string
  targetCollectionId: string
}

export async function POST(request: Request) {
  try {
    // Prod's browser client stores sessions in localStorage, not cookies,
    // so this route reads the JWT directly from the Authorization header
    // instead of relying on @supabase/ssr's cookie-based server client.
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Attach the token to every request this client makes, so RLS
    // policies evaluate as this user (not as anonymous)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await request.json()) as ForkPinRequest
    const { sourcePinId, targetCollectionId } = body

    if (!sourcePinId || !targetCollectionId) {
      return NextResponse.json(
        { error: 'Missing required fields: sourcePinId, targetCollectionId' },
        { status: 400 }
      )
    }

    // 1. Get the source pin details
    const { data: sourcePin, error: pinError } = await supabase
      .from('pins')
      .select('*')
      .eq('id', sourcePinId)
      .single()

    if (pinError || !sourcePin) {
      return NextResponse.json({ error: 'Source pin not found' }, { status: 404 })
    }

    // 2. Verify target collection belongs to current user
    const { data: targetColl, error: collError } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', targetCollectionId)
      .eq('user_id', user.id)
      .single()

    if (collError || !targetColl) {
      return NextResponse.json(
        { error: 'Target collection not found or not owned by you' },
        { status: 404 }
      )
    }

    // 3. Create new pin in target collection (copy of source)
    const { data: newPin, error: createError } = await supabase
      .from('pins')
      .insert({
        user_id: user.id,
        collection_id: targetCollectionId,
        title: sourcePin.title,
        description: sourcePin.description,
        latitude: sourcePin.latitude,
        longitude: sourcePin.longitude,
        category: sourcePin.category,
      })
      .select()
      .single()

    if (createError || !newPin) {
      return NextResponse.json(
        { error: 'Failed to create forked pin' },
        { status: 500 }
      )
    }

    // 4. Record the fork relationship
    await supabase.from('collection_forks').insert({
      source_collection_id: sourcePin.collection_id,
      target_collection_id: targetCollectionId,
      source_pin_id: sourcePinId,
      target_pin_id: newPin.id,
      user_id: user.id,
    })

    return NextResponse.json({
      success: true,
      newPin,
      message: `Forked "${sourcePin.title}" to your collection`,
    })
  } catch (error: any) {
    console.error('Fork error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
