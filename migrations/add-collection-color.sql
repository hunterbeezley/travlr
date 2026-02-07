-- Add color field to collections table for color-customizable pins
-- This allows users to set a color for each collection to visually distinguish pins on the map

-- Add color column with a default red color
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#E63946';

-- Add comment
COMMENT ON COLUMN collections.color IS
'Hex color code for this collection''s pins on the map (e.g., #E63946)';

-- Update existing collections to have the default red color if they don't have one
UPDATE collections
SET color = '#E63946'
WHERE color IS NULL;
