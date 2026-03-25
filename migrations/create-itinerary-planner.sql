-- Create standalone itinerary planner (separate from collections)
-- Part of #134 - Dedicated trip planning tool

-- =============================================================================
-- STEP 1: Create itineraries table
-- =============================================================================

CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_date_range CHECK (end_date >= start_date)
);

-- Add comments
COMMENT ON TABLE itineraries IS
'Standalone trip/vacation itineraries separate from collections';

COMMENT ON COLUMN itineraries.title IS
'Name of the trip (e.g., "Cannon Beach Anniversary")';

COMMENT ON COLUMN itineraries.start_date IS
'First day of the trip';

COMMENT ON COLUMN itineraries.end_date IS
'Last day of the trip';

-- =============================================================================
-- STEP 2: Create itinerary_items table (POIs in the itinerary)
-- =============================================================================

CREATE TABLE IF NOT EXISTS itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,

  -- POI details (from Google Places or manual)
  title TEXT NOT NULL,
  description TEXT,
  place_id TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  category TEXT,

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,

  -- Additional metadata
  notes TEXT,
  url TEXT,
  phone TEXT,

  -- Ordering within a day
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE itinerary_items IS
'Individual POIs/activities scheduled in an itinerary';

COMMENT ON COLUMN itinerary_items.place_id IS
'Google Places ID if from Google Places API';

COMMENT ON COLUMN itinerary_items.scheduled_date IS
'Which day of the trip this item is scheduled';

COMMENT ON COLUMN itinerary_items.scheduled_time IS
'What time of day (e.g., 10:00:00 for 10am)';

COMMENT ON COLUMN itinerary_items.duration_minutes IS
'Expected duration at this location';

COMMENT ON COLUMN itinerary_items.sort_order IS
'Manual ordering within the same day/time';

-- =============================================================================
-- STEP 3: Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_dates ON itineraries(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary_id ON itinerary_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_schedule ON itinerary_items(scheduled_date, scheduled_time);

-- =============================================================================
-- STEP 4: Row Level Security (RLS)
-- =============================================================================

ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

-- Itineraries: Users can only see their own
DROP POLICY IF EXISTS "Users can view their own itineraries" ON itineraries;
CREATE POLICY "Users can view their own itineraries"
ON itineraries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own itineraries" ON itineraries;
CREATE POLICY "Users can insert their own itineraries"
ON itineraries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own itineraries" ON itineraries;
CREATE POLICY "Users can update their own itineraries"
ON itineraries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own itineraries" ON itineraries;
CREATE POLICY "Users can delete their own itineraries"
ON itineraries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Itinerary items: Users can manage items in their own itineraries
DROP POLICY IF EXISTS "Users can view items in their itineraries" ON itinerary_items;
CREATE POLICY "Users can view items in their itineraries"
ON itinerary_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM itineraries
    WHERE itineraries.id = itinerary_items.itinerary_id
    AND itineraries.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert items in their itineraries" ON itinerary_items;
CREATE POLICY "Users can insert items in their itineraries"
ON itinerary_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM itineraries
    WHERE itineraries.id = itinerary_items.itinerary_id
    AND itineraries.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update items in their itineraries" ON itinerary_items;
CREATE POLICY "Users can update items in their itineraries"
ON itinerary_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM itineraries
    WHERE itineraries.id = itinerary_items.itinerary_id
    AND itineraries.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete items in their itineraries" ON itinerary_items;
CREATE POLICY "Users can delete items in their itineraries"
ON itinerary_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM itineraries
    WHERE itineraries.id = itinerary_items.itinerary_id
    AND itineraries.user_id = auth.uid()
  )
);

-- =============================================================================
-- STEP 5: Helper function to get itinerary with items
-- =============================================================================

CREATE OR REPLACE FUNCTION get_itinerary_with_items(p_itinerary_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'itinerary', row_to_json(i.*),
    'items', COALESCE(
      (
        SELECT json_agg(row_to_json(items.*) ORDER BY items.scheduled_date, items.scheduled_time, items.sort_order)
        FROM itinerary_items items
        WHERE items.itinerary_id = p_itinerary_id
      ),
      '[]'::json
    )
  )
  INTO result
  FROM itineraries i
  WHERE i.id = p_itinerary_id
  AND i.user_id = auth.uid();

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT
  'Itinerary planner tables created' as status,
  COUNT(*) FILTER (WHERE table_name = 'itineraries') as itineraries_table,
  COUNT(*) FILTER (WHERE table_name = 'itinerary_items') as items_table
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('itineraries', 'itinerary_items');
