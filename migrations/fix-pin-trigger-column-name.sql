-- ============================================================================
-- FIX: Update activity triggers to use 'title' instead of 'name'
-- ============================================================================
-- Both create_pin_activity() and create_collection_activity() triggers
-- were referencing collections.name or NEW.name but the actual column is 'title'
-- ============================================================================

-- Fix 1: create_collection_activity() trigger
CREATE OR REPLACE FUNCTION create_collection_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_activities (user_id, activity_type, target_type, target_id, metadata)
  VALUES (
    NEW.user_id,
    'collection_created',
    'collection',
    NEW.id,
    jsonb_build_object(
      'collection_name', NEW.title,  -- FIXED: changed NEW.name to NEW.title
      'is_public', NEW.is_public
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate collection trigger
DROP TRIGGER IF EXISTS trigger_collection_created ON collections;
CREATE TRIGGER trigger_collection_created
  AFTER INSERT ON collections
  FOR EACH ROW
  WHEN (NEW.is_public = true)
  EXECUTE FUNCTION create_collection_activity();

-- Fix 2: create_pin_activity() trigger
CREATE OR REPLACE FUNCTION create_pin_activity()
RETURNS TRIGGER AS $$
DECLARE
  collection_owner_id UUID;
  collection_name TEXT;
  collection_is_public BOOLEAN;
BEGIN
  -- Get collection details (FIXED: changed 'name' to 'title' and qualified is_public)
  SELECT user_id, title, collections.is_public INTO collection_owner_id, collection_name, collection_is_public
  FROM collections
  WHERE id = NEW.collection_id;

  -- Only create activity if collection is public
  IF collection_is_public THEN
    INSERT INTO feed_activities (
      user_id,
      activity_type,
      related_id,
      related_type,
      metadata
    ) VALUES (
      collection_owner_id,
      'pin_added',
      NEW.id,
      'pin',
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

-- Recreate pin trigger
DROP TRIGGER IF EXISTS trigger_pin_added ON pins;
CREATE TRIGGER trigger_pin_added
  AFTER INSERT ON pins
  FOR EACH ROW
  EXECUTE FUNCTION create_pin_activity();
