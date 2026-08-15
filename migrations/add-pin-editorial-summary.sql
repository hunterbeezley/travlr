-- Migration: Add editorial_summary field to pins table
-- Part of Issue - Surface real Google Places data on pins
--
-- Stores Google's own editorial summary/description of a place, kept
-- distinct from pins.description (the user's own note) so neither ever
-- overwrites the other. No column is added to pin_images for Google
-- photos - they're stored as normal pin_images rows whose image_url
-- points at the new /api/google-places/photo proxy route.

ALTER TABLE pins
ADD COLUMN IF NOT EXISTS editorial_summary TEXT NULL;

COMMENT ON COLUMN pins.editorial_summary IS 'Google Places editorial summary - Google''s own description of the place, distinct from the user-authored description field';
