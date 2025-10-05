-- Rollback migration for region categories
-- Date: October 5, 2025

BEGIN;

-- Remove the foreign key constraint first
ALTER TABLE cities DROP CONSTRAINT IF EXISTS fk_cities_region_category;

-- Remove the region_category_id column from cities table
ALTER TABLE cities DROP COLUMN IF EXISTS region_category_id;

-- Drop the region_categories table
DROP TABLE IF EXISTS region_categories;

-- Drop the indexes that were created
DROP INDEX IF EXISTS idx_cities_region_category_id;
DROP INDEX IF EXISTS idx_region_categories_name;

COMMIT;

-- Verification
SELECT 'Region categories rollback completed successfully' as status;