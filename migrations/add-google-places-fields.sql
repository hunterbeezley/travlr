-- Migration: Add Google Places API fields to pins table
-- This migration adds support for storing rich place data from Google Places API
-- All fields are nullable to maintain backward compatibility with existing pins

ALTER TABLE pins
ADD COLUMN place_id VARCHAR(255) NULL,
ADD COLUMN place_name VARCHAR(500) NULL,
ADD COLUMN place_types TEXT[] NULL,
ADD COLUMN business_status VARCHAR(50) NULL,
ADD COLUMN rating DECIMAL(2,1) NULL,
ADD COLUMN rating_count INTEGER NULL,
ADD COLUMN phone_number VARCHAR(50) NULL,
ADD COLUMN website VARCHAR(500) NULL,
ADD COLUMN price_level INTEGER NULL,
ADD COLUMN opening_hours JSONB NULL,
ADD COLUMN last_place_refresh TIMESTAMP NULL;

-- Create index on place_id for efficient lookups
-- Only index non-null values to save space
CREATE INDEX idx_pins_place_id ON pins(place_id) WHERE place_id IS NOT NULL;

-- Add comment to table documenting the new fields
COMMENT ON COLUMN pins.place_id IS 'Google Places API place_id for enrichment and refresh';
COMMENT ON COLUMN pins.place_name IS 'Full place name from Google Places';
COMMENT ON COLUMN pins.place_types IS 'Array of place types from Google (e.g., restaurant, cafe)';
COMMENT ON COLUMN pins.business_status IS 'OPERATIONAL, CLOSED_TEMPORARILY, or CLOSED_PERMANENTLY';
COMMENT ON COLUMN pins.rating IS 'Google rating (1.0-5.0)';
COMMENT ON COLUMN pins.rating_count IS 'Number of ratings/reviews';
COMMENT ON COLUMN pins.phone_number IS 'Formatted phone number';
COMMENT ON COLUMN pins.website IS 'Business website URL';
COMMENT ON COLUMN pins.price_level IS 'Price level (0-4, where 0 is free and 4 is $$$$)';
COMMENT ON COLUMN pins.opening_hours IS 'JSON object with opening hours data';
COMMENT ON COLUMN pins.last_place_refresh IS 'Timestamp of last place data refresh from Google';
