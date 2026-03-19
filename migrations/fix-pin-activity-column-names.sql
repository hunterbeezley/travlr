-- ============================================================================
-- FIX: Update create_pin_activity() to use correct column names
-- ============================================================================
-- The trigger was using 'related_id' and 'related_type' but the
-- feed_activities table uses 'target_id' and 'target_type'
-- ============================================================================

CREATE OR REPLACE FUNCTION create_pin_activity()
RETURNS TRIGGER AS $$
DECLARE
  collection_owner_id UUID;
  collection_name TEXT;
  collection_is_public BOOLEAN;
BEGIN
  -- Get collection details
  SELECT user_id, title, collections.is_public INTO collection_owner_id, collection_name, collection_is_public
  FROM collections
  WHERE id = NEW.collection_id;

  -- Only create activity if collection is public
  IF collection_is_public THEN
    INSERT INTO feed_activities (
      user_id,
      activity_type,
      target_type,
      target_id,
      metadata
    ) VALUES (
      collection_owner_id,
      'pin_added',
      'pin',
      NEW.id,
      jsonb_build_object(
        'pin_title', NEW.title,
        'collection_id', NEW.collection_id,
        'collection_name', collection_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
