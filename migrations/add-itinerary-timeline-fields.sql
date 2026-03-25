-- Add itinerary/timeline functionality to collections
-- Part of #134 - Transform collections into shareable itineraries

-- =============================================================================
-- STEP 1: Add timeline fields to collections table
-- =============================================================================

-- Add view mode to toggle between list and timeline views
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'list' CHECK (view_mode IN ('list', 'timeline'));

-- Add date range for trip planning
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE collections
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add comments for clarity
COMMENT ON COLUMN collections.view_mode IS
'Display mode: "list" for simple pin list, "timeline" for day-based itinerary grid';

COMMENT ON COLUMN collections.start_date IS
'Start date of the trip/itinerary (only used when view_mode = timeline)';

COMMENT ON COLUMN collections.end_date IS
'End date of the trip/itinerary (only used when view_mode = timeline)';

-- =============================================================================
-- STEP 2: Add scheduling fields to pins table
-- =============================================================================

-- Add scheduled date for timeline placement
ALTER TABLE pins
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Add scheduled time for precise timeline placement
ALTER TABLE pins
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Add duration for timeline visualization
ALTER TABLE pins
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add timeline-specific notes (separate from main description)
ALTER TABLE pins
ADD COLUMN IF NOT EXISTS timeline_notes TEXT;

-- Add comments for clarity
COMMENT ON COLUMN pins.scheduled_date IS
'Date when this pin is scheduled on the timeline (only used when collection view_mode = timeline)';

COMMENT ON COLUMN pins.scheduled_time IS
'Time when this pin is scheduled (e.g., "10:00:00" for 10am)';

COMMENT ON COLUMN pins.duration_minutes IS
'Expected duration at this location in minutes (e.g., 120 for 2 hours)';

COMMENT ON COLUMN pins.timeline_notes IS
'Additional notes specific to the timeline/itinerary (separate from pin description)';

-- =============================================================================
-- STEP 3: Add validation constraint
-- =============================================================================

-- Ensure end_date is after start_date when both are set
ALTER TABLE collections
DROP CONSTRAINT IF EXISTS check_date_range;

ALTER TABLE collections
ADD CONSTRAINT check_date_range
CHECK (
  (start_date IS NULL AND end_date IS NULL) OR
  (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
);

-- =============================================================================
-- STEP 4: Create index for timeline queries
-- =============================================================================

-- Index for efficiently querying pins by scheduled date
CREATE INDEX IF NOT EXISTS idx_pins_scheduled_date
ON pins(collection_id, scheduled_date)
WHERE scheduled_date IS NOT NULL;

-- Index for date-range queries on collections
CREATE INDEX IF NOT EXISTS idx_collections_date_range
ON collections(start_date, end_date)
WHERE start_date IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify new columns were added
SELECT
  'Collections timeline fields added' as status,
  COUNT(*) FILTER (WHERE view_mode IS NOT NULL) as collections_with_view_mode
FROM collections;

SELECT
  'Pins timeline fields added' as status,
  COUNT(*) as total_pins
FROM pins;
